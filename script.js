const NXDT = {
    DEVICE: {
        vendorId: 0x057E, productId: 0x3000,
        manufacturerName: 'DarkMatterCore', productName: 'nxdumptool'
    },
    SIZE: {
        CMD_HEADER: 0x10,
        START_SESSION_HEADER          : 0x10,
        SEND_FILE_PROPERTIES_HEADER   : 0x320,
        START_EXTRACTED_FS_DUMP_HEADER: 0x310,
        SEND_FILE_PROPERTIES_TRANSFER: 0x800000,
        SEND_FILE_PROPERTIES_NAME: 0x300,
    },
    ABI: {
        MAJOR: 1,
        MINOR: 2,
        MAGIC: 'NXDT'
    },
    COMMAND: {
        START_SESSION          : 0,
        SEND_FILE_PROPERTIES   : 1,
        CANCEL_FILE_TRANSFER   : 2,
        SEND_NSP_HEADER        : 3,
        END_SESSION            : 4,
        START_EXTRACTED_FS_DUMP: 5,
        END_EXTRACTED_FS_DUMP  : 6,
    },
    STATUS: {
        SUCCESS                : 0,
        INVALID_MAGIC_WORD     : 4,
        UNSUPPORTED_CMD        : 5,
        UNSUPPORTED_ABI_VERSION: 6,
        MALFORMED_CMD          : 7,
        HOST_IO_ERROR          : 8,
    }
}

class NxdtError extends Error {}

class NxdtUsb {
    constructor(usbDev) {
        return this.setup(usbDev).then(() => this)
    }

    async setup(usbDev) {
        this.device = usbDev
        this.version = {
            major: this.device.usbVersionMajor,
            minor: this.device.usbVersionMinor
        }

        // Check if the product and manufacturer strings match the ones used by nxdumptool.
        // TODO: enable product string check whenever we're ready for a release.
        //if (NXDT.STATE.USB.DEVICE.manufacturer != NXDT.DEVICE.manufacturerName) or (NXDT.STATE.USB.DEVICE.product != USB_DEV_PRODUCT):
        if (this.device.manufacturerName != NXDT.DEVICE.manufacturerName) {
            throw new NxdtError('Invalid manufacturer/product strings!');
        }

        // Set default device configuration, then get the active configuration descriptor.
        const configuration = this.device.configuration

        // Get default interface descriptor.
        const intf = configuration.interfaces[0]
        this.interface = intf.interfaceNumber

        // Retrieve endpoints.
        const usbEpIn = intf.alternate.endpoints.find(e => e.direction == 'in');
        const usbEpOut = intf.alternate.endpoints.find(e => e.direction == 'out');

        if ((!usbEpIn) || (!usbEpOut)) {
            throw new NxdtError('Invalid endpoint addresses!');
        }

        // Save endpoint max packet size and USB version.
        this.endpoint = {
            in: usbEpIn.endpointNumber,
            out: usbEpOut.endpointNumber,
        }
        this.packetSize = usbEpIn.packetSize

        console.debug('Successfully retrieved USB endpoints!')
    }

    async open() {
        await this.device.open()
        await this.device.reset()
        await this.device.claimInterface(this.interface)
    }

    async close() {
        await this.device.releaseInterface(this.interface)
        await this.device.reset()
        await this.device.close()
    }

    isValueAlignedToEndpointPacketSize(value) {
        return (value & (this.packetSize - 1)) == 0
    }

    async read(size) {
        const transfer = await this.device.transferIn(this.endpoint.in, size)

        if (transfer.status != 'ok') {
            throw new NxdtError("USB.read (error)")
        }

        return transfer.data.buffer.transfer()
    }

    async write(data) {
        const transfer = await this.device.transferOut(this.endpoint.out, data)

        if (transfer.status != 'ok') {
            throw new NxdtError("USB.write (error)")
        }

        return transfer.bytesWritten
    }
}

async function mkFile(dir, filename) {
    var dirs = filename.split("/").filter(name => name)
    var name = dirs.pop()

    // Create full directory tree.
    var dirname
    for (dirname of dirs) {
        try {
            dir = await dir.getDirectoryHandle(dirname, {create: true})
        } catch (e) {
            console.error(`Failed to create directory component! ("${dirname}").`)
            throw new NxdtError()
        }
    }

    // Make sure the output filepath doesn't point to an existing directory.
    var file
    try {
        file = await dir.getFileHandle(name, {create: true})
    } catch (e) {
        console.error(`Failed to create file component! ("${name}").`)
        throw new NxdtError()
    }

    return await file.createWritable({mode: "exclusive"})
}

class NxdtSession {
    constructor(dir, usb) {
        return this.setup(dir, usb).then(() => this)
    }

    async setup(dir, usb) {
        this.dir = dir
        this.usb = usb
        await this.handleSession()
    }

    async sendStatus(code) {
        var status = struct('<4sIH6x').pack(NXDT.ABI.MAGIC, code, this.usb.packetSize)
        var wr = await this.usb.write(status)

        if (wr != status.byteLength) {
            throw new NxdtError("Failed to send status code!")
        }
    }

    async getCmdHeader() {
        const cmd_header = await this.usb.read(NXDT.SIZE.CMD_HEADER)

        if (!cmd_header || cmd_header.byteLength != NXDT.SIZE.CMD_HEADER) {
            console.error(`Failed to read ${NXDT.SIZE.CMD_HEADER}-byte long command header!`)
            throw new NxdtError()
        }

        console.debug('Received command header data.')

        return cmd_header
    }

    async getCmdBlock(cmd_block_size) {
        // Handle Zero-Length Termination packet (if needed).
        const rd_size = this.usb.isValueAlignedToEndpointPacketSize(cmd_block_size) ? cmd_block_size + 1 : cmd_block_size

        const cmd_block = await this.usb.read(rd_size)
        if (!cmd_block || cmd_block.byteLength != cmd_block_size) {
            console.error(`Failed to read ${cmd_block_size}-byte long command block for command ID ${cmd_id}!`)
            throw NxdtError()
        }

        console.debug('Received command block data.')

        return cmd_block
    }

    async getCommand(header) {
        // Parse command header.
        const [magic, cmd_id, cmd_block_size, _] = struct("<4sIII").unpack_from(header, 0)

        // Read command block right away (if needed).
        // nxdumptool expects us to read it right after sending the command header.
        const cmd_block = cmd_block_size ? await this.getCmdBlock(cmd_block_size) : new ArrayBuffer()

        // Verify magic word.
        if (magic != NXDT.ABI.MAGIC) {
            await this.sendStatus(NXDT.STATUS.INVALID_MAGIC_WORD)
            throw new NxdtError('Received command header with invalid magic word!')
        }

        // Verify command handler.
        if (!Object.values(NXDT.COMMAND).includes(cmd_id)) {
            await this.sendStatus(NXDT.STATUS.UNSUPPORTED_CMD)
            throw new NxdtError(`Received command header with unsupported ID ${cmd_id} (not implemented)`)
        }

        return [cmd_id, cmd_block]
    }

    async handleSendFilePropertiesHeader(cmd_block) {
        // Perform sanity checks.
        if (cmd_block.byteLength != NXDT.SIZE.SEND_FILE_PROPERTIES_HEADER) {
            console.error(`Invalid command block size (${cmd_block.byteLength} insted of ${NXDT.SIZE.SEND_FILE_PROPERTIES_HEADER})`)
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            return
        }

        // Parse command block.
        const [raw_file_size, filename_length, nsp_header_size] = struct('<QII').unpack_from(cmd_block, 0)
        const filename = struct(`<${filename_length}s`).unpack_from(cmd_block, 16)[0]
        const file_size = Number(raw_file_size)

        // Print info.
        console.debug(`File size: ${raw_file_size} | Filename length: ${filename_length} | NSP header size: ${nsp_header_size}.`)
        console.info(`Receiving file: ${filename}`)

        // Perform sanity checks.
        if (raw_file_size > BigInt(Number.MAX_SAFE_INTEGER)) {
            console.error('File size must be smaller than than the max safe integer!')
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
            return
        }

        if (nsp_header_size >= file_size) {
            console.error('NSP header size must be smaller than the full NSP size!')
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            return
        }

        if ((!filename_length) || (filename_length > NXDT.SIZE.SEND_FILE_PROPERTIES_NAME)) {
            console.error('Invalid filename length!')
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            return
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)

        return [filename, file_size, nsp_header_size]
    }

    async handleSendFilePropertiesBlock(file, file_size) {
        var offset = 0
        while (offset < file_size) {

            // Update block size (if needed).
            var diff = file_size - offset
            var blksize = Math.min(NXDT.SIZE.SEND_FILE_PROPERTIES_TRANSFER, diff)

            // Set block size and handle Zero-Length Termination packet (if needed).
            var rd_size = blksize
            if (((offset + blksize) >= file_size) && this.usb.isValueAlignedToEndpointPacketSize(blksize)) {
                rd_size += 1
            }

            // Read current chunk.
            var chunk = await this.usb.read(rd_size)
            if (!chunk) {
                throw new NxdtError(`Failed to read ${rd_size}-byte long data chunk!`);
            }

            // Check if we're dealing with a CancelFileTransfer command.
            if (chunk.byteLength == NXDT.SIZE.CMD_HEADER) {
                var cmd_id, cmd_block
                try {
                    [cmd_id, cmd_block] = await this.getCommand(chunk)
                } catch (e) {}
                if (cmd_block) {
                    if (cmd_id != NXDT.COMMAND.CANCEL_FILE_TRANSFER || cmd_block.byteLength != 0) {
                        await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                        throw new NxdtError(`Unexpected command during sendFileBlock (${cmd_id})!`)
                    }
                    await this.sendStatus(NXDT.STATUS.SUCCESS)
                    throw new NxdtError("Transfer cancelled")
                }
            }

            // Write current chunk.
            await file.write(chunk)

            // Update current offset.
            offset += chunk.byteLength
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async mkFile(filename) {
        var file
        try {
            file = await mkFile(this.dir, filename)
        } catch (e) {
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
            return
        }
        return file
    }

    async handleSendFileProperties(cmd_block) {
        console.debug(`Received SendFileProperties (${NXDT.COMMAND.SEND_FILE_PROPERTIES}) command.`)

        const [filename, file_size, nsp_header_size] = await this.handleSendFilePropertiesHeader(cmd_block)

        // Get file object.
        const file = await this.mkFile(filename)

        if (nsp_header_size) {
            var cmd_id, cmd_header

            // Write NSP header padding right away.
            await file.seek(nsp_header_size)

            // NSP entrys
            var offset = 0
            while (offset < (file_size - nsp_header_size)) {
                cmd_header = await this.getCmdHeader();
                [cmd_id, cmd_block] = await this.getCommand(cmd_header);

                if (cmd_id != NXDT.COMMAND.SEND_FILE_PROPERTIES) {
                    await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                    throw new NxdtError(`Unexpected command during nspEntry (${cmd_id})!`)
                }

                const [entryname, entry_size, entry_header] = await this.handleSendFilePropertiesHeader(cmd_block)
                console.debug(`Reciving NSP entry ${entryname}`)

                if (entry_header) {
                    console.error('NSP entry can not be a NSP file!')
                    await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                    throw new NxdtError(`Unexpected fileType during nspEntry (${cmd_id})!`)
                }

                await this.handleSendFilePropertiesBlock(file, entry_size)
                offset += entry_size
            }

            // NSP header
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block] = await this.getCommand(cmd_header);

            if (cmd_id != NXDT.COMMAND.SEND_NSP_HEADER) {
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                throw new NxdtError(`Unexpected command during nspHeader! ${cmd_id}`)
            }

            if (cmd_block.byteLength != nsp_header_size) {
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                throw new NxdtError(`NSP header size mismatch! (${nsp_header_size} != ${cmd_block.byteLength}).`)
            }

            await file.seek(0)
            await file.write(cmd_block)
            offset += nsp_header_size

            await this.sendStatus(NXDT.STATUS.SUCCESS)
        } else {
            await this.handleSendFilePropertiesBlock(file, file_size)
        }

        await file.close()
    }

    async handleStartExtractedFsDump(cmd_block) {
        console.debug(`Received StartExtractedFsDump (${NXDT.COMMAND.START_EXTRACTED_FS_DUMP}) command.`)

        // Perform sanity checks.
        if (cmd_block.byteLength != NXDT.SIZE.START_EXTRACTED_FS_DUMP_HEADER) {
            console.error(`Invalid command block size (${cmd_block.byteLength} insted of ${NXDT.SIZE.START_EXTRACTED_FS_DUMP_HEADER})`)
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            return
        }

        // Parse command block.
        var [extracted_fs_size, extracted_fs_root_path] = struct(`<Q${NXDT.SIZE.SEND_FILE_PROPERTIES_NAME}s`).unpack_from(cmd_block, 0)

        // Perform sanity checks.
        if (extracted_fs_size > BigInt(Number.MAX_SAFE_INTEGER)) {
            console.error('File system size must be smaller than than the max safe integer!')
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
            return
        }
        extracted_fs_size = Number(extracted_fs_size)

        console.info(`Starting extracted FS dump (size ${extracted_fs_size}, output relative path "${extracted_fs_root_path}").`)

        // Return status code.
        await this.sendStatus(NXDT.STATUS.SUCCESS)

        var cmd_id, cmd_header

        // Transfer file system
        var offset = 0
        while (offset < extracted_fs_size) {
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block] = await this.getCommand(cmd_header);

            if (cmd_id != NXDT.COMMAND.SEND_FILE_PROPERTIES) {
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                throw new NxdtError(`Unexpected command during fsEntry (${cmd_id})!`)
            }

            const [entryname, entry_size, entry_header] = await this.handleSendFilePropertiesHeader(cmd_block)
            console.debug(`Reciving FS entry ${entryname}`)

            if (entry_header) {
                console.error('FS entry can not be a NSP file!')
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                throw new NxdtError('Unexpected fileType during fsEntry!')
            }

            const file = await this.mkFile(entryname)
            await this.handleSendFilePropertiesBlock(file, entry_size)
            await file.close()

            offset += entry_size
        }

        // FS end
        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block] = await this.getCommand(cmd_header);

        if (cmd_id != NXDT.COMMAND.END_EXTRACTED_FS_DUMP) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            throw new NxdtError(`Unexpected command during nspHeader (${cmd_id})!`)
        }

        if (cmd_block.byteLength != 0) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            throw new NxdtError(`NSP header size mismatch! (${0} != ${cmd_block.byteLength}).`)
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async handleStartSession(cmd_block) {
        console.debug(`Received StartSession (${NXDT.COMMAND.START_SESSION}) command.`)

        if (cmd_block.byteLength != NXDT.SIZE.START_SESSION_HEADER) {
            console.error(`Invalid command block size (${cmd_block.byteLength} insted of ${NXDT.SIZE.START_SESSION_HEADER})`)
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            return
        }

        // Parse command block.
        const [version_major, version_minor, version_micro, abi_version, version_commit] = struct('<BBBB8s').unpack_from(cmd_block, 0)
        const [abi_major, abi_minor] = [((abi_version >> 4) & 0x0F), (abi_version & 0x0F)]

        this.client = {
            version: {
                major: version_major,
                minor: version_minor,
                micro: version_micro,
                commit: version_commit
            },
            abi: {
                major: abi_major,
                minor: abi_minor
            }
        }

        // Print client info.
        console.log(`Client info: ${this.usb.productName} v${this.client.version.major}.${this.client.version.minor}.${this.client.version.micro}, USB ABI v${this.client.abi.major}.${this.client.abi.minor} (commit ${this.client.version.commit}), USB ${this.usb.version.major}.${this.usb.version.minor}`)

        // Check if we support this ABI version.
        if ((this.client.abi.major  != NXDT.ABI.MAJOR) || (this.client.abi.minor != NXDT.ABI.MINOR)) {
            console.error(`Unsupported ABI version (${this.client.abi.major}.${this.client.abi.minor} insted of ${NXDT.ABI.MAJOR}.${NXDT.ABI.MINOR})!`)
            await this.sendStatus(NXDT.STATUS.UNSUPPORTED_ABI_VERSION)
            throw new NxdtError()
        }

        // Return status code.
        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async handleSession() {
        var cmd_id, cmd_header, cmd_block

        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block] = await this.getCommand(cmd_header);

        if (cmd_id != NXDT.COMMAND.START_SESSION) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            throw new NxdtError(`Unexpected command during nspHeader (${cmd_id})!`)
        }

        await this.handleStartSession(cmd_block)

        while (cmd_id != NXDT.COMMAND.END_SESSION) {
            try {
                cmd_header = await this.getCmdHeader()
            } catch (e) {
                break
            }

            const [cmd_id, cmd_block] = await this.getCommand(cmd_header)

            switch (cmd_id) {
                case NXDT.COMMAND.SEND_FILE_PROPERTIES:
                    await this.handleSendFileProperties(cmd_block)
                    break;
                case NXDT.COMMAND.START_EXTRACTED_FS_DUMP:
                    await this.handleStartExtractedFsDump(cmd_block)
                    break;
            }
        }

        await this.handleEndSession(cmd_block)

        console.info('Stopping server.')
    }
}

async function dstHandler() {
    try {
        globalThis.directory = await window.showDirectoryPicker({mode: "readwrite"})
    } catch (e) {
        console.error('Fatal error ocurred while selecting output directory.')
        return
    }

    directory_button.querySelector(".value").innerText = globalThis.directory.name;
    console.debug('Successfully selected output directory!')
}

async function start() {
    try {
        await globalThis.usb.open()
    } catch (e) {
        await globalThis.usb.device.forget()
    }

    try {
        await new NxdtSession(globalThis.directory, globalThis.usb)
    } catch (e) {
        await globalThis.usb.close()
        throw e
    }

    await globalThis.usb.close()
}

const connect_button = document.getElementById("src");
const directory_button = document.getElementById("dst");
const notify_button = document.getElementById("notify");
const transfer_dialog = document.getElementById("transfer");
const browser_dialog = document.getElementById("browser");

async function usbRequestDevice() {
    try {
        // Find a connected USB device with a matching VID/PID pair.
        usbDev = await navigator.usb.requestDevice({ filters: [{ vendorId: NXDT.DEVICE.vendorId, productId: NXDT.DEVICE.productId }] });
    } catch (e) {
        return
    }

    globalThis.usb = await new NxdtUsb(usbDev);

    await start();
}

async function usbReconnect(event) {
    if (globalThis.usb) return;

    globalThis.usb = await new NxdtUsb(event.device);

    await start();
}

async function usbEnumerate() {
    var dev
    for (dev of (await navigator.usb.getDevices())) {
        try {
            globalThis.usb = await new NxdtUsb(usbDev);
        } catch (e) {
            continue
        }
        break
    }

    if (!globalThis.usb) return;

    await start();
}

window.addEventListener("load", usbEnumerate)

navigator.usb.addEventListener("connect", usbReconnect)

connect_button.addEventListener("click", usbRequestDevice)
directory_button.addEventListener("click", dstHandler)
notify_button.addEventListener("click", () => transfer_dialog.showModal())

const fs_supported = window?.showDirectoryPicker;
const usb_supported = navigator?.usb?.requestDevice;

console.debug(`WebUSB API support: ${usb_supported ? 'Yes' : 'No'}`)
console.debug(`File System API support: ${fs_supported ? 'Yes' : 'No'}`)

if (Notification.permission == "granted") {}


if (!fs_supported || !usb_supported) {
    browser_dialog.showModal()
}


// Modified https://github.com/lyngklip/structjs
const rechk = /^([<>])?(([1-9]\d*)?([xcbB?hHiIlLqQefdsp]))*$/
const refmt = /([1-9]\d*)?([xcbB?hHiIlLqQefdsp])/g
const str = (v,o,c) => String.fromCharCode(
    ...new Uint8Array(v.buffer, v.byteOffset + o, c))
const rts = (v,o,c,s) => new Uint8Array(v.buffer, v.byteOffset + o, c)
    .set(s.split('').map(str => str.charCodeAt(0)))
const pst = (v,o,c) => str(v, o + 1, Math.min(v.getUint8(o), c - 1))
const tsp = (v,o,c,s) => { v.setUint8(o, s.length); rts(v, o + 1, c - 1, s) }
const lut = le => ({
    x: c=>[1,c,0],
    c: c=>[c,1,o=>({u:v=>str(v, o, 1)      , p:(v,c)=>rts(v, o, 1, c)     })],
    '?': c=>[c,1,o=>({u:v=>Boolean(v.getUint8(o)),p:(v,B)=>v.setUint8(o,B)})],
    b: c=>[c,1,o=>({u:v=>v.getInt8(   o   ), p:(v,b)=>v.setInt8(   o,b   )})],
    B: c=>[c,1,o=>({u:v=>v.getUint8(  o   ), p:(v,B)=>v.setUint8(  o,B   )})],
    h: c=>[c,2,o=>({u:v=>v.getInt16(  o,le), p:(v,h)=>v.setInt16(  o,h,le)})],
    H: c=>[c,2,o=>({u:v=>v.getUint16( o,le), p:(v,H)=>v.setUint16( o,H,le)})],
    i: c=>[c,4,o=>({u:v=>v.getInt32(  o,le), p:(v,i)=>v.setInt32(  o,i,le)})],
    I: c=>[c,4,o=>({u:v=>v.getUint32( o,le), p:(v,I)=>v.setUint32( o,I,le)})],
    l: c=>[c,4,o=>({u:v=>v.getInt32(  o,le), p:(v,i)=>v.setInt32(  o,i,le)})],
    L: c=>[c,4,o=>({u:v=>v.getUint32( o,le), p:(v,I)=>v.setUint32( o,I,le)})],
    q: c=>[c,8,o=>({u:v=>v.getBigInt64(  o,le), p:(v,i)=>v.setBigInt64(  o,i,le)})],
    Q: c=>[c,8,o=>({u:v=>v.getBigUint64( o,le), p:(v,I)=>v.setBigUint64( o,I,le)})],
    e: c=>[c,2,o=>({u:v=>v.getFloat16(o,le), p:(v,f)=>v.setFloat16(o,f,le)})],
    f: c=>[c,4,o=>({u:v=>v.getFloat32(o,le), p:(v,f)=>v.setFloat32(o,f,le)})],
    d: c=>[c,8,o=>({u:v=>v.getFloat64(o,le), p:(v,d)=>v.setFloat64(o,d,le)})],
    s: c=>[1,c,o=>({u:v=>str(v,o,c), p:(v,s)=>rts(v,o,c,s.slice(0,c    ) )})],
    p: c=>[1,c,o=>({u:v=>pst(v,o,c), p:(v,s)=>tsp(v,o,c,s.slice(0,c - 1) )})]
})
const errbuf = new RangeError("Structure larger than remaining buffer")
const errval = new RangeError("Not enough values for structure")

function struct(format) {
    let fns = [], size = 0, m = rechk.exec(format)
    if (!m) { throw new RangeError("Invalid format string") }

    const t = lut('<' === m[1])
    const lu = (n, c) => t[c](n ? parseInt(n, 10) : 1)

    while (m = refmt.exec(format)) {
        ((r, s, f) => {
            for (let i = 0; i < r; ++i, size += s) {
                if (f) {
                    fns.push(f(size))
                }
            }
        })(...lu(...m.slice(1)))
    }

    const unpack_from = (arrb, offs) => {
        if (arrb.byteLength < (offs|0) + size) { throw errbuf }
        let v = new DataView(arrb, offs|0)
        return fns.map(f => f.u(v))
    }
    const pack_into = (arrb, offs, ...values) => {
        if (values.length < fns.length) { throw errval }
        if (arrb.byteLength < offs + size) { throw errbuf }
        const v = new DataView(arrb, offs)
        new Uint8Array(arrb, offs, size).fill(0)
        fns.forEach((f, i) => f.p(v, values[i]))
    }
    const pack = (...values) => {
        let b = new ArrayBuffer(size)
        pack_into(b, 0, ...values)
        return b
    }
    const unpack = arrb => unpack_from(arrb, 0)
    function* iter_unpack(arrb) { 
        for (let offs = 0; offs + size <= arrb.byteLength; offs += size) {
            yield unpack_from(arrb, offs);
        }
    }
    return Object.freeze({
        unpack, pack, unpack_from, pack_into, iter_unpack, format, size})
}

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

class NxdtInterrupted extends NxdtError {}

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
        try { await this.device.releaseInterface(this.interface) } catch (e) {}
        try { await this.device.reset() } catch (e) {}
        try { await this.device.close() } catch (e) {}
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
class NxdtTransfer {
    constructor(name, size) {
        this.dialog = document.getElementById("transfer")
        this.title = this.dialog.querySelector('#name')
        this.progress = this.dialog.querySelector('progress')

        this.title.innerText = name;
        this.progress.value = 0;
        this.progress.max = size;
    }

    show() {
        this.dialog.showModal()
    }

    update(increment) {
        this.progress.value += increment
    }

    close() {
        this.dialog.close()
    }
}

class NxdtSession {
    constructor(dir, usb) {
        return this.setup(dir, usb).then(() => this)
    }

    async setup(dir, usb) {
        this.dir = dir
        this.usb = usb
        await this.handleSessionCmd()
    }

    async sendStatus(code) {
        var status = struct('<4sIH6x').pack(NXDT.ABI.MAGIC, code, this.usb.packetSize)
        var wr = await this.usb.write(status)

        if (wr != status.byteLength) {
            throw new NxdtError("Failed to send status code!")
        }

        if (code != NXDT.STATUS.SUCCESS) {
            throw new NxdtError(`Command unsuccessful (${code})`)
        }
    }

    async makeFile(filename) {
        var file
        try {
            file = await makeFile(this.dir, filename)
        } catch (e) {
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
        }
        return file
    }

    async getCmdHeader() {
        const cmd_header = await this.usb.read(NXDT.SIZE.CMD_HEADER)

        if (!cmd_header || cmd_header.byteLength != NXDT.SIZE.CMD_HEADER) {
            throw new NxdtError(`Failed to read ${NXDT.SIZE.CMD_HEADER}-byte long command header!`)
        }

        console.debug('Received command header data.')

        return cmd_header
    }

    async parseCmdHeader(cmd_header) {
        if (!cmd_header || cmd_header.byteLength != NXDT.SIZE.CMD_HEADER) {
            throw new NxdtError(`Failed to read ${NXDT.SIZE.CMD_HEADER}-byte long command header!`)
        }

        const [magic, cmd_id, cmd_block_size, _] = struct("<4sIII").unpack_from(header, 0)

        // Verify magic word.
        if (magic != NXDT.ABI.MAGIC) {
            await this.sendStatus(NXDT.STATUS.INVALID_MAGIC_WORD)
        }

        // Verify command handler.
        if (!Object.values(NXDT.COMMAND).includes(cmd_id)) {
            await this.sendStatus(NXDT.STATUS.UNSUPPORTED_CMD)
        }

        return [cmd_id, cmd_block_size]
    }

    async getCmdBlock(cmd_block_size) {
        // Handle Zero-Length Termination packet (if needed).
        const rd_size = this.usb.isValueAlignedToEndpointPacketSize(cmd_block_size) ? cmd_block_size + 1 : cmd_block_size

        const cmd_block = await this.usb.read(rd_size)

        if (!cmd_block || cmd_block.byteLength != cmd_block_size) {
            throw new NxdtError(`Failed to read ${cmd_block_size}-byte long command block for command ID ${cmd_id}!`)
        }

        console.debug('Received command block data.')

        return cmd_block
    }

    async handleFileCmd(cmd_id, cmd_block) {
        const [filename, file_size, nsp_header_size] = await this.parseFileHeader(cmd_id, cmd_block)

        // Get file object.
        const file = await this.makeFile(filename)
        this.transfer = new NxdtTransfer(filename, file_size)

        this.transfer.show()
        try {
            if (nsp_header_size) {
                await this.handleNspTransfer(file, file_size, nsp_header_size)
            } else {
                await this.handleFileTransfer(file, file_size)
            }
        } finally {
            this.transfer.close()
            await file.close()
        }
    }

    async parseFileHeader(cmd_id, cmd_block) {
        // Perform sanity checks.
        if (cmd_id != NXDT.COMMAND.SEND_FILE_PROPERTIES || cmd_block.byteLength != NXDT.SIZE.SEND_FILE_PROPERTIES_HEADER) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
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
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
        }

        if (nsp_header_size >= file_size) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        if ((!filename_length) || (filename_length > NXDT.SIZE.SEND_FILE_PROPERTIES_NAME)) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)

        return [filename, file_size, nsp_header_size]
    }

    async handleNspTransfer(file, file_size, nsp_header_size) {
        var cmd_header, cmd_id, cmd_block_length, cmd_block

        // Write NSP header padding right away.
        await file.seek(nsp_header_size)

        // NSP entrys
        var offset = 0
        while (offset < (file_size - nsp_header_size)) {
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
            cmd_block = await this.getCmdBlock(cmd_block_length);

            if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
                await this.handleCancelCmd(cmd_id, cmd_block)
            }

            const [entryname, entry_size, entry_header] = await this.parseFileHeader(cmd_id, cmd_block)
            console.debug(`Reciving NSP entry ${entryname}`)

            if (entry_header) {
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            }

            await this.handleFileTransfer(file, entry_size)
            offset += entry_size
        }

        // NSP header
        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);

        if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
            await this.handleCancelCmd(cmd_id, cmd_block)
        }

        if (cmd_id != NXDT.COMMAND.SEND_NSP_HEADER || cmd_block.byteLength != nsp_header_size) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        await file.seek(0)
        await file.write(cmd_block)
        offset += cmd_block.byteLength
        this.transfer.update(cmd_block.byteLength)

        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async handleFileTransfer(file, file_size) {
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

            // Check if we're dealing with a CancelFileTransfer command.
            if (chunk.byteLength == NXDT.SIZE.CMD_HEADER) {
                var cmd_id, cmd_block_length, cmd_block
                try {
                    [cmd_id, cmd_block_length] = await this.parseCmdHeader(chunk)
                } catch (e) {}

                if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
                    cmd_block = await this.getCmdBlock(cmd_block_length);
                    await this.handleCancelCmd(cmd_id, cmd_block)
                }
            }

            // Write current chunk.
            await file.write(chunk)

            // Update current offset.
            offset += chunk.byteLength
            this.transfer.update(chunk.byteLength)
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async handleCancelCmd(cmd_id, cmd_block) {
        if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER || cmd_block.byteLength != 0) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)
        throw new NxdtInterrupted("Transfer cancelled")
    }

    async parseFsCmdHeader(cmd_id, cmd_block) {
        // Perform sanity checks.
        if (cmd_id != NXDT.COMMAND.START_EXTRACTED_FS_DUMP || cmd_block.byteLength != NXDT.SIZE.START_EXTRACTED_FS_DUMP_HEADER) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        // Parse command block.
        var [extracted_fs_size, extracted_fs_root_path] = struct(`<Q${NXDT.SIZE.SEND_FILE_PROPERTIES_NAME}s`).unpack_from(cmd_block, 0)

        // Perform sanity checks.
        if (extracted_fs_size > BigInt(Number.MAX_SAFE_INTEGER)) {
            await this.sendStatus(NXDT.STATUS.HOST_IO_ERROR)
        }
        extracted_fs_size = Number(extracted_fs_size)

        console.info(`Starting extracted FS dump (size ${extracted_fs_size}, output relative path "${extracted_fs_root_path}").`)

        await this.sendStatus(NXDT.STATUS.SUCCESS)

        return [extracted_fs_size, extracted_fs_root_path]
    }

    async handleFsCmd(cmd_id, cmd_block) {
        const [extracted_fs_size, extracted_fs_root_path] = this.parseFsCmdHeader(cmd_id, cmd_block)

        this.transfer = new NxdtTransfer(extracted_fs_root_path, extracted_fs_size)

        this.transfer.show()
        try {
            await this.handleFsTransfer(extracted_fs_size)
        } finally {
            this.transfer.close()
        }

        // FS end
        var cmd_header, cmd_id, cmd_block_length, cmd_block
        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);

        if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
            await this.handleCancelCmd(cmd_id, cmd_block)
        }

        await this.handleEndFsCmd(cmd_id, cmd_block)
    }

    async handleFsTransfer(extracted_fs_size) {
        var cmd_header, cmd_id, cmd_block

        // Transfer file system
        var offset = 0
        while (offset < extracted_fs_size) {
            var cmd_header, cmd_id, cmd_block_length, cmd_block
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
            cmd_block = await this.getCmdBlock(cmd_block_length);

            if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
                await this.handleCancelCmd(cmd_id, cmd_block)
            }

            const [entryname, entry_size, entry_header] = await this.parseFileHeader(cmd_id, cmd_block)

            if (entry_header) {
                await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
            }

            const file = await this.makeFile(entryname)
            await this.handleFileTransfer(file, entry_size)
            await file.close()

            offset += entry_size
        }
    }

    async handleEndFsCmd(cmd_id, cmd_block) {
        if (cmd_id != NXDT.COMMAND.END_EXTRACTED_FS_DUMP || cmd_block.byteLength != 0) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async parseSessionHeader(cmd_id, cmd_block) {
        // Verify command
        if (cmd_id != NXDT.COMMAND.START_SESSION || cmd_block.byteLength != NXDT.SIZE.START_SESSION_HEADER) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
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
        console.log(`Client info: ${this.usb.device.productName} v${this.client.version.major}.${this.client.version.minor}.${this.client.version.micro}, USB ABI v${this.client.abi.major}.${this.client.abi.minor} (commit ${this.client.version.commit}), USB ${this.usb.version.major}.${this.usb.version.minor}`)

        // Check if we support this ABI version.
        if ((this.client.abi.major  != NXDT.ABI.MAJOR) || (this.client.abi.minor != NXDT.ABI.MINOR)) {
            await this.sendStatus(NXDT.STATUS.UNSUPPORTED_ABI_VERSION)
        }

        // Return status code.
        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }

    async handleSessionTransfer() {
        var cmd_header, cmd_id, cmd_block_length, cmd_block

        while (true) {
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
            cmd_block = await this.getCmdBlock(cmd_header);

            try {
                switch (cmd_id) {
                    case NXDT.COMMAND.SEND_FILE_PROPERTIES:
                        await this.handleFileCmd(cmd_id, cmd_block)
                        break;
                    case NXDT.COMMAND.START_EXTRACTED_FS_DUMP:
                        await this.handleFsCmd(cmd_id, cmd_block)
                        break;
                    case NXDT.COMMAND.END_SESSION:
                        return
                    default:
                        await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
                }
            } catch (e) {
                if (!(e instanceof NxdtInterrupted)) {
                    throw e
                }
            }
        }
    }

    async handleSessionCmd(cmd_id, cmd_block) {
        await this.parseSessionHeader(cmd_id, cmd_block)

        var cmd_header, cmd_block_length

        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);

        await this.handleStartSessionCmd(cmd_id, cmd_block)

        await this.handleSessionTransfer()

        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);

        await this.handleEndSessionCmd(cmd_id, cmd_block)

        console.info('Stopping server.')

    }

    async handleEndSessionCmd(cmd_id, cmd_block) {
        // Verify command
        if (cmd_id != NXDT.COMMAND.END_SESSION || cmd_block.byteLength != 0) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        // Return status code.
        await this.sendStatus(NXDT.STATUS.SUCCESS)
    }
}

async function makeFile(dir, filename) {
    var dirs = filename.split("/").filter(name => name)
    var name = dirs.pop()

    // Create full directory tree.
    var dirname
    for (dirname of dirs) {
        try {
            dir = await dir.getDirectoryHandle(dirname, {create: true})
        } catch (e) {
            throw new NxdtError(`Failed to create directory component! ("${dirname}").`)
        }
    }

    // Make sure the output filepath doesn't point to an existing directory.
    var file
    try {
        file = await dir.getFileHandle(name, {create: true})
    } catch (e) {
        throw new NxdtError(`Failed to create file component! ("${name}").`)
    }

    return await file.createWritable({mode: "exclusive"})
}

async function requestDirectory() {
    try {
        globalThis.directory = await window.showDirectoryPicker({mode: "readwrite"})
    } catch (e) {
        return
    }

    connect_button.disabled = false;
    directory_button.querySelector(".value").innerText = globalThis.directory.name;
    console.debug('Successfully selected output directory!')
}

async function requestDevice() {
    try {
        usbDev = await navigator.usb.requestDevice({ filters: [{ vendorId: NXDT.DEVICE.vendorId, productId: NXDT.DEVICE.productId }] });
    } catch (e) {
        return
    }

    try {
        globalThis.usb = await new NxdtUsb(usbDev);
    } catch (e) {
        await usbDev.forget()
        return
    }

    await globalThis.usb.open()
    connect_button.querySelector('.value').innerText = `${globalThis.usb.device.productName} (${globalThis.usb.device.serialNumber})`

    await new NxdtSession(globalThis.directory, globalThis.usb)

    await globalThis.usb.close()
    connect_button.querySelector('.value').innerText = 'Not connected'
}


const connect_button = document.getElementById("src");
const directory_button = document.getElementById("dst");
const notify_button = document.getElementById("notify");

connect_button.addEventListener("click", requestDevice)
directory_button.addEventListener("click", requestDirectory)


const fs_supported = window?.showDirectoryPicker;
const usb_supported = navigator?.usb?.requestDevice;

console.debug(`WebUSB API support: ${usb_supported ? 'Yes' : 'No'}`)
console.debug(`File System API support: ${fs_supported ? 'Yes' : 'No'}`)

if (!fs_supported || !usb_supported) {
    const browser_dialog = document.getElementById("browser");
    browser_dialog.showModal()
}


if (Notification.permission == "granted") {}


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

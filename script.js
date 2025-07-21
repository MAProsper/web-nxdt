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

        var cmd_header, cmd_id, cmd_block_length, cmd_block
        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);
        await this.handleSessionCmd(cmd_id, cmd_block)
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

        const [magic, cmd_id, cmd_block_size, _] = struct("<4sIII").unpack_from(cmd_header, 0)
        console.debug(`parseCmdHeader(magic=${magic}, cmd_id=${cmd_id}, cmd_block_size=${cmd_block_size})`)

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
        var rd_size = cmd_block_size
        if (this.usb.isValueAlignedToEndpointPacketSize(cmd_block_size)) {
            rd_size += 1
        }

        var cmd_block
        if (cmd_block_size) {
            cmd_block = await this.usb.read(rd_size)
        } else {
            cmd_block = new ArrayBuffer()
        }

        if (cmd_block.byteLength != cmd_block_size) {
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
        const [extracted_fs_size, extracted_fs_root_path] = await this.parseFsCmdHeader(cmd_id, cmd_block)

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
            cmd_block = await this.getCmdBlock(cmd_block_length);

            try {
                switch (cmd_id) {
                    case NXDT.COMMAND.SEND_FILE_PROPERTIES:
                        await this.handleFileCmd(cmd_id, cmd_block)
                        break;
                    case NXDT.COMMAND.START_EXTRACTED_FS_DUMP:
                        await this.handleFsCmd(cmd_id, cmd_block)
                        break;
                    case NXDT.COMMAND.END_SESSION:
                        await this.handleEndSessionCmd(cmd_id, cmd_block)
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

        /*
        cmd_header = await this.getCmdHeader();
        [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
        cmd_block = await this.getCmdBlock(cmd_block_length);

        await this.handleStartSessionCmd(cmd_id, cmd_block)
        */

        await this.handleSessionTransfer()

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
    try {
        await new NxdtSession(globalThis.directory, globalThis.usb)
    } finally {
        await globalThis.usb.close()
        connect_button.querySelector('.value').innerText = 'Not connected'
    }
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
const re_format = /^([<>])?(([1-9]\d*)?([xcbB?hHiIlLqQefdsp]))*$/
const re_token = /([1-9]\d*)?([xcbB?hHiIlLqQefdsp])/g
const str = (view,offset,count) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, count))
const rts = (view,offset,count,s) => new Uint8Array(view.buffer, view.byteOffset + offset, count).set(s.split('').map(str => str.charCodeAt(0)))
const pst = (view,offset,count) => str(view, offset + 1, Math.min(view.getUint8(offset), count - 1))
const tsp = (view,offset,count,s) => { view.setUint8(offset, s.length); rts(view, offset + 1, count - 1, s) }
const endianTable = littleEndian => ({
    x: token_int=>[1,token_int,0],
    c: token_int=>[token_int,1,offset=>({unpack:view=>str(view, offset, 1)      , pack:(view,char)=>rts(view, offset, 1, char)     })],
    '?': token_int=>[token_int,1,offset=>({unpack:view=>Boolean(view.getUint8(offset)),pack:(view,bool)=>view.setUint8(offset,bool)})],
    b: token_int=>[token_int,1,offset=>({unpack:view=>view.getInt8(   offset   ), pack:(view,char)=>view.setInt8(   offset,char   )})],
    B: token_int=>[token_int,1,offset=>({unpack:view=>view.getUint8(  offset   ), pack:(view,uchar)=>view.setUint8(  offset,uchar   )})],
    h: token_int=>[token_int,2,offset=>({unpack:view=>view.getInt16(  offset,littleEndian), pack:(view,short)=>view.setInt16(  offset,short,littleEndian)})],
    H: token_int=>[token_int,2,offset=>({unpack:view=>view.getUint16( offset,littleEndian), pack:(view,ushort)=>view.setUint16( offset,ushort,littleEndian)})],
    i: token_int=>[token_int,4,offset=>({unpack:view=>view.getInt32(  offset,littleEndian), pack:(view,int)=>view.setInt32(  offset,int,littleEndian)})],
    I: token_int=>[token_int,4,offset=>({unpack:view=>view.getUint32( offset,littleEndian), pack:(view,uint)=>view.setUint32( offset,uint,littleEndian)})],
    l: token_int=>[token_int,4,offset=>({unpack:view=>view.getInt32(  offset,littleEndian), pack:(view,long)=>view.setInt32(  offset,long,littleEndian)})],
    L: token_int=>[token_int,4,offset=>({unpack:view=>view.getUint32( offset,littleEndian), pack:(view,ulong)=>view.setUint32( offset,ulong,littleEndian)})],
    q: token_int=>[token_int,8,offset=>({unpack:view=>view.getBigInt64(  offset,littleEndian), pack:(view,longlong)=>view.setBigInt64(  offset,longlong,littleEndian)})],
    Q: token_int=>[token_int,8,offset=>({unpack:view=>view.getBigUint64( offset,littleEndian), pack:(view,ulonglong)=>view.setBigUint64( offset,ulonglong,littleEndian)})],
    e: token_int=>[token_int,2,offset=>({unpack:view=>view.getFloat16(offset,littleEndian), pack:(view,hfloat)=>view.setFloat16(offset,hfloat,littleEndian)})],
    f: token_int=>[token_int,4,offset=>({unpack:view=>view.getFloat32(offset,littleEndian), pack:(view,float)=>view.setFloat32(offset,float,littleEndian)})],
    d: token_int=>[token_int,8,offset=>({unpack:view=>view.getFloat64(offset,littleEndian), pack:(view,double)=>view.setFloat64(offset,double,littleEndian)})],
    s: token_int=>[1,token_int,offset=>({unpack:view=>str(view,offset,token_int), pack:(view,str)=>rts(view,offset,token_int,str.slice(0,token_int    ) )})],
    p: token_int=>[1,token_int,offset=>({unpack:view=>pst(view,offset,token_int), pack:(view,str)=>tsp(view,offset,token_int,str.slice(0,token_int - 1) )})]
})
const error_buffer = new RangeError("Structure larger than remaining buffer")
const error_values = new RangeError("Not enough values for structure")

function struct(format) {
    let format_handlers = [], size = 0, match = re_format.exec(format)
    if (!match) { throw new RangeError("Invalid format string") }

    const littleEndian = '<' === match[1]
    const table = endianTable(littleEndian)

    while (match = re_token.exec(format)) {
        var [token_int, token_code] = match.slice(1);
        token_int = token_int ? parseInt(token_int, 10) : 1;
        var [token_reps, token_size, get_token_handlers] = table[token_code](token_int);

        {
            for (let i = 0; i < token_reps; ++i, size += token_size) {
                if (get_token_handlers) {
                    format_handlers.push(get_token_handlers(size))
                }
            }
        }
    }

    const unpack_from = (buffer, offset) => {
        if (buffer.byteLength < (offset|0) + size) { throw error_buffer }
        let view = new DataView(buffer, offset|0)
        return format_handlers.map(token_handlers => token_handlers.unpack(view))
    }
    const pack_into = (buffer, offset, ...values) => {
        if (values.length < format_handlers.length) { throw error_values }
        if (buffer.byteLength < offset + size) { throw error_buffer }
        const view = new DataView(buffer, offset)
        new Uint8Array(buffer, offset, size).fill(0)
        format_handlers.forEach((token_handlers, index) => token_handlers.pack(view, values[index]))
    }
    const pack = (...values) => {
        let buffer = new ArrayBuffer(size)
        pack_into(buffer, 0, ...values)
        return buffer
    }
    const unpack = buffer => unpack_from(buffer, 0)
    function* iter_unpack(buffer) { 
        for (let offset = 0; offset + size <= buffer.byteLength; offset += size) {
            yield unpack_from(buffer, offset);
        }
    }
    return Object.freeze({
        unpack, pack, unpack_from, pack_into, iter_unpack, format, size})
}

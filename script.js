const NXDT = {
    DEVICE: {
        vendorId: 0x057E, productId: 0x3000,
        manufacturerName: 'DarkMatterCore', productName: 'nxdumptool'
    },
    SIZE: {
        CMD_HEADER: 0x10,
        START_SESSION_HEADER: 0x10,
        SEND_FILE_PROPERTIES_HEADER: 0x320,
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
        START_SESSION: 0,
        SEND_FILE_PROPERTIES: 1,
        CANCEL_FILE_TRANSFER: 2,
        SEND_NSP_HEADER: 3,
        END_SESSION: 4,
        START_EXTRACTED_FS_DUMP: 5,
        END_EXTRACTED_FS_DUMP: 6,
    },
    STATUS: {
        SUCCESS: 0,
        INVALID_MAGIC_WORD: 4,
        UNSUPPORTED_CMD: 5,
        UNSUPPORTED_ABI_VERSION: 6,
        MALFORMED_CMD: 7,
        HOST_IO_ERROR: 8,
    }
}

class NxdtError extends Error { }

class NxdtInterrupted extends NxdtError { }

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
        try { await this.device.releaseInterface(this.interface) } catch (e) { }
        try { await this.device.reset() } catch (e) { }
        try { await this.device.close() } catch (e) { }
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

        this.name = this.dialog.querySelector('.value')
        this.progess = this.dialog.querySelector('progress')
        this.progressLabel = this.dialog.querySelector('#transfer-progress')
        this.progressTime = this.dialog.querySelector('#transfer-time')

        this.name.innerText = name;

        this.progess.value = 0;
        this.progess.max = size;
        
        this.update(0)
        
        this.start = Date.now()
    }

    show() {
        this.dialog.showModal()
    }

    formatTime(sec) {
        if (sec < 60) return `${Math.round(sec)} sec`;
        sec /= 60;
        if (sec < 60) return `${Math.round(sec)} min`
        return `${Math.round(sec)} h`
    }

    update(increment) {
        this.progess.value += increment

        const perc = this.progess.value / this.progess.max
        this.progressLabel.innerText = `${Math.round(perc * 100)} %`

        const elapsedTime = Date.now() - this.start;

        if (elapsedTime < 2000) {
            this.progressTime.innerText = 'estimating…'
        } else {
            const remaindTime = (elapsedTime / perc) * (1 - perc)
            this.progressTime.innerText = this.formatTime(remaindTime / 1000)
        }

    }

    close() {
        this.dialog.close()
    }
}

function showToast(message) {
    console.info(`Notification: ${message}`)
    if (Notification.permission == 'granted') {
        notifyButton.querySelector('.value').innerText = 'Enabled'
        notifyButton.disabled = true;

        new Notification(document.title, {body: message})
    } else {
        notifyButton.querySelector('.value').innerText = 'Disabled'
        notifyButton.disabled = false;

        const toast = document.getElementById('toast')
        toast.innerText = message
        if (toast.cancel) clearTimeout(toast.cancel)
        toast.togglePopover(true)
        toast.cancel = setTimeout(() => toast.togglePopover(false), 2000)
    }
}

class NxdtSession {
    constructor(dir, usb) {
        this.dir = dir
        this.usb = usb
    }

    async sendStatus(code) {
        var status = new Struct('<4sIH6x').pack(NXDT.ABI.MAGIC, code, this.usb.packetSize)
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

        const [magic, cmd_id, cmd_block_size, _] = new Struct("<4sIII").unpack_from(cmd_header, 0)
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
            await file.close()
            this.transfer.close()
        }

        showToast("Transfer successful")
    }

    async parseFileHeader(cmd_id, cmd_block) {
        // Perform sanity checks.
        if (cmd_id != NXDT.COMMAND.SEND_FILE_PROPERTIES || cmd_block.byteLength != NXDT.SIZE.SEND_FILE_PROPERTIES_HEADER) {
            await this.sendStatus(NXDT.STATUS.MALFORMED_CMD)
        }

        // Parse command block.
        const [raw_file_size, filename_length, nsp_header_size] = new Struct('<QII').unpack_from(cmd_block, 0)
        const filename = new Struct(`<${filename_length}s`).unpack_from(cmd_block, 16)[0]
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
                } catch (e) { }

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
        if (cmd_id != NXDT.COMMAND.CANCEL_FILE_TRANSFER || cmd_block.byteLength != 0) {
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
        var [extracted_fs_size, extracted_fs_root_path] = new Struct(`<Q${NXDT.SIZE.SEND_FILE_PROPERTIES_NAME}s`).unpack_from(cmd_block, 0)

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

            // FS end
            var cmd_header, cmd_id, cmd_block_length, cmd_block
            cmd_header = await this.getCmdHeader();
            [cmd_id, cmd_block_length] = await this.parseCmdHeader(cmd_header);
            cmd_block = await this.getCmdBlock(cmd_block_length);

            if (cmd_id == NXDT.COMMAND.CANCEL_FILE_TRANSFER) {
                await this.handleCancelCmd(cmd_id, cmd_block)
            }

            await this.handleEndFsCmd(cmd_id, cmd_block)
        } finally {
            this.transfer.close()
        }

        showToast("Transfer successful")
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
        const [version_major, version_minor, version_micro, abi_version, version_commit] = new Struct('<BBBB8s').unpack_from(cmd_block, 0)
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
        if ((this.client.abi.major != NXDT.ABI.MAJOR) || (this.client.abi.minor != NXDT.ABI.MINOR)) {
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

                showToast("Transfer interrupted")
            }
        }
    }

    async handleSessionCmd(cmd_id, cmd_block) {

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
            dir = await dir.getDirectoryHandle(dirname, { create: true })
        } catch (e) {
            throw new NxdtError(`Failed to create directory component! ("${dirname}").`)
        }
    }

    // Make sure the output filepath doesn't point to an existing directory.
    var file
    try {
        file = await dir.getFileHandle(name, { create: true })
    } catch (e) {
        throw new NxdtError(`Failed to create file component! ("${name}").`)
    }

    return await file.createWritable({ mode: "exclusive" })
}

async function requestDirectory() {
    const blocker = new NxdtBlocker("Destination directory")
    blocker.open()
    try {
        globalThis.directory = await window.showDirectoryPicker({ mode: "readwrite" })
    } catch (e) {
        return
    } finally {
        blocker.close()
    }

    deviceButton.disabled = false;
    directoryButton.querySelector(".value").innerText = globalThis.directory.name;

    navigator.usb.addEventListener("connect", async (event) => {
        await setupDevice(event.device)
    })

    const usbDev = await getDevice()
    if (usbDev) await setupDevice(usbDev)
}

async function requestDevice() {
    const blocker = new NxdtBlocker("Source device")
    blocker.open()
    var usbDev
    try {
        usbDev = await navigator.usb.requestDevice({ filters: [{ vendorId: NXDT.DEVICE.vendorId, productId: NXDT.DEVICE.productId }] });
    } finally {
        blocker.close()
    }

    await setupDevice(usbDev)
}

async function getDevice() {
    return (await navigator.usb.getDevices()).find(dev => dev.vendorId == NXDT.DEVICE.vendorId && dev.productId == NXDT.DEVICE.productId)
}

async function setupDevice(usbDev) {
    try {
        globalThis.usb = await new NxdtUsb(usbDev);
        await globalThis.usb.open()
    } catch (e) {
        showToast("Device unavailable")
        throw e
    }

    const session = new NxdtSession(globalThis.directory, globalThis.usb)
    
    try {
        var cmd_header, cmd_id, cmd_block_length, cmd_block
        cmd_header = await session.getCmdHeader();
        [cmd_id, cmd_block_length] = await session.parseCmdHeader(cmd_header);
        cmd_block = await session.getCmdBlock(cmd_block_length);
        
        await session.parseSessionHeader(cmd_id, cmd_block)
    } catch (e) {
        showToast("Device incompatible")
        await globalThis.usb.device.forget()
        delete globalThis.usb
        throw e
    }

    deviceButton.querySelector('.value').innerText = `${globalThis.usb.device.productName} (${globalThis.usb.device.serialNumber})`
    try {
        await session.handleSessionTransfer()
    } catch (e) {
        showToast("Connection interrupted")
    } finally {
        await globalThis.usb.close()
        delete globalThis.usb
        deviceButton.querySelector('.value').innerText = 'Not connected'
    }
}

class NxdtBlocker {
    constructor(name) {
        this.dialog = document.getElementById("blocker")
        this.name = this.dialog.querySelector(".value")

        this.name.innerText = name
    }

    open() {
        this.dialog.showModal()
    }

    close() {
        this.dialog.close()
    }
}

async function requestNotify() {
    const blocker = new NxdtBlocker("Notification permission")
    blocker.open()
    try {
        await Notification.requestPermission()
    } finally {
        blocker.close()
    }

    if (Notification.permission == 'granted') {
        notifyButton.querySelector('.value').innerText = 'Enabled'
        notifyButton.disabled = true;
    } else {
        showToast("Notifications denied")
    }
}


const directoryButton = document.getElementById("directory");
const deviceButton = document.getElementById("device");
const notifyButton = document.getElementById("notify");

const deviceRules = document.getElementById("device-rules");
deviceRules.innerText = `SUBSYSTEM=="usb", ATTRS{idVendor}=="${NXDT.DEVICE.vendorId.toString(16).padStart(4, "0")}", ATTRS{idProduct}=="${NXDT.DEVICE.productId.toString(16).padStart(4, "0")}", TAG+="uaccess"`

directoryButton.addEventListener("click", requestDirectory)
deviceButton.addEventListener("click", requestDevice)
notifyButton.addEventListener("click", requestNotify)


const fsSupported = window?.showDirectoryPicker;
const usbSupported = navigator?.usb?.requestDevice;

console.debug(`WebUSB API support: ${usbSupported ? 'Yes' : 'No'}`)
console.debug(`File System API support: ${fsSupported ? 'Yes' : 'No'}`)

if (!fsSupported || !usbSupported) {
    const supportDialog = document.getElementById("support");
    supportDialog.showModal()
}


if (Notification.permission == "granted") {
    notifyButton.querySelector('.value').innerText = 'Enabled'
    notifyButton.disabled = true;
}

// Highly modified https://github.com/lyngklip/structjs

class StructError extends Error {}

class Struct {
    static #re_token = /([1-9]\d*)?([xcbB?hHiIlLqQefdsp])/g
    static #re_format = /^([<>])?(([1-9]\d*)?([xcbB?hHiIlLqQefdsp]))*$/

    static #unpack_string(view, offset, size) { return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, size)) }
    static #pack_string(view, offset, size, value) { new Uint8Array(view.buffer, view.byteOffset + offset, size).set(value.split('').map(str => str.charCodeAt(0))) }
    static #unpack_pascal(view, offset, size) { return Struct.#unpack_string(view, offset + 1, Math.min(view.getUint8(offset), size - 1)) }
    static #pack_pascal(view, offset, size, value) { view.setUint8(offset, value.length); Struct.#pack_string(view, offset + 1, size - 1, value) }

    static sizeof_x(count) { return { reps: 1, size: count } }
    static sizeof_c(count) { return { reps: count, size: 1 } }
    static pack_c(view, offset, size, littleEndian, value) { Struct.#pack_string(view, offset, 1, value) }
    static unpack_c(view, offset, size, littleEndian) { return Struct.#unpack_string(view, offset, 1) }
    static sizeof_0(count) { return { reps: count, size: 1 } }
    static pack_0(view, offset, size, littleEndian, value) { view.setUint8(offset, value) }
    static unpack_0(view, offset, size, littleEndian) { return view.getInt8(offset) }
    static sizeof_b(count) { return { reps: count, size: 1 } }
    static pack_b(view, offset, size, littleEndian, value) { view.setInt8(offset, value) }
    static unpack_b(view, offset, size, littleEndian) { return view.getInt8(offset) }
    static sizeof_B(count) { return { reps: count, size: 1 } }
    static pack_B(view, offset, size, littleEndian, value) { view.setUint8(offset, value) }
    static unpack_B(view, offset, size, littleEndian) { return view.getUint8(offset) }
    static sizeof_h(count) { return { reps: count, size: 2 } }
    static pack_h(view, offset, size, littleEndian, value) { view.setInt16(offset, value, littleEndian) }
    static unpack_h(view, offset, size, littleEndian) { return view.getInt16(offset, littleEndian) }
    static sizeof_H(count) { return { reps: count, size: 2 } }
    static pack_H(view, offset, size, littleEndian, value) { view.setUint16(offset, value, littleEndian) }
    static unpack_H(view, offset, size, littleEndian) { return view.getUint16(offset, littleEndian) }
    static sizeof_i(count) { return { reps: count, size: 4 } }
    static pack_i(view, offset, size, littleEndian, value) { view.setInt32(offset, value, littleEndian) }
    static unpack_i(view, offset, size, littleEndian) { return view.getInt32(offset, littleEndian) }
    static sizeof_I(count) { return { reps: count, size: 4 } }
    static pack_I(view, offset, size, littleEndian, value) { view.setUint32(offset, value, littleEndian) }
    static unpack_I(view, offset, size, littleEndian) { return view.getUint32(offset, littleEndian) }
    static sizeof_l(count) { return { reps: count, size: 4 } }
    static pack_l(view, offset, size, littleEndian, value) { view.setInt32(offset, value, littleEndian) }
    static unpack_l(view, offset, size, littleEndian) { return view.getInt32(offset, littleEndian) }
    static sizeof_L(count) { return { reps: count, size: 4 } }
    static pack_L(view, offset, size, littleEndian, value) { view.setUint32(offset, value, littleEndian) }
    static unpack_L(view, offset, size, littleEndian) { return view.getUint32(offset, littleEndian) }
    static sizeof_q(count) { return { reps: count, size: 8 } }
    static pack_q(view, offset, size, littleEndian, value) { view.setBigInt64(offset, value, littleEndian) }
    static unpack_q(view, offset, size, littleEndian) { return view.getBigInt64(offset, littleEndian) }
    static sizeof_Q(count) { return { reps: count, size: 8 } }
    static pack_Q(view, offset, size, littleEndian, value) { view.setBigUint64(offset, value, littleEndian) }
    static unpack_Q(view, offset, size, littleEndian) { return view.getBigUint64(offset, littleEndian) }
    static sizeof_e(count) { return { reps: count, size: 2 } }
    static pack_e(view, offset, size, littleEndian, value) { view.setFloat16(offset, value, littleEndian) }
    static unpack_e(view, offset, size, littleEndian) { return view.getFloat16(offset, littleEndian) }
    static sizeof_f(count) { return { reps: count, size: 4 } }
    static pack_f(view, offset, size, littleEndian, value) { view.setFloat32(offset, value, littleEndian) }
    static unpack_f(view, offset, size, littleEndian) { return view.getFloat32(offset, littleEndian) }
    static sizeof_d(count) { return { reps: count, size: 8 } }
    static pack_d(view, offset, size, littleEndian, value) { view.setFloat64(offset, value, littleEndian) }
    static unpack_d(view, offset, size, littleEndian) { return view.getFloat64(offset, littleEndian) }
    static sizeof_s(count) { return { reps: 1, size: count } }
    static pack_s(view, offset, size, littleEndian, value) { Struct.#pack_string(view, offset, size, value.slice(0, size)) }
    static unpack_s(view, offset, size, littleEndian) { return Struct.#unpack_string(view, offset, size) }
    static sizeof_p(count) { return { reps: 1, size: count } }
    static pack_p(view, offset, size, littleEndian, value) { Struct.#pack_pascal(view, offset, size, value.slice(0, size - 1)) }
    static unpack_p(view, offset, size, littleEndian) { return Struct.#unpack_pascal(view, offset, size) }

    size = 0;
    #tokens = [];
    #littleEndian = false;

    constructor(format) {
        this.format = format

        let match = Struct.#re_format.exec(format)
        if (!match) { throw new StructError("Invalid format string") }

        this.#littleEndian = '<' === match[1]

        while (match = Struct.#re_token.exec(format)) {
            let [count, format] = match.slice(1);
            count = count ? parseInt(count, 10) : 1;
            format = format == '?' ? '0' : format;

            const {reps, size} = Struct[`sizeof_${format}`](count);
            const [pack, unpack] = [Struct[`pack_${format}`], Struct[`unpack_${format}`]];

            for (let i = 0; i < reps; ++i, this.size += size) {
                if (pack) this.#tokens.push({ pack, unpack, offset: this.size, size })
            }
        }
    }

    unpack_from(buffer, offset) {
        if (buffer.byteLength < (offset || 0) + this.size) {
            throw new StructError("Structure larger than remaining buffer")
        }
        const view = new DataView(buffer, offset || 0)
        return this.#tokens.map(token => token.unpack(view, token.offset, token.size, this.#littleEndian))
    }

    pack_into(buffer, offset, ...values) {
        if (values.length < this.#tokens.length) {
            throw new StructError("Not enough values for structure")
        }
        if (buffer.byteLength < offset + this.size) {
            throw new StructError("Structure larger than remaining buffer")
        }
        const view = new DataView(buffer, offset)
        new Uint8Array(buffer, offset, this.size).fill(0)
        this.#tokens.forEach((token, index) => token.pack(view, token.offset, token.size, this.#littleEndian, values[index]))
    }

    pack(...values) {
        const buffer = new ArrayBuffer(this.size)
        this.pack_into(buffer, 0, ...values)
        return buffer
    }

    unpack(buffer) {
        return this.unpack_from(buffer, 0)
    }

    *iter_unpack(buffer) {
        for (let offset = 0; offset + this.size <= buffer.byteLength; offset += this.size) {
            yield this.unpack_from(buffer, offset);
        }
    }
}

// === STRUCT ===

/* Based on https://github.com/lyngklip/structjs */
class StructError extends Error { }

class Struct {
    static #reToken = /([1-9]\d*)?([xcbB?hHiIlLqQefdsp])/g;
    static #reFormat = /^([<>])?(([1-9]\d*)?([xcbB?hHiIlLqQefdsp]))*$/;

    static sizeof_x(count) { return { reps: 1, size: count } }
    static sizeof_c(count) { return { reps: count, size: 1 } }
    static pack_c(view, offset, size, littleEndian, value) { Struct.pack_s(view, offset, 1, value) }
    static unpack_c(view, offset, size, littleEndian) { return Struct.unpack_s(view, offset, 1) }
    static sizeof_bool(count) { return { reps: count, size: 1 } }
    static pack_bool(view, offset, size, littleEndian, value) { view.setUint8(offset, Boolean(value)) }
    static unpack_bool(view, offset, size, littleEndian) { return Boolean(view.getInt8(offset)) }
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
    static sizeof_qn(count) { return Struct.sizeof_q(count) }
    static pack_qn(view, offset, size, littleEndian, value) { Struct.pack_q(view, offset, size, littleEndian, BigInt(value)) }
    static unpack_qn(view, offset, size, littleEndian) { return Number(Struct.unpack_q(view, offset, size, littleEndian)) }
    static sizeof_Q(count) { return { reps: count, size: 8 } }
    static pack_Q(view, offset, size, littleEndian, value) { view.setBigUint64(offset, value, littleEndian) }
    static unpack_Q(view, offset, size, littleEndian) { return view.getBigUint64(offset, littleEndian) }
    static sizeof_Qn(count) { return Struct.sizeof_Q(count) }
    static pack_Qn(view, offset, size, littleEndian, value) { Struct.pack_Q(view, offset, size, littleEndian, BigInt(value)) }
    static unpack_Qn(view, offset, size, littleEndian) { return Number(Struct.unpack_Q(view, offset, size, littleEndian)) }
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
    static pack_s(view, offset, size, littleEndian, value) { new Uint8Array(view.buffer, view.byteOffset + offset, size).set(value.split('').map(str => str.charCodeAt(0))) }
    static unpack_s(view, offset, size, littleEndian) { return String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, size)) }
    static sizeof_p(count) { return { reps: 1, size: count } }
    static pack_p(view, offset, size, littleEndian, value) { view.setUint8(offset, value.length); Struct.pack_s(view, offset + 1, size - 1, value) }
    static unpack_p(view, offset, size, littleEndian) { return Struct.unpack_s(view, offset + 1, Math.min(view.getUint8(offset), size - 1)) }

    size = 0;
    #tokens = [];
    #littleEndian = false;
    #map = { '?': 'bool', 'q': 'qn', 'Q': 'Qn' };

    constructor(format, map) {
        this.format = format;
        Object.assign(this.#map, map);

        let match = Struct.#reFormat.exec(format);
        if (!match) { throw new StructError('Invalid format string') }

        this.#littleEndian = '<' === match[1];

        while (match = Struct.#reToken.exec(format)) {
            let [count, format] = match.slice(1);
            count = count ? parseInt(count, 10) : 1;
            format = this.#map[format] || format;

            const { reps, size } = Struct[`sizeof_${format}`](count);
            const [pack, unpack] = [Struct[`pack_${format}`], Struct[`unpack_${format}`]];

            for (let i = 0; i < reps; ++i, this.size += size) {
                if (pack) this.#tokens.push({ pack, unpack, offset: this.size, size });
            }
        }
    }

    unpackFrom(buffer, offset) {
        if (buffer.byteLength < (offset || 0) + this.size) {
            throw new StructError('Structure larger than remaining buffer');
        }
        const view = new DataView(buffer, offset || 0);
        return this.#tokens.map(token => token.unpack(view, token.offset, token.size, this.#littleEndian));
    }

    packInto(buffer, offset, ...values) {
        if (values.length < this.#tokens.length) {
            throw new StructError('Not enough values for structure');
        }
        if (buffer.byteLength < (offset || 0) + this.size) {
            throw new StructError('Structure larger than remaining buffer');
        }
        const view = new DataView(buffer, offset);
        new Uint8Array(buffer, offset, this.size).fill(0);
        this.#tokens.forEach((token, index) => token.pack(view, token.offset, token.size, this.#littleEndian, values[index]));
    }

    pack(...values) {
        const buffer = new ArrayBuffer(this.size);
        this.packInto(buffer, 0, ...values);
        return buffer;
    }

    unpack(buffer) {
        return this.unpackFrom(buffer, 0);
    }

    *iterUnpack(buffer) {
        for (let offset = 0; offset + this.size <= buffer.byteLength; offset += this.size) {
            yield this.unpackFrom(buffer, offset);
        }
    }
}

// === NXDT APP ===
const NXDT = {
    DEVICE: {
        vendorId: 0x057E,
        productId: 0x3000,
        manufacturerName: 'DarkMatterCore',
        productName: 'nxdumptool'
    },
    ABI: {
        MAJOR: 1,
        MINOR: 2,
        MAGIC: 'NXDT'
    },
    COMMAND: {
        START_SESSION: 0,
        FILE_TRANSFER: 1,
        CANCEL_TRANSFER: 2,
        FILE_HEADER_TRANSFER: 3,
        END_SESSION: 4,
        START_FS_TRANSFER: 5,
        END_FS_TRANSFER: 6,
    },
    SIZE: {
        COMMAND_HEADER: 0x10,
        START_SESSION_HEADER: 0x10,
        FILE_TRANSFER_HEADER: 0x320,
        START_FS_TRANSFER_HEADER: 0x310,
        FILE_BLOCK_TRANSFER: 0x800000,
        FILE_NAME_LENGTH: 0x300,
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

NXDT.STRUCT = {
    STATUS_RESPONSE: new Struct('<4sIH6x'),
    COMMAND_HEADER: new Struct('<4sIII'),
    FILE_HEADER: new Struct('<QII'),
    FS_HADER: new Struct(`<Q${NXDT.SIZE.FILE_NAME_LENGTH}s`),
    SESSION_HEADER: new Struct('<BBBB8s')
}

function hex(value, pad) {
    return value.toString(16).padStart(pad || 0, '0')
}

async function makeFile(dir, filePath) {
    const dirs = filePath.split('/').filter(name => name);
    const name = dirs.pop();

    // Create full directory tree.
    let dirname;
    for (dirname of dirs) {
        try {
            dir = await dir.getDirectoryHandle(dirname, { create: true });
        } catch (e) {
            assert(false, `Failed to create directory component! ('${dirname}').`);
        }
    }

    // Make sure the output filepath doesn't point to an existing directory.
    let file;
    try {
        file = await dir.getFileHandle(name, { create: true })
    } catch (e) {
        assert(false, `Failed to create file component! ('${name}').`);
    }

    return await file.createWritable({ mode: 'exclusive' });
}

class NxdtError extends Error { }

class NxdtInterrupted extends NxdtError { }

class NxdtUsb {
    constructor(device) {
        return this.setup(device).then(() => this);
    }

    async setup(device) {
        this.device = device;

        // Check if the product and manufacturer strings match the ones used by nxdumptool.
        // TODO: enable product string check whenever we're ready for a release.
        // this.device.productName == NXDT.DEVICE.productName
        assert(this.device.manufacturerName == NXDT.DEVICE.manufacturerName, 'Invalid manufacturer/product strings!');

        // Get default configuration descriptor.
        const configuration = this.device.configuration;

        // Get default interface descriptor.
        this.interface = configuration.interfaces[0];

        // Retrieve endpoints.
        const endpointIn = this.interface.alternate.endpoints.find(e => e.direction == 'in');
        const endpointOut = this.interface.alternate.endpoints.find(e => e.direction == 'out');

        assert(endpointIn && endpointOut, 'No endpoint addresses!');

        this.endpoint = {
            in: endpointIn.endpointNumber,
            out: endpointOut.endpointNumber,
        }

        // Save endpoint max packet size and USB version.
        this.packetSize = endpointIn.packetSize;
        this.version = {
            major: this.device.usbVersionMajor,
            minor: this.device.usbVersionMinor
        }

        console.debug('Successfully retrieved USB endpoints!');
    }

    async open() {
        await this.device.open();
        try { await this.device.reset() } catch (e) { console.warn(e) }
        await this.device.claimInterface(this.interface);
    }

    async close() {
        try { await this.device.releaseInterface(this.interface) } catch (e) { }
        try { await this.device.reset() } catch (e) { }
        try { await this.device.close() } catch (e) { }
    }

    isAlignedToSize(value) {
        return (value & (this.packetSize - 1)) == 0;
    }

    async read(size) {
        const transfer = await this.device.transferIn(this.endpoint.in, size);
        assert(transfer.status == 'ok', 'USB.read (error)');
        return transfer.data.buffer.transfer();
    }

    async write(data) {
        const transfer = await this.device.transferOut(this.endpoint.out, data);
        assert(transfer.status == 'ok', 'USB.write (error)');
        return transfer.bytesWritten;
    }
}

class NxdtDialog {
    constructor(e) {
        this.dialog = document.getElementById(e);
    }

    open() {
        this.dialog.showModal();
    }

    close() {
        this.dialog.close();
    }
}

class NxdtRequest extends NxdtDialog {
    constructor(name) {
        super('request')

        this.name = this.dialog.querySelector('.value');
        this.name.innerText = name;
    }

    open() {
        this.dialog.showModal();
    }

    close() {
        this.dialog.close();
    }
}

class NxdtTransfer extends NxdtDialog {
    #estimateTime = 2000;

    constructor(name, size) {
        super('transfer')

        this.name = this.dialog.querySelector('.value');
        this.progess = this.dialog.querySelector('progress');
        this.progressLabel = this.dialog.querySelector('#transfer-progress');
        this.progressTime = this.dialog.querySelector('#transfer-time');

        this.start = Date.now();
        this.name.innerText = name;

        this.progess.value = 0;
        this.progess.max = size;

        this.update(0);
    }

    show() {
        this.dialog.showModal();
    }

    #formatTime(sec) {
        if (sec < 60) return `${Math.round(sec)} sec`;
        sec /= 60;
        if (sec < 60) return `${Math.round(sec)} min`;
        return `${Math.round(sec)} h`;
    }

    update(increment) {
        this.progess.value += increment;

        const perc = this.progess.value / this.progess.max;
        this.progressLabel.innerText = `${Math.round(perc * 100)} %`;

        const elapsedTime = Date.now() - this.start;

        if (elapsedTime < this.#estimateTime) {
            this.progressTime.innerText = 'estimating…';
            return;
        }

        const remaindTime = (elapsedTime / perc) * (1 - perc);
        this.progressTime.innerText = this.#formatTime(remaindTime / 1000);
    }

    close() {
        this.dialog.close();
    }
}

function showToast(message, notify) {
    const showTime = 2000;

    console.info(`Notification: ${message}`);
    if (notify) new Notification(document.title, { body: message });

    const toast = document.getElementById('toast');
    toast.innerText = message;

    clearTimeout(toast.timeout);
    toast.togglePopover(true);
    toast.timeout = setTimeout(() => toast.togglePopover(false), showTime);
}

function assert(value, message) {
    if (value) return;
    console.error(message);
    throw new NxdtError(message);
}

class NxdtSession {
    constructor(dir, usb) {
        this.dir = dir;
        this.usb = usb;
    }

    async sendStatus(code) {
        const status = NXDT.STRUCT.STATUS_RESPONSE.pack(NXDT.ABI.MAGIC, code, this.usb.packetSize);
        const wr = await this.usb.write(status);

        assert(wr == status.byteLength, 'Failed to send status code!');
    }

    async makeFile(filePath) {
        try {
            return await makeFile(this.dir, filePath);
        } catch (e) {
            this.assert(false, NXDT.STATUS.HOST_IO_ERROR);
        }
    }

    async assert(value, code) {
        try {
            return assert(value, `Assert failed (${code})!`);
        } catch (e) {
            await this.sendStatus(code);
            throw e;
        }
    }

    async getCmdHeader() {
        const cmdHeader = await this.usb.read(NXDT.SIZE.COMMAND_HEADER);
        assert(cmdHeader.byteLength == NXDT.SIZE.COMMAND_HEADER, `Failed to read ${NXDT.SIZE.COMMAND_HEADER}-byte long command header!`);
        console.debug('Received command header data.');
        return cmdHeader;
    }

    async parseCmdHeader(cmdHeader) {
        assert(cmdHeader && cmdHeader.byteLength == NXDT.SIZE.COMMAND_HEADER, `Failed to read ${NXDT.SIZE.COMMAND_HEADER}-byte long command header!`);

        const [magic, cmdId, cmdBlockSize, _] = NXDT.STRUCT.COMMAND_HEADER.unpack(cmdHeader);
        console.debug(`parseCmdHeader(magic=${magic}, cmdId=${cmdId}, cmdBlockSize=${cmdBlockSize})`);

        // Verify magic word and command id.
        this.assert(magic == NXDT.ABI.MAGIC, NXDT.STATUS.INVALID_MAGIC_WORD);
        this.assert(Object.values(NXDT.COMMAND).includes(cmdId), NXDT.STATUS.UNSUPPORTED_CMD);

        return [cmdId, cmdBlockSize];
    }

    async getCmdBlock(cmdBlockSize) {
        // Handle Zero-Length Termination packet (if needed).
        let rdSize = cmdBlockSize;
        if (this.usb.isAlignedToSize(cmdBlockSize)) {
            rdSize += 1;
        }

        const cmdBlock = cmdBlockSize ? await this.usb.read(rdSize) : new ArrayBuffer();
        assert(cmdBlock.byteLength == cmdBlockSize, `Failed to read ${cmdBlockSize}-byte long command block!`);

        console.debug('Received command block data.');
        return cmdBlock;
    }

    async handleFileCmd(cmdId, cmdBlock) {
        const [filePath, fileSize, headerSize] = await this.parseFileHeader(cmdId, cmdBlock);

        // Get file object.
        const file = await this.makeFile(filePath);
        this.transfer = new NxdtTransfer(filePath, fileSize);

        this.transfer.show();
        try {
            if (headerSize) {
                await this.handleArchiveTransfer(file, fileSize, headerSize);
            } else {
                await this.handleFileTransfer(file, fileSize);
            }
        } finally {
            await file.close();
            this.transfer.close();
        }

        showToast('Transfer successful', true);
    }

    async parseFileHeader(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.FILE_TRANSFER && cmdBlock.byteLength == NXDT.SIZE.FILE_TRANSFER_HEADER, NXDT.STATUS.MALFORMED_CMD);

        // Parse command block.
        const [fileSize, filePathLength, headerSize] = NXDT.STRUCT.FILE_HEADER.unpackFrom(cmdBlock, 0);
        const filePath = new Struct(`<${filePathLength}s`).unpackFrom(cmdBlock, 16)[0];

        // Print info.
        console.debug(`File size: ${fileSize} | File path length: ${filePathLength} | Header size: ${headerSize}.`);
        console.info(`Receiving file: ${filePath}`);

        // Perform sanity checks.
        this.assert(fileSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        this.assert(headerSize < fileSize, NXDT.STATUS.MALFORMED_CMD);
        this.assert(filePathLength && filePathLength <= NXDT.SIZE.FILE_NAME_LENGTH, NXDT.STATUS.MALFORMED_CMD);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        return [filePath, fileSize, headerSize];
    }

    async handleArchiveTransfer(file, fileSize, headerSize) {
        let cmdHeader, cmdId, cmdBlockLength, cmdBlock;

        // Write header padding right away.
        await file.seek(headerSize);

        // File entrys
        let offset = 0;
        while (offset < (fileSize - headerSize)) {
            cmdHeader = await this.getCmdHeader();
            [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
            cmdBlock = await this.getCmdBlock(cmdBlockLength);

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdBlock);
            }

            const [entryname, entrySize, entryHeader] = await this.parseFileHeader(cmdId, cmdBlock);
            this.assert(!entryHeader, NXDT.STATUS.MALFORMED_CMD);
            console.debug(`Reciving file entry ${entryname}`);

            await this.handleFileTransfer(file, entrySize);
            offset += entrySize;
        }

        // File header
        cmdHeader = await this.getCmdHeader();
        [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
        cmdBlock = await this.getCmdBlock(cmdBlockLength);

        if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
            await this.handleCancelCmd(cmdId, cmdBlock);
        }

        await this.assert(cmdId == NXDT.COMMAND.FILE_HEADER_TRANSFER && cmdBlock.byteLength == headerSize, NXDT.STATUS.MALFORMED_CMD);

        await file.seek(0);
        await file.write(cmdBlock);
        offset += cmdBlock.byteLength;
        this.transfer.update(cmdBlock.byteLength);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleFileTransfer(file, fileSize) {
        let offset = 0;
        while (offset < fileSize) {

            // Update block size (if needed).
            const diff = fileSize - offset;
            const blksize = Math.min(NXDT.SIZE.FILE_BLOCK_TRANSFER, diff);

            // Set block size and handle Zero-Length Termination packet (if needed).
            let rdSize = blksize;
            if (((offset + blksize) >= fileSize) && this.usb.isAlignedToSize(blksize)) {
                rdSize += 1;
            }

            // Read current chunk.
            const chunk = await this.usb.read(rdSize);

            // Check if we're dealing with a CancelFileTransfer command.
            if (chunk.byteLength == NXDT.SIZE.COMMAND_HEADER) {
                let cmdId, cmdBlockLength, cmdBlock;
                try {
                    [cmdId, cmdBlockLength] = await this.parseCmdHeader(chunk);
                } catch (e) { }

                if (cmdId != undefined) {
                    cmdBlock = await this.getCmdBlock(cmdBlockLength);
                    await this.handleCancelCmd(cmdId, cmdBlock);
                }
            }

            // Write current chunk.
            await file.write(chunk);
            offset += chunk.byteLength;
            this.transfer.update(chunk.byteLength);
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleCancelCmd(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.CANCEL_TRANSFER && cmdBlock.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        throw new NxdtInterrupted('Transfer cancelled');
    }

    async parseFsCmdHeader(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.START_FS_TRANSFER && cmdBlock.byteLength == NXDT.SIZE.START_FS_TRANSFER_HEADER, NXDT.STATUS.MALFORMED_CMD);

        // Parse command block.
        const [fsSize, fsPath] = NXDT.STRUCT.FS_HADER.unpack(cmdBlock);
        this.assert(fsSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        console.info(`Starting FS transfer (size ${fsSize}, output path '${fsPath}').`);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        return [fsSize, fsPath];
    }

    async handleFsCmd(cmdId, cmdBlock) {
        const [extractedFsSize, extractedFsRootPath] = await this.parseFsCmdHeader(cmdId, cmdBlock);

        this.transfer = new NxdtTransfer(extractedFsRootPath, extractedFsSize);

        this.transfer.show();
        try {
            await this.handleFsTransfer(extractedFsSize);

            // FS end
            let cmdHeader, cmdId, cmdBlockLength, cmdBlock;
            cmdHeader = await this.getCmdHeader();
            [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
            cmdBlock = await this.getCmdBlock(cmdBlockLength);

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdBlock);
            }

            await this.handleEndFsCmd(cmdId, cmdBlock);
        } finally {
            this.transfer.close();
        }

        showToast('Transfer successful', true);
    }

    async handleFsTransfer(extractedFsSize) {
        // Transfer file system
        let offset = 0;
        while (offset < extractedFsSize) {
            let cmdHeader, cmdId, cmdBlockLength, cmdBlock;
            cmdHeader = await this.getCmdHeader();
            [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
            cmdBlock = await this.getCmdBlock(cmdBlockLength);

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdBlock);
            }

            const [entryPath, entrySize, entryHeader] = await this.parseFileHeader(cmdId, cmdBlock);

            this.assert(!entryHeader, NXDT.STATUS.MALFORMED_CMD);

            const file = await this.makeFile(entryPath);
            await this.handleFileTransfer(file, entrySize);
            await file.close();

            offset += entrySize;
        }
    }

    async handleEndFsCmd(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.END_FS_TRANSFER && cmdBlock.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async parseSessionHeader(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.START_SESSION && cmdBlock.byteLength == NXDT.SIZE.START_SESSION_HEADER, NXDT.STATUS.MALFORMED_CMD);

        // Parse command block.
        const [versionMajor, versionMinor, versionMicro, abiVersion, versionCommit] = NXDT.STRUCT.SESSION_HEADER.unpack(cmdBlock);
        const [abiMajor, abiMinor] = [((abiVersion >> 4) & 0x0F), (abiVersion & 0x0F)];

        this.client = {
            version: {
                major: versionMajor,
                minor: versionMinor,
                micro: versionMicro,
                commit: versionCommit
            },
            abi: {
                major: abiMajor,
                minor: abiMinor
            }
        }

        // Print client info.
        console.log(`Client info: ${this.usb.device.productName} v${this.client.version.major}.${this.client.version.minor}.${this.client.version.micro}, USB ABI v${this.client.abi.major}.${this.client.abi.minor} (commit ${this.client.version.commit}), USB ${this.usb.version.major}.${this.usb.version.minor}`);
        this.assert(this.client.abi.major == NXDT.ABI.MAJOR && this.client.abi.minor == NXDT.ABI.MINOR, NXDT.STATUS.UNSUPPORTED_ABI_VERSION);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleSessionTransfer() {
        let cmdHeader, cmdId, cmdBlockLength, cmdBlock;

        while (true) {
            cmdHeader = await this.getCmdHeader();
            [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
            cmdBlock = await this.getCmdBlock(cmdBlockLength);

            try {
                switch (cmdId) {
                    case NXDT.COMMAND.FILE_TRANSFER:
                        await this.handleFileCmd(cmdId, cmdBlock);
                        break;
                    case NXDT.COMMAND.START_FS_TRANSFER:
                        await this.handleFsCmd(cmdId, cmdBlock);
                        break;
                    case NXDT.COMMAND.END_SESSION:
                        await this.handleEndSessionCmd(cmdId, cmdBlock);
                        return
                    default:
                        await this.sendStatus(NXDT.STATUS.MALFORMED_CMD);
                }
            } catch (e) {
                if (!(e instanceof NxdtInterrupted)) {
                    throw e;
                }

                showToast('Transfer interrupted', true);
            }
        }
    }

    async handleSessionCmd(cmdId, cmdBlock) {
        let cmdHeader, cmdBlockLength;

        /*
        cmdHeader = await this.getCmdHeader();
        [cmdId, cmdBlockLength] = await this.parseCmdHeader(cmdHeader);
        cmdBlock = await this.getCmdBlock(cmdBlockLength);

        await this.handleStartSessionCmd(cmdId, cmdBlock);
        */

        await this.handleSessionTransfer();

        console.info('Stopping server.');
    }

    async handleEndSessionCmd(cmdId, cmdBlock) {
        await this.assert(cmdId == NXDT.COMMAND.END_SESSION && cmdBlock.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }
}

// === ENTRY POINT ===
async function requestDirectory() {
    const request = new NxdtRequest('Destination directory');
    request.open();
    try {
        globalThis.directory = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
        return;
    } finally {
        request.close();
    }

    deviceButton.disabled = false;
    directoryButton.querySelector('.value').innerText = globalThis.directory.name;

    navigator.usb.addEventListener('connect', async (event) => {
        if (!globalThis.device) await setupDevice(event.device);
    });

    const device = await getDevice();
    if (device) await setupDevice(device);
}

async function requestDevice() {
    const request = new NxdtRequest('Source device');
    request.open();
    let device;
    try {
        device = await navigator.usb.requestDevice({ filters: [{ vendorId: NXDT.DEVICE.vendorId, productId: NXDT.DEVICE.productId }] });
    } catch (e) {
        return;
    } finally {
        request.close();
    }

    await setupDevice(device);
}

async function requestNotify() {
    const request = new NxdtRequest('Notification permission');
    request.open();
    try {
        await Notification.requestPermission();
    } finally {
        request.close();
    }

    if (Notification.permission == 'granted') {
        notifyButton.querySelector('.value').innerText = 'Allowed';
        notifyButton.disabled = true;
    } else {
        showToast('Notifications denied');
    }
}

async function getDevice() {
    return (await navigator.usb.getDevices()).find(dev => dev.vendorId == NXDT.DEVICE.vendorId && dev.productId == NXDT.DEVICE.productId);
}

async function setupDevice(usbDev) {
    try {
        globalThis.device = await new NxdtUsb(usbDev);
        await globalThis.device.open();
    } catch (e) {
        showToast('Device unavailable');
        throw e;
    }

    const session = new NxdtSession(globalThis.directory, globalThis.device);

    try {
        let cmdHeader, cmdId, cmdBlockLength, cmdBlock
        cmdHeader = await session.getCmdHeader();
        [cmdId, cmdBlockLength] = await session.parseCmdHeader(cmdHeader);
        cmdBlock = await session.getCmdBlock(cmdBlockLength);

        await session.parseSessionHeader(cmdId, cmdBlock);
    } catch (e) {
        showToast('Device incompatible');
        await globalThis.device.device.forget();
        delete globalThis.device;
        throw e;
    }

    deviceButton.querySelector('.value').innerText = `${globalThis.device.device.productName} (${globalThis.device.device.serialNumber})`;
    try {
        await session.handleSessionTransfer();
    } catch (e) {
        showToast('Connection interrupted', true);
    } finally {
        await globalThis.device.close();
        delete globalThis.device;
        deviceButton.querySelector('.value').innerText = 'Not connected';
    }
}

// Broswer support
const fsSupported = window?.showDirectoryPicker;
const usbSupported = navigator?.usb?.requestDevice;
const platform = navigator?.userAgentData?.platform;

console.debug(`Support: userPlatform=${Boolean(platform)}, navigatorUsb=${Boolean(usbSupported)}, fileSystemDirectory=${Boolean(fsSupported)}`);

if (!platform || !fsSupported || !usbSupported) {
    const app = document.getElementById('app');
    app.remove();

    const supportDialog = document.getElementById('support');
    try {
        supportDialog.showModal();
    } catch (e) {
        alert(supportDialog.innerText);
    }

    assert(false, 'Unsupported browser!')
}


// Device support
const deviceInfo = document.getElementById('device-info');
const platformInfo = deviceInfo.querySelector(`[data-platform=${platform}]`);

if (platform == 'Linux') {
    const deviceRules = platformInfo.querySelector('.value');
    deviceRules.innerText = `SUBSYSTEM=='usb', ATTRS{idVendor}=='${hex(NXDT.DEVICE.vendorId, 4)}', ATTRS{idProduct}=='${hex(NXDT.DEVICE.productId, 4)}', TAG+='uaccess'`;
}

if (platformInfo) {
    platformInfo.hidden = false;
}


// Setup
const directoryButton = document.getElementById('directory');
const deviceButton = document.getElementById('device');
const notifyButton = document.getElementById('notify');

directoryButton.addEventListener('click', requestDirectory);
deviceButton.addEventListener('click', requestDevice);
notifyButton.addEventListener('click', requestNotify);

if (Notification.permission == 'granted') {
    notifyButton.querySelector('.value').innerText = 'Allowed';
    notifyButton.disabled = true;
}
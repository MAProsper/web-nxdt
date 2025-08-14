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

// === NXDT ===
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
    },
    TIME: {
        TOAST: 2000,
        TRANSFER_ESTIMATE: 2000
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

function assert(value, message) {
    if (value) return;
    console.error(message);
    throw new NxdtError(message);
}

function setValueText(e, value) {
    e.querySelector('.value').innerText = value;
}

function notify(message, important) {
    console.info(`Notification: ${message}`);
    if (important) new Notification(document.title, { body: message });

    const toast = document.getElementById('toast');
    toast.innerText = message;

    clearTimeout(toast.timeout);
    toast.togglePopover(true);
    toast.timeout = setTimeout(() => toast.togglePopover(false), NXDT.TIME.TOAST);
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

class NxdtCancelCmd extends NxdtError { }

class NxdtUsb {
    constructor(device) {
        return this.setup(device).then(() => this);
    }

    async setup(device) {
        console.debug('Creating: USB device');
        this.device = device;

        assert(this.device.manufacturerId == NXDT.DEVICE.manufacturerId && this.device.productId == NXDT.DEVICE.productId, 'Invalid manufacturer/product IDs!')

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

        // Save endpoint max packet size
        this.packetSize = endpointIn.packetSize;

        console.debug(`Created: USB device (version=${this.device.usbVersionMajor}.${this.device.usbVersionMinor})`);
    }

    async open() {
        console.debug('Opening: USB device');

        await this.device.open();
        try { await this.device.reset() } catch (e) { console.warn(e) }
        await this.device.claimInterface(this.interface);

        console.debug('Opened: USB device');
    }

    async close() {
        console.debug('Closing: USB device');

        try { await this.device.reset() } catch (e) { }
        try { await this.device.releaseInterface(this.interface) } catch (e) { }
        try { await this.device.close() } catch (e) { }

        console.debug('Closed: USB device');
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

    isAlignedToPacket(value) {
        return (value & (this.packetSize - 1)) == 0;
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
        setValueText(this.dialog, name);
        console.debug(`Request: ${name}`);
    }
}

class NxdtTransfer extends NxdtDialog {
    constructor(name, size) {
        super('transfer')
        setValueText(this.dialog, name);
        console.debug(`Transfer: size=${size}`);

        this.progess = this.dialog.querySelector('progress');

        this.progess.value = 0;
        this.progess.max = size;
        this.progressLabel = this.dialog.querySelector('#transfer-progress');
        this.progressTime = this.dialog.querySelector('#transfer-time');

        this.startTime = Date.now();
        this.update(0);
    }

    #formatTime(sec) {
        return (sec < 60) ? `${Math.ceil(sec)} sec` : `${Math.ceil(sec / 60)} min`;
    }

    update(increment) {
        this.progess.value += increment;
        const perc = this.progess.value / this.progess.max;
        this.progressLabel.innerText = `${Math.floor(perc * 100)} %`;

        const elapsedTime = Date.now() - this.startTime;
        if (elapsedTime < NXDT.TIME.TRANSFER_ESTIMATE) {
            this.progressTime.innerText = 'estimating…';
        } else {
            const remaindTime = (elapsedTime / perc) * (1 - perc);
            this.progressTime.innerText = this.#formatTime(remaindTime / 1000);
        }
    }
}


class NxdtSession {
    constructor(device, getDir) {
        this.getDir = getDir;
        this.device = device;
    }

    /* HELPERS */
    async assert(value, code) {
        try {
            return assert(value, `Assert failed (code=${code})!`);
        } catch (e) {
            await this.sendStatus(code);
            throw e;
        }
    }

    async makeFile(dir, filePath) {
        try {
            return await makeFile(dir, filePath);
        } catch (e) {
            this.assert(false, NXDT.STATUS.HOST_IO_ERROR);
        }
    }

    /* PROTOCOL */
    async sendStatus(code) {
        console.debug(`Sening: status (${code})`)

        const status = NXDT.STRUCT.STATUS_RESPONSE.pack(NXDT.ABI.MAGIC, code, this.device.packetSize);
        const wr = await this.device.write(status);

        assert(wr == status.byteLength, 'Failed to send status code!');
        console.debug(`Send: status`)
    }

    async getCmdHeader() {
        console.debug('Receiving: command header');

        const cmdHeader = await this.device.read(NXDT.SIZE.COMMAND_HEADER);
        assert(cmdHeader.byteLength == NXDT.SIZE.COMMAND_HEADER, `Failed to read command header! (got=${cmdHeader.byteLength} expect=${NXDT.SIZE.COMMAND_HEADER})`);

        console.debug('Received: command header');
        return cmdHeader;
    }

    async parseCmdHeader(cmdHeader) {
        console.debug('Parsing: command header');
        assert(cmdHeader && cmdHeader.byteLength == NXDT.SIZE.COMMAND_HEADER, `Command header is the wrong size! (got=${cmdHeader.byteLength} expect=${NXDT.SIZE.COMMAND_HEADER})`);

        const [magic, cmdId, cmdDataSize, _] = NXDT.STRUCT.COMMAND_HEADER.unpack(cmdHeader);
        console.debug(`Parsed: command header (magic=${magic}, cmdId=${cmdId}, cmdDataSize=${cmdDataSize})`);

        this.assert(magic == NXDT.ABI.MAGIC, NXDT.STATUS.INVALID_MAGIC_WORD);
        this.assert(Object.values(NXDT.COMMAND).includes(cmdId), NXDT.STATUS.UNSUPPORTED_CMD);

        return [cmdId, cmdDataSize];
    }

    async getCmdBlock(cmdDataSize) {
        console.debug('Receiving: command block');

        // Handle Zero-Length Termination packet (if needed)
        let rdSize = cmdDataSize;
        if (this.device.isAlignedToPacket(cmdDataSize)) {
            rdSize += 1;
        }

        const cmdData = cmdDataSize ? await this.device.read(rdSize) : new ArrayBuffer();
        assert(cmdData.byteLength == cmdDataSize, `Failed to read ${cmdDataSize}-byte long command block!`);

        console.debug('Received: command block');
        return cmdData;
    }

    async getCmd(cmdHeader) {
        if (!cmdHeader) cmdHeader = await this.getCmdHeader();
        const [cmdId, cmdDataLength] = await this.parseCmdHeader(cmdHeader);
        const cmdData = await this.getCmdBlock(cmdDataLength);
        return [cmdId, cmdData];
    }

    /* ACTIONS */
    async handleFileCmd(cmdId, cmdData) {
        console.info('Requested: file transfer command');
        const [filePath, fileSize, headerSize] = await this.parseFileHeader(cmdId, cmdData);

        const dir = this.getDir();
        const file = await this.makeFile(dir, filePath);

        this.transfer = new NxdtTransfer(filePath, fileSize);
        this.transfer.open();
        try {
            if (headerSize) {
                await this.handleArchiveTransfer(file, fileSize, headerSize);
            } else {
                await this.handleFileTransfer(file, fileSize);
            }
            notify('Finishing transfer');
        } finally {
            await file.close();
            this.transfer.close();
            delete this.transfer;
        }

        notify('Transfer finished', true);
    }

    async parseFileHeader(cmdId, cmdData) {
        console.debug('Parsing: file header');
        await this.assert(cmdId == NXDT.COMMAND.FILE_TRANSFER && cmdData.byteLength == NXDT.SIZE.FILE_TRANSFER_HEADER, NXDT.STATUS.MALFORMED_CMD);

        const [fileSize, filePathLength, headerSize] = NXDT.STRUCT.FILE_HEADER.unpackFrom(cmdData, 0);
        const filePath = new Struct(`<${filePathLength}s`).unpackFrom(cmdData, 16)[0];
        console.debug(`Parsed: file header (fileSize=${fileSize}, filePathLength=${filePathLength}, headerSize=${headerSize})`);

        this.assert(fileSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        this.assert(headerSize < fileSize, NXDT.STATUS.MALFORMED_CMD);
        this.assert(filePathLength && filePathLength <= NXDT.SIZE.FILE_NAME_LENGTH, NXDT.STATUS.MALFORMED_CMD);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        return [filePath, fileSize, headerSize];
    }

    async handleFileTransfer(file, fileSize) {
        console.debug('Handeling: file transfer');

        let offset = 0;
        while (offset < fileSize) {

            // Update block size (if needed)
            const diff = fileSize - offset;
            const blksize = Math.min(NXDT.SIZE.FILE_BLOCK_TRANSFER, diff);

            // Set read size and handle Zero-Length Termination packet (if needed)
            let rdSize = blksize;
            if (((offset + blksize) >= fileSize) && this.device.isAlignedToPacket(blksize)) {
                rdSize += 1;
            }

            // Read current chunk
            const chunk = await this.device.read(rdSize);

            // Check if we're dealing with a command
            if (chunk.byteLength == NXDT.SIZE.COMMAND_HEADER) {
                let cmdId, cmdData;
                try {
                    [cmdId, cmdData] = await this.getCmd(chunk);
                } catch (e) { }

                if (cmdId != undefined) {
                    await this.handleCancelCmd(cmdId, cmdData);
                }
            }

            // Write current chunk.
            await file.write(chunk);
            offset += chunk.byteLength;
            this.transfer.update(chunk.byteLength);
        }

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleArchiveTransfer(file, fileSize, headerSize) {
        console.debug('Handeling: archive transfer');

        // Skip header
        await file.seek(headerSize);

        // File entrys
        let offset = 0;
        while (offset < (fileSize - headerSize)) {
            const [cmdId, cmdData] = await this.getCmd();

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdData);
            }

            const [fileName, fileSize, fileHeader] = await this.parseFileHeader(cmdId, cmdData);
            this.assert(!fileHeader, NXDT.STATUS.MALFORMED_CMD);

            await this.handleFileTransfer(file, fileSize);
            offset += fileSize;
        }

        // File header
        const [cmdId, cmdData] = await this.getCmd();

        if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
            await this.handleCancelCmd(cmdId, cmdData);
        }

        await this.assert(cmdId == NXDT.COMMAND.FILE_HEADER_TRANSFER && cmdData.byteLength == headerSize, NXDT.STATUS.MALFORMED_CMD);

        await file.seek(0);
        await file.write(cmdData);
        offset += cmdData.byteLength;
        this.transfer.update(cmdData.byteLength);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleFsCmd(cmdId, cmdData) {
        console.info('Requested: fs transfer command');
        const [fsSize, fsPath] = await this.parseFsCmdHeader(cmdId, cmdData);

        this.transfer = new NxdtTransfer(fsPath, fsSize);
        this.transfer.open();
        try {
            await this.handleFsTransfer(fsSize);
        } finally {
            this.transfer.close();
            delete this.transfer;
        }

        notify('Transfer finished', true);
    }

    async parseFsCmdHeader(cmdId, cmdData) {
        console.debug('Parsing: FS header');
        await this.assert(cmdId == NXDT.COMMAND.START_FS_TRANSFER && cmdData.byteLength == NXDT.SIZE.START_FS_TRANSFER_HEADER, NXDT.STATUS.MALFORMED_CMD);

        const [fsSize, fsPath] = NXDT.STRUCT.FS_HADER.unpack(cmdData);
        this.assert(fsSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        console.info(`Parsed: fs header (fsSize=${fsSize}, fsPath=${fsPath})`);

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        return [fsSize, fsPath];
    }

    async handleFsTransfer(fsSize) {
        console.debug('Handeling: fs transfer');
        const dir = this.getDir();
        
        // Transfer FS
        let offset = 0;
        while (offset < fsSize) {
            const [cmdId, cmdData] = await this.getCmd();

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdData);
            }

            const [filePath, fileSize, fileHeader] = await this.parseFileHeader(cmdId, cmdData);

            this.assert(!fileHeader, NXDT.STATUS.MALFORMED_CMD);

            const file = await this.makeFile(dir, filePath);
            try {
                await this.handleFileTransfer(file, fileSize);
            } finally {
                await file.close();
            }

            offset += fileSize;
        }

        // End FS
        const [cmdId, cmdData] = await this.getCmd();

        if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
            await this.handleCancelCmd(cmdId, cmdData);
        }

        await this.handleEndFsCmd(cmdId, cmdData);
    }

    async handleEndFsCmd(cmdId, cmdData) {
        await this.assert(cmdId == NXDT.COMMAND.END_FS_TRANSFER && cmdData.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    /* SESSION */
    async handleStartSessionCmd(cmdId, cmdData) {
        console.debug('Handeling: session start command');
        await this.assert(cmdId == NXDT.COMMAND.START_SESSION && cmdData.byteLength == NXDT.SIZE.START_SESSION_HEADER, NXDT.STATUS.MALFORMED_CMD);

        const [versionMajor, versionMinor, versionMicro, abiVersion, versionCommit] = NXDT.STRUCT.SESSION_HEADER.unpack(cmdData);
        const [abiMajor, abiMinor] = [((abiVersion >> 4) & 0x0F), (abiVersion & 0x0F)];
        console.debug(`Parsed: client info (version=${versionMajor}.${versionMinor}.${versionMicro}, abi=${abiMajor}.${abiMinor}, commit=${versionCommit})`);

        this.assert(abiMajor == NXDT.ABI.MAJOR && abiMinor == NXDT.ABI.MINOR, NXDT.STATUS.UNSUPPORTED_ABI_VERSION);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleSessionTransfer() {
        console.debug('Handeling: session transfer command');
        while (true) {
            const [cmdId, cmdData] = await this.getCmd();

            try {
                switch (cmdId) {
                    case NXDT.COMMAND.FILE_TRANSFER:
                        await this.handleFileCmd(cmdId, cmdData);
                        break;
                    case NXDT.COMMAND.START_FS_TRANSFER:
                        await this.handleFsCmd(cmdId, cmdData);
                        break;
                    case NXDT.COMMAND.END_SESSION:
                        await this.handleEndSessionCmd(cmdId, cmdData);
                        return;
                    default:
                        await this.sendStatus(NXDT.STATUS.MALFORMED_CMD);
                }
            } catch (e) {
                if (e instanceof NxdtCancelCmd) {
                    notify('Operation cancelled');
                    continue;
                }

                throw e;
            }
        }
    }

    async handleEndSessionCmd(cmdId, cmdData) {
        await this.assert(cmdId == NXDT.COMMAND.END_SESSION && cmdData.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);

        notify('Disconnecting device');

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleCancelCmd(cmdId, cmdData) {
        await this.assert(cmdId == NXDT.COMMAND.CANCEL_TRANSFER && cmdData.byteLength == 0, NXDT.STATUS.MALFORMED_CMD);

        notify('Cancelling operation');

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        throw new NxdtCancelCmd();
    }
}

// === APP ===
async function requestDirectory() {
    const request = new NxdtRequest('Destination directory');
    request.open();
    try {
        currentDirectory = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (e) {
        return;
    } finally {
        request.close();
    }

    setValueText(directoryButton, currentDirectory.name);

    if (!deviceButton.disabled) return;
    deviceButton.disabled = false;

    navigator.usb.addEventListener('connect', async (event) => {
        if (currentDevice) return;
        await openDevice(event.device);
        await handleSession();
    });

    const devices = await navigator.usb.getDevices();
    for (let device of devices) {
        try {
            await openDevice(device);
        } catch (e) {
            continue;
        }

        break;
    }

    if (!currentSession) return;
    await handleSession();
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

    await openDevice(device);
    await handleSession();
}

async function requestNotify() {
    const request = new NxdtRequest('Notification permission');
    request.open();
    try {
        await Notification.requestPermission();
    } finally {
        request.close();
    }

    if (!syncNotify()) {
        notify('Notifications denied');
    }
}

async function getDevices() {
    
    const device = devices.find(dev => dev.vendorId == NXDT.DEVICE.vendorId && dev.productId == NXDT.DEVICE.productId);
    return device;
}

async function closeDevice() {
    setValueText(deviceButton, 'Not connected');
    await currentDevice.close();
    currentDevice = undefined;
    currentSession = undefined;
}

async function openDevice(usbDev) {
    notify('Connecting device');

    if (currentDevice) {
        console.info('Changing device!');
        await closeDevice();
    }

    try {
        currentDevice = await new NxdtUsb(usbDev);
    } catch (e) {
        notify('Device incompatible');
        await usbDev.forget();
        throw e;
    }

    try {
        await currentDevice.open();
    } catch (e) {
        notify('Device unresponsive');
        await closeDevice();
        throw e;
    }

    currentSession = new NxdtSession(currentDevice, () => currentDirectory);

    let cmdId, cmdData
    try {
        [cmdId, cmdData] = await currentSession.getCmd();
    } catch (e) {
        notify('Application unresponsive');
        await closeDevice();
        throw e;
    }

    try {
        await currentSession.handleStartSessionCmd(cmdId, cmdData);
    } catch (e) {
        notify('Application incompatible');
        await closeDevice();
        throw e;
    }

    setValueText(deviceButton, `${currentDevice.device.productName} (${currentDevice.device.serialNumber})`);
    notify('Device connected');
}

async function handleSession() {
    try {
        await currentSession.handleSessionTransfer();
    } catch (e) {
        notify('Connection error', true);
        throw e;
    } finally {
        await closeDevice();
    }

    notify('Device disconnected');
}

function syncNotify() {
    const allowed = Notification.permission == 'granted';
    setValueText(notifyButton, allowed ? 'Allowed' : 'Blocked');
    notifyButton.disabled = allowed;
    return allowed;
}

function browserSupport() {
    const dirSupported = window?.showDirectoryPicker;
    const usbSupported = navigator?.usb?.requestDevice;

    console.debug(`Support: webUSB=${Boolean(usbSupported)}, fsDirectory=${Boolean(dirSupported)}`);

    if (!dirSupported || !usbSupported) {
        const app = document.getElementById('app');
        app.remove();

        const support = new NxdtDialog('support');
        support.open();

        assert(false, 'Unsupported browser!')
    }
}

function deviceSupport() {
    const deviceInfo = document.getElementById('device-info');
    const platform = navigator?.userAgentData?.platform || 'Unknown';
    const platformInfo = deviceInfo.querySelector(`[data-platform=${platform}]`) || deviceInfo.querySelector('[data-platform=unknown]');

    console.debug(`Platform: ${platform}`)

    switch (platformInfo.dataset.platform) {
        case 'Linux':
            setValueText(platformInfo, `SUBSYSTEM=='usb', ATTRS{idVendor}=='${hex(NXDT.DEVICE.vendorId, 4)}', ATTRS{idProduct}=='${hex(NXDT.DEVICE.productId, 4)}', TAG+='uaccess'`);
            break;
        case 'unknown':
            setValueText(platformInfo, platform);
            break;
    }

    platformInfo.hidden = false;
}

// Setup
browserSupport();
deviceSupport();

let currentDirectory;
let currentDevice;
let currentSession;

const directoryButton = document.getElementById('directory');
const deviceButton = document.getElementById('device');
const notifyButton = document.getElementById('notify');

directoryButton.addEventListener('click', requestDirectory);
deviceButton.addEventListener('click', requestDevice);
notifyButton.addEventListener('click', requestNotify);

syncNotify();
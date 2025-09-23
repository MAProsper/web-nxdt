// === BUILTINS ===
function hex(value, pad) {
    return value.toString(16).padStart(pad || 0, '0')
}

function bytesDecode(bytes, encoding) {
    return new TextDecoder(encoding).decode(bytes);
}

function strEncode(str, encoding) {
    return new TextEncoder(encoding).encode(str);
}

function strStrip(str, chars) {
    const strAry = Array.from(str);
    const chrAry = Array.from(chars);
    const start = strAry.findIndex((ch) => !chrAry.includes(ch));
    const end = strAry.findLastIndex((ch) => !chrAry.includes(ch));
    return strAry.slice(start === -1 ? undefined : start, end === -1 ? undefined : end + 1).join('');
}

function aryEquals(ary1, ary2) {
    if (ary1.length != ary2.length) return false;
    return ary1.every((e, i) => ary2[i] == e);
}

// === STRUCT ===
/* Based on https://github.com/lyngklip/structjs */
class Struct {
    static #reToken = /([1-9]\d*)?([xcbB?hHiIlLqQefdsp])/g;
    static #reFormat = /^([<>])?(([1-9]\d*)?([xcbB?hHiIlLqQefdsp]))*$/;

    static sizeof_x(count) { return { reps: 1, size: count } }
    // static pack_x(bytes, value, offset = 0, size = Struct.sizeof_x(1).size, littleEndian = true) { Struct.pack_B(bytes, 0, offset, size, littleEndian) }
    // static unpack_x(bytes, offset = 0, size = Struct.sizeof_x(1).size, littleEndian = true) { Struct.unpack_B(bytes, offset, size, littleEndian) }
    static sizeof_c(count) { return { reps: count, size: 1 } }
    static pack_c(bytes, value, offset = 0, size = Struct.sizeof_c(1).size, littleEndian = true) { Struct.pack_s(bytes, value, offset, 1, littleEndian) }
    static unpack_c(bytes, offset = 0, size = Struct.sizeof_c(1).size, littleEndian = true) { return Struct.unpack_s(bytes, offset, 1, littleEndian) }
    static sizeof_bool(count) { return { reps: count, size: 1 } }
    static pack_bool(bytes, value, offset = 0, size = Struct.sizeof_bool(1).size, littleEndian = true) { new DataView(bytes.buffer).setUint8(offset, Boolean(value)) }
    static unpack_bool(bytes, offset = 0, size = Struct.sizeof_bool(1).size, littleEndian = true) { return Boolean(new DataView(bytes.buffer).getInt8(offset)) }
    static sizeof_b(count) { return { reps: count, size: 1 } }
    static pack_b(bytes, value, offset = 0, size = Struct.sizeof_b(1).size, littleEndian = true) { new DataView(bytes.buffer).setInt8(offset, value) }
    static unpack_b(bytes, offset = 0, size = Struct.sizeof_b(1).size, littleEndian = true) { return new DataView(bytes.buffer).getInt8(offset) }
    static sizeof_B(count) { return { reps: count, size: 1 } }
    static pack_B(bytes, value, offset = 0, size = Struct.sizeof_B(1).size, littleEndian = true) { new DataView(bytes.buffer).setUint8(offset, value) }
    static unpack_B(bytes, offset = 0, size = Struct.sizeof_B(1).size, littleEndian = true) { return new DataView(bytes.buffer).getUint8(offset) }
    static sizeof_h(count) { return { reps: count, size: 2 } }
    static pack_h(bytes, value, offset = 0, size = Struct.sizeof_h(1).size, littleEndian = true) { new DataView(bytes.buffer).setInt16(offset, value, littleEndian) }
    static unpack_h(bytes, offset = 0, size = Struct.sizeof_h(1).size, littleEndian = true) { return new DataView(bytes.buffer).getInt16(offset, littleEndian) }
    static sizeof_H(count) { return { reps: count, size: 2 } }
    static pack_H(bytes, value, offset = 0, size = Struct.sizeof_H(1).size, littleEndian = true) { new DataView(bytes.buffer).setUint16(offset, value, littleEndian) }
    static unpack_H(bytes, offset = 0, size = Struct.sizeof_H(1).size, littleEndian = true) { return new DataView(bytes.buffer).getUint16(offset, littleEndian) }
    static sizeof_i(count) { return { reps: count, size: 4 } }
    static pack_i(bytes, value, offset = 0, size = Struct.sizeof_i(1).size, littleEndian = true) { new DataView(bytes.buffer).setInt32(offset, value, littleEndian) }
    static unpack_i(bytes, offset = 0, size = Struct.sizeof_i(1).size, littleEndian = true) { return new DataView(bytes.buffer).getInt32(offset, littleEndian) }
    static sizeof_I(count) { return { reps: count, size: 4 } }
    static pack_I(bytes, value, offset = 0, size = Struct.sizeof_I(1).size, littleEndian = true) { new DataView(bytes.buffer).setUint32(offset, value, littleEndian) }
    static unpack_I(bytes, offset = 0, size = Struct.sizeof_I(1).size, littleEndian = true) { return new DataView(bytes.buffer).getUint32(offset, littleEndian) }
    static sizeof_l(count) { return { reps: count, size: 4 } }
    static pack_l(bytes, value, offset = 0, size = Struct.sizeof_l(1).size, littleEndian = true) { new DataView(bytes.buffer).setInt32(offset, value, littleEndian) }
    static unpack_l(bytes, offset = 0, size = Struct.sizeof_l(1).size, littleEndian = true) { return new DataView(bytes.buffer).getInt32(offset, littleEndian) }
    static sizeof_L(count) { return { reps: count, size: 4 } }
    static pack_L(bytes, value, offset = 0, size = Struct.sizeof_L(1).size, littleEndian = true) { new DataView(bytes.buffer).setUint32(offset, value, littleEndian) }
    static unpack_L(bytes, offset = 0, size = Struct.sizeof_L(1).size, littleEndian = true) { return new DataView(bytes.buffer).getUint32(offset, littleEndian) }
    static sizeof_q(count) { return { reps: count, size: 8 } }
    static pack_q(bytes, value, offset = 0, size = Struct.sizeof_q(1).size, littleEndian = true) { new DataView(bytes.buffer).setBigInt64(offset, value, littleEndian) }
    static unpack_q(bytes, offset = 0, size = Struct.sizeof_q(1).size, littleEndian = true) { return new DataView(bytes.buffer).getBigInt64(offset, littleEndian) }
    static sizeof_qn(count) { return Struct.sizeof_q(count) }
    static pack_qn(bytes, value, offset = 0, size = Struct.sizeof_qn(1).size, littleEndian = true) { Struct.pack_q(bytes, BigInt(value), offset, size, littleEndian) }
    static unpack_qn(bytes, offset = 0, size = Struct.sizeof_qn(1).size, littleEndian = true) { return Number(Struct.unpack_q(bytes, offset, size, littleEndian)) }
    static sizeof_Q(count) { return { reps: count, size: 8 } }
    static pack_Q(bytes, value, offset = 0, size = Struct.sizeof_Q(1).size, littleEndian = true) { new DataView(bytes.buffer).setBigUint64(offset, value, littleEndian) }
    static unpack_Q(bytes, offset = 0, size = Struct.sizeof_Q(1).size, littleEndian = true) { return new DataView(bytes.buffer).getBigUint64(offset, littleEndian) }
    static sizeof_Qn(count) { return Struct.sizeof_Q(count) }
    static pack_Qn(bytes, value, offset = 0, size = Struct.sizeof_Qn(1).size, littleEndian = true) { Struct.pack_Q(bytes, BigInt(value), offset, size, littleEndian) }
    static unpack_Qn(bytes, offset = 0, size = Struct.sizeof_Qn(1).size, littleEndian = true) { return Number(Struct.unpack_Q(bytes, offset, size, littleEndian)) }
    static sizeof_e(count) { return { reps: count, size: 2 } }
    static pack_e(bytes, value, offset = 0, size = Struct.sizeof_e(1).size, littleEndian = true) { new DataView(bytes.buffer).setFloat16(offset, value, littleEndian) }
    static unpack_e(bytes, offset = 0, size = Struct.sizeof_e(1).size, littleEndian = true) { return new DataView(bytes.buffer).getFloat16(offset, littleEndian) }
    static sizeof_f(count) { return { reps: count, size: 4 } }
    static pack_f(bytes, value, offset = 0, size = Struct.sizeof_f(1).size, littleEndian = true) { new DataView(bytes.buffer).setFloat32(offset, value, littleEndian) }
    static unpack_f(bytes, offset = 0, size = Struct.sizeof_f(1).size, littleEndian = true) { return new DataView(bytes.buffer).getFloat32(offset, littleEndian) }
    static sizeof_d(count) { return { reps: count, size: 8 } }
    static pack_d(bytes, value, offset = 0, size = Struct.sizeof_d(1).size, littleEndian = true) { new DataView(bytes.buffer).setFloat64(offset, value, littleEndian) }
    static unpack_d(bytes, offset = 0, size = Struct.sizeof_d(1).size, littleEndian = true) { return new DataView(bytes.buffer).getFloat64(offset, littleEndian) }
    static sizeof_s(count) { return { reps: 1, size: count } }
    static pack_s(bytes, value, offset = 0, size = Struct.sizeof_s(1).size, littleEndian = true) { bytes.set(new Uint8Array(value.buffer, value.byteOffset, Math.min(value.length, size)), offset); bytes.fill(0, offset + value.length, offset + size) }
    static unpack_s(bytes, offset = 0, size = Struct.sizeof_s(1).size, littleEndian = true) { if (bytes.length < (offset + size)) throw new RangeError('Structure larger than remaining buffer'); return bytes.slice(offset, offset + size) }
    static sizeof_p(count) { return { reps: 1, size: count } }
    static pack_p(bytes, value, offset = 0, size = Struct.sizeof_p(1).size, littleEndian = true) { Struct.pack_B(bytes, value.length, offset, 1, littleEndian); Struct.pack_s(bytes, value, offset + 1, size - 1, littleEndian) }
    static unpack_p(bytes, offset = 0, size = Struct.sizeof_p(1).size, littleEndian = true) { return Struct.unpack_s(bytes, offset + 1, Math.min(Struct.unpack_B(bytes, offset, 1, littleEndian), size - 1), littleEndian) }

    size = 0;
    tokens = [];
    #littleEndian = false;
    #map = { '?': 'bool', 'q': 'qn', 'Q': 'Qn' };

    constructor(format, map) {
        this.format = format;
        Object.assign(this.#map, map);

        Struct.#reFormat.lastIndex = 0;
        let match = Struct.#reFormat.exec(format);
        if (!match) { throw new Error('Invalid format string') }

        this.#littleEndian = '<' === match[1];

        Struct.#reToken.lastIndex = 0;
        while (match = Struct.#reToken.exec(format)) {
            let [count, format] = match.slice(1);
            count = count ? parseInt(count, 10) : 1;
            format = this.#map[format] || format;

            const { reps, size } = Struct[`sizeof_${format}`](count);
            const [pack, unpack] = [Struct[`pack_${format}`], Struct[`unpack_${format}`]];

            for (let i = 0; i < reps; ++i, this.size += size) {
                if (!pack) continue;
                const structOffset = this.size;
                this.tokens.push({
                    pack: (bytes, value, offset = 0) => pack(bytes, value, offset + structOffset, size, this.#littleEndian),
                    unpack: (bytes, offset = 0) => unpack(bytes, offset + structOffset, size, this.#littleEndian)
                });
            }
        }
    }

    unpackFrom(bytes, offset) {
        bytes = new Uint8Array(bytes.buffer, offset, this.size);
        return this.tokens.map(token => token.unpack(bytes));
    }

    packInto(bytes, offset, ...values) {
        bytes = new Uint8Array(bytes.buffer, offset, this.size);
        bytes.fill(0);
        this.tokens.forEach((token, index) => token.pack(bytes, values[index]));
    }

    pack(...values) {
        const bytes = new Uint8Array(this.size);
        this.packInto(bytes, 0, ...values);
        return bytes;
    }

    unpack(bytes) {
        return this.unpackFrom(bytes, 0);
    }

    *iterUnpack(bytes) {
        for (let offset = 0; offset + this.size <= bytes.length; offset += this.size) {
            yield this.unpackFrom(bytes, offset);
        }
    }
}

// === LOGGER ===
class Logger {
    constructor(verbose = true) {
        this.verbose = verbose;
    }

    records = [];

    stamp(safe = false) {
        let stamp = new Date().toISOString();
        if (safe) stamp = strStrip(stamp.replaceAll(/\D/g, '-'), '-');
        return stamp;
    }

    #format(lvl, msg) {
        lvl = lvl.toUpperCase().padEnd(5);
        if (msg instanceof Error) msg = msg.stack;
        return `[${this.stamp()}] [${lvl}] ${msg}\n`;
    }

    #record(lvl, msg) {
        if (this.verbose) console[lvl](msg);
        this.records.push(this.#format(lvl, msg));
    }

    debug(msg) { this.#record('debug', msg); }
    info(msg) { this.#record('info', msg); }
    warn(msg) { this.#record('warn', msg); }
    error(msg) { this.#record('error', msg); }
    trace(msg) { this.#record('trace', msg); }

    blob() {
        return new Blob(this.records);
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
        TEXT: 'utf8'
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
        FILE_BLOCK_TRANSFER: 0x800000,
        FILE_PATH_LENGTH: 0x301,
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
        TRANSFER_TIMEOUT: 10000,
        TRANSFER_ESTIMATE: 2000,
    },
    VERSION: {
        MAJOR: 1,
        MINOR: 4,
        MICRO: 4
    }
}

NXDT.ABI.MAGIC = strEncode('NXDT', NXDT.ABI.TEXT);

NXDT.STRUCT = {
    COMMAND_HEADER: new Struct('<4sIII'),
    STATUS_RESPONSE: new Struct('<4sIH6x'),
    SESSION_HEADER: new Struct('<BBBB8s4x'),
    FILE_HEADER: new Struct(`<QII${NXDT.SIZE.FILE_PATH_LENGTH}s15x`),
    FS_HEADER: new Struct(`<Q${NXDT.SIZE.FILE_PATH_LENGTH}s7x`)
}

function assert(value, message) {
    if (value) return;
    logger.error(message);
    throw new NxdtError(message);
}

function setValueText(e, value) {
    e.querySelector('.value').innerText = value;
}

function notify(message, important) {
    logger.info(`Notification: ${message}`);
    if (important) new Notification(document.title, { body: message });

    const toast = document.getElementById('toast');
    toast.innerText = message;

    clearTimeout(toast.timeout);
    toast.togglePopover(true);
    toast.timeout = setTimeout(() => toast.togglePopover(false), NXDT.TIME.TOAST);
}

class TimeoutError extends Error {}

function promiseTimeout(promise, timeout) {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => reject(new TimeoutError('Promise timeout')), timeout);
        promise.then(resolve, reject).finally(() => clearTimeout(id));
    })
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

    // Create file object.
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
        logger.debug('Creating: USB device');
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

        logger.debug(`Created: USB device (version=${this.device.usbVersionMajor}.${this.device.usbVersionMinor})`);
    }

    async open() {
        logger.debug('Opening: USB device');

        await this.device.open();
        try { await this.device.reset() } catch (e) { logger.warn(e) }
        await this.device.claimInterface(this.interface);

        logger.debug('Opened: USB device');
    }

    async close() {
        logger.debug('Closing: USB device');

        try { await this.device.reset() } catch (e) { }
        try { await this.device.releaseInterface(this.interface) } catch (e) { }
        try { await this.device.close() } catch (e) { }

        logger.debug('Closed: USB device');
    }

    isAlignedToPacket(size) {
        return (size & (this.packetSize - 1)) == 0;
    }

    isTransferActive(got, expect) {
        return got > 0 && got == expect && this.isAlignedToPacket(got);
    }

    async readChunk(size, timeout = -1) {
        // assert(size > 0, 'USB.read (invalid size)');
        let promise = this.device.transferIn(this.endpoint.in, size);
        if (timeout >= 0) promise = promiseTimeout(promise, timeout);
        let transfer;
        try {
            transfer = await promise;
            assert(transfer.status == 'ok', 'USB.read (error)');
        } catch (e) {
            await this.device.reset();
            transfer = {status: 'ok', data: new DataView(new ArrayBuffer(0))};
        }
        const chunk = new Uint8Array(transfer.data.buffer);
        this.readActive = this.isTransferActive(chunk.length, size);
        return chunk;
    }

    async readEnd(timeout = -1) {
        if (!this.readActive) return;
        const chunk = await this.readChunk(1, timeout);
        assert(chunk.length == 0, 'USB.readEnd (recived more than expected)');
    }

    async read(size, timeout = -1) {
        const chunk = await this.readChunk(size, timeout);
        await this.readEnd(timeout);
        return chunk;
    }

    async writeChunk(chunk, timeout = -1) {
        let promise = this.device.transferOut(this.endpoint.out, chunk);
        if (timeout >= 0) promise = promiseTimeout(promise, timeout);
        let transfer;
        try {
            transfer = await promise;
            assert(transfer.status == 'ok', 'USB.write (error)');
        } catch (e) {
            await this.device.reset();
            transfer = {status: 'ok', bytesWritten: 0};
        }
        this.writeActive = this.isTransferActive(transfer.bytesWritten, chunk.length);
        return transfer.bytesWritten;
    }

    async writeEnd(timeout = -1) {
        if (!this.writeActive) return;
        const wr = await this.writeChunk(new Uint8Array(0), timeout);
        assert(wr == 0, 'USB.writeEnd (wrote more than expected)');
    }

    async write(chunk, timeout = -1) {
        const wr = await this.writeChunk(chunk, timeout);
        await this.writeEnd(timeout);
        return wr;
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
        logger.debug(`Request: ${name}`);
    }
}

class NxdtTransfer extends NxdtDialog {
    constructor(name, size) {
        super('transfer')
        setValueText(this.dialog, name);
        logger.debug(`Transfer: new (size=${size})`);

        this.progess = this.dialog.querySelector('progress');

        this.progess.value = 0;
        this.progess.max = size;
        this.progressLabel = this.dialog.querySelector('#transfer-progress');
        this.progressStatus = this.dialog.querySelector('#transfer-status');

        this.startTime = Date.now();
        this.update(0);
    }

    #formatTime(sec) {
        return (sec < 60) ? `${Math.ceil(sec)} sec` : `${Math.ceil(sec / 60)} min`;
    }

    update(increment) {
        this.progess.value += increment;

        const prec = this.progess.position;
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = (elapsedTime / prec) * (1 -prec);

        const displayTime = (elapsedTime < NXDT.TIME.TRANSFER_ESTIMATE) ? 'estimating…' : this.#formatTime(remainingTime / 1000);
        this.progressLabel.innerText = `${Math.floor(this.progess.position * 100)} %`;
        this.progressStatus.innerText = `Time remaining: ${displayTime}`;
    }

    setText(value) {
        logger.debug(`Transfer: update (text=${value})`);
        this.progressStatus.innerText = value;
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
            await this.assert(false, NXDT.STATUS.HOST_IO_ERROR);
        }
    }

    /* PROTOCOL */
    async sendStatus(code) {
        logger.debug(`Sening: status (${code})`)

        const status = NXDT.STRUCT.STATUS_RESPONSE.pack(NXDT.ABI.MAGIC, code, this.device.packetSize);
        const wr = await this.device.write(status, NXDT.TIME.TRANSFER_TIMEOUT);

        assert(wr == status.length, 'Failed to send status code!');
        logger.debug(`Send: status`)
    }

    async getCmdHeader() {
        logger.debug('Receiving: command header');

        const cmdHeader = await this.device.read(NXDT.STRUCT.COMMAND_HEADER.size);
        assert(cmdHeader.length == NXDT.STRUCT.COMMAND_HEADER.size, `Failed to read command header! (got=${cmdHeader.length} expect=${NXDT.STRUCT.COMMAND_HEADER.size})`);

        logger.debug('Received: command header');
        return cmdHeader;
    }

    async parseCmdHeader(cmdHeader) {
        logger.debug('Parsing: command header');
        assert(cmdHeader && cmdHeader.length == NXDT.STRUCT.COMMAND_HEADER.size, `Command header is the wrong size! (got=${cmdHeader.length} expect=${NXDT.STRUCT.COMMAND_HEADER.size})`);

        const [magic, cmdId, cmdDataSize, ..._] = NXDT.STRUCT.COMMAND_HEADER.unpack(cmdHeader);
        logger.debug(`Parsed: command header (magic=${bytesDecode(magic, NXDT.ABI.TEXT)}, cmdId=${cmdId}, cmdDataSize=${cmdDataSize})`);

        await this.assert(aryEquals(magic, NXDT.ABI.MAGIC), NXDT.STATUS.INVALID_MAGIC_WORD);
        await this.assert(Object.values(NXDT.COMMAND).includes(cmdId), NXDT.STATUS.UNSUPPORTED_CMD);

        return [cmdId, cmdDataSize];
    }

    async getCmdBlock(cmdDataSize) {
        logger.debug('Receiving: command block');

        const cmdData = cmdDataSize ? await this.device.read(cmdDataSize, NXDT.TIME.TRANSFER_TIMEOUT) : new Uint8Array();
        assert(cmdData.length == cmdDataSize, `Failed to read ${cmdDataSize}-byte long command block!`);

        logger.debug('Received: command block');
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
        logger.info('Requested: file transfer command');
        const [filePath, fileSize, headerSize] = await this.parseFileHeader(cmdId, cmdData);

        const dir = this.getDir();
        const file = await this.makeFile(dir, filePath);
        await this.sendStatus(NXDT.STATUS.SUCCESS);

        this.transfer = new NxdtTransfer(filePath, fileSize);
        this.transfer.open();
        try {
            if (headerSize) {
                await this.handleArchiveTransfer(file, headerSize, fileSize - headerSize);
            } else {
                await this.handleFileTransfer(file, fileSize);
            }
            this.transfer.setText('Finishing…');
            await this.sendStatus(NXDT.STATUS.SUCCESS);
        } finally {
            logger.debug('File: flushing to disk');
            await file.close();
            this.transfer.close();
            delete this.transfer;
        }

        notify('Transfer finished', true);
    }

    async parseFileHeader(cmdId, cmdData) {
        logger.debug('Parsing: file header');
        await this.assert(cmdId == NXDT.COMMAND.FILE_TRANSFER && cmdData.length == NXDT.STRUCT.FILE_HEADER.size, NXDT.STATUS.MALFORMED_CMD);

        const [fileSize, filePathLength, headerSize, rawFilePath] = NXDT.STRUCT.FILE_HEADER.unpack(cmdData);
        const filePath = strStrip(bytesDecode(rawFilePath, NXDT.ABI.TEXT), '\0');
        logger.debug(`Parsed: file header (fileSize=${fileSize}, filePathLength=${filePathLength}, headerSize=${headerSize}, filePath=${filePath})`);

        await this.assert(fileSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        await this.assert(headerSize < fileSize, NXDT.STATUS.MALFORMED_CMD);
        await this.assert(filePathLength > 0 && filePathLength <= NXDT.SIZE.FILE_PATH_LENGTH, NXDT.STATUS.MALFORMED_CMD);

        return [filePath, fileSize, headerSize];
    }

    async handleFileTransfer(file, size) {
        logger.debug('Handeling: file transfer');

        for (let offset = 0; offset < size;) {
            const chunkSize = Math.min(NXDT.SIZE.FILE_BLOCK_TRANSFER, size - offset);
            const chunk = await this.device.readChunk(chunkSize, NXDT.TIME.TRANSFER_TIMEOUT);

            if (chunk.length == 0) {
                await this.handleCancelCmd(NXDT.COMMAND.CANCEL_TRANSFER, new Uint8Array());
            }

            // Check if we're dealing with a command
            if (chunk.length == NXDT.STRUCT.COMMAND_HEADER.size) {
                const magic = NXDT.STRUCT.COMMAND_HEADER.tokens[0].unpack(chunk);
                if (aryEquals(magic, NXDT.ABI.MAGIC)) {
                    const [cmdId, cmdData] = await this.getCmd(chunk);
                    await this.handleCancelCmd(cmdId, cmdData);
                }
            }

            // Write current chunk.
            await file.write(chunk);
            this.transfer.update(chunk.length);
            offset += chunk.length;
        }
        await this.device.readEnd(NXDT.TIME.TRANSFER_TIMEOUT);
    }

    async handleArchiveTransfer(file, headerSize, dataSize) {
        logger.debug('Handeling: archive transfer');

        // Skip header
        await file.seek(headerSize);

        // File entrys
        for (let offset = 0; offset < dataSize;) {
            const [cmdId, cmdData] = await this.getCmd();

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdData);
            }

            const [filePath, fileSize, fileHeader] = await this.parseFileHeader(cmdId, cmdData);
            await this.assert(!fileHeader, NXDT.STATUS.MALFORMED_CMD);
            await this.sendStatus(NXDT.STATUS.SUCCESS);

            await this.handleFileTransfer(file, fileSize);
            await this.sendStatus(NXDT.STATUS.SUCCESS);
            offset += fileSize;
        }

        // File header
        const [cmdId, cmdData] = await this.getCmd();

        if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
            await this.handleCancelCmd(cmdId, cmdData);
        }

        await this.assert(cmdId == NXDT.COMMAND.FILE_HEADER_TRANSFER && cmdData.length == headerSize, NXDT.STATUS.MALFORMED_CMD);

        await file.seek(0);
        await file.write(cmdData);
        this.transfer.update(cmdData.length);
    }

    async handleFsCmd(cmdId, cmdData) {
        logger.info('Requested: fs transfer command');
        const [fsSize, fsPath] = await this.parseFsCmdHeader(cmdId, cmdData);

        await this.sendStatus(NXDT.STATUS.SUCCESS);

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
        logger.debug('Parsing: FS header');
        await this.assert(cmdId == NXDT.COMMAND.START_FS_TRANSFER && cmdData.length == NXDT.STRUCT.FS_HEADER.size, NXDT.STATUS.MALFORMED_CMD);

        const [fsSize, rawFsPath] = NXDT.STRUCT.FS_HEADER.unpack(cmdData);
        const fsPath = strStrip(bytesDecode(rawFsPath, NXDT.ABI.TEXT), '\0');
        await this.assert(fsSize <= Number.MAX_SAFE_INTEGER, NXDT.STATUS.HOST_IO_ERROR);
        logger.info(`Parsed: fs header (fsSize=${fsSize}, fsPath=${fsPath})`);

        return [fsSize, fsPath];
    }

    async handleFsTransfer(fsSize) {
        logger.debug('Handeling: fs transfer');
        const dir = this.getDir();

        // Transfer FS
        let offset = 0;
        while (offset < fsSize) {
            const [cmdId, cmdData] = await this.getCmd();

            if (cmdId == NXDT.COMMAND.CANCEL_TRANSFER) {
                await this.handleCancelCmd(cmdId, cmdData);
            }

            const [filePath, fileSize, fileHeader] = await this.parseFileHeader(cmdId, cmdData);
            await this.assert(!fileHeader, NXDT.STATUS.MALFORMED_CMD);

            const file = await this.makeFile(dir, filePath);
            await this.sendStatus(NXDT.STATUS.SUCCESS);

            try {
                await this.handleFileTransfer(file, fileSize);
                await this.sendStatus(NXDT.STATUS.SUCCESS);
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
        await this.assert(cmdId == NXDT.COMMAND.END_FS_TRANSFER && cmdData.length == 0, NXDT.STATUS.MALFORMED_CMD);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    /* SESSION */
    async handleStartSessionCmd(cmdId, cmdData) {
        logger.debug('Handeling: session start command');
        await this.assert(cmdId == NXDT.COMMAND.START_SESSION && cmdData.length == NXDT.STRUCT.SESSION_HEADER.size, NXDT.STATUS.MALFORMED_CMD);

        const [versionMajor, versionMinor, versionMicro, abiVersion, rawVersionCommit] = NXDT.STRUCT.SESSION_HEADER.unpack(cmdData);
        const [abiMajor, abiMinor] = [((abiVersion >> 4) & 0x0F), (abiVersion & 0x0F)];
        const versionCommit = strStrip(bytesDecode(rawVersionCommit, NXDT.ABI.TEXT), '\0');
        logger.debug(`Parsed: client info (version=${versionMajor}.${versionMinor}.${versionMicro}, abi=${abiMajor}.${abiMinor}, commit=${versionCommit})`);

        // Check if the abi versions match the ones used by nxdumptool.
        // TODO: enable abi minor check whenever we're ready for a release.
        // abiMinor == NXDT.ABI.MINOR
        await this.assert(abiMajor == NXDT.ABI.MAJOR, NXDT.STATUS.UNSUPPORTED_ABI_VERSION);
        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleSessionTransfer() {
        logger.debug('Handeling: session transfer command');
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
        await this.assert(cmdId == NXDT.COMMAND.END_SESSION && cmdData.length == 0, NXDT.STATUS.MALFORMED_CMD);

        notify('Disconnecting device');

        await this.sendStatus(NXDT.STATUS.SUCCESS);
    }

    async handleCancelCmd(cmdId, cmdData) {
        logger.debug('Handeling: cancel command');
        await this.assert(cmdId == NXDT.COMMAND.CANCEL_TRANSFER && cmdData.length == 0, NXDT.STATUS.MALFORMED_CMD);

        this.transfer.setText('Cancelling…');

        await this.sendStatus(NXDT.STATUS.SUCCESS);
        throw new NxdtCancelCmd();
    }
}

// === APP ===
async function requestDirectory() {
    const request = new NxdtRequest('Destination directory');
    request.open();
    try {
        currentDirectory = await window.showDirectoryPicker({ id: bytesDecode(NXDT.ABI.MAGIC, NXDT.ABI.TEXT), mode: 'readwrite', startIn: 'downloads' });
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

function requestDebug() {
    const fileName = `${document.title}-${logger.stamp(true)}.log`;
    const blobUrl = URL.createObjectURL(logger.blob());

    const e = document.createElement('a');
    e.download = fileName;
    e.href = blobUrl;
    document.body.appendChild(e);
    try {
        e.click();
    } finally {
        document.body.removeChild(e);
    }

    URL.revokeObjectURL(blobUrl);
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
        logger.info('Changing device!');
        await closeDevice();
    }

    try {
        currentDevice = new NxdtUsb(usbDev);
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
        notify('Application error', true);
        globalThis.error = e;
        logger.trace(e);
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

async function syncWorker() {
    await navigator.serviceWorker.register('sw.js');
}

function platformInfo() {
    const version = `${NXDT.VERSION.MAJOR}.${NXDT.VERSION.MINOR}.${NXDT.VERSION.MICRO}`;

    logger.debug(`Platform: version=${version}, browser=${navigator.userAgent}`);

    setValueText(debugButton, version);
}

function browserSupport() {
    const dirSupported = window?.showDirectoryPicker;
    const usbSupported = navigator?.usb;

    logger.debug(`Support: webUSB=${Boolean(usbSupported)}, fsDirectory=${Boolean(dirSupported)}`);

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
let currentDirectory;
let currentDevice;
let currentSession;

const logger = new Logger();
const directoryButton = document.getElementById('directory');
const deviceButton = document.getElementById('device');
const notifyButton = document.getElementById('notify');
const debugButton = document.getElementById('debug');

platformInfo();
browserSupport();
deviceSupport();

directoryButton.addEventListener('click', requestDirectory);
deviceButton.addEventListener('click', requestDevice);
notifyButton.addEventListener('click', requestNotify);
debugButton.addEventListener('click', requestDebug);

syncNotify();
syncWorker();
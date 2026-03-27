"use strict";

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

// === HASH ===
/* Based on https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf */
class Sha256 {
    static blockSize = 64;
    static digestSize = 32;
    static #K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
        0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
        0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
        0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
        0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ]);

    static #getUint32BE(x, offset) {
        return (
            (x[offset + 0] << 24) |
            (x[offset + 1] << 16) |
            (x[offset + 2] << 8) |
            (x[offset + 3] << 0)
        );
    }

    static #ROTR(x, n) {
        return (x >>> n) | (x << (32 - n));
    }

    static #Ch(x, y, z) {
        return (x & y) ^ (~x & z);
    }

    static #Maj(x, y, z) {
        return (x & y) ^ (x & z) ^ (y & z);
    }

    static #S0(x) {
        return Sha256.#ROTR(x, 2) ^ Sha256.#ROTR(x, 13) ^ Sha256.#ROTR(x, 22);
    }

    static #S1(x) {
        return Sha256.#ROTR(x, 6) ^ Sha256.#ROTR(x, 11) ^ Sha256.#ROTR(x, 25);
    }

    static #s0(x) {
        return Sha256.#ROTR(x, 7) ^ Sha256.#ROTR(x, 18) ^ (x >>> 3);
    }

    static #s1(x) {
        return Sha256.#ROTR(x, 17) ^ Sha256.#ROTR(x, 19) ^ (x >>> 10);
    }

    static #hash(M, H, W) {
        // 1. Prepare the message schedule, W
        for (let i = 0; i <= 15; i++) W[i] = Sha256.#getUint32BE(M, i * 4);
        for (let i = 16; i <= 63; i++) W[i] = W[i - 16] + Sha256.#s0(W[i - 15]) + W[i - 7] + Sha256.#s1(W[i - 2]);

        // 2. Initialize the eight working variables, a, b, c, d, e, f, g, and h, with the (i-1)st hash value
        let [a, b, c, d, e, f, g, h] = H;

        // 3. For t=0 to 63
        for (let t = 0; t <= 63; t++) {
            const T1 = h + Sha256.#S1(e) + Sha256.#Ch(e, f, g) + Sha256.#K[t] + W[t];
            const T2 = Sha256.#S0(a) + Sha256.#Maj(a, b, c);
            h = g;
            g = f;
            f = e;
            e = d + T1;
            d = c;
            c = b;
            b = a;
            a = T1 + T2;
        }

        // 4. Compute the ith intermediate hash value H[i]
        H[0] += a;
        H[1] += b;
        H[2] += c;
        H[3] += d;
        H[4] += e;
        H[5] += f;
        H[6] += g;
        H[7] += h;
    }

    #length = 0;
    #M = new Uint8Array(Sha256.blockSize);
    #W = new Uint32Array(64);
    #H = new Uint32Array([
        0x6a09e667, 0xbb67ae85,
        0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c,
        0x1f83d9ab, 0x5be0cd19
    ]);

    constructor(bytes) {
        if (bytes !== undefined) this.update(bytes);
    }

    get #i() {
        return this.#length % Sha256.blockSize;
    }

    update(bytes) {
        let offset = 0;
        let size, chunk;

        // if data in buffer and can fill buffer, fill and compute
        size = Sha256.blockSize - this.#i;
        if (this.#i > 0 && bytes.length >= size) {
            chunk = bytes.subarray(offset, offset + size);
            this.#M.set(chunk, this.#i);
            Sha256.#hash(this.#M, this.#H, this.#W);
            offset += size;
        }

        // while full block available, view and compute
        size = Sha256.blockSize;
        while (offset <= (bytes.length - size)) {
            chunk = bytes.subarray(offset, offset + size);
            Sha256.#hash(chunk, this.#H, this.#W);
            offset += size;
        }

        // if remainder, add to buffer
        size = bytes.length - offset;
        this.#length += offset;
        if (size > 0) {
            chunk = bytes.subarray(offset, offset + size);
            this.#M.set(chunk, this.#i);
            offset += size;
        }
        this.#length += size;
    }

    digest() {
        let view;
        const hasher = this.copy();

        // padding
        const [min, max] = [1 + 8, Sha256.blockSize];
        const length = max - (hasher.#i + min);
        const padding = new Uint8Array(min + ((length + max) % max));
        view = new DataView(padding.buffer);
        view.setUint8(0, 0b10000000);
        view.setBigUint64(view.byteLength - 8, BigInt(hasher.#length) * 8n, false);
        hasher.update(padding);

        // digest
        const digest = new Uint8Array(Sha256.digestSize);
        view = new DataView(digest.buffer);
        for (let i = 0; i < hasher.#H.length; i++) view.setUint32(i * 4, hasher.#H[i], false);
        return digest;
    }

    hexdigest() {
        return Array.from(this.digest()).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    copy() {
        const hasher = new Sha256();
        hasher.#length = this.#length;
        hasher.#M.set(this.#M);
        hasher.#H.set(this.#H);
        return hasher;
    }
}

// === LOGGER ===
class Logger {
    constructor(verbose = true) {
        this.verbose = verbose;
    }

    #records = [];

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
        this.#records.push(this.#format(lvl, msg));
    }

    debug(msg) { this.#record('debug', msg); }
    info(msg) { this.#record('info', msg); }
    warn(msg) { this.#record('warn', msg); }
    error(msg) { this.#record('error', msg); }
    trace(msg) { this.#record('trace', msg); }

    blob() {
        return new Blob(this.#records);
    }
}

// === NXDT ===
const MAGIC = 'NXDT';
const VERSION = {
    MAJOR: 2,
    MINOR: 3,
    MICRO: 0
};

function assert(value, message) {
    if (value) return;
    logger.error(message);
    throw new Error(message);
}

function setValueText(e, value) {
    e.querySelector('.value').innerText = value;
}

function notify(message, important = false) {
    const TIMEOUT = 3000;
    logger.info(`Notification: ${message}`);
    if (important) new Notification(document.title, { body: message });

    // Setup toast
    const toast = document.getElementById('toast');
    const dialogs = document.querySelectorAll('dialog');
    toast.innerText = message;

    // Ensure toast
    if (!toast.timeout) {
        toast.forcePopover = () => {
            toast.togglePopover(false);
            toast.togglePopover(true);
        };
        dialogs.forEach(e => e.addEventListener('toggle', toast.forcePopover));
    }

    // Show toast
    toast.togglePopover(true);
    clearTimeout(toast.timeout);
    toast.timeout = setTimeout(() => {
        dialogs.forEach(e => e.removeEventListener('toggle', toast.forcePopover));
        toast.togglePopover(false);
        delete toast.timeout;
    }, TIMEOUT);
}

class TimeoutError extends Error {}

class NxdtCancelError extends Error {}

function promiseTimeout(promise, timeout) {
    return new Promise((resolve, reject) => {
        const id = setTimeout(() => reject(new TimeoutError('Promise timeout')), timeout);
        promise.then(resolve, reject).finally(() => clearTimeout(id));
    })
}

async function makeFile(dir, filePath) {
    const dirs = filePath.split('/').filter(name => name);
    const name = dirs.pop();

    // Create full directory tree and file
    for (let dirname of dirs) dir = await dir.getDirectoryHandle(dirname, { create: true });
    const file = await dir.getFileHandle(name, { create: true });
    return await file.createWritable({ mode: 'siloed' });
}

class UsbBulk {
    static VENDOR_ID = 0x057E;
    static PRODUCT_ID = 0x3000;
    static MANUFACTURER_NAME = 'DarkMatterCore';
    static PRODUCT_NAME = 'nxdumptool';

    constructor(device) {
        logger.debug('Creating: USB device');
        this.device = device;

        assert(this.device.vendorId === UsbBulk.VENDOR_ID && this.device.productId === UsbBulk.PRODUCT_ID, 'Invalid vendor/product IDs!')

        // Check if the product and manufacturer strings match the ones used by nxdumptool.
        // TODO: enable product string check whenever we're ready for a release.
        // this.device.productName === UsbBulk.productName
        assert(this.device.manufacturerName === UsbBulk.MANUFACTURER_NAME, 'Invalid manufacturer/product strings!');

        // Get default configuration descriptor.
        const configuration = this.device.configuration;

        // Get default interface descriptor.
        this.interface = configuration.interfaces[0];

        // Retrieve endpoints.
        const endpointIn = this.interface.alternate.endpoints.find(e => e.direction === 'in');
        const endpointOut = this.interface.alternate.endpoints.find(e => e.direction === 'out');

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
        await this.cancel();
        await this.device.claimInterface(this.interface);

        logger.debug('Opened: USB device');
    }

    async cancel() {
        logger.debug('Cancelling: USB device');

        try { await this.device.reset() } catch (e) { logger.warn(e) }

        logger.debug('Cancelled: USB device');
    }

    async reset() {
        await this.close();
        await this.open();
    }

    async close() {
        logger.debug('Closing: USB device');

        await this.cancel();
        try { await this.device.releaseInterface(this.interface) } catch (e) { logger.warn(e) }
        try { await this.device.close() } catch (e) { logger.warn(e) }

        logger.debug('Closed: USB device');
    }

    isAlignedToPacket(size) {
        return (size & (this.packetSize - 1)) === 0;
    }

    isTransferActive(got, expect) {
        return got > 0 && got === expect && this.isAlignedToPacket(got);
    }

    async readChunk(size, timeout = -1) {
        assert(size > 0, 'USB.read (invalid size)');
        let promise = this.device.transferIn(this.endpoint.in, size);
        if (timeout >= 0) promise = promiseTimeout(promise, timeout);
        let transfer;
        try {
            transfer = await promise;
        } catch (e) {
            if (!(e instanceof TimeoutError)) throw e;
            await this.cancel();
            transfer = {status: 'ok', data: new DataView(new ArrayBuffer(0))};
        }
        assert(transfer.status === 'ok', 'USB.read (error)');
        const chunk = new Uint8Array(transfer.data.buffer);
        this.readActive = this.isTransferActive(chunk.length, size);
        return chunk;
    }

    async readEnd(timeout = -1) {
        if (!this.readActive) return;
        const chunk = await this.readChunk(1, timeout);
        assert(chunk.length === 0, 'USB.readEnd (received more than expected)');
    }

    async read(size, timeout = -1) {
        const chunk = await this.readChunk(size, timeout);
        await this.readEnd(timeout);
        return chunk;
    }

    async writeChunk(chunk, timeout = -1) {
        assert(chunk.length > 0, 'USB.write (invalid size)');
        let promise = this.device.transferOut(this.endpoint.out, chunk);
        if (timeout >= 0) promise = promiseTimeout(promise, timeout);
        let transfer;
        try {
            transfer = await promise;
        } catch (e) {
            if (!(e instanceof TimeoutError)) throw e;
            await this.cancel();
            transfer = {status: 'ok', bytesWritten: 0};
        }
        assert(transfer.status === 'ok', 'USB.write (error)');
        this.writeActive = this.isTransferActive(transfer.bytesWritten, chunk.length);
        return transfer.bytesWritten;
    }

    async writeEnd(timeout = -1) {
        if (!this.writeActive) return;
        const wr = await this.writeChunk(new Uint8Array(0), timeout);
        assert(wr === 0, 'USB.writeEnd (wrote more than expected)');
    }

    async write(chunk, timeout = -1) {
        const wr = await this.writeChunk(chunk, timeout);
        await this.writeEnd(timeout);
        return wr;
    }
}

class Dialog {
    constructor(e) {
        this.dialog = document.getElementById(e);
        this.title = this.dialog.querySelector('span');
        this.text = this.dialog.querySelector('small');
    }

    open(title, text) {
        logger.info(`Dialog: open (title=${title} text=${text})`);
        this.title.innerText = title;
        this.text.innerText = text;
        this.dialog.showModal();
    }

    close() {
        if (!this.dialog.matches(':open')) return;
        logger.info(`Dialog: close`);
        this.dialog.close();
    }
}

class AlertDialog extends Dialog {
    constructor() {
        super('alert');
    }
}

class SpinnerDialog extends Dialog {
    constructor() {
        super('spinner');
    }
}

class ProgressDialog extends Dialog {
    TIME_UPDATE = 300;
    TIME_ESTIMATE = 3000;

    constructor() {
        super('progress');
        this.progress = this.dialog.querySelector('progress');
        this.label = this.dialog.querySelector('#progress-label');
        this.status = this.dialog.querySelector('& > :last-child');
    }

    open(title, text, max, note = '') {
        this.startTime = Date.now();
        this.progress.value = 0;
        this.progress.max = max;
        this.label.dataset.note = note;
        this.update(0);
        this.updateEta();
        super.open(title, text);
        clearInterval(this.intervalEta);
        this.intervalEta = setInterval(() => this.updateEta(), this.TIME_UPDATE);
    }

    close() {
        clearInterval(this.intervalEta);
        delete this.intervalEta;
        super.close();
    }

    #formatTime(sec) {
        const ranges = [
            { singular: 'hour', plural: 'hours', scale: 60*60 },
            { singular: 'minute', plural: 'minutes', scale: 60 },
            { singular: 'second', plural: 'seconds', scale: 1 }
        ];
        const base = ranges.at(-1);

        for (const range of ranges) {
            if (sec < range.scale && range !== base) continue;
            const value = Math.ceil(sec / range.scale);
            const unit = value !== 1 ? range.plural : range.singular;
            return `${value} ${unit}`;
        }

        throw new RangeError('No time ranges');
    }

    updateEta() {
        const prec = this.progress.position;
        const elapsedTime = Date.now() - this.startTime;
        const remainingTime = (elapsedTime / prec) * (1 - prec);
        const displayTime = prec > 0 && elapsedTime > this.TIME_ESTIMATE && Number.isFinite(remainingTime);
        this.status.innerText = displayTime ? `${this.#formatTime(remainingTime / 1000)} remaining` : '\xa0';
    }

    update(increment) {
        this.progress.value += increment;
        this.label.innerText = `${Math.floor(this.progress.position * 100)} %`;
    }
}

class FsQueue {
    queue = new Set();

    constructor() {
        return this.commit.bind(this);
    }

    open() {
        progressDialog.dialog.addEventListener('toggle', this.handle);
    }

    close() {
        progressDialog.dialog.removeEventListener('toggle', this.handle);
        spinnerDialog.close();
    }

    handle(event) {
        switch (event.newState) {
            case 'open':
                spinnerDialog.close();
                break;
            case 'closed':
                spinnerDialog.open('Finishing…', 'Wait a moment');
                break;
        }
    }

    commit(promise) {
        logger.debug('File: commit to disk');
        if (!this.queue.size) this.open();
        this.queue.add(promise);
        promise.then(() => {
            this.queue.delete(promise);
            if (!this.queue.size) this.close();
        });
    }
}

class NxdtClient {
    VERSION = {
        MAJOR: 1,
        MINOR: 4
    };

    USB = {
        TIMEOUT: 10000,
        BULK_SIZE: 0x800000
    };

    ABI = {
        TEXT: 'utf8',
        MAGIC: 0x5444584E
    };

    COMMAND = {
        START_SESSION: 0,
        END_SESSION: 1,
        FILE_TRANSFER: 2,
        HEADER_TRANSFER: 3,
        CANCEL_TRANSFER: 4,
        FS_TRANSFER: 5,
        BULK_TRANSFER: 6,
        END_TRANSFER: 7
    };

    STATUS = {
        SUCCESS: 0,
        INVALID_MAGIC_WORD: 4,
        UNSUPPORTED_CMD: 5,
        UNSUPPORTED_ABI_VERSION: 6,
        MALFORMED_CMD: 7,
        HOST_IO_ERROR: 8
    };

    STRUCT = {
        COMMAND_HEADER: new Struct('<IIII'),
        STATUS_RESPONSE: new Struct('<IIH6x'),
        SESSION_HEADER: new Struct('<BBBB8s4x'),
        FILE_HEADER: new Struct(`<QII769s15x`),
        FS_HEADER: new Struct(`<Q769s7x`),
        BULK_HEADER: new Struct('<I12x')
    };

    constructor(getContext) {
        this.getContext = getContext;
        this.fsCommit = new FsQueue();
        this.device = this.context.device;
    }

    /* HELPERS */
    get context() {
        return this.getContext();
    }

    async assert(value, code = this.STATUS.HOST_IO_ERROR) {
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
            await this.sendStatus(this.STATUS.HOST_IO_ERROR);
            throw e;
        }
    }

    getChecksum(path) {
        if (!this.context.verify) return;
        return /(?<=^|\/)(?<hash>[0-9a-f]{32})(\.[^\/]+)*\.\x6e\x63\x61$/.exec(path)?.groups?.hash;
    }

    /* PROTOCOL */
    async sendStatus(code = this.STATUS.SUCCESS) {
        logger.debug(`Sending: status (${code})`)

        const status = this.STRUCT.STATUS_RESPONSE.pack(this.ABI.MAGIC, code, this.device.packetSize);
        const wr = await this.device.write(status, this.USB.TIMEOUT);

        assert(wr === status.length, 'Failed to send status code!');
        logger.debug(`Send: status`)
    }

    async getCmdHeader(timeout = this.USB.TIMEOUT) {
        logger.debug('Receiving: command header');

        const cmdHeader = await this.device.read(this.STRUCT.COMMAND_HEADER.size, timeout);
        assert(cmdHeader.length === this.STRUCT.COMMAND_HEADER.size, `Failed to read command header! (got=${cmdHeader.length} expect=${this.STRUCT.COMMAND_HEADER.size})`);

        logger.debug('Received: command header');
        return cmdHeader;
    }

    async parseCmdHeader(cmdHeader) {
        logger.debug('Parsing: command header');
        assert(cmdHeader && cmdHeader.length === this.STRUCT.COMMAND_HEADER.size, `Command header is the wrong size! (got=${cmdHeader.length} expect=${this.STRUCT.COMMAND_HEADER.size})`);

        const [magic, cmdId, cmdDataSize, ..._] = this.STRUCT.COMMAND_HEADER.unpack(cmdHeader);
        logger.debug(`Parsed: command header (magic=${magic}, cmdId=${cmdId}, cmdDataSize=${cmdDataSize})`);

        await this.assert(magic == this.ABI.MAGIC, this.STATUS.INVALID_MAGIC_WORD);
        await this.assert(Object.values(this.COMMAND).includes(cmdId), this.STATUS.UNSUPPORTED_CMD);

        return { cmdId, cmdDataSize };
    }

    async getCmdBlock(cmdDataSize, timeout = this.USB.TIMEOUT) {
        logger.debug('Receiving: command block');

        const cmdData = cmdDataSize ? await this.device.read(cmdDataSize, timeout) : new Uint8Array();
        assert(cmdData.length === cmdDataSize, `Failed to read ${cmdDataSize}-byte long command block!`);

        logger.debug('Received: command block');
        return cmdData;
    }

    async getCmd(cmdHeader = undefined, timeout = this.USB.TIMEOUT) {
        if (!cmdHeader) cmdHeader = await this.getCmdHeader(timeout);
        const { cmdId, cmdDataSize } = await this.parseCmdHeader(cmdHeader);
        const cmdData = await this.getCmdBlock(cmdDataSize, timeout);
        return { cmdId, cmdData };
    }

    /* ACTIONS */
    async handleFileCmd(cmdId, cmdData) {
        logger.info('Requested: file transfer command');
        const { filePath, fileSize, headerSize } = await this.parseFileHeader(cmdId, cmdData);
        let success = true;

        const dir = this.context.directory;
        const file = await this.makeFile(dir, filePath);
        try {
            await this.sendStatus(this.STATUS.SUCCESS);

            progressDialog.open('Transferring…', filePath, fileSize);
            if (headerSize) {
                success &&= await this.handleArchiveTransfer(file, headerSize, fileSize - headerSize);
            } else {
                success &&= await this.handleFileTransfer(file, fileSize);
            }
            this.fsCommit(file.close());
            await this.sendStatus(this.STATUS.SUCCESS);
        } finally {
            progressDialog.close();
        }

        notify(success ? 'Transfer successful' : 'Transfer failed', true);
        return success;
    }

    async parseFileHeader(cmdId, cmdData) {
        logger.debug('Parsing: file header');
        await this.assert(cmdId === this.COMMAND.FILE_TRANSFER && cmdData.length === this.STRUCT.FILE_HEADER.size, this.STATUS.MALFORMED_CMD);

        const [fileSize, filePathLength, headerSize, rawFilePath] = this.STRUCT.FILE_HEADER.unpack(cmdData);
        const filePath = strStrip(bytesDecode(rawFilePath, this.ABI.TEXT), '\0');
        logger.debug(`Parsed: file header (fileSize=${fileSize}, filePathLength=${filePathLength}, headerSize=${headerSize}, filePath=${filePath})`);

        await this.assert(fileSize <= Number.MAX_SAFE_INTEGER, this.STATUS.HOST_IO_ERROR);
        await this.assert(headerSize < fileSize, this.STATUS.MALFORMED_CMD);

        return { filePath, fileSize, headerSize };
    }

    async handleFileTransfer(file, size, hash = undefined) {
        logger.debug(`Handling: file transfer`);
        if (hash) logger.debug(`Checksum: ${hash}`);
        const hasher = new Sha256();
        let success = true;

        let offset = 0;
        while (offset < size) {
            const chunkSize = Math.min(this.USB.BULK_SIZE, size - offset);
            const chunk = await this.device.readChunk(chunkSize, this.USB.TIMEOUT);
            if (chunk.length === 0) await this.handleCancelCmd(this.COMMAND.CANCEL_TRANSFER, chunk);

            // Check if we're dealing with a command
            if (chunk.length === this.STRUCT.COMMAND_HEADER.size) {
                const magic = this.STRUCT.COMMAND_HEADER.tokens[0].unpack(chunk);
                if (magic == this.ABI.MAGIC) {
                    const { cmdId, cmdData } = await this.getCmd(chunk);
                    await this.handleCancelCmd(cmdId, cmdData);
                }
            }

            // Write current chunk.
            await file.write(chunk);
            if (hash) hasher.update(chunk);
            progressDialog.update(chunk.length);
            offset += chunk.length;
        }
        await this.device.readEnd(this.USB.TIMEOUT);
        success &&= offset === size;

        // Handle checksum
        if (!hash) return success;
        const digest = hasher.hexdigest();
        const verified = digest.includes(hash);
        logger.debug(`Checksum: ${digest}, verified=${verified}`);
        success &&= verified;
        return success;
    }

    async handleArchiveTransfer(file, headerSize, dataSize) {
        logger.debug('Handling: archive transfer');
        let cmdId, cmdData;
        let success = true;

        // Skip header
        await file.seek(headerSize);

        // File entries
        let offset = 0;
        while (true) {
            ({ cmdId, cmdData } = await this.getCmd());
            if (cmdId === this.COMMAND.CANCEL_TRANSFER) await this.handleCancelCmd(cmdId, cmdData);
            if (cmdId === this.COMMAND.HEADER_TRANSFER) break;

            const { filePath, fileSize, headerSize } = await this.parseFileHeader(cmdId, cmdData);
            await this.assert(!headerSize, this.STATUS.MALFORMED_CMD);
            await this.sendStatus(this.STATUS.SUCCESS);

            success &&= await this.handleFileTransfer(file, fileSize, this.getChecksum(filePath));
            await this.sendStatus(this.STATUS.SUCCESS);
            offset += fileSize;
        }

        // File header
        await this.assert(cmdId === this.COMMAND.HEADER_TRANSFER && cmdData.length === headerSize, this.STATUS.MALFORMED_CMD);

        await file.seek(0);
        await file.write(cmdData);
        progressDialog.update(cmdData.length);
        offset += cmdData.length;

        success &&= offset === (headerSize + dataSize);

        return success;
    }

    async handleFsCmd(cmdId, cmdData) {
        logger.info('Requested: fs transfer command');
        const { fsSize, fsPath } = await this.parseFsCmdHeader(cmdId, cmdData);
        await this.sendStatus(this.STATUS.SUCCESS);
        let success = true;

        progressDialog.open('Transferring…', fsPath, fsSize);
        try {
            success &&= await this.handleFsTransfer(fsSize);
        } finally {
            progressDialog.close();
        }

        notify(success ? 'Transfer successful' : 'Transfer failed', true);
        return success;
    }

    async parseFsCmdHeader(cmdId, cmdData) {
        logger.debug('Parsing: FS header');
        await this.assert(cmdId === this.COMMAND.FS_TRANSFER && cmdData.length === this.STRUCT.FS_HEADER.size, this.STATUS.MALFORMED_CMD);

        const [fsSize, rawFsPath] = this.STRUCT.FS_HEADER.unpack(cmdData);
        const fsPath = strStrip(bytesDecode(rawFsPath, this.ABI.TEXT), '\0');
        await this.assert(fsSize <= Number.MAX_SAFE_INTEGER, this.STATUS.HOST_IO_ERROR);
        logger.info(`Parsed: fs header (fsSize=${fsSize}, fsPath=${fsPath})`);

        return { fsSize, fsPath };
    }

    async handleFsTransfer(fsSize) {
        logger.debug('Handling: fs transfer');
        const dir = this.context.directory;
        let cmdId, cmdData;
        let success = true;

        // Transfer FS
        let offset = 0;
        while (true) {
            ({ cmdId, cmdData } = await this.getCmd());
            if (cmdId === this.COMMAND.CANCEL_TRANSFER) await this.handleCancelCmd(cmdId, cmdData);
            if (cmdId === this.COMMAND.END_TRANSFER) break;

            const { filePath, fileSize, headerSize } = await this.parseFileHeader(cmdId, cmdData);
            await this.assert(!headerSize, this.STATUS.MALFORMED_CMD);
            const file = await this.makeFile(dir, filePath);
            try {
                await this.sendStatus(this.STATUS.SUCCESS);

                success &&= await this.handleFileTransfer(file, fileSize);
                await this.sendStatus(this.STATUS.SUCCESS);
                offset += fileSize;
            } finally {
                this.fsCommit(file.close());
            }
        }

        await this.handleEndTransferCmd(cmdId, cmdData);
        success &&= offset === fsSize;

        return success;
    }

    async handleEndTransferCmd(cmdId, cmdData) {
        await this.assert(cmdId === this.COMMAND.END_TRANSFER && cmdData.length === 0, this.STATUS.MALFORMED_CMD);
        await this.sendStatus(this.STATUS.SUCCESS);
    }

    async handleBulkCmd(cmdId, cmdData) {
        logger.info('Requested: bulk transfer command');
        const { bulkCount } = await this.parseBulkCmdHeader(cmdId, cmdData);
        await this.sendStatus(this.STATUS.SUCCESS);
        let success = true;

        try {
            success &&= await this.handleBulkTransfer(bulkCount);
        } finally {
            progressDialog.close();
        }

        notify(success ? 'Transfer successful' : 'Transfer failed', true);
        return success;
    }

    async parseBulkCmdHeader(cmdId, cmdData) {
        logger.debug('Parsing: bulk header');
        await this.assert(cmdId === this.COMMAND.BULK_TRANSFER && cmdData.length === this.STRUCT.BULK_HEADER.size, this.STATUS.MALFORMED_CMD);

        const [bulkCount] = this.STRUCT.BULK_HEADER.unpack(cmdData);
        logger.info(`Parsed: bulk header (bulkCount=${bulkCount})`);

        return { bulkCount };
    }

    async handleBulkTransfer(bulkCount) {
        logger.debug('Handling: bulk transfer');
        const dir = this.context.directory;
        let cmdId, cmdData;
        let success = true;

        // Transfer Bulk
        let count = 0;
        while (true) {
            ({ cmdId, cmdData } = await this.getCmd());
            if (cmdId === this.COMMAND.CANCEL_TRANSFER) await this.handleCancelCmd(cmdId, cmdData);
            if (cmdId === this.COMMAND.END_TRANSFER) break;

            const { filePath, fileSize, headerSize } = await this.parseFileHeader(cmdId, cmdData);
            await this.assert(headerSize, this.STATUS.MALFORMED_CMD);
            const file = await this.makeFile(dir, filePath);
            await this.sendStatus(this.STATUS.SUCCESS);

            progressDialog.open('Transferring…', filePath, fileSize, `${count + 1}/${bulkCount}`);
            success &&= await this.handleArchiveTransfer(file, headerSize, fileSize - headerSize);
            this.fsCommit(file.close());
            await this.sendStatus(this.STATUS.SUCCESS);
            count++;
        }

        await this.handleEndTransferCmd(cmdId, cmdData);
        success &&= count === bulkCount;

        return success;
    }

    /* SESSION */
    async handleStartSessionCmd(cmdId, cmdData) {
        logger.debug('Handling: session start command');
        const { abiMajor, abiMinor } = await this.parseStartSessionHeader(cmdId, cmdData);
        let success = true;

        await this.assert(abiMajor === this.VERSION.MAJOR && abiMinor === this.VERSION.MINOR, this.STATUS.UNSUPPORTED_ABI_VERSION);
        await this.sendStatus(this.STATUS.SUCCESS);

        success &&= await this.handleSessionTransfer()

        return success;
    }

    async parseStartSessionHeader(cmdId, cmdData) {
        logger.debug('Parsing: session header');
        await this.assert(cmdId === this.COMMAND.START_SESSION && cmdData.length === this.STRUCT.SESSION_HEADER.size, this.STATUS.MALFORMED_CMD);

        const [versionMajor, versionMinor, versionMicro, abiVersion, rawVersionCommit] = this.STRUCT.SESSION_HEADER.unpack(cmdData);
        const [abiMajor, abiMinor] = [((abiVersion >> 4) & 0x0F), ((abiVersion >> 0) & 0x0F)];
        const versionCommit = strStrip(bytesDecode(rawVersionCommit, this.ABI.TEXT), '\0');
        logger.debug(`Parsed: client info (version=${versionMajor}.${versionMinor}.${versionMicro}, commit=${versionCommit}, abi=${abiMajor}.${abiMinor})`);

        return { versionMajor, versionMinor, versionMicro, versionCommit, abiMajor, abiMinor };
    }

    async handleSessionTransfer() {
        logger.debug('Handling: session transfer command');
        let cmdId, cmdData;
        let success = true;

        loop: while (true) {
            ({ cmdId, cmdData } = await this.getCmd(undefined, -1));

            try {
                switch (cmdId) {
                    case this.COMMAND.FILE_TRANSFER:
                        success &&= await this.handleFileCmd(cmdId, cmdData);
                        break;
                    case this.COMMAND.FS_TRANSFER:
                        success &&= await this.handleFsCmd(cmdId, cmdData);
                        break;
                    case this.COMMAND.BULK_TRANSFER:
                        success &&= await this.handleBulkCmd(cmdId, cmdData);
                        break;
                    case this.COMMAND.END_SESSION:
                        break loop;
                    default:
                        await this.sendStatus(this.STATUS.MALFORMED_CMD);
                }
            } catch (e) {
                if (!(e instanceof NxdtCancelError)) throw e;
            }
        }

        success &&= await this.handleEndSessionCmd(cmdId, cmdData);

        return success;
    }

    async handleEndSessionCmd(cmdId, cmdData) {
        await this.assert(cmdId === this.COMMAND.END_SESSION && cmdData.length === 0, this.STATUS.MALFORMED_CMD);
        await this.sendStatus(this.STATUS.SUCCESS);

        notify('Disconnecting device');
        return true;
    }

    async handleCancelCmd(cmdId, cmdData) {
        logger.debug('Handling: cancel command');
        await this.assert(cmdId === this.COMMAND.CANCEL_TRANSFER && cmdData.length === 0, this.STATUS.MALFORMED_CMD);
        await this.sendStatus(this.STATUS.SUCCESS);

        notify('Operation cancelled');
        throw new NxdtCancelError();
    }
}

class NxdtClientCompat1 extends NxdtClient {
    VERSION = {
        MAJOR: 1,
        MINOR: 3
    };

    COMMAND = {
        START_SESSION: 0,
        FILE_TRANSFER: 1,
        CANCEL_TRANSFER: 2,
        HEADER_TRANSFER: 3,
        END_SESSION: 4,
        FS_TRANSFER: 5,
        END_TRANSFER: 6,
        BULK_TRANSFER: 7
    };

    async handleBulkCmd(cmdId, cmdData) {
        logger.info('Requested: bulk transfer command');
        await this.parseBulkCmdHeader(cmdId, cmdData);
        await this.sendStatus(this.STATUS.SUCCESS);
        return true;
    }
}

class NxdtClientCompat0 extends NxdtClientCompat1 {
    VERSION = {
        MAJOR: 1,
        MINOR: 0
    };

    USB = {
        ...this.USB,
        TIMEOUT: 5000
    };
}

// === APP ===
async function requestDirectory() {
    spinnerDialog.open('Requesting…', 'Destination directory');
    try {
        directoryButton.directory = await window.showDirectoryPicker({ id: MAGIC, mode: 'readwrite', startIn: 'downloads' });
    } catch (e) {
        logger.warn(e);
        return;
    } finally {
        spinnerDialog.close();
    }

    setValueText(directoryButton, directoryButton.directory.name);
    logger.info(`Setting: directory=${directoryButton.directory.name}`);

    if (!deviceButton.disabled) return;
    deviceButton.disabled = false;

    navigator.usb.addEventListener('connect', async (event) => {
        if (deviceButton.device) return;
        await openDevice(event.device);
        await handleSession();
    });

    const devices = await navigator.usb.getDevices();
    for (let device of devices) {
        try {
            await openDevice(device);
        } catch (e) {
            logger.warn(e);
            continue;
        }

        break;
    }

    if (!appRoot.client) return;
    await handleSession();
}

async function requestDevice() {
    let device;
    spinnerDialog.open('Requesting…', 'Source device');
    try {
        device = await navigator.usb.requestDevice({ filters: [{ vendorId: UsbBulk.VENDOR_ID, productId: UsbBulk.PRODUCT_ID }] });
    } catch (e) {
        logger.warn(e);
        return;
    } finally {
        spinnerDialog.close();
    }

    await openDevice(device);
    await handleSession();
}

function toggleVerify() {
    verifyButton.enabled = !verifyButton.enabled;
    logger.info(`Setting: verify=${verifyButton.enabled}`);
    setValueText(verifyButton, verifyButton.enabled ? 'Enabled' : 'Disabled');
}

function generateDebug() {
    const fileName = `${document.title}-${logger.stamp(true)}.log`;
    logger.info(`Setting: debug=${fileName}`);
    let e, url;

    try {
        url = URL.createObjectURL(logger.blob());

        try {
            e = document.createElement('a');
            e.download = fileName;
            e.href = url;
            document.body.appendChild(e);
            e.click();
        } finally {
            document.body.removeChild(e);
        }

    } finally {
        URL.revokeObjectURL(url);
    }
}

async function requestNotify() {
    spinnerDialog.open('Requesting…', 'Notification permission');
    try {
        await Notification.requestPermission();
    } finally {
        spinnerDialog.close();
    }

    if (!syncNotify()) {
        notify('Notifications denied');
    }
}

async function closeDevice() {
    setValueText(deviceButton, 'Not connected');
    await deviceButton.device.close();
    deviceButton.device = undefined;
}

async function openDevice(usbDev) {
    notify('Connecting device');

    if (deviceButton.device) {
        logger.info('Changing device!');
        await closeDevice();
    }

    let device;
    try {
        device = new UsbBulk(usbDev);
    } catch (e) {
        notify('Device incompatible');
        logger.warn(e);
        await usbDev.forget();
        throw e;
    }

    try {
        await device.open();
    } catch (e) {
        notify('Device unresponsive');
        logger.warn(e);
        await device.close();
        throw e;
    }
    deviceButton.device = device;

    const client = new NxdtClient(getContext);

    let cmdId, cmdData;
    try {
        ({ cmdId, cmdData } = await client.getCmd());
    } catch (e) {
        notify('Application unresponsive');
        logger.warn(e);
        await closeDevice();
        throw e;
    }

    let abiMajor, abiMinor;
    try {
        ({ abiMajor, abiMinor } = await client.parseStartSessionHeader(cmdId, cmdData));
        client.assert(abiMajor == client.VERSION.MAJOR && abiMinor == client.VERSION.MINOR, client.STATUS.UNSUPPORTED_ABI_VERSION);
        client.sendStatus(client.STATUS.SUCCESS);
    } catch (e) {
        notify('Application incompatible');
        logger.warn(e);
        await closeDevice();
        throw e;
    }
    appRoot.client = client;

    notify('Device connected');
    setValueText(deviceButton, deviceButton.device.device.productName);
}

async function handleSession() {
    try {
        await appRoot.client.handleSessionTransfer();
    } catch (e) {
        notify('Communication error', true);
        logger.trace(e);
        throw e;
    } finally {
        await closeDevice(deviceButton.device);
        appRoot.client = undefined;
    }

    notify('Device disconnected');
}

function getContext() {
    return {
        device: deviceButton.device,
        directory: directoryButton.directory,
        verify: verifyButton.enabled
    }
}

function platformInfo() {
    const version = `${VERSION.MAJOR}.${VERSION.MINOR}.${VERSION.MICRO}`;

    logger.debug(`Platform: version=${version}, browser=${navigator.userAgent}`);

    setValueText(debugButton, version);
}

function browserSupport() {
    const dirSupported = window?.showDirectoryPicker;
    const usbSupported = navigator?.usb;
    const supported = dirSupported && usbSupported;

    logger.debug(`Support: fsDirectory=${Boolean(dirSupported)}, webUSB=${Boolean(usbSupported)}`);

    if (!supported) {
        appRoot.remove();

        alertDialog.open(
            'Your configuration is not supported!',
            'Try a chromium-based browser on a desktop device.'
        );
    }

    assert(supported, 'Unsupported browser!')
}

function deviceSupport() {
    const deviceInfo = document.getElementById('device-info');
    const platform = navigator?.userAgentData?.platform || 'Unknown';
    const platformInfo = deviceInfo.querySelector(`[data-platform=${platform}]`) || deviceInfo.querySelector('[data-platform=unknown]');

    switch (platformInfo.dataset.platform) {
        case 'Linux':
            setValueText(platformInfo, `SUBSYSTEM=='usb', ATTRS{idVendor}=='${hex(UsbBulk.VENDOR_ID, 4)}', ATTRS{idProduct}=='${hex(UsbBulk.PRODUCT_ID, 4)}', TAG+='uaccess'`);
            break;
        case 'unknown':
            setValueText(platformInfo, platform);
            break;
    }

    platformInfo.hidden = false;
}

function syncNotify() {
    const asked = Notification.permission !== 'default';
    const allowed = Notification.permission === 'granted';
    notifyButton.style.display = asked ? 'none' : 'initial';
    return allowed;
}

async function syncWorker() {
    await navigator.serviceWorker.register('sw.js');
}

// Setup
const logger = new Logger();
const alertDialog = new AlertDialog();
const spinnerDialog = new SpinnerDialog();
const progressDialog = new ProgressDialog();
const appRoot = document.getElementById('app');
const directoryButton = document.getElementById('directory');
const deviceButton = document.getElementById('device');
const verifyButton = document.getElementById('verify');
const debugButton = document.getElementById('debug');
const notifyButton = document.getElementById('notify');

platformInfo();
browserSupport();
deviceSupport();

directoryButton.addEventListener('click', requestDirectory);
deviceButton.addEventListener('click', requestDevice);
verifyButton.addEventListener('click', toggleVerify);
debugButton.addEventListener('click', generateDebug);
notifyButton.addEventListener('click', requestNotify);

syncWorker();
syncNotify();
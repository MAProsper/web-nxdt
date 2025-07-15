const NXDT = {
    CONSTANT: {
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
    },
    STATE: {
        USB: {
            DEVICE: null,
            ENDPOINT: {
                IN: null,
                OUT: null,
                PACKET_SIZE: 0
            },
            VERSION: {
                MAJOR: 0,
                MINOR: 0
            }
        },
        NXDT: {
            VERSION: {
                MAJOR: 0,
                MINOR: 0,
                MICRO: 0,
                GIT_COMMIT: ''
            },
            ABI: {
                MAJOR: 0,
                MINOR: 0,
            }
        },
        TRANSFER: {
            NSP: false,
            MISSING: 0,
            SIZE: 0,
            HEADER_SIZE: 0,
            HANDLE: null,
            PARENT: null,
            DST: null,
            PATH: ''
        }
    }
}

async function usbHandleStartSession(cmd_block) {
    if (cmd_block.byteLength != NXDT.CONSTANT.SIZE.START_SESSION_HEADER) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    // Parse command block.
    var abi_version
    [NXDT.STATE.NXDT.VERSION.MAJOR, NXDT.STATE.NXDT.VERSION.MINOR, NXDT.STATE.NXDT.VERSION.MICRO, abi_version, NXDT.STATE.NXDT.VERSION.GIT_COMMIT] = struct('<BBBB8s').unpack_from(cmd_block, 0)

    // Unpack ABI version.
    NXDT.STATE.NXDT.ABI.MAJOR  = ((abi_version >> 4) & 0x0F)
    NXDT.STATE.NXDT.ABI.MINOR = (abi_version & 0x0F)

    // Print client info.
    console.log(`Client info: ${NXDT.CONSTANT.DEVICE.productName} v${NXDT.STATE.NXDT.VERSION.MAJOR}.${NXDT.STATE.NXDT.VERSION.MINOR}.${NXDT.STATE.NXDT.VERSION.MICRO}, USB ABI v${NXDT.STATE.NXDT.ABI.MAJOR }.${NXDT.STATE.NXDT.ABI.MINOR} (commit ${NXDT.STATE.NXDT.VERSION.GIT_COMMIT}), USB ${globalThis.usbVersion}.`)

    // Check if we support this ABI version.
    if ((NXDT.STATE.NXDT.ABI.MAJOR  != NXDT.CONSTANT.ABI.MAJOR) || (NXDT.STATE.NXDT.ABI.MINOR != NXDT.CONSTANT.ABI.MINOR)) {
        console.error('Unsupported ABI version!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.UNSUPPORTED_ABI_VERSION)
        return false
    }

    // Return status code.
    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)
    return true
}

async function usbHandleEndSession(cmd_block) {
    console.debug(`Received EndSession (${NXDT.CONSTANT.COMMAND.END_SESSION}) command.`)
    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)
    return false
}

async function usbRead(size) {
    var rd = new ArrayBuffer()

    var transfer = await NXDT.STATE.USB.DEVICE.transferIn(NXDT.STATE.USB.ENDPOINT.IN, size)

    if (transfer.status == 'ok') {
        rd = transfer.data.buffer.transfer()
    } else {
        console.error("USB.read (error)")
    }

    return rd
}

async function usbWrite(data) {
    var wr = 0

    var transfer = await NXDT.STATE.USB.DEVICE.transferOut(NXDT.STATE.USB.ENDPOINT.OUT, data)
    wr = transfer.bytesWritten

    if (transfer.status == 'ok') {
    } else {
        console.error("USB.write (error)")
    }

    return wr
}

async function usbSendStatus(code) {
    var status = struct('<4sIH6x').pack(NXDT.CONSTANT.ABI.MAGIC, code, NXDT.STATE.USB.ENDPOINT.PACKET_SIZE)
    return (await usbWrite(status)) == status.byteLength
}

function utilsIsValueAlignedToEndpointPacketSize(value) {
    return (value & (NXDT.STATE.USB.ENDPOINT.PACKET_SIZE - 1)) == 0
}

async function usbHandleSendFileProperties(cmd_block) {
    console.debug(`Received SendFileProperties (${NXDT.CONSTANT.COMMAND.SEND_FILE_PROPERTIES}) command.`)

    // Perform sanity checks.
    if (cmd_block.byteLength != NXDT.CONSTANT.SIZE.SEND_FILE_PROPERTIES_HEADER) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    // Parse command block.
    var [file_size, filename_length, nsp_header_size] = struct('<QII').unpack_from(cmd_block, 0)
    var filename = struct(`<${filename_length}s`).unpack_from(cmd_block, 16)[0]

    // Print info.
    console.debug(`File size: ${file_size} | Filename length: ${filename_length} | NSP header size: ${nsp_header_size}.`)
    console.info(`Receiving file: ${filename}`)

    // Perform sanity checks.
    if (file_size > BigInt(Number.MAX_SAFE_INTEGER)) {
        console.error('File size must be smaller than than the max safe integer!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.HOST_IO_ERROR)
        return true
    }
    file_size = Number(file_size)

    if ((!NXDT.STATE.TRANSFER.NSP) && file_size && (nsp_header_size >= file_size)) {
        console.error('NSP header size must be smaller than the full NSP size!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if (NXDT.STATE.TRANSFER.NSP && nsp_header_size) {
        console.error('Received non-zero NSP header size during NSP transfer mode!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if ((!filename_length) || (filename_length > NXDT.CONSTANT.SIZE.SEND_FILE_PROPERTIES_NAME)) {
        console.error('Invalid filename length!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    // Enable NSP transfer mode (if needed).
    if (!NXDT.STATE.TRANSFER.NSP && file_size && nsp_header_size) {
        NXDT.STATE.TRANSFER.NSP = true
        NXDT.STATE.TRANSFER.SIZE = file_size
        NXDT.STATE.TRANSFER.HEADER_SIZE = nsp_header_size
        NXDT.STATE.TRANSFER.MISSING = (file_size - nsp_header_size)
        NXDT.STATE.TRANSFER.PARENT = null
        NXDT.STATE.TRANSFER.HANDLE = null
        NXDT.STATE.TRANSFER.PATH = ''
        console.debug('NSP transfer mode enabled!')
    }

    // Perform additional sanity checks and get a file object to work with.
    var file, dir
    if (!NXDT.STATE.TRANSFER.NSP || (NXDT.STATE.TRANSFER.HANDLE === null)) {

        var dirs = filename.split("/").filter(name => name)
        var name = dirs.pop()

        // Create full directory tree.
        var dirname
        dir = NXDT.STATE.TRANSFER.DST
        for (dirname of dirs) {
            try {
                dir = await dir.getDirectoryHandle(dirname, {create: true})
            } catch (e) {
                console.error(`Output filepath points to an existing directory! ("${filename}").`)
                await usbSendStatus(NXDT.CONSTANT.STATUS.HOST_IO_ERROR)
                return true
            }
        }

        // Make sure the output filepath doesn't point to an existing directory.
        var file_handle
        try {
            file_handle = await dir.getFileHandle(name, {create: true})
        } catch (e) {
            console.error(`Output filepath points to an existing directory! ("${filename}").`)
            await usbSendStatus(NXDT.CONSTANT.STATUS.HOST_IO_ERROR)
            return true
        }

        // NXDT.STATE.TRANSFER.PARENT = await NXDT.STATE.TRANSFER.DST.getDirectoryHandle(filename, {create: true})

        // Get file object.
        file = await file_handle.createWritable({mode: "exclusive"})

        if (NXDT.STATE.TRANSFER.NSP) {
            // Update NSP file object.
            NXDT.STATE.TRANSFER.HANDLE = file
            NXDT.STATE.TRANSFER.PARENT = dir

            // Update NSP file path.
            NXDT.STATE.TRANSFER.PATH = filename

            // Write NSP header padding right away.
            await file.seek(NXDT.STATE.TRANSFER.HEADER_SIZE)
            // await file.write(new ArrayBuffer(NXDT.STATE.TRANSFER.HEADER_SIZE))
        }
    } else {
        // Retrieve what we need using global variables.
        file = NXDT.STATE.TRANSFER.HANDLE
        filename = NXDT.STATE.TRANSFER.PATH
        dir = NXDT.STATE.TRANSFER.PARENT
    }

    // Check if we're dealing with an empty file or with the first SendFileProperties command from a NSP.
    if ((!file_size) || (NXDT.STATE.TRANSFER.NSP && file_size == NXDT.STATE.TRANSFER.SIZE)) {
        await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)

        // Close file (if needed).
        if (!NXDT.STATE.TRANSFER.NSP) {
            await file.close()
        }

        // Let the command handler take care of sending the status response for us.
        return true
    }

    // Check if we should use the progress bar window.
    var use_pbar = false
    var pbar_n, pbar_file_size
    if (use_pbar) {
        if ((!NXDT.STATE.TRANSFER.NSP) || NXDT.STATE.TRANSFER.MISSING == (NXDT.STATE.TRANSFER.SIZE - NXDT.STATE.TRANSFER.HEADER_SIZE)) {
            if (!NXDT.STATE.TRANSFER.NSP) {
                // Set current progress to zero and the maximum value to the provided file size.
                pbar_n = 0
                pbar_file_size = file_size
            } else {
                // Set current progress to the NSP header size and the maximum value to the provided NSP size.
                pbar_n = NXDT.STATE.TRANSFER.HEADER_SIZE
                pbar_file_size = NXDT.STATE.TRANSFER.SIZE
            }

            // Display progress bar window.
            console.info("progressBarWindow.start", pbar_n, pbar_file_size)
        } else {
            // Set current prefix (holds the filename for the current NSP file entry).
            console.info("progressBarWindow.set_prefix")
        }
    }

    async function cancelTransfer() {
        // Cancel file transfer.
        if (NXDT.STATE.TRANSFER.NSP) {
            await utilsResetNspInfo(true)
        } else {
            await file.close()
            await dir.removeEntry(filename.replace(/.*\//, ''), {recursive: true})
        }

        if (use_pbar && (globalThis.progressBarWindow !== null)) {
            console.info("progressBarWindow.end")
        }
    }

    // Send status response before entering the data transfer stage.
    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)

    // Start data transfer stage.
    console.debug(`Data transfer started. Writing to: "${filename}".`)

    // Start transfer process.
    var start_time = Date.now()

    var offset = 0
    while (offset < file_size) {

        // Update block size (if needed).
        var diff = file_size - offset
        var blksize = Math.min(NXDT.CONSTANT.SIZE.SEND_FILE_PROPERTIES_TRANSFER, diff)

        // Set block size and handle Zero-Length Termination packet (if needed).
        var rd_size = blksize
        if (((offset + blksize) >= file_size) && utilsIsValueAlignedToEndpointPacketSize(blksize)) {
            rd_size += 1
        }

        // Read current chunk.
        var chunk = await usbRead(rd_size)
        if (!chunk) {
            console.error(`Failed to read ${rd_size}-byte long data chunk!`)

            // Cancel file transfer.
            await cancelTransfer()

            // Returning None will make the command handler exit right away.
            return false
        }

        var chunk_size = chunk.byteLength

        // Check if we're dealing with a CancelFileTransfer command.
        if (chunk_size == NXDT.CONSTANT.SIZE.CMD_HEADER) {
            var [magic, cmd_id, cmd_block_size, _] = struct('<4sIII').unpack_from(chunk, 0)
            if ((magic == NXDT.CONSTANT.ABI.MAGIC) && (cmd_id == NXDT.CONSTANT.COMMAND.CANCEL_FILE_TRANSFER) && (cmd_block_size == 0)) {

                await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)

                // Cancel file transfer.
                await cancelTransfer()

                console.debug(`Received CancelFileTransfer (${NXDT.CONSTANT.COMMAND.CANCEL_FILE_TRANSFER}) command.`)
                console.warn('Transfer cancelled.')
                
                // Let the command handler take care of sending the status response for us.
                return true
            }
        }

        // Write current chunk.
        await file.write(chunk)
        // await file.flush()

        // Update current offset.
        offset = (offset + chunk_size)

        // Update remaining NSP data size.
        if (NXDT.STATE.TRANSFER.NSP) {
            NXDT.STATE.TRANSFER.MISSING -= chunk_size
        }

        // Update progress bar window (if needed).
        if (use_pbar) {
            console.info("progressBarWindow.update", chunk_size)
        }
    }

    elapsed_time = Date.now() - start_time
    console.debug(`File transfer successfully completed in ${elapsed_time}s!`)

    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)

    // Close file handle (if needed).
    if (!NXDT.STATE.TRANSFER.NSP) {
        await file.close()
    }

    // Hide progress bar window (if needed).
    if (use_pbar && ((!NXDT.STATE.TRANSFER.NSP) || (!NXDT.STATE.TRANSFER.MISSING))) {
        console.info("progressBarWindow.end")
    }

    return true
}

async function usbHandleCancelFileTransfer(cmd_block) {
    console.debug(`Received CancelFileTransfer (${NXDT.CONSTANT.COMMAND.CANCEL_FILE_TRANSFER}) command.`)

    // Perform sanity checks.
    if (cmd_block.byteLength) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if (NXDT.STATE.TRANSFER.NSP) {
        if ((NXDT.STATE.TRANSFER.SIZE > USB_TRANSFER_THRESHOLD) && (globalThis.progressBarWindow !== null)) {
            console.info("progressBarWindow.end")
        }

        await utilsResetNspInfo(true)

        console.warn('Transfer cancelled.')
        await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)
        return true
    } else {
        console.error('Unexpected transfer cancellation.')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }
}

async function usbHandleSendNspHeader(cmd_block) {
    console.debug(`Received SendNspHeader (${NXDT.CONSTANT.COMMAND.SEND_NSP_HEADER}) command.`)

    // Perform sanity checks.
    if (!cmd_block.byteLength) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    var nsp_header_size = cmd_block.byteLength

    // Validity checks.
    if (!NXDT.STATE.TRANSFER.NSP) {
        console.error('Received NSP header out of NSP transfer mode!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if (NXDT.STATE.TRANSFER.MISSING) {
        console.error(`Received NSP header before receiving all NSP data! (missing ${NXDT.STATE.TRANSFER.MISSING} byte[s]).`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if (nsp_header_size != NXDT.STATE.TRANSFER.HEADER_SIZE) {
        console.error(`NSP header size mismatch! (${nsp_header_size} != ${NXDT.STATE.TRANSFER.HEADER_SIZE}).`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    // Write NSP header.
    await NXDT.STATE.TRANSFER.HANDLE.seek(0)
    await NXDT.STATE.TRANSFER.HANDLE.write(cmd_block)

    console.debug(`Successfully wrote ${nsp_header_size}-byte long NSP header to "${NXDT.STATE.TRANSFER.PATH}".`)

    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)

    // Disable NSP transfer mode.
    await utilsResetNspInfo()

    return true
}

async function usbHandleStartExtractedFsDump(cmd_block) {
    console.debug(`Received StartExtractedFsDump (${NXDT.CONSTANT.COMMAND.START_EXTRACTED_FS_DUMP}) command.`)

    // Perform sanity checks.
    if (cmd_block.byteLength != NXDT.CONSTANT.SIZE.START_EXTRACTED_FS_DUMP_HEADER) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    if (NXDT.STATE.TRANSFER.NSP) {
        console.error('StartExtractedFsDump received mid NSP transfer.')
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    // Parse command block.
    var [extracted_fs_size, extracted_fs_root_path] = struct(`<Q${NXDT.CONSTANT.SIZE.SEND_FILE_PROPERTIES_NAME}s`).unpack_from(cmd_block, 0)

    // Perform sanity checks.
    if (extracted_fs_size > BigInt(Number.MAX_SAFE_INTEGER)) {
        console.error('File system size must be smaller than than the max safe integer!')
        await usbSendStatus(NXDT.CONSTANT.STATUS.HOST_IO_ERROR)
        return true
    }
    extracted_fs_size = Number(extracted_fs_size)

    console.info(`Starting extracted FS dump (size ${extracted_fs_size}, output relative path "${extracted_fs_root_path}").`)

    // Return status code.
    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)
    return true
}

async function usbHandleEndExtractedFsDump(cmd_block) {
    console.debug(`Received EndExtractedFsDump (${NXDT.CONSTANT.SIZE.END_EXTRACTED_FS_DUMP_HEADER}) command.`)

    // Perform sanity checks.
    if (cmd_block.byteLength) {
        console.error(`Invalid command block size for command ID ${cmd_id}! (${cmd_block.byteLength})`)
        await usbSendStatus(NXDT.CONSTANT.STATUS.MALFORMED_CMD)
        return true
    }

    console.info('Finished extracted FS dump.')
    await usbSendStatus(NXDT.CONSTANT.STATUS.SUCCESS)
    return true
}

async function usbCommandHandler() {
    var cmd_dict = new Map([
        [NXDT.CONSTANT.COMMAND.START_SESSION,           usbHandleStartSession],
        [NXDT.CONSTANT.COMMAND.SEND_FILE_PROPERTIES,    usbHandleSendFileProperties],
        [NXDT.CONSTANT.COMMAND.CANCEL_FILE_TRANSFER,    usbHandleCancelFileTransfer],
        [NXDT.CONSTANT.COMMAND.SEND_NSP_HEADER,         usbHandleSendNspHeader],
        [NXDT.CONSTANT.COMMAND.END_SESSION,             usbHandleEndSession],
        [NXDT.CONSTANT.COMMAND.START_EXTRACTED_FS_DUMP, usbHandleStartExtractedFsDump],
        [NXDT.CONSTANT.SIZE.END_EXTRACTED_FS_DUMP_HEADER,   usbHandleEndExtractedFsDump]
    ])

    connect_button.querySelector(".value").innerText = `${NXDT.STATE.USB.DEVICE.productName} (${NXDT.STATE.USB.DEVICE.serialNumber})`;

    // Reset NSP info.
    await utilsResetNspInfo()

    while (true) {
        // Read command header.
        try {
            var cmd_header = await usbRead(NXDT.CONSTANT.SIZE.CMD_HEADER)
        } catch (e) {
            console.error(`Failed to read ${NXDT.CONSTANT.SIZE.CMD_HEADER}-byte long command header!`)
            break
        }
        if (!cmd_header || cmd_header.byteLength != NXDT.CONSTANT.SIZE.CMD_HEADER) {
            console.error(`Failed to read ${NXDT.CONSTANT.SIZE.CMD_HEADER}-byte long command header!`)
            break
        }

        console.debug('Received command header data.')

        // Parse command header.
        var [magic, cmd_id, cmd_block_size, _] = struct("<4sIII").unpack_from(cmd_header, 0)

        // Read command block right away (if needed).
        // nxdumptool expects us to read it right after sending the command header.
        cmd_block = new ArrayBuffer()
        if (cmd_block_size) {
            // Handle Zero-Length Termination packet (if needed).
            if (utilsIsValueAlignedToEndpointPacketSize(cmd_block_size)) {
                rd_size = (cmd_block_size + 1)
            } else {
                rd_size = cmd_block_size
            }

            cmd_block = await usbRead(rd_size)
            if (!cmd_block || cmd_block.byteLength != cmd_block_size) {
                console.error(`Failed to read ${cmd_block_size}-byte long command block for command ID ${cmd_id}!`)
                break
            }

            console.debug('Received command block data.')
        }

        // Verify magic word.
        if (magic != NXDT.CONSTANT.ABI.MAGIC) {
            console.error('Received command header with invalid magic word!')
            await usbSendStatus(NXDT.CONSTANT.STATUS.INVALID_MAGIC_WORD)
            continue
        }

        // Get command handler function.
        var cmd_func = cmd_dict.get(cmd_id)

        if (!cmd_func) {
            console.error(`Received command header with unsupported ID ${cmd_id}`)
            await usbSendStatus(NXDT.CONSTANT.STATUS.UNSUPPORTED_CMD)
            continue
        }

        // Run command handler function.
        // Send status response afterwards. Bail out if requested.
        var status = await cmd_func(cmd_block)
        if (!status) {
            break
        }
    }

    console.info('Stopping server.')
    try {
        await NXDT.STATE.USB.DEVICE.close()
    } catch (e) {
    }
    NXDT.STATE.USB.DEVICE = null
    connect_button.querySelector(".value").innerText = "Not connected"
}

async function utilsResetNspInfo(del = false) {
    if (NXDT.STATE.TRANSFER.HANDLE) {
        await NXDT.STATE.TRANSFER.HANDLE.close()
        if (del) {
            await NXDT.STATE.TRANSFER.PARENT.removeEntry(NXDT.STATE.TRANSFER.PATH.replace(/.*\//, ''), {recursive: true})
        }
    }

    // Reset NSP transfer mode info.
    NXDT.STATE.TRANSFER.NSP = false
    NXDT.STATE.TRANSFER.SIZE = 0
    NXDT.STATE.TRANSFER.HEADER_SIZE = 0
    NXDT.STATE.TRANSFER.MISSING = 0
    NXDT.STATE.TRANSFER.HANDLE = null
    NXDT.STATE.TRANSFER.PARENT = null
    NXDT.STATE.TRANSFER.PATH = ''

}

async function usbSetupDevice(usbDev) {
    var usb_ep_in_lambda = e => e.direction == 'in'
    var usb_ep_out_lambda = e => e.direction == 'out'

    // Check if the product and manufacturer strings match the ones used by nxdumptool.
    // TODO: enable product string check whenever we're ready for a release.
    //if (NXDT.STATE.USB.DEVICE.manufacturer != NXDT.CONSTANT.DEVICE.manufacturerName) or (NXDT.STATE.USB.DEVICE.product != USB_DEV_PRODUCT):
    if (usbDev.manufacturerName != NXDT.CONSTANT.DEVICE.manufacturerName) {
        console.error('Invalid manufacturer/product strings!')
        await usbDev.forget();
        throw new Error();
    }

    // Set default device configuration, then get the active configuration descriptor.
    var cfg = usbDev.configuration

    // Get default interface descriptor.
    var intf = cfg.interfaces[0]

    // Retrieve endpoints.
    const usbEpIn = intf.alternate.endpoints.find(usb_ep_in_lambda);
    const usbEpOut = intf.alternate.endpoints.find(usb_ep_out_lambda);

    if ((!usbEpIn) || (!usbEpOut)) {
        console.error('Invalid endpoint addresses!')
        await usbDev.forget();
        throw new Error();
    }

    // Reset device.
    await usbDev.open()
    await usbDev.reset()
    await usbDev.claimInterface(intf.interfaceNumber)

    // Save endpoint max packet size and USB version.
    NXDT.STATE.USB.DEVICE = usbDev;
    NXDT.STATE.USB.ENDPOINT.IN = usbEpIn.endpointNumber;
    NXDT.STATE.USB.ENDPOINT.OUT = usbEpOut.endpointNumber;
    NXDT.STATE.USB.ENDPOINT.PACKET_SIZE = usbEpIn.packetSize
    NXDT.STATE.USB.VERSION.MAJOR = usbDev.usbVersionMajor
    NXDT.STATE.USB.VERSION.MINOR = usbDev.usbVersionMinor

    console.debug(`Max packet size: ${NXDT.STATE.USB.ENDPOINT.PACKET_SIZE}`)

    console.debug('Successfully retrieved USB endpoints!')

    return true
}

async function dstHandler() {
    NXDT.STATE.TRANSFER.DST = null

    try {
        NXDT.STATE.TRANSFER.DST = await window.showDirectoryPicker({mode: "readwrite"})
    } catch (e) {
        console.error('Fatal error ocurred while selecting output directory.')
        return false
    }

    directory_button.querySelector(".value").innerText = NXDT.STATE.TRANSFER.DST.name;
    console.debug('Successfully selected output directory!')
}


const connect_button = document.getElementById("src");
const directory_button = document.getElementById("dst");
const notify_button = document.getElementById("notify");
const transfer_dialog = document.getElementById("transfer");
const browser_dialog = document.getElementById("browser");


async function usbRequestDevice() {
    try {
        // Find a connected USB device with a matching VID/PID pair.
        usbDev = await navigator.usb.requestDevice({ filters: [{ vendorId: NXDT.CONSTANT.DEVICE.vendorId, productId: NXDT.CONSTANT.DEVICE.productId }] });
    } catch (e) {
        return false
    }

    await usbSetupDevice(usbDev);

    await usbCommandHandler();
}

async function usbReconnect(event) {
    if (NXDT.STATE.USB.DEVICE) return;
    await usbSetupDevice(event.device);

    await usbCommandHandler();
}

async function usbEnumerate() {
    var dev
    for (dev of (await navigator.usb.getDevices())) {
        try {
            await usbSetupDevice(dev);
        } catch (e) {
            continue
        }
        break
    }
    if (!NXDT.STATE.USB.DEVICE) return;
    await usbCommandHandler();
    
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
/*
const pack = (format, ...values) => struct(format).pack(...values)
const unpack = (format, buffer) => struct(format).unpack(buffer)
const pack_into = (format, arrb, offs, ...values) =>
    struct(format).pack_into(arrb, offs, ...values)
const unpack_from = (format, arrb, offset) =>
    struct(format).unpack_from(arrb, offset)
const iter_unpack = (format, arrb) => struct(format).iter_unpack(arrb)
const calcsize = format => struct(format).size
module.exports = {
    struct, pack, unpack, pack_into, unpack_from, iter_unpack, calcsize }
*/

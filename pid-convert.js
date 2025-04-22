#!/usr/bin/env node

const { toChecksumAddress } = require('ethereum-checksum-address')

// Converts a PalletId into an AccountId20
function convert() {
    if (process.argv.length === 2) {
        console.error("Please provide a PalletId. e.g. 'pid-convert txfeepot'");
        process.exit(1);
    } else if (process.argv.length > 3) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const palletId = process.argv[2];
    if (palletId.length !== 8) {
        console.error("PalletId must be 8 characters long");
        process.exit(1);
    }

    // Insert 'modl' prefix, convert to hex and pad with 0's
    const palletIdBytes = Buffer.from('modl' + palletId, 'utf8');
    const palletIdHex = '0x' + palletIdBytes.toString('hex').padEnd(40, '0');
    console.log(`AccountId for ${palletId}: ` + toChecksumAddress(palletIdHex));
}

convert()

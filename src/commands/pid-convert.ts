import { toChecksumAddress } from 'ethereum-checksum-address';

export function pidConvert(args: string[]): void {
    if (args.length === 0) {
        console.error("Please provide a PalletId. e.g. 'trn-cli pid-convert txfeepot'");
        process.exit(1);
    } else if (args.length > 1) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const palletId: string = args[0];
    if (palletId.length !== 8) {
        console.error("PalletId must be 8 characters long");
        process.exit(1);
    }

    // Insert 'modl' prefix, convert to hex and pad with 0's
    const palletIdBytes: Buffer = Buffer.from('modl' + palletId, 'utf8');
    const palletIdHex: string = '0x' + palletIdBytes.toString('hex').padEnd(40, '0');
    console.log(`AccountId for ${palletId}: ` + toChecksumAddress(palletIdHex));
} 
import { toChecksumAddress } from 'ethereum-checksum-address';

export function assetToEvm(args: string[]): void {
    if (args.length === 0) {
        console.error("Please provide an asset ID. e.g. 'trn asset-to-evm 1'");
        process.exit(1);
    } else if (args.length > 1) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const assetIdInput = args[0];
    const assetId = Number(assetIdInput);
    
    if (isNaN(assetId) || assetId < 0) {
        console.error("Asset ID must be a valid non-negative number");
        process.exit(1);
    }

    const asset_id_hex = assetId.toString(16).padStart(8, "0");
    const contractAddress = toChecksumAddress(`0xCCCCCCCC${asset_id_hex}000000000000000000000000`);
    
    console.log(`ERC20 contract address for asset ${assetId}: ${contractAddress}`);
} 
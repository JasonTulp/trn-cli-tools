import { toChecksumAddress } from 'ethereum-checksum-address';

export function dexPoolAddress(args: string[]): void {
    if (args.length < 2) {
        console.error("Please provide two asset IDs. e.g. 'trn dex-pool-address 1 2'");
        process.exit(1);
    } else if (args.length > 2) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const assetAInput = args[0];
    const assetBInput = args[1];
    const assetA = Number(assetAInput);
    const assetB = Number(assetBInput);
    
    if (isNaN(assetA) || assetA < 0) {
        console.error("Asset A must be a valid non-negative number");
        process.exit(1);
    }
    
    if (isNaN(assetB) || assetB < 0) {
        console.error("Asset B must be a valid non-negative number");
        process.exit(1);
    }

    const assetAHex = assetA.toString(16).padStart(8, "0");
    const assetBHex = assetB.toString(16).padStart(8, "0");

    let poolAddress: string;
    // lower asset id comes first
    if (assetA < assetB) {
        poolAddress = toChecksumAddress(`0xDdDddDdD${assetAHex}${assetBHex}0000000000000000`);
    } else {
        poolAddress = toChecksumAddress(`0xDdDddDdD${assetBHex}${assetAHex}0000000000000000`);
    }
    
    console.log(`DEX pool address for assets ${assetA} and ${assetB}: ${poolAddress}`);
} 
export function nftUuid(args: string[]): void {
    if (args.length === 0) {
        console.error("Please provide an NFT next ID. e.g. 'trn nft-uuid 1'");
        process.exit(1);
    } else if (args.length > 1) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const nextIdInput = args[0];
    const nextId = Number(nextIdInput);
    
    if (isNaN(nextId) || nextId < 0) {
        console.error("NFT next ID must be a valid non-negative number");
        process.exit(1);
    }

    const collectionUUID = (nextId << 10) | 100; // parachainId = 100
    
    console.log(`Collection UUID for NFT next ID ${nextId}: ${collectionUUID}`);
} 
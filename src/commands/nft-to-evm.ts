import { toChecksumAddress } from 'ethereum-checksum-address';

export function nftToEvm(args: string[]): void {
    if (args.length === 0) {
        console.error("Please provide a collection ID. e.g. 'trn nft-to-evm 1124'");
        process.exit(1);
    } else if (args.length > 1) {
        console.error("Too many arguments");
        process.exit(1);
    }

    const collectionIdInput = args[0];
    const collectionId = Number(collectionIdInput);
    
    if (isNaN(collectionId) || collectionId < 0) {
        console.error("Collection ID must be a valid non-negative number");
        process.exit(1);
    }

    const collection_id_hex = collectionId.toString(16).padStart(8, "0");
    const contractAddress = toChecksumAddress(`0xAAAAAAAA${collection_id_hex}000000000000000000000000`);
    
    console.log(`ERC721 contract address for collection ${collectionId}: ${contractAddress}`);
} 
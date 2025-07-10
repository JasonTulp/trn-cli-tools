#!/usr/bin/env node

import { pidConvert } from './commands/pid-convert';
import { remark } from './commands/remark';
import { stakingEvent } from './commands/staking-event';
import { assetToEvm } from './commands/asset-to-evm';
import { nftToEvm } from './commands/nft-to-evm';
import { sftToEvm } from './commands/sft-to-evm';
import { nftUuid } from './commands/nft-uuid';
import { dexPoolAddress } from './commands/dex-pool-address';

const COMMANDS = {
    'pid-convert': pidConvert,
    'remark': remark,
    'staking-event': stakingEvent,
    'asset-to-evm': assetToEvm,
    'nft-to-evm': nftToEvm,
    'sft-to-evm': sftToEvm,
    'nft-uuid': nftUuid,
    'dex-pool-address': dexPoolAddress,
} as const;

type CommandName = keyof typeof COMMANDS;

function showHelp(): void {
    console.log(`
Usage: trn <command> [options]

Available commands:
  pid-convert <palletId>                    Convert a PalletId into an AccountId20
  remark <message>                          Echo a message to the console
  staking-event <account> <start> <end>     Find staking ledger changes between blocks
  asset-to-evm <assetId>                 Convert asset ID to ERC20 contract address
  nft-to-evm <collectionId>                 Convert collection ID to ERC721 contract address
  sft-to-evm <collectionId>                 Convert collection ID to ERC1155 contract address
  nft-uuid <nextId>                         Convert NFT next ID to collection UUID
  dex-pool-address <assetA> <assetB>        Get DEX pool address for asset pair

Examples:
  trn pid-convert txfeepot
  trn remark hello
  trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987
  trn asset-to-evm 1124
  trn nft-to-evm 1124
  trn sft-to-evm 1124
  trn nft-uuid 12
  trn dex-pool-address 1 2

Options:
  -h, --help               Show this help message
  -v, --version            Show version information
`);
}

function showVersion(): void {
    const packageJson = require('../package.json');
    console.log(`trn v${packageJson.version}`);
}

function main(): void {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('Error: No command provided\n');
        showHelp();
        process.exit(1);
    }

    const [command, ...commandArgs] = args;

    // Handle global flags
    if (command === '-h' || command === '--help') {
        showHelp();
        return;
    }

    if (command === '-v' || command === '--version') {
        showVersion();
        return;
    }

    // Check if command exists
    if (!(command in COMMANDS)) {
        console.error(`Error: Unknown command '${command}'\n`);
        showHelp();
        process.exit(1);
    }

    // Execute the command
    try {
        COMMANDS[command as CommandName](commandArgs);
    } catch (error) {
        console.error(`Error executing command '${command}':`, error);
        process.exit(1);
    }
}

main(); 
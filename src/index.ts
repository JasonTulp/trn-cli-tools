#!/usr/bin/env node

import { pidConvert } from './commands/pid-convert';
import { remark } from './commands/remark';

const COMMANDS = {
    'pid-convert': pidConvert,
    'remark': remark,
} as const;

type CommandName = keyof typeof COMMANDS;

function showHelp(): void {
    console.log(`
Usage: trn <command> [options]

Available commands:
  pid-convert <palletId>    Convert a PalletId into an AccountId20
  remark <message>          Echo a message to the console

Examples:
  trn pid-convert txfeepot
  trn remark hello

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
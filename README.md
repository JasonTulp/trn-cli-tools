# TRN CLI Tools

A collection of CLI tools for TRN development.

## Installation

To install globally run:
```bash
sudo pnpm install -g
```

## Usage

```bash
trn-cli <command> [options]
```

### Available Commands

#### pid-convert
Convert a PalletId into an AccountId20:
```bash
trn-cli pid-convert txfeepot
```

#### remark
Echo a message to the console:
```bash
trn-cli remark hello world
```

### Global Options

- `-h, --help` - Show help message
- `-v, --version` - Show version information

## Adding New Commands

To add a new command:

1. Create a new file in `src/commands/your-command.ts`
2. Export a function that takes `args: string[]` as parameter
3. Add your command to the `COMMANDS` object in `src/index.ts`
4. Update the help text in `src/index.ts`

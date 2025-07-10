# TRN CLI Tools

A collection of CLI tools for TRN development.

## Installation

To install globally run:
```bash
pnpm run build
sudo npm install -g
```

## Usage

```bash
trn <command> [options]
```

### Available Commands

#### pid-convert
Convert a PalletId into an AccountId20:
```bash
trn pid-convert txfeepot
```

#### remark
Echo a message to the console:
```bash
trn remark hello world
```

#### staking-event
Find staking ledger changes between two blocks for a given account:
```bash
trn staking-event <account> <startBlock> <endBlock> [options]
```

**Arguments:**
- `account` - The account address to check (e.g., 0xffffffff0000000000000000000000000016cd23)
- `startBlock` - The starting block number
- `endBlock` - The ending block number

**Options:**
- `--auto-upload` - Automatically upload to MongoDB without prompting
- `--dry-run` - Show the result without uploading to MongoDB
- `-h, --help` - Show help message for the command

**Examples:**
```bash
# Basic usage
trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987

# Auto-upload to MongoDB
trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987 --auto-upload

# Dry run (no upload)
trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987 --dry-run
```

**Environment Variables:**
- `MONGODB_CONNECTION_STRING` - Required for uploading results to MongoDB

#### asset-to-evm
Convert an asset ID to its ERC20 contract address:
```bash
trn asset-to-evm <assetId>
```

**Arguments:**
- `assetId` - The asset ID to convert (e.g., 1124)

**Examples:**
```bash
trn asset-to-evm 1124
```

#### nft-to-evm
Convert a collection ID to its ERC721 contract address:
```bash
trn nft-to-evm <collectionId>
```

**Arguments:**
- `collectionId` - The collection ID to convert (e.g., 1124)

**Examples:**
```bash
trn nft-to-evm 1124
```

#### sft-to-evm
Convert a collection ID to its ERC1155 contract address:
```bash
trn sft-to-evm <collectionId>
```

**Arguments:**
- `collectionId` - The collection ID to convert (e.g., 1124)

**Examples:**
```bash
trn sft-to-evm 1124
```

#### nft-uuid
Convert an NFT next ID to its collection UUID:
```bash
trn nft-uuid <nextId>
```

**Arguments:**
- `nextId` - The NFT next ID to convert (e.g., 12)

**Examples:**
```bash
trn nft-uuid 12
```

#### dex-pool-address
Get the DEX pool address for a pair of assets:
```bash
trn dex-pool-address <assetA> <assetB>
```

**Arguments:**
- `assetA` - The first asset ID
- `assetB` - The second asset ID

**Examples:**
```bash
trn dex-pool-address 1 2
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
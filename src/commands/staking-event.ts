import {withRootApi} from "../utils";
import {ApiPromise} from "@polkadot/api";
import {HexString} from "@polkadot/util/types";
import type { StakingLedger } from '@polkadot/types/interfaces/staking';
import { getAddress } from "ethers";
import * as readline from 'readline';
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import pino from 'pino';
import {Option} from "@polkadot/types";

config();

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: false,
            ignore: 'pid,hostname,time'
        }
    }
});

type StakeEvent = {
    type: "bonded" | "unbonded" | "rebonded" | "withdrawn";
    account: string;
    blockNumber: number;
    amount: string;
    manualEntry: boolean;
    createdAt: Date,
    updatedAt: Date,
};

// Query staking.ledger at a specific block
async function getStakingLedgerAt(api: ApiPromise, account: HexString, blockNumber: number) {
    // console.log("Getting staking ledger...");
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const apiAt = await api.at(blockHash);
    // @ts-ignore
    const ledgerOpt: Option<StakingLedger> = await apiAt.query.staking.ledger(account);
    // console.log(`Finding block: ${blockNumber} hash: ${blockHash.toHex()} account: ${account} ledgerOpt: ${ledgerOpt.isSome ? "found" : "not found"}`);
    return ledgerOpt.isSome ? ledgerOpt.unwrap() as StakingLedger : null;
}

// Binary search to find where staking.ledger changes
async function findLedgerChangeBlock(
    api: ApiPromise,
    account: HexString,
    startBlock: number,
    endBlock: number
): Promise<StakeEvent | null> {
    const ledgerStart = await getStakingLedgerAt(api, account, startBlock);
    const ledgerEnd = await getStakingLedgerAt(api, account, endBlock);

    if (!ledgerStart || !ledgerEnd || !ledgerStart.total || !ledgerEnd.total || !ledgerStart.active || !ledgerEnd.active) {
        console.error("Ledger data not found for the specified blocks.");
        return null;
    }

    logger.info({
        block: startBlock,
        total: ledgerStart.total.toString(),
        active: ledgerStart.active.toString()
    }, `Checking staking.ledger at start block ${startBlock}`);

    let transactionType: "bonded" | "unbonded" | "rebonded" | "withdrawn" = "bonded";
    const ledgerEndTotal = ledgerEnd.total.toBn();
    const ledgerStartTotal = ledgerStart.total.toBn();
    const ledgerEndActive = ledgerEnd.active.toBn();
    const ledgerStartActive = ledgerStart.active.toBn();

    logger.info({
        block: endBlock,
        total: ledgerEnd.total.toString(),
        active: ledgerEnd.active.toString()
    }, `Checking staking.ledger at end block ${endBlock}`);
    // Log active difference and total difference
    logger.info({
        totalDifference: ledgerEndTotal.sub(ledgerStartTotal).toString(),
        activeDifference: ledgerEndActive.sub(ledgerStartActive).toString()
    }, `Staking ledger differences between blocks ${startBlock} and ${endBlock}`);

    if (ledgerEndTotal > ledgerStartTotal) {
        if (ledgerEndActive > ledgerStartActive) {
            transactionType = "bonded";
        } else {
            transactionType = "rebonded";
        }
    } else if (ledgerEndTotal < ledgerStartTotal) {
        // total is less so some was withdrawn
        transactionType = "withdrawn";
    } else {
        // total is equal, must be unbonded
        transactionType = "unbonded";
    }

    if (JSON.stringify(ledgerStart) === JSON.stringify(ledgerEnd)) {
        console.log("No change in staking.ledger between the given blocks.");
        return null;
    }

    let left = startBlock;
    let right = endBlock;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        const ledgerMid = await getStakingLedgerAt(api, account, mid);

        if (JSON.stringify(ledgerMid) === JSON.stringify(ledgerStart)) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    const now = new Date();
    return {
        type: transactionType,
        account: account,
        blockNumber: left,
        amount: ledgerEndTotal.sub(ledgerStartTotal).toString(),
        manualEntry: true,
        createdAt: now,
        updatedAt: now,
    };
}

// Upload the entry to the MongoDB database
async function uploadToMongoDB(stakeEvent: StakeEvent) {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;

    if (!connectionString) {
        throw new Error("MONGODB_CONNECTION_STRING environment variable is not set");
    }

    const client = new MongoClient(connectionString);

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("trn-staking-mainnet");
        const collection = db.collection("transactions");

        const result = await collection.insertOne(stakeEvent);
        console.log("✅ Successfully uploaded to MongoDB:", result.insertedId);

        return result;
    } catch (error) {
        console.error("❌ Error uploading to MongoDB:", error);
        throw error;
    } finally {
        await client.close();
    }
}

function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

function showStakingEventHelp(): void {
    console.log(`
Usage: trn staking-event <account> <startBlock> <endBlock> [options]

Find staking ledger changes between two blocks for a given account.

Arguments:
  account       The account address to check (e.g., 0xffffffff0000000000000000000000000016cd23)
  startBlock    The starting block number
  endBlock      The ending block number

Options:
  --auto-upload    Automatically upload to MongoDB without prompting
  --dry-run        Show the result without uploading to MongoDB
  -h, --help       Show this help message

Examples:
  trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987
  trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987 --auto-upload
  trn staking-event 0xffffffff0000000000000000000000000016cd23 21694991 21733987 --dry-run
`);
}

export function stakingEvent(args: string[]): void {
    // Handle help flag
    if (args.includes('-h') || args.includes('--help')) {
        showStakingEventHelp();
        return;
    }

    // Validate arguments
    if (args.length < 3) {
        console.error("Error: Missing required arguments\n");
        showStakingEventHelp();
        process.exit(1);
    }

    const [accountArg, startBlockArg, endBlockArg, ...flags] = args;

    // Validate account address
    let account: HexString;
    try {
        account = getAddress(accountArg) as HexString;
    } catch (error) {
        console.error(`Error: Invalid account address '${accountArg}'`);
        process.exit(1);
    }

    // Validate block numbers
    const startBlock = parseInt(startBlockArg, 10);
    const endBlock = parseInt(endBlockArg, 10);

    if (isNaN(startBlock) || isNaN(endBlock)) {
        console.error("Error: Block numbers must be valid integers");
        process.exit(1);
    }

    if (startBlock >= endBlock) {
        console.error("Error: Start block must be less than end block");
        process.exit(1);
    }

    if (startBlock < 0 || endBlock < 0) {
        console.error("Error: Block numbers must be positive");
        process.exit(1);
    }

    // Parse flags
    const autoUpload = flags.includes('--auto-upload');
    const dryRun = flags.includes('--dry-run');

    if (autoUpload && dryRun) {
        console.error("Error: Cannot use both --auto-upload and --dry-run flags");
        process.exit(1);
    }

    logger.info(`Checking staking.ledger for account: ${account} from block ${startBlock} to ${endBlock}`);

    // Execute the main logic
    withRootApi("root", async (api: ApiPromise, signer: any) => {
        try {
            const stakeEvent = await findLedgerChangeBlock(api, account, startBlock, endBlock);

            if (stakeEvent !== null) {
                console.log(`\n\nstaking.ledger missing record:`);
                console.log(stakeEvent);

                if (dryRun) {
                    console.log("\n🔍 Dry run complete - no data uploaded");
                    return;
                }

                let shouldUpload = autoUpload;
                if (!autoUpload) {
                    const answer = await promptUser("\nDo you want to upload this record to MongoDB? (y/n): ");
                    shouldUpload = answer === 'y' || answer === 'yes';
                }

                if (shouldUpload) {
                    try {
                        await uploadToMongoDB(stakeEvent);
                        console.log("🎉 Record successfully uploaded to database!");
                    } catch (error) {
                        console.error("Failed to upload record to database:", error);
                        process.exit(1);
                    }
                } else {
                    console.log("Upload cancelled.");
                }
            } else {
                console.log("No change detected in the specified range.");
            }
        } catch (error) {
            console.error("Error processing staking event:", error);
            process.exit(1);
        }
    }).then(() => {
        console.log("\n==== Complete");
    }).catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
}

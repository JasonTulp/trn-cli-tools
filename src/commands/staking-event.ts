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

// Find all staking ledger changes between blocks
async function findAllLedgerChanges(
    api: ApiPromise,
    account: HexString,
    startBlock: number,
    endBlock: number
): Promise<StakeEvent[]> {
    const events: StakeEvent[] = [];
    
    const ledgerStart = await getStakingLedgerAt(api, account, startBlock);
    const ledgerEnd = await getStakingLedgerAt(api, account, endBlock);

    if (!ledgerStart || !ledgerEnd || !ledgerStart.total || !ledgerEnd.total || !ledgerStart.active || !ledgerEnd.active) {
        console.error("Ledger data not found for the specified blocks.");
        return [];
    }

    logger.info({
        block: startBlock,
        total: ledgerStart.total.toString(),
        active: ledgerStart.active.toString(),
    }, `Checking staking.ledger at start block ${startBlock}`);

    logger.info({
        block: endBlock,
        total: ledgerEnd.total.toString(),
        active: ledgerEnd.active.toString()
    }, `Checking staking.ledger at end block ${endBlock}`);

    if (JSON.stringify(ledgerStart) === JSON.stringify(ledgerEnd)) {
        console.log("No change in staking.ledger between the given blocks.");
        return [];
    }

    // Find all change points recursively
    await findChangePointsRecursively(api, account, startBlock, endBlock, events);
    
    return events;
}

// Recursively find all change points in the range
async function findChangePointsRecursively(
    api: ApiPromise,
    account: HexString,
    startBlock: number,
    endBlock: number,
    events: StakeEvent[]
): Promise<void> {
    if (startBlock >= endBlock) {
        return;
    }

    const ledgerStart = await getStakingLedgerAt(api, account, startBlock);
    const ledgerEnd = await getStakingLedgerAt(api, account, endBlock);

    if (!ledgerStart || !ledgerEnd) {
        return;
    }

    // If no change in this range, return
    if (JSON.stringify(ledgerStart) === JSON.stringify(ledgerEnd)) {
        return;
    }

    // Binary search to find the first change point
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

    const changeBlock = left;
    const ledgerAtChange = await getStakingLedgerAt(api, account, changeBlock);
    
    if (!ledgerAtChange) {
        return;
    }

    // Determine transaction type and amount for this specific change
    const ledgerChangeTotal = ledgerAtChange.total.toBn();
    const ledgerStartTotal = ledgerStart.total.toBn();
    const ledgerChangeActive = ledgerAtChange.active.toBn();
    const ledgerStartActive = ledgerStart.active.toBn();

    let transactionType: "bonded" | "unbonded" | "rebonded" | "withdrawn" = "bonded";
    let amount = "0";
    // Log active difference and total difference
    logger.info({
        totalDifference: ledgerChangeTotal.sub(ledgerStartTotal).toString(),
        activeDifference: ledgerChangeActive.sub(ledgerStartActive).toString()
    }, `Staking ledger differences between blocks ${startBlock} and ${endBlock}`);


    if (ledgerChangeTotal.gt(ledgerStartTotal)) {
        amount = ledgerChangeTotal.sub(ledgerStartTotal).toString();
        if (ledgerChangeActive.gt(ledgerStartActive)) {
            transactionType = "bonded";
        } else {
            transactionType = "rebonded";
        }
    } else if (ledgerChangeTotal.lt(ledgerStartTotal)) {
        amount = ledgerStartTotal.sub(ledgerChangeTotal).toString();
        transactionType = "withdrawn";
    } else {
        // total is equal, must be unbonded
        amount = ledgerStartActive.sub(ledgerChangeActive).toString();
        transactionType = "unbonded";
    }

    logger.info({
        changeBlock,
        type: transactionType,
        amount,
        totalBefore: ledgerStartTotal.toString(),
        totalAfter: ledgerChangeTotal.toString(),
        activeBefore: ledgerStartActive.toString(),
        activeAfter: ledgerChangeActive.toString()
    }, `Found staking change at block ${changeBlock}`);

    const now = new Date();
    events.push({
        type: transactionType,
        account: account,
        blockNumber: changeBlock,
        amount: amount,
        manualEntry: true,
        createdAt: now,
        updatedAt: now,
    });

    // Recursively find more changes in the remaining range
    await findChangePointsRecursively(api, account, changeBlock, endBlock, events);
}

// Check if a record already exists in MongoDB
async function checkRecordExists(stakeEvent: StakeEvent): Promise<boolean> {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;

    if (!connectionString) {
        throw new Error("MONGODB_CONNECTION_STRING environment variable is not set");
    }

    const client = new MongoClient(connectionString);

    try {
        await client.connect();
        const db = client.db("trn-staking-mainnet");
        const collection = db.collection("transactions");

        const existingRecord = await collection.findOne({
            account: stakeEvent.account,
            blockNumber: stakeEvent.blockNumber,
            amount: stakeEvent.amount
        });

        return existingRecord !== null;
    } catch (error) {
        console.error("❌ Error checking record existence:", error);
        throw error;
    } finally {
        await client.close();
    }
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
            const stakeEvents = await findAllLedgerChanges(api, account, startBlock, endBlock);

            if (stakeEvents.length > 0) {
                console.log(`\n\nFound ${stakeEvents.length} staking.ledger change(s):`);
                stakeEvents.forEach((event, index) => {
                    console.log(`\nEvent ${index + 1}:`);
                    console.log(event);
                });

                if (dryRun) {
                    console.log("\n🔍 Dry run complete - no data uploaded");
                    return;
                }

                let shouldUpload = autoUpload;
                if (!autoUpload) {
                    const answer = await promptUser(`\nDo you want to upload these ${stakeEvents.length} record(s) to MongoDB? (y/n): `);
                    shouldUpload = answer === 'y' || answer === 'yes';
                }

                if (shouldUpload) {
                    try {
                        let uploadedCount = 0;
                        let skippedCount = 0;
                        
                        for (const [index, event] of stakeEvents.entries()) {
                            const exists = await checkRecordExists(event);
                            
                            if (exists) {
                                console.log(`⚠️  Event ${index + 1}/${stakeEvents.length} already exists in database (account: ${event.account}, block: ${event.blockNumber}, amount: ${event.amount}) - skipping`);
                                skippedCount++;
                            } else {
                                await uploadToMongoDB(event);
                                console.log(`✅ Successfully uploaded event ${index + 1}/${stakeEvents.length} to MongoDB`);
                                uploadedCount++;
                            }
                        }
                        
                        console.log(`🎉 Upload complete! ${uploadedCount} new record(s) uploaded, ${skippedCount} duplicate(s) skipped.`);
                    } catch (error) {
                        console.error("❌ Error uploading to MongoDB:", error);
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

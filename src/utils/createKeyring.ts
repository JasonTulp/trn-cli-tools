import { Keyring } from "@polkadot/keyring";
import { hexToU8a } from "@polkadot/util";
import {config} from "dotenv";
config();

export type Signer = ReturnType<InstanceType<typeof Keyring>["addFromSeed"]>;

export function createKeyring(): Signer {
	const keyring = new Keyring({ type: "ethereum" });
	const seedU8a = hexToU8a(process.env.CALLER_PRIVATE_KEY);
	return keyring.addFromSeed(seedU8a);
}

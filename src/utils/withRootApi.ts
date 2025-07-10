import type { ApiPromise } from "@polkadot/api";
import type { NetworkName } from "@therootnetwork/api";

import { createKeyring, getRootApi, type Signer } from "./";

export async function withRootApi(
	network: NetworkName | "local",
	callback: (api: ApiPromise, signer: Signer) => Promise<void>
) {
	const [api, signer] = await Promise.all([getRootApi(network), createKeyring()]);

	try {
		await callback(api, signer);
	} catch (error) {
		console.error(error);
		await api.disconnect();
	}

	await api.disconnect();
}

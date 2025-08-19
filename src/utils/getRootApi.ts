import { ApiPromise } from "@polkadot/api";
import {
	getApiOptions,
	getLocalProvider,
	getPublicProvider,
	type NetworkName,
} from "@therootnetwork/api";
import "@therootnetwork/api-types";

export async function getRootApi(name: NetworkName | "local") {
	console.log("Network: ", name);
	const api = await ApiPromise.create({
		noInitWarn: true,
		...getApiOptions(),
		...(name === "local" ? getLocalProvider() : getPublicProvider(name,  true, true)),
	});

	return api;
}

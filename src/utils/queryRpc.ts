import type { ApiPromise } from "@polkadot/api";
import assert from "assert";

export async function queryRpc(
	api: ApiPromise,
	pallet: string,
	method: string,
	args: Array<unknown>
) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rpc = api.rpc as any;
	assert(rpc[pallet][method], `api.rpc.${pallet}.${method} does not exist`);

	return (await rpc[pallet][method](...args)).toJSON();
}

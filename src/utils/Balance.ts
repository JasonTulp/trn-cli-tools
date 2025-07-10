import type { AnyNumber } from "@polkadot/types/types";
import BigNumber from "bignumber.js";

type Value = BigNumber.Value | AnyNumber | bigint;

export class Balance<T extends { decimals: number }> extends BigNumber {
	asset: T;

	constructor(value: Value, asset: T) {
		super(value instanceof BigInt ? value.toString() : (value as BigNumber.Value));
		this.asset = asset;
	}

	toUnit(): Balance<T> {
		return this.dividedBy(new BigNumber(10).pow(this.asset.decimals));
	}

	toPlanck(): Balance<T> {
		return this.multipliedBy(new BigNumber(10).pow(this.asset.decimals)).integerValue();
	}

	toPlanckString(): string {
		return this.toPlanck().toNumber().toLocaleString("fullwide", { useGrouping: false });
	}

	override plus(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.plus(n, base), this.asset);
	}

	override minus(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.minus(n, base), this.asset);
	}

	override multipliedBy(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.multipliedBy(n, base), this.asset);
	}

	override dividedBy(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.dividedBy(n, base), this.asset);
	}

	override integerValue(rm?: BigNumber.RoundingMode | undefined): Balance<T> {
		return new Balance(super.integerValue(rm), this.asset);
	}
}

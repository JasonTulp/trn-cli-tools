export function mergeAndDedupeArrays<T>(...args: Array<Array<T>>): Array<T> {
	const allValues = args.reduce((values, arr: Array<T>) => values.concat(...arr));

	return Array.from(allValues.reduce((set, item) => set.add(item), new Set<T>()).values());
}

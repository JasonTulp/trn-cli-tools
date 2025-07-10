export async function executeGraphQuery(
	endpoint: string,
	query: string,
	variables?: Record<string, unknown>,
	accessToken?: string
) {
	const fetchResponse = await fetch(endpoint, {
		method: "POST",
		body: JSON.stringify({
			query,
			variables,
		}),
		...(accessToken && {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}),
	});

	const data = await fetchResponse.json();

	return data;
}

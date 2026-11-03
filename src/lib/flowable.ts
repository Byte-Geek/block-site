const TIMEOUT_MS = 15_000;

function config() {
	const base = process.env.FLOWABLE_URL;
	const user = process.env.FLOWABLE_USER;
	const password = process.env.FLOWABLE_PASSWORD;
	if (!base || !user || !password)
		throw new Error(
			"Lipsesc variabilele FLOWABLE_URL, FLOWABLE_USER sau FLOWABLE_PASSWORD",
		);
	return {
		base,
		auth: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
	};
}

export async function flowable(path: string, method = "GET", body?: unknown) {
	const { base, auth } = config();
	const res = await fetch(`${base}/service${path}`, {
		method,
		headers: { Authorization: auth, "Content-Type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
		cache: "no-store",
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok)
		throw new Error(
			`Flowable ${method} ${path} -> ${res.status} ${await res.text()}`,
		);
	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

export async function flowableDeploy(xml: string) {
	const { base, auth } = config();
	const body = new FormData();
	body.append(
		"file",
		new Blob([xml], { type: "text/xml" }),
		"process.bpmn20.xml",
	);
	const res = await fetch(`${base}/service/repository/deployments`, {
		method: "POST",
		headers: { Authorization: auth },
		body,
		cache: "no-store",
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	if (!res.ok)
		throw new Error(`Flowable deploy -> ${res.status} ${await res.text()}`);
	return (await res.json()) as { id: string };
}

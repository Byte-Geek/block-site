const TIMEOUT_MS = 15_000;

export class FlowableError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
	}
}

export function ignoreFlowableStatus(...statuses: number[]) {
	return (error: unknown) => {
		if (!(error instanceof FlowableError && statuses.includes(error.status)))
			throw error;
	};
}

function connection() {
	const base = process.env.FLOWABLE_URL;
	const user = process.env.FLOWABLE_USER;
	const password = process.env.FLOWABLE_PASSWORD;
	if (!base || !user || !password)
		throw new Error(
			"Lipsesc variabilele FLOWABLE_URL, FLOWABLE_USER sau FLOWABLE_PASSWORD",
		);
	return {
		base,
		authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`,
	};
}

async function send(path: string, init: RequestInit, label: string) {
	const { base, authorization } = connection();
	const res = await fetch(`${base}/service${path}`, {
		...init,
		headers: { Authorization: authorization, ...init.headers },
		cache: "no-store",
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
	const text = await res.text();
	if (!res.ok)
		throw new FlowableError(
			`Flowable ${label} -> ${res.status} ${text}`,
			res.status,
		);
	return text ? JSON.parse(text) : null;
}

export function flowableRequest(path: string, method = "GET", body?: unknown) {
	return send(
		path,
		{
			method,
			headers: { "Content-Type": "application/json" },
			body: body ? JSON.stringify(body) : undefined,
		},
		`${method} ${path}`,
	);
}

export function deployProcessDefinition(xml: string): Promise<{ id: string }> {
	const body = new FormData();
	body.append(
		"file",
		new Blob([xml], { type: "text/xml" }),
		"process.bpmn20.xml",
	);
	return send("/repository/deployments", { method: "POST", body }, "deploy");
}

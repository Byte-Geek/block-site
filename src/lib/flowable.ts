const base = process.env.FLOWABLE_URL!;
const authHeader =
	"Basic " +
	Buffer.from(
		`${process.env.FLOWABLE_USER}:${process.env.FLOWABLE_PASSWORD}`,
	).toString("base64");

export async function flowable(path: string, method = "GET", body?: unknown) {
	const res = await fetch(`${base}/service${path}`, {
		method,
		headers: {
			Authorization: authHeader,
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
		cache: "no-store",
	});
	if (!res.ok)
		throw new Error(
			`Flowable ${method} ${path} -> ${res.status} ${await res.text()}`,
		);
	const text = await res.text();
	return text ? JSON.parse(text) : null;
}

export async function flowableDeploy(xml: string) {
	const body = new FormData();
	body.append(
		"file",
		new Blob([xml], { type: "text/xml" }),
		"process.bpmn20.xml",
	);
	const res = await fetch(`${base}/service/repository/deployments`, {
		method: "POST",
		headers: { Authorization: authHeader },
		body,
		cache: "no-store",
	});
	if (!res.ok)
		throw new Error(`Flowable deploy -> ${res.status} ${await res.text()}`);
	return (await res.json()) as { id: string };
}

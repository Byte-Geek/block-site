import { prisma } from "@/lib/prisma";
import { flowable } from "@/lib/flowable";

type User = { id: string; role?: string | null; group: string | null };

export type FlowTask = {
	id: string;
	name: string;
	assignee: string | null;
	processInstanceId: string;
	taskDefinitionKey: string;
};

const enc = encodeURIComponent;

async function queryTasks(query: string) {
	const res = (await flowable(`/runtime/tasks?${query}&size=100`)) as {
		data: FlowTask[];
	};
	return res.data;
}

function candidateQuery(user: User) {
	return user.group === "isp"
		? `candidateUser=${enc(user.id)}`
		: `candidateGroup=${enc(user.group ?? "")}`;
}

export async function listTasksForUser(user: User) {
	if (!user.group || user.group === "initiator")
		return { mine: [] as FlowTask[], available: [] as FlowTask[] };

	const [mine, candidates] = await Promise.all([
		queryTasks(`assignee=${enc(user.id)}`),
		queryTasks(candidateQuery(user)),
	]);
	return { mine, available: candidates.filter((t) => !t.assignee) };
}

export async function getTaskForUser(taskId: string, user: User) {
	if (!user.group || user.group === "initiator") return null;

	let [task] = await queryTasks(
		`taskId=${enc(taskId)}&assignee=${enc(user.id)}`,
	);
	const mine = Boolean(task);
	if (!task) {
		const [candidate] = await queryTasks(
			`taskId=${enc(taskId)}&${candidateQuery(user)}`,
		);
		if (candidate && !candidate.assignee) task = candidate;
	}
	if (!task) return null;

	const c = await prisma.case.findUnique({
		where: { processInstanceId: task.processInstanceId },
	});
	if (!c) return null;

	return { task, c, mine };
}

export async function findInitiatorTask(processInstanceId: string) {
	const [task] = await queryTasks(
		`processInstanceId=${enc(processInstanceId)}&taskDefinitionKey=trimitere`,
	);
	return task ?? null;
}

export async function hasOpenTasks(userId: string) {
	const [assigned, candidate] = await Promise.all([
		queryTasks(`assignee=${enc(userId)}`),
		queryTasks(`taskDefinitionKey=ispTask&candidateUser=${enc(userId)}`),
	]);
	return assigned.length > 0 || candidate.length > 0;
}

export async function findOpenTask(
	user: User,
	processInstanceId: string | null,
) {
	if (!user.group || user.group === "initiator" || !processInstanceId)
		return null;

	try {
		const base = `processInstanceId=${enc(processInstanceId)}`;

		const [mine] = await queryTasks(`${base}&assignee=${enc(user.id)}`);
		if (mine) return { id: mine.id, name: mine.name, mine: true };

		const candidates = await queryTasks(`${base}&${candidateQuery(user)}`);
		const free = candidates.find((t) => !t.assignee);
		return free ? { id: free.id, name: free.name, mine: false } : null;
	} catch (e) {
		console.error("FIND OPEN TASK:", e);
		return null;
	}
}

export async function listCaseTasks(processInstanceId: string | null) {
	if (!processInstanceId) return [];

	try {
		const tasks = await queryTasks(
			`processInstanceId=${enc(processInstanceId)}`,
		);
		return await Promise.all(
			tasks.map(async (t) => {
				let candidateUser: string | null = null;
				if (!t.assignee && t.taskDefinitionKey === "ispTask") {
					const links = (await flowable(
						`/runtime/tasks/${enc(t.id)}/identitylinks`,
					).catch(() => [])) as {
						type: string;
						user: string | null;
					}[];
					candidateUser =
						links.find((l) => l.type === "candidate" && l.user)?.user ?? null;
				}
				return { ...t, candidateUser };
			}),
		);
	} catch (e) {
		console.error("LIST CASE TASKS:", e);
		return [];
	}
}

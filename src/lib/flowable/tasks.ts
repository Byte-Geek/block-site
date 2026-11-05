import { flowableRequest } from "@/lib/flowable/client";
import { taskKeys } from "@/lib/flowable/task-keys";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

type User = { id: string; role?: string | null };

export type FlowTask = {
	id: string;
	name: string;
	assignee: string | null;
	processInstanceId: string;
	taskDefinitionKey: string;
};

const enc = encodeURIComponent;

async function queryTasks(query: string) {
	const res = (await flowableRequest(`/runtime/tasks?${query}&size=100`)) as {
		data: FlowTask[];
	};
	return res.data;
}

function candidateQuery(user: User) {
	return can(user.role, "task", "execute")
		? `candidateUser=${enc(user.id)}`
		: `candidateGroup=${enc(user.role ?? "")}`;
}

const canWorkTasks = (user: User) => can(user.role, "task", "claim");

export function getTask(taskId: string): Promise<FlowTask> {
	return flowableRequest(`/runtime/tasks/${enc(taskId)}`);
}

export function completeTask(
	taskId: string,
	variables?: { name: string; value: string }[],
) {
	return flowableRequest(`/runtime/tasks/${enc(taskId)}`, "POST", {
		action: "complete",
		variables,
	});
}

export function assignTask(taskId: string, assignee: string | null) {
	return flowableRequest(`/runtime/tasks/${enc(taskId)}`, "POST", {
		action: "claim",
		assignee,
	});
}

export function listProcessTasks(processInstanceId: string) {
	return queryTasks(`processInstanceId=${enc(processInstanceId)}`);
}

export async function listTasksForUser(user: User) {
	if (!canWorkTasks(user))
		return { mine: [] as FlowTask[], available: [] as FlowTask[] };

	const [mine, candidates] = await Promise.all([
		queryTasks(`assignee=${enc(user.id)}`),
		queryTasks(candidateQuery(user)),
	]);
	return { mine, available: candidates.filter((t) => !t.assignee) };
}

export async function getTaskForUser(taskId: string, user: User) {
	if (!canWorkTasks(user)) return null;

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
		`processInstanceId=${enc(processInstanceId)}&taskDefinitionKey=${taskKeys.initiator}`,
	);
	return task ?? null;
}

export async function hasOpenTasks(userId: string) {
	const [assigned, candidate] = await Promise.all([
		queryTasks(`assignee=${enc(userId)}`),
		queryTasks(
			`taskDefinitionKey=${taskKeys.isp}&candidateUser=${enc(userId)}`,
		),
	]);
	return assigned.length > 0 || candidate.length > 0;
}

export async function findOpenTask(
	user: User,
	processInstanceId: string | null,
) {
	if (!canWorkTasks(user) || !processInstanceId) return null;

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
		const tasks = await listProcessTasks(processInstanceId);
		return await Promise.all(
			tasks.map(async (t) => {
				let candidateUser: string | null = null;
				if (!t.assignee && t.taskDefinitionKey === taskKeys.isp) {
					const links = (await flowableRequest(
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

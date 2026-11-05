import { flowableRequest } from "@/lib/flowable/client";
import { completeTask, listProcessTasks } from "@/lib/flowable/tasks";

const PROCESS_KEY = "blocareSiteuri";

export function deleteProcessInstance(id: string, reason?: string) {
	const query = reason ? `?deleteReason=${encodeURIComponent(reason)}` : "";
	return flowableRequest(
		`/runtime/process-instances/${encodeURIComponent(id)}${query}`,
		"DELETE",
	);
}

export async function startBlockingProcess(ispUserIds: string[]) {
	const instance = (await flowableRequest(
		"/runtime/process-instances",
		"POST",
		{
			processDefinitionKey: PROCESS_KEY,
			variables: [{ name: "ispUsers", type: "json", value: ispUserIds }],
		},
	)) as { id: string };

	try {
		const [submitTask] = await listProcessTasks(instance.id);
		await completeTask(submitTask.id);
	} catch (e) {
		await deleteProcessInstance(instance.id).catch(() => {});
		throw e;
	}
	return instance.id;
}

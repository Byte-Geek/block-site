import {
	finalIspStatuses,
	ispStatusLabels,
	ispTones,
	type Tone,
} from "@/lib/cases/constants";
import { taskKeys } from "@/lib/flowable/task-keys";
import { type Role, roleLabels } from "@/lib/rbac/permissions";

export type TimelineEvent = {
	id: string;
	at: Date;
	title: string;
	who: string;
	role: string;
	note?: string | null;
	tone: Tone | "primary";
};

export type TimelineBranch = {
	id: string;
	name: string;
	badge?: { tone: Tone; label: string };
	events: TimelineEvent[];
};

export type IspParticipant = {
	id: string;
	name: string;
	label: string;
	tone: Tone;
	done: boolean;
};

type Comment = {
	id: string;
	userId: string;
	stage: string;
	decision: string;
	text: string | null;
	createdAt: Date;
};

type IspResponse = {
	id: string;
	userId: string;
	status: string;
	reason: string | null;
	createdAt: Date;
};

type CaseTask = {
	taskDefinitionKey: string;
	assignee: string | null;
	candidateUser: string | null;
};

type CaseData = {
	id: string;
	createdAt: Date;
	createdById: string;
	fileName: string;
	domainCount: number;
	comments: Comment[];
	ispResponses: IspResponse[];
};

type NameOf = (userId: string) => string;

const byDate = (a: { at: Date }, b: { at: Date }) =>
	a.at.getTime() - b.at.getTime();

const commentEvents: Record<
	string,
	{ title: (role: string) => string; tone: TimelineEvent["tone"] }
> = {
	trimis: { title: () => "Inițiatorul a trimis lista", tone: "primary" },
	anulat: { title: () => "Inițiatorul a anulat cazul", tone: "slate" },
	retrimis: { title: () => "Inițiatorul a retrimis lista", tone: "amber" },
	preluat: { title: (role) => `${role} a preluat cazul`, tone: "slate" },
	eliberat: { title: (role) => `${role} a eliberat cazul`, tone: "slate" },
};

const ispEventTitles: Record<string, string> = {
	notificat: "Sarcină creată, ISP notificat",
	preluat: "A preluat sarcina",
	eliberat: "A eliberat sarcina",
};

export function latestRejection(comments: Comment[]) {
	return (
		[...comments]
			.filter((x) => x.decision === "nu")
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
	);
}

export function buildEvents(c: CaseData, nameOf: NameOf): TimelineEvent[] {
	const hasSent = c.comments.some((x) => x.decision === "trimis");
	const resubmitted = c.comments.some((x) => x.decision === "retrimis");

	const upload: TimelineEvent[] = hasSent
		? []
		: [
				{
					id: `upload-${c.id}`,
					at: c.createdAt,
					title: "Inițiatorul a încărcat lista",
					who: nameOf(c.createdById),
					role: "Inițiator",
					note: resubmitted ? null : `${c.fileName} · ${c.domainCount} domenii`,
					tone: "primary",
				},
			];

	const decisions = c.comments
		.filter((x) => x.stage !== "isp")
		.map((x): TimelineEvent => {
			const role = roleLabels[x.stage as Role];
			const known = commentEvents[x.decision];
			const approved = x.decision === "da";
			return {
				id: x.id,
				at: x.createdAt,
				title: known
					? known.title(role)
					: `${role} a ${approved ? "aprobat" : "respins"} lista`,
				who: nameOf(x.userId),
				role,
				note: x.text,
				tone: known ? known.tone : approved ? "green" : "red",
			};
		});

	return [...upload, ...decisions].sort(byDate);
}

export function buildIspParticipants(
	c: CaseData,
	tasks: CaseTask[],
	nameOf: NameOf,
): { items: IspParticipant[]; branches: TimelineBranch[] } {
	const ispComments = c.comments.filter((x) => x.stage === "isp");

	const latestResponse = new Map<string, IspResponse>();
	for (const r of [...c.ispResponses].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
	))
		latestResponse.set(r.userId, r);

	const ids = [
		...new Set([
			...ispComments.map((x) => x.userId),
			...c.ispResponses.map((x) => x.userId),
			...tasks
				.filter((t) => t.taskDefinitionKey === taskKeys.isp)
				.flatMap((t) => [t.assignee, t.candidateUser])
				.filter((v): v is string => Boolean(v)),
		]),
	].sort((a, b) => nameOf(a).localeCompare(nameOf(b), "ro"));

	const items = ids.map((id): IspParticipant => {
		const name = nameOf(id);
		const last = latestResponse.get(id);
		if (last)
			return {
				id,
				name,
				label: ispStatusLabels[last.status] ?? last.status,
				tone: ispTones[last.status] ?? "slate",
				done: finalIspStatuses.includes(last.status),
			};

		const claim = ispComments
			.filter(
				(x) =>
					x.userId === id &&
					(x.decision === "preluat" || x.decision === "eliberat"),
			)
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
		return claim?.decision === "preluat"
			? { id, name, label: "Preluat", tone: "blue", done: false }
			: { id, name, label: "În așteptare", tone: "amber", done: false };
	});

	const branches = items.map((item): TimelineBranch => {
		const events: TimelineEvent[] = [
			...ispComments
				.filter((x) => x.userId === item.id)
				.map(
					(x): TimelineEvent => ({
						id: x.id,
						at: x.createdAt,
						title: ispEventTitles[x.decision] ?? x.decision,
						who: item.name,
						role: "ISP",
						note: x.text,
						tone: x.decision === "notificat" ? "blue" : "slate",
					}),
				),
			...c.ispResponses
				.filter((x) => x.userId === item.id)
				.map(
					(x): TimelineEvent => ({
						id: x.id,
						at: x.createdAt,
						title: `Stare: ${ispStatusLabels[x.status] ?? x.status}`,
						who: item.name,
						role: "ISP",
						note: x.reason,
						tone: ispTones[x.status] ?? "slate",
					}),
				),
		].sort(byDate);

		return {
			id: item.id,
			name: item.name,
			badge: { tone: item.tone, label: item.label },
			events,
		};
	});

	return { items, branches };
}

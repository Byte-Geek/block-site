export const EDITABLE_STAGES = ["draft", "initiator"];

export const stageLabels: Record<string, string> = {
	initiator: "La inițiator",
	asp: "Validare ASP",
	anr: "Validare ANRCETI",
	isp: "Blocare ISP",
	closed: "Închis",
	draft: "Ciornă",
	cancelled: "Anulat",
};

export type Tone =
	| "slate"
	| "blue"
	| "violet"
	| "teal"
	| "amber"
	| "green"
	| "red";

export const stageTones: Record<string, Tone> = {
	initiator: "amber",
	asp: "blue",
	anr: "violet",
	isp: "teal",
	closed: "green",
	draft: "slate",
	cancelled: "slate",
};

export const ispStatuses = [
	"queued",
	"dispatched",
	"acknowledged",
	"completed",
	"partial_failure",
	"impossible",
];

export const finalIspStatuses = ["completed", "partial_failure", "impossible"];

export const ispStatusLabels: Record<string, string> = {
	queued: "În coadă",
	dispatched: "Trimis",
	acknowledged: "Confirmat",
	completed: "Finalizat",
	partial_failure: "Eșec parțial",
	impossible: "Imposibil de executat",
};

export const ispTones: Record<string, Tone> = {
	queued: "slate",
	dispatched: "blue",
	acknowledged: "violet",
	completed: "green",
	partial_failure: "amber",
	impossible: "red",
};

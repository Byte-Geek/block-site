export const stageLabels: Record<string, string> = {
	initiator: "La inițiator",
	asp: "Validare ASP",
	anr: "Validare ANRCETI",
	isp: "Blocare ISP",
	closed: "Închis",
	draft: "Ciornă",
	cancelled: "Anulat",
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

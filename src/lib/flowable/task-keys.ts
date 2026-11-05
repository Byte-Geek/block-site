export const taskKeys = {
	initiator: "trimitere",
	asp: "aspTask",
	anr: "anrTask",
	isp: "ispTask",
} as const;

export const stageByTaskKey: Record<string, string> = {
	[taskKeys.asp]: "asp",
	[taskKeys.anr]: "anr",
	[taskKeys.isp]: "isp",
};

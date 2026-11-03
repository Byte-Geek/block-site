import {
	CreateBucketCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const bucket = process.env.S3_BUCKET ?? "blocare-files";

const s3 = new S3Client({
	endpoint: process.env.S3_ENDPOINT,
	region: process.env.S3_REGION ?? "us-east-1",
	forcePathStyle: true,
	requestChecksumCalculation: "WHEN_REQUIRED",
	responseChecksumValidation: "WHEN_REQUIRED",
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY ?? "",
		secretAccessKey: process.env.S3_SECRET_KEY ?? "",
	},
});

let ready: Promise<unknown> | null = null;

// Creează bucket-ul la prima folosire, dacă nu există.
function ensureBucket() {
	if (!ready) {
		ready = s3
			.send(new HeadBucketCommand({ Bucket: bucket }))
			.catch(() => s3.send(new CreateBucketCommand({ Bucket: bucket })))
			.catch((e) => {
				ready = null;
				throw e;
			});
	}
	return ready;
}

export type StoredFile = {
	key: string;
	name: string;
	size: number;
	contentType: string;
};

export async function storeFile(
	file: File,
): Promise<{ data: StoredFile } | { error: string }> {
	if (file.size === 0) return { error: "Fișierul este gol" };
	if (file.size > MAX_FILE_SIZE) return { error: "Fișierul depășește 25 MB" };

	const key = `files/${crypto.randomUUID()}`;
	const contentType = file.type || "application/octet-stream";
	try {
		await ensureBucket();
		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: Buffer.from(await file.arrayBuffer()),
				ContentType: contentType,
			}),
		);
	} catch (e) {
		console.error("S3 PUT:", e);
		return {
			error: "Fișierul nu a putut fi salvat. Verifică dacă serverul de fișiere (S3) rulează.",
		};
	}
	return {
		data: {
			key,
			name: file.name.split(/[\\/]/).pop() || "fisier",
			size: file.size,
			contentType,
		},
	};
}

export async function getFile(key: string) {
	const res = await s3.send(
		new GetObjectCommand({ Bucket: bucket, Key: key }),
	);
	return res.Body?.transformToWebStream() ?? null;
}

export async function deleteFiles(keys: string[]) {
	await Promise.all(
		keys.map((Key) =>
			s3
				.send(new DeleteObjectCommand({ Bucket: bucket, Key }))
				.catch((e) => console.error("S3 DELETE:", e)),
		),
	);
}

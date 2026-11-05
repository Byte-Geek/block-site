import {
	CreateBucketCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutBucketCorsCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const MAX_FILE_SIZE = 25 * 1024 * 1024;

const bucket = process.env.S3_BUCKET ?? "blocare-files";

const config = {
	region: process.env.S3_REGION ?? "us-east-1",
	forcePathStyle: true,
	requestChecksumCalculation: "WHEN_REQUIRED",
	responseChecksumValidation: "WHEN_REQUIRED",
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY ?? "",
		secretAccessKey: process.env.S3_SECRET_KEY ?? "",
	},
} as const;

const s3 = new S3Client({ ...config, endpoint: process.env.S3_ENDPOINT });

const signer = new S3Client({
	...config,
	endpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
});

let ready: Promise<unknown> | null = null;

function ensureBucket() {
	if (!ready) {
		ready = s3
			.send(new HeadBucketCommand({ Bucket: bucket }))
			.catch(() => s3.send(new CreateBucketCommand({ Bucket: bucket })))
			.then(() =>
				s3
					.send(
						new PutBucketCorsCommand({
							Bucket: bucket,
							CORSConfiguration: {
								CORSRules: [
									{
										AllowedOrigins: [
											process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
										],
										AllowedMethods: ["PUT", "GET"],
										AllowedHeaders: ["*"],
										ExposeHeaders: ["ETag"],
										MaxAgeSeconds: 3000,
									},
								],
							},
						}),
					)
					.catch((e) => console.warn("S3 CORS:", e.message)),
			)
			.catch((e) => {
				ready = null;
				throw e;
			});
	}
	return ready;
}

export function cleanFileName(name: string) {
	return (name.split(/[\\/]/).pop() || "fisier").slice(0, 255);
}

export async function presignUpload(key: string) {
	await ensureBucket();
	return getSignedUrl(
		signer,
		new PutObjectCommand({ Bucket: bucket, Key: key }),
		{
			expiresIn: 300,
		},
	);
}

export function presignDownload(
	key: string,
	name: string,
	contentType: string,
) {
	return getSignedUrl(
		signer,
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			ResponseContentType: contentType,
			ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
		}),
		{ expiresIn: 60 },
	);
}

export async function objectSize(key: string) {
	try {
		const head = await s3.send(
			new HeadObjectCommand({ Bucket: bucket, Key: key }),
		);
		return head.ContentLength ?? null;
	} catch {
		return null;
	}
}

type StoredFile = {
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
			error:
				"Fișierul nu a putut fi salvat. Verifică dacă serverul de fișiere (S3) rulează.",
		};
	}
	return {
		data: { key, name: cleanFileName(file.name), size: file.size, contentType },
	};
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

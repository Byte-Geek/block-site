import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { contentTypeOf, sanitizeFileName } from "@/lib/storage/file-rules";
import { bucket, ensureBucket, rustfs } from "@/lib/storage/rustfs-client";

const SIGNATURE_BYTES = 1024;

export type StoredFile = {
	key: string;
	name: string;
	size: number;
	contentType: string;
};

export async function getObjectSize(key: string) {
	try {
		const head = await rustfs.send(
			new HeadObjectCommand({ Bucket: bucket, Key: key }),
		);
		return head.ContentLength ?? null;
	} catch {
		return null;
	}
}

export async function readObjectStart(key: string) {
	const object = await rustfs.send(
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			Range: `bytes=0-${SIGNATURE_BYTES - 1}`,
		}),
	);
	return (await object.Body?.transformToByteArray()) ?? new Uint8Array();
}

export async function storeListFile(
	file: File,
): Promise<{ data: StoredFile } | { error: string }> {
	const key = `files/${crypto.randomUUID()}`;
	const contentType = contentTypeOf(file.name);
	try {
		await ensureBucket();
		await rustfs.send(
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
		data: {
			key,
			name: sanitizeFileName(file.name),
			size: file.size,
			contentType,
		},
	};
}

export async function deleteObjects(keys: string[]) {
	await Promise.all(
		keys.map((Key) =>
			rustfs
				.send(new DeleteObjectCommand({ Bucket: bucket, Key }))
				.catch((e) => console.error("S3 DELETE:", e)),
		),
	);
}

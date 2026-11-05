import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, ensureBucket, rustfs } from "@/lib/storage/rustfs-client";

const UPLOAD_URL_SECONDS = 300;
const DOWNLOAD_URL_SECONDS = 60;

export async function createUploadUrl(key: string) {
	await ensureBucket();
	return getSignedUrl(
		rustfs,
		new PutObjectCommand({ Bucket: bucket, Key: key }),
		{ expiresIn: UPLOAD_URL_SECONDS },
	);
}

export function createDownloadUrl(
	key: string,
	fileName: string,
	contentType: string,
) {
	return getSignedUrl(
		rustfs,
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			ResponseContentType: contentType,
			ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
		}),
		{ expiresIn: DOWNLOAD_URL_SECONDS },
	);
}

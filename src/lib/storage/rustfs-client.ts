import {
	CreateBucketCommand,
	HeadBucketCommand,
	PutBucketCorsCommand,
	S3Client,
} from "@aws-sdk/client-s3";

export const bucket = process.env.S3_BUCKET ?? "blocare-files";

export const rustfs = new S3Client({
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

let bucketReady: Promise<unknown> | null = null;

async function prepareBucket() {
	await rustfs
		.send(new HeadBucketCommand({ Bucket: bucket }))
		.catch(() => rustfs.send(new CreateBucketCommand({ Bucket: bucket })));

	await rustfs
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
		.catch((e) => console.warn("S3 CORS:", e.message));
}

export function ensureBucket() {
	bucketReady ??= prepareBucket().catch((e) => {
		bucketReady = null;
		throw e;
	});
	return bucketReady;
}

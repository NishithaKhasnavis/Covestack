import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const region = process.env.S3_REGION || "us-east-1";
const endpoint = process.env.S3_ENDPOINT;
const credentials = {
  accessKeyId: process.env.S3_ACCESS_KEY_ID || "local",
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "local",
};

export const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true, // required for LocalStack/MinIO
  credentials,
});

export async function ensureBucket(bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

// (still available if you want to use PUT in real S3 later)
export async function signPutUrl(bucket: string, key: string, mime?: string) {
  const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mime });
  return getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min
}

// New: Presigned POST (best for LocalStack and browsers)
export async function signPost(bucket: string, key: string, mime?: string) {
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Expires: 900,
    Fields: mime ? { "Content-Type": mime } : undefined,
    // 0..50MB allowed; tweak as needed
    Conditions: [["content-length-range", 0, 50 * 1024 * 1024]],
  });
  return { url, fields };
}

export async function signGetUrl(bucket: string, key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

export async function deleteObject(bucket: string, key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

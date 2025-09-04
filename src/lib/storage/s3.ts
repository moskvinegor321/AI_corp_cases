import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type PresignParams = {
  filename: string;
  contentType: string;
  prefix?: string;
  expiresSec?: number;
};

function getClient(): S3Client {
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials are not configured'); // TODO: Add to .env
  }
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function createPresignedPutUrl({ filename, contentType, prefix, expiresSec = 300 }: PresignParams): Promise<{ url: string; key: string }>
{
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error('S3_BUCKET is not configured'); // TODO: Add to .env
  const client = getClient();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${prefix ? `${prefix.replace(/\/$/, '')}/` : ''}${Date.now()}_${randomUUID()}_${safeName}`;
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ACL: 'public-read' });
  const url = await getSignedUrl(client, command, { expiresIn: expiresSec });
  return { url, key };
}



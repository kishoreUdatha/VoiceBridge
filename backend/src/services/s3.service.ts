import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client - will use IAM instance profile on EC2 or explicit credentials
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined, // Let SDK auto-detect credentials (IAM instance profile, etc.)
});

// Support both AWS_S3_BUCKET and AWS_BUCKET_NAME for backward compatibility
const BUCKET_NAME = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || 'crm-lead-generation-files';
// Use recordings bucket if set, otherwise fall back to main bucket
const RECORDINGS_BUCKET = process.env.AWS_RECORDINGS_BUCKET || BUCKET_NAME;
// Use local storage only if no bucket is configured AND no explicit credentials
const USE_LOCAL_STORAGE = !process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_RECORDINGS_BUCKET && !process.env.AWS_BUCKET_NAME;

// For local development without S3
const localFileStore: Map<string, { buffer: Buffer; mimeType: string }> = new Map();

/**
 * Upload file to S3 or local storage
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  mimeType: string
): Promise<string> {
  // Use local storage if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    const localKey = `local://${key}`;
    localFileStore.set(localKey, { buffer, mimeType });
    console.log(`[Local Storage] File stored: ${localKey}`);
    return localKey;
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return the S3 URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
}

/**
 * Delete file from S3 or local storage
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  // Handle local storage
  if (fileUrl.startsWith('local://')) {
    localFileStore.delete(fileUrl);
    console.log(`[Local Storage] File deleted: ${fileUrl}`);
    return;
  }

  // Extract key from S3 URL
  const urlParts = fileUrl.split('.amazonaws.com/');
  if (urlParts.length !== 2) {
    throw new Error('Invalid S3 URL');
  }

  const key = urlParts[1];

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get signed URL for private file access
 */
export async function getSignedUrlForDownload(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  // Handle local storage
  if (key.startsWith('local://')) {
    return key; // Return as-is for local storage
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Convert a stored recording URL into a playable presigned URL.
 * Private S3 buckets return 403 to MediaPlayer without presigning.
 * Returns the input unchanged for local/non-S3/already-signed URLs, or on error.
 */
export async function getPlayableRecordingUrl(
  storedUrl: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!storedUrl) return null;
  if (storedUrl.startsWith('local://')) return storedUrl;
  if (!storedUrl.includes('.amazonaws.com/')) return storedUrl;
  if (storedUrl.includes('X-Amz-Signature=')) return storedUrl;

  try {
    const [, rest] = storedUrl.split('.amazonaws.com/');
    const key = decodeURIComponent(rest.split('?')[0]);
    const command = new GetObjectCommand({ Bucket: RECORDINGS_BUCKET, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (e) {
    console.error('[S3] Failed to presign recording URL:', e);
    return storedUrl;
  }
}

/**
 * Get file from local storage (for development)
 */
export function getLocalFile(key: string): { buffer: Buffer; mimeType: string } | null {
  return localFileStore.get(key) || null;
}

/**
 * Generate unique file key
 */
export function generateFileKey(folder: string, fileName: string): string {
  const extension = fileName.split('.').pop() || '';
  const uniqueName = `${uuidv4()}.${extension}`;
  return `${folder}/${uniqueName}`;
}

// Log initialization
if (USE_LOCAL_STORAGE) {
  console.log('[S3] Using LOCAL STORAGE mode (set AWS_BUCKET_NAME or AWS_RECORDINGS_BUCKET to enable S3)');
} else {
  console.log(`[S3] Client initialized - Main bucket: ${BUCKET_NAME}, Recordings bucket: ${RECORDINGS_BUCKET}`);
  console.log(`[S3] Using ${process.env.AWS_ACCESS_KEY_ID ? 'explicit credentials' : 'IAM instance profile'}`);
}

/**
 * Upload recording to S3 recordings bucket
 * Returns the public URL of the uploaded recording
 */
export async function uploadRecordingToS3(
  buffer: Buffer,
  fileName: string,
  mimeType: string = 'audio/m4a'
): Promise<string> {
  const key = `recordings/${fileName}`;

  // Use local storage if S3 is not configured
  if (USE_LOCAL_STORAGE) {
    const localKey = `local://${key}`;
    localFileStore.set(localKey, { buffer, mimeType });
    console.log(`[Local Storage] Recording stored: ${localKey}`);
    return localKey;
  }

  const command = new PutObjectCommand({
    Bucket: RECORDINGS_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return the public S3 URL
  const url = `https://${RECORDINGS_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
  console.log(`[S3] Recording uploaded: ${url}`);
  return url;
}

/**
 * Delete recording from S3 recordings bucket
 */
export async function deleteRecordingFromS3(recordingUrl: string): Promise<void> {
  // Handle local storage
  if (recordingUrl.startsWith('local://')) {
    localFileStore.delete(recordingUrl);
    console.log(`[Local Storage] Recording deleted: ${recordingUrl}`);
    return;
  }

  // Extract key from S3 URL
  if (!recordingUrl.includes(RECORDINGS_BUCKET)) {
    console.log(`[S3] Not a recordings bucket URL, skipping delete: ${recordingUrl}`);
    return;
  }

  const urlParts = recordingUrl.split('.amazonaws.com/');
  if (urlParts.length !== 2) {
    console.log(`[S3] Invalid recording URL format: ${recordingUrl}`);
    return;
  }

  const key = urlParts[1];

  const command = new DeleteObjectCommand({
    Bucket: RECORDINGS_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  console.log(`[S3] Recording deleted: ${recordingUrl}`);
}

export { s3Client, BUCKET_NAME, RECORDINGS_BUCKET };

import AWS from 'aws-sdk';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
    console.warn('R2 configuration incomplete. R2 upload features will be disabled.');
}

export const s3Client = new AWS.S3({
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    region: 'auto',
    signatureVersion: 'v4',
});

export interface UploadResult {
    key: string;
    url: string;
    publicUrl?: string;
}

export async function uploadToR2(
    key: string,
    buffer: Buffer,
    contentType: string
): Promise<UploadResult> {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        throw new Error('R2 configuration incomplete');
    }

    const uploadParams = {
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };

    try {
        const result = await s3Client.upload(uploadParams).promise();

        const uploadResult: UploadResult = {
            key: key,
            url: result.Location,
        };

        // 如果配置了公共 URL 基础地址，生成公共 URL
        if (R2_PUBLIC_URL_BASE) {
            uploadResult.publicUrl = `${R2_PUBLIC_URL_BASE}/${key}`;
        }

        return uploadResult;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
}

export async function generateSignedUploadUrl(key: string, contentType: string): Promise<string> {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        throw new Error('R2 configuration incomplete');
    }

    const params = {
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Expires: 3600, // 1 hour
    };

    try {
        const signedUrl = await s3Client.getSignedUrlPromise('putObject', params);
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed upload URL:', error);
        throw error;
    }
}

export async function deleteFromR2(key: string): Promise<void> {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        throw new Error('R2 configuration incomplete');
    }

    const deleteParams = {
        Bucket: R2_BUCKET_NAME,
        Key: key,
    };

    try {
        await s3Client.deleteObject(deleteParams).promise();
        console.log(`Successfully deleted ${key} from R2`);
    } catch (error) {
        console.error('Error deleting from R2:', error);
        throw error;
    }
}

export async function listR2Objects(prefix?: string): Promise<AWS.S3.Object[]> {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
        throw new Error('R2 configuration incomplete');
    }

    const listParams: AWS.S3.ListObjectsV2Request = {
        Bucket: R2_BUCKET_NAME,
    };

    if (prefix) {
        listParams.Prefix = prefix;
    }

    try {
        const result = await s3Client.listObjectsV2(listParams).promise();
        return result.Contents || [];
    } catch (error) {
        console.error('Error listing R2 objects:', error);
        throw error;
    }
} 
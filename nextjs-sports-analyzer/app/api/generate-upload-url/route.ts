import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// 配置 Cloudflare R2
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_PUB_URL = process.env.R2_PUB_URL;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

let s3Client: S3Client | null = null;

if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_ACCOUNT_ID) {
    s3Client = new S3Client({
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
        region: 'auto',
    });
    console.log("Cloudflare R2 client initialized.");
} else {
    console.warn("R2 configuration incomplete. R2 upload features will be disabled.");
}

export async function POST(request: NextRequest) {
    if (!s3Client) {
        return NextResponse.json(
            { error: 'R2 storage not configured on server.' },
            { status: 500 }
        );
    }

    try {
        const { filename, contentType } = await request.json();

        if (!filename || !contentType) {
            return NextResponse.json(
                { error: 'Missing filename or contentType.' },
                { status: 400 }
            );
        }

        // 生成唯一的对象键
        const fileExtension = filename.split('.').pop();
        const objectKey = `videos/${uuidv4()}.${fileExtension}`;

        // 创建预签名 URL
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: objectKey,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5分钟过期

        // 生成公共访问 URL
        let publicUrl: string;

        if (R2_PUB_URL) {
            // 使用配置的公共 URL
            publicUrl = `${R2_PUB_URL}/${objectKey}`;
        } else if (R2_CUSTOM_DOMAIN) {
            // 使用自定义域名
            publicUrl = `https://${R2_CUSTOM_DOMAIN}/${objectKey}`;
        } else {
            // 使用默认的 R2 公共 URL 格式
            publicUrl = `https://pub-${R2_ACCOUNT_ID}.r2.dev/${objectKey}`;
        }

        return NextResponse.json({
            uploadUrl,
            objectKey,
            publicUrl,
            expiresIn: 300
        });

    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL.' },
            { status: 500 }
        );
    }
} 
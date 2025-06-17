import { NextRequest, NextResponse } from 'next/server';
import { createAnalysisEvent } from '@/lib/supabaseClient';
import { performImageAnalysis } from '@/lib/genai';

export async function POST(request: NextRequest) {
    try {
        const { images } = await request.json();

        if (!images || !Array.isArray(images) || images.length === 0) {
            return NextResponse.json(
                { error: 'Missing images array or empty images.' },
                { status: 400 }
            );
        }

        // 验证图片数量
        if (images.length > 3) {
            return NextResponse.json(
                { error: 'Maximum 3 images allowed.' },
                { status: 400 }
            );
        }

        // 验证每个图片对象的格式
        for (const image of images) {
            if (!image.url || !image.filename || !image.contentType) {
                return NextResponse.json(
                    { error: 'Each image must have url, filename, and contentType.' },
                    { status: 400 }
                );
            }

            // 验证是否为图片类型
            if (!image.contentType.startsWith('image/')) {
                return NextResponse.json(
                    { error: `Invalid content type: ${image.contentType}. Only images are allowed.` },
                    { status: 400 }
                );
            }
        }

        // 验证 URL 格式（基本检查）
        const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;
        const R2_PUB_URL = process.env.R2_PUB_URL;
        const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

        for (const image of images) {
            let isValidUrl = false;

            if (R2_PUB_URL) {
                // 检查配置的公共 URL
                isValidUrl = image.url.startsWith(R2_PUB_URL);
            } else if (R2_CUSTOM_DOMAIN) {
                // 检查自定义域名
                isValidUrl = image.url.includes(R2_CUSTOM_DOMAIN);
            } else {
                // 检查默认的 R2 公共 URL 格式
                isValidUrl = image.url.includes(`pub-${R2_ACCOUNT_ID}.r2.dev`) ||
                    image.url.includes(`${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
            }

            if (!isValidUrl) {
                return NextResponse.json(
                    { error: `Invalid image URL format: ${image.url}` },
                    { status: 400 }
                );
            }
        }

        // 首先在数据库中创建分析事件记录
        const { data: dbEvent, error: dbError } = await createAnalysisEvent({
            r2_video_link: undefined, // 图片分析不需要视频链接
            image_urls: images.map(img => img.url),
            original_filename: images.map(img => img.filename).join(', '),
            content_type: images.map(img => img.contentType).join(', '),
            status: 'pending',
            analysis_type: 'image',
            image_count: images.length
        });

        if (dbError || !dbEvent) {
            console.error('Failed to create database record for image analysis event:', dbError);
            return NextResponse.json(
                { error: `Failed to initialize analysis job: ${dbError || 'Unknown database error'}` },
                { status: 500 }
            );
        }
        console.log('Image analysis event created in DB with ID:', dbEvent.id);

        // 启动图片分析任务，使用 dbEvent.id 作为 jobId
        performImageAnalysis(
            dbEvent.id,
            images
        );

        return NextResponse.json({
            message: "Images received and analysis started.",
            job_id: dbEvent.id,
            db_event_id: dbEvent.id,
            image_count: images.length
        }, { status: 202 });

    } catch (error) {
        console.error('Error in submit-images:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

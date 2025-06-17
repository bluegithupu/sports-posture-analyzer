import { NextRequest, NextResponse } from 'next/server';
import { createAnalysisEvent } from '@/lib/supabaseClient';
import { performAnalysisFromUrl } from '@/lib/genai';

export async function POST(request: NextRequest) {
    try {
        const { videoUrl, originalFilename, contentType } = await request.json();

        if (!videoUrl || !originalFilename || !contentType) {
            return NextResponse.json(
                { error: 'Missing videoUrl, originalFilename, or contentType.' },
                { status: 400 }
            );
        }

        // 验证 URL 格式（基本检查）
        const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;
        const R2_PUB_URL = process.env.R2_PUB_URL;
        const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;

        let isValidUrl = false;

        if (R2_PUB_URL) {
            // 检查配置的公共 URL
            isValidUrl = videoUrl.startsWith(R2_PUB_URL);
        } else if (R2_CUSTOM_DOMAIN) {
            // 检查自定义域名
            isValidUrl = videoUrl.includes(R2_CUSTOM_DOMAIN);
        } else {
            // 检查默认的 R2 公共 URL 格式
            isValidUrl = videoUrl.includes(`pub-${R2_ACCOUNT_ID}.r2.dev`) ||
                videoUrl.includes(`${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
        }

        if (!isValidUrl) {
            return NextResponse.json(
                { error: 'Invalid video URL format.' },
                { status: 400 }
            );
        }

        // 首先在数据库中创建分析事件记录
        const { data: dbEvent, error: dbError } = await createAnalysisEvent({
            r2_video_link: videoUrl,
            original_filename: originalFilename,
            content_type: contentType,
            status: 'pending',
            analysis_type: 'video'
        });

        if (dbError || !dbEvent) {
            console.error('Failed to create database record for analysis event:', dbError);
            return NextResponse.json(
                { error: `Failed to initialize analysis job: ${dbError || 'Unknown database error'}` },
                { status: 500 }
            );
        }
        console.log('Analysis event created in DB with ID:', dbEvent.id);

        // 启动分析任务，使用 dbEvent.id 作为 jobId
        performAnalysisFromUrl(
            dbEvent.id,
            videoUrl,
            originalFilename,
            contentType
        );

        return NextResponse.json({
            message: "Video URL received and analysis started.",
            job_id: dbEvent.id,
            db_event_id: dbEvent.id
        }, { status: 202 });

    } catch (error) {
        console.error('Error in submit-video-url:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
} 
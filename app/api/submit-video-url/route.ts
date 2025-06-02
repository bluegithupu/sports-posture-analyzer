import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createAnalysisEvent } from '@/lib/supabaseClient';
import { performAnalysisFromUrl } from '@/lib/genai';
import { analysisJobs, setJob } from '@/lib/jobStorage';

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
        const { id: dbEventId, error: dbError } = await createAnalysisEvent(videoUrl);
        if (dbError) {
            console.warn('Failed to create database record:', dbError);
        }

        // 生成分析任务 ID
        const jobId = uuidv4();
        setJob(jobId, {
            status: 'pending',
            message: 'Video URL received, starting analysis...',
            videoUrl,
            originalFilename,
            contentType,
            dbEventId // 保存数据库事件ID以便后续更新
        });

        // 启动分析任务
        performAnalysisFromUrl(jobId, videoUrl, originalFilename, contentType, dbEventId as string | null, analysisJobs);

        return NextResponse.json({
            message: "Video URL received and analysis started.",
            job_id: jobId,
            db_event_id: dbEventId
        }, { status: 202 });

    } catch (error) {
        console.error('Error in submit-video-url:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisEventById, updateAnalysisEventStatus } from '@/lib/supabaseClient';
import { performAnalysisFromUrl } from '@/lib/genai';

// 辅助函数：从URL中提取文件名
function getVideoFileName(url: string): string {
    try {
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return fileName || 'unknown_file.mp4';
    } catch {
        return 'unknown_file.mp4';
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    try {
        const eventId = params.jobId;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Missing job ID.' },
                { status: 400 }
            );
        }

        // 从数据库获取作业详情
        const { data: jobData, error: fetchError } = await getAnalysisEventById(eventId);

        if (fetchError) {
            return NextResponse.json(
                { error: `Failed to fetch job details: ${fetchError}` },
                { status: 500 }
            );
        }

        if (!jobData) {
            return NextResponse.json(
                { error: 'Job not found in database.' },
                { status: 404 }
            );
        }

        // 检查作业状态是否为失败
        if (jobData.status !== 'failed') {
            return NextResponse.json({
                error: `Job is not in failed state. Current status: ${jobData.status}`
            }, { status: 400 });
        }

        // 重置作业状态为 pending
        const { success: updateSuccess, error: updateError } = await updateAnalysisEventStatus(
            eventId,
            'pending',
            null,
            'Job retry requested, re-queued for processing.'
        );

        if (!updateSuccess) {
            return NextResponse.json(
                { error: `Failed to update job status: ${updateError}` },
                { status: 500 }
            );
        }

        // 从失败的阶段继续处理
        const videoUrl = jobData.r2_video_link as string;
        const originalFilename = jobData.original_filename as string || 'unknown_file.mp4';
        const contentType = jobData.content_type as string || 'video/mp4';

        // 验证videoUrl不为空
        if (!videoUrl) {
            return NextResponse.json(
                { error: 'Video URL not found in job data.' },
                { status: 400 }
            );
        }

        console.log(`[Retry ${eventId}] Starting retry for job. Video URL: ${videoUrl}, Original Filename: ${originalFilename}, ContentType: ${contentType}`);
        performAnalysisFromUrl(
            eventId,
            videoUrl,
            originalFilename,
            contentType
        );

        return NextResponse.json({
            message: "Job retry started successfully.",
            job_id: eventId,
            status: 'pending'
        }, { status: 202 });

    } catch (error) {
        console.error(`Error retrying job:`, error);
        return NextResponse.json(
            { error: 'Internal server error during retry.' },
            { status: 500 }
        );
    }
} 
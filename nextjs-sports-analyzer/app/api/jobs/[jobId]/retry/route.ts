import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getAnalysisEventById, updateAnalysisEventStatus } from '@/lib/supabaseClient';
import { performAnalysisFromUrl } from '@/lib/genai';
import { analysisJobs, setJob } from '@/lib/jobStorage';

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
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                { error: 'Missing job ID.' },
                { status: 400 }
            );
        }

        // 从数据库获取作业详情
        const { data: jobData, error: fetchError } = await getAnalysisEventById(jobId);

        if (fetchError) {
            return NextResponse.json(
                { error: `Failed to fetch job details: ${fetchError}` },
                { status: 500 }
            );
        }

        if (!jobData) {
            return NextResponse.json(
                { error: 'Job not found.' },
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
            jobId,
            'pending',
            null // 清除错误消息
        );

        if (!updateSuccess) {
            return NextResponse.json(
                { error: `Failed to update job status: ${updateError}` },
                { status: 500 }
            );
        }

        // 生成新的处理 job ID
        const processingJobId = uuidv4();

        // 从失败的阶段继续处理
        const videoUrl = jobData.r2_video_link;
        const originalFilename = getVideoFileName(videoUrl);
        const contentType = 'video/mp4'; // 默认类型，可以根据需要改进

        // 初始化处理任务状态
        setJob(processingJobId, {
            status: 'pending',
            message: 'Retry request received, restarting analysis...',
            videoUrl,
            originalFilename,
            contentType,
            dbEventId: jobId // 使用原始的数据库事件ID
        });

        // 根据失败阶段决定从哪里重新开始
        if (jobData.gemini_file_link) {
            // 如果已经有 Gemini 文件链接，从分析阶段重新开始
            console.log(`[Retry ${jobId}] Gemini file already exists, restarting from analysis phase`);
            // 这里需要实现从 Gemini 文件开始分析的逻辑
            // 暂时先重新完整执行
            performAnalysisFromUrl(processingJobId, videoUrl, originalFilename, contentType, jobId, analysisJobs);
        } else {
            // 从头开始重新执行整个流程
            console.log(`[Retry ${jobId}] Starting complete retry from beginning`);
            performAnalysisFromUrl(processingJobId, videoUrl, originalFilename, contentType, jobId, analysisJobs);
        }

        return NextResponse.json({
            message: "Job retry started successfully.",
            original_job_id: jobId,
            processing_job_id: processingJobId,
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
import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobStorage';

// 这里我们需要一个全局的任务存储，在实际应用中可能需要使用 Redis 或数据库
// 暂时使用一个简单的内存存储
const analysisJobs: Record<string, any> = {};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return NextResponse.json(
                { error: 'Job ID is required.' },
                { status: 400 }
            );
        }

        const job = getJob(jobId);

        if (!job) {
            return NextResponse.json(
                { error: 'Job ID not found.' },
                { status: 404 }
            );
        }

        return NextResponse.json(job);

    } catch (error) {
        console.error('Error getting analysis result:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

// 导出 analysisJobs 以供其他模块使用
export { analysisJobs }; 
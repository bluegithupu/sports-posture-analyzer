import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobStorage';

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
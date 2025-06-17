import { NextRequest, NextResponse } from 'next/server';
// import { getJob } from '@/lib/jobStorage'; // REMOVED
import { getAnalysisEventById } from '@/lib/supabaseClient';
import { JobResult } from '@/lib/apiClient'; // Assuming JobResult is defined here or can be adapted

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;
        const eventId = jobId;

        if (!eventId) {
            return NextResponse.json(
                { error: 'Job ID (Supabase event ID) is required.' },
                { status: 400 }
            );
        }

        // const job = getJob(jobId); // REMOVED
        const { data: jobData, error: dbError } = await getAnalysisEventById(eventId);

        if (dbError) {
            console.error(`Error fetching job ${eventId} from Supabase:`, dbError);
            return NextResponse.json(
                { error: `Failed to fetch job details: ${dbError}` },
                { status: 500 }
            );
        }

        if (!jobData) {
            return NextResponse.json(
                { error: 'Job not found in database.' }, // Updated message
                { status: 404 }
            );
        }

        // Adapt jobData from Supabase to the JobResult interface expected by the frontend hook
        // Both video and image analysis now use the text field (unified structure)
        // Keep backward compatibility for old image analysis records that used analysis_text
        const reportText = jobData.analysis_report?.text || jobData.analysis_report?.analysis_text || undefined;

        const result: JobResult = {
            status: jobData.status as 'pending' | 'processing' | 'completed' | 'failed',
            report: reportText,
            error: jobData.error_message || undefined,
            message: jobData.status_text || undefined, // Use the new status_text field
            videoUrl: jobData.r2_video_link || undefined,
            originalFilename: jobData.original_filename || undefined,
            contentType: jobData.content_type || undefined,
            // dbEventId: jobData.id, // This is eventId, maybe not needed in JobResult if frontend uses jobId from URL
        };

        return NextResponse.json(result);

    } catch (error) {
        const err = error as Error;
        console.error('Error getting analysis result:', err);
        return NextResponse.json(
            { error: `Internal server error: ${err.message}` },
            { status: 500 }
        );
    }
} 
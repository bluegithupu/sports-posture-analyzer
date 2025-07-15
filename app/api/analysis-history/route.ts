import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisHistory } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        console.log('Fetching analysis history with limit:', limit);

        const { data, error } = await getAnalysisHistory(limit);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json(
                { error: error },
                { status: 500 }
            );
        }

        console.log('Analysis history fetched successfully, count:', data?.length || 0);

        return NextResponse.json({
            message: "Analysis history retrieved successfully.",
            data: data || [],
            count: data?.length || 0
        });

    } catch (error) {
        console.error('Error getting analysis history:', error);
        
        // 更详细的错误信息
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorDetails = error instanceof Error ? error.stack : '';
        
        return NextResponse.json(
            { 
                error: 'Internal server error.',
                message: errorMessage,
                details: errorDetails,
                hint: 'This might be a network connectivity issue or Supabase configuration problem.',
                code: 'FETCH_FAILED'
            },
            { status: 500 }
        );
    }
} 
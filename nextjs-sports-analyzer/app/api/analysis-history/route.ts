import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisHistory } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        const { data, error } = await getAnalysisHistory(limit);

        if (error) {
            return NextResponse.json(
                { error: error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: "Analysis history retrieved successfully.",
            data: data,
            count: data.length
        });

    } catch (error) {
        console.error('Error getting analysis history:', error);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
} 
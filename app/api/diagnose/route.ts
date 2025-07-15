import { NextResponse } from 'next/server';

export async function GET() {
    const diagnostics = {
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
            supabaseUrl: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'NOT SET',
        },
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
    };

    // 测试基本的 fetch
    let fetchTest = 'Not tested';
    try {
        const testUrl = 'https://api.github.com/zen';
        const response = await fetch(testUrl);
        fetchTest = response.ok ? 'Success' : `Failed with status ${response.status}`;
    } catch (error) {
        fetchTest = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    // 测试 Supabase 连接
    let supabaseTest = 'Not tested';
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
            const testUrl = `${process.env.SUPABASE_URL}/rest/v1/`;
            const response = await fetch(testUrl, {
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                }
            });
            supabaseTest = response.ok ? 'Success' : `Failed with status ${response.status}`;
        } catch (error) {
            supabaseTest = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
    }

    return NextResponse.json({
        diagnostics,
        tests: {
            basicFetch: fetchTest,
            supabaseConnection: supabaseTest
        }
    });
}
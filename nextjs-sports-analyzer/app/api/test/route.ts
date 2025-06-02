import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'API 路由工作正常',
        timestamp: new Date().toISOString()
    });
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    return NextResponse.json({
        message: 'POST 请求成功',
        received: body,
        timestamp: new Date().toISOString()
    });
} 
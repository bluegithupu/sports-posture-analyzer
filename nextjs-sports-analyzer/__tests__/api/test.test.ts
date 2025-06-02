import { NextRequest } from 'next/server';
import { GET } from '../../app/api/test/route';
import { setupTestEnv } from '../setup/testEnv';

// Mock NextResponse
jest.mock('next/server', () => ({
    NextRequest: jest.requireActual('next/server').NextRequest,
    NextResponse: {
        json: jest.fn((data, init) => {
            const response = new Response(JSON.stringify(data), {
                status: init?.status || 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...init?.headers
                }
            });
            return response;
        })
    }
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/test', () => {
    it('应该返回成功的测试响应', async () => {
        // 创建模拟请求
        const request = new NextRequest('http://localhost:3000/api/test');

        // 调用API路由
        const response = await GET(request);

        // 验证响应
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        expect(data.message).toBe('API 路由工作正常');
    });

    it('应该包含正确的响应头', async () => {
        const request = new NextRequest('http://localhost:3000/api/test');
        const response = await GET(request);

        expect(response.headers.get('content-type')).toContain('application/json');
    });
}); 
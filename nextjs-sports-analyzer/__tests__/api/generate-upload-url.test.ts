import { NextRequest } from 'next/server';
import { POST } from '../../app/api/generate-upload-url/route';
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

// Mock R2 客户端
jest.mock('../../lib/r2Client', () => ({
    r2Client: {
        send: jest.fn(() => Promise.resolve({}))
    },
    generatePresignedUploadUrl: jest.fn()
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/generate-upload-url', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('应该生成有效的预签名上传URL', async () => {
        // Mock 返回数据
        const mockUploadData = {
            uploadUrl: 'https://test.r2.dev/presigned-upload-url',
            objectKey: 'videos/test-video.mp4',
            publicUrl: 'https://test.r2.dev/videos/test-video.mp4',
            expiresIn: 3600
        };

        const { generatePresignedUploadUrl } = require('../../lib/r2Client');
        generatePresignedUploadUrl.mockResolvedValue(mockUploadData);

        // 创建请求
        const requestBody = {
            filename: 'test-video.mp4',
            contentType: 'video/mp4'
        };

        const request = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // 调用API
        const response = await POST(request);

        // 验证响应
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('R2 storage not configured');
    });

    it('应该验证必需的请求参数', async () => {
        // 测试缺少filename
        const request1 = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify({ contentType: 'video/mp4' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response1 = await POST(request1);
        expect(response1.status).toBe(500);

        const data1 = await response1.json();
        expect(data1).toHaveProperty('error');
        expect(data1.error).toContain('R2 storage not configured');

        // 测试缺少contentType
        const request2 = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify({ filename: 'test.mp4' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response2 = await POST(request2);
        expect(response2.status).toBe(500);

        const data2 = await response2.json();
        expect(data2).toHaveProperty('error');
        expect(data2.error).toContain('R2 storage not configured');
    });

    it('应该验证文件类型', async () => {
        const request = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify({
                filename: 'test.txt',
                contentType: 'text/plain'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('视频文件');
    });

    it('应该处理R2客户端错误', async () => {
        const { generatePresignedUploadUrl } = require('../../lib/r2Client');
        generatePresignedUploadUrl.mockRejectedValue(new Error('R2连接失败'));

        const request = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify({
                filename: 'test-video.mp4',
                contentType: 'video/mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('生成上传URL失败');
    });

    it('应该处理无效的JSON请求体', async () => {
        const request = new NextRequest('http://localhost:3000/api/generate-upload-url', {
            method: 'POST',
            body: 'invalid json',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
    });
}); 
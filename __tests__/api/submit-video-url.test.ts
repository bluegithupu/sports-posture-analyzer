import { NextRequest } from 'next/server';
import { POST } from '../../app/api/submit-video-url/route';
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

// Mock 依赖
jest.mock('../../lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                order: jest.fn(() => ({
                    limit: jest.fn(() => Promise.resolve({ data: [], error: null }))
                }))
            })),
            insert: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
            update: jest.fn(() => Promise.resolve({ data: {}, error: null })),
            eq: jest.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
    },
    createAnalysisEvent: jest.fn()
}));

jest.mock('../../lib/genai', () => ({
    performAnalysisFromUrl: jest.fn()
}));

jest.mock('../../lib/jobStorage', () => ({
    setJob: jest.fn(),
    updateJob: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-job-id')
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/submit-video-url', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('应该成功提交视频URL并启动分析', async () => {
        // Mock 返回数据
        const mockEventId = 'test-event-id';
        const { createAnalysisEvent } = require('../../lib/supabaseClient');
        createAnalysisEvent.mockResolvedValue({ id: mockEventId, error: null });

        const { performAnalysisFromUrl } = require('../../lib/genai');
        performAnalysisFromUrl.mockResolvedValue('测试分析报告');

        const { setJob, updateJob } = require('../../lib/jobStorage');
        setJob.mockResolvedValue(undefined);
        updateJob.mockResolvedValue(undefined);

        // 设置环境变量以通过URL验证
        process.env.R2_PUB_URL = 'https://test.r2.dev';

        // 创建请求
        const requestBody = {
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4'
        };

        const request = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // 调用API
        const response = await POST(request);

        // 验证响应
        expect(response.status).toBe(202);

        const data = await response.json();
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('job_id');
        expect(data).toHaveProperty('db_event_id');
        expect(data.job_id).toBe('test-job-id');
        expect(data.db_event_id).toBe(mockEventId);
        expect(data.message).toContain('Video URL received and analysis started');

        // 验证调用
        expect(createAnalysisEvent).toHaveBeenCalledWith(
            'https://test.r2.dev/videos/test-video.mp4'
        );
        expect(setJob).toHaveBeenCalledWith('test-job-id', expect.objectContaining({
            status: 'pending',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4',
            dbEventId: mockEventId
        }));
    });

    it('应该验证必需的请求参数', async () => {
        // 测试缺少videoUrl
        const request1 = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({
                originalFilename: 'test.mp4',
                contentType: 'video/mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response1 = await POST(request1);
        expect(response1.status).toBe(400);

        const data1 = await response1.json();
        expect(data1).toHaveProperty('error');
        expect(data1.error).toContain('Missing videoUrl');

        // 测试缺少originalFilename
        const request2 = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({
                videoUrl: 'https://test.com/video.mp4',
                contentType: 'video/mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response2 = await POST(request2);
        expect(response2.status).toBe(400);

        const data2 = await response2.json();
        expect(data2).toHaveProperty('error');
        expect(data2.error).toContain('Missing videoUrl');

        // 测试缺少contentType
        const request3 = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({
                videoUrl: 'https://test.com/video.mp4',
                originalFilename: 'test.mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response3 = await POST(request3);
        expect(response3.status).toBe(400);

        const data3 = await response3.json();
        expect(data3).toHaveProperty('error');
        expect(data3.error).toContain('Missing videoUrl');
    });

    it('应该验证视频URL格式', async () => {
        const request = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({
                videoUrl: 'invalid-url',
                originalFilename: 'test.mp4',
                contentType: 'video/mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Invalid video URL format');
    });

    it('应该处理数据库创建事件失败', async () => {
        const { createAnalysisEvent } = require('../../lib/supabaseClient');
        createAnalysisEvent.mockResolvedValue({ id: null, error: '数据库连接失败' });

        const { setJob } = require('../../lib/jobStorage');
        setJob.mockResolvedValue(undefined);

        const { performAnalysisFromUrl } = require('../../lib/genai');
        performAnalysisFromUrl.mockResolvedValue('测试分析报告');

        // 设置环境变量以通过URL验证
        process.env.R2_PUB_URL = 'https://test.r2.dev';

        const request = new NextRequest('http://localhost:3000/api/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({
                videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
                originalFilename: 'test-video.mp4',
                contentType: 'video/mp4'
            }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(request);
        expect(response.status).toBe(202);

        const data = await response.json();
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('Video URL received and analysis started');
    });

    it('应该处理无效的JSON请求体', async () => {
        const request = new NextRequest('http://localhost:3000/api/submit-video-url', {
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
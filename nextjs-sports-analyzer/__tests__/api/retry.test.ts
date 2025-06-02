import { NextRequest } from 'next/server';
import { POST } from '../../app/api/jobs/[jobId]/retry/route';
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
    getAnalysisEventById: jest.fn(),
    updateAnalysisEventStatus: jest.fn()
}));

jest.mock('../../lib/genai', () => ({
    performAnalysisFromUrl: jest.fn()
}));

jest.mock('../../lib/jobStorage', () => ({
    getJob: jest.fn(),
    setJob: jest.fn(),
    updateJob: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'new-job-id')
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/jobs/[jobId]/retry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('应该成功重试失败的任务', async () => {
        // Mock 数据库事件数据
        const mockEventData = {
            id: 'test-event-id',
            r2_video_link: 'https://test.r2.dev/videos/test-video.mp4',
            status: 'failed'
        };

        const { setJob } = require('../../lib/jobStorage');
        const { getAnalysisEventById, updateAnalysisEventStatus } = require('../../lib/supabaseClient');
        const { performAnalysisFromUrl } = require('../../lib/genai');

        getAnalysisEventById.mockResolvedValue({ data: mockEventData, error: null });
        updateAnalysisEventStatus.mockResolvedValue({ success: true, error: null });
        setJob.mockResolvedValue(undefined);
        performAnalysisFromUrl.mockResolvedValue('重试后的分析报告');

        // 创建请求
        const request = new NextRequest('http://localhost:3000/api/jobs/old-job-id/retry', {
            method: 'POST'
        });

        // 调用API
        const response = await POST(request, { params: { jobId: 'old-job-id' } });

        // 验证响应
        expect(response.status).toBe(202);

        const data = await response.json();
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('processing_job_id');
        expect(data).toHaveProperty('original_job_id');
        expect(data.processing_job_id).toBe('new-job-id');
        expect(data.original_job_id).toBe('old-job-id');
        expect(data.message).toContain('Job retry started successfully');

        // 验证调用
        expect(getAnalysisEventById).toHaveBeenCalledWith('old-job-id');
        expect(updateAnalysisEventStatus).toHaveBeenCalledWith('old-job-id', 'pending', null);
        expect(setJob).toHaveBeenCalledWith('new-job-id', expect.objectContaining({
            status: 'pending',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            dbEventId: 'old-job-id'
        }));
    });

    it('应该处理不存在的任务ID', async () => {
        const { getAnalysisEventById } = require('../../lib/supabaseClient');
        getAnalysisEventById.mockResolvedValue({ data: null, error: null });

        const request = new NextRequest('http://localhost:3000/api/jobs/non-existent-job/retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: 'non-existent-job' } });

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Job not found');
    });

    it('应该拒绝重试非失败状态的任务', async () => {
        const mockJobData = {
            id: 'completed-job',
            status: 'completed',
            r2_video_link: 'https://test.r2.dev/videos/test-video.mp4'
        };

        const { getAnalysisEventById } = require('../../lib/supabaseClient');
        getAnalysisEventById.mockResolvedValue({ data: mockJobData, error: null });

        const request = new NextRequest('http://localhost:3000/api/jobs/completed-job/retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: 'completed-job' } });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Job is not in failed state');
    });

    it('应该拒绝重试处理中的任务', async () => {
        const mockJobData = {
            id: 'processing-job',
            status: 'processing',
            r2_video_link: 'https://test.r2.dev/videos/test-video.mp4'
        };

        const { getAnalysisEventById } = require('../../lib/supabaseClient');
        getAnalysisEventById.mockResolvedValue({ data: mockJobData, error: null });

        const request = new NextRequest('http://localhost:3000/api/jobs/processing-job/retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: 'processing-job' } });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Job is not in failed state');
    });

    it('应该处理数据库事件不存在的情况', async () => {
        const { getAnalysisEventById } = require('../../lib/supabaseClient');
        getAnalysisEventById.mockResolvedValue({ data: null, error: null });

        const request = new NextRequest('http://localhost:3000/api/jobs/failed-job/retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: 'failed-job' } });

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Job not found');
    });

    it('应该验证jobId参数', async () => {
        const request = new NextRequest('http://localhost:3000/api/jobs//retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: '' } });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Missing job ID');
    });

    it('应该处理数据库更新错误', async () => {
        const mockEventData = {
            id: 'test-event-id',
            r2_video_link: 'https://test.r2.dev/videos/test-video.mp4',
            status: 'failed'
        };

        const { getAnalysisEventById, updateAnalysisEventStatus } = require('../../lib/supabaseClient');

        getAnalysisEventById.mockResolvedValue({ data: mockEventData, error: null });
        updateAnalysisEventStatus.mockResolvedValue({ success: false, error: '数据库更新失败' });

        const request = new NextRequest('http://localhost:3000/api/jobs/failed-job/retry', {
            method: 'POST'
        });

        const response = await POST(request, { params: { jobId: 'failed-job' } });

        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Failed to update job status');
    });
}); 
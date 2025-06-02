import { NextRequest } from 'next/server';
import { GET } from '../../app/api/results/[jobId]/route';
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
jest.mock('../../lib/jobStorage', () => ({
    getJob: jest.fn()
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/results/[jobId]', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('应该返回已完成任务的结果', async () => {
        // Mock 任务数据
        const mockJobData = {
            status: 'completed',
            report: '## 体态分析报告\n\n这是一个测试分析报告。',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4',
            dbEventId: 'test-event-id'
        };

        const { getJob } = require('../../lib/jobStorage');
        getJob.mockResolvedValue(mockJobData);

        // 创建请求
        const request = new NextRequest('http://localhost:3000/api/results/test-job-id');

        // 调用API
        const response = await GET(request, { params: { jobId: 'test-job-id' } });

        // 验证响应
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status', 'completed');
        expect(data).toHaveProperty('report');
        expect(data).toHaveProperty('videoUrl');
        expect(data).toHaveProperty('originalFilename');
        expect(data).toHaveProperty('contentType');
        expect(data).toHaveProperty('dbEventId');
        expect(data.report).toBe(mockJobData.report);
        expect(data.videoUrl).toBe(mockJobData.videoUrl);

        // 验证调用
        expect(getJob).toHaveBeenCalledWith('test-job-id');
    });

    it('应该返回处理中任务的状态', async () => {
        const mockJobData = {
            status: 'processing',
            message: '正在分析视频...',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4',
            dbEventId: 'test-event-id'
        };

        const { getJob } = require('../../lib/jobStorage');
        getJob.mockResolvedValue(mockJobData);

        const request = new NextRequest('http://localhost:3000/api/results/test-job-id');
        const response = await GET(request, { params: { jobId: 'test-job-id' } });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status', 'processing');
        expect(data).toHaveProperty('message', '正在分析视频...');
        expect(data).not.toHaveProperty('report');
    });

    it('应该返回失败任务的错误信息', async () => {
        const mockJobData = {
            status: 'failed',
            error: '视频分析失败：文件格式不支持',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4',
            dbEventId: 'test-event-id'
        };

        const { getJob } = require('../../lib/jobStorage');
        getJob.mockResolvedValue(mockJobData);

        const request = new NextRequest('http://localhost:3000/api/results/test-job-id');
        const response = await GET(request, { params: { jobId: 'test-job-id' } });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status', 'failed');
        expect(data).toHaveProperty('error', '视频分析失败：文件格式不支持');
        expect(data).not.toHaveProperty('report');
    });

    it('应该处理不存在的任务ID', async () => {
        const { getJob } = require('../../lib/jobStorage');
        getJob.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/results/non-existent-job');
        const response = await GET(request, { params: { jobId: 'non-existent-job' } });

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('任务不存在');
    });

    it('应该验证jobId参数', async () => {
        const request = new NextRequest('http://localhost:3000/api/results/');
        const response = await GET(request, { params: { jobId: '' } });

        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('jobId');
    });

    it('应该处理存储系统错误', async () => {
        const { getJob } = require('../../lib/jobStorage');
        getJob.mockRejectedValue(new Error('存储系统连接失败'));

        const request = new NextRequest('http://localhost:3000/api/results/test-job-id');
        const response = await GET(request, { params: { jobId: 'test-job-id' } });

        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('获取任务结果失败');
    });

    it('应该返回等待中任务的状态', async () => {
        const mockJobData = {
            status: 'pending',
            message: '任务已创建，等待处理...',
            videoUrl: 'https://test.r2.dev/videos/test-video.mp4',
            originalFilename: 'test-video.mp4',
            contentType: 'video/mp4',
            dbEventId: 'test-event-id'
        };

        const { getJob } = require('../../lib/jobStorage');
        getJob.mockResolvedValue(mockJobData);

        const request = new NextRequest('http://localhost:3000/api/results/test-job-id');
        const response = await GET(request, { params: { jobId: 'test-job-id' } });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status', 'pending');
        expect(data).toHaveProperty('message', '任务已创建，等待处理...');
        expect(data).not.toHaveProperty('report');
        expect(data).not.toHaveProperty('error');
    });
}); 
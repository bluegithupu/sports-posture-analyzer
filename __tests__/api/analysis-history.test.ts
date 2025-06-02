import { NextRequest } from 'next/server';
import { GET } from '../../app/api/analysis-history/route';
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

// Mock Supabase 客户端
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
    getAnalysisHistory: jest.fn()
}));

// 设置测试环境
beforeAll(() => {
    setupTestEnv();
});

describe('/api/analysis-history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('应该返回分析历史数据', async () => {
        // Mock 数据
        const mockHistoryData = [
            {
                id: 'test-id-1',
                created_at: '2024-01-01T00:00:00Z',
                r2_video_link: 'https://test.r2.dev/video1.mp4',
                status: 'completed',
                analysis_report: {
                    text: '测试分析报告1',
                    timestamp: '2024-01-01T00:00:00Z',
                    model_used: 'gemini-2.5-flash-preview-05-20'
                }
            },
            {
                id: 'test-id-2',
                created_at: '2024-01-02T00:00:00Z',
                r2_video_link: 'https://test.r2.dev/video2.mp4',
                status: 'processing'
            }
        ];

        // Mock getAnalysisHistory 函数
        const { getAnalysisHistory } = require('../../lib/supabaseClient');
        getAnalysisHistory.mockResolvedValue({
            data: mockHistoryData,
            count: 2
        });

        // 创建请求
        const request = new NextRequest('http://localhost:3000/api/analysis-history?limit=10');

        // 调用API
        const response = await GET(request);

        // 验证响应
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('count');
        expect(data.data).toHaveLength(2);
        expect(data.count).toBe(2);
        expect(data.data[0]).toHaveProperty('id', 'test-id-1');
        expect(data.data[0]).toHaveProperty('status', 'completed');
    });

    it('应该处理limit参数', async () => {
        const { getAnalysisHistory } = require('../../lib/supabaseClient');
        getAnalysisHistory.mockResolvedValue({ data: [], count: 0 });

        const request = new NextRequest('http://localhost:3000/api/analysis-history?limit=5');
        await GET(request);

        expect(getAnalysisHistory).toHaveBeenCalledWith(5);
    });

    it('应该使用默认limit值', async () => {
        const { getAnalysisHistory } = require('../../lib/supabaseClient');
        getAnalysisHistory.mockResolvedValue({ data: [], count: 0 });

        const request = new NextRequest('http://localhost:3000/api/analysis-history');
        await GET(request);

        expect(getAnalysisHistory).toHaveBeenCalledWith(10);
    });

    it('应该处理数据库错误', async () => {
        const { getAnalysisHistory } = require('../../lib/supabaseClient');
        getAnalysisHistory.mockRejectedValue(new Error('数据库连接失败'));

        const request = new NextRequest('http://localhost:3000/api/analysis-history');
        const response = await GET(request);

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('获取分析历史失败');
    });
}); 
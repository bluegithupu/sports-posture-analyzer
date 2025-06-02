// 测试环境设置
export function setupTestEnv() {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test_anon_key';
    process.env.R2_ACCOUNT_ID = 'test_account_id';
    process.env.R2_ACCESS_KEY_ID = 'test_access_key';
    process.env.R2_SECRET_ACCESS_KEY = 'test_secret_key';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_URL_BASE = 'https://test.r2.dev';
    process.env.R2_PUB_URL = 'https://test.r2.dev';
    process.env.GENAI_API_KEY = 'test_genai_key';
}

// Mock 函数工厂 - 使用 mock 前缀以符合 Jest 要求
export const mockSupabaseClient = () => ({
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
});

export const mockR2Client = () => ({
    send: jest.fn(() => Promise.resolve({}))
});

export const mockGenAIClient = () => ({
    uploadFile: jest.fn(() => Promise.resolve({ file: { uri: 'test-uri' } })),
    getGenerativeModel: jest.fn(() => ({
        generateContent: jest.fn(() => Promise.resolve({
            response: {
                text: () => '测试分析报告'
            }
        }))
    }))
});

// 通用 Mock 工厂
export const createMockSupabaseClient = mockSupabaseClient;
export const createMockR2Client = mockR2Client;
export const createMockGenAIClient = mockGenAIClient; 
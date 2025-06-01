// 测试 Supabase 集成功能
require('dotenv').config();
const {
    createAnalysisEvent,
    updateAnalysisEventStatus,
    updateAnalysisEventGeminiLink,
    completeAnalysisEvent,
    getAnalysisHistory
} = require('./supabase');

async function testSupabaseIntegration() {
    console.log('🧪 开始测试 Supabase 集成...\n');

    try {
        // 1. 测试创建分析事件
        console.log('1. 测试创建分析事件...');
        const testVideoUrl = 'https://example.com/test-video.mp4';
        const { id: eventId, error: createError } = await createAnalysisEvent(testVideoUrl);

        if (createError) {
            console.error('❌ 创建事件失败:', createError);
            return;
        }

        console.log('✅ 创建事件成功, ID:', eventId);

        // 2. 测试更新 Gemini 文件链接
        console.log('\n2. 测试更新 Gemini 文件链接...');
        const testGeminiUrl = 'https://generativelanguage.googleapis.com/v1beta/files/test-file';
        const { success: updateGeminiSuccess, error: updateGeminiError } = await updateAnalysisEventGeminiLink(eventId, testGeminiUrl);

        if (updateGeminiError) {
            console.error('❌ 更新 Gemini 链接失败:', updateGeminiError);
        } else {
            console.log('✅ 更新 Gemini 链接成功');
        }

        // 3. 测试完成分析事件
        console.log('\n3. 测试完成分析事件...');
        const testAnalysisReport = {
            text: '这是一个测试分析报告...',
            timestamp: new Date().toISOString(),
            model_used: 'gemini-2.5-flash-preview-05-20',
            original_filename: 'test-video.mp4'
        };

        const { success: completeSuccess, error: completeError } = await completeAnalysisEvent(eventId, testAnalysisReport);

        if (completeError) {
            console.error('❌ 完成分析事件失败:', completeError);
        } else {
            console.log('✅ 完成分析事件成功');
        }

        // 4. 测试获取分析历史
        console.log('\n4. 测试获取分析历史...');
        const { data: historyData, error: historyError } = await getAnalysisHistory(5);

        if (historyError) {
            console.error('❌ 获取分析历史失败:', historyError);
        } else {
            console.log('✅ 获取分析历史成功，记录数量:', historyData.length);
            if (historyData.length > 0) {
                console.log('最新记录:', {
                    id: historyData[0].id,
                    status: historyData[0].status,
                    created_at: historyData[0].created_at
                });
            }
        }

        console.log('\n🎉 所有测试完成！');

    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
    }
}

// 运行测试
if (require.main === module) {
    testSupabaseIntegration();
} 
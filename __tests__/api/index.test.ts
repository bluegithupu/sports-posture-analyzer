// API 路由集成测试套件
// 这个文件导入所有的API测试，确保它们都被执行

import './test.test';
import './analysis-history.test';
import './generate-upload-url.test';
import './submit-video-url.test';
import './results.test';
import './retry.test';

describe('API 路由集成测试套件', () => {
    it('所有API测试文件已加载', () => {
        expect(true).toBe(true);
    });
}); 
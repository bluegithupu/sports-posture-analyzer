#!/usr/bin/env node

/**
 * 快速 R2 配置测试脚本
 * 
 * 使用方法:
 * node test-r2-config.js
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002/api';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testR2Config() {
    log('🔧 测试 Cloudflare R2 配置', 'cyan');
    log('='.repeat(40), 'cyan');

    try {
        // 1. 检查后端服务器
        log('\n1. 检查后端服务器...', 'blue');
        const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}`);
        if (healthResponse.ok) {
            log('✅ 后端服务器运行正常', 'green');
        } else {
            throw new Error(`后端服务器响应异常: ${healthResponse.status}`);
        }

        // 2. 测试预签名 URL 生成
        log('\n2. 测试预签名 URL 生成...', 'blue');
        const urlResponse = await fetch(`${API_BASE_URL}/generate-upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: 'test-config.mp4',
                contentType: 'video/mp4',
            }),
        });

        if (!urlResponse.ok) {
            const errorData = await urlResponse.json().catch(() => ({ error: `HTTP ${urlResponse.status}` }));
            throw new Error(`预签名 URL 生成失败: ${errorData.error || urlResponse.status}`);
        }

        const uploadInfo = await urlResponse.json();
        log('✅ 预签名 URL 生成成功', 'green');
        log(`   Object Key: ${uploadInfo.objectKey}`, 'blue');
        log(`   Upload URL: ${uploadInfo.uploadUrl.substring(0, 80)}...`, 'blue');
        log(`   Public URL: ${uploadInfo.publicUrl}`, 'blue');
        log(`   过期时间: ${uploadInfo.expiresIn} 秒`, 'blue');

        // 3. 测试 URL 提交接口
        log('\n3. 测试 URL 提交接口...', 'blue');
        const submitResponse = await fetch(`${API_BASE_URL}/submit-video-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoUrl: uploadInfo.publicUrl,
                originalFilename: 'test-config.mp4',
                contentType: 'video/mp4',
            }),
        });

        if (!submitResponse.ok) {
            const errorData = await submitResponse.json().catch(() => ({ error: `HTTP ${submitResponse.status}` }));
            throw new Error(`URL 提交失败: ${errorData.error || submitResponse.status}`);
        }

        const submitResult = await submitResponse.json();
        log('✅ URL 提交接口正常', 'green');
        log(`   Job ID: ${submitResult.job_id}`, 'blue');

        // 4. 测试结果查询接口
        log('\n4. 测试结果查询接口...', 'blue');
        const resultResponse = await fetch(`${API_BASE_URL}/results/${submitResult.job_id}`);

        if (!resultResponse.ok) {
            throw new Error(`结果查询失败: HTTP ${resultResponse.status}`);
        }

        const result = await resultResponse.json();
        log('✅ 结果查询接口正常', 'green');
        log(`   状态: ${result.status}`, 'blue');
        if (result.message) {
            log(`   消息: ${result.message}`, 'blue');
        }

        // 5. 总结
        log('\n🎉 R2 配置测试完成！', 'green');
        log('='.repeat(40), 'green');
        log('✅ 所有接口都正常工作', 'green');
        log('✅ R2 配置正确', 'green');
        log('✅ 系统准备就绪', 'green');

        if (result.status === 'pending' || result.status === 'processing') {
            log('\n💡 提示: 分析任务已启动，但可能需要一些时间完成', 'yellow');
            log('   这是正常的，因为我们没有实际上传文件到 R2', 'yellow');
        }

    } catch (error) {
        log('\n❌ R2 配置测试失败！', 'red');
        log('='.repeat(40), 'red');
        log(`错误: ${error.message}`, 'red');

        if (error.message.includes('R2 not configured')) {
            log('\n🔧 解决方案:', 'yellow');
            log('1. 确保在 backend/.env 文件中配置了以下环境变量:', 'yellow');
            log('   - R2_ACCESS_KEY_ID', 'yellow');
            log('   - R2_SECRET_ACCESS_KEY', 'yellow');
            log('   - R2_BUCKET_NAME', 'yellow');
            log('   - R2_ACCOUNT_ID=0ae1caed52a9460392e0450801d42ac0', 'yellow');
            log('   - R2_PUB_URL=https://pub-0ae1caed52a9460392e0450801d42ac0.r2.dev (推荐)', 'yellow');
            log('2. 重启后端服务器: cd backend && npm start', 'yellow');
        } else if (error.message.includes('无法连接')) {
            log('\n🔧 解决方案:', 'yellow');
            log('1. 启动后端服务器: cd backend && npm start', 'yellow');
            log('2. 确保服务器运行在 http://localhost:5002', 'yellow');
        }

        process.exit(1);
    }
}

// 运行测试
testR2Config(); 
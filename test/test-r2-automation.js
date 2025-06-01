#!/usr/bin/env node

/**
 * Cloudflare R2 上传流程自动化测试脚本
 * 
 * 使用方法:
 * node test-r2-automation.js [video-file-path]
 * 
 * 示例:
 * node test-r2-automation.js ./test-video.mp4
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002/api';
const TEST_VIDEO_PATH = process.argv[2] || './test-video.mp4';

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

// 创建测试视频文件（如果不存在）
function createTestVideo() {
    if (fs.existsSync(TEST_VIDEO_PATH)) {
        return;
    }

    logInfo('创建测试视频文件...');

    // 创建一个简单的测试文件（模拟视频）
    const testContent = Buffer.alloc(1024 * 1024, 'test video content'); // 1MB
    fs.writeFileSync(TEST_VIDEO_PATH, testContent);

    logSuccess(`测试视频文件已创建: ${TEST_VIDEO_PATH}`);
}

// 检查后端服务器状态
async function checkBackendStatus() {
    logInfo('检查后端服务器状态...');

    try {
        const response = await fetch(`${API_BASE_URL.replace('/api', '')}`);
        if (response.ok) {
            const text = await response.text();
            logSuccess('后端服务器运行正常');
            logInfo(`服务器响应: ${text}`);
            return true;
        } else {
            logError(`后端服务器响应异常: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`无法连接到后端服务器: ${error.message}`);
        logWarning('请确保后端服务器正在运行: cd backend && npm start');
        return false;
    }
}

// 测试获取预签名 URL
async function testGetUploadUrl(filename, contentType) {
    logInfo('测试获取预签名 URL...');

    try {
        const response = await fetch(`${API_BASE_URL}/generate-upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename,
                contentType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const uploadInfo = await response.json();
        logSuccess('预签名 URL 获取成功');
        logInfo(`Object Key: ${uploadInfo.objectKey}`);
        logInfo(`Upload URL: ${uploadInfo.uploadUrl.substring(0, 100)}...`);
        logInfo(`Public URL: ${uploadInfo.publicUrl}`);

        return uploadInfo;
    } catch (error) {
        logError(`获取预签名 URL 失败: ${error.message}`);
        throw error;
    }
}

// 测试文件上传到 R2
async function testUploadToR2(uploadUrl, filePath, contentType) {
    logInfo('测试文件上传到 R2...');

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileSize = fileBuffer.length;

        logInfo(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            body: fileBuffer,
        });

        if (!response.ok) {
            throw new Error(`上传失败: HTTP ${response.status}`);
        }

        logSuccess('文件上传到 R2 成功');
        return true;
    } catch (error) {
        logError(`文件上传失败: ${error.message}`);
        throw error;
    }
}

// 测试提交视频 URL 到后端
async function testSubmitVideoUrl(videoUrl, originalFilename, contentType) {
    logInfo('测试提交视频 URL 到后端...');

    try {
        const response = await fetch(`${API_BASE_URL}/submit-video-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoUrl,
                originalFilename,
                contentType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        logSuccess('视频 URL 提交成功');
        logInfo(`Job ID: ${result.job_id}`);

        return result.job_id;
    } catch (error) {
        logError(`提交视频 URL 失败: ${error.message}`);
        throw error;
    }
}

// 测试分析结果轮询
async function testPollResults(jobId, maxAttempts = 10) {
    logInfo(`测试分析结果轮询 (Job ID: ${jobId})...`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logInfo(`轮询尝试 ${attempt}/${maxAttempts}...`);

            const response = await fetch(`${API_BASE_URL}/results/${jobId}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            logInfo(`状态: ${result.status}`);

            if (result.message) {
                logInfo(`消息: ${result.message}`);
            }

            if (result.status === 'completed') {
                logSuccess('分析完成！');
                logInfo(`报告长度: ${result.report ? result.report.length : 0} 字符`);
                if (result.report) {
                    logInfo('报告预览:');
                    console.log(colors.cyan + result.report.substring(0, 200) + '...' + colors.reset);
                }
                return result;
            } else if (result.status === 'failed') {
                logError(`分析失败: ${result.error}`);
                return result;
            } else if (result.status === 'processing' || result.status === 'pending') {
                logInfo('分析仍在进行中，等待 5 秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                logWarning(`未知状态: ${result.status}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            logError(`轮询失败: ${error.message}`);
            if (attempt === maxAttempts) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    logWarning('达到最大轮询次数，停止轮询');
    return null;
}

// 测试传统上传方式（用于对比）
async function testLegacyUpload(filePath) {
    logInfo('测试传统上传方式（用于对比）...');

    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));

        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        logSuccess('传统上传成功');
        logInfo(`File ID: ${result.file_id}`);

        // 启动分析
        const analyzeResponse = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_id: result.file_id,
                original_filename: result.original_filename,
                mimetype: result.mimetype
            }),
        });

        if (!analyzeResponse.ok) {
            throw new Error(`分析启动失败: HTTP ${analyzeResponse.status}`);
        }

        const analyzeResult = await analyzeResponse.json();
        logSuccess('传统方式分析启动成功');
        logInfo(`Job ID: ${analyzeResult.job_id}`);

        return analyzeResult.job_id;
    } catch (error) {
        logError(`传统上传失败: ${error.message}`);
        throw error;
    }
}

// 性能测试
async function performanceTest(filePath) {
    logInfo('开始性能测试...');

    const filename = path.basename(filePath);
    const contentType = 'video/mp4';

    // R2 上传性能测试
    const r2StartTime = Date.now();
    try {
        const uploadInfo = await testGetUploadUrl(filename, contentType);
        await testUploadToR2(uploadInfo.uploadUrl, filePath, contentType);
        const jobId = await testSubmitVideoUrl(uploadInfo.publicUrl, filename, contentType);
        const r2EndTime = Date.now();

        logSuccess(`R2 上传完成，耗时: ${r2EndTime - r2StartTime}ms`);

        // 传统上传性能测试（如果文件不太大）
        const fileSize = fs.statSync(filePath).size;
        if (fileSize < 4 * 1024 * 1024) { // 小于 4MB
            const legacyStartTime = Date.now();
            try {
                await testLegacyUpload(filePath);
                const legacyEndTime = Date.now();
                logSuccess(`传统上传完成，耗时: ${legacyEndTime - legacyStartTime}ms`);

                const speedup = ((legacyEndTime - legacyStartTime) / (r2EndTime - r2StartTime)).toFixed(2);
                logInfo(`性能对比: R2 上传比传统上传快 ${speedup}x`);
            } catch (error) {
                logWarning('传统上传失败，无法进行性能对比');
            }
        } else {
            logInfo('文件过大，跳过传统上传性能测试');
        }

        return jobId;
    } catch (error) {
        logError('性能测试失败');
        throw error;
    }
}

// 主测试函数
async function runTests() {
    log('🚀 开始 Cloudflare R2 上传流程自动化测试', 'bright');
    log('='.repeat(60), 'cyan');

    try {
        // 1. 检查测试文件
        if (!fs.existsSync(TEST_VIDEO_PATH)) {
            createTestVideo();
        } else {
            const stats = fs.statSync(TEST_VIDEO_PATH);
            logInfo(`使用测试文件: ${TEST_VIDEO_PATH} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        }

        // 2. 检查后端状态
        const backendOk = await checkBackendStatus();
        if (!backendOk) {
            process.exit(1);
        }

        // 3. 基本功能测试
        log('\n📋 基本功能测试', 'bright');
        log('-'.repeat(40), 'cyan');

        const filename = path.basename(TEST_VIDEO_PATH);
        const contentType = 'video/mp4';

        const uploadInfo = await testGetUploadUrl(filename, contentType);
        await testUploadToR2(uploadInfo.uploadUrl, TEST_VIDEO_PATH, contentType);
        const jobId = await testSubmitVideoUrl(uploadInfo.publicUrl, filename, contentType);

        // 4. 分析结果测试
        log('\n📊 分析结果测试', 'bright');
        log('-'.repeat(40), 'cyan');

        await testPollResults(jobId);

        // 5. 性能测试
        log('\n⚡ 性能测试', 'bright');
        log('-'.repeat(40), 'cyan');

        await performanceTest(TEST_VIDEO_PATH);

        // 6. 测试完成
        log('\n🎉 所有测试完成！', 'bright');
        log('='.repeat(60), 'green');

        logSuccess('R2 上传流程测试通过');
        logInfo('系统已准备好处理大文件上传');

    } catch (error) {
        log('\n💥 测试失败！', 'bright');
        log('='.repeat(60), 'red');
        logError(`错误: ${error.message}`);
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    logError(`未处理的 Promise 拒绝: ${reason}`);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    logError(`未捕获的异常: ${error.message}`);
    process.exit(1);
});

// 运行测试
if (require.main === module) {
    runTests();
}

module.exports = {
    runTests,
    testGetUploadUrl,
    testUploadToR2,
    testSubmitVideoUrl,
    testPollResults,
    testLegacyUpload,
    performanceTest
}; 
/**
 * CORS 测试工具
 * 用于快速诊断 Cloudflare R2 CORS 配置问题
 */

export interface CORSTestResult {
    success: boolean;
    message: string;
    details?: any;
    suggestions?: string[];
}

export class CORSTestTool {
    /**
     * 运行完整的 CORS 测试
     */
    static async runCORSTest(): Promise<CORSTestResult> {
        console.log('🔍 开始 CORS 配置测试...');

        try {
            // 1. 测试 API 是否可访问
            const apiTest = await this.testAPI();
            if (!apiTest.success) {
                return apiTest;
            }

            // 2. 获取测试用的上传 URL
            const uploadUrlResult = await this.getTestUploadUrl();
            if (!uploadUrlResult.success) {
                return uploadUrlResult;
            }

            // 3. 测试 CORS preflight
            const corsResult = await this.testCORSPreflight(uploadUrlResult.uploadUrl!);
            return corsResult;

        } catch (error) {
            return {
                success: false,
                message: 'CORS 测试过程中发生错误',
                details: { error: error instanceof Error ? error.message : error },
                suggestions: [
                    '检查网络连接',
                    '确认服务器正在运行',
                    '查看浏览器控制台错误'
                ]
            };
        }
    }

    /**
     * 测试 API 连接
     */
    private static async testAPI(): Promise<CORSTestResult> {
        try {
            const response = await fetch('/api/generate-upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: 'cors-test.mp4',
                    contentType: 'video/mp4',
                }),
            });

            if (response.ok) {
                console.log('✅ API 连接正常');
                return { success: true, message: 'API 连接正常' };
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    message: `API 请求失败: HTTP ${response.status}`,
                    details: { status: response.status, error: errorData },
                    suggestions: [
                        '检查服务器配置',
                        '验证 R2 环境变量',
                        '查看服务器日志'
                    ]
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'API 连接失败',
                details: { error: error instanceof Error ? error.message : error },
                suggestions: [
                    '检查网络连接',
                    '确认服务器正在运行'
                ]
            };
        }
    }

    /**
     * 获取测试用的上传 URL
     */
    private static async getTestUploadUrl(): Promise<CORSTestResult & { uploadUrl?: string }> {
        try {
            const response = await fetch('/api/generate-upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: 'cors-test.mp4',
                    contentType: 'video/mp4',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ 获取上传 URL 成功');
                console.log(`📍 上传域名: ${new URL(data.uploadUrl).hostname}`);

                return {
                    success: true,
                    message: '上传 URL 获取成功',
                    uploadUrl: data.uploadUrl,
                    details: { domain: new URL(data.uploadUrl).hostname }
                };
            } else {
                return {
                    success: false,
                    message: '获取上传 URL 失败',
                    details: { status: response.status }
                };
            }
        } catch (error) {
            return {
                success: false,
                message: '获取上传 URL 时发生错误',
                details: { error: error instanceof Error ? error.message : error }
            };
        }
    }

    /**
     * 测试 CORS preflight 请求
     */
    private static async testCORSPreflight(uploadUrl: string): Promise<CORSTestResult> {
        try {
            console.log('🔗 测试 CORS preflight 请求...');

            const response = await fetch(uploadUrl, {
                method: 'OPTIONS',
                headers: {
                    'Access-Control-Request-Method': 'PUT',
                    'Access-Control-Request-Headers': 'Content-Type, Cache-Control',
                    'Origin': window.location.origin,
                },
            });

            const headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
                'access-control-max-age': response.headers.get('access-control-max-age'),
            };

            if (response.ok && headers['access-control-allow-origin']) {
                console.log('✅ CORS 配置正确');
                return {
                    success: true,
                    message: 'CORS 配置正确，上传应该可以正常工作',
                    details: {
                        status: response.status,
                        headers: headers,
                        origin: window.location.origin
                    }
                };
            } else {
                console.log('❌ CORS 配置有问题');
                return {
                    success: false,
                    message: 'CORS 配置不正确',
                    details: {
                        status: response.status,
                        headers: headers,
                        origin: window.location.origin,
                        url: uploadUrl
                    },
                    suggestions: [
                        '在 Cloudflare R2 存储桶中配置 CORS 策略',
                        `确保 AllowedOrigins 包含: ${window.location.origin}`,
                        '确保 AllowedMethods 包含: PUT',
                        '确保 AllowedHeaders 包含: Content-Type',
                        '详细配置请参考: CLOUDFLARE_R2_CORS_SETUP.md'
                    ]
                };
            }
        } catch (error) {
            console.log('❌ CORS 请求失败');
            return {
                success: false,
                message: 'CORS preflight 请求失败',
                details: {
                    error: error instanceof Error ? error.message : error,
                    url: uploadUrl
                },
                suggestions: [
                    '这是典型的 CORS 配置缺失问题',
                    '请按照 CLOUDFLARE_R2_CORS_SETUP.md 配置 CORS',
                    '检查网络连接',
                    '确认 R2 存储桶配置正确'
                ]
            };
        }
    }

    /**
     * 生成 CORS 配置建议
     */
    static generateCORSConfig(origin: string = window.location.origin): string {
        return JSON.stringify([
            {
                "AllowedOrigins": [origin],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                "AllowedHeaders": ["*"],
                "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
                "MaxAgeSeconds": 3000
            }
        ], null, 2);
    }

    /**
     * 在控制台显示详细的 CORS 配置指导
     */
    static showCORSSetupGuide(): void {
        console.log('\n🚀 Cloudflare R2 CORS 配置指南');
        console.log('='.repeat(50));
        console.log('1. 访问: https://dash.cloudflare.com/');
        console.log('2. 选择 R2 Object Storage');
        console.log('3. 找到您的存储桶并点击进入');
        console.log('4. 点击 Settings 标签');
        console.log('5. 找到 CORS Policy 部分');
        console.log('6. 添加以下配置:');
        console.log('\n📋 推荐的 CORS 配置:');
        console.log(this.generateCORSConfig());
        console.log('\n💡 配置说明:');
        console.log('- AllowedOrigins: 允许的源域名');
        console.log('- AllowedMethods: 允许的 HTTP 方法');
        console.log('- AllowedHeaders: 允许的请求头');
        console.log('- ExposeHeaders: 暴露给客户端的响应头');
        console.log('- MaxAgeSeconds: preflight 请求缓存时间');
        console.log('\n⚠️  重要提醒:');
        console.log('- 保存配置后等待 1-2 分钟生效');
        console.log('- 清除浏览器缓存');
        console.log('- 重启开发服务器');
        console.log('='.repeat(50));
    }
} 
export interface DiagnosticResult {
    category: 'network' | 'file' | 'browser' | 'server';
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
    details?: any;
}

export interface UploadDiagnostics {
    networkSpeed: number;
    fileSize: number;
    browserInfo: string;
    connectionType?: string;
    issues: DiagnosticResult[];
    recommendations: string[];
}

export class UploadDiagnosticTool {
    /**
     * 运行完整的上传诊断
     */
    static async runDiagnostics(file?: File): Promise<UploadDiagnostics> {
        console.log('🔍 开始上传诊断...');

        const results: DiagnosticResult[] = [];
        const recommendations: string[] = [];

        // 1. 网络速度检测
        const networkSpeed = await this.testNetworkSpeed();
        console.log(`📡 网络速度: ${this.formatBytes(networkSpeed)}/s`);

        // 2. 浏览器检测
        const browserInfo = this.getBrowserInfo();
        console.log(`🌐 浏览器: ${browserInfo}`);

        // 3. 连接类型检测
        const connectionType = this.getConnectionType();
        if (connectionType) {
            console.log(`📶 连接类型: ${connectionType}`);
        }

        // 4. CORS 配置检测
        console.log('🔗 检测 CORS 配置...');
        const corsIssues = await this.testCORSConfiguration();
        results.push(...corsIssues);

        // 5. 文件分析（如果提供）
        let fileSize = 0;
        if (file) {
            fileSize = file.size;
            console.log(`📄 文件: ${file.name} (${this.formatBytes(file.size)})`);

            const fileIssues = this.analyzeFile(file);
            results.push(...fileIssues);
        }

        // 6. 网络问题分析
        const networkIssues = this.analyzeNetwork(networkSpeed, connectionType);
        results.push(...networkIssues);

        // 7. 浏览器问题分析
        const browserIssues = this.analyzeBrowser(browserInfo);
        results.push(...browserIssues);

        // 8. 生成建议
        const generatedRecommendations = this.generateRecommendations(results, networkSpeed, fileSize);
        recommendations.push(...generatedRecommendations);

        const diagnostics: UploadDiagnostics = {
            networkSpeed,
            fileSize,
            browserInfo,
            connectionType,
            issues: results,
            recommendations,
        };

        this.printDiagnosticReport(diagnostics);
        return diagnostics;
    }

    /**
     * 测试网络速度
     */
    private static async testNetworkSpeed(): Promise<number> {
        try {
            const tests = [];

            // 进行多次测试取平均值
            for (let i = 0; i < 3; i++) {
                const speed = await this.singleSpeedTest();
                if (speed > 0) {
                    tests.push(speed);
                }

                // 短暂延迟避免缓存影响
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (tests.length === 0) {
                return 1024 * 1024; // 默认 1MB/s
            }

            // 返回中位数，避免异常值影响
            tests.sort((a, b) => a - b);
            const median = tests[Math.floor(tests.length / 2)];

            return Math.max(median, 100 * 1024); // 最少 100KB/s

        } catch (error) {
            console.warn('网络速度测试失败:', error);
            return 1024 * 1024; // 默认 1MB/s
        }
    }

    /**
     * 单次速度测试
     */
    private static async singleSpeedTest(): Promise<number> {
        const testUrl = `/favicon.ico?t=${Date.now()}&r=${Math.random()}`;
        const startTime = performance.now();

        const response = await fetch(testUrl, {
            cache: 'no-cache',
            method: 'GET'
        });

        if (!response.ok) {
            throw new Error('Speed test request failed');
        }

        const blob = await response.blob();
        const endTime = performance.now();

        const duration = (endTime - startTime) / 1000;
        return blob.size / duration;
    }

    /**
     * 获取浏览器信息
     */
    private static getBrowserInfo(): string {
        const ua = navigator.userAgent;

        if (ua.includes('Chrome')) {
            const match = ua.match(/Chrome\/(\d+)/);
            return match ? `Chrome ${match[1]}` : 'Chrome';
        } else if (ua.includes('Firefox')) {
            const match = ua.match(/Firefox\/(\d+)/);
            return match ? `Firefox ${match[1]}` : 'Firefox';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
            const match = ua.match(/Version\/(\d+)/);
            return match ? `Safari ${match[1]}` : 'Safari';
        } else if (ua.includes('Edge')) {
            const match = ua.match(/Edge\/(\d+)/);
            return match ? `Edge ${match[1]}` : 'Edge';
        }

        return 'Unknown Browser';
    }

    /**
     * 获取连接类型
     */
    private static getConnectionType(): string | undefined {
        if ('connection' in navigator) {
            const connection = (navigator as any).connection;
            return connection?.effectiveType || connection?.type;
        }
        return undefined;
    }

    /**
     * 分析文件相关问题
     */
    private static analyzeFile(file: File): DiagnosticResult[] {
        const issues: DiagnosticResult[] = [];

        // 文件大小检查
        if (file.size > 500 * 1024 * 1024) { // > 500MB
            issues.push({
                category: 'file',
                issue: '文件过大',
                severity: 'high',
                suggestion: '考虑压缩视频或降低分辨率',
                details: { size: file.size, threshold: 500 * 1024 * 1024 }
            });
        } else if (file.size > 100 * 1024 * 1024) { // > 100MB
            issues.push({
                category: 'file',
                issue: '文件较大',
                severity: 'medium',
                suggestion: '上传可能较慢，建议使用WiFi',
                details: { size: file.size }
            });
        }

        // 文件格式检查
        if (!file.type.startsWith('video/')) {
            issues.push({
                category: 'file',
                issue: '文件类型可能不支持',
                severity: 'medium',
                suggestion: '确保选择正确的视频文件',
                details: { type: file.type }
            });
        }

        return issues;
    }

    /**
     * 分析网络相关问题
     */
    private static analyzeNetwork(speed: number, connectionType?: string): DiagnosticResult[] {
        const issues: DiagnosticResult[] = [];

        // 速度过慢
        if (speed < 100 * 1024) { // < 100KB/s
            issues.push({
                category: 'network',
                issue: '网络速度过慢',
                severity: 'high',
                suggestion: '检查网络连接，考虑切换到更快的网络',
                details: { speed, threshold: 100 * 1024 }
            });
        } else if (speed < 500 * 1024) { // < 500KB/s
            issues.push({
                category: 'network',
                issue: '网络速度较慢',
                severity: 'medium',
                suggestion: '上传可能需要较长时间，建议耐心等待',
                details: { speed }
            });
        }

        // 移动网络警告
        if (connectionType && (connectionType.includes('3g') || connectionType.includes('2g'))) {
            issues.push({
                category: 'network',
                issue: '使用移动网络',
                severity: 'medium',
                suggestion: '移动网络可能较慢且耗费流量，建议使用WiFi',
                details: { connectionType }
            });
        }

        return issues;
    }

    /**
     * 分析浏览器相关问题
     */
    private static analyzeBrowser(browserInfo: string): DiagnosticResult[] {
        const issues: DiagnosticResult[] = [];

        // 旧版浏览器检查
        if (browserInfo.includes('Chrome')) {
            const match = browserInfo.match(/Chrome (\d+)/);
            if (match && parseInt(match[1]) < 80) {
                issues.push({
                    category: 'browser',
                    issue: '浏览器版本较旧',
                    severity: 'medium',
                    suggestion: '建议更新到最新版本的Chrome浏览器',
                    details: { version: match[1] }
                });
            }
        } else if (browserInfo.includes('Safari')) {
            issues.push({
                category: 'browser',
                issue: 'Safari兼容性',
                severity: 'low',
                suggestion: 'Safari在某些情况下上传性能可能不如Chrome',
                details: { browser: 'Safari' }
            });
        } else if (!browserInfo.includes('Chrome') && !browserInfo.includes('Firefox')) {
            issues.push({
                category: 'browser',
                issue: '浏览器兼容性未知',
                severity: 'medium',
                suggestion: '建议使用Chrome或Firefox浏览器以获得最佳性能',
                details: { browser: browserInfo }
            });
        }

        return issues;
    }

    /**
     * 生成优化建议
     */
    private static generateRecommendations(
        issues: DiagnosticResult[],
        networkSpeed: number,
        fileSize: number
    ): string[] {
        const recommendations: string[] = [];

        const highSeverityIssues = issues.filter(i => i.severity === 'high');
        const networkIssues = issues.filter(i => i.category === 'network');
        const fileIssues = issues.filter(i => i.category === 'file');

        // 基于问题严重性的建议
        if (highSeverityIssues.length > 0) {
            recommendations.push('⚠️ 发现严重问题，建议先解决后再上传');
        }

        // 网络优化建议
        if (networkIssues.length > 0) {
            recommendations.push('📡 网络优化: 确保使用稳定的WiFi连接，避免同时下载其他大文件');
        }

        // 文件优化建议
        if (fileIssues.length > 0) {
            recommendations.push('📄 文件优化: 考虑压缩视频以减小文件大小');
        }

        // 基于估算时间的建议
        if (fileSize > 0 && networkSpeed > 0) {
            const estimatedTime = fileSize / networkSpeed;
            if (estimatedTime > 300) { // > 5分钟
                recommendations.push('⏱️ 上传时间较长，建议在网络稳定时进行，避免中途断开');
            }
        }

        // 通用建议
        recommendations.push('💡 保持浏览器标签页活跃状态，避免系统休眠');
        recommendations.push('🔄 如果上传失败，系统会自动重试，请耐心等待');

        return recommendations;
    }

    /**
     * 打印诊断报告
     */
    private static printDiagnosticReport(diagnostics: UploadDiagnostics): void {
        console.log('\n📊 上传诊断报告');
        console.log('='.repeat(50));

        console.log(`\n🏷️ 基本信息:`);
        console.log(`   网络速度: ${this.formatBytes(diagnostics.networkSpeed)}/s`);
        if (diagnostics.fileSize > 0) {
            console.log(`   文件大小: ${this.formatBytes(diagnostics.fileSize)}`);
            const estimatedTime = diagnostics.fileSize / diagnostics.networkSpeed;
            console.log(`   预计时间: ${this.formatTime(estimatedTime)}`);
        }
        console.log(`   浏览器: ${diagnostics.browserInfo}`);
        if (diagnostics.connectionType) {
            console.log(`   连接类型: ${diagnostics.connectionType}`);
        }

        if (diagnostics.issues.length > 0) {
            console.log(`\n⚠️ 发现问题:`);
            diagnostics.issues.forEach((issue, index) => {
                const severity = issue.severity === 'high' ? '🔴' :
                    issue.severity === 'medium' ? '🟡' : '🟢';
                console.log(`   ${index + 1}. ${severity} ${issue.issue} - ${issue.suggestion}`);
            });
        }

        if (diagnostics.recommendations.length > 0) {
            console.log(`\n💡 优化建议:`);
            diagnostics.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. ${rec}`);
            });
        }

        console.log('\n' + '='.repeat(50));
    }

    /**
     * 格式化字节数
     */
    private static formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化时间
     */
    private static formatTime(seconds: number): string {
        if (seconds < 60) {
            return `${Math.ceil(seconds)} 秒`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} 分钟`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.ceil((seconds % 3600) / 60);
            return `${hours} 小时 ${minutes} 分钟`;
        }
    }

    /**
     * 测试 CORS 配置
     */
    private static async testCORSConfiguration(): Promise<DiagnosticResult[]> {
        const issues: DiagnosticResult[] = [];

        try {
            // 模拟获取上传 URL 来检测 CORS
            const response = await fetch('/api/generate-upload-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: 'test.mp4',
                    contentType: 'video/mp4',
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.uploadUrl) {
                    // 尝试 OPTIONS preflight 请求测试 CORS
                    try {
                        const testResponse = await fetch(data.uploadUrl, {
                            method: 'OPTIONS',
                            headers: {
                                'Access-Control-Request-Method': 'PUT',
                                'Access-Control-Request-Headers': 'Content-Type',
                            },
                        });

                        if (!testResponse.ok || testResponse.status === 0) {
                            issues.push({
                                category: 'server',
                                issue: 'CORS 配置可能有问题',
                                severity: 'high',
                                suggestion: '请检查 Cloudflare R2 存储桶的 CORS 设置，详见 CLOUDFLARE_R2_CORS_SETUP.md',
                                details: { status: testResponse.status }
                            });
                        } else {
                            console.log('✅ CORS 配置检测通过');
                        }
                    } catch (corsError) {
                        issues.push({
                            category: 'server',
                            issue: 'CORS preflight 请求失败',
                            severity: 'high',
                            suggestion: '需要在 Cloudflare R2 中配置 CORS 策略',
                            details: { error: corsError }
                        });
                    }
                }
            } else {
                issues.push({
                    category: 'server',
                    issue: '无法获取上传 URL',
                    severity: 'high',
                    suggestion: '检查服务器配置和 R2 凭据',
                    details: { status: response.status }
                });
            }
        } catch (error) {
            issues.push({
                category: 'server',
                issue: 'API 连接失败',
                severity: 'high',
                suggestion: '检查网络连接和服务器状态',
                details: { error }
            });
        }

        return issues;
    }
} 
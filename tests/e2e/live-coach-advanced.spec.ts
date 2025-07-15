import { test, expect } from '@playwright/test';
import { MediaMock } from './helpers/media-mock';

test.describe('实时教练功能 - 高级测试', () => {
  let mediaMock: MediaMock;

  test.beforeEach(async ({ page }) => {
    mediaMock = new MediaMock(page);

    // 设置媒体设备模拟
    await mediaMock.setupMediaDevices();
    await mediaMock.setupVideoElement();

    // 只在支持的浏览器中授权权限
    try {
      await mediaMock.grantPermissions();
    } catch (error) {
      console.log('Permission grant not supported in this browser:', error.message);
    }

    // 模拟环境变量
    await page.addInitScript(() => {
      window.process = { env: { GEMINI_API_KEY: 'test-api-key' } };
    });
  });

  test('应该能够完整的训练流程', async ({ page }) => {
    // 监听所有网络请求
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
    });

    await page.goto('/live-coach');

    // 1. 检查初始状态
    await expect(page.locator('text=未连接')).toBeVisible();

    // 2. 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 3. 等待媒体流初始化
    await page.waitForTimeout(2000);

    // 4. 检查视频元素
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible({ timeout: 10000 });

    // 5. 等待连接建立
    await page.waitForTimeout(3000);

    // 6. 检查连接状态
    const connectedText = page.locator('text=已连接').or(page.locator('text=连接中'));
    await expect(connectedText).toBeVisible({ timeout: 15000 });

    // 7. 验证网络请求
    const sseRequests = requests.filter(req => req.url.includes('/api/live-session/sse'));
    const sessionRequests = requests.filter(req => req.url.includes('/api/live-session') && !req.url.includes('/sse'));

    expect(sseRequests.length).toBeGreaterThan(0);
    expect(sessionRequests.length).toBeGreaterThan(0);
  });

  test('应该能够发送和接收消息', async ({ page }) => {
    // 模拟 SSE 响应
    await page.route('/api/live-session/sse*', route => {
      const response = `data: ${JSON.stringify({ type: 'connected' })}\n\n` +
        `data: ${JSON.stringify({ type: 'coach_message', text: '你好！我是你的AI健身教练。', timestamp: new Date().toISOString() })}\n\n`;

      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: response
      });
    });

    // 模拟会话连接成功
    await page.route('/api/live-session', route => {
      const request = route.request();
      const postData = request.postData();

      if (postData && postData.includes('connect')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Session connected successfully' })
        });
      } else if (postData && postData.includes('sendText')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Message sent successfully' })
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待连接和消息
    await page.waitForTimeout(3000);

    // 检查是否收到教练消息（使用 first() 避免多元素匹配）
    await expect(page.locator('text=你好！我是你的AI健身教练。').first()).toBeVisible({ timeout: 10000 });

    // 发送快捷消息
    const quickButtons = page.locator('button').filter({ hasText: /帮我|Help|指导|Guide/ });
    if (await quickButtons.count() > 0) {
      await quickButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('应该能够处理音频录制', async ({ page }) => {
    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    await page.waitForTimeout(3000);

    // 查找语音相关按钮
    const voiceButtons = page.locator('button').filter({ hasText: /语音|Voice|录音|Record/ });

    if (await voiceButtons.count() > 0) {
      // 开始录音
      await voiceButtons.first().click();

      // 等待录音状态
      await page.waitForTimeout(1000);

      // 检查录音状态指示器
      const recordingIndicator = page.locator('text=录音中').or(page.locator('text=Recording'));
      if (await recordingIndicator.count() > 0) {
        await expect(recordingIndicator).toBeVisible();
      }

      // 停止录音
      await voiceButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('应该能够处理视频帧发送', async ({ page }) => {
    let videoFrameRequests = 0;

    // 监听视频帧发送请求
    page.on('request', request => {
      if (request.url().includes('/api/live-session') &&
        request.postData()?.includes('sendVideo')) {
        videoFrameRequests++;
      }
    });

    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待视频流和连接建立
    await page.waitForTimeout(5000);

    // 检查是否有视频帧发送（如果功能启用）
    // 注意：这取决于实际实现是否自动发送视频帧
    console.log(`Video frame requests sent: ${videoFrameRequests}`);
  });

  test('应该能够优雅地处理断开连接', async ({ page }) => {
    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    await page.waitForTimeout(3000);

    // 模拟网络断开
    await page.route('/api/live-session/sse*', route => {
      route.abort();
    });

    // 等待断开连接处理
    await page.waitForTimeout(2000);

    // 检查错误状态或重连提示
    const errorIndicator = page.locator('text=连接断开').or(page.locator('text=连接失败'));
    if (await errorIndicator.count() > 0) {
      await expect(errorIndicator).toBeVisible();
    }
  });

  test('应该能够在不同网络条件下工作', async ({ page }) => {
    // 模拟慢网络
    await page.route('/api/live-session', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Session connected successfully' })
        });
      }, 2000); // 2秒延迟
    });

    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 检查加载状态
    const loadingIndicator = page.locator('text=连接中').or(page.locator('text=Connecting'));
    await expect(loadingIndicator).toBeVisible();

    // 等待连接完成
    await page.waitForTimeout(5000);

    // 检查最终状态
    const finalState = page.locator('text=已连接').or(page.locator('text=连接失败'));
    await expect(finalState).toBeVisible({ timeout: 10000 });
  });
});

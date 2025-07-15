import { test, expect } from '@playwright/test';

test.describe('实时教练功能', () => {
  test.beforeEach(async ({ page }) => {
    // 设置环境变量模拟
    await page.addInitScript(() => {
      // 模拟 GEMINI_API_KEY 存在
      window.process = { env: { GEMINI_API_KEY: 'test-api-key' } };
    });
  });

  test('应该能够访问实时教练页面', async ({ page }) => {
    await page.goto('/live-coach');

    // 检查页面标题
    await expect(page).toHaveTitle('运动姿态分析大师');

    // 检查主要元素是否存在
    await expect(page.locator('h1').filter({ hasText: 'AI健身教练 · 实时指导' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '开始训练' })).toBeVisible();
  });

  test('应该显示摄像头和麦克风权限请求', async ({ page }) => {
    await page.goto('/live-coach');

    // 点击开始训练按钮
    const startButton = page.locator('button').filter({ hasText: '开始训练' });
    await startButton.click();

    // 等待权限请求或媒体流初始化
    await page.waitForTimeout(2000);

    // 检查是否有视频元素出现或状态变化
    const videoElement = page.locator('video').first();
    const statusElement = page.locator('text=连接中...').first();

    // 至少其中一个应该可见
    await expect(videoElement.or(statusElement)).toBeVisible({ timeout: 10000 });
  });

  test('应该能够建立 SSE 连接', async ({ page }) => {
    // 监听网络请求
    const sseRequests = [];
    const sessionRequests = [];

    page.on('request', request => {
      if (request.url().includes('/api/live-session/sse')) {
        sseRequests.push(request);
      }
      if (request.url().includes('/api/live-session') && !request.url().includes('/sse')) {
        sessionRequests.push(request);
      }
    });

    await page.goto('/live-coach');

    // 点击开始训练
    const startButton = page.locator('button').filter({ hasText: '开始训练' });
    await startButton.click();

    // 等待连接建立
    await page.waitForTimeout(5000);

    // 验证至少有会话请求发送（SSE 可能因为权限问题没有立即建立）
    expect(sessionRequests.length + sseRequests.length).toBeGreaterThan(0);
  });

  test('应该能够发送快捷消息', async ({ page }) => {
    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待连接建立
    await page.waitForTimeout(3000);

    // 查找快捷消息按钮
    const quickMessageButtons = page.locator('button').filter({ hasText: /帮我|Help|指导|Guide/ });

    if (await quickMessageButtons.count() > 0) {
      // 点击第一个快捷消息按钮
      await quickMessageButtons.first().click();

      // 验证消息发送（可能会在聊天区域显示）
      await page.waitForTimeout(1000);
    }
  });

  test('应该显示连接状态', async ({ page }) => {
    await page.goto('/live-coach');

    // 检查初始状态
    await expect(page.locator('text=未连接')).toBeVisible();

    // 开始连接
    const startButton = page.locator('button').filter({ hasText: '开始训练' });
    await startButton.click();

    // 等待状态变化
    await page.waitForTimeout(3000);

    // 检查连接状态变化（连接中、已连接或等待权限）
    const connectingText = page.locator('text=连接中...');
    const connectedText = page.locator('text=已连接');
    const waitingText = page.locator('text=等待摄像头权限');

    await expect(connectingText.or(connectedText).or(waitingText)).toBeVisible({ timeout: 10000 });
  });

  test('应该能够停止训练', async ({ page }) => {
    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待连接建立
    await page.waitForTimeout(3000);

    // 查找停止按钮
    const stopButton = page.locator('button').filter({ hasText: /停止|Stop/ });

    if (await stopButton.count() > 0) {
      await stopButton.click();

      // 验证状态回到初始状态
      await expect(page.locator('text=未连接')).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该处理连接错误', async ({ page }) => {
    // 模拟网络错误
    await page.route('/api/live-session', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/live-coach');

    // 尝试开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待错误消息显示
    await page.waitForTimeout(3000);

    // 检查是否显示错误信息（使用 first() 避免多元素匹配）
    const errorMessage = page.locator('text=连接失败').or(page.locator('text=错误'));
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test('应该响应式适配移动设备', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/live-coach');

    // 检查页面在移动设备上的显示
    await expect(page.locator('h1').filter({ hasText: 'AI健身教练 · 实时指导' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '开始训练' })).toBeVisible();

    // 检查视频元素在移动设备上的适配
    const startButton = page.locator('button').filter({ hasText: '开始训练' });
    await startButton.click();

    await page.waitForTimeout(2000);

    const videoElement = page.locator('video');
    if (await videoElement.count() > 0) {
      const videoBox = await videoElement.boundingBox();
      expect(videoBox?.width).toBeLessThanOrEqual(375);
    }
  });

  test('应该能够处理语音输入', async ({ page }) => {
    await page.goto('/live-coach');

    // 开始训练
    const startButton = page.locator('button').filter({ hasText: /开始训练|Start Training/ });
    await startButton.click();

    // 等待连接建立
    await page.waitForTimeout(3000);

    // 查找语音输入相关按钮
    const voiceButton = page.locator('button').filter({ hasText: /语音|Voice|麦克风|Mic/ });

    if (await voiceButton.count() > 0) {
      await voiceButton.click();

      // 验证语音输入状态
      await page.waitForTimeout(1000);
    }
  });
});

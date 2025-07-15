import { test, expect } from '@playwright/test';

test.describe('实时教练功能 - 核心验证', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟环境变量
    await page.addInitScript(() => {
      window.process = { env: { GEMINI_API_KEY: 'test-api-key' } };
    });
  });

  test('页面基本加载和元素验证', async ({ page }) => {
    await page.goto('/live-coach');
    
    // 验证页面标题
    await expect(page).toHaveTitle('运动姿态分析大师');
    
    // 验证主要标题
    await expect(page.getByRole('heading', { name: 'AI健身教练 · 实时指导' })).toBeVisible();
    
    // 验证开始训练按钮
    await expect(page.getByRole('button', { name: '开始训练' })).toBeVisible();
    
    // 验证初始状态
    await expect(page.getByText('未连接')).toBeVisible();
  });

  test('开始训练流程验证', async ({ page }) => {
    await page.goto('/live-coach');
    
    // 点击开始训练
    await page.getByRole('button', { name: '开始训练' }).click();
    
    // 等待状态变化
    await page.waitForTimeout(2000);
    
    // 验证状态变化（应该显示连接中或视频元素）
    const connectingStatus = page.getByText('连接中...');
    const videoElement = page.locator('video');
    
    // 至少其中一个应该可见
    const isConnectingVisible = await connectingStatus.isVisible();
    const isVideoVisible = await videoElement.isVisible();
    
    expect(isConnectingVisible || isVideoVisible).toBeTruthy();
  });

  test('网络请求验证', async ({ page }) => {
    const requests = [];
    
    // 监听网络请求
    page.on('request', request => {
      if (request.url().includes('/api/live-session')) {
        requests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    await page.goto('/live-coach');
    
    // 开始训练
    await page.getByRole('button', { name: '开始训练' }).click();
    
    // 等待请求
    await page.waitForTimeout(3000);
    
    // 验证有相关的 API 请求
    expect(requests.length).toBeGreaterThan(0);
    
    // 验证请求包含会话相关的 URL
    const hasSessionRequest = requests.some(req => 
      req.url.includes('/api/live-session') && 
      (req.url.includes('/sse') || req.method === 'POST')
    );
    expect(hasSessionRequest).toBeTruthy();
  });

  test('错误处理验证', async ({ page }) => {
    // 模拟 API 错误
    await page.route('/api/live-session', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/live-coach');
    
    // 尝试开始训练
    await page.getByRole('button', { name: '开始训练' }).click();
    
    // 等待错误处理
    await page.waitForTimeout(3000);
    
    // 验证错误状态（可能显示错误信息或回到初始状态）
    const errorElements = await page.locator('text=错误').count();
    const failedElements = await page.locator('text=失败').count();
    const disconnectedElements = await page.locator('text=未连接').count();
    
    // 至少应该有某种错误指示或回到初始状态
    expect(errorElements + failedElements + disconnectedElements).toBeGreaterThan(0);
  });

  test('响应式设计验证', async ({ page }) => {
    // 测试移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/live-coach');
    
    // 验证主要元素在移动设备上可见
    await expect(page.getByRole('heading', { name: 'AI健身教练 · 实时指导' })).toBeVisible();
    await expect(page.getByRole('button', { name: '开始训练' })).toBeVisible();
    
    // 验证页面布局适应移动设备
    const button = page.getByRole('button', { name: '开始训练' });
    const buttonBox = await button.boundingBox();
    
    // 按钮应该在视口范围内
    expect(buttonBox?.x).toBeGreaterThanOrEqual(0);
    expect(buttonBox?.x + buttonBox?.width).toBeLessThanOrEqual(375);
  });

  test('页面导航验证', async ({ page }) => {
    await page.goto('/live-coach');
    
    // 验证导航链接存在
    await expect(page.getByRole('link', { name: '实时教练' })).toBeVisible();
    await expect(page.getByRole('link', { name: '图片分析' })).toBeVisible();
    await expect(page.getByRole('link', { name: '视频分析' })).toBeVisible();
    
    // 测试导航到其他页面
    await page.getByRole('link', { name: '图片分析' }).click();
    await expect(page).toHaveURL('/');
    
    // 返回实时教练页面
    await page.goto('/live-coach');
    await expect(page.getByRole('heading', { name: 'AI健身教练 · 实时指导' })).toBeVisible();
  });

  test('使用指南内容验证', async ({ page }) => {
    await page.goto('/live-coach');
    
    // 验证使用指南部分
    await expect(page.getByRole('heading', { name: '使用指南' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '📱 权限设置' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '🎯 最佳体验' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '🗣️ 语音交流' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '⚡ 实时指导' })).toBeVisible();
    
    // 验证指南内容
    await expect(page.getByText('首次使用需要允许摄像头和麦克风权限')).toBeVisible();
    await expect(page.getByText('确保光线充足，摄像头能看到全身动作')).toBeVisible();
  });
});

import { Page } from '@playwright/test';

/**
 * 模拟媒体设备的辅助函数
 */
export class MediaMock {
  constructor(private page: Page) { }

  /**
   * 设置媒体设备模拟
   */
  async setupMediaDevices() {
    await this.page.addInitScript(() => {
      // 模拟 getUserMedia
      const mockGetUserMedia = async (_constraints: MediaStreamConstraints) => {
        // 创建模拟的 MediaStream
        const mockStream = {
          id: 'mock-stream-id',
          active: true,
          getTracks: () => [
            {
              id: 'mock-video-track',
              kind: 'video',
              label: 'Mock Video Track',
              enabled: true,
              muted: false,
              readyState: 'live',
              stop: () => { },
              addEventListener: () => { },
              removeEventListener: () => { },
              dispatchEvent: () => true,
            },
            {
              id: 'mock-audio-track',
              kind: 'audio',
              label: 'Mock Audio Track',
              enabled: true,
              muted: false,
              readyState: 'live',
              stop: () => { },
              addEventListener: () => { },
              removeEventListener: () => { },
              dispatchEvent: () => true,
            }
          ],
          getVideoTracks: () => [
            {
              id: 'mock-video-track',
              kind: 'video',
              label: 'Mock Video Track',
              enabled: true,
              muted: false,
              readyState: 'live',
              stop: () => { },
              addEventListener: () => { },
              removeEventListener: () => { },
              dispatchEvent: () => true,
            }
          ],
          getAudioTracks: () => [
            {
              id: 'mock-audio-track',
              kind: 'audio',
              label: 'Mock Audio Track',
              enabled: true,
              muted: false,
              readyState: 'live',
              stop: () => { },
              addEventListener: () => { },
              removeEventListener: () => { },
              dispatchEvent: () => true,
            }
          ],
          addEventListener: () => { },
          removeEventListener: () => { },
          dispatchEvent: () => true,
        };

        return mockStream as unknown as MediaStream;
      };

      // 替换 navigator.mediaDevices.getUserMedia
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = mockGetUserMedia;
      } else {
        (navigator as any).mediaDevices = {
          getUserMedia: mockGetUserMedia,
          enumerateDevices: async () => [
            {
              deviceId: 'mock-video-device',
              kind: 'videoinput',
              label: 'Mock Camera',
              groupId: 'mock-group-1'
            },
            {
              deviceId: 'mock-audio-device',
              kind: 'audioinput',
              label: 'Mock Microphone',
              groupId: 'mock-group-2'
            }
          ]
        };
      }

      // 模拟 MediaRecorder
      (window as any).MediaRecorder = class MockMediaRecorder {
        state = 'inactive';
        ondataavailable: ((event: any) => void) | null = null;
        onstop: ((event: any) => void) | null = null;
        onerror: ((event: any) => void) | null = null;

        constructor(_stream: MediaStream, _options?: any) {
          this.state = 'inactive';
        }

        start(_timeslice?: number) {
          this.state = 'recording';
          // 模拟数据可用事件
          setTimeout(() => {
            if (this.ondataavailable) {
              this.ondataavailable({
                data: new Blob(['mock audio data'], { type: 'audio/webm' })
              });
            }
          }, 100);
        }

        stop() {
          this.state = 'inactive';
          if (this.onstop) {
            this.onstop({});
          }
        }

        pause() {
          this.state = 'paused';
        }

        resume() {
          this.state = 'recording';
        }

        static isTypeSupported(_type: string) {
          return true;
        }
      };
    });
  }

  /**
   * 模拟权限授权
   */
  async grantPermissions() {
    await this.page.context().grantPermissions(['camera', 'microphone']);
  }

  /**
   * 模拟权限拒绝
   */
  async denyPermissions() {
    await this.page.context().clearPermissions();
  }

  /**
   * 设置视频元素的模拟源
   */
  async setupVideoElement() {
    await this.page.addInitScript(() => {
      // 重写 HTMLVideoElement 的 srcObject setter
      const originalSrcObjectDescriptor = Object.getOwnPropertyDescriptor(
        HTMLVideoElement.prototype,
        'srcObject'
      );

      Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
        set: function (stream) {
          // 模拟视频加载
          this.videoWidth = 640;
          this.videoHeight = 480;
          this.duration = Infinity;
          this.readyState = 4; // HAVE_ENOUGH_DATA

          // 触发事件
          setTimeout(() => {
            this.dispatchEvent(new Event('loadedmetadata'));
            this.dispatchEvent(new Event('canplay'));
            this.dispatchEvent(new Event('canplaythrough'));
          }, 100);

          if (originalSrcObjectDescriptor?.set) {
            originalSrcObjectDescriptor.set.call(this, stream);
          }
        },
        get: function () {
          if (originalSrcObjectDescriptor?.get) {
            return originalSrcObjectDescriptor.get.call(this);
          }
          return null;
        },
        configurable: true
      });
    });
  }
}

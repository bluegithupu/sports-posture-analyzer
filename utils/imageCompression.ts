// 图片压缩工具
// 自动压缩大图片以提升上传速度和用户体验

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  format?: 'jpeg' | 'webp' | 'png';
  enableResize?: boolean;
  enableQualityAdjust?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  dimensions: {
    original: { width: number; height: number };
    compressed: { width: number; height: number };
  };
  processingTime: number;
}

// 默认压缩配置
const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeKB: 1024, // 1MB
  format: 'jpeg',
  enableResize: true,
  enableQualityAdjust: true,
};

/**
 * 压缩单张图片
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const startTime = Date.now();
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  console.log(`开始压缩图片: ${file.name}`, {
    originalSize: formatBytes(file.size),
    config
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'));
      return;
    }

    img.onload = () => {
      try {
        const originalDimensions = { width: img.width, height: img.height };
        
        // 计算新的尺寸
        const newDimensions = calculateNewDimensions(
          img.width,
          img.height,
          config.maxWidth,
          config.maxHeight,
          config.enableResize
        );

        // 设置canvas尺寸
        canvas.width = newDimensions.width;
        canvas.height = newDimensions.height;

        // 绘制图片
        ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height);

        // 压缩图片
        compressCanvas(canvas, file, config)
          .then(compressedFile => {
            const processingTime = Date.now() - startTime;
            const compressionRatio = (1 - compressedFile.size / file.size) * 100;

            const result: CompressionResult = {
              file: compressedFile,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              compressionRatio,
              dimensions: {
                original: originalDimensions,
                compressed: newDimensions,
              },
              processingTime,
            };

            console.log(`图片压缩完成: ${file.name}`, {
              原始大小: formatBytes(result.originalSize),
              压缩后大小: formatBytes(result.compressedSize),
              压缩率: `${compressionRatio.toFixed(1)}%`,
              处理时间: `${processingTime}ms`,
              尺寸变化: `${originalDimensions.width}x${originalDimensions.height} → ${newDimensions.width}x${newDimensions.height}`
            });

            resolve(result);
          })
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error(`无法加载图片: ${file.name}`));
    };

    // 加载图片
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error(`无法读取图片文件: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 批量压缩图片
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number, currentFile: string) => void
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    
    try {
      const result = await compressImage(file, options);
      results.push(result);
    } catch (error) {
      console.error(`压缩图片失败: ${file.name}`, error);
      // 如果压缩失败，使用原始文件
      results.push({
        file,
        originalSize: file.size,
        compressedSize: file.size,
        compressionRatio: 0,
        dimensions: {
          original: { width: 0, height: 0 },
          compressed: { width: 0, height: 0 },
        },
        processingTime: 0,
      });
    }
  }
  
  return results;
}

/**
 * 计算新的图片尺寸
 */
function calculateNewDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
  enableResize: boolean
): { width: number; height: number } {
  if (!enableResize) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * 压缩Canvas到指定质量和大小
 */
async function compressCanvas(
  canvas: HTMLCanvasElement,
  originalFile: File,
  config: Required<CompressionOptions>
): Promise<File> {
  const maxSizeBytes = config.maxSizeKB * 1024;
  let quality = config.quality;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const blob = await canvasToBlob(canvas, config.format, quality);
    
    if (blob.size <= maxSizeBytes || !config.enableQualityAdjust || quality <= 0.1) {
      return new File([blob], originalFile.name, {
        type: blob.type,
        lastModified: Date.now(),
      });
    }

    // 如果文件还是太大，降低质量
    quality *= 0.8;
    attempts++;
  }

  // 如果经过多次尝试仍然太大，返回最低质量的版本
  const finalBlob = await canvasToBlob(canvas, config.format, 0.1);
  return new File([finalBlob], originalFile.name, {
    type: finalBlob.type,
    lastModified: Date.now(),
  });
}

/**
 * Canvas转Blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas转换失败'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * 格式化文件大小
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查是否需要压缩
 */
export function shouldCompress(file: File, maxSizeKB: number = 1024): boolean {
  return file.size > maxSizeKB * 1024;
}

/**
 * 获取图片信息
 */
export function getImageInfo(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('无法加载图片'));
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('无法读取文件'));
    };
    reader.readAsDataURL(file);
  });
}

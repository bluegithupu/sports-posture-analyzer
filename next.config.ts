import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 默认公共域名
      {
        protocol: 'https',
        hostname: '**.r2.dev',
        port: '',
        pathname: '/**',
      },
      // Cloudflare R2 存储域名
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
        port: '',
        pathname: '/**',
      },
      // 可能的自定义域名（根据环境变量配置）
      ...(process.env.R2_CUSTOM_DOMAIN ? [{
        protocol: 'https' as const,
        hostname: process.env.R2_CUSTOM_DOMAIN,
        port: '',
        pathname: '/**',
      }] : []),
      // 可能的公共URL域名（根据环境变量配置）
      ...(process.env.R2_PUB_URL ? (() => {
        try {
          const url = new URL(process.env.R2_PUB_URL);
          return [{
            protocol: url.protocol.slice(0, -1) as 'https' | 'http',
            hostname: url.hostname,
            port: url.port || '',
            pathname: '/**',
          }];
        } catch {
          return [];
        }
      })() : []),
    ],
    // 允许未优化的图片（用于外部图片）
    unoptimized: false,
  },
};

export default nextConfig;

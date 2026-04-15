import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@market-tracker/contracts']
};

export default nextConfig;

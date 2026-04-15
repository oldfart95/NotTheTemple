import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repositoryBasePath = '/NotTheTemple';

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: 'export',
        basePath: repositoryBasePath,
        assetPrefix: repositoryBasePath,
        trailingSlash: true
      }
    : {}),
  transpilePackages: ['@market-tracker/contracts']
};

export default nextConfig;

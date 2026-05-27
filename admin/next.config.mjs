/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  transpilePackages: ['@orkoruta/ui'],
  images: { unoptimized: true },
}

export default nextConfig

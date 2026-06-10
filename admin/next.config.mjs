/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // deshabilitado para pruebas locales — re-habilitar antes de build de producción
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
  transpilePackages: ['@orkoruta/ui'],
  images: { unoptimized: true },
}

export default nextConfig

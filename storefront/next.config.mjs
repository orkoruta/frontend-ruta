/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // deshabilitado para pruebas locales — re-habilitar antes de build de producción

  transpilePackages: ['@orkoruta/ui'],
  images: { unoptimized: true },
}

export default nextConfig

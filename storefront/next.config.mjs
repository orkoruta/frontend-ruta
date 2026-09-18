/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * El export estático se activa por variable de entorno y no a mano: estaba
   * comentado «re-habilitar antes de build de producción» y se olvidó, así que
   * el build de Render no generaba `out/` y el sitio estático quedó servido
   * desde un build viejo. En local sigue apagado (no se pone NEXT_OUTPUT_EXPORT);
   * en Render el blueprint lo pone a "1".
   */
  output: process.env.NEXT_OUTPUT_EXPORT === '1' ? 'export' : undefined,

  transpilePackages: ['@orkoruta/ui', '@orkoruta/web-shared'],
  images: { unoptimized: true },
}

export default nextConfig

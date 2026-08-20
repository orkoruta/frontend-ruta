/**
 * Código que comparten el admin y el storefront y **no** es design system.
 *
 * Estos cuatro módulos vivían duplicados en `admin/src/lib` y
 * `storefront/src/lib`, byte a byte idénticos. Todavía no habían divergido, y
 * por eso convenía moverlos ya: en cuanto alguien corrigiera un indicativo
 * telefónico o un estilo de mapa en un lado y no en el otro, empezarían a
 * separarse en silencio. Ya pasó antes con los diccionarios de estados —tres
 * copias desincronizadas y estados sin traducir en pantalla—.
 *
 * No van en `@orkoruta/ui` porque no son componentes ni tokens: son un cargador
 * de la API de Google Maps, una tabla de indicativos, utilidades de fecha y un
 * tema de mapa. Solo `map_theme` roza el design system, y separarlo del resto
 * no compensaba.
 *
 * Igual que `@orkoruta/ui`, este paquete se consume **como fuente TypeScript**
 * (`main` apunta a `src/index.ts`) y no tiene build. Es deliberado: los
 * paquetes con `dist/` enlazado por `link:` provocan carreras cuando alguien
 * recompila con los dev servers o la suite en marcha.
 *
 * Ambas apps deben listarlo en `transpilePackages` de su `next.config.mjs`.
 */

export * from './delivery_date';
export * from './google-maps';
export * from './map_theme';
export * from './phone_country_codes';

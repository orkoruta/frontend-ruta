/**
 * Indicativos telefónicos para los campos de teléfono.
 *
 * La BD guarda el teléfono como un solo texto ya con indicativo
 * (`+573201002001`), así que esta lista solo existe para armarlo en la UI: quien
 * carga un repartidor escribe el número local y elige el país, y se guarda
 * concatenado. Sin esto los números entraban a veces con indicativo y a veces
 * sin él, y dejaban de ser comparables.
 *
 * Colombia primero por ser el mercado; el resto son los países desde los que es
 * plausible que llegue un usuario. Si falta uno, se agrega aquí.
 */
/** Valor del selector cuando el país no está en la lista. */
export const OTHER_PHONE_COUNTRY = ''

export interface PhoneCountry {
  code: string
  country: string
  flag: string
}

export const PHONE_COUNTRY_CODES: PhoneCountry[] = [
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦' },
  { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+1', country: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+34', country: 'España', flag: '🇪🇸' },
  // Escape para países fuera de la lista: el número se escribe completo, con su
  // propio indicativo. Sin esta opción, un teléfono como `+49…` se reabría como
  // Colombia y al guardar quedaba `+5749…`.
  { code: OTHER_PHONE_COUNTRY, country: 'Otro país — escribe el indicativo', flag: '🌐' },
]

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRY_CODES[0]!.code

/**
 * Une indicativo y número local en el formato que se guarda.
 * Descarta todo lo que no sea dígito para que espacios, guiones o paréntesis no
 * lleguen a la BD.
 */
export function composePhone(countryCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, '')
  if (!digits) return ''

  // Con "Otro país" el indicativo ya viene escrito dentro del número: anteponer
  // otro lo dejaría inservible.
  if (countryCode === OTHER_PHONE_COUNTRY) return `+${digits}`

  return `${countryCode}${digits}`
}

/**
 * Operación inversa: parte un teléfono guardado en indicativo + número local,
 * para poder editarlo. Si no coincide con ningún indicativo conocido, devuelve
 * el número entero como local y el país por defecto — así un teléfono cargado
 * antes de esta pantalla sigue siendo editable en vez de perderse.
 */
export function splitPhone(phone: string | null | undefined): {
  countryCode: string
  localNumber: string
} {
  const value = (phone ?? '').trim()
  if (!value.startsWith('+')) {
    return { countryCode: DEFAULT_PHONE_COUNTRY, localNumber: value.replace(/\D/g, '') }
  }

  // Del indicativo más largo al más corto: `+57` no debe ganarle a `+571` si
  // alguna vez se agrega uno que lo contenga.
  const match = [...PHONE_COUNTRY_CODES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((country) => value.startsWith(country.code))

  // Empieza con `+` pero el indicativo no está en la lista: se conserva tal cual
  // en lugar de asignarle Colombia y estropearlo al guardar.
  if (!match) {
    return { countryCode: OTHER_PHONE_COUNTRY, localNumber: value }
  }

  return { countryCode: match.code, localNumber: value.slice(match.code.length).replace(/\D/g, '') }
}

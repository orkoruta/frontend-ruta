/**
 * Tipos de documento admitidos para personas en Colombia.
 *
 * La BD guarda `document_type` como texto libre y el validador compartido solo
 * exige que sea string, así que esta lista es una convención de la UI: evita que
 * el mismo documento entre como "CC", "cc" o "Cédula" y luego no se pueda
 * cruzar. Si se necesita en otra pantalla (compradores, puntos físicos), se
 * importa de aquí en vez de reescribirla.
 *
 * No incluye TI (es de menores de edad) ni NIT (identifica empresas, no
 * personas).
 */
export const PERSON_DOCUMENT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'CC', label: 'CC — Cédula de ciudadanía' },
  { value: 'CE', label: 'CE — Cédula de extranjería' },
  { value: 'PA', label: 'PA — Pasaporte' },
  { value: 'PPT', label: 'PPT — Permiso por Protección Temporal' },
  { value: 'PEP', label: 'PEP — Permiso Especial de Permanencia' },
]

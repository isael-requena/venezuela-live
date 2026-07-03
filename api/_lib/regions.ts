/**
 * Venezuelan regions (self-contained copy for the serverless function) plus a
 * best-effort region matcher. Keep aliases in sync with src/config/regions.ts.
 */

import { escapeRegExp, normalize, type Region } from './util.js'

export const REGIONS: readonly Region[] = [
  { id: 'distrito-capital', name: 'Distrito Capital', aliases: ['caracas', 'distrito capital', 'libertador', 'ccs', 'el avila', 'cota mil', 'sabana grande', 'antimano', 'la pastora', 'el junquito', 'junquito'] },
  { id: 'miranda', name: 'Miranda', aliases: ['miranda', 'los teques', 'guarenas', 'guatire', 'petare', 'baruta', 'chacao', 'el hatillo', 'charallave', 'ocumare del tuy', 'santa teresa del tuy', 'higuerote', 'barlovento', 'cua', 'san antonio de los altos', 'carrizal', 'los valles del tuy'] },
  { id: 'la-guaira', name: 'La Guaira', aliases: ['la guaira', 'vargas', 'maiquetia', 'catia la mar', 'macuto', 'naiguata', 'caraballeda', 'galipan'] },
  { id: 'zulia', name: 'Zulia', aliases: ['zulia', 'maracaibo', 'cabimas', 'lago de maracaibo', 'ciudad ojeda', 'machiques', 'santa barbara del zulia', 'san francisco', 'la canada de urdaneta', 'perija', 'mara', 'sur del lago'] },
  { id: 'carabobo', name: 'Carabobo', aliases: ['carabobo', 'valencia', 'puerto cabello', 'naguanagua', 'guacara', 'san diego', 'los guayos', 'tocuyito', 'moron', 'bejuma', 'guigue'] },
  { id: 'aragua', name: 'Aragua', aliases: ['aragua', 'maracay', 'turmero', 'la victoria', 'cagua', 'el limon', 'palo negro', 'villa de cura', 'san casimiro', 'santa rita', 'la encrucijada'] },
  { id: 'lara', name: 'Lara', aliases: ['lara', 'barquisimeto', 'cabudare', 'carora', 'el tocuyo', 'quibor', 'duaca', 'siquisique'] },
  { id: 'tachira', name: 'Táchira', aliases: ['tachira', 'san cristobal', 'rubio', 'la fria', 'san antonio del tachira', 'ureña', 'tariba', 'palmira', 'colon'] },
  { id: 'merida', name: 'Mérida', aliases: ['merida', 'el vigia', 'pico bolivar', 'tovar', 'ejido', 'lagunillas de merida', 'mucuchies', 'tabay', 'paramo'] },
  { id: 'trujillo', name: 'Trujillo', aliases: ['trujillo', 'valera', 'bocono', 'la quebrada', 'pampan', 'sabana de mendoza', 'escuque'] },
  { id: 'barinas', name: 'Barinas', aliases: ['barinas', 'barinitas', 'socopo', 'santa barbara de barinas', 'sabaneta'] },
  { id: 'portuguesa', name: 'Portuguesa', aliases: ['portuguesa', 'guanare', 'acarigua', 'araure', 'turen', 'biscucuy', 'villa bruzual'] },
  { id: 'cojedes', name: 'Cojedes', aliases: ['cojedes', 'san carlos de cojedes', 'tinaquillo', 'el baul', 'tinaco'] },
  { id: 'yaracuy', name: 'Yaracuy', aliases: ['yaracuy', 'san felipe', 'yaritagua', 'chivacoa', 'nirgua', 'cocorote'] },
  { id: 'falcon', name: 'Falcón', aliases: ['falcon', 'coro', 'punto fijo', 'paraguana', 'santa ana de coro', 'tucacas', 'chichiriviche', 'dabajuro', 'la vela de coro', 'churuguara'] },
  { id: 'guarico', name: 'Guárico', aliases: ['guarico', 'san juan de los morros', 'calabozo', 'valle de la pascua', 'zaraza', 'altagracia de orituco', 'las mercedes del llano', 'tucupido'] },
  { id: 'anzoategui', name: 'Anzoátegui', aliases: ['anzoategui', 'barcelona', 'puerto la cruz', 'el tigre', 'lecheria', 'anaco', 'cantaura', 'guanta', 'pariaguan', 'san jose de guanipa'] },
  { id: 'sucre', name: 'Sucre', aliases: ['sucre', 'cumana', 'carupano', 'guiria', 'cariaco', 'mariguitar', 'el pilar', 'irapa'] },
  { id: 'monagas', name: 'Monagas', aliases: ['monagas', 'maturin', 'caripito', 'punta de mata', 'temblador', 'caripe', 'aguasay'] },
  { id: 'nueva-esparta', name: 'Nueva Esparta', aliases: ['nueva esparta', 'margarita', 'isla de margarita', 'porlamar', 'la asuncion', 'pampatar', 'juangriego', 'coche', 'cubagua', 'el yaque', 'paraguachi'] },
  { id: 'bolivar', name: 'Bolívar', aliases: ['bolivar', 'ciudad guayana', 'puerto ordaz', 'ciudad bolivar', 'el callao', 'upata', 'santa elena de uairen', 'caroni', 'tumeremo', 'guasipati', 'caicara del orinoco', 'la paragua'] },
  { id: 'amazonas', name: 'Amazonas', aliases: ['amazonas', 'puerto ayacucho', 'san fernando de atabapo', 'maroa'] },
  { id: 'delta-amacuro', name: 'Delta Amacuro', aliases: ['delta amacuro', 'tucupita', 'pedernales', 'curiapo'] },
  { id: 'apure', name: 'Apure', aliases: ['apure', 'san fernando de apure', 'guasdualito', 'biruaca', 'achaguas', 'elorza', 'el amparo'] },
  { id: 'dependencias-federales', name: 'Dependencias Federales', aliases: ['dependencias federales', 'los roques', 'la tortuga', 'la orchila', 'isla de aves', 'los monjes', 'la blanquilla'] },
] as const

const ALIAS_INDEX: ReadonlyArray<{ readonly region: Region; readonly alias: string }> = REGIONS.flatMap(
  (region) => region.aliases.map((alias) => ({ region, alias: normalize(alias) })),
)

/** Infer the most likely region mentioned in free text (longest alias wins). */
export function inferRegionId(text: string): string | null {
  const haystack = normalize(text)
  let best: { id: string; length: number } | null = null
  for (const { region, alias } of ALIAS_INDEX) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`)
    if (pattern.test(haystack) && (best === null || alias.length > best.length)) {
      best = { id: region.id, length: alias.length }
    }
  }
  return best?.id ?? null
}

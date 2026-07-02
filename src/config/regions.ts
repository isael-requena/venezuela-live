/**
 * Catalog of Venezuelan states with their approximate centroid and a set of
 * lowercase aliases (capital city, common spellings) used to infer the region
 * a news headline refers to. This is a best-effort, client-side heuristic — no
 * backend or paid geocoding service is required.
 */

import type { LatLngTuple } from 'leaflet'

export interface Region {
  /** Stable identifier (kebab-case, ASCII). */
  readonly id: string
  /** Display name in Spanish. */
  readonly name: string
  /** Approximate geographic centroid. */
  readonly coordinates: LatLngTuple
  /** Lowercase, accent-free terms that map a free-text mention to this region. */
  readonly aliases: readonly string[]
}

export const VENEZUELA_REGIONS: readonly Region[] = [
  { id: 'distrito-capital', name: 'Distrito Capital', coordinates: [10.5, -66.92], aliases: ['caracas', 'distrito capital', 'libertador', 'ccs', 'el avila', 'cota mil', 'sabana grande', 'antimano', 'la pastora'] },
  { id: 'miranda', name: 'Miranda', coordinates: [10.25, -66.4], aliases: ['miranda', 'los teques', 'guarenas', 'guatire', 'petare', 'baruta', 'chacao', 'el hatillo', 'charallave', 'ocumare del tuy', 'santa teresa del tuy', 'higuerote', 'barlovento', 'cua', 'san antonio de los altos', 'carrizal', 'los valles del tuy'] },
  { id: 'la-guaira', name: 'La Guaira', coordinates: [10.6, -66.93], aliases: ['la guaira', 'vargas', 'maiquetia', 'catia la mar', 'macuto', 'naiguata', 'caraballeda', 'el junquito'] },
  { id: 'zulia', name: 'Zulia', coordinates: [10.4, -71.8], aliases: ['zulia', 'maracaibo', 'cabimas', 'lago de maracaibo', 'ciudad ojeda', 'machiques', 'santa barbara del zulia', 'san francisco', 'la canada de urdaneta', 'perija', 'mara', 'sur del lago'] },
  { id: 'carabobo', name: 'Carabobo', coordinates: [10.18, -68.0], aliases: ['carabobo', 'valencia', 'puerto cabello', 'naguanagua', 'guacara', 'san diego', 'los guayos', 'tocuyito', 'moron', 'bejuma', 'guigue'] },
  { id: 'aragua', name: 'Aragua', coordinates: [10.18, -67.4], aliases: ['aragua', 'maracay', 'turmero', 'la victoria', 'cagua', 'el limon', 'palo negro', 'villa de cura', 'san casimiro', 'santa rita', 'la encrucijada'] },
  { id: 'lara', name: 'Lara', coordinates: [10.05, -69.35], aliases: ['lara', 'barquisimeto', 'cabudare', 'carora', 'el tocuyo', 'quibor', 'duaca', 'siquisique'] },
  { id: 'tachira', name: 'Táchira', coordinates: [7.77, -72.22], aliases: ['tachira', 'san cristobal', 'rubio', 'la fria', 'san antonio del tachira', 'ureña', 'tariba', 'palmira', 'colon'] },
  { id: 'merida', name: 'Mérida', coordinates: [8.6, -71.15], aliases: ['merida', 'el vigia', 'pico bolivar', 'tovar', 'ejido', 'lagunillas de merida', 'mucuchies', 'tabay', 'paramo'] },
  { id: 'trujillo', name: 'Trujillo', coordinates: [9.37, -70.43], aliases: ['trujillo', 'valera', 'bocono', 'la quebrada', 'pampan', 'sabana de mendoza', 'escuque'] },
  { id: 'barinas', name: 'Barinas', coordinates: [8.62, -70.2], aliases: ['barinas', 'barinitas', 'socopo', 'santa barbara de barinas', 'sabaneta'] },
  { id: 'portuguesa', name: 'Portuguesa', coordinates: [9.05, -69.75], aliases: ['portuguesa', 'guanare', 'acarigua', 'araure', 'turen', 'biscucuy', 'villa bruzual'] },
  { id: 'cojedes', name: 'Cojedes', coordinates: [9.38, -68.6], aliases: ['cojedes', 'san carlos de cojedes', 'tinaquillo', 'el baul', 'tinaco'] },
  { id: 'yaracuy', name: 'Yaracuy', coordinates: [10.34, -68.74], aliases: ['yaracuy', 'san felipe', 'yaritagua', 'chivacoa', 'nirgua', 'cocorote'] },
  { id: 'falcon', name: 'Falcón', coordinates: [11.18, -69.85], aliases: ['falcon', 'coro', 'punto fijo', 'paraguana', 'santa ana de coro', 'tucacas', 'chichiriviche', 'dabajuro', 'la vela de coro', 'churuguara'] },
  { id: 'guarico', name: 'Guárico', coordinates: [8.75, -66.3], aliases: ['guarico', 'san juan de los morros', 'calabozo', 'valle de la pascua', 'zaraza', 'altagracia de orituco', 'las mercedes del llano', 'tucupido'] },
  { id: 'anzoategui', name: 'Anzoátegui', coordinates: [9.3, -64.6], aliases: ['anzoategui', 'barcelona', 'puerto la cruz', 'el tigre', 'lecheria', 'anaco', 'cantaura', 'guanta', 'pariaguan', 'san jose de guanipa'] },
  { id: 'sucre', name: 'Sucre', coordinates: [10.45, -63.6], aliases: ['sucre', 'cumana', 'carupano', 'guiria', 'cariaco', 'mariguitar', 'el pilar', 'irapa'] },
  { id: 'monagas', name: 'Monagas', coordinates: [9.4, -63.0], aliases: ['monagas', 'maturin', 'caripito', 'punta de mata', 'temblador', 'caripe', 'aguasay'] },
  { id: 'nueva-esparta', name: 'Nueva Esparta', coordinates: [11.0, -63.9], aliases: ['nueva esparta', 'margarita', 'isla de margarita', 'porlamar', 'la asuncion', 'pampatar', 'juangriego', 'coche', 'cubagua', 'el yaque', 'paraguachi'] },
  { id: 'bolivar', name: 'Bolívar', coordinates: [6.5, -63.0], aliases: ['bolivar', 'ciudad guayana', 'puerto ordaz', 'ciudad bolivar', 'el callao', 'upata', 'santa elena de uairen', 'caroni', 'tumeremo', 'guasipati', 'caicara del orinoco', 'la paragua'] },
  { id: 'amazonas', name: 'Amazonas', coordinates: [3.5, -66.0], aliases: ['amazonas', 'puerto ayacucho', 'san fernando de atabapo', 'maroa'] },
  { id: 'delta-amacuro', name: 'Delta Amacuro', coordinates: [9.0, -61.4], aliases: ['delta amacuro', 'tucupita', 'pedernales', 'curiapo'] },
  { id: 'apure', name: 'Apure', coordinates: [7.1, -68.4], aliases: ['apure', 'san fernando de apure', 'guasdualito', 'biruaca', 'achaguas', 'elorza', 'el amparo'] },
  { id: 'dependencias-federales', name: 'Dependencias Federales', coordinates: [11.85, -66.75], aliases: ['dependencias federales', 'los roques', 'la tortuga', 'la orchila', 'isla de aves', 'los monjes', 'la blanquilla'] },
] as const

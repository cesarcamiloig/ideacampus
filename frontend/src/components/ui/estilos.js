// Sistema visual de GENNOVA (tomado del Plan de Trabajo, HU-20).
// Paleta UFPS únicamente: rojo `ufps` para acción principal, foco, selección y error;
// grises `slate-*` / `superficie` para estructura; blanco y negro. Sin colores pastel.
// Estas clases se reutilizan en toda la app para que Tailwind genere un solo CSS compacto.

export const FOCO = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
export const PRESION =
    "transition-[transform,background-color,color,box-shadow] duration-150 ease-out-suave active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"

// ---------------------------------------------------------------------------
// Superficies
// ---------------------------------------------------------------------------

export const TARJETA = "rounded-2xl border border-slate-200 bg-white shadow-sm"
export const TARJETA_PADDING = "p-5 sm:p-6"
// Franja superior de una tarjeta (como el encabezado de cada hito)
export const TARJETA_CABECERA = "border-b border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6"
// Bloque interno gris dentro de una tarjeta (datos, resúmenes)
export const BLOQUE = "rounded-xl border border-slate-200 bg-slate-50 p-4"
export const BLOQUE_SUAVE = "rounded-xl bg-slate-50 p-4"

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

// Rótulo pequeño en mayúsculas sobre un título ("Plan de trabajo", "Hito 1")
export const SECCION = "text-[11px] font-bold uppercase tracking-wider text-ufps"
export const ROTULO = "text-[11px] font-bold uppercase tracking-wider text-slate-500"
export const TITULO_PAGINA = "text-xl font-bold tracking-tight text-slate-900"
export const TITULO_TARJETA = "text-lg font-semibold tracking-tight text-slate-900"
export const TITULO_BLOQUE = "text-base font-semibold text-slate-900"
export const DESCRIPCION = "text-sm leading-relaxed text-slate-600"
export const TEXTO_SUAVE = "text-xs text-slate-500"

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

// text-base en móvil: Safari de iPhone hace zoom automático en inputs con fuente menor a 16px
export const CAMPO =
    "w-full rounded-xl border border-transparent bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 placeholder:text-slate-500 transition-[box-shadow,background-color] duration-150 ease-out-suave hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-ufps disabled:cursor-not-allowed disabled:bg-superficie disabled:text-slate-500 aria-[invalid=true]:ring-ufps sm:text-sm motion-reduce:transition-none"

export const ETIQUETA = "text-xs font-semibold text-slate-700"
export const AYUDA = "text-xs text-slate-600"
export const ERROR =
    "flex items-center gap-1.5 text-xs font-medium text-ufps animate-aparecer motion-reduce:animate-desvanecer"

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------

const BOTON_BASE = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"

export const BOTON_PRIMARIO = `${BOTON_BASE} bg-ufps px-5 text-white shadow-[0_1px_2px_rgba(200,30,30,0.25)] hover:bg-ufps-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_SECUNDARIO = `${BOTON_BASE} bg-white px-4 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white disabled:active:scale-100 ${PRESION} ${FOCO}`

// Acción fuerte que no es la principal (p. ej. "Publicar", "Aprobar")
export const BOTON_OSCURO = `${BOTON_BASE} bg-slate-900 px-5 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_FANTASMA = `${BOTON_BASE} px-3 text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_PELIGRO = `${BOTON_BASE} px-3 text-ufps hover:bg-slate-900/[0.04] disabled:cursor-not-allowed disabled:text-slate-400 disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_ICONO = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:active:scale-100 ${PRESION} ${FOCO}`

// Variante compacta para barras densas (tablas, filas)
export const BOTON_ICONO_PELIGRO = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/[0.05] hover:text-ufps disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent ${PRESION} ${FOCO}`

// Enlace de texto ("Ver detalles")
export const ENLACE = `inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-ufps ${FOCO}`

// ---------------------------------------------------------------------------
// Distintivos (estado): rojo sólido / negro / gris, nunca pastel
// ---------------------------------------------------------------------------

export const DISTINTIVO_BASE = "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"

export const TONOS_DISTINTIVO = {
    rojo: "bg-ufps text-white",
    oscuro: "bg-slate-800 text-white",
    gris: "bg-slate-200 text-slate-800",
    contorno: "bg-white text-slate-700 ring-1 ring-slate-300",
    alerta: "bg-white text-ufps ring-1 ring-ufps",
}

// Contador pequeño dentro de un botón o pestaña
export const CONTADOR = "rounded-full bg-ufps px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"

// ---------------------------------------------------------------------------
// Tablas
// ---------------------------------------------------------------------------

export const TABLA_CONTENEDOR = "overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
export const TABLA = "w-full min-w-full border-collapse text-left text-sm"
export const TABLA_CABECERA = "border-b border-slate-200 bg-superficie-alta"
export const TABLA_TH = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500"
export const TABLA_FILA = "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/70"
export const TABLA_TD = "px-4 py-3 align-middle text-slate-700"

// Rampa de rojos para los segmentos de la tira de pesos
export const TONOS_SEGMENTO = ["bg-red-800", "bg-red-600", "bg-red-400", "bg-red-700", "bg-red-500", "bg-red-300"]

export function tonoSegmento(index) {
    return TONOS_SEGMENTO[index % TONOS_SEGMENTO.length]
}

// ---------------------------------------------------------------------------
// Opciones seleccionables en forma de tarjeta (tipo de iniciativa, origen, rol…)
// ---------------------------------------------------------------------------

export const OPCION = `rounded-xl border bg-white p-4 text-left transition-[border-color,box-shadow,background-color] duration-150 ease-out-suave ${FOCO}`
export const OPCION_ACTIVA = "border-ufps ring-1 ring-ufps"
export const OPCION_INACTIVA = "border-slate-200 hover:border-slate-300 hover:bg-slate-50"

export function claseOpcion(seleccionada) {
    return `${OPCION} ${seleccionada ? OPCION_ACTIVA : OPCION_INACTIVA}`
}

// Zona para soltar / elegir archivos
export const ZONA_ARCHIVO = "group relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-superficie-alta p-8 text-center transition-colors hover:border-ufps focus-within:border-ufps"

// ---------------------------------------------------------------------------
// Botones compactos para filas de tabla y barras densas
// ---------------------------------------------------------------------------

const BOTON_SM_BASE = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold"

export const BOTON_PRIMARIO_SM = `${BOTON_SM_BASE} bg-ufps text-white hover:bg-ufps-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${PRESION} ${FOCO}`
export const BOTON_OSCURO_SM = `${BOTON_SM_BASE} bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${PRESION} ${FOCO}`
export const BOTON_SECUNDARIO_SM = `${BOTON_SM_BASE} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 ${PRESION} ${FOCO}`
export const BOTON_PELIGRO_SM = `${BOTON_SM_BASE} bg-white text-ufps ring-1 ring-slate-200 hover:ring-ufps disabled:cursor-not-allowed disabled:text-slate-400 ${PRESION} ${FOCO}`

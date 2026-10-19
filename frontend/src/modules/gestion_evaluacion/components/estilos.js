// Vocabulario visual del editor de rúbricas. Sin bordes de caja: los campos se
// separan por tono y el rojo UFPS queda para foco, acción principal y error.

const FOCO = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
const PRESION = "transition-[transform,background-color,color,box-shadow] duration-150 ease-out-suave active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"

// text-base en móvil: Safari de iPhone hace zoom automático en inputs con fuente menor a 16px
export const CAMPO =
    "w-full rounded-xl border border-transparent bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 placeholder:text-slate-500 transition-[box-shadow,background-color] duration-150 ease-out-suave hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-ufps aria-[invalid=true]:bg-ufps-suave aria-[invalid=true]:ring-ufps sm:text-sm motion-reduce:transition-none"

export const ETIQUETA = "text-xs font-semibold text-slate-700"
export const AYUDA = "text-xs text-slate-600"
export const ERROR = "flex items-center gap-1.5 text-xs font-medium text-ufps animate-aparecer motion-reduce:animate-desvanecer"

export const BOTON_PRIMARIO = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ufps px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(200,30,30,0.25)] hover:bg-ufps-hover disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_SECUNDARIO = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_FANTASMA = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent disabled:active:scale-100 ${PRESION} ${FOCO}`

export const BOTON_PELIGRO = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ufps hover:bg-ufps-suave ${PRESION} ${FOCO}`

export const BOTON_ICONO = `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent disabled:active:scale-100 ${PRESION} ${FOCO}`

// Rampa de rojos para los segmentos de la tira; al editar uno, los demás se atenúan
export const TONOS_SEGMENTO = ["bg-red-800", "bg-red-600", "bg-red-400", "bg-red-700", "bg-red-500", "bg-red-300"]

export function tonoSegmento(index) {
    return TONOS_SEGMENTO[index % TONOS_SEGMENTO.length]
}

import { Equal } from "lucide-react"
import { PESO_TOTAL, formatPorcentaje } from "../utils/rubricaUtils"
import { BOTON_FANTASMA, tonoSegmento } from "./estilos"

const ALTO = { lg: "h-4", sm: "h-2.5" }

// Tira de reparto: un segmento por ítem con su peso, más el espacio que falta.
// Si la suma pasa de 100, la tira se escala y una marca indica dónde termina el 100%.
export default function DistribucionPesos({
    items,
    total,
    titulo,
    tituloId,
    nombreItem,
    activoId,
    onSeleccionar,
    onRepartir,
    tamano = "lg",
}) {
    const completo = total === PESO_TOTAL
    const excedido = total > PESO_TOTAL
    const escala = Math.max(total, PESO_TOTAL)
    const falta = Math.max(PESO_TOTAL - total, 0)
    const grande = tamano === "lg"
    // Reparto global: h3 bajo el h2 de la pestaña. Criterios de un hito: h4 dentro del hito.
    const Titulo = grande ? "h3" : "h4"

    let mensaje
    if (items.length === 0) {
        mensaje = (
            <p key="vacio" className="text-sm text-slate-500">
                Agrega un {nombreItem} para empezar a repartir.
            </p>
        )
    } else if (completo) {
        mensaje = null
    } else if (excedido) {
        mensaje = (
            <p key="exceso" className="text-sm font-semibold text-ufps">
                Te pasaste {formatPorcentaje(total - PESO_TOTAL)}. Baja el peso de algún {nombreItem}.
            </p>
        )
    } else {
        mensaje = (
            <p key="falta" className="text-sm font-medium text-amber-800">
                Te falta {formatPorcentaje(falta)} por repartir
            </p>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 space-y-1">
                    <Titulo
                        id={tituloId}
                        tabIndex={-1}
                        className={`${grande ? "text-lg" : "text-sm"} font-semibold text-slate-900 focus:outline-none`}
                    >
                        {titulo}
                    </Titulo>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span
                            className={`font-bold tabular-nums transition-colors duration-200 ${grande ? "text-2xl" : "text-lg"
                                } ${completo ? "text-emerald-700" : excedido ? "text-ufps" : "text-slate-900"}`}
                        >
                            {formatPorcentaje(total)}
                            <span className="ml-1 text-sm font-medium text-slate-500">de 100%</span>
                        </span>
                        {/* Solo el reparto global se anuncia en vivo; uno por hito sería ruido en cada tecla */}
                        <div aria-live={grande ? "polite" : undefined}>{mensaje}</div>
                    </div>
                </div>
                {onRepartir && items.length > 1 && !completo && (
                    <button type="button" onClick={onRepartir} className={BOTON_FANTASMA}>
                        <Equal className="h-4 w-4" aria-hidden="true" />
                        Repartir en partes iguales
                    </button>
                )}
            </div>

            {/* La tira es visual; el total, el mensaje y la leyenda llevan la información accesible */}
            <div className="relative" aria-hidden="true">
                <div className={`flex w-full gap-[3px] ${ALTO[tamano]}`}>
                    {items.map((item, index) => {
                        const peso = Number(item.ponderacion) || 0
                        if (peso <= 0) return null
                        return (
                            <div
                                key={item._key}
                                style={{ width: `${(peso / escala) * 100}%` }}
                                className={`h-full rounded-full transition-[width,opacity] duration-150 ease-out-suave motion-reduce:transition-none ${tonoSegmento(index)} ${activoId && item._key !== activoId ? "opacity-30" : ""
                                    }`}
                            />
                        )
                    })}
                    {falta > 0 && (
                        <div
                            style={{ width: `${falta}%` }}
                            className="h-full rounded-full border-2 border-dashed border-red-200 transition-[width] duration-150 ease-out-suave motion-reduce:transition-none"
                        />
                    )}
                </div>
                {excedido && (
                    <div
                        style={{ left: `${(PESO_TOTAL / escala) * 100}%` }}
                        className="absolute -bottom-1.5 -top-1.5 w-0.5 -translate-x-1/2 rounded-full bg-slate-900"
                    />
                )}
            </div>

            {items.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {items.map((item, index) => {
                        const contenido = (
                            <>
                                <span
                                    aria-hidden="true"
                                    className={`h-2.5 w-2.5 shrink-0 rounded-full transition-opacity duration-150 ${tonoSegmento(index)} ${activoId && item._key !== activoId ? "opacity-30" : ""
                                        }`}
                                />
                                <span className="max-w-[14rem] truncate text-slate-600">
                                    {item.nombre.trim() || `${nombreItem[0].toUpperCase()}${nombreItem.slice(1)} ${index + 1}`}
                                </span>
                                <span className="font-semibold tabular-nums text-slate-900">
                                    {formatPorcentaje(item.ponderacion)}
                                </span>
                            </>
                        )
                        return (
                            <li key={item._key}>
                                {onSeleccionar ? (
                                    <button
                                        type="button"
                                        onClick={() => onSeleccionar(item._key)}
                                        className="flex min-h-8 items-center gap-2 rounded-full px-1 text-xs transition-colors duration-150 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
                                        title={`Editar el peso de ${item.nombre.trim() || `${nombreItem} ${index + 1}`}`}
                                    >
                                        {contenido}
                                    </button>
                                ) : (
                                    <span className="flex min-h-8 items-center gap-2 px-1 text-xs">{contenido}</span>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

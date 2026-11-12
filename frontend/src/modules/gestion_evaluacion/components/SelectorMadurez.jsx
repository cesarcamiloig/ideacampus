import { useState } from "react"
import { AlertCircle, ArrowRight, Gauge, Info, Loader2, RefreshCw } from "lucide-react"
import { Modal, Selector } from "../../../components/ui"
import { AYUDA, BOTON_PRIMARIO, BOTON_SECUNDARIO, ETIQUETA, FOCO, ROTULO } from "../../../components/ui/estilos"
import { INFO_NIVELES_MADUREZ, numeroNivel } from "../utils/madurezUtils"

function nombreSinCodigo(nivel) {
    return nivel?.nombre?.replace(/^M\d+:\s*/, "") || ""
}

// Escala M0-M9: rojo hasta el nivel consultado, gris el resto
function EscalaNiveles({ niveles, consultado, actual, onConsultar }) {
    const limite = numeroNivel(consultado)
    return (
        <div role="group" aria-label="Escala de niveles de madurez" className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {niveles.map((n) => {
                const alcanzado = numeroNivel(n.codigo) <= limite
                const esConsultado = n.codigo === consultado
                return (
                    <button
                        key={n.codigo}
                        type="button"
                        onClick={() => onConsultar(n.codigo)}
                        aria-pressed={esConsultado}
                        title={n.nombre}
                        className={`relative flex h-10 items-center justify-center rounded-lg text-xs font-bold transition-colors ${FOCO} ${
                            alcanzado ? "bg-ufps text-white hover:bg-ufps-hover" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        } ${esConsultado ? "ring-2 ring-slate-900 ring-offset-2" : ""}`}
                    >
                        {n.codigo}
                        {n.codigo === actual && (
                            <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-slate-900 ring-2 ring-white" aria-hidden="true" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function DialogoInfoNivel({ niveles, inicial, actual, onElegir, onClose }) {
    const [consultado, setConsultado] = useState(inicial)
    const nivel = niveles.find((n) => n.codigo === consultado)
    const info = INFO_NIVELES_MADUREZ[consultado]

    return (
        <Modal
            open
            onClose={onClose}
            icono={Gauge}
            seccion="Madurez tecnológica"
            titulo={nivel ? nivel.nombre : consultado}
            subtitulo={consultado === actual ? "Nivel actual del proyecto" : undefined}
            pie={
                <>
                    <button type="button" onClick={onClose} className={BOTON_SECUNDARIO}>
                        Cerrar
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onElegir(consultado)
                            onClose()
                        }}
                        className={BOTON_PRIMARIO}
                    >
                        Seleccionar {consultado}
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                <EscalaNiveles niveles={niveles} consultado={consultado} actual={actual} onConsultar={setConsultado} />
                <p className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-900" aria-hidden="true" />
                    Punto negro: nivel actual del proyecto ({actual}). Toca un nivel para consultarlo.
                </p>

                {info && (
                    <>
                        <div className="space-y-1.5">
                            <p className={ROTULO}>Qué significa</p>
                            <p className="text-sm leading-relaxed text-slate-700">{info.resumen}</p>
                        </div>
                        <div className="space-y-1.5">
                            <p className={ROTULO}>Evidencias esperadas</p>
                            <ul className="space-y-1.5">
                                {info.evidencias.map((ev) => (
                                    <li key={ev} className="flex items-start gap-2 text-sm text-slate-700">
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ufps" aria-hidden="true" />
                                        {ev}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    )
}

// Módulo para elegir el nivel de madurez del proyecto al calificar un hito.
// Si el evaluador deja el nivel actual, no se registra ningún cambio.
export default function SelectorMadurez({ niveles, nivelActual, valor, onChange, cargando, error, onReintentar, disabled }) {
    const [verInfo, setVerInfo] = useState(false)

    if (cargando) {
        return (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Cargando nivel de madurez…
            </div>
        )
    }

    if (error) {
        return (
            <div role="alert" className="space-y-3 rounded-xl border border-ufps bg-white p-4 text-sm text-ufps">
                <p className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {error}
                </p>
                <button type="button" onClick={onReintentar} className={BOTON_SECUNDARIO}>
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Reintentar
                </button>
            </div>
        )
    }

    const cambia = valor !== nivelActual
    const actual = niveles.find((n) => n.codigo === nivelActual)
    const opciones = niveles.map((n) => ({
        valor: n.codigo,
        texto: n.codigo === nivelActual ? `${n.nombre} (actual)` : n.nombre,
    }))

    return (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className={ETIQUETA}>Nivel de madurez tecnológica</p>
                    <p className="mt-0.5 text-xs text-slate-600">
                        Nivel actual: <span className="font-semibold text-slate-900">{nivelActual}</span>
                        {actual && ` · ${nombreSinCodigo(actual)}`}
                    </p>
                </div>
                {cambia && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ufps px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {nivelActual}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        {valor}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
                <Selector
                    valor={valor}
                    onChange={onChange}
                    opciones={opciones}
                    disabled={disabled}
                    aria-label="Nivel de madurez tecnológica"
                    className="flex-1"
                />
                <button
                    type="button"
                    onClick={() => setVerInfo(true)}
                    aria-haspopup="dialog"
                    className={`${BOTON_SECUNDARIO} shrink-0`}
                >
                    <Info className="h-4 w-4" aria-hidden="true" />
                    Ver información
                </button>
            </div>

            <p className={AYUDA} aria-live="polite">
                {cambia
                    ? `Al guardar se registrará el cambio de ${nivelActual} a ${valor} con la retroalimentación general como justificación.`
                    : "Deja el nivel actual si el proyecto no cambia de nivel con este hito."}
            </p>

            {verInfo && (
                <DialogoInfoNivel
                    niveles={niveles}
                    inicial={valor}
                    actual={nivelActual}
                    onElegir={onChange}
                    onClose={() => setVerInfo(false)}
                />
            )}
        </div>
    )
}

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, Award, ChevronDown, Loader2 } from "lucide-react"
import { useAuth } from "../../../context/AuthContext"
import { getEvaluaciones, getMisProyectosPorEvaluar } from "../services/evaluacionService"
import { BOTON_SECUNDARIO } from "../../../components/ui/estilos"
import { NOTA_MAXIMA, TIPOS_INICIATIVA, formatoFecha, formatoNota } from "../utils/evaluacionUtils"

function promedio(valores) {
    const numeros = valores.map(Number).filter(Number.isFinite)
    return numeros.length ? numeros.reduce((t, n) => t + n, 0) / numeros.length : null
}

function FilaEvaluacion({ evaluacion }) {
    return (
        <li>
            <details className="group rounded-xl border border-slate-200 bg-white [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{evaluacion.subrubrica_nombre}</p>
                        <p className="text-xs text-slate-600">Registrada el {formatoFecha(evaluacion.creado)}</p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full bg-ufps px-3 py-1 text-xs font-semibold text-white">
                        {formatoNota(evaluacion.nota_final)} / {NOTA_MAXIMA}
                    </span>
                    <ChevronDown
                        className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                        aria-hidden="true"
                    />
                </summary>
                <div className="space-y-3 border-t border-slate-100 px-4 py-3">
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-superficie-alta">
                        {evaluacion.notas.map((nota) => (
                            <li key={nota.criterio} className="space-y-0.5 px-3 py-2">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 text-sm text-slate-800">{nota.criterio_nombre}</p>
                                    <p className="shrink-0 text-sm font-semibold text-slate-900">{formatoNota(nota.nota)}</p>
                                </div>
                                {nota.comentario && (
                                    <p className="text-xs leading-relaxed text-slate-600">{nota.comentario}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                    {evaluacion.comentario && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Retroalimentación general
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                {evaluacion.comentario}
                            </p>
                        </div>
                    )}
                </div>
            </details>
        </li>
    )
}

// Evaluaciones emitidas por el evaluador, agrupadas por proyecto
export default function HistorialEvaluacionesPage() {
    const { logout } = useAuth()
    const [evaluaciones, setEvaluaciones] = useState([])
    const [proyectos, setProyectos] = useState({})
    const [cargando, setCargando] = useState(true)
    const [errorCarga, setErrorCarga] = useState("")

    const logoutRef = useRef(logout)
    useEffect(() => {
        logoutRef.current = logout
    }, [logout])

    const cargar = useCallback(async () => {
        setCargando(true)
        setErrorCarga("")
        try {
            const [lista, misProyectos] = await Promise.all([
                getEvaluaciones(),
                // Solo trae proyectos activos: los demás se muestran con su número
                getMisProyectosPorEvaluar().catch(() => []),
            ])
            setEvaluaciones(lista)
            setProyectos(Object.fromEntries(misProyectos.map((p) => [p.id, p])))
        } catch (err) {
            if (err?.status === 401) logoutRef.current?.()
            else setErrorCarga(err.message || "No se pudo cargar el historial de evaluaciones.")
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        cargar()
    }, [cargar])

    if (cargando) {
        return (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-ufps" aria-label="Cargando historial" />
            </div>
        )
    }

    if (errorCarga) {
        return (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{errorCarga}</p>
                </div>
                <button type="button" onClick={cargar} className={`${BOTON_SECUNDARIO} mt-4`}>
                    Reintentar
                </button>
            </section>
        )
    }

    const grupos = new Map()
    ;[...evaluaciones]
        .sort((a, b) => new Date(b.creado) - new Date(a.creado))
        .forEach((ev) => {
            if (!grupos.has(ev.proyecto)) grupos.set(ev.proyecto, [])
            grupos.get(ev.proyecto).push(ev)
        })
    const media = promedio(evaluaciones.map((e) => e.nota_final))

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">Evaluación de hitos</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Historial de calificaciones</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Consulta las notas y la retroalimentación que has registrado en cada hito. Para modificar una
                    evaluación, ábrela desde Iniciativas por Evaluar.
                </p>
                <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Evaluaciones emitidas</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{evaluaciones.length}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Proyectos evaluados</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{grupos.size}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Promedio de mis notas</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">
                            {media === null ? (
                                <span className="text-slate-500">—</span>
                            ) : (
                                <>
                                    {formatoNota(media)}
                                    <span className="text-sm font-semibold text-slate-500"> / {NOTA_MAXIMA}</span>
                                </>
                            )}
                        </dd>
                    </div>
                </dl>
            </section>

            {grupos.size === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <Award className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                        <div>
                            <p className="font-semibold text-slate-900">Aún no has registrado evaluaciones</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Las calificaciones que emitas en Iniciativas por Evaluar aparecerán aquí.
                            </p>
                        </div>
                    </div>
                </section>
            ) : (
                [...grupos.entries()].map(([idProyecto, lista]) => {
                    const proyecto = proyectos[idProyecto]
                    return (
                        <section
                            key={idProyecto}
                            aria-labelledby={`historial-${idProyecto}`}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <header className="border-b border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">
                                    {proyecto ? TIPOS_INICIATIVA[proyecto.tipo] || proyecto.tipo : "Proyecto"}
                                </p>
                                <h3 id={`historial-${idProyecto}`} className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                                    {proyecto?.nombre_iniciativa || `Proyecto #${idProyecto}`}
                                </h3>
                            </header>
                            <ul className="space-y-2 p-5 sm:p-6">
                                {lista.map((ev) => (
                                    <FilaEvaluacion key={ev.id} evaluacion={ev} />
                                ))}
                            </ul>
                        </section>
                    )
                })
            )}
        </div>
    )
}

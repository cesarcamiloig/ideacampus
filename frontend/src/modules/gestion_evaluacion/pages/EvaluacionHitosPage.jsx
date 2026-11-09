import { useCallback, useEffect, useRef, useState } from "react"
import {
    AlertCircle,
    ArrowLeft,
    ChevronRight,
    ClipboardCheck,
    FolderOpen,
    Loader2,
    Pencil,
    Star,
} from "lucide-react"
import { useAuth } from "../../../context/AuthContext"
import { getRubricas } from "../services/rubricaService"
import {
    getEvaluaciones,
    getMisProyectosPorEvaluar,
    getResultadosProyecto,
} from "../services/evaluacionService"
import { getEvidenciasDeProyecto } from "../../gestion_emprendimiento_2/services/evidenciaService"
import { getActividades, getPlanesTrabajo } from "../../gestion_emprendimiento_2/services/planTrabajoService"
import { useRefrescoPeriodico } from "../hooks/useRefrescoPeriodico"
import EvidenciasCargadasPanel from "../../gestion_emprendimiento_2/components/EvidenciasCargadasPanel"
import { AvisoPanel } from "../../gestion_acompaniamiento/components/panelComun"
import VistaEvaluacionHito from "../components/VistaEvaluacionHito"
import { BOTON_FANTASMA, BOTON_PRIMARIO, BOTON_SECUNDARIO } from "../components/estilos"
import {
    NOTA_MAXIMA,
    TIPOS_INICIATIVA,
    formatoFecha,
    formatoNota,
    formatoPeso,
    rubricaDelHitoCompleta,
} from "../utils/evaluacionUtils"

// ---------------------------------------------------------------------------
// Piezas comunes
// ---------------------------------------------------------------------------

function Cargando({ texto }) {
    return (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-ufps" aria-label={texto} />
        </div>
    )
}

function ErrorCarga({ mensaje, onReintentar }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{mensaje}</p>
            </div>
            <button type="button" onClick={onReintentar} className={`${BOTON_SECUNDARIO} mt-4`}>
                Reintentar
            </button>
        </section>
    )
}

function Indicador({ etiqueta, children, detalle }) {
    return (
        <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{etiqueta}</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">{children}</dd>
            {detalle && <p className="mt-0.5 text-xs text-slate-600">{detalle}</p>}
        </div>
    )
}

function BarraAvance({ hechos, total, etiqueta }) {
    const porcentaje = total > 0 ? Math.round((hechos / total) * 100) : 0
    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={hechos}
            aria-label={etiqueta}
            className="h-1.5 overflow-hidden rounded-full bg-slate-200"
        >
            <div className="h-full rounded-full bg-ufps" style={{ width: `${porcentaje}%` }} />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Lista de proyectos asignados
// ---------------------------------------------------------------------------

function TarjetaProyecto({ proyecto, onAbrir }) {
    const terminado = proyecto.hitos_totales > 0 && proyecto.hitos_evaluados >= proyecto.hitos_totales
    return (
        <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">
                        {TIPOS_INICIATIVA[proyecto.tipo] || proyecto.tipo}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900">{proyecto.nombre_iniciativa}</h3>
                    <div className="max-w-sm space-y-1.5 pt-2">
                        <BarraAvance
                            hechos={proyecto.hitos_evaluados}
                            total={proyecto.hitos_totales}
                            etiqueta={`Hitos evaluados de ${proyecto.nombre_iniciativa}`}
                        />
                        <p className="text-xs text-slate-600">
                            {proyecto.hitos_evaluados} de {proyecto.hitos_totales} hitos evaluados
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            terminado ? "bg-ufps text-white" : "bg-slate-200 text-slate-800"
                        }`}
                    >
                        {terminado ? "Evaluado" : "Por evaluar"}
                    </span>
                    <button type="button" onClick={onAbrir} className={terminado ? BOTON_SECUNDARIO : BOTON_PRIMARIO}>
                        {terminado ? "Ver evaluación" : "Evaluar"}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </li>
    )
}

function ListaProyectos({ proyectos, onAbrir }) {
    const totalHitos = proyectos.reduce((t, p) => t + p.hitos_totales, 0)
    const evaluados = proyectos.reduce((t, p) => t + Math.min(p.hitos_evaluados, p.hitos_totales), 0)

    return (
        <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">Evaluación de hitos</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Iniciativas por evaluar</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Califica cada hito de los proyectos asignados con los criterios de su rúbrica. Un hito se puede
                    evaluar cuando el equipo ya cargó sus evidencias.
                </p>
                <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                    <Indicador etiqueta="Proyectos asignados">{proyectos.length}</Indicador>
                    <Indicador etiqueta="Hitos evaluados">
                        {evaluados} de {totalHitos}
                    </Indicador>
                    <Indicador etiqueta="Hitos pendientes">{totalHitos - evaluados}</Indicador>
                </dl>
            </section>

            {proyectos.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-3">
                        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                        <div>
                            <p className="font-semibold text-slate-900">No tienes proyectos por evaluar</p>
                            <p className="mt-1 text-sm text-slate-600">
                                Aquí aparecerán los proyectos activos que la coordinación te asigne como evaluador.
                            </p>
                        </div>
                    </div>
                </section>
            ) : (
                <ul className="space-y-3">
                    {proyectos.map((proyecto) => (
                        <TarjetaProyecto key={proyecto.id} proyecto={proyecto} onAbrir={() => onAbrir(proyecto)} />
                    ))}
                </ul>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Detalle de un proyecto: un bloque por hito
// ---------------------------------------------------------------------------

function NotasCriterios({ evaluacion, hito }) {
    const escalas = Object.fromEntries((hito.criterios || []).map((c) => [c.id, c.escala_max]))
    return (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-superficie-alta">
            {evaluacion.notas.map((nota) => (
                <li key={nota.criterio} className="space-y-0.5 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm text-slate-800">{nota.criterio_nombre}</p>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">
                            {formatoNota(nota.nota)}
                            {escalas[nota.criterio] && (
                                <span className="text-xs font-medium text-slate-500"> / {escalas[nota.criterio]}</span>
                            )}
                        </p>
                    </div>
                    {nota.comentario && <p className="text-xs leading-relaxed text-slate-600">{nota.comentario}</p>}
                </li>
            ))}
        </ul>
    )
}

function SeccionHitoEvaluacion({ hito, evaluacion, resultado, totalEvidencias, onEvaluar, onEvidencias }) {
    const evaluado = Boolean(evaluacion)
    const rubricaCompleta = rubricaDelHitoCompleta(hito)
    const sinEvidencias = totalEvidencias === 0
    const puedeEvaluar = rubricaCompleta && !sinEvidencias && totalEvidencias !== null

    let motivo = ""
    if (!rubricaCompleta) motivo = "La rúbrica de este hito está incompleta: sus criterios deben sumar 100 %."
    else if (sinEvidencias) motivo = "El equipo aún no ha cargado evidencias en este hito; podrás evaluarlo cuando lo haga."

    return (
        <section
            aria-labelledby={`hito-eval-${hito.id}`}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">
                        Hito {hito.numero_hito} · Peso {formatoPeso(hito.ponderacion)}
                    </p>
                    <h3 id={`hito-eval-${hito.id}`} className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                        {hito.nombre}
                    </h3>
                </div>
                <span
                    className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        evaluado ? "bg-ufps text-white" : "bg-slate-200 text-slate-800"
                    }`}
                >
                    {evaluado ? "Evaluado" : "Sin evaluar"}
                </span>
            </header>

            <div className="p-5 sm:p-6">
                {hito.descripcion && <p className="mb-4 text-sm leading-relaxed text-slate-600">{hito.descripcion}</p>}

                {evaluado ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Mi evaluación</p>
                                <p className="text-2xl font-bold tracking-tight text-ufps">
                                    {formatoNota(evaluacion.nota_final)}
                                    <span className="text-sm font-semibold text-slate-500"> / {NOTA_MAXIMA}</span>
                                </p>
                            </div>
                            {evaluacion.creado && (
                                <p className="text-xs text-slate-600">Registrada el {formatoFecha(evaluacion.creado)}</p>
                            )}
                        </div>
                        <div className="mt-3">
                            <NotasCriterios evaluacion={evaluacion} hito={hito} />
                        </div>
                        {evaluacion.comentario && (
                            <div className="mt-3 border-t border-slate-200 pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Retroalimentación general
                                </p>
                                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                                    {evaluacion.comentario}
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        {motivo ||
                            `Califica los ${hito.criterios?.length || 0} criterios de este hito para registrar su nota.`}
                    </div>
                )}

                {resultado?.evaluado && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-600">
                        <Star className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Promedio de todos los evaluadores:{" "}
                        <span className="font-semibold text-slate-900">
                            {formatoNota(resultado.nota)} / {NOTA_MAXIMA}
                        </span>
                    </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {evaluado ? (
                        <button type="button" onClick={onEvaluar} disabled={!rubricaCompleta} className={BOTON_SECUNDARIO}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Editar evaluación
                        </button>
                    ) : (
                        <button type="button" onClick={onEvaluar} disabled={!puedeEvaluar} className={BOTON_PRIMARIO}>
                            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                            Evaluar hito
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onEvidencias}
                        aria-haspopup="dialog"
                        className={`${BOTON_SECUNDARIO} sm:ml-auto`}
                    >
                        <FolderOpen className="h-4 w-4" aria-hidden="true" />
                        Evidencias del hito
                        {totalEvidencias !== null && (
                            <span className="rounded-full bg-ufps px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                {totalEvidencias}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </section>
    )
}

function DetalleProyecto({ proyecto, onVolver, onCambio, manejarError }) {
    const [hitos, setHitos] = useState([])
    const [evaluaciones, setEvaluaciones] = useState([])
    const [resultados, setResultados] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [errorCarga, setErrorCarga] = useState("")
    const [editor, setEditor] = useState(null) // { hito, evaluacion? }
    const [aviso, setAviso] = useState(null)

    const [evidencias, setEvidencias] = useState([])
    const [cargandoEvidencias, setCargandoEvidencias] = useState(true)
    const [errorEvidencias, setErrorEvidencias] = useState("")
    const [hitoEvidencias, setHitoEvidencias] = useState(null)
    const cerrarEvidencias = useCallback(() => setHitoEvidencias(null), [])

    // Plan de trabajo del equipo (HU-20): se muestra dentro de la evaluación de cada hito
    const [planes, setPlanes] = useState([])
    const [actividades, setActividades] = useState([])
    const [cargandoPlan, setCargandoPlan] = useState(true)
    const [errorPlan, setErrorPlan] = useState("")

    // silencioso: refresco en segundo plano, sin indicadores de carga ni mensajes de error
    const cargarEvidencias = useCallback(
        async ({ silencioso = false } = {}) => {
            if (!silencioso) {
                setCargandoEvidencias(true)
                setErrorEvidencias("")
            }
            try {
                setEvidencias(await getEvidenciasDeProyecto(proyecto.id))
                setErrorEvidencias("")
            } catch (err) {
                if (!manejarError(err) && !silencioso) {
                    setErrorEvidencias(err.message || "No se pudieron cargar las evidencias.")
                }
            } finally {
                if (!silencioso) setCargandoEvidencias(false)
            }
        },
        [proyecto.id, manejarError],
    )

    const cargarPlan = useCallback(
        async ({ silencioso = false } = {}) => {
            if (!silencioso) {
                setCargandoPlan(true)
                setErrorPlan("")
            }
            try {
                const [listaPlanes, listaActividades] = await Promise.all([
                    getPlanesTrabajo({ proyecto: proyecto.id }),
                    getActividades({ proyecto: proyecto.id }),
                ])
                setPlanes(listaPlanes)
                setActividades(listaActividades)
                setErrorPlan("")
            } catch (err) {
                if (!manejarError(err) && !silencioso) {
                    setErrorPlan(err.message || "No se pudo cargar el plan de trabajo.")
                }
            } finally {
                if (!silencioso) setCargandoPlan(false)
            }
        },
        [proyecto.id, manejarError],
    )

    const cargarResultados = useCallback(() => {
        getResultadosProyecto(proyecto.id)
            .then(setResultados)
            .catch(() => {})
    }, [proyecto.id])

    const cargarBase = useCallback(async () => {
        const [rubricas, misEvaluaciones] = await Promise.all([
            getRubricas(),
            getEvaluaciones({ proyecto: proyecto.id }),
        ])
        const lista = Array.isArray(rubricas) ? rubricas : rubricas?.results || []
        const rubrica = lista.find((r) => r.tipo_iniciativa === proyecto.tipo)
        setHitos([...(rubrica?.subrubricas || [])].sort((a, b) => a.numero_hito - b.numero_hito))
        setEvaluaciones(misEvaluaciones)
    }, [proyecto.id, proyecto.tipo])

    const cargar = useCallback(async () => {
        setCargando(true)
        setErrorCarga("")
        cargarEvidencias()
        cargarPlan()
        cargarResultados()
        try {
            await cargarBase()
        } catch (err) {
            if (!manejarError(err)) setErrorCarga(err.message || "No se pudo cargar la evaluación del proyecto.")
        } finally {
            setCargando(false)
        }
    }, [cargarBase, cargarEvidencias, cargarPlan, cargarResultados, manejarError])

    useEffect(() => {
        cargar()
    }, [cargar])

    // Lo que el equipo carga (evidencias, actividades) y las notas de otros evaluadores
    // aparecen sin recargar la página
    const refrescar = useCallback(() => {
        cargarEvidencias({ silencioso: true })
        cargarPlan({ silencioso: true })
        cargarResultados()
        cargarBase().catch((err) => manejarError(err))
    }, [cargarBase, cargarEvidencias, cargarPlan, cargarResultados, manejarError])
    useRefrescoPeriodico(refrescar)

    function evidenciasDe(hito) {
        return evidencias.filter((ev) => ev.etapa === hito.id)
    }

    function planDe(hito) {
        return planes.find((p) => p.hito === hito.id) || null
    }

    function actividadesDe(plan) {
        return plan ? actividades.filter((a) => a.plan_trabajo === plan.id_plan_trabajo) : []
    }

    function alGuardar(guardada, mensaje) {
        setEvaluaciones((prev) => {
            const existe = prev.some((e) => e.id === guardada.id)
            return existe ? prev.map((e) => (e.id === guardada.id ? guardada : e)) : [...prev, guardada]
        })
        setEditor(null)
        setAviso({ tipo: "exito", titulo: mensaje })
        cargarResultados()
        onCambio()
    }

    const volver = (
        <button type="button" onClick={onVolver} className={`${BOTON_FANTASMA} -ml-3`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a los proyectos
        </button>
    )

    if (cargando) return <Cargando texto="Cargando evaluación del proyecto" />
    if (errorCarga) {
        return (
            <div className="space-y-3">
                {volver}
                <ErrorCarga mensaje={errorCarga} onReintentar={cargar} />
            </div>
        )
    }

    const evaluacionEnEdicion = editor?.evaluacion && evaluaciones.find((e) => e.id === editor.evaluacion.id)

    // Evaluar un hito abre una pantalla completa con sus evidencias y la calificación
    if (editor) {
        // El hito vigente (si la rúbrica se refrescó) o el que se abrió
        const hitoActual = hitos.find((h) => h.id === editor.hito.id) || editor.hito
        const plan = planDe(hitoActual)
        return (
            <VistaEvaluacionHito
                proyecto={proyecto}
                hito={hitoActual}
                evaluacion={evaluacionEnEdicion}
                plan={plan}
                actividades={actividadesDe(plan)}
                cargandoPlan={cargandoPlan}
                errorPlan={errorPlan}
                onReintentarPlan={() => cargarPlan()}
                evidencias={evidenciasDe(hitoActual)}
                cargandoEvidencias={cargandoEvidencias}
                errorEvidencias={errorEvidencias}
                onReintentarEvidencias={() => cargarEvidencias()}
                onGuardado={alGuardar}
                onVolver={() => setEditor(null)}
            />
        )
    }

    const misEvaluados = hitos.filter((h) => evaluaciones.some((e) => e.subrubrica === h.id)).length
    const resultadoDe = (hito) => resultados?.hitos?.find((r) => r.numero_hito === hito.numero_hito)

    return (
        <div className="space-y-6">
            {volver}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">
                    Evaluación de hitos · {TIPOS_INICIATIVA[proyecto.tipo] || proyecto.tipo}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{proyecto.nombre_iniciativa}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    Revisa las evidencias de cada hito y califica sus criterios. La nota global del proyecto pondera
                    cada hito según su peso en la rúbrica y promedia a todos los evaluadores.
                </p>
                <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                    <Indicador
                        etiqueta="Nota global"
                        detalle={resultados?.parcial && resultados?.nota_global ? "Parcial: aún hay hitos sin nota." : null}
                    >
                        {resultados?.nota_global ? (
                            <>
                                {formatoNota(resultados.nota_global)}
                                <span className="text-sm font-semibold text-slate-500"> / {NOTA_MAXIMA}</span>
                            </>
                        ) : (
                            <span className="text-slate-500">Sin nota</span>
                        )}
                    </Indicador>
                    <Indicador etiqueta="Mis hitos evaluados">
                        {misEvaluados} de {hitos.length}
                    </Indicador>
                    <Indicador etiqueta="Hitos con nota">
                        {resultados ? `${resultados.hitos_evaluados} de ${resultados.hitos_totales}` : "—"}
                    </Indicador>
                </dl>
            </section>

            <AvisoPanel aviso={aviso} onCerrar={() => setAviso(null)} />

            {hitos.length === 0 ? (
                <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
                    La rúbrica de este tipo de iniciativa aún no tiene hitos definidos. Cuando la Dirección del
                    Programa los configure podrás evaluar el proyecto.
                </section>
            ) : (
                hitos.map((hito) => {
                    const evaluacion = evaluaciones.find((e) => e.subrubrica === hito.id)
                    return (
                        <SeccionHitoEvaluacion
                            key={hito.id}
                            hito={hito}
                            evaluacion={evaluacion}
                            resultado={resultadoDe(hito)}
                            totalEvidencias={cargandoEvidencias || errorEvidencias ? null : evidenciasDe(hito).length}
                            onEvaluar={() => setEditor({ hito, evaluacion })}
                            onEvidencias={() => setHitoEvidencias(hito)}
                        />
                    )
                })
            )}


            <EvidenciasCargadasPanel
                open={Boolean(hitoEvidencias)}
                onClose={cerrarEvidencias}
                evidencias={hitoEvidencias ? evidenciasDe(hitoEvidencias) : []}
                cargando={cargandoEvidencias}
                error={errorEvidencias}
                onReintentar={() => cargarEvidencias()}
                titulo="Evidencias del hito"
                subtitulo={hitoEvidencias ? `Hito ${hitoEvidencias.numero_hito} · ${hitoEvidencias.nombre}` : ""}
                mensajeVacio="El equipo aún no ha cargado evidencias en este hito."
            />
        </div>
    )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function EvaluacionHitosPage() {
    const { logout } = useAuth()
    const [proyectos, setProyectos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [errorCarga, setErrorCarga] = useState("")
    const [seleccionado, setSeleccionado] = useState(null)

    // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
    const logoutRef = useRef(logout)
    logoutRef.current = logout

    // Devuelve true si el error ya se manejó (sesión vencida)
    const manejarError = useCallback((err) => {
        if (err?.status === 401) {
            logoutRef.current?.()
            return true
        }
        return false
    }, [])

    const cargar = useCallback(
        async ({ silencioso = false } = {}) => {
            if (!silencioso) setCargando(true)
            setErrorCarga("")
            try {
                setProyectos(await getMisProyectosPorEvaluar())
            } catch (err) {
                if (!manejarError(err) && !silencioso) {
                    setErrorCarga(err.message || "No se pudieron cargar los proyectos por evaluar.")
                }
            } finally {
                if (!silencioso) setCargando(false)
            }
        },
        [manejarError],
    )

    useEffect(() => {
        cargar()
    }, [cargar])

    // El avance de la lista se refresca en segundo plano al guardar una evaluación
    const refrescarLista = useCallback(() => cargar({ silencioso: true }), [cargar])
    useRefrescoPeriodico(refrescarLista)

    if (seleccionado) {
        return (
            <DetalleProyecto
                key={seleccionado.id}
                proyecto={seleccionado}
                onVolver={() => setSeleccionado(null)}
                onCambio={refrescarLista}
                manejarError={manejarError}
            />
        )
    }
    if (cargando) return <Cargando texto="Cargando proyectos por evaluar" />
    if (errorCarga) return <ErrorCarga mensaje={errorCarga} onReintentar={() => cargar()} />
    return <ListaProyectos proyectos={proyectos} onAbrir={setSeleccionado} />
}

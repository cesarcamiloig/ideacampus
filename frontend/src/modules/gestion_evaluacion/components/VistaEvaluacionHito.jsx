import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowLeft, CalendarDays, ClipboardList, FolderOpen, Loader2, Package, RefreshCw, User } from "lucide-react"
import EvidenciasCargadasPanel from "../../gestion_emprendimiento_2/components/EvidenciasCargadasPanel"
import FormularioEvaluacion from "./FormularioEvaluacion"
import { BOTON_FANTASMA, BOTON_SECUNDARIO } from "../../../components/ui/estilos"
import { ESTADOS_PLAN, TIPOS_INICIATIVA, formatoPeso, rangoFechas } from "../utils/evaluacionUtils"

function Contador({ valor }) {
    if (valor === null) return null
    return (
        <span className="rounded-full bg-ufps px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{valor}</span>
    )
}

function Dato({ etiqueta, icono: Icono, children }) {
    return (
        <div className="min-w-0 space-y-0.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{etiqueta}</dt>
            <dd className="flex items-start gap-1.5 text-xs text-slate-700">
                <Icono className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                <span className="min-w-0 break-words">{children}</span>
            </dd>
        </div>
    )
}

function ErrorConReintento({ mensaje, onReintentar }) {
    return (
        <div role="alert" className="space-y-3 rounded-xl border border-ufps bg-white p-3 text-xs text-ufps">
            <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {mensaje}
            </p>
            <button type="button" onClick={onReintentar} className={BOTON_SECUNDARIO}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reintentar
            </button>
        </div>
    )
}

// Misma lectura que en el plan del estudiante: realizada en rojo, pendiente en gris
function TarjetaActividad({ actividad, numero, totalEvidencias, onVerEvidencias }) {
    const completada = actividad.estado === "completada"
    return (
        <li
            className={`relative overflow-hidden rounded-xl border bg-white py-4 pl-5 pr-4 ${
                completada ? "border-ufps" : "border-slate-300"
            }`}
        >
            <span className={`absolute inset-y-0 left-0 w-1 ${completada ? "bg-ufps" : "bg-slate-400"}`} aria-hidden="true" />
            <div className="flex items-start gap-3">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                        completada ? "bg-ufps text-white" : "bg-slate-200 text-slate-800"
                    }`}
                    aria-label={`Actividad ${numero}`}
                >
                    {numero}
                </span>
                <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                        <h5 className={`text-sm font-bold leading-snug ${completada ? "text-ufps" : "text-slate-900"}`}>
                            {actividad.nombre}
                        </h5>
                        <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                completada ? "bg-ufps text-white" : "bg-slate-800 text-white"
                            }`}
                        >
                            {completada ? "Realizada" : "Pendiente"}
                        </span>
                    </div>
                    {actividad.descripcion && (
                        <p className="text-xs leading-relaxed text-slate-600">{actividad.descripcion}</p>
                    )}
                    <dl className="grid grid-cols-1 gap-2.5 rounded-lg border border-slate-100 bg-superficie-alta p-3">
                        <Dato etiqueta="Responsable" icono={User}>
                            {actividad.responsable_nombre}
                        </Dato>
                        <Dato etiqueta="Fechas" icono={CalendarDays}>
                            {rangoFechas(actividad.fecha_inicio, actividad.fecha_fin)}
                        </Dato>
                        <Dato etiqueta="Entregable" icono={Package}>
                            {actividad.entregable || <span className="text-slate-400">Sin definir</span>}
                        </Dato>
                    </dl>
                    <button type="button" onClick={onVerEvidencias} aria-haspopup="dialog" className={BOTON_SECUNDARIO}>
                        <FolderOpen className="h-4 w-4" aria-hidden="true" />
                        Ver evidencias cargadas
                        <Contador valor={totalEvidencias} />
                    </button>
                </div>
            </div>
        </li>
    )
}

function PlanDelHito({ plan, actividades, cargando, error, onReintentar, conteoEvidencias, onVerEvidencias }) {
    if (cargando) {
        return (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-ufps" aria-hidden="true" />
                Cargando plan de trabajo...
            </div>
        )
    }
    if (error) return <ErrorConReintento mensaje={error} onReintentar={onReintentar} />
    if (!plan) {
        return (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                El equipo aún no ha definido el plan de trabajo de este hito.
            </p>
        )
    }

    const estado = ESTADOS_PLAN[plan.estado] || ESTADOS_PLAN.pendiente
    const realizadas = actividades.filter((a) => a.estado === "completada").length

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 text-base font-semibold text-slate-900">{plan.titulo}</h4>
                    <span className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estado.clase}`}>
                        {estado.label}
                    </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
                </p>
                {plan.descripcion && (
                    <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-relaxed text-slate-700">
                        {plan.descripcion}
                    </p>
                )}
            </div>

            <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actividades · {realizadas} de {actividades.length} realizadas
                </h4>
                {actividades.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">El plan todavía no tiene actividades.</p>
                ) : (
                    <ul className="mt-3 space-y-3">
                        {actividades.map((actividad, indice) => (
                            <TarjetaActividad
                                key={actividad.id}
                                actividad={actividad}
                                numero={indice + 1}
                                totalEvidencias={conteoEvidencias(actividad)}
                                onVerEvidencias={() => onVerEvidencias(actividad)}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

// Pantalla completa para evaluar un hito: a un lado el plan de trabajo del equipo, al otro la calificación
export default function VistaEvaluacionHito({
    proyecto,
    hito,
    evaluacion,
    plan,
    actividades,
    cargandoPlan,
    errorPlan,
    onReintentarPlan,
    evidencias,
    cargandoEvidencias,
    errorEvidencias,
    onReintentarEvidencias,
    onGuardado,
    onVolver,
}) {
    const inicioRef = useRef(null)
    // null: panel cerrado · { actividad: null }: todas las del hito · { actividad }: solo las de esa actividad
    const [panelEvidencias, setPanelEvidencias] = useState(null)
    const cerrarEvidencias = useCallback(() => setPanelEvidencias(null), [])

    // La vista reemplaza al detalle del proyecto: se lleva al usuario al inicio
    useEffect(() => {
        inicioRef.current?.scrollIntoView({ block: "start" })
    }, [])

    const conteoEvidencias = (actividad) =>
        cargandoEvidencias || errorEvidencias ? null : evidencias.filter((ev) => ev.actividad === actividad.id).length

    const actividadPanel = panelEvidencias?.actividad
    const evidenciasPanel = actividadPanel ? evidencias.filter((ev) => ev.actividad === actividadPanel.id) : evidencias

    return (
        <div ref={inicioRef} className="scroll-mt-10 space-y-6">
            <button type="button" onClick={onVolver} className={`${BOTON_FANTASMA} -ml-3`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Volver al proyecto
            </button>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">
                    {evaluacion ? "Editar evaluación" : "Evaluar hito"} · {proyecto.nombre_iniciativa}
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                    Hito {hito.numero_hito}: {hito.nombre}
                </h2>
                {hito.descripcion && (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{hito.descripcion}</p>
                )}
                <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Peso del hito</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{formatoPeso(hito.ponderacion)}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Criterios</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">{hito.criterios?.length || 0}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3.5">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tipo de iniciativa</dt>
                        <dd className="mt-1 text-lg font-bold text-slate-900">
                            {TIPOS_INICIATIVA[proyecto.tipo] || proyecto.tipo}
                        </dd>
                    </div>
                </dl>
            </section>

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
                <section
                    aria-labelledby="plan-del-hito"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"
                >
                    <div className="mb-4 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <h3 id="plan-del-hito" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Plan de trabajo del equipo
                        </h3>
                    </div>
                    <PlanDelHito
                        plan={plan}
                        actividades={actividades}
                        cargando={cargandoPlan}
                        error={errorPlan}
                        onReintentar={onReintentarPlan}
                        conteoEvidencias={conteoEvidencias}
                        onVerEvidencias={(actividad) => setPanelEvidencias({ actividad })}
                    />
                    <div className="mt-5 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={() => setPanelEvidencias({ actividad: null })}
                            aria-haspopup="dialog"
                            className={`${BOTON_SECUNDARIO} w-full`}
                        >
                            <FolderOpen className="h-4 w-4" aria-hidden="true" />
                            Todas las evidencias del hito
                            <Contador valor={cargandoEvidencias || errorEvidencias ? null : evidencias.length} />
                        </button>
                    </div>
                </section>

                <section
                    aria-label="Calificación del hito"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3"
                >
                    <FormularioEvaluacion
                        idProyecto={proyecto.id}
                        hito={hito}
                        evaluacion={evaluacion}
                        onGuardado={onGuardado}
                        onCancelar={onVolver}
                    />
                </section>
            </div>

            <EvidenciasCargadasPanel
                open={Boolean(panelEvidencias)}
                onClose={cerrarEvidencias}
                evidencias={evidenciasPanel}
                cargando={cargandoEvidencias}
                error={errorEvidencias}
                onReintentar={onReintentarEvidencias}
                titulo={actividadPanel ? "Evidencias de la actividad" : "Evidencias del hito"}
                subtitulo={actividadPanel ? actividadPanel.nombre : `Hito ${hito.numero_hito} · ${hito.nombre}`}
                mensajeVacio={
                    actividadPanel
                        ? "El responsable aún no ha cargado evidencias en esta actividad."
                        : "El equipo aún no ha cargado evidencias en este hito."
                }
            />
        </div>
    )
}

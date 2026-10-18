import { useEffect, useMemo, useState } from "react"
import {
    AlertCircle,
    AlertTriangle,
    Calculator,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Info,
    Loader2,
    Plus,
    RotateCcw,
    Save,
    Trash2,
} from "lucide-react"
import { getRubricas, updateRubrica } from "../services/rubricaService"
import {
    ESCALA_MAX,
    ESCALA_MIN,
    PESO_TOTAL,
    TIPOS_RUBRICA,
    calcularAporte,
    calcularNotaFinal,
    crearRubricaBase,
    nuevoIdLocal,
    sumarPesos,
    validarRubrica,
} from "../utils/rubricaUtils"

// text-base en móvil: Safari de iPhone hace zoom automático en inputs con fuente menor a 16px
const INPUT_CLASS =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 aria-[invalid=true]:border-red-500"
const LABEL_CLASS = "text-xs font-semibold text-slate-700"
const ERROR_CLASS = "text-xs font-medium text-red-600"
const NOTAS = Array.from({ length: ESCALA_MAX - ESCALA_MIN + 1 }, (_, i) => ESCALA_MIN + i)

function normalizarRubrica(rubrica, tipo) {
    if (!rubrica) return crearRubricaBase(tipo)
    return {
        id_rubrica: rubrica.id_rubrica ?? null,
        tipo,
        nombre: rubrica.nombre || "",
        criterios: [...(rubrica.criterios || [])]
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((criterio) => ({
                id_criterio: criterio.id_criterio ?? nuevoIdLocal(),
                nombre: criterio.nombre || "",
                descripcion: criterio.descripcion || "",
                peso: criterio.peso ?? "",
                orden: criterio.orden,
            })),
    }
}

function rubricasPorTipo(lista) {
    const porTipo = {}
    TIPOS_RUBRICA.forEach(({ id }) => {
        const encontrada = Array.isArray(lista) ? lista.find((r) => r.tipo === id) : null
        porTipo[id] = normalizarRubrica(encontrada, id)
    })
    return porTipo
}

function construirPayload(rubrica) {
    return {
        tipo: rubrica.tipo,
        nombre: rubrica.nombre.trim(),
        criterios: rubrica.criterios.map((criterio, index) => ({
            id_criterio: String(criterio.id_criterio).startsWith("nuevo-") ? null : criterio.id_criterio,
            nombre: criterio.nombre.trim(),
            descripcion: criterio.descripcion.trim(),
            peso: Number(criterio.peso),
            orden: index + 1,
        })),
    }
}

function formatPorcentaje(valor) {
    return Number.isInteger(valor) ? `${valor}%` : `${valor.toFixed(1)}%`
}

export default function RubricasTab() {
    const [tipoActivo, setTipoActivo] = useState(TIPOS_RUBRICA[0].id)
    const [rubricas, setRubricas] = useState(null)
    const [guardadas, setGuardadas] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadWarning, setLoadWarning] = useState("")

    const [errores, setErrores] = useState({})
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null) // { tipo: "success" | "error", texto }

    const [simuladorAbierto, setSimuladorAbierto] = useState(false)
    const [notasSimuladas, setNotasSimuladas] = useState({})

    async function loadData() {
        setIsLoading(true)
        setLoadWarning("")
        try {
            const data = await getRubricas()
            const porTipo = rubricasPorTipo(Array.isArray(data) ? data : data?.data)
            setRubricas(porTipo)
            setGuardadas(porTipo)
        } catch {
            // Mientras el backend no exista se trabaja sobre una plantilla base editable
            const plantilla = rubricasPorTipo([])
            setRubricas(plantilla)
            setGuardadas(plantilla)
            setLoadWarning(
                "No se pudieron cargar las rúbricas del servidor. Se muestra una plantilla base editable."
            )
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const rubrica = rubricas?.[tipoActivo]
    const erroresActivos = errores[tipoActivo] || null
    const total = rubrica ? sumarPesos(rubrica.criterios) : 0

    const tieneCambios = useMemo(() => {
        if (!rubricas || !guardadas) return {}
        return Object.fromEntries(
            TIPOS_RUBRICA.map(({ id }) => [
                id,
                JSON.stringify(rubricas[id]) !== JSON.stringify(guardadas[id]),
            ])
        )
    }, [rubricas, guardadas])

    function actualizarRubrica(cambio) {
        setRubricas((prev) => ({ ...prev, [tipoActivo]: cambio(prev[tipoActivo]) }))
        setSaveStatus(null)
    }

    function cambiarNombre(nombre) {
        actualizarRubrica((actual) => ({ ...actual, nombre }))
    }

    function cambiarCriterio(id, campo, valor) {
        actualizarRubrica((actual) => ({
            ...actual,
            criterios: actual.criterios.map((criterio) =>
                criterio.id_criterio === id ? { ...criterio, [campo]: valor } : criterio
            ),
        }))
    }

    function agregarCriterio() {
        const restante = Math.max(PESO_TOTAL - total, 0)
        actualizarRubrica((actual) => ({
            ...actual,
            criterios: [
                ...actual.criterios,
                { id_criterio: nuevoIdLocal(), nombre: "", descripcion: "", peso: restante || "" },
            ],
        }))
    }

    function eliminarCriterio(id) {
        actualizarRubrica((actual) => ({
            ...actual,
            criterios: actual.criterios.filter((criterio) => criterio.id_criterio !== id),
        }))
    }

    function moverCriterio(index, direccion) {
        actualizarRubrica((actual) => {
            const criterios = [...actual.criterios]
            const destino = index + direccion
            if (destino < 0 || destino >= criterios.length) return actual
            ;[criterios[index], criterios[destino]] = [criterios[destino], criterios[index]]
            return { ...actual, criterios }
        })
    }

    function descartarCambios() {
        setRubricas((prev) => ({ ...prev, [tipoActivo]: guardadas[tipoActivo] }))
        setErrores((prev) => ({ ...prev, [tipoActivo]: null }))
        setSaveStatus(null)
    }

    async function guardarRubrica() {
        const validacion = validarRubrica(rubrica)
        setErrores((prev) => ({ ...prev, [tipoActivo]: validacion }))
        if (validacion) {
            setSaveStatus(null)
            return
        }

        setIsSaving(true)
        setSaveStatus(null)
        try {
            const respuesta = await updateRubrica(tipoActivo, construirPayload(rubrica))
            const actualizada = respuesta?.criterios
                ? normalizarRubrica(respuesta, tipoActivo)
                : rubrica
            setRubricas((prev) => ({ ...prev, [tipoActivo]: actualizada }))
            setGuardadas((prev) => ({ ...prev, [tipoActivo]: actualizada }))
            setSaveStatus({ tipo: "success", texto: "La rúbrica se guardó correctamente." })
        } catch (err) {
            setSaveStatus({
                tipo: "error",
                texto: err.message || "No se pudo guardar la rúbrica.",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading || !rubrica) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando rúbricas...
            </div>
        )
    }

    const totalCompleto = total === PESO_TOTAL
    const totalExcedido = total > PESO_TOTAL
    const colorBarra = totalCompleto ? "bg-emerald-500" : totalExcedido ? "bg-red-500" : "bg-amber-400"
    const notaSimulada = calcularNotaFinal(rubrica.criterios, notasSimuladas)

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div>
                <h2 className="text-lg font-bold text-slate-900">Rúbricas de Evaluación</h2>
                <p className="mt-1 text-xs text-slate-500">
                    Configura los módulos y porcentajes con los que los evaluadores calificarán cada
                    tipo de iniciativa. Existe una única rúbrica por tipo.
                </p>
            </div>

            {loadWarning && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span className="flex-1">{loadWarning}</span>
                    <button
                        type="button"
                        onClick={loadData}
                        className="shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Selector de rúbrica */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TIPOS_RUBRICA.map(({ id, label }) => {
                    const activa = id === tipoActivo
                    const datos = rubricas[id]
                    const totalTipo = sumarPesos(datos.criterios)
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => {
                                setTipoActivo(id)
                                setSaveStatus(null)
                                setNotasSimuladas({})
                            }}
                            aria-pressed={activa}
                            className={`rounded-xl border p-4 text-left transition-colors ${activa
                                ? "border-red-600 bg-red-50/60 ring-1 ring-red-600"
                                : "border-slate-200 bg-white hover:border-red-300 hover:bg-slate-50"
                                }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm font-bold ${activa ? "text-red-700" : "text-slate-900"}`}>
                                    {label}
                                </span>
                                {tieneCambios[id] && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                        Sin guardar
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {datos.criterios.length} módulos · {formatPorcentaje(totalTipo)} asignado
                            </p>
                        </button>
                    )
                })}
            </div>

            {/* Escala */}
            <p className="flex items-start gap-2 rounded-lg border border-slate-100 bg-[#f4f5f7] px-3 py-2 text-xs leading-relaxed text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                    Cada módulo se califica de <strong>{ESCALA_MIN} a {ESCALA_MAX}</strong>. Un {ESCALA_MAX}{" "}
                    otorga el porcentaje completo del módulo y las demás notas se escalan de forma
                    proporcional (por ejemplo, un 3 en un módulo de 10% aporta 6%).
                </span>
            </p>

            {/* Nombre */}
            <div className="space-y-1">
                <label htmlFor="nombreRubrica" className={LABEL_CLASS}>
                    Nombre de la rúbrica <span className="text-red-600">*</span>
                </label>
                <input
                    id="nombreRubrica"
                    type="text"
                    value={rubrica.nombre}
                    onChange={(e) => cambiarNombre(e.target.value)}
                    aria-invalid={Boolean(erroresActivos?.nombre)}
                    className={INPUT_CLASS}
                />
                {erroresActivos?.nombre && <p className={ERROR_CLASS}>{erroresActivos.nombre}</p>}
            </div>

            {/* Distribución de porcentajes */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={LABEL_CLASS}>Distribución de porcentajes</span>
                    <span
                        className={`text-sm font-bold ${totalCompleto ? "text-emerald-700" : totalExcedido ? "text-red-600" : "text-amber-700"
                            }`}
                    >
                        {formatPorcentaje(total)} de {PESO_TOTAL}%
                    </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={`h-full rounded-full transition-all ${colorBarra}`}
                        style={{ width: `${Math.min(total, PESO_TOTAL)}%` }}
                    />
                </div>
                <p className="text-[11px] text-slate-500">
                    {totalCompleto
                        ? "Los porcentajes suman exactamente 100%."
                        : totalExcedido
                            ? `Te excedes por ${formatPorcentaje(total - PESO_TOTAL)}. Reduce algún porcentaje.`
                            : `Faltan ${formatPorcentaje(PESO_TOTAL - total)} por asignar.`}
                </p>
            </div>

            {/* Módulos */}
            <div className="space-y-3">
                <h3 className="border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-red-600">
                    Módulos de la rúbrica ({rubrica.criterios.length})
                </h3>

                {rubrica.criterios.length === 0 && (
                    <p className="text-xs text-slate-400">Aún no hay módulos. Agrega el primero.</p>
                )}

                <ol className="space-y-3">
                    {rubrica.criterios.map((criterio, index) => {
                        const errorCriterio = erroresActivos?.criterios?.[criterio.id_criterio] || {}
                        return (
                            <li
                                key={criterio.id_criterio}
                                className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4"
                            >
                                <div className="flex gap-3">
                                    {/* Orden */}
                                    <div className="flex shrink-0 flex-col items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => moverCriterio(index, -1)}
                                            disabled={index === 0}
                                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                                            aria-label="Subir módulo"
                                        >
                                            <ChevronUp className="h-4 w-4" />
                                        </button>
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-200">
                                            {index + 1}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => moverCriterio(index, 1)}
                                            disabled={index === rubrica.criterios.length - 1}
                                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                                            aria-label="Bajar módulo"
                                        >
                                            <ChevronDown className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Campos */}
                                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[1fr_7rem]">
                                        <div className="space-y-1">
                                            <label htmlFor={`nombre-${criterio.id_criterio}`} className={LABEL_CLASS}>
                                                Nombre del módulo <span className="text-red-600">*</span>
                                            </label>
                                            <input
                                                id={`nombre-${criterio.id_criterio}`}
                                                type="text"
                                                placeholder="Ej. Evidencia de solidez"
                                                value={criterio.nombre}
                                                onChange={(e) => cambiarCriterio(criterio.id_criterio, "nombre", e.target.value)}
                                                aria-invalid={Boolean(errorCriterio.nombre)}
                                                className={INPUT_CLASS}
                                            />
                                            {errorCriterio.nombre && <p className={ERROR_CLASS}>{errorCriterio.nombre}</p>}
                                        </div>

                                        <div className="space-y-1">
                                            <label htmlFor={`peso-${criterio.id_criterio}`} className={LABEL_CLASS}>
                                                Porcentaje <span className="text-red-600">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id={`peso-${criterio.id_criterio}`}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="1"
                                                    max={PESO_TOTAL}
                                                    step="1"
                                                    value={criterio.peso}
                                                    onChange={(e) => cambiarCriterio(criterio.id_criterio, "peso", e.target.value)}
                                                    aria-invalid={Boolean(errorCriterio.peso)}
                                                    className={`${INPUT_CLASS} pr-8`}
                                                />
                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                                                    %
                                                </span>
                                            </div>
                                            {errorCriterio.peso && <p className={ERROR_CLASS}>{errorCriterio.peso}</p>}
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <label htmlFor={`desc-${criterio.id_criterio}`} className={LABEL_CLASS}>
                                                Descripción para el evaluador
                                            </label>
                                            <textarea
                                                id={`desc-${criterio.id_criterio}`}
                                                rows={2}
                                                placeholder="¿Qué debe valorar el evaluador en este módulo?"
                                                value={criterio.descripcion}
                                                onChange={(e) => cambiarCriterio(criterio.id_criterio, "descripcion", e.target.value)}
                                                className={`${INPUT_CLASS} resize-none`}
                                            />
                                        </div>
                                    </div>

                                    {/* Eliminar */}
                                    <button
                                        type="button"
                                        onClick={() => eliminarCriterio(criterio.id_criterio)}
                                        className="h-fit shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                        title="Eliminar módulo"
                                        aria-label={`Eliminar módulo ${criterio.nombre || index + 1}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ol>

                <button
                    type="button"
                    onClick={agregarCriterio}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-xs font-semibold text-slate-600 transition-colors hover:border-red-300 hover:bg-red-50/40 hover:text-red-600"
                >
                    <Plus className="h-4 w-4" />
                    Agregar módulo
                </button>
            </div>

            {/* Vista previa de calificación */}
            <div className="rounded-xl border border-slate-200">
                <button
                    type="button"
                    onClick={() => setSimuladorAbierto((abierto) => !abierto)}
                    aria-expanded={simuladorAbierto}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Calculator className="h-4 w-4 text-red-600" />
                        Vista previa de calificación
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform ${simuladorAbierto ? "rotate-180" : ""}`}
                    />
                </button>

                {simuladorAbierto && (
                    <div className="space-y-3 border-t border-slate-100 px-4 py-4">
                        <p className="text-xs text-slate-500">
                            Así calificará el evaluador. Prueba distintas notas para ver cómo se calcula el resultado.
                        </p>
                        <ul className="divide-y divide-slate-100">
                            {rubrica.criterios.map((criterio, index) => {
                                const nota = notasSimuladas[criterio.id_criterio] ?? ESCALA_MAX
                                return (
                                    <li
                                        key={criterio.id_criterio}
                                        className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-800">
                                                {criterio.nombre || `Módulo ${index + 1}`}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Peso {formatPorcentaje(Number(criterio.peso) || 0)} · aporta{" "}
                                                <strong className="text-slate-700">
                                                    {formatPorcentaje(calcularAporte(criterio.peso, nota))}
                                                </strong>
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-1" role="group" aria-label="Nota del módulo">
                                            {NOTAS.map((valor) => (
                                                <button
                                                    key={valor}
                                                    type="button"
                                                    onClick={() =>
                                                        setNotasSimuladas((prev) => ({ ...prev, [criterio.id_criterio]: valor }))
                                                    }
                                                    aria-pressed={nota === valor}
                                                    className={`h-8 w-8 rounded-md border text-xs font-bold transition-colors ${nota === valor
                                                        ? "border-red-600 bg-red-600 text-white"
                                                        : "border-slate-200 bg-white text-slate-600 hover:border-red-300"
                                                        }`}
                                                >
                                                    {valor}
                                                </button>
                                            ))}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className="flex items-center justify-between rounded-lg bg-[#f4f5f7] px-3 py-2">
                            <span className="text-xs font-semibold text-slate-700">Nota final</span>
                            <span className="text-lg font-bold text-slate-900">
                                {notaSimulada.toFixed(1)} <span className="text-xs font-medium text-slate-500">/ {PESO_TOTAL}</span>
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Mensajes */}
            {erroresActivos?.general && (
                <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {erroresActivos.general}
                </p>
            )}
            {saveStatus?.tipo === "success" && (
                <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {saveStatus.texto}
                </p>
            )}
            {saveStatus?.tipo === "error" && (
                <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {saveStatus.texto}
                </p>
            )}

            {/* Acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button
                    type="button"
                    onClick={descartarCambios}
                    disabled={!tieneCambios[tipoActivo] || isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw className="h-4 w-4" />
                    Descartar cambios
                </button>
                <button
                    type="button"
                    onClick={guardarRubrica}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? "Guardando..." : "Guardar rúbrica"}
                </button>
            </div>
        </div>
    )
}

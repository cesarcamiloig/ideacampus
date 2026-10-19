import { useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowDown, ArrowUp, Calculator, ChevronDown, Plus, Trash2 } from "lucide-react"
import {
    ESCALA_MAX,
    ESCALA_MIN,
    PESO_TOTAL,
    calcularAporteCriterio,
    calcularAporteHito,
    calcularNotaHito,
    formatPorcentaje,
    sumarPonderaciones,
} from "../utils/rubricaUtils"
import DistribucionPesos from "./DistribucionPesos"
import PesoInput from "./PesoInput"
import {
    AYUDA,
    BOTON_FANTASMA,
    BOTON_ICONO,
    BOTON_PELIGRO,
    BOTON_PRIMARIO,
    BOTON_SECUNDARIO,
    CAMPO,
    ERROR,
    ETIQUETA,
    tonoSegmento,
} from "./estilos"

const NOTAS = Array.from({ length: ESCALA_MAX - ESCALA_MIN + 1 }, (_, i) => ESCALA_MIN + i)

function contarErrores(errores) {
    if (!errores) return 0
    return (
        (errores.nombre ? 1 : 0) +
        (errores.ponderacion ? 1 : 0) +
        (errores.general ? 1 : 0) +
        Object.values(errores.criterios || {}).reduce((total, e) => total + Object.keys(e).length, 0)
    )
}

function EstadoHito({ hito, errores }) {
    const cantidadErrores = contarErrores(errores)
    const totalCriterios = sumarPonderaciones(hito.criterios)

    if (cantidadErrores > 0) {
        return (
            <span className="flex items-center gap-1.5 text-xs font-medium text-ufps">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {cantidadErrores === 1 ? "Hay 1 cosa por corregir" : `Hay ${cantidadErrores} cosas por corregir`}
            </span>
        )
    }
    if (hito.criterios.length === 0) {
        return <span className="text-xs font-medium text-amber-800">Todavía no tiene criterios</span>
    }
    if (totalCriterios === PESO_TOTAL) {
        return (
            <span className="text-xs text-slate-600">
                {hito.criterios.length} {hito.criterios.length === 1 ? "criterio" : "criterios"}
            </span>
        )
    }
    return (
        <span className="text-xs font-medium text-amber-800">
            {totalCriterios > PESO_TOTAL
                ? `Los criterios se pasan ${formatPorcentaje(totalCriterios - PESO_TOTAL)}`
                : `A los criterios les falta ${formatPorcentaje(PESO_TOTAL - totalCriterios)}`}
        </span>
    )
}

function VistaPrevia({ hito }) {
    const [notas, setNotas] = useState({})
    const notaHito = calcularNotaHito(hito.criterios, notas)

    if (hito.criterios.length === 0) {
        return <p className={AYUDA}>Agrega criterios para probar cómo se calificaría este hito.</p>
    }

    return (
        <div className="space-y-4 animate-aparecer motion-reduce:animate-desvanecer">
            <ul className="space-y-3">
                {hito.criterios.map((criterio, index) => {
                    const nombre = criterio.nombre.trim() || `Criterio ${index + 1}`
                    const nota = notas[criterio.id] ?? ESCALA_MAX
                    return (
                        <li
                            key={criterio.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                            <div className="min-w-0">
                                <p className="break-words text-sm font-medium text-slate-900">{nombre}</p>
                                <p className="text-xs tabular-nums text-slate-600">
                                    Pesa {formatPorcentaje(criterio.ponderacion)} · aporta{" "}
                                    <span className="font-semibold text-slate-800">
                                        {calcularAporteCriterio(criterio, nota).toFixed(1)}
                                    </span>
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-1" role="group" aria-label={`Nota para ${nombre}`}>
                                {NOTAS.map((valor) => {
                                    const elegida = nota === valor
                                    return (
                                        <button
                                            key={valor}
                                            type="button"
                                            onClick={() => setNotas((prev) => ({ ...prev, [criterio.id]: valor }))}
                                            aria-pressed={elegida}
                                            aria-label={`${valor} de ${ESCALA_MAX}`}
                                            className={`h-11 w-11 rounded-xl text-sm font-semibold tabular-nums transition-[transform,background-color,color] duration-150 ease-out-suave active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15 motion-reduce:transition-none ${elegida
                                                ? "bg-slate-900 text-white"
                                                : "bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200 hover:text-slate-900 hover:ring-slate-300"
                                                }`}
                                        >
                                            {valor}
                                        </button>
                                    )
                                })}
                            </div>
                        </li>
                    )
                })}
            </ul>
            <div className="flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:gap-5">
                <p className="shrink-0 text-2xl font-bold tabular-nums text-slate-900" aria-live="polite">
                    {notaHito.toFixed(1)}
                    <span className="ml-1 text-sm font-medium text-slate-500">/ {PESO_TOTAL}</span>
                </p>
                <div className="text-xs text-slate-600">
                    <p>
                        Así quedaría la nota de este hito. Aporta{" "}
                        <span className="font-semibold tabular-nums text-slate-900">
                            {calcularAporteHito(hito, notaHito).toFixed(1)} puntos
                        </span>{" "}
                        a la nota final.
                    </p>
                    <p className="text-slate-500">
                        Si todo se califica con {ESCALA_MIN}, el hito queda en{" "}
                        <span className="tabular-nums">{Math.round((ESCALA_MIN / ESCALA_MAX) * PESO_TOTAL)} / {PESO_TOTAL}</span>.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default function HitoCard({
    hito,
    numero,
    esPrimero,
    esUltimo,
    abierto,
    activo,
    errores,
    onToggle,
    onActivar,
    onCambiar,
    onCambiarCriterio,
    onAgregarCriterio,
    onEliminarCriterio,
    onRepartirCriterios,
    onMover,
    onEliminar,
}) {
    const [vistaPreviaAbierta, setVistaPreviaAbierta] = useState(false)
    const [confirmando, setConfirmando] = useState(false)
    const [criterioActivo, setCriterioActivo] = useState(null)
    const cancelarRef = useRef(null)

    const nombreVisible = hito.nombre.trim()
    const tieneContenido =
        hito.criterios.length > 0 &&
        (Boolean(nombreVisible) || hito.criterios.some((criterio) => criterio.nombre.trim()))

    useEffect(() => {
        if (confirmando) cancelarRef.current?.focus()
    }, [confirmando])

    function pedirEliminar() {
        if (tieneContenido) setConfirmando(true)
        else onEliminar()
    }

    function enfocar(id) {
        document.getElementById(id)?.focus()
    }

    const errorPesoId = errores?.ponderacion ? `hito-peso-error-${hito.id}` : undefined
    const mostrarErrorSinCriterios = errores?.general && hito.criterios.length === 0

    return (
        <li
            className={`rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 transition-[background-color,box-shadow] duration-200 ease-out-suave motion-reduce:transition-none ${abierto ? "bg-ufps-suave" : "bg-white"
                } ${errores || abierto ? "ring-ufps-borde" : "ring-slate-200 hover:ring-slate-300"}`}
        >
            {/* Cabecera: se entiende sin abrir el hito */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2 sm:p-3">
                <button
                    id={`hito-toggle-${hito.id}`}
                    type="button"
                    onClick={onToggle}
                    aria-expanded={abierto}
                    aria-controls={`hito-panel-${hito.id}`}
                    className="flex min-h-12 min-w-0 flex-1 basis-52 items-center gap-3 rounded-xl px-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
                >
                    <ChevronDown
                        aria-hidden="true"
                        className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ease-out-suave motion-reduce:transition-none ${abierto ? "rotate-180" : ""
                            }`}
                    />
                    <span
                        aria-hidden="true"
                        className={`h-3 w-3 shrink-0 rounded-full ${tonoSegmento(numero - 1)} ${activo ? "ring-2 ring-red-200 ring-offset-1" : ""}`}
                    />
                    <span className="min-w-0 space-y-0.5">
                        <span className="block text-xs text-slate-600">Hito {numero}</span>
                        <span
                            className={`block break-words text-base font-semibold leading-snug ${nombreVisible ? "text-slate-900" : "italic text-slate-500"
                                }`}
                        >
                            {nombreVisible || "Sin nombre todavía"}
                        </span>
                        <EstadoHito hito={hito} errores={errores} />
                    </span>
                </button>

                <div className="ml-auto flex items-center gap-1">
                    <PesoInput
                        id={`hito-peso-${hito.id}`}
                        value={hito.ponderacion}
                        onChange={(valor) => onCambiar("ponderacion", valor)}
                        invalid={Boolean(errores?.ponderacion)}
                        describedBy={errorPesoId}
                        label={`Peso del hito ${numero}${nombreVisible ? `, ${nombreVisible},` : ""} en la nota final`}
                        onFocus={() => onActivar(true)}
                        onBlur={() => onActivar(false)}
                    />
                    <div className="hidden items-center sm:flex">
                        <button
                            id={`hito-subir-cabecera-${hito.id}`}
                            type="button"
                            onClick={() => onMover(-1, "cabecera")}
                            disabled={esPrimero}
                            className={BOTON_ICONO}
                            aria-label={`Subir el hito ${numero}`}
                            title="Subir"
                        >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                            id={`hito-bajar-cabecera-${hito.id}`}
                            type="button"
                            onClick={() => onMover(1, "cabecera")}
                            disabled={esUltimo}
                            className={BOTON_ICONO}
                            aria-label={`Bajar el hito ${numero}`}
                            title="Bajar"
                        >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {errores?.ponderacion && (
                    <p id={errorPesoId} className={`${ERROR} w-full justify-end px-2`}>
                        {errores.ponderacion}
                    </p>
                )}
            </div>

            {/* Cuerpo: altura animada con grid-rows; inert evita el foco mientras está cerrado */}
            <div
                id={`hito-panel-${hito.id}`}
                className={`grid transition-[grid-template-rows] ease-out-suave motion-reduce:transition-none ${abierto ? "grid-rows-[1fr] duration-[250ms]" : "grid-rows-[0fr] duration-200"
                    }`}
            >
                <div className="min-h-0 overflow-hidden" inert={!abierto}>
                    <div className="space-y-7 rounded-b-2xl border-t border-ufps-borde/60 bg-white/50 px-3 pb-4 pt-4 sm:px-5 sm:pb-5">
                        {/* Datos del hito */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                            <div className="space-y-1.5">
                                <label htmlFor={`hito-nombre-${hito.id}`} className={ETIQUETA}>
                                    Nombre del hito
                                </label>
                                <input
                                    id={`hito-nombre-${hito.id}`}
                                    type="text"
                                    placeholder="Ej. Validación"
                                    value={hito.nombre}
                                    onChange={(e) => onCambiar("nombre", e.target.value)}
                                    aria-invalid={Boolean(errores?.nombre)}
                                    aria-describedby={errores?.nombre ? `hito-nombre-error-${hito.id}` : undefined}
                                    className={CAMPO}
                                />
                                {errores?.nombre && (
                                    <p id={`hito-nombre-error-${hito.id}`} className={ERROR}>
                                        {errores.nombre}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor={`hito-desc-${hito.id}`} className={ETIQUETA}>
                                    ¿Qué se espera en este hito? <span className="font-normal text-slate-500">(opcional)</span>
                                </label>
                                <textarea
                                    id={`hito-desc-${hito.id}`}
                                    rows={2}
                                    placeholder="Lo que el equipo debería haber logrado al llegar aquí"
                                    value={hito.descripcion}
                                    onChange={(e) => onCambiar("descripcion", e.target.value)}
                                    className={`${CAMPO} resize-none`}
                                />
                            </div>
                        </div>

                        {/* Criterios: anidados bajo el hito con una guía a la izquierda */}
                        <div className="ml-1 space-y-4 border-l border-slate-300 pl-4 sm:ml-2 sm:pl-6">
                            <DistribucionPesos
                                items={hito.criterios}
                                total={sumarPonderaciones(hito.criterios)}
                                titulo={`Criterios del hito ${numero}${nombreVisible ? ` · ${nombreVisible}` : ""}`}
                                tituloId={`hito-criterios-${hito.id}`}
                                nombreItem="criterio"
                                tamano="sm"
                                activoId={criterioActivo}
                                onSeleccionar={(criterioId) => enfocar(`crit-peso-${criterioId}`)}
                                onRepartir={onRepartirCriterios}
                            />

                            {mostrarErrorSinCriterios && (
                                <p className={ERROR}>
                                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    {errores.general}
                                </p>
                            )}

                            <ol className="space-y-2">
                                {hito.criterios.map((criterio, index) => {
                                    const errorCriterio = errores?.criterios?.[criterio.id] || {}
                                    const nombreErrorId = errorCriterio.nombre ? `crit-nombre-error-${criterio.id}` : undefined
                                    const pesoErrorId = errorCriterio.ponderacion ? `crit-peso-error-${criterio.id}` : undefined
                                    return (
                                        <li
                                            key={criterio.id}
                                            className="space-y-2 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] animate-aparecer motion-reduce:animate-desvanecer"
                                        >
                                            <div className="flex flex-wrap items-start gap-2">
                                                <div className="min-w-0 flex-1 basis-full space-y-1.5 sm:basis-0">
                                                    <label htmlFor={`crit-nombre-${criterio.id}`} className={ETIQUETA}>
                                                        Criterio {numero}.{index + 1}
                                                    </label>
                                                    <input
                                                        id={`crit-nombre-${criterio.id}`}
                                                        type="text"
                                                        placeholder="Ej. Evidencia de solidez"
                                                        value={criterio.nombre}
                                                        onChange={(e) => onCambiarCriterio(criterio.id, "nombre", e.target.value)}
                                                        aria-invalid={Boolean(errorCriterio.nombre)}
                                                        aria-describedby={nombreErrorId}
                                                        className={CAMPO}
                                                    />
                                                    {errorCriterio.nombre && (
                                                        <p id={nombreErrorId} className={ERROR}>
                                                            {errorCriterio.nombre}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 max-sm:flex-1">
                                                    <label htmlFor={`crit-peso-${criterio.id}`} className={ETIQUETA}>
                                                        Peso
                                                    </label>
                                                    <PesoInput
                                                        id={`crit-peso-${criterio.id}`}
                                                        value={criterio.ponderacion}
                                                        onChange={(valor) => onCambiarCriterio(criterio.id, "ponderacion", valor)}
                                                        invalid={Boolean(errorCriterio.ponderacion)}
                                                        describedBy={pesoErrorId}
                                                        onFocus={() => setCriterioActivo(criterio.id)}
                                                        onBlur={() => setCriterioActivo(null)}
                                                    />
                                                    {errorCriterio.ponderacion && (
                                                        <p id={pesoErrorId} className={`${ERROR} max-w-[12rem]`}>
                                                            {errorCriterio.ponderacion}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onEliminarCriterio(criterio.id)}
                                                    className={`${BOTON_ICONO} mt-[1.6rem] hover:bg-ufps-suave hover:text-ufps`}
                                                    aria-label={`Eliminar el criterio ${criterio.nombre.trim() || index + 1}`}
                                                    title="Eliminar criterio"
                                                >
                                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                            <textarea
                                                rows={1}
                                                aria-label={`Qué debe mirar el evaluador en el criterio ${index + 1}`}
                                                placeholder="¿Qué debe mirar el evaluador? (opcional)"
                                                value={criterio.descripcion}
                                                onChange={(e) => onCambiarCriterio(criterio.id, "descripcion", e.target.value)}
                                                className={`${CAMPO} min-h-11 resize-none bg-superficie-alta shadow-none`}
                                            />
                                        </li>
                                    )
                                })}
                            </ol>

                            <button
                                id={`agregar-criterio-${hito.id}`}
                                type="button"
                                onClick={onAgregarCriterio}
                                className={BOTON_FANTASMA}
                            >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Agregar criterio
                            </button>
                        </div>

                        {/* Vista previa */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setVistaPreviaAbierta((valor) => !valor)}
                                aria-expanded={vistaPreviaAbierta}
                                className={BOTON_SECUNDARIO}
                            >
                                <Calculator className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                {vistaPreviaAbierta ? "Ocultar la prueba" : "Probar cómo se calificaría"}
                            </button>
                            {vistaPreviaAbierta && <VistaPrevia hito={hito} />}
                        </div>

                        {/* Acciones del hito: eliminar vive lejos del botón de abrir */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex gap-1 sm:hidden">
                                <button
                                    id={`hito-subir-cuerpo-${hito.id}`}
                                    type="button"
                                    onClick={() => onMover(-1, "cuerpo")}
                                    disabled={esPrimero}
                                    className={BOTON_FANTASMA}
                                >
                                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                                    Subir
                                </button>
                                <button
                                    id={`hito-bajar-cuerpo-${hito.id}`}
                                    type="button"
                                    onClick={() => onMover(1, "cuerpo")}
                                    disabled={esUltimo}
                                    className={BOTON_FANTASMA}
                                >
                                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                                    Bajar
                                </button>
                            </div>

                            {confirmando ? (
                                <div
                                    role="group"
                                    aria-label="Confirmar eliminación del hito"
                                    onKeyDown={(e) => e.key === "Escape" && setConfirmando(false)}
                                    className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)] animate-aparecer motion-reduce:animate-desvanecer sm:w-auto"
                                >
                                    <p className="mr-auto text-sm text-slate-700 sm:mr-2">
                                        ¿Eliminar {nombreVisible ? `“${nombreVisible}”` : `el hito ${numero}`} y sus{" "}
                                        {hito.criterios.length} {hito.criterios.length === 1 ? "criterio" : "criterios"}?
                                    </p>
                                    <button
                                        ref={cancelarRef}
                                        type="button"
                                        onClick={() => setConfirmando(false)}
                                        className={BOTON_SECUNDARIO}
                                    >
                                        Cancelar
                                    </button>
                                    <button type="button" onClick={onEliminar} className={BOTON_PRIMARIO}>
                                        Sí, eliminar
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={pedirEliminar} className={`${BOTON_PELIGRO} ml-auto`}>
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Eliminar hito
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </li>
    )
}

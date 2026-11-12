import { useId, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { actualizarEvaluacion, crearEvaluacion } from "../services/evaluacionService"
import {
    NOTA_MAXIMA,
    PASO_NOTA,
    formatoNota,
    formatoPeso,
    formatoUnDecimal,
    marcasEscala,
    mensajeDeError,
    notaHitoPrevia,
    redondearNota,
} from "../utils/evaluacionUtils"
import { AYUDA, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "../../../components/ui/estilos"

function notasIniciales(evaluacion) {
    const notas = {}
    const comentarios = {}
    evaluacion?.notas?.forEach((n) => {
        notas[n.criterio] = redondearNota(n.nota)
        comentarios[n.criterio] = n.comentario || ""
    })
    return { notas, comentarios }
}

// Pulgar y pista de la barra: rojo UFPS cuando ya hay nota, gris mientras no se califica
const PULGAR =
    "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-[0_1px_3px_rgba(15,23,42,0.35)] [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-[0_1px_3px_rgba(15,23,42,0.35)]"
const PULGAR_ACTIVO = "[&::-webkit-slider-thumb]:bg-ufps [&::-moz-range-thumb]:bg-ufps"
const PULGAR_INACTIVO = "[&::-webkit-slider-thumb]:bg-slate-400 [&::-moz-range-thumb]:bg-slate-400"

// Barra deslizable de un decimal (1,0 · 1,5 · 2,3 …). Arranca "sin calificar" hasta que se toca.
function SelectorNota({ criterio, valor, onChange, idEtiqueta, invalido }) {
    const min = Number(criterio.escala_min)
    const max = Number(criterio.escala_max)
    const calificado = valor !== undefined
    const actual = calificado ? valor : min
    const porcentaje = max > min ? ((actual - min) / (max - min)) * 100 : 0
    const marcas = marcasEscala(criterio)

    // Un clic sobre el valor mínimo no dispara onChange: se toma el valor al soltar
    function fijarSiFalta(e) {
        if (!calificado) onChange(redondearNota(e.currentTarget.value))
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={PASO_NOTA}
                        value={actual}
                        aria-labelledby={idEtiqueta}
                        aria-invalid={invalido}
                        aria-valuetext={calificado ? `${formatoUnDecimal(valor)} de ${max}` : "Sin calificar"}
                        onChange={(e) => onChange(redondearNota(e.target.value))}
                        onPointerUp={fijarSiFalta}
                        onKeyUp={fijarSiFalta}
                        style={{
                            background: calificado
                                ? `linear-gradient(to right, #c81e1e ${porcentaje}%, #e2e8f0 ${porcentaje}%)`
                                : "#e2e8f0",
                        }}
                        className={`h-2 w-full cursor-pointer appearance-none rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15 ${PULGAR} ${
                            calificado ? PULGAR_ACTIVO : PULGAR_INACTIVO
                        } ${invalido ? "ring-2 ring-ufps" : ""}`}
                    />
                </div>
                <output
                    className={`inline-flex h-11 min-w-[4.5rem] shrink-0 items-center justify-center rounded-xl px-3 text-base font-bold tabular-nums ${
                        calificado ? "bg-ufps text-white" : "bg-slate-100 text-slate-500"
                    }`}
                >
                    {calificado ? formatoUnDecimal(valor) : "—"}
                </output>
            </div>
            <div className="flex justify-between pr-[5.5rem] text-[11px] font-semibold text-slate-500" aria-hidden="true">
                {marcas.map((m) => (
                    <span key={m}>{m}</span>
                ))}
            </div>
        </div>
    )
}

function CriterioCalificable({ criterio, numero, valor, comentario, error, onNota, onComentario }) {
    const id = useId()
    return (
        <li className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    valor !== undefined ? "bg-ufps text-white" : "bg-slate-200 text-slate-800"
                }`}>
                    {numero}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <p id={`${id}-nombre`} className="text-sm font-bold leading-snug text-slate-900">
                            {criterio.nombre}
                        </p>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            Peso {formatoPeso(criterio.ponderacion)}
                        </span>
                    </div>
                    {criterio.descripcion && (
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{criterio.descripcion}</p>
                    )}
                </div>
            </div>

            <div className="space-y-1.5 pl-10">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Nota · escala de {criterio.escala_min} a {criterio.escala_max}
                    {valor === undefined && <span className="font-semibold normal-case tracking-normal"> · desliza para calificar</span>}
                </p>
                <SelectorNota
                    criterio={criterio}
                    valor={valor}
                    onChange={onNota}
                    idEtiqueta={`${id}-nombre`}
                    invalido={Boolean(error)}
                />
                {error && (
                    <p className={ERROR} role="alert">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {error}
                    </p>
                )}
                <label htmlFor={`${id}-comentario`} className="sr-only">
                    Observación sobre {criterio.nombre}
                </label>
                <textarea
                    id={`${id}-comentario`}
                    rows={2}
                    value={comentario}
                    placeholder="Observación sobre este criterio (opcional)"
                    onChange={(e) => onComentario(e.target.value)}
                    className={`${CAMPO} mt-1 resize-y`}
                />
            </div>
        </li>
    )
}

// Formulario para calificar (o recalificar) los criterios de un hito
export default function FormularioEvaluacion({ idProyecto, hito, evaluacion, onGuardado, onCancelar }) {
    const criterios = hito.criterios || []
    const inicial = notasIniciales(evaluacion)
    const [notas, setNotas] = useState(inicial.notas)
    const [comentarios, setComentarios] = useState(inicial.comentarios)
    const [comentario, setComentario] = useState(evaluacion?.comentario || "")
    const [errores, setErrores] = useState({})
    const [errorGeneral, setErrorGeneral] = useState("")
    const [guardando, setGuardando] = useState(false)
    const idComentario = useId()

    const previa = notaHitoPrevia(criterios, notas)
    const completa = previa.calificados === criterios.length

    function cambiarNota(idCriterio, valor) {
        setNotas((prev) => ({ ...prev, [idCriterio]: valor }))
        setErrores((prev) => ({ ...prev, [idCriterio]: undefined }))
    }

    async function guardar(e) {
        e.preventDefault()
        const nuevos = {}
        criterios.forEach((c) => {
            const valor = notas[c.id]
            if (valor === undefined || Number.isNaN(valor)) nuevos[c.id] = "Califica este criterio."
            else if (valor < Number(c.escala_min) || valor > Number(c.escala_max)) {
                nuevos[c.id] = `La nota debe estar entre ${c.escala_min} y ${c.escala_max}.`
            }
        })
        setErrores(nuevos)
        setErrorGeneral("")
        if (Object.keys(nuevos).length > 0) {
            setErrorGeneral("Revisa los criterios marcados antes de guardar.")
            return
        }

        const datos = {
            comentario: comentario.trim(),
            notas: criterios.map((c) => ({
                criterio: c.id,
                nota: notas[c.id],
                comentario: (comentarios[c.id] || "").trim(),
            })),
        }
        setGuardando(true)
        try {
            const guardada = evaluacion
                ? await actualizarEvaluacion(evaluacion.id, datos)
                : await crearEvaluacion({ ...datos, proyecto: idProyecto, subrubrica: hito.id })
            onGuardado(guardada, evaluacion ? "Evaluación actualizada." : "Evaluación registrada.")
        } catch (err) {
            setErrorGeneral(mensajeDeError(err, "No se pudo guardar la evaluación."))
            setGuardando(false)
        }
    }

    return (
        <form onSubmit={guardar} noValidate className="space-y-5">
            {/* Resumen en vivo: la nota se recalcula con cada criterio calificado */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-end justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nota del hito</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900" aria-live="polite">
                            {formatoNota(previa.nota)}
                            <span className="text-sm font-semibold text-slate-500"> / {NOTA_MAXIMA}</span>
                        </p>
                    </div>
                    <p className={`text-xs font-semibold ${completa ? "text-ufps" : "text-slate-600"}`}>
                        {previa.calificados} de {criterios.length} criterios calificados
                    </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div
                        className="h-full rounded-full bg-ufps transition-[width] duration-300 ease-out-suave motion-reduce:transition-none"
                        style={{ width: `${criterios.length ? (previa.calificados / criterios.length) * 100 : 0}%` }}
                    />
                </div>
                {!completa && previa.calificados > 0 && (
                    <p className="mt-2 text-xs text-slate-600">Nota parcial: faltan criterios por calificar.</p>
                )}
            </div>

            {errorGeneral && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{errorGeneral}</p>
                </div>
            )}

            <ol className="space-y-3">
                {criterios.map((criterio, indice) => (
                    <CriterioCalificable
                        key={criterio.id}
                        criterio={criterio}
                        numero={indice + 1}
                        valor={notas[criterio.id]}
                        comentario={comentarios[criterio.id] || ""}
                        error={errores[criterio.id]}
                        onNota={(valor) => cambiarNota(criterio.id, valor)}
                        onComentario={(texto) => setComentarios((prev) => ({ ...prev, [criterio.id]: texto }))}
                    />
                ))}
            </ol>

            <div className="space-y-1.5">
                <label htmlFor={idComentario} className={ETIQUETA}>
                    Retroalimentación general
                </label>
                <textarea
                    id={idComentario}
                    rows={4}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    className={`${CAMPO} resize-y`}
                />
                <p className={AYUDA}>Fortalezas, aspectos por mejorar y recomendaciones para el equipo.</p>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO} disabled={guardando}>
                    Cancelar
                </button>
                <button type="submit" className={BOTON_PRIMARIO} disabled={guardando}>
                    {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                    {evaluacion ? "Guardar cambios" : "Registrar evaluación"}
                </button>
            </div>
        </form>
    )
}

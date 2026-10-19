import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, CloudOff, Loader2, Lock, Plus, RefreshCw, RotateCcw, Save } from "lucide-react"
import { getRubrica, getRubricas, updateRubrica } from "../services/rubricaService"
import {
    ESCALA_MAX,
    ESCALA_MIN,
    PESO_TOTAL,
    TIPOS_RUBRICA,
    conservarClaves,
    construirPayload,
    crearCriterio,
    crearHito,
    crearHitosPlantilla,
    crearRubricaBase,
    normalizarRubrica,
    sumarPonderaciones,
    validarRubrica,
} from "../utils/rubricaUtils"
import DistribucionPesos from "./DistribucionPesos"
import HitoCard from "./HitoCard"
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ERROR, ETIQUETA } from "./estilos"

// v2: hitos y criterios con _key local; el id es solo el del servidor
const CLAVE_BORRADOR = "gennova:rubricas:borrador:v2"
// Lo que tarda en abrirse un hito; el foco espera a que el campo sea visible
const ESPERA_APERTURA = 260

function etiquetaDe(tipo) {
    return TIPOS_RUBRICA.find((t) => t.id === tipo)?.label || tipo
}

// GET /rubricas/ para ubicar cada rúbrica por tipo_iniciativa (el id no es fijo) y
// GET /rubricas/{id}/ para traerla completa con hitos y criterios.
// Si un tipo no existe en el servidor queda con id null y no se puede guardar.
async function cargarRubricasPorTipo() {
    const data = await getRubricas()
    const lista = Array.isArray(data) ? data : data?.results || data?.data || []
    const entradas = await Promise.all(
        TIPOS_RUBRICA.map(async ({ id: tipo }) => {
            const resumen = lista.find((r) => r.tipo_iniciativa === tipo)
            if (!resumen) return [tipo, crearRubricaBase(tipo)]
            const completa = await getRubrica(resumen.id)
            return [tipo, normalizarRubrica(completa, tipo)]
        })
    )
    return Object.fromEntries(entradas)
}

function restante(items) {
    return Math.max(Math.round((PESO_TOTAL - sumarPonderaciones(items)) * 100) / 100, 0)
}

// Partes iguales con 2 decimales; el último ítem absorbe el redondeo para cerrar en 100
function repartirIguales(items) {
    const n = items.length
    if (n === 0) return items
    const base = Math.floor((PESO_TOTAL / n) * 100) / 100
    return items.map((item, index) => ({
        ...item,
        ponderacion: index === n - 1 ? Math.round((PESO_TOTAL - base * (n - 1)) * 100) / 100 : base,
    }))
}

function leerBorrador() {
    try {
        const texto = sessionStorage.getItem(CLAVE_BORRADOR)
        return texto ? JSON.parse(texto) : null
    } catch {
        return null
    }
}

function escribirBorrador(pendientes) {
    try {
        if (Object.keys(pendientes).length > 0) {
            sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(pendientes))
        } else {
            sessionStorage.removeItem(CLAVE_BORRADOR)
        }
    } catch {
        // Sin almacenamiento disponible (modo privado): se sigue trabajando en memoria
    }
}

function prefiereMenosMovimiento() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
}

function contarErrores(errores) {
    if (!errores) return 0
    let total = errores.general ? 1 : 0
    Object.values(errores.hitos).forEach((e) => {
        total += (e.nombre ? 1 : 0) + (e.ponderacion ? 1 : 0) + (e.general ? 1 : 0)
        Object.values(e.criterios).forEach((c) => {
            total += Object.keys(c).length
        })
    })
    return total
}

// Primer campo con error en orden de lectura, para llevar el foco ahí
function primerError(rubrica, errores) {
    for (const hito of rubrica.subrubricas) {
        const e = errores.hitos[hito._key]
        if (!e) continue
        if (e.ponderacion) return `hito-peso-${hito._key}`
        if (e.nombre) return `hito-nombre-${hito._key}`
        for (const criterio of hito.criterios) {
            const c = e.criterios[criterio._key]
            if (c?.nombre) return `crit-nombre-${criterio._key}`
            if (c?.ponderacion) return `crit-peso-${criterio._key}`
        }
        if (e.general) return `hito-criterios-${hito._key}`
    }
    return "reparto-hitos"
}

// Primer mensaje legible de un error de validación de DRF ({ campo: ["msg"] } anidado)
function primerMensaje(data) {
    if (!data) return null
    if (typeof data === "string") return data
    if (Array.isArray(data)) {
        for (const item of data) {
            const mensaje = primerMensaje(item)
            if (mensaje) return mensaje
        }
        return null
    }
    if (typeof data === "object") {
        for (const valor of Object.values(data)) {
            const mensaje = primerMensaje(valor)
            if (mensaje) return mensaje
        }
    }
    return null
}

function mensajeDeError(err) {
    if (!err?.status) return "No hay conexión con el servidor."
    if (err.status === 403) return "Tu rol no tiene permiso para editar rúbricas."
    if (err.status === 404) return "No encontramos esta rúbrica en el servidor."
    if (err.status === 400) return primerMensaje(err.data) || "El servidor rechazó los datos."
    return err.message || "El servidor rechazó los cambios."
}

export default function RubricasTab() {
    const [tipoActivo, setTipoActivo] = useState(TIPOS_RUBRICA[0].id)
    const [rubricas, setRubricas] = useState(null)
    const [guardadas, setGuardadas] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [sinServidor, setSinServidor] = useState(false)
    const [borradorRecuperado, setBorradorRecuperado] = useState(false)

    const [intentos, setIntentos] = useState({})
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState(null) // { tipo: "success" | "error" | "invalido", texto }
    const [hitosAbiertos, setHitosAbiertos] = useState(() => new Set())
    const [hitoActivo, setHitoActivo] = useState(null)
    const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
    const [anuncio, setAnuncio] = useState("")
    const [focoPendiente, setFocoPendiente] = useState(null) // { id, espera }

    async function loadData() {
        setIsLoading(true)
        let porTipo
        let fallo = false
        try {
            porTipo = await cargarRubricasPorTipo()
        } catch {
            // Sin conexión se trabaja sobre una plantilla base editable que no se puede guardar
            porTipo = Object.fromEntries(TIPOS_RUBRICA.map(({ id }) => [id, crearRubricaBase(id)]))
            fallo = true
        }

        // Reintentar o recargar nunca pisa el borrador: se recupera encima de lo cargado,
        // solo si pertenece a la misma rúbrica del servidor (mismo id)
        const borrador = leerBorrador()
        const combinadas = { ...porTipo }
        let recuperado = false
        TIPOS_RUBRICA.forEach(({ id }) => {
            const pendiente = borrador?.[id]
            if (
                pendiente?.tipo_iniciativa === id &&
                Array.isArray(pendiente.subrubricas) &&
                (fallo || pendiente.id === porTipo[id].id)
            ) {
                combinadas[id] = pendiente
                recuperado = true
            }
        })

        setRubricas(combinadas)
        setGuardadas(porTipo)
        setSinServidor(fallo)
        setBorradorRecuperado(recuperado)
        setIsLoading(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const tieneCambios = useMemo(() => {
        if (!rubricas || !guardadas) return {}
        return Object.fromEntries(
            TIPOS_RUBRICA.map(({ id }) => [id, JSON.stringify(rubricas[id]) !== JSON.stringify(guardadas[id])])
        )
    }, [rubricas, guardadas])
    const hayCambios = Object.values(tieneCambios).some(Boolean)

    // Borrador en sessionStorage: sobrevive a cambiar de pestaña del panel y a recargar
    useEffect(() => {
        if (!rubricas || !guardadas) return
        const pendientes = {}
        TIPOS_RUBRICA.forEach(({ id }) => {
            if (tieneCambios[id]) pendientes[id] = rubricas[id]
        })
        escribirBorrador(pendientes)
    }, [rubricas, guardadas, tieneCambios])

    useEffect(() => {
        if (!hayCambios) return
        function avisar(e) {
            e.preventDefault()
            e.returnValue = ""
        }
        window.addEventListener("beforeunload", avisar)
        return () => window.removeEventListener("beforeunload", avisar)
    }, [hayCambios])

    useEffect(() => {
        if (!focoPendiente) return
        const temporizador = window.setTimeout(() => {
            const elemento = document.getElementById(focoPendiente.id)
            if (elemento) {
                elemento.focus({ preventScroll: true })
                if (!focoPendiente.sinScroll) {
                    elemento.scrollIntoView({ block: "center", behavior: prefiereMenosMovimiento() ? "auto" : "smooth" })
                }
            }
            setFocoPendiente(null)
        }, focoPendiente.espera || 0)
        return () => window.clearTimeout(temporizador)
    }, [focoPendiente])

    const rubrica = rubricas?.[tipoActivo]
    const erroresActivos = useMemo(
        () => (rubrica && intentos[tipoActivo] ? validarRubrica(rubrica) : null),
        [rubrica, intentos, tipoActivo]
    )

    function actualizarRubrica(cambio) {
        setRubricas((prev) => ({ ...prev, [tipoActivo]: cambio(prev[tipoActivo]) }))
        setSaveStatus(null)
        setConfirmandoDescarte(false)
    }

    function actualizarHito(hitoId, cambio) {
        actualizarRubrica((actual) => ({
            ...actual,
            subrubricas: actual.subrubricas.map((hito) => (hito._key === hitoId ? cambio(hito) : hito)),
        }))
    }

    function abrirHitos(ids) {
        setHitosAbiertos((prev) => new Set([...prev, ...ids]))
    }

    function alternarHito(hitoId) {
        setHitosAbiertos((prev) => {
            const siguiente = new Set(prev)
            if (siguiente.has(hitoId)) siguiente.delete(hitoId)
            else siguiente.add(hitoId)
            return siguiente
        })
    }

    function cambiarTipo(id) {
        setTipoActivo(id)
        setSaveStatus(null)
        setConfirmandoDescarte(false)
        setHitoActivo(null)
    }

    function manejarTeclaTabs(e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
        e.preventDefault()
        const index = TIPOS_RUBRICA.findIndex((t) => t.id === tipoActivo)
        const siguiente = TIPOS_RUBRICA[(index + (e.key === "ArrowRight" ? 1 : -1) + TIPOS_RUBRICA.length) % TIPOS_RUBRICA.length]
        cambiarTipo(siguiente.id)
        setFocoPendiente({ id: `tab-${siguiente.id}`, sinScroll: true })
    }

    function agregarHito() {
        const hito = crearHito(restante(rubrica.subrubricas) || "")
        actualizarRubrica((actual) => ({ ...actual, subrubricas: [...actual.subrubricas, hito] }))
        abrirHitos([hito._key])
        setFocoPendiente({ id: `hito-nombre-${hito._key}`, espera: ESPERA_APERTURA })
    }

    function usarPlantilla() {
        actualizarRubrica((actual) => ({ ...actual, subrubricas: crearHitosPlantilla(tipoActivo) }))
        setAnuncio("Cargamos la plantilla de ejemplo.")
    }

    function eliminarHito(index) {
        const hitos = rubrica.subrubricas
        const hito = hitos[index]
        const vecino = hitos[index + 1] || hitos[index - 1]
        actualizarRubrica((actual) => ({
            ...actual,
            subrubricas: actual.subrubricas.filter((h) => h._key !== hito._key),
        }))
        setAnuncio(`Eliminaste ${hito.nombre.trim() ? `“${hito.nombre.trim()}”` : `el hito ${index + 1}`}.`)
        setFocoPendiente({ id: vecino ? `hito-toggle-${vecino._key}` : "agregar-hito" })
    }

    function moverHito(index, direccion, origen) {
        const hitos = rubrica.subrubricas
        const destino = index + direccion
        if (destino < 0 || destino >= hitos.length) return
        const hito = hitos[index]
        actualizarRubrica((actual) => {
            const subrubricas = [...actual.subrubricas]
            ;[subrubricas[index], subrubricas[destino]] = [subrubricas[destino], subrubricas[index]]
            return { ...actual, subrubricas }
        })
        setAnuncio(
            `Moviste ${hito.nombre.trim() ? `“${hito.nombre.trim()}”` : "el hito"} a la posición ${destino + 1} de ${hitos.length}.`
        )
        // Si el botón usado queda deshabilitado en el extremo, el foco pasa al contrario
        const llegoAlExtremo = destino === 0 || destino === hitos.length - 1
        const sentido = llegoAlExtremo ? (direccion < 0 ? "bajar" : "subir") : direccion < 0 ? "subir" : "bajar"
        setFocoPendiente({ id: `hito-${sentido}-${origen}-${hito._key}` })
    }

    function repartirHitos() {
        actualizarRubrica((actual) => ({ ...actual, subrubricas: repartirIguales(actual.subrubricas) }))
        setAnuncio("Repartiste el peso de los hitos en partes iguales.")
    }

    function repartirCriterios(hitoId) {
        actualizarHito(hitoId, (hito) => ({ ...hito, criterios: repartirIguales(hito.criterios) }))
        setAnuncio("Repartiste el peso de los criterios en partes iguales.")
    }

    function agregarCriterio(hitoId) {
        const criterio = crearCriterio()
        actualizarHito(hitoId, (hito) => ({
            ...hito,
            criterios: [...hito.criterios, { ...criterio, ponderacion: restante(hito.criterios) || "" }],
        }))
        setFocoPendiente({ id: `crit-nombre-${criterio._key}` })
    }

    function cambiarCriterio(hitoId, criterioId, campo, valor) {
        actualizarHito(hitoId, (hito) => ({
            ...hito,
            criterios: hito.criterios.map((criterio) => (criterio._key === criterioId ? { ...criterio, [campo]: valor } : criterio)),
        }))
    }

    function eliminarCriterio(hitoId, criterioId) {
        const hito = rubrica.subrubricas.find((h) => h._key === hitoId)
        const index = hito.criterios.findIndex((c) => c._key === criterioId)
        const vecino = hito.criterios[index + 1] || hito.criterios[index - 1]
        actualizarHito(hitoId, (actual) => ({
            ...actual,
            criterios: actual.criterios.filter((criterio) => criterio._key !== criterioId),
        }))
        setAnuncio("Eliminaste un criterio.")
        setFocoPendiente({ id: vecino ? `crit-nombre-${vecino._key}` : `agregar-criterio-${hitoId}` })
    }

    function descartarCambios() {
        setRubricas((prev) => ({ ...prev, [tipoActivo]: guardadas[tipoActivo] }))
        setIntentos((prev) => ({ ...prev, [tipoActivo]: false }))
        setConfirmandoDescarte(false)
        setSaveStatus(null)
        setAnuncio("Descartaste los cambios.")
    }

    async function guardarRubrica() {
        setIntentos((prev) => ({ ...prev, [tipoActivo]: true }))
        setConfirmandoDescarte(false)
        const validacion = validarRubrica(rubrica)
        if (validacion) {
            const conErrores = Object.keys(validacion.hitos)
            abrirHitos(conErrores)
            const cantidad = contarErrores(validacion)
            const texto = cantidad === 1 ? "Hay 1 cosa por corregir antes de guardar." : `Hay ${cantidad} cosas por corregir antes de guardar.`
            setSaveStatus({ tipo: "invalido", texto })
            setAnuncio(`${texto} Te llevamos a la primera.`)
            setFocoPendiente({ id: primerError(rubrica, validacion), espera: conErrores.length > 0 ? ESPERA_APERTURA : 0 })
            return
        }

        if (rubrica.id === null || rubrica.id === undefined) {
            setSaveStatus({
                tipo: "error",
                texto: sinServidor
                    ? "No pudimos guardar: no hay conexión con el servidor. Tus cambios siguen aquí como borrador."
                    : `No pudimos guardar: la rúbrica de ${etiquetaDe(tipoActivo)} no existe en el servidor. Pide que la creen.`,
            })
            return
        }

        setIsSaving(true)
        setSaveStatus(null)
        try {
            // La respuesta trae la rúbrica actualizada: los hitos y criterios nuevos ya tienen id
            const respuesta = await updateRubrica(rubrica.id, construirPayload(rubrica))
            const actualizada = respuesta?.subrubricas
                ? conservarClaves(normalizarRubrica(respuesta, tipoActivo), rubrica)
                : rubrica
            setRubricas((prev) => ({ ...prev, [tipoActivo]: actualizada }))
            setGuardadas((prev) => ({ ...prev, [tipoActivo]: actualizada }))
            setSaveStatus({ tipo: "success", texto: "Guardado. La rúbrica quedó al día." })
        } catch (err) {
            setSaveStatus({
                tipo: "error",
                texto: `No pudimos guardar: ${mensajeDeError(err)} Tus cambios siguen aquí como borrador.`,
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading || !rubrica) {
        return (
            <div className="space-y-6" aria-busy="true">
                <span className="sr-only">Cargando rúbricas…</span>
                <div className="h-8 w-64 max-w-full animate-pulse rounded-xl bg-superficie motion-reduce:animate-none" />
                <div className="h-4 w-full animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
                {[0, 1, 2].map((n) => (
                    <div key={n} className="h-20 animate-pulse rounded-2xl bg-superficie motion-reduce:animate-none" />
                ))}
            </div>
        )
    }

    const etiquetaActiva = TIPOS_RUBRICA.find((t) => t.id === tipoActivo)?.label
    const totalHitos = sumarPonderaciones(rubrica.subrubricas)
    const cambiosActivos = Boolean(tieneCambios[tipoActivo])
    const otraConCambios = TIPOS_RUBRICA.find((t) => t.id !== tipoActivo && tieneCambios[t.id])

    return (
        <div className="space-y-8">
            <p className="sr-only" aria-live="polite">
                {anuncio}
            </p>

            {/* Encabezado */}
            <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Rúbricas de evaluación</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                    Reparte cuánto pesa cada hito en la nota final y define con qué criterios se califica cada uno.
                    Los evaluadores ponen una nota de {ESCALA_MIN} a {ESCALA_MAX} en cada criterio.
                </p>
            </div>

            {sinServidor && (
                <div className="flex flex-col gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-start">
                    <CloudOff className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                    <div className="flex-1 space-y-1 text-sm leading-relaxed">
                        <p className="font-semibold">Estás trabajando sin servidor</p>
                        <p>
                            Aún no hay conexión con el servidor de rúbricas, así que <strong>guardar va a fallar</strong>.
                            Puedes editar tranquilo: tus cambios quedan como borrador en este navegador.
                        </p>
                    </div>
                    <button type="button" onClick={loadData} className={`${BOTON_SECUNDARIO} shrink-0`}>
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Volver a intentar
                    </button>
                </div>
            )}

            {!sinServidor && rubrica.id === null && (
                <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                    <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
                    <p>
                        El servidor todavía no tiene la rúbrica de <strong>{etiquetaDe(tipoActivo)}</strong>. Puedes
                        prepararla aquí, pero no se podrá guardar hasta que exista.
                    </p>
                </div>
            )}

            {borradorRecuperado && hayCambios && (
                <p className="flex items-center gap-2 text-sm text-slate-600 animate-aparecer motion-reduce:animate-desvanecer">
                    <RotateCcw className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    Recuperamos los cambios que no habías guardado.
                </p>
            )}

            {/* Pestañas de rúbrica */}
            <div role="tablist" aria-label="Tipo de rúbrica" className="flex gap-6 border-b border-slate-200" onKeyDown={manejarTeclaTabs}>
                {TIPOS_RUBRICA.map(({ id, label }) => {
                    const activa = id === tipoActivo
                    return (
                        <button
                            key={id}
                            id={`tab-${id}`}
                            type="button"
                            role="tab"
                            aria-selected={activa}
                            aria-controls="panel-rubrica"
                            tabIndex={activa ? 0 : -1}
                            onClick={() => cambiarTipo(id)}
                            className={`relative -mb-px min-h-11 pb-3 pt-1 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15 ${activa ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
                                }`}
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold">
                                {label}
                                {tieneCambios[id] && (
                                    <>
                                        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                                        <span className="sr-only">(con cambios sin guardar)</span>
                                    </>
                                )}
                            </span>
                            <span
                                aria-hidden="true"
                                className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-ufps transition-opacity duration-200 ${activa ? "opacity-100" : "opacity-0"
                                    }`}
                            />
                        </button>
                    )
                })}
            </div>

            <div id="panel-rubrica" role="tabpanel" aria-labelledby={`tab-${tipoActivo}`} className="space-y-10">
                {/* Nombre: lo define el sistema, no se edita ni se envía en el PUT */}
                <div className="max-w-xl space-y-1.5">
                    <label htmlFor="rubrica-nombre" className={ETIQUETA}>
                        Nombre de la rúbrica
                    </label>
                    <div className="relative">
                        <input
                            id="rubrica-nombre"
                            type="text"
                            value={rubrica.nombre}
                            readOnly
                            aria-describedby="rubrica-nombre-ayuda"
                            className="w-full cursor-not-allowed rounded-xl bg-slate-200/70 py-2.5 pl-3.5 pr-10 text-lg font-semibold text-slate-700 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        />
                        <Lock
                            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                            aria-hidden="true"
                        />
                    </div>
                    <p id="rubrica-nombre-ayuda" className="text-xs text-slate-500">
                        El nombre lo define el sistema y no se puede cambiar.
                    </p>
                </div>

                {/* Reparto entre hitos */}
                <section aria-labelledby="reparto-hitos" className="space-y-5">
                    <DistribucionPesos
                        items={rubrica.subrubricas}
                        total={totalHitos}
                        titulo="¿Cuánto pesa cada hito en la nota final?"
                        tituloId="reparto-hitos"
                        nombreItem="hito"
                        activoId={hitoActivo}
                        onSeleccionar={(hitoId) => setFocoPendiente({ id: `hito-peso-${hitoId}` })}
                        onRepartir={repartirHitos}
                    />

                    {rubrica.subrubricas.length === 0 ? (
                        <div className="space-y-4 rounded-2xl bg-superficie px-5 py-8 text-center">
                            <p className="text-base font-semibold text-slate-900">Esta rúbrica todavía no tiene hitos</p>
                            <p className="mx-auto max-w-md text-sm text-slate-600">
                                Cada hito es una etapa que se evalúa por separado, como Ideación o Validación. Empieza por el
                                primero o carga la plantilla de ejemplo.
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button id="agregar-hito" type="button" onClick={agregarHito} className={BOTON_PRIMARIO}>
                                    <Plus className="h-4 w-4" aria-hidden="true" />
                                    Agregar el primer hito
                                </button>
                                <button type="button" onClick={usarPlantilla} className={BOTON_SECUNDARIO}>
                                    Usar la plantilla de ejemplo
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <ol className="space-y-3">
                                {rubrica.subrubricas.map((hito, index) => (
                                    <HitoCard
                                        key={hito._key}
                                        hito={hito}
                                        numero={index + 1}
                                        esPrimero={index === 0}
                                        esUltimo={index === rubrica.subrubricas.length - 1}
                                        abierto={hitosAbiertos.has(hito._key)}
                                        activo={hitoActivo === hito._key}
                                        errores={erroresActivos?.hitos?.[hito._key]}
                                        onToggle={() => alternarHito(hito._key)}
                                        onActivar={(activo) => setHitoActivo(activo ? hito._key : null)}
                                        onCambiar={(campo, valor) => actualizarHito(hito._key, (actual) => ({ ...actual, [campo]: valor }))}
                                        onCambiarCriterio={(criterioId, campo, valor) => cambiarCriterio(hito._key, criterioId, campo, valor)}
                                        onAgregarCriterio={() => agregarCriterio(hito._key)}
                                        onEliminarCriterio={(criterioId) => eliminarCriterio(hito._key, criterioId)}
                                        onRepartirCriterios={() => repartirCriterios(hito._key)}
                                        onMover={(direccion, origen) => moverHito(index, direccion, origen)}
                                        onEliminar={() => eliminarHito(index)}
                                    />
                                ))}
                            </ol>
                            <button id="agregar-hito" type="button" onClick={agregarHito} className={BOTON_SECUNDARIO}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Agregar hito
                            </button>
                        </>
                    )}

                    {erroresActivos?.general && rubrica.subrubricas.length === 0 && (
                        <p className={ERROR}>
                            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {erroresActivos.general}
                        </p>
                    )}
                </section>
            </div>

            {/* Barra de acciones fija */}
            <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20">
                <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.35)] ring-1 ring-slate-200 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1 text-sm" role="status">
                        {isSaving ? (
                            <p className="flex items-center gap-2 text-slate-600">
                                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                Guardando…
                            </p>
                        ) : saveStatus?.tipo === "success" ? (
                            <p className="flex items-center gap-2 font-medium text-emerald-700 animate-aparecer motion-reduce:animate-desvanecer">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white animate-confirmar motion-reduce:animate-desvanecer">
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                                </span>
                                {saveStatus.texto}
                            </p>
                        ) : saveStatus ? (
                            <p className="flex items-start gap-2 font-medium text-ufps animate-aparecer motion-reduce:animate-desvanecer">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                {saveStatus.texto}
                            </p>
                        ) : confirmandoDescarte ? (
                            <p className="font-medium text-slate-900">
                                ¿Descartar los cambios de {etiquetaActiva}? Vuelve a como estaba guardada.
                            </p>
                        ) : cambiosActivos ? (
                            <p className="flex flex-wrap items-center gap-x-2 text-slate-700">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                                <span className="font-medium">Tienes cambios sin guardar en {etiquetaActiva}</span>                            </p>
                        ) : (
                            <p className="text-slate-500">
                                {otraConCambios
                                    ? `${etiquetaActiva} está al día. Te quedan cambios en ${otraConCambios.label}.`
                                    : "Todo está guardado."}
                            </p>
                        )}
                    </div>

                    <div
                        className="flex shrink-0 gap-2"
                        onKeyDown={(e) => {
                            if (e.key === "Escape" && confirmandoDescarte) setConfirmandoDescarte(false)
                        }}
                    >
                        {confirmandoDescarte ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setConfirmandoDescarte(false)}
                                    className={`${BOTON_SECUNDARIO} flex-1 sm:flex-none`}
                                    autoFocus
                                >
                                    Seguir editando
                                </button>
                                <button type="button" onClick={descartarCambios} className={`${BOTON_PRIMARIO} flex-1 sm:flex-none`}>
                                    Sí, descartar
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSaveStatus(null)
                                        setConfirmandoDescarte(true)
                                    }}
                                    disabled={!cambiosActivos || isSaving}
                                    className={`${BOTON_SECUNDARIO} flex-1 sm:flex-none`}
                                >
                                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                    Descartar
                                </button>
                                <button
                                    type="button"
                                    onClick={guardarRubrica}
                                    disabled={!cambiosActivos || isSaving}
                                    className={`${BOTON_PRIMARIO} flex-1 sm:flex-none`}
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                                    ) : (
                                        <Save className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    Guardar {etiquetaActiva?.toLowerCase()}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

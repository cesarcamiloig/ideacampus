// Reglas de la rúbrica dinámica (HU-06), compartidas por el editor y, más
// adelante, por el formulario del evaluador (GENNOVA-70).
//
// Estructura (modelos Rubrica → SubRubrica → CriterioRubrica):
// - Cada tipo de iniciativa tiene una única rúbrica.
// - La rúbrica se divide en hitos (subrúbricas); sus ponderaciones suman 100%
//   y definen el peso de cada hito en la nota global.
// - Cada hito tiene criterios propios; sus ponderaciones suman 100% dentro del hito.

export const TIPOS_RUBRICA = [
    { id: "emprendimiento", label: "Emprendimiento" },
    { id: "innovacion", label: "Innovación" },
]

export const ESCALA_MIN = 1
export const ESCALA_MAX = 5
export const PESO_TOTAL = 100

// Hasta 3 enteros y 2 decimales, igual que DecimalField(max_digits=5, decimal_places=2)
const FORMATO_PONDERACION = /^\d{1,3}(\.\d{1,2})?$/

// TODO: reemplazar por los hitos y criterios definidos por el PO.
const PLANTILLAS = {
    emprendimiento: [
        {
            nombre: "Ideación",
            descripcion: "Definición del problema y de la oportunidad de negocio.",
            ponderacion: 30,
            criterios: [
                { nombre: "Problema y oportunidad", descripcion: "Claridad del problema y tamaño de la oportunidad.", ponderacion: 50 },
                { nombre: "Propuesta de valor", descripcion: "Diferenciación frente a las alternativas existentes.", ponderacion: 50 },
            ],
        },
        {
            nombre: "Validación",
            descripcion: "Contraste de la idea con clientes y mercado.",
            ponderacion: 40,
            criterios: [
                { nombre: "Evidencia de solidez", descripcion: "Validaciones, pruebas o datos que respaldan la iniciativa.", ponderacion: 40 },
                { nombre: "Modelo de negocio", descripcion: "Fuentes de ingreso, clientes y canales.", ponderacion: 35 },
                { nombre: "Equipo", descripcion: "Capacidades y compromiso del equipo emprendedor.", ponderacion: 25 },
            ],
        },
        {
            nombre: "Lanzamiento",
            descripcion: "Preparación para llevar la solución al mercado.",
            ponderacion: 30,
            criterios: [
                { nombre: "Viabilidad financiera", descripcion: "Costos, proyecciones y sostenibilidad.", ponderacion: 60 },
                { nombre: "Plan de salida al mercado", descripcion: "Estrategia comercial y primeros clientes.", ponderacion: 40 },
            ],
        },
    ],
    innovacion: [
        {
            nombre: "Concepción",
            descripcion: "Planteamiento de la solución y su novedad.",
            ponderacion: 30,
            criterios: [
                { nombre: "Grado de novedad", descripcion: "Qué tan nueva es la solución frente al estado del arte.", ponderacion: 60 },
                { nombre: "Pertinencia", descripcion: "Relación con una necesidad real del sector o la comunidad.", ponderacion: 40 },
            ],
        },
        {
            nombre: "Desarrollo técnico",
            descripcion: "Construcción y pruebas de la solución.",
            ponderacion: 40,
            criterios: [
                { nombre: "Evidencia de solidez", descripcion: "Rigor técnico y resultados de pruebas.", ponderacion: 50 },
                { nombre: "Madurez tecnológica", descripcion: "Nivel de avance de la solución (TRL).", ponderacion: 30 },
                { nombre: "Equipo", descripcion: "Capacidades técnicas del equipo.", ponderacion: 20 },
            ],
        },
        {
            nombre: "Transferencia",
            descripcion: "Impacto y posibilidad de escalar la solución.",
            ponderacion: 30,
            criterios: [
                { nombre: "Impacto", descripcion: "Beneficio esperado para usuarios, sector o comunidad.", ponderacion: 60 },
                { nombre: "Escalabilidad", descripcion: "Posibilidad de crecer o replicarse.", ponderacion: 40 },
            ],
        },
    ],
}

export function nuevoIdLocal() {
    return `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function esIdLocal(id) {
    return String(id).startsWith("nuevo-")
}

export function crearCriterio(ponderacion = "") {
    return {
        id: nuevoIdLocal(),
        nombre: "",
        descripcion: "",
        ponderacion,
        escala_min: ESCALA_MIN,
        escala_max: ESCALA_MAX,
    }
}

export function crearHito(ponderacion = "") {
    return {
        id: nuevoIdLocal(),
        nombre: "",
        descripcion: "",
        ponderacion,
        criterios: [crearCriterio(PESO_TOTAL)],
    }
}

export function crearRubricaBase(tipo) {
    const label = TIPOS_RUBRICA.find((t) => t.id === tipo)?.label || tipo
    return {
        id: null,
        tipo_iniciativa: tipo,
        nombre: `Rúbrica de ${label}`,
        subrubricas: PLANTILLAS[tipo].map((hito) => ({
            id: nuevoIdLocal(),
            nombre: hito.nombre,
            descripcion: hito.descripcion,
            ponderacion: hito.ponderacion,
            criterios: hito.criterios.map((criterio) => ({
                ...crearCriterio(criterio.ponderacion),
                nombre: criterio.nombre,
                descripcion: criterio.descripcion,
            })),
        })),
    }
}

function redondear(valor) {
    return Math.round(valor * 100) / 100
}

export function sumarPonderaciones(items) {
    return redondear(items.reduce((total, item) => total + (Number(item.ponderacion) || 0), 0))
}

// Aporte de un criterio a la nota del hito: la nota máxima otorga la
// ponderación completa y las demás se escalan proporcionalmente (nota / máx).
export function calcularAporteCriterio(criterio, nota) {
    const escalaMax = Number(criterio.escala_max) || ESCALA_MAX
    return (Number(criterio.ponderacion) || 0) * (nota / escalaMax)
}

// Nota del hito sobre 100 (equivale a Evaluacion.nota_final).
export function calcularNotaHito(criterios, notas) {
    return criterios.reduce(
        (total, criterio) =>
            total + calcularAporteCriterio(criterio, notas[criterio.id] ?? (Number(criterio.escala_max) || ESCALA_MAX)),
        0
    )
}

// Aporte de un hito a la nota global sobre 100.
export function calcularAporteHito(hito, notaHito) {
    return ((Number(hito.ponderacion) || 0) * notaHito) / PESO_TOTAL
}

function validarPonderacion(valor) {
    const texto = String(valor).trim()
    const numero = Number(texto)
    if (!texto || !FORMATO_PONDERACION.test(texto) || numero <= 0 || numero > PESO_TOTAL) {
        return `Entre 0.01 y ${PESO_TOTAL}, máximo 2 decimales.`
    }
    return null
}

function validarNombresUnicos(items, mensajeVacio) {
    const errores = {}
    const vistos = new Set()
    items.forEach((item) => {
        const nombre = item.nombre.trim().toLowerCase()
        if (!nombre) {
            errores[item.id] = mensajeVacio
        } else if (vistos.has(nombre)) {
            errores[item.id] = "Ya existe otro con este nombre."
        }
        vistos.add(nombre)
    })
    return errores
}

export function validarRubrica(rubrica) {
    const errores = { hitos: {} }

    if (!rubrica.nombre.trim()) {
        errores.nombre = "Indica el nombre de la rúbrica."
    }

    const hitos = rubrica.subrubricas
    if (hitos.length === 0) {
        errores.general = "La rúbrica debe tener al menos un hito."
    } else {
        const totalHitos = sumarPonderaciones(hitos)
        if (totalHitos !== PESO_TOTAL) {
            errores.general = `Las ponderaciones de los hitos deben sumar ${PESO_TOTAL}%. Suma actual: ${totalHitos}%.`
        }
    }

    const nombresHitos = validarNombresUnicos(hitos, "Indica el nombre del hito.")

    hitos.forEach((hito) => {
        const errorHito = { criterios: {} }
        if (nombresHitos[hito.id]) errorHito.nombre = nombresHitos[hito.id]

        const errorPonderacion = validarPonderacion(hito.ponderacion)
        if (errorPonderacion) errorHito.ponderacion = errorPonderacion

        if (hito.criterios.length === 0) {
            errorHito.general = "El hito debe tener al menos un criterio."
        } else {
            const totalCriterios = sumarPonderaciones(hito.criterios)
            if (totalCriterios !== PESO_TOTAL) {
                errorHito.general = `Los criterios de este hito deben sumar ${PESO_TOTAL}%. Suma actual: ${totalCriterios}%.`
            }
        }

        const nombresCriterios = validarNombresUnicos(hito.criterios, "Indica el nombre del criterio.")
        hito.criterios.forEach((criterio) => {
            const errorCriterio = {}
            if (nombresCriterios[criterio.id]) errorCriterio.nombre = nombresCriterios[criterio.id]
            const errorPeso = validarPonderacion(criterio.ponderacion)
            if (errorPeso) errorCriterio.ponderacion = errorPeso
            if (Object.keys(errorCriterio).length > 0) {
                errorHito.criterios[criterio.id] = errorCriterio
            }
        })

        if (
            errorHito.nombre ||
            errorHito.ponderacion ||
            errorHito.general ||
            Object.keys(errorHito.criterios).length > 0
        ) {
            errores.hitos[hito.id] = errorHito
        }
    })

    const tieneErrores =
        Boolean(errores.nombre || errores.general) || Object.keys(errores.hitos).length > 0
    return tieneErrores ? errores : null
}

export function formatPorcentaje(valor) {
    const numero = Number(valor) || 0
    return Number.isInteger(numero) ? `${numero}%` : `${numero.toFixed(2).replace(/\.?0+$/, "")}%`
}

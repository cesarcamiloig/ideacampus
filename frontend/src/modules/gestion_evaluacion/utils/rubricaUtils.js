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

// Clave solo para la interfaz (listas de React, ids del DOM, errores). Nunca se envía al
// backend: el `id` de cada hito o criterio es únicamente el que asigna el servidor y los
// elementos nuevos no lo llevan.
let contadorClaves = 0
export function nuevaClave() {
    contadorClaves += 1
    return `k${contadorClaves}-${Math.random().toString(36).slice(2, 8)}`
}

export function crearCriterio(ponderacion = "") {
    return {
        _key: nuevaClave(),
        nombre: "",
        descripcion: "",
        ponderacion,
        escala_min: ESCALA_MIN,
        escala_max: ESCALA_MAX,
    }
}

export function crearHito(ponderacion = "") {
    return {
        _key: nuevaClave(),
        nombre: "",
        descripcion: "",
        ponderacion,
        criterios: [crearCriterio(PESO_TOTAL)],
    }
}

// Hitos de ejemplo, todos nuevos (sin id)
export function crearHitosPlantilla(tipo) {
    return PLANTILLAS[tipo].map((hito) => ({
        _key: nuevaClave(),
        nombre: hito.nombre,
        descripcion: hito.descripcion,
        ponderacion: hito.ponderacion,
        criterios: hito.criterios.map((criterio) => ({
            ...crearCriterio(criterio.ponderacion),
            nombre: criterio.nombre,
            descripcion: criterio.descripcion,
        })),
    }))
}

export function crearRubricaBase(tipo) {
    const label = TIPOS_RUBRICA.find((t) => t.id === tipo)?.label || tipo
    return {
        id: null,
        tipo_iniciativa: tipo,
        nombre: `Rúbrica de ${label}`,
        subrubricas: crearHitosPlantilla(tipo),
    }
}

// Convierte la rúbrica del servidor al estado del formulario: conserva los id del
// backend y agrega una _key local. Los campos extra (rubrica, subrubrica,
// suma_criterios, creado) se descartan.
export function normalizarRubrica(rubrica, tipo) {
    return {
        id: rubrica.id ?? null,
        tipo_iniciativa: rubrica.tipo_iniciativa || tipo,
        nombre: rubrica.nombre || "",
        subrubricas: [...(rubrica.subrubricas || [])]
            .sort((a, b) => (a.numero_hito ?? 0) - (b.numero_hito ?? 0))
            .map((hito) => ({
                id: hito.id,
                _key: nuevaClave(),
                nombre: hito.nombre || "",
                descripcion: hito.descripcion || "",
                ponderacion: normalizarPonderacion(hito.ponderacion),
                criterios: (hito.criterios || []).map((criterio) => ({
                    id: criterio.id,
                    _key: nuevaClave(),
                    nombre: criterio.nombre || "",
                    descripcion: criterio.descripcion || "",
                    ponderacion: normalizarPonderacion(criterio.ponderacion),
                    escala_min: criterio.escala_min ?? ESCALA_MIN,
                    escala_max: criterio.escala_max ?? ESCALA_MAX,
                })),
            })),
    }
}

// Tras guardar, la respuesta trae los mismos hitos y criterios en el mismo orden: se
// reutilizan las _key anteriores para que los hitos abiertos sigan abiertos.
export function conservarClaves(nueva, anterior) {
    return {
        ...nueva,
        subrubricas: nueva.subrubricas.map((hito, i) => {
            const previo = anterior.subrubricas[i]
            if (!previo) return hito
            return {
                ...hito,
                _key: previo._key,
                criterios: hito.criterios.map((criterio, j) =>
                    previo.criterios[j] ? { ...criterio, _key: previo.criterios[j]._key } : criterio
                ),
            }
        }),
    }
}

// Cuerpo del PUT: id solo en lo que ya existía, sin _key y ponderaciones como texto ("35.00").
// El nombre de la rúbrica no se envía: es fijo.
export function construirPayload(rubrica) {
    const conId = (item) => (item.id !== null && item.id !== undefined ? { id: item.id } : {})
    return {
        subrubricas: rubrica.subrubricas.map((hito, index) => ({
            ...conId(hito),
            numero_hito: index + 1,
            nombre: hito.nombre.trim(),
            descripcion: hito.descripcion.trim(),
            ponderacion: ponderacionATexto(hito.ponderacion),
            criterios: hito.criterios.map((criterio) => ({
                ...conId(criterio),
                nombre: criterio.nombre.trim(),
                descripcion: criterio.descripcion.trim(),
                ponderacion: ponderacionATexto(criterio.ponderacion),
                escala_min: criterio.escala_min,
                escala_max: criterio.escala_max,
            })),
        })),
    }
}

function normalizarPonderacion(valor) {
    // DRF serializa los DecimalField como texto ("30.00")
    return valor === null || valor === undefined || valor === "" ? "" : Number(valor)
}

function ponderacionATexto(valor) {
    return Number(valor).toFixed(2)
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
            total + calcularAporteCriterio(criterio, notas[criterio._key] ?? (Number(criterio.escala_max) || ESCALA_MAX)),
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
            errores[item._key] = mensajeVacio
        } else if (vistos.has(nombre)) {
            errores[item._key] = "Ya existe otro con este nombre."
        }
        vistos.add(nombre)
    })
    return errores
}

export function validarRubrica(rubrica) {
    const errores = { hitos: {} }

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
        if (nombresHitos[hito._key]) errorHito.nombre = nombresHitos[hito._key]

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
            if (nombresCriterios[criterio._key]) errorCriterio.nombre = nombresCriterios[criterio._key]
            const errorPeso = validarPonderacion(criterio.ponderacion)
            if (errorPeso) errorCriterio.ponderacion = errorPeso
            if (Object.keys(errorCriterio).length > 0) {
                errorHito.criterios[criterio._key] = errorCriterio
            }
        })

        if (
            errorHito.nombre ||
            errorHito.ponderacion ||
            errorHito.general ||
            Object.keys(errorHito.criterios).length > 0
        ) {
            errores.hitos[hito._key] = errorHito
        }
    })

    const tieneErrores =
        Boolean(errores.general) || Object.keys(errores.hitos).length > 0
    return tieneErrores ? errores : null
}

export function formatPorcentaje(valor) {
    const numero = Number(valor) || 0
    return Number.isInteger(numero) ? `${numero}%` : `${numero.toFixed(2).replace(/\.?0+$/, "")}%`
}

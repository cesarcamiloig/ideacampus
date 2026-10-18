// Reglas de la rúbrica dinámica (HU-06), compartidas por el editor del
// administrador y, más adelante, por el formulario del evaluador (GENNOVA-70).

export const TIPOS_RUBRICA = [
    { id: "emprendimiento", label: "Emprendimiento" },
    { id: "innovacion", label: "Innovación" },
]

export const ESCALA_MIN = 1
export const ESCALA_MAX = 5
export const PESO_TOTAL = 100

// TODO: reemplazar por los módulos de ejemplo definidos por el PO.
const PLANTILLAS = {
    emprendimiento: [
        { nombre: "Problema y oportunidad", descripcion: "Claridad del problema y tamaño de la oportunidad.", peso: 20 },
        { nombre: "Propuesta de valor", descripcion: "Diferenciación frente a las alternativas existentes.", peso: 20 },
        { nombre: "Modelo de negocio", descripcion: "Fuentes de ingreso, clientes y canales.", peso: 20 },
        { nombre: "Evidencia de solidez", descripcion: "Validaciones, pruebas o datos que respaldan la iniciativa.", peso: 10 },
        { nombre: "Equipo", descripcion: "Capacidades y compromiso del equipo emprendedor.", peso: 15 },
        { nombre: "Viabilidad financiera", descripcion: "Costos, proyecciones y sostenibilidad.", peso: 15 },
    ],
    innovacion: [
        { nombre: "Grado de novedad", descripcion: "Qué tan nueva es la solución frente al estado del arte.", peso: 25 },
        { nombre: "Evidencia de solidez", descripcion: "Rigor técnico y resultados de pruebas.", peso: 20 },
        { nombre: "Impacto", descripcion: "Beneficio esperado para usuarios, sector o comunidad.", peso: 20 },
        { nombre: "Madurez tecnológica", descripcion: "Nivel de avance de la solución (TRL).", peso: 15 },
        { nombre: "Escalabilidad", descripcion: "Posibilidad de crecer o replicarse.", peso: 10 },
        { nombre: "Equipo", descripcion: "Capacidades técnicas del equipo.", peso: 10 },
    ],
}

export function nuevoIdLocal() {
    return `nuevo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function crearRubricaBase(tipo) {
    const label = TIPOS_RUBRICA.find((t) => t.id === tipo)?.label || tipo
    return {
        id_rubrica: null,
        tipo,
        nombre: `Rúbrica de ${label}`,
        criterios: PLANTILLAS[tipo].map((criterio, index) => ({
            ...criterio,
            id_criterio: nuevoIdLocal(),
            orden: index + 1,
        })),
    }
}

export function sumarPesos(criterios) {
    return criterios.reduce((total, criterio) => total + (Number(criterio.peso) || 0), 0)
}

// Aporte de un criterio a la nota final: un 5 otorga el peso completo y
// las demás notas se escalan proporcionalmente (nota / 5).
export function calcularAporte(peso, nota) {
    return (Number(peso) || 0) * (nota / ESCALA_MAX)
}

export function calcularNotaFinal(criterios, notas) {
    return criterios.reduce(
        (total, criterio) => total + calcularAporte(criterio.peso, notas[criterio.id_criterio] ?? ESCALA_MAX),
        0
    )
}

export function validarRubrica(rubrica) {
    const errores = { criterios: {} }

    if (!rubrica.nombre.trim()) {
        errores.nombre = "Indica el nombre de la rúbrica."
    }

    if (rubrica.criterios.length === 0) {
        errores.general = "La rúbrica debe tener al menos un módulo."
    }

    const nombresVistos = new Set()
    rubrica.criterios.forEach((criterio) => {
        const errorCriterio = {}
        const nombre = criterio.nombre.trim().toLowerCase()
        const peso = Number(criterio.peso)

        if (!nombre) {
            errorCriterio.nombre = "Indica el nombre del módulo."
        } else if (nombresVistos.has(nombre)) {
            errorCriterio.nombre = "Ya existe un módulo con este nombre."
        }
        nombresVistos.add(nombre)

        if (criterio.peso === "" || !Number.isInteger(peso) || peso < 1 || peso > PESO_TOTAL) {
            errorCriterio.peso = `Entero entre 1 y ${PESO_TOTAL}.`
        }

        if (Object.keys(errorCriterio).length > 0) {
            errores.criterios[criterio.id_criterio] = errorCriterio
        }
    })

    const total = sumarPesos(rubrica.criterios)
    if (!errores.general && total !== PESO_TOTAL) {
        errores.general = `Los porcentajes deben sumar ${PESO_TOTAL}%. Suma actual: ${total}%.`
    }

    const tieneErrores =
        Boolean(errores.nombre || errores.general) || Object.keys(errores.criterios).length > 0
    return tieneErrores ? errores : null
}

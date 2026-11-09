// Cálculos y formatos de la evaluación de hitos (HU-09).
// La vista previa de la nota usa la misma fórmula del backend (gestion_evaluacion/calculos.py).

export const NOTA_MAXIMA = 5

export const TIPOS_INICIATIVA = {
    emprendimiento: "Emprendimiento",
    innovacion: "Innovación",
}

const FORMATO_NOTA = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const FORMATO_PESO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 })
const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" })

// "4.25" → "4,25"; null → "—"
export function formatoNota(valor) {
    if (valor === null || valor === undefined || valor === "") return "—"
    const numero = Number(valor)
    return Number.isFinite(numero) ? FORMATO_NOTA.format(numero) : "—"
}

// "35.00" → "35 %"
export function formatoPeso(valor) {
    const numero = Number(valor)
    return Number.isFinite(numero) ? `${FORMATO_PESO.format(numero)} %` : ""
}

// Fechas "YYYY-MM-DD" del plan de trabajo: se leen como fecha local para no correr el día
function fechaLocal(iso) {
    const [anio, mes, dia] = iso.split("-").map(Number)
    return FORMATO_FECHA.format(new Date(anio, mes - 1, dia))
}

export function rangoFechas(inicio, fin) {
    if (inicio && fin) return `${fechaLocal(inicio)} – ${fechaLocal(fin)}`
    if (fin) return `Hasta el ${fechaLocal(fin)}`
    if (inicio) return `Desde el ${fechaLocal(inicio)}`
    return "Sin fechas definidas"
}

// Mismos estados y colores que el plan de trabajo del estudiante (HU-20)
export const ESTADOS_PLAN = {
    pendiente: { label: "Pendiente", clase: "bg-slate-200 text-slate-800" },
    en_curso: { label: "En curso", clase: "bg-slate-800 text-white" },
    finalizado: { label: "Finalizado", clase: "bg-ufps text-white" },
}

export function formatoFecha(valor) {
    if (!valor) return ""
    const fecha = new Date(valor)
    return Number.isNaN(fecha.getTime()) ? "" : FORMATO_FECHA.format(fecha)
}

// Suma de (nota normalizada × peso del criterio) / 100, llevada a la escala de 0 a 5.
// Solo cuenta los criterios ya calificados: con criterios pendientes la nota es parcial.
export function notaHitoPrevia(criterios, notas) {
    let resultado = 0
    let calificados = 0
    criterios.forEach((criterio) => {
        const valor = notas[criterio.id]
        if (valor === undefined || valor === null || valor === "") return
        const min = Number(criterio.escala_min)
        const max = Number(criterio.escala_max)
        if (!(max > min)) return
        resultado += ((Number(valor) - min) / (max - min)) * (Number(criterio.ponderacion) / 100)
        calificados += 1
    })
    return { nota: calificados > 0 ? resultado * NOTA_MAXIMA : null, calificados }
}

// La barra de calificación avanza de a un decimal: 1,0 · 1,1 · … · 5,0
export const PASO_NOTA = 0.1

const FORMATO_UN_DECIMAL = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Evita arrastres de coma flotante del slider (2.3000000000000003 → 2.3)
export function redondearNota(valor) {
    return Math.round(Number(valor) * 10) / 10
}

// 3.5 → "3,5"; 4 → "4,0"
export function formatoUnDecimal(valor) {
    return FORMATO_UN_DECIMAL.format(Number(valor))
}

// Marcas enteras bajo la barra (1, 2, 3, 4, 5)
export function marcasEscala(criterio) {
    const min = Math.ceil(Number(criterio.escala_min))
    const max = Math.floor(Number(criterio.escala_max))
    if (!(max > min) || max - min > 10) return [Number(criterio.escala_min), Number(criterio.escala_max)]
    return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

// Los criterios del hito deben sumar 100 % para que el backend acepte la evaluación
export function rubricaDelHitoCompleta(hito) {
    const criterios = hito?.criterios || []
    if (criterios.length === 0) return false
    const suma = criterios.reduce((total, c) => total + Number(c.ponderacion || 0), 0)
    return Math.abs(suma - 100) < 0.001
}

function aTexto(valor) {
    if (valor === null || valor === undefined) return ""
    if (Array.isArray(valor)) return valor.map(aTexto).filter(Boolean).join(" ")
    if (typeof valor === "object") {
        return Object.entries(valor)
            .map(([clave, v]) => {
                const texto = aTexto(v)
                if (!texto) return ""
                if (clave === "faltantes") return `Faltan criterios por calificar: ${texto}.`
                if (clave === "invalidos") return `Criterios que no pertenecen al hito: ${texto}.`
                if (clave === "repetidos") return `Criterios repetidos: ${texto}.`
                return texto
            })
            .filter(Boolean)
            .join(" ")
    }
    return String(valor)
}

// Convierte el error del API en un solo mensaje legible
export function mensajeDeError(err, mensajePorDefecto) {
    const data = err?.data
    if (err?.status === 403) return err.message || "Tu rol no tiene permiso para esta acción."
    if (!data || typeof data !== "object" || err.status >= 500) return err?.message || mensajePorDefecto
    return aTexto(data) || mensajePorDefecto
}

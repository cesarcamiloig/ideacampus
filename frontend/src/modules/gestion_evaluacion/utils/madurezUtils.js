// Descripción de cada nivel de madurez tecnológica (escala TRL adaptada, HU-11).
// El backend solo envía código y nombre; aquí está lo que el evaluador consulta antes de elegir.
export const INFO_NIVELES_MADUREZ = {
    M0: {
        resumen: "La iniciativa es una idea con un problema u oportunidad identificada.",
        evidencias: ["Descripción del problema y de la oportunidad", "Primeras hipótesis de solución"],
    },
    M1: {
        resumen: "Se formuló la solución tecnológica y se definieron sus principios básicos.",
        evidencias: ["Propuesta de solución documentada", "Revisión del estado del arte o de soluciones existentes"],
    },
    M2: {
        resumen: "El concepto fue validado con usuarios o expertos y es técnicamente viable.",
        evidencias: ["Entrevistas o encuestas a usuarios potenciales", "Análisis de viabilidad técnica"],
    },
    M3: {
        resumen: "Una prueba de concepto demuestra que las funciones críticas funcionan.",
        evidencias: ["Prueba de concepto o experimento funcional", "Resultados de las pruebas de las funciones críticas"],
    },
    M4: {
        resumen: "Un prototipo básico integra los componentes principales en entorno controlado.",
        evidencias: ["Prototipo básico funcional", "Pruebas en laboratorio o entorno controlado"],
    },
    M5: {
        resumen: "Un prototipo de alta fidelidad se acerca al producto final y se prueba en entorno relevante.",
        evidencias: ["Prototipo de alta fidelidad", "Pruebas con usuarios en un entorno similar al real"],
    },
    M6: {
        resumen: "Un sistema de demostración completo funciona en un entorno representativo.",
        evidencias: ["Demostración del sistema completo", "Métricas de desempeño en entorno representativo"],
    },
    M7: {
        resumen: "La solución se validó en condiciones reales de operación con usuarios finales.",
        evidencias: ["Piloto en entorno real", "Retroalimentación y métricas de usuarios finales"],
    },
    M8: {
        resumen: "El sistema está terminado, probado y calificado para su uso o comercialización.",
        evidencias: ["Producto terminado y documentado", "Certificaciones, permisos o pruebas de aceptación"],
    },
    M9: {
        resumen: "La solución se transfirió al mercado o al entorno productivo y opera de forma sostenida.",
        evidencias: ["Ventas, licencias o contratos de transferencia", "Operación sostenida con clientes o usuarios"],
    },
}

export function numeroNivel(codigo) {
    return Number(String(codigo || "").replace(/\D/g, "")) || 0
}

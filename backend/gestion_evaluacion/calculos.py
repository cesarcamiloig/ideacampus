from decimal import Decimal, ROUND_HALF_UP

from .models import Evaluacion, SubRubrica

CERO = Decimal("0")
CINCO = Decimal("5")
CIEN = Decimal("100")
CENTESIMA = Decimal("0.01")


def redondear(valor):
    """Redondea a 2 decimales (mitad hacia arriba)."""
    return valor.quantize(CENTESIMA, rounding=ROUND_HALF_UP)


def nota_hito(evaluacion):
    """
    Suma de (nota normalizada × peso del criterio) / 100, donde
    nota normalizada = (nota - escala_min) / (escala_max - escala_min).
    Devuelve el resultado en escala 0-1 ("resultado") y en escala 0-5 ("nota_en_5"), sin redondear.
    """
    resultado = CERO
    for nota in evaluacion.notas.select_related("criterio"):
        criterio = nota.criterio
        normalizada = (nota.nota - criterio.escala_min) / (criterio.escala_max - criterio.escala_min)
        resultado += normalizada * criterio.ponderacion / CIEN
    return {"resultado": resultado, "nota_en_5": CINCO * resultado}


def nota_hito_promedio(proyecto, subrubrica):
    """Promedio de las nota_final del hito (varios evaluadores); None si no tiene ninguna."""
    notas = list(
        Evaluacion.objects
        .filter(proyecto=proyecto, subrubrica=subrubrica, nota_final__isnull=False)
        .values_list("nota_final", flat=True)
    )
    if not notas:
        return None
    return sum(notas, CERO) / len(notas)


def nota_global(proyecto):
    """
    Suma de (nota_hito_promedio × ponderación del hito) / 100 sobre los hitos de la rúbrica
    del tipo del proyecto. Si faltan hitos por evaluar, divide por la suma de las
    ponderaciones de los evaluados en lugar de 100 y marca parcial=True.
    """
    hitos = SubRubrica.objects.filter(
        rubrica__tipo_iniciativa=proyecto.iniciativa.tipo
    ).order_by("numero_hito")

    detalle = []
    acumulado = CERO
    suma_evaluados = CERO
    for hito in hitos:
        nota = nota_hito_promedio(proyecto, hito)
        if nota is not None:
            acumulado += nota * hito.ponderacion
            suma_evaluados += hito.ponderacion
        detalle.append({
            "numero_hito": hito.numero_hito,
            "nombre": hito.nombre,
            "ponderacion": hito.ponderacion,
            "nota": redondear(nota) if nota is not None else None,
            "evaluado": nota is not None,
        })

    hitos_evaluados = sum(1 for h in detalle if h["evaluado"])
    parcial = hitos_evaluados < len(detalle)
    divisor = suma_evaluados if parcial else CIEN
    return {
        "nota_global": redondear(acumulado / divisor) if hitos_evaluados and divisor else None,
        "parcial": parcial,
        "hitos_evaluados": hitos_evaluados,
        "hitos_totales": len(detalle),
        "hitos": detalle,
    }

"""
HU-14: Cálculo de indicadores y métricas de impacto para Dirección del Programa.

Todas las métricas se calculan sobre el mismo conjunto de proyectos filtrado, de modo que
el dashboard es coherente: lo que se ve en los totales es lo que se ve en el listado.
"""
from django.db.models import Avg, Count, Q
from django.utils import timezone

from gestion_acompaniamiento.models import Tutor
from gestion_administrativa.models import PeriodoAcademico
from gestion_convocatorias.models import Convocatoria, Iniciativa
from gestion_emprendimiento_2.models import Actividad, Estudiante, Proyecto, ProyectoMentor
from gestion_evaluacion.models import Evaluacion, NivelMadurez
from gestion_evidencia.models import Evidencia, RegistroAvance

from .filtros import ESTADO_ACTIVO, ESTADOS_INACTIVOS, ids_proyectos_aprobados_por_hitos

ETIQUETAS_ESTADO = dict(Proyecto.Estado.choices)
ETIQUETAS_TIPO = dict(Iniciativa.TIPO_CHOICES)
ETIQUETAS_ORIGEN = dict(Iniciativa.ORIGEN_CHOICES)
ETIQUETAS_NIVEL = dict(NivelMadurez.choices)


def _porcentaje(parte, total):
    return round(parte * 100 / total, 2) if total else 0.0


def _decimal(valor):
    return round(float(valor), 2) if valor is not None else None


def _agrupar(queryset, campo, total, etiquetas=None, campo_nombre=None, sin_valor="Sin definir"):
    """Conteo de proyectos agrupado por `campo`, con porcentaje sobre el total filtrado."""
    campos = [campo] + ([campo_nombre] if campo_nombre else [])
    filas = queryset.order_by().values(*campos).annotate(total=Count("pk", distinct=True))
    resultado = []
    for fila in filas:
        valor = fila[campo]
        if campo_nombre:
            etiqueta = fila[campo_nombre]
        elif etiquetas is not None:
            etiqueta = etiquetas.get(valor, valor)
        else:
            etiqueta = valor
        resultado.append(
            {
                "valor": valor,
                "etiqueta": etiqueta if valor not in (None, "") else sin_valor,
                "total": fila["total"],
                "porcentaje": _porcentaje(fila["total"], total),
            }
        )
    resultado.sort(key=lambda f: (-f["total"], str(f["etiqueta"])))
    return resultado


def calcular_metricas(proyectos):
    """
    Indicadores agregados del conjunto de proyectos ya filtrado (queryset de
    filtros.proyectos_base con filtros aplicados).
    """
    ids = proyectos.order_by().values("pk")
    total = proyectos.count()
    activos = proyectos.filter(estado=ESTADO_ACTIVO).count()
    con_tutor = proyectos.filter(tutor__isnull=False).count()
    aprobados_hitos = proyectos.filter(pk__in=ids_proyectos_aprobados_por_hitos()).count()

    estudiantes = Estudiante.objects.filter(equipo__iniciativa__proyecto__in=ids)
    tutores = proyectos.filter(tutor__isnull=False).order_by().values("tutor").distinct().count()
    mentores = (
        ProyectoMentor.objects.filter(proyecto__in=ids, activo=True)
        .values("mentor")
        .distinct()
        .count()
    )

    # Madurez tecnológica (nivel vigente por proyecto)
    distribucion_madurez = {nivel: 0 for nivel, _ in NivelMadurez.choices}
    for fila in proyectos.order_by().values("nivel_madurez").annotate(total=Count("pk")):
        distribucion_madurez[fila["nivel_madurez"]] = fila["total"]
    proyectos_con_avance_madurez = total - distribucion_madurez.get("M0", 0)
    suma_niveles = sum(int(nivel[1:]) * cantidad for nivel, cantidad in distribucion_madurez.items())

    # Evaluaciones por hito
    evaluaciones = Evaluacion.objects.filter(proyecto__in=ids)
    resumen_evaluaciones = evaluaciones.aggregate(
        total=Count("pk"),
        calificadas=Count("pk", filter=Q(nota_final__isnull=False)),
        nota_promedio=Avg("nota_final"),
        proyectos_evaluados=Count("proyecto", distinct=True),
    )

    # Seguimiento: avances, actividades y evidencias
    avances = RegistroAvance.objects.filter(proyecto__in=ids)
    resumen_avances = avances.aggregate(
        total=Count("pk"),
        porcentaje_promedio=Avg("porcentaje_avance"),
        proyectos_con_avance=Count("proyecto", distinct=True),
    )
    hoy = timezone.localdate()
    actividades = Actividad.objects.filter(plan_trabajo__proyecto__in=ids)
    resumen_actividades = actividades.aggregate(
        total=Count("pk"),
        completadas=Count("pk", filter=Q(estado=Actividad.Estado.COMPLETADA)),
        vencidas=Count(
            "pk", filter=Q(estado=Actividad.Estado.PENDIENTE, fecha_fin__lt=hoy)
        ),
    )
    evidencias = Evidencia.objects.filter(proyecto__in=ids)

    return {
        "resumen": {
            "total_proyectos": total,
            "proyectos_activos": activos,
            "proyectos_inactivos": total - activos,
            "tasa_actividad": _porcentaje(activos, total),
            "proyectos_con_tutor": con_tutor,
            "proyectos_sin_tutor": total - con_tutor,
            "cobertura_tutoria": _porcentaje(con_tutor, total),
            "estudiantes_vinculados": estudiantes.count(),
            "tutores_vinculados": tutores,
            "mentores_vinculados": mentores,
            "proyectos_aprobados_hitos": aprobados_hitos,
            "tasa_aprobacion_hitos": _porcentaje(aprobados_hitos, total),
        },
        "por_estado": _agrupar(proyectos, "estado", total, etiquetas=ETIQUETAS_ESTADO),
        "por_tipo": _agrupar(proyectos, "iniciativa__tipo", total, etiquetas=ETIQUETAS_TIPO),
        "por_periodo": _agrupar(
            proyectos,
            "iniciativa__convocatoria__periodo_id",
            total,
            campo_nombre="iniciativa__convocatoria__periodo__nombre",
            sin_valor="Sin periodo",
        ),
        "por_cohorte": _agrupar(
            proyectos,
            "iniciativa__convocatoria_id",
            total,
            campo_nombre="iniciativa__convocatoria__nombre",
        ),
        "por_tutor": _agrupar(
            proyectos,
            "tutor_id",
            total,
            campo_nombre="tutor__usuario__nombre",
            sin_valor="Sin tutor",
        ),
        "caracterizacion": {
            "origen_academico": _agrupar(
                proyectos, "iniciativa__origen_academico", total, etiquetas=ETIQUETAS_ORIGEN
            ),
            "sector_tecnologico": _agrupar(proyectos, "iniciativa__sector_tecnologico", total),
            "etapa_actual": _agrupar(proyectos, "iniciativa__etapa_actual", total),
            "semestre_estudiantes": [
                {
                    "valor": fila["semestre"],
                    "etiqueta": f"Semestre {fila['semestre']}" if fila["semestre"] else "Sin definir",
                    "total": fila["total"],
                }
                for fila in estudiantes.order_by("semestre")
                .values("semestre")
                .annotate(total=Count("pk"))
            ],
        },
        "madurez": {
            "distribucion": [
                {
                    "nivel": nivel,
                    "etiqueta": ETIQUETAS_NIVEL[nivel],
                    "total": cantidad,
                    "porcentaje": _porcentaje(cantidad, total),
                }
                for nivel, cantidad in distribucion_madurez.items()
            ],
            "nivel_promedio": round(suma_niveles / total, 2) if total else None,
            "proyectos_con_avance_madurez": proyectos_con_avance_madurez,
            "tasa_avance_madurez": _porcentaje(proyectos_con_avance_madurez, total),
        },
        "evaluacion": {
            "evaluaciones_registradas": resumen_evaluaciones["total"],
            "evaluaciones_calificadas": resumen_evaluaciones["calificadas"],
            "proyectos_evaluados": resumen_evaluaciones["proyectos_evaluados"],
            "nota_promedio": _decimal(resumen_evaluaciones["nota_promedio"]),
        },
        "seguimiento": {
            "registros_avance": resumen_avances["total"],
            "proyectos_con_avance": resumen_avances["proyectos_con_avance"],
            "porcentaje_avance_promedio": _decimal(resumen_avances["porcentaje_promedio"]),
            "actividades_total": resumen_actividades["total"],
            "actividades_completadas": resumen_actividades["completadas"],
            "actividades_vencidas": resumen_actividades["vencidas"],
            "tasa_cumplimiento_actividades": _porcentaje(
                resumen_actividades["completadas"], resumen_actividades["total"]
            ),
            "evidencias_registradas": evidencias.count(),
        },
    }


def opciones_filtros():
    """Valores disponibles para poblar los selectores de filtros del dashboard."""
    iniciativas_con_proyecto = Iniciativa.objects.filter(proyecto__isnull=False)

    def distintos(campo):
        # Un valor por texto sin distinguir mayúsculas, igual que el filtro (iexact)
        unicos = {}
        for valor in iniciativas_con_proyecto.order_by().values_list(campo, flat=True).distinct():
            if valor and valor.strip():
                unicos.setdefault(valor.strip().lower(), valor.strip())
        return sorted(unicos.values(), key=str.lower)

    estudiantes = (
        Estudiante.objects.filter(equipo__iniciativa__proyecto__isnull=False)
        .select_related("usuario")
        .order_by("usuario__nombre")
    )
    postulantes = (
        iniciativas_con_proyecto.select_related("usuario")
        .order_by()
        .values_list("usuario_id", "usuario__nombre")
        .distinct()
    )
    estudiantes_opciones = {
        e.usuario_id: {"id": e.usuario_id, "nombre": e.usuario.nombre, "codigo": e.codigo}
        for e in estudiantes
    }
    for id_usuario, nombre in postulantes:
        estudiantes_opciones.setdefault(id_usuario, {"id": id_usuario, "nombre": nombre, "codigo": None})

    return {
        "periodos": [
            {"id": p.id_periodo, "nombre": p.nombre, "anio": p.anio, "semestre": p.semestre, "es_vigente": p.es_vigente}
            for p in PeriodoAcademico.objects.all()
        ],
        "cohortes": [
            {"id": c.id_convocatoria, "nombre": c.nombre, "periodo": c.periodo_id, "estado": c.estado}
            for c in Convocatoria.objects.all()
        ],
        "tutores": [
            {"id": t.id_tutor, "nombre": t.usuario.nombre, "area_conocimiento": t.area_conocimiento}
            for t in Tutor.objects.select_related("usuario").order_by("usuario__nombre")
        ],
        "estudiantes": sorted(estudiantes_opciones.values(), key=lambda e: e["nombre"].lower()),
        "estados": [{"valor": v, "etiqueta": e} for v, e in Proyecto.Estado.choices],
        "vigencias": [
            {"valor": "activos", "etiqueta": "Activos", "estados": [ESTADO_ACTIVO]},
            {"valor": "inactivos", "etiqueta": "Inactivos", "estados": list(ESTADOS_INACTIVOS)},
        ],
        "tipos": [{"valor": v, "etiqueta": e} for v, e in Iniciativa.TIPO_CHOICES],
        "origenes_academicos": [{"valor": v, "etiqueta": e} for v, e in Iniciativa.ORIGEN_CHOICES],
        "sectores_tecnologicos": distintos("sector_tecnologico"),
        "etapas": distintos("etapa_actual"),
        "semestres": sorted(
            s for s in Estudiante.objects.order_by().values_list("semestre", flat=True).distinct() if s
        ),
        "niveles_madurez": [{"valor": v, "etiqueta": e} for v, e in NivelMadurez.choices],
        "aprobacion_hitos": [
            {"valor": "true", "etiqueta": "Aprobados (todos los hitos con nota >= 3.0)"},
            {"valor": "false", "etiqueta": "No aprobados (hitos pendientes o con nota < 3.0)"},
        ],
    }

"""
HU-14: Filtros combinables del dashboard de Dirección del Programa.

Todos los filtros son opcionales y se combinan con AND. Los filtros que admiten varios
valores los reciben separados por coma (?estado=activo,pausado) o repitiendo el parámetro
(?estado=activo&estado=pausado); entre los valores de un mismo filtro se aplica OR.
"""
from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Avg, Count, F, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError

from gestion_convocatorias.models import Iniciativa
from gestion_emprendimiento_2.models import Proyecto
from gestion_evaluacion.calculos import redondear
from gestion_evaluacion.models import Evaluacion, NivelMadurez, RegistroMadurez, SubRubrica

ESTADO_ACTIVO = Proyecto.Estado.ACTIVO
ESTADOS_INACTIVOS = (
    Proyecto.Estado.PAUSADO,
    Proyecto.Estado.FINALIZADO,
    Proyecto.Estado.CANCELADO,
)
VIGENCIAS = ("activos", "inactivos")

ESTADOS_VALIDOS = {valor for valor, _ in Proyecto.Estado.choices}
TIPOS_VALIDOS = {valor for valor, _ in Iniciativa.TIPO_CHOICES}
ORIGENES_VALIDOS = {valor for valor, _ in Iniciativa.ORIGEN_CHOICES}
NIVELES_VALIDOS = {valor for valor, _ in NivelMadurez.choices}

NOTA_MINIMA_HITO = Decimal("3.00")

# Orden permitido en el listado: parámetro -> campo del queryset
ORDENAMIENTOS = {
    "creado": "creado",
    "nombre": "nombre_proyecto",
    "estado": "estado",
    "tipo": "iniciativa__tipo",
    "periodo": "iniciativa__convocatoria__periodo_id",
    "nivel_madurez": "nivel_madurez",
}


def proyectos_base():
    """
    Queryset de proyectos con las relaciones que usa el dashboard y el nivel de madurez
    vigente anotado (último RegistroMadurez; M0 si el proyecto no tiene registros).
    """
    ultimo_nivel = (
        RegistroMadurez.objects.filter(proyecto=OuterRef("pk"))
        .order_by("-fecha_registro", "-id")
        .values("nivel")[:1]
    )
    return Proyecto.objects.select_related(
        "iniciativa",
        "iniciativa__usuario",
        "iniciativa__convocatoria",
        "iniciativa__convocatoria__periodo",
        "tutor",
        "tutor__usuario",
    ).annotate(nivel_madurez=Coalesce(Subquery(ultimo_nivel), Value("M0")))


def ids_proyectos_aprobados_por_hitos():
    """
    Ids de los proyectos aprobados por sus hitos. Esto es distinto de que la iniciativa
    haya sido aprobada en la convocatoria. Un proyecto queda aprobado cuando:
      - TODOS los hitos de la rúbrica de su tipo tienen al menos una evaluación calificada, y
      - la nota de CADA hito es >= 3.00.
    La nota de un hito es el promedio de las nota_final de sus evaluadores, redondeado a
    2 decimales, igual que en gestion_evaluacion.calculos.nota_global.
    """
    hitos_por_tipo = dict(
        SubRubrica.objects.order_by()
        .values("rubrica__tipo_iniciativa")
        .annotate(total=Count("pk"))
        .values_list("rubrica__tipo_iniciativa", "total")
    )
    notas_por_hito = (
        Evaluacion.objects.filter(
            nota_final__isnull=False,
            # Solo cuentan los hitos de la rúbrica que corresponde al tipo del proyecto
            subrubrica__rubrica__tipo_iniciativa=F("proyecto__iniciativa__tipo"),
        )
        .order_by()
        .values("proyecto_id", "proyecto__iniciativa__tipo", "subrubrica_id")
        .annotate(promedio=Avg("nota_final"))
    )

    hitos_aprobados = defaultdict(int)
    reprobados = set()
    tipo_proyecto = {}
    for fila in notas_por_hito:
        proyecto_id = fila["proyecto_id"]
        tipo_proyecto[proyecto_id] = fila["proyecto__iniciativa__tipo"]
        if redondear(Decimal(str(fila["promedio"]))) >= NOTA_MINIMA_HITO:
            hitos_aprobados[proyecto_id] += 1
        else:
            reprobados.add(proyecto_id)

    return {
        proyecto_id
        for proyecto_id, aprobados in hitos_aprobados.items()
        if proyecto_id not in reprobados
        and aprobados == hitos_por_tipo.get(tipo_proyecto[proyecto_id], 0)
    }


def _valores(params, nombre):
    """Lista de valores de un parámetro, aceptando comas y parámetros repetidos."""
    crudos = params.getlist(nombre) if hasattr(params, "getlist") else [params.get(nombre)]
    valores = []
    for crudo in crudos:
        if crudo is None:
            continue
        valores.extend(v.strip() for v in str(crudo).split(",") if v.strip())
    return list(dict.fromkeys(valores))


def _enteros(params, nombre, errores):
    valores = _valores(params, nombre)
    try:
        return [int(v) for v in valores]
    except ValueError:
        errores[nombre] = "Debe ser un número entero o una lista de enteros separados por coma."
        return []


def _opciones(params, nombre, validos, errores):
    valores = _valores(params, nombre)
    invalidos = [v for v in valores if v not in validos]
    if invalidos:
        errores[nombre] = (
            f"Valores no válidos: {', '.join(invalidos)}. "
            f"Permitidos: {', '.join(sorted(validos))}."
        )
        return []
    return valores


def _fecha(params, nombre, errores):
    valor = (params.get(nombre) or "").strip()
    if not valor:
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        errores[nombre] = "Formato de fecha inválido. Use AAAA-MM-DD."
        return None


def aplicar_filtros(queryset, params):
    """
    Aplica al queryset de proyectos los filtros recibidos en `params` (query params).

    Retorna (queryset_filtrado, filtros_aplicados). Lanza ValidationError (HTTP 400)
    con el detalle por parámetro si algún valor no es válido.

    Filtros soportados:
      periodo               id del periodo académico de la convocatoria (ej. 2026-1)
      anio                  año del periodo académico
      cohorte               id de la convocatoria con la que ingresó el proyecto
      estudiante            id_usuario de un estudiante (postulante o integrante del equipo)
      tutor                 id_tutor asignado al proyecto
      mentor                id_mentor con asignación activa en el proyecto
      estado                activo | pausado | finalizado | cancelado
      vigencia              activos | inactivos (inactivo = pausado, finalizado o cancelado)
      tipo                  emprendimiento | innovacion
      origen_academico      asignatura | proyecto_aula | integrador | semillero | practica | trabajo_grado
      sector_tecnologico    texto exacto (sin distinguir mayúsculas)
      etapa_actual          texto exacto (sin distinguir mayúsculas)
      semestre              semestre de algún integrante del equipo
      nivel_madurez         M0 ... M9 (nivel vigente)
      con_tutor             true | false
      aprobado_hitos        true: todos los hitos calificados y cada uno con nota >= 3.00
                            false: el resto (faltan hitos por calificar o alguno < 3.00)
      fecha_desde/hasta     rango de creación del proyecto (AAAA-MM-DD)
      q                     búsqueda por nombre del proyecto o de la iniciativa
    """
    errores = {}
    aplicados = {}

    periodos = _valores(params, "periodo")
    anios = _enteros(params, "anio", errores)
    cohortes = _enteros(params, "cohorte", errores)
    estudiantes = _enteros(params, "estudiante", errores)
    tutores = _enteros(params, "tutor", errores)
    mentores = _enteros(params, "mentor", errores)
    semestres = _enteros(params, "semestre", errores)
    estados = _opciones(params, "estado", ESTADOS_VALIDOS, errores)
    vigencias = _opciones(params, "vigencia", set(VIGENCIAS), errores)
    tipos = _opciones(params, "tipo", TIPOS_VALIDOS, errores)
    origenes = _opciones(params, "origen_academico", ORIGENES_VALIDOS, errores)
    niveles = [v.upper() for v in _valores(params, "nivel_madurez")]
    niveles_invalidos = [v for v in niveles if v not in NIVELES_VALIDOS]
    if niveles_invalidos:
        errores["nivel_madurez"] = (
            f"Valores no válidos: {', '.join(niveles_invalidos)}. Permitidos: M0 a M9."
        )
    sectores = _valores(params, "sector_tecnologico")
    etapas = _valores(params, "etapa_actual")
    fecha_desde = _fecha(params, "fecha_desde", errores)
    fecha_hasta = _fecha(params, "fecha_hasta", errores)
    if fecha_desde and fecha_hasta and fecha_hasta < fecha_desde:
        errores["fecha_hasta"] = "No puede ser anterior a fecha_desde."

    con_tutor = (params.get("con_tutor") or "").strip().lower()
    if con_tutor and con_tutor not in ("true", "false"):
        errores["con_tutor"] = "Debe ser true o false."

    aprobado_hitos = (params.get("aprobado_hitos") or "").strip().lower()
    if aprobado_hitos and aprobado_hitos not in ("true", "false"):
        errores["aprobado_hitos"] = "Debe ser true o false."

    busqueda = (params.get("q") or "").strip()

    if errores:
        raise ValidationError(errores)

    if periodos:
        queryset = queryset.filter(iniciativa__convocatoria__periodo_id__in=periodos)
        aplicados["periodo"] = periodos
    if anios:
        queryset = queryset.filter(iniciativa__convocatoria__periodo__anio__in=anios)
        aplicados["anio"] = anios
    if cohortes:
        queryset = queryset.filter(iniciativa__convocatoria_id__in=cohortes)
        aplicados["cohorte"] = cohortes
    if estudiantes:
        # Por subconsulta para no duplicar filas al cruzar con los integrantes del equipo
        ids = Proyecto.objects.filter(
            Q(iniciativa__usuario_id__in=estudiantes)
            | Q(iniciativa__equipo__miembros__usuario_id__in=estudiantes)
        ).values("pk")
        queryset = queryset.filter(pk__in=ids)
        aplicados["estudiante"] = estudiantes
    if tutores:
        queryset = queryset.filter(tutor_id__in=tutores)
        aplicados["tutor"] = tutores
    if mentores:
        ids = Proyecto.objects.filter(
            asignaciones_mentor__mentor_id__in=mentores,
            asignaciones_mentor__activo=True,
        ).values("pk")
        queryset = queryset.filter(pk__in=ids)
        aplicados["mentor"] = mentores
    if semestres:
        ids = Proyecto.objects.filter(
            iniciativa__equipo__miembros__semestre__in=semestres
        ).values("pk")
        queryset = queryset.filter(pk__in=ids)
        aplicados["semestre"] = semestres
    if estados:
        queryset = queryset.filter(estado__in=estados)
        aplicados["estado"] = estados
    if vigencias and set(vigencias) != set(VIGENCIAS):
        # Pedir ambas vigencias equivale a no filtrar
        if vigencias == ["activos"]:
            queryset = queryset.filter(estado=ESTADO_ACTIVO)
        else:
            queryset = queryset.filter(estado__in=ESTADOS_INACTIVOS)
        aplicados["vigencia"] = vigencias[0]
    if tipos:
        queryset = queryset.filter(iniciativa__tipo__in=tipos)
        aplicados["tipo"] = tipos
    if origenes:
        queryset = queryset.filter(iniciativa__origen_academico__in=origenes)
        aplicados["origen_academico"] = origenes
    if sectores:
        condicion = Q()
        for sector in sectores:
            condicion |= Q(iniciativa__sector_tecnologico__iexact=sector)
        queryset = queryset.filter(condicion)
        aplicados["sector_tecnologico"] = sectores
    if etapas:
        condicion = Q()
        for etapa in etapas:
            condicion |= Q(iniciativa__etapa_actual__iexact=etapa)
        queryset = queryset.filter(condicion)
        aplicados["etapa_actual"] = etapas
    if niveles:
        queryset = queryset.filter(nivel_madurez__in=niveles)
        aplicados["nivel_madurez"] = niveles
    if con_tutor:
        queryset = queryset.filter(tutor__isnull=(con_tutor == "false"))
        aplicados["con_tutor"] = con_tutor == "true"
    if aprobado_hitos:
        aprobados = ids_proyectos_aprobados_por_hitos()
        if aprobado_hitos == "true":
            queryset = queryset.filter(pk__in=aprobados)
        else:
            queryset = queryset.exclude(pk__in=aprobados)
        aplicados["aprobado_hitos"] = aprobado_hitos == "true"
    if fecha_desde:
        queryset = queryset.filter(creado__date__gte=fecha_desde)
        aplicados["fecha_desde"] = fecha_desde.isoformat()
    if fecha_hasta:
        queryset = queryset.filter(creado__date__lte=fecha_hasta)
        aplicados["fecha_hasta"] = fecha_hasta.isoformat()
    if busqueda:
        queryset = queryset.filter(
            Q(nombre_proyecto__icontains=busqueda) | Q(iniciativa__nombre__icontains=busqueda)
        )
        aplicados["q"] = busqueda

    return queryset, aplicados


def ordenar(queryset, params):
    """Ordena el listado según ?ordering= (prefijo '-' para descendente)."""
    crudo = (params.get("ordering") or "-creado").strip()
    descendente = crudo.startswith("-")
    clave = crudo.lstrip("-")
    if clave not in ORDENAMIENTOS:
        raise ValidationError(
            {"ordering": f"Valor no válido. Permitidos: {', '.join(ORDENAMIENTOS)} (prefijo '-' para descendente)."}
        )
    campo = ORDENAMIENTOS[clave]
    return queryset.order_by(f"-{campo}" if descendente else campo, "-id_proyecto")

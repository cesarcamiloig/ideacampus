import csv
import io
from collections import Counter
from datetime import date

from django.db.models import Prefetch
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from gestion_convocatorias.models import Iniciativa
from gestion_evaluacion.models import NivelMadurez, RegistroMadurez

from .models import ESTADOS_AUTORIZABLES


# ---------------------------------------------------------------------------
# Datos comunes de una iniciativa (catálogo e informes)
# ---------------------------------------------------------------------------

def iniciativas_con_detalle():
    """Iniciativas con todo lo que piden el catálogo y los informes, sin consultas por fila."""
    return (Iniciativa.objects
            .select_related("convocatoria", "usuario", "equipo", "proyecto__tutor__usuario",
                            "publicacion_catalogo__autorizado_por")
            .prefetch_related("equipo__miembros",
                              Prefetch("proyecto__registros_madurez", queryset=RegistroMadurez.objects.all())))


def radicado(iniciativa):
    anio = iniciativa.fecha_postulacion.year if iniciativa.fecha_postulacion else timezone.now().year
    return f"UFPS-POST-{anio}-{iniciativa.id_iniciativa:04d}"


def nivel_madurez(iniciativa):
    """Nivel vigente (M0–M9) del proyecto de la iniciativa; None si aún no tiene proyecto."""
    proyecto = getattr(iniciativa, "proyecto", None)
    if proyecto is None:
        return None
    # Los registros vienen precargados del más reciente al más antiguo
    registros = list(proyecto.registros_madurez.all())
    return registros[0].nivel if registros else NivelMadurez.M0


def etiqueta_madurez(nivel):
    return NivelMadurez(nivel).label if nivel else "Sin proyecto"


def esta_publicada(iniciativa):
    publicacion = getattr(iniciativa, "publicacion_catalogo", None)
    return bool(publicacion and publicacion.publicada and iniciativa.estado in ESTADOS_AUTORIZABLES)


# ---------------------------------------------------------------------------
# Filtros del informe
# ---------------------------------------------------------------------------

def _fecha(params, nombre):
    valor = (params.get(nombre) or "").strip()
    if not valor:
        return None
    fecha = parse_date(valor)
    if fecha is None:
        raise ValidationError({nombre: "Usa el formato AAAA-MM-DD."})
    return fecha


def filtrar_iniciativas(params):
    """
    Aplica los filtros del informe recibidos por query params:
    estado (aprobada agrupa aprobada y aceptada), tipo, origen, convocatoria,
    desde / hasta (fecha de postulación, AAAA-MM-DD) y catalogo (publicadas | no_publicadas).
    """
    qs = iniciativas_con_detalle()

    estado = (params.get("estado") or "").strip()
    if estado == "aprobada":
        qs = qs.filter(estado__in=ESTADOS_AUTORIZABLES)
    elif estado:
        qs = qs.filter(estado=estado)

    for campo in ("tipo", "origen"):
        valor = (params.get(campo) or "").strip()
        if valor:
            qs = qs.filter(**{"tipo" if campo == "tipo" else "origen_academico": valor})

    convocatoria = (params.get("convocatoria") or "").strip()
    if convocatoria:
        if not convocatoria.isdigit():
            raise ValidationError({"convocatoria": "Indica una convocatoria válida."})
        qs = qs.filter(convocatoria_id=convocatoria)

    desde, hasta = _fecha(params, "desde"), _fecha(params, "hasta")
    if desde and hasta and desde > hasta:
        raise ValidationError({"desde": "La fecha inicial no puede ser posterior a la final."})
    if desde:
        qs = qs.filter(fecha_postulacion__date__gte=desde)
    if hasta:
        qs = qs.filter(fecha_postulacion__date__lte=hasta)

    catalogo = (params.get("catalogo") or "").strip()
    if catalogo == "publicadas":
        qs = qs.filter(publicacion_catalogo__publicada=True, estado__in=ESTADOS_AUTORIZABLES)
    elif catalogo == "no_publicadas":
        qs = qs.exclude(publicacion_catalogo__publicada=True, estado__in=ESTADOS_AUTORIZABLES)

    return qs.order_by("-fecha_postulacion", "-id_iniciativa")


# ---------------------------------------------------------------------------
# Contenido del informe
# ---------------------------------------------------------------------------

COLUMNAS_INFORME = [
    "Radicado", "Iniciativa", "Tipo", "Origen académico", "Detalle del origen", "Sector tecnológico",
    "Convocatoria", "Estado", "Fecha de postulación", "Postulante", "Correo del postulante",
    "Equipo", "Integrantes", "Tutor", "Nivel de madurez", "Publicada en catálogo",
]


def fila_informe(iniciativa):
    equipo = getattr(iniciativa, "equipo", None)
    proyecto = getattr(iniciativa, "proyecto", None)
    tutor = proyecto.tutor if proyecto else None
    fecha = timezone.localtime(iniciativa.fecha_postulacion) if iniciativa.fecha_postulacion else None
    return [
        radicado(iniciativa),
        iniciativa.nombre,
        iniciativa.get_tipo_display(),
        iniciativa.get_origen_academico_display(),
        iniciativa.detalle_origen or "",
        iniciativa.sector_tecnologico or "",
        iniciativa.convocatoria.nombre if iniciativa.convocatoria else "",
        iniciativa.get_estado_display(),
        fecha.strftime("%Y-%m-%d %H:%M") if fecha else "",
        iniciativa.usuario.nombre if iniciativa.usuario else "",
        iniciativa.usuario.correo if iniciativa.usuario else "",
        equipo.nombre_equipo if equipo else "",
        len(equipo.miembros.all()) if equipo else 0,
        tutor.usuario.nombre if tutor and tutor.usuario else "",
        etiqueta_madurez(nivel_madurez(iniciativa)),
        "Sí" if esta_publicada(iniciativa) else "No",
    ]


def resumen_informe(iniciativas):
    """Totales del informe: por estado, tipo, origen académico y nivel de madurez."""
    iniciativas = list(iniciativas)

    def contar(valores):
        return [{"etiqueta": etiqueta, "total": total} for etiqueta, total in Counter(valores).most_common()]

    return {
        "total": len(iniciativas),
        "publicadas_catalogo": sum(1 for i in iniciativas if esta_publicada(i)),
        "con_proyecto": sum(1 for i in iniciativas if getattr(i, "proyecto", None) is not None),
        "por_estado": contar(i.get_estado_display() for i in iniciativas),
        "por_tipo": contar(i.get_tipo_display() for i in iniciativas),
        "por_origen": contar(i.get_origen_academico_display() for i in iniciativas),
        "por_madurez": contar(
            etiqueta_madurez(nivel_madurez(i)) for i in iniciativas if getattr(i, "proyecto", None) is not None
        ),
    }


def nombre_archivo(extension):
    return f"informe_iniciativas_{date.today():%Y%m%d}.{extension}"


def generar_csv(iniciativas):
    # BOM UTF-8 para que Excel muestre bien las tildes al abrir el CSV
    salida = io.StringIO()
    salida.write("﻿")
    escritor = csv.writer(salida)
    escritor.writerow(COLUMNAS_INFORME)
    for iniciativa in iniciativas:
        escritor.writerow(fila_informe(iniciativa))
    return salida.getvalue().encode("utf-8")


def generar_excel(iniciativas, filtros_aplicados):
    """Libro con la hoja de iniciativas (filtrable) y una hoja de resumen con los totales."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    from openpyxl.utils import get_column_letter

    iniciativas = list(iniciativas)
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Iniciativas"
    encabezado = Font(bold=True, color="FFFFFF")
    relleno = PatternFill("solid", fgColor="C81E1E")

    hoja.append(COLUMNAS_INFORME)
    for celda in hoja[1]:
        celda.font = encabezado
        celda.fill = relleno
    for iniciativa in iniciativas:
        hoja.append(fila_informe(iniciativa))
    for indice, columna in enumerate(COLUMNAS_INFORME, start=1):
        largo = max([len(columna)] + [len(str(fila[indice - 1].value or "")) for fila in hoja.iter_rows(min_row=2)])
        hoja.column_dimensions[get_column_letter(indice)].width = min(largo + 2, 60)
    hoja.freeze_panes = "A2"
    hoja.auto_filter.ref = hoja.dimensions

    resumen = resumen_informe(iniciativas)
    hoja_resumen = libro.create_sheet("Resumen")
    hoja_resumen.append(["Informe de iniciativas — GENNOVA UFPS"])
    hoja_resumen["A1"].font = Font(bold=True, size=13)
    hoja_resumen.append(["Generado", timezone.localtime().strftime("%Y-%m-%d %H:%M")])
    hoja_resumen.append(["Filtros", filtros_aplicados or "Sin filtros (todas las iniciativas)"])
    hoja_resumen.append([])
    hoja_resumen.append(["Total de iniciativas", resumen["total"]])
    hoja_resumen.append(["Con proyecto", resumen["con_proyecto"]])
    hoja_resumen.append(["Publicadas en el catálogo", resumen["publicadas_catalogo"]])
    for titulo, clave in (("Por estado", "por_estado"), ("Por tipo", "por_tipo"),
                          ("Por origen académico", "por_origen"), ("Por nivel de madurez", "por_madurez")):
        hoja_resumen.append([])
        hoja_resumen.append([titulo])
        hoja_resumen.cell(row=hoja_resumen.max_row, column=1).font = Font(bold=True)
        for item in resumen[clave]:
            hoja_resumen.append([item["etiqueta"], item["total"]])
    hoja_resumen.column_dimensions["A"].width = 34
    hoja_resumen.column_dimensions["B"].width = 50

    salida = io.BytesIO()
    libro.save(salida)
    return salida.getvalue()


def describir_filtros(params):
    """Texto legible de los filtros aplicados, para la hoja de resumen."""
    nombres = {"estado": "Estado", "tipo": "Tipo", "origen": "Origen", "convocatoria": "Convocatoria",
               "desde": "Desde", "hasta": "Hasta", "catalogo": "Catálogo"}
    return "; ".join(f"{etiqueta}: {params.get(clave)}" for clave, etiqueta in nombres.items() if params.get(clave))

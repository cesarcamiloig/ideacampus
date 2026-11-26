"""
HU-14: Dashboard de indicadores y métricas de impacto para Dirección del Programa.

Endpoints de solo lectura (GET). Listado y métricas aceptan los mismos filtros combinables
(ver filtros.aplicar_filtros), así ambos reflejan siempre el mismo conjunto de proyectos.
"""
from django.db.models import Count
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import TieneRolPermitido

from .filtros import aplicar_filtros, ids_proyectos_aprobados_por_hitos, ordenar, proyectos_base
from .serializers import ProyectoAnaliticaSerializer
from .services import calcular_metricas, opciones_filtros

ROLES_ANALITICA = ("direccion_del_programa",)


class PaginacionAnalitica(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AnaliticaBaseView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_ANALITICA


class OpcionesFiltrosView(AnaliticaBaseView):
    """GET /api/analitica/filtros/ — opciones disponibles para cada filtro del dashboard."""

    def get(self, request):
        return Response(opciones_filtros())


class ProyectosAnaliticaView(AnaliticaBaseView):
    """
    GET /api/analitica/proyectos/ — listado paginado de proyectos (activos o históricos)
    con filtros combinables. Parámetros extra: page, page_size (máx. 100) y ordering.
    """

    def get(self, request):
        proyectos, aplicados = aplicar_filtros(proyectos_base(), request.query_params)
        proyectos = ordenar(
            proyectos.annotate(integrantes=Count("iniciativa__equipo__miembros", distinct=True)),
            request.query_params,
        )

        paginador = PaginacionAnalitica()
        pagina = paginador.paginate_queryset(proyectos, request, view=self)
        respuesta = paginador.get_paginated_response(
            ProyectoAnaliticaSerializer(
                pagina, many=True, context={"aprobados_hitos": ids_proyectos_aprobados_por_hitos()}
            ).data
        )
        respuesta.data["filtros_aplicados"] = aplicados
        return respuesta


class MetricasAnaliticaView(AnaliticaBaseView):
    """
    GET /api/analitica/metricas/ — indicadores y métricas de impacto del conjunto
    de proyectos que cumple los filtros.
    """

    def get(self, request):
        proyectos, aplicados = aplicar_filtros(proyectos_base(), request.query_params)
        return Response({"filtros_aplicados": aplicados, **calcular_metricas(proyectos)})

from django.urls import path

from .views import MetricasAnaliticaView, OpcionesFiltrosView, ProyectosAnaliticaView

# HU-14: Dashboard de indicadores para Dirección del Programa
urlpatterns = [
    path("analitica/filtros/", OpcionesFiltrosView.as_view(), name="analitica_filtros"),
    path("analitica/proyectos/", ProyectosAnaliticaView.as_view(), name="analitica_proyectos"),
    path("analitica/metricas/", MetricasAnaliticaView.as_view(), name="analitica_metricas"),
]

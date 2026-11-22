from django.urls import path

from .views import (
    CatalogoGestionDetalleView,
    CatalogoGestionListView,
    CatalogoPublicoView,
    InformeExportarView,
    InformeResumenView,
)

urlpatterns = [
    # HU-15: Catálogo público e informes exportables
    path('catalogo/publico/', CatalogoPublicoView.as_view(), name='catalogo_publico'),
    path('catalogo/gestion/', CatalogoGestionListView.as_view(), name='catalogo_gestion'),
    path('catalogo/gestion/<int:id_iniciativa>/', CatalogoGestionDetalleView.as_view(), name='catalogo_gestion_detalle'),
    path('informes/iniciativas/resumen/', InformeResumenView.as_view(), name='informe_iniciativas_resumen'),
    path('informes/iniciativas/exportar/', InformeExportarView.as_view(), name='informe_iniciativas_exportar'),
]

from django.urls import path
from .views import (
    EstudiantesDisponiblesView,
    CrearEquipoView,
    MiEquipoView,
    EquipoDetalleView,
    EquipoMiembroView,
)

urlpatterns = [
    path('estudiantes-disponibles/', EstudiantesDisponiblesView.as_view(), name='estudiantes_disponibles'),
    path('equipos/crear/', CrearEquipoView.as_view(), name='crear_equipo'),
    path('equipos/mi-equipo/', MiEquipoView.as_view(), name='mi_equipo'),
    path('equipos/<int:id_equipo>/', EquipoDetalleView.as_view(), name='equipo_detalle'),
    path('equipos/<int:id_equipo>/miembros/', EquipoMiembroView.as_view(), name='equipo_agregar_miembro'),
    path('equipos/<int:id_equipo>/miembros/<int:id_usuario>/', EquipoMiembroView.as_view(), name='equipo_eliminar_miembro'),
]
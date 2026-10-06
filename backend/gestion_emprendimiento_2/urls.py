from django.urls import path
from .views import EstudiantesDisponiblesView, CrearEquipoView, MiEquipoView

urlpatterns = [
    path('estudiantes-disponibles/', EstudiantesDisponiblesView.as_view(), name='estudiantes_disponibles'),
    path('equipos/crear/', CrearEquipoView.as_view(), name='crear_equipo'),
    path('equipos/mi-equipo/', MiEquipoView.as_view(), name='mi_equipo'),
]
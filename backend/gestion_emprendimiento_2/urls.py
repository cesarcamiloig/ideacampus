from django.urls import path
from .views import EstudiantesDisponiblesView, CrearEquipoView

urlpatterns = [
    path('estudiantes-disponibles/', EstudiantesDisponiblesView.as_view(), name='estudiantes_disponibles'),
    path('equipos/crear/', CrearEquipoView.as_view(), name='crear_equipo'),
]
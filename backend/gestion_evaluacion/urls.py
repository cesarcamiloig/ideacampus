from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EvaluacionViewSet, ProyectoMadurezView, ResultadosProyectoView, RubricaViewSet

router = DefaultRouter()
router.register("rubricas", RubricaViewSet, basename="rubrica")
router.register("evaluaciones", EvaluacionViewSet, basename="evaluacion")

urlpatterns = [
    path("proyectos/<int:id_proyecto>/madurez/", ProyectoMadurezView.as_view(), name="proyecto_madurez"),
    path("proyectos/<int:id_proyecto>/resultados/", ResultadosProyectoView.as_view(), name="proyecto_resultados"),
] + router.urls

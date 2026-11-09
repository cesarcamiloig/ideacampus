from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EvaluacionViewSet, ResultadosProyectoView, RubricaViewSet

router = DefaultRouter()
router.register("rubricas", RubricaViewSet, basename="rubrica")
router.register("evaluaciones", EvaluacionViewSet, basename="evaluacion")

urlpatterns = router.urls + [
    path("proyectos/<int:id_proyecto>/resultados/", ResultadosProyectoView.as_view(), name="proyecto_resultados"),
]

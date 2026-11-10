from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProyectoMadurezView, RubricaViewSet

router = DefaultRouter()
router.register("rubricas", RubricaViewSet, basename="rubrica")

urlpatterns = [
    path("proyectos/<int:id_proyecto>/madurez/", ProyectoMadurezView.as_view(), name="proyecto_madurez"),
] + router.urls

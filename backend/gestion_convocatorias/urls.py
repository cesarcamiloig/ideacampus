from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConvocatoriaViewSet,
    NotificacionConvocatoriaViewSet,
    IniciativaViewSet,
    AlertaRolViewSet,
)

router = DefaultRouter()
router.register(r'convocatorias', ConvocatoriaViewSet, basename='convocatoria')
router.register(r'notificaciones-convocatoria', NotificacionConvocatoriaViewSet, basename='notificaciones_convocatoria')
router.register(r'iniciativas', IniciativaViewSet, basename='iniciativa')
router.register(r'alertas', AlertaRolViewSet, basename='alerta_rol')

urlpatterns = [
    path('', include(router.urls)),
]
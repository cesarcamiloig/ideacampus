from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConvocatoriaViewSet,
    NotificacionConvocatoriaViewSet,
    IniciativaViewSet
)

router = DefaultRouter()
router.register(r'convocatorias', ConvocatoriaViewSet, basename='convocatoria')
router.register(r'notificaciones-convocatoria', NotificacionConvocatoriaViewSet, basename='notificaciones_convocatoria')
router.register(r'iniciativas', IniciativaViewSet, basename='iniciativa')

urlpatterns = [
    path('', include(router.urls)),
]
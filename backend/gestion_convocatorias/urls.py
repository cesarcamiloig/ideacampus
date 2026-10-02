from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConvocatoriaViewSet, NotificacionConvocatoriaViewSet

router = DefaultRouter()
router.register(r'convocatorias', ConvocatoriaViewSet, basename='convocatoria')
router.register(r'notificaciones-convocatoria', NotificacionConvocatoriaViewSet, basename='notificaciones_convocatoria')

urlpatterns = [
    path('', include(router.urls)),
]
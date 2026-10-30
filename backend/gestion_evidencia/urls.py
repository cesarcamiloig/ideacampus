from rest_framework.routers import DefaultRouter

from .views import EvidenciaViewSet, RegistroAvanceViewSet

router = DefaultRouter()
router.register("evidencias", EvidenciaViewSet, basename="evidencia")
router.register("registros-avance", RegistroAvanceViewSet, basename="registro-avance")

urlpatterns = router.urls

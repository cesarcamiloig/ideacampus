from rest_framework.routers import DefaultRouter

from .views import EvidenciaViewSet

router = DefaultRouter()
router.register("evidencias", EvidenciaViewSet, basename="evidencia")

urlpatterns = router.urls

from rest_framework.routers import DefaultRouter

from .views import RubricaViewSet

router = DefaultRouter()
router.register("rubricas", RubricaViewSet, basename="rubrica")

urlpatterns = router.urls

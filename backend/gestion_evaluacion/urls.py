from rest_framework.routers import DefaultRouter

from .views import CriterioRubricaViewSet, RubricaViewSet, SubRubricaViewSet

router = DefaultRouter()
router.register("rubricas", RubricaViewSet, basename="rubrica")
router.register("subrubricas", SubRubricaViewSet, basename="subrubrica")
router.register("criterios", CriterioRubricaViewSet, basename="criterio")

urlpatterns = router.urls
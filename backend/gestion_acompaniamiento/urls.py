from django.urls import path
from .views import PerfilTutorView, PerfilMentorView

urlpatterns = [
    path("tutor/perfil-academico/", PerfilTutorView.as_view(), name="perfil-tutor"),
    path("mentor/perfil-academico/", PerfilMentorView.as_view(), name="perfil-mentor"),
]s
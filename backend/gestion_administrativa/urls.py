from django.urls import path
from .views import GoogleLogin, PerfilUsuarioView

urlpatterns = [
    path("auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("auth/me/", PerfilUsuarioView.as_view(), name="auth_me"),
]

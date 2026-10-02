from django.urls import path
from .views import (
    GoogleLogin,
    PerfilUsuarioView,
    VariableListCreateView,
    VariableDetailView,
    PeriodoListCreateView,
    PeriodoDetailView,
    PeriodoHacerVigenteView,
    RolCatalogoListView,
    UsuarioAdminListView,
    UsuarioAdminDetailView,
    UsuarioRolesUpdateView,
)

urlpatterns = [
    # Autenticación y Perfil
    path("auth/google/", GoogleLogin.as_view(), name="google_login"),
    path("auth/me/", PerfilUsuarioView.as_view(), name="auth_me"),

    # HU-18: Variables de Caracterización
    path("parametros/variables/", VariableListCreateView.as_view(), name="variables_list_create"),
    path("parametros/variables/<int:pk>/", VariableDetailView.as_view(), name="variables_detail"),

    # HU-18: Periodos Académicos
    path("parametros/periodos/", PeriodoListCreateView.as_view(), name="periodos_list_create"),
    path("parametros/periodos/<str:pk>/", PeriodoDetailView.as_view(), name="periodos_detail"),
    path("parametros/periodos/<str:pk>/hacer-vigente/", PeriodoHacerVigenteView.as_view(), name="periodos_hacer_vigente"),

    # HU-18: Roles y Asignación de Usuarios
    path("parametros/roles/", RolCatalogoListView.as_view(), name="roles_catalogo_list"),
    path("parametros/usuarios/", UsuarioAdminListView.as_view(), name="usuarios_admin_list"),
    path("parametros/usuarios/<int:pk>/", UsuarioAdminDetailView.as_view(), name="usuarios_admin_detail"),
    path("parametros/usuarios/<int:pk>/roles/", UsuarioRolesUpdateView.as_view(), name="usuarios_roles_update"),
]



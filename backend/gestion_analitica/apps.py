from django.apps import AppConfig


class GestionAnaliticaConfig(AppConfig):
    """HU-14: Gestión analítica (dashboard de indicadores para Dirección del Programa)."""
    default_auto_field = "django.db.models.BigAutoField"
    name = "gestion_analitica"
    verbose_name = "Gestión Analítica"

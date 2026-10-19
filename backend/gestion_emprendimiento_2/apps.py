from django.apps import AppConfig


class GestionEmprendimiento2Config(AppConfig):
    name = 'gestion_emprendimiento_2'

    def ready(self):
        from . import signals  # noqa: F401

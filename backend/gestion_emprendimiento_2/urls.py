from django.urls import path
from .views import (
    EstudiantesDisponiblesView,
    CrearEquipoView,
    MiEquipoView,
    EquipoDetalleView,
    EquipoMiembroView,
    EvaluadoresDisponiblesView,
    AsignarEvaluadorView,
    MentoresDisponiblesView,
    AsignarMentorProyectoView,
    DesasignarMentorProyectoView,
)

urlpatterns = [
    path('estudiantes-disponibles/', EstudiantesDisponiblesView.as_view(), name='estudiantes_disponibles'),
    path('equipos/crear/', CrearEquipoView.as_view(), name='crear_equipo'),
    path('equipos/mi-equipo/', MiEquipoView.as_view(), name='mi_equipo'),
    path('equipos/<int:id_equipo>/', EquipoDetalleView.as_view(), name='equipo_detalle'),
    path('equipos/<int:id_equipo>/miembros/', EquipoMiembroView.as_view(), name='equipo_agregar_miembro'),
    path('equipos/<int:id_equipo>/miembros/<int:id_usuario>/', EquipoMiembroView.as_view(), name='equipo_eliminar_miembro'),
    path('proyectos/evaluadores/', EvaluadoresDisponiblesView.as_view(), name='evaluadores_disponibles'),
    path('proyectos/<int:id_proyecto>/evaluador/', AsignarEvaluadorView.as_view(), name='proyecto_asignar_evaluador'),

    # GENNOVA-80: Gestión y asignación de mentores
    path('proyectos/mentores/disponibles/', MentoresDisponiblesView.as_view(), name='mentores_disponibles'),
    path('proyectos/<int:id_proyecto>/mentores-disponibles/', MentoresDisponiblesView.as_view(), name='proyecto_mentores_disponibles'),
    path('proyectos/asignar-mentor/', AsignarMentorProyectoView.as_view(), name='asignar_mentor_proyecto'),
    path('proyectos/<int:id_proyecto>/mentores/', AsignarMentorProyectoView.as_view(), name='proyecto_mentores'),
    path('proyectos/<int:id_proyecto>/mentores/<int:id_mentor>/', DesasignarMentorProyectoView.as_view(), name='proyecto_desasignar_mentor'),
    path('proyectos/desasignar-mentor/', DesasignarMentorProyectoView.as_view(), name='desasignar_mentor_directo'),
]
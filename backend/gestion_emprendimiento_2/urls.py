from django.urls import path
from .views import (
    EstudiantesDisponiblesView,
    CrearEquipoView,
    MiEquipoView,
    EquipoDetalleView,
    EquipoMiembroView,
    EvaluadoresDisponiblesView,
    AsignarEvaluadorView,
    PlanTrabajoIniciativaView,
    PlanTrabajoProyectoView,
    PlanTrabajoDetalleView,
    HitoPlanTrabajoListCreateView,
    HitoPlanTrabajoDetailView,
    ActividadPlanTrabajoListCreateView,
    ActividadPlanTrabajoDetailView,
    EntregableActividadListCreateView,
    EntregableActividadDetailView,
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

    # HU-20: Plan de Trabajo y Entregables
    path('iniciativas/<int:id_iniciativa>/plan-trabajo/', PlanTrabajoIniciativaView.as_view(), name='iniciativa_plan_trabajo'),
    path('proyectos/<int:id_proyecto>/plan-trabajo/', PlanTrabajoProyectoView.as_view(), name='proyecto_plan_trabajo'),
    path('planes-trabajo/<int:id_plan>/', PlanTrabajoDetalleView.as_view(), name='plan_trabajo_detalle'),
    path('planes-trabajo/<int:id_plan>/hitos/', HitoPlanTrabajoListCreateView.as_view(), name='plan_trabajo_hitos'),
    path('hitos/<int:id_hito>/', HitoPlanTrabajoDetailView.as_view(), name='plan_trabajo_hito_detalle'),
    path('planes-trabajo/<int:id_plan>/actividades/', ActividadPlanTrabajoListCreateView.as_view(), name='plan_trabajo_actividades'),
    path('actividades/<int:id_actividad>/', ActividadPlanTrabajoDetailView.as_view(), name='plan_trabajo_actividad_detalle'),
    path('actividades/<int:id_actividad>/entregables/', EntregableActividadListCreateView.as_view(), name='actividad_entregables'),
    path('entregables/<int:id_entregable>/', EntregableActividadDetailView.as_view(), name='entregable_detalle'),
]
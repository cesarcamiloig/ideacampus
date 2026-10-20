from django.contrib import admin

from .models import (
    Estudiante,
    EquipoEmprendedor,
    Proyecto,
    PlanTrabajo,
    HitoPlanTrabajo,
    ActividadPlanTrabajo,
    EntregableActividad,
)

admin.site.register(Estudiante)
admin.site.register(EquipoEmprendedor)
admin.site.register(Proyecto)


@admin.register(PlanTrabajo)
class PlanTrabajoAdmin(admin.ModelAdmin):
    list_display = ("id_plan_trabajo", "titulo", "iniciativa", "estado", "fecha_inicio", "fecha_fin")
    list_filter = ("estado",)
    search_fields = ("titulo", "iniciativa__nombre")


@admin.register(HitoPlanTrabajo)
class HitoPlanTrabajoAdmin(admin.ModelAdmin):
    list_display = ("id_hito", "nombre", "plan_trabajo", "orden", "fecha_limite", "completado")
    list_filter = ("completado",)
    search_fields = ("nombre", "plan_trabajo__titulo")


@admin.register(ActividadPlanTrabajo)
class ActividadPlanTrabajoAdmin(admin.ModelAdmin):
    list_display = ("id_actividad", "nombre", "plan_trabajo", "responsable", "prioridad", "estado", "fecha_fin")
    list_filter = ("prioridad", "estado")
    search_fields = ("nombre", "plan_trabajo__titulo", "responsable__usuario__nombre")


@admin.register(EntregableActividad)
class EntregableActividadAdmin(admin.ModelAdmin):
    list_display = ("id_entregable", "nombre", "actividad", "tipo", "estado", "fecha_limite", "fecha_entrega")
    list_filter = ("estado", "tipo")
    search_fields = ("nombre", "actividad__nombre")

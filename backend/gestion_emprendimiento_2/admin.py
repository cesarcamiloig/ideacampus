from django.contrib import admin

from .models import (
    Actividad,
    Estudiante,
    EquipoEmprendedor,
    PlanTrabajo,
    Proyecto,
)

admin.site.register(Estudiante)
admin.site.register(EquipoEmprendedor)
admin.site.register(Proyecto)


class ActividadInline(admin.TabularInline):
    model = Actividad
    extra = 0
    fields = ("nombre", "responsable", "fecha_fin", "estado")
    readonly_fields = ("estado",)


@admin.register(PlanTrabajo)
class PlanTrabajoAdmin(admin.ModelAdmin):
    list_display = ("id_plan_trabajo", "titulo", "proyecto", "hito", "estado", "fecha_inicio", "fecha_fin")
    list_filter = ("estado", "hito")
    search_fields = ("titulo", "proyecto__nombre_proyecto")
    list_select_related = ("proyecto", "hito")
    inlines = [ActividadInline]


@admin.register(Actividad)
class ActividadAdmin(admin.ModelAdmin):
    list_display = ("nombre", "plan_trabajo", "responsable", "fecha_fin", "estado")
    list_filter = ("estado", "plan_trabajo__hito")
    search_fields = ("nombre", "plan_trabajo__proyecto__nombre_proyecto", "responsable__nombre")
    list_select_related = ("plan_trabajo__proyecto", "plan_trabajo__hito", "responsable")
    readonly_fields = ("fecha_completada", "creado")

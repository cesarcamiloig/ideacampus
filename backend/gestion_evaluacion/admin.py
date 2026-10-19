from django.contrib import admin

from .models import CriterioRubrica, Evaluacion, NotaCriterio, Rubrica, SubRubrica


class SubRubricaInline(admin.TabularInline):
    model = SubRubrica
    extra = 0
    fields = ("numero_hito", "nombre", "ponderacion")
    show_change_link = True  # para editar los criterios del hito


class CriterioRubricaInline(admin.TabularInline):
    model = CriterioRubrica
    extra = 0
    fields = ("nombre", "descripcion", "ponderacion", "escala_min", "escala_max")


class NotaCriterioInline(admin.TabularInline):
    model = NotaCriterio
    extra = 0
    fields = ("criterio", "nota", "comentario")


@admin.register(Rubrica)
class RubricaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "tipo_iniciativa", "creado")
    search_fields = ("nombre",)
    inlines = [SubRubricaInline]


@admin.register(SubRubrica)
class SubRubricaAdmin(admin.ModelAdmin):
    list_display = ("__str__", "rubrica", "numero_hito", "ponderacion")
    list_filter = ("rubrica",)
    search_fields = ("nombre",)
    inlines = [CriterioRubricaInline]


@admin.register(CriterioRubrica)
class CriterioRubricaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "subrubrica", "ponderacion", "escala_min", "escala_max")
    list_filter = ("subrubrica__rubrica",)
    search_fields = ("nombre",)


@admin.register(Evaluacion)
class EvaluacionAdmin(admin.ModelAdmin):
    list_display = ("proyecto", "subrubrica", "evaluador", "nota_final", "creado")
    list_filter = ("subrubrica__rubrica",)
    search_fields = ("proyecto__nombre_proyecto", "evaluador__nombre")
    inlines = [NotaCriterioInline]


@admin.register(NotaCriterio)
class NotaCriterioAdmin(admin.ModelAdmin):
    list_display = ("criterio", "evaluacion", "nota")

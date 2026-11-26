from rest_framework import serializers

from gestion_emprendimiento_2.models import Proyecto


class ProyectoAnaliticaSerializer(serializers.ModelSerializer):
    """Fila del listado del dashboard: datos del proyecto y sus variables de filtro."""

    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    vigencia = serializers.SerializerMethodField()
    tipo = serializers.CharField(source="iniciativa.tipo", read_only=True)
    tipo_display = serializers.CharField(source="iniciativa.get_tipo_display", read_only=True)
    origen_academico = serializers.CharField(source="iniciativa.origen_academico", read_only=True)
    origen_academico_display = serializers.CharField(
        source="iniciativa.get_origen_academico_display", read_only=True
    )
    sector_tecnologico = serializers.CharField(source="iniciativa.sector_tecnologico", read_only=True)
    etapa_actual = serializers.CharField(source="iniciativa.etapa_actual", read_only=True)
    id_iniciativa = serializers.IntegerField(source="iniciativa.id_iniciativa", read_only=True)
    periodo = serializers.SerializerMethodField()
    cohorte = serializers.SerializerMethodField()
    tutor = serializers.SerializerMethodField()
    postulante = serializers.SerializerMethodField()
    integrantes = serializers.IntegerField(read_only=True)
    nivel_madurez = serializers.CharField(read_only=True)
    aprobado_hitos = serializers.SerializerMethodField()

    class Meta:
        model = Proyecto
        fields = [
            "id_proyecto",
            "nombre_proyecto",
            "id_iniciativa",
            "estado",
            "estado_display",
            "vigencia",
            "tipo",
            "tipo_display",
            "origen_academico",
            "origen_academico_display",
            "sector_tecnologico",
            "etapa_actual",
            "periodo",
            "cohorte",
            "tutor",
            "postulante",
            "integrantes",
            "nivel_madurez",
            "aprobado_hitos",
            "creado",
        ]

    def get_aprobado_hitos(self, obj):
        # La vista calcula una sola vez el conjunto de aprobados y lo pasa en el contexto
        return obj.pk in self.context.get("aprobados_hitos", set())

    def get_vigencia(self, obj):
        return "activo" if obj.estado == Proyecto.Estado.ACTIVO else "inactivo"

    def get_periodo(self, obj):
        periodo = obj.iniciativa.convocatoria.periodo
        return {"id": periodo.id_periodo, "nombre": periodo.nombre} if periodo else None

    def get_cohorte(self, obj):
        convocatoria = obj.iniciativa.convocatoria
        return {"id": convocatoria.id_convocatoria, "nombre": convocatoria.nombre}

    def get_tutor(self, obj):
        tutor = obj.tutor
        return {"id": tutor.id_tutor, "nombre": tutor.usuario.nombre} if tutor else None

    def get_postulante(self, obj):
        usuario = obj.iniciativa.usuario
        return {"id": usuario.id_usuario, "nombre": usuario.nombre, "correo": usuario.correo}

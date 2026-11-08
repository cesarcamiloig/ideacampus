from django.core.validators import FileExtensionValidator
from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from rest_framework import serializers

from gestion_emprendimiento_2.models import EquipoEmprendedor, Proyecto
from gestion_evaluacion.models import SubRubrica
from .models import Evidencia, DocumentoEvidencia, RegistroAvance, RetroalimentacionAvance, validar_tamano_archivo

EXTENSIONES = ["pdf", "docx", "pptx", "png", "jpg", "jpeg"]


ESTADOS_APROBADOS = ("aprobada", "aceptada")


def proyectos_del_estudiante(usuario):
    """
    Proyectos en los que participa el estudiante: es titular de su iniciativa
    aprobada o está incluido en su equipo (misma regla que puede_subir_evidencia).
    """
    return Proyecto.objects.filter(
        Q(iniciativa__usuario=usuario, iniciativa__estado__in=ESTADOS_APROBADOS)
        | Q(iniciativa__equipo__miembros__usuario=usuario)
    ).distinct()


def proyectos_del_tutor(usuario):
    """Proyectos en los que el usuario es el tutor asignado (los retroalimenta)."""
    return Proyecto.objects.filter(tutor__usuario=usuario)


def puede_subir_evidencia(usuario, proyecto):
    """
    Puede subir evidencias a un proyecto el estudiante que:
    - es el titular de la iniciativa aprobada del proyecto, o
    - está incluido en el equipo del proyecto (los miembros, incluido el líder,
      son Estudiante con ese equipo asignado).
    """
    iniciativa = proyecto.iniciativa
    if iniciativa.usuario_id == usuario.pk and iniciativa.estado in ESTADOS_APROBADOS:
        return True
    try:
        equipo = iniciativa.equipo
    except EquipoEmprendedor.DoesNotExist:
        return False
    return equipo.miembros.filter(usuario=usuario).exists()


def puede_registrar_avance(usuario, proyecto):
    """
    Puede registrar el avance de un proyecto, según el rol activo:
    - tutor: el tutor asignado al proyecto.
    - estudiante: quien puede subir evidencias al proyecto.
    """
    if getattr(usuario, "rol_activo", None) == "tutor":
        return proyectos_del_tutor(usuario).filter(pk=proyecto.pk).exists()
    return puede_subir_evidencia(usuario, proyecto)


# ---------- Lectura ----------
class DocumentoEvidenciaSerializer(serializers.ModelSerializer):
    # URL de descarga por la API (requiere el token); None si el adjunto es un enlace
    archivo = serializers.SerializerMethodField()

    def get_archivo(self, obj):
        if not obj.es_archivo:
            return None
        ruta = reverse("evidencia-descargar-documento", kwargs={"doc_id": obj.pk})
        request = self.context.get("request")
        return request.build_absolute_uri(ruta) if request else ruta

    class Meta:
        model = DocumentoEvidencia
        fields = ["id", "archivo", "nombre_original", "extension",
                  "tamano_bytes", "enlace", "fecha_carga"]
        read_only_fields = fields


class EvidenciaSerializer(serializers.ModelSerializer):
    iniciativa = serializers.CharField(source="proyecto.iniciativa.nombre", read_only=True)
    etapa_nombre = serializers.CharField(source="etapa.nombre", read_only=True)
    usuario_nombre = serializers.CharField(source="usuario.nombre", read_only=True)
    documentos = DocumentoEvidenciaSerializer(many=True, read_only=True)

    class Meta:
        model = Evidencia
        fields = ["id", "proyecto", "iniciativa", "etapa", "etapa_nombre",
                  "usuario", "usuario_nombre", "titulo", "descripcion",
                  "tipo", "creado", "documentos"]
        read_only_fields = fields


# ---------- Creación ----------
class EvidenciaCrearSerializer(serializers.ModelSerializer):
    proyecto = serializers.PrimaryKeyRelatedField(
        queryset=Proyecto.objects.select_related("iniciativa"))
    etapa = serializers.PrimaryKeyRelatedField(
        queryset=SubRubrica.objects.select_related("rubrica"))
    archivos = serializers.ListField(
        child=serializers.FileField(validators=[
            FileExtensionValidator(EXTENSIONES), validar_tamano_archivo]),
        required=False, allow_empty=True, write_only=True)
    enlaces = serializers.ListField(
        child=serializers.URLField(max_length=500),
        required=False, allow_empty=True, write_only=True)

    class Meta:
        model = Evidencia
        fields = ["proyecto", "etapa", "titulo", "descripcion",
                  "tipo", "archivos", "enlaces"]

    def validate(self, attrs):
        usuario = self.context["request"].user
        proyecto = attrs["proyecto"]
        etapa = attrs["etapa"]
        archivos = attrs.get("archivos", [])
        enlaces = attrs.get("enlaces", [])

        if not puede_subir_evidencia(usuario, proyecto):
            raise serializers.ValidationError(
                {"proyecto": (
                    "Solo puede subir evidencias el titular de la iniciativa aprobada "
                    "o un integrante del equipo de este proyecto."
                )})

        if etapa.rubrica.tipo_iniciativa != proyecto.iniciativa.tipo:
            raise serializers.ValidationError(
                {"etapa": "La etapa no pertenece a la rúbrica de este tipo de proyecto."})

        if not archivos and not enlaces:
            raise serializers.ValidationError(
                "Debes adjuntar al menos un archivo o un enlace.")

        if attrs["tipo"] == Evidencia.Tipo.ENLACE and archivos:
            raise serializers.ValidationError(
                {"archivos": "El tipo 'enlace' solo admite enlaces."})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        archivos = validated_data.pop("archivos", [])
        enlaces = validated_data.pop("enlaces", [])
        evidencia = Evidencia.objects.create(
            usuario=self.context["request"].user, **validated_data)

        for f in archivos:
            DocumentoEvidencia.objects.create(
                evidencia=evidencia,
                contenido=f.read(),
                tipo_contenido=getattr(f, "content_type", "") or "",
                nombre_original=f.name,
                extension=f.name.rsplit(".", 1)[-1].lower() if "." in f.name else None,
                tamano_bytes=f.size,
            )
        for url in enlaces:
            DocumentoEvidencia.objects.create(evidencia=evidencia, enlace=url)
        return evidencia


# ===========================================================================
# HU-19 — Registro y validación de avance
# ===========================================================================

class RetroalimentacionAvanceSerializer(serializers.ModelSerializer):
    tutor_nombre = serializers.CharField(source="tutor.usuario.nombre", read_only=True)

    class Meta:
        model = RetroalimentacionAvance
        fields = ["id", "registro_avance", "tutor", "tutor_nombre",
                  "comentario", "aprobado", "fecha"]
        read_only_fields = ["id", "registro_avance", "tutor", "tutor_nombre", "fecha"]


class RegistroAvanceSerializer(serializers.ModelSerializer):
    """Serializer de lectura: incluye datos enriquecidos y retroalimentaciones."""
    proyecto_nombre = serializers.CharField(source="proyecto.iniciativa.nombre", read_only=True)
    etapa_nombre = serializers.CharField(source="etapa.nombre", read_only=True)
    registrado_por_nombre = serializers.CharField(source="registrado_por.nombre", read_only=True)
    estado_avance_display = serializers.CharField(
        source="get_estado_avance_display", read_only=True
    )
    estado_validacion = serializers.CharField(read_only=True)
    evidencias = EvidenciaSerializer(many=True, read_only=True)
    retroalimentaciones = RetroalimentacionAvanceSerializer(many=True, read_only=True)

    class Meta:
        model = RegistroAvance
        fields = [
            "id", "proyecto", "proyecto_nombre",
            "etapa", "etapa_nombre",
            "registrado_por", "registrado_por_nombre",
            "estado_avance", "estado_avance_display",
            "estado_validacion",
            "porcentaje_avance",
            "descripcion_avance",
            "dificultades",
            "riesgos",
            "recomendaciones",
            "evidencias",
            "fecha_registro",
            "fecha_actualizacion",
            "retroalimentaciones",
        ]
        read_only_fields = fields


class RegistroAvanceCrearSerializer(serializers.ModelSerializer):
    """Serializer de escritura para que el estudiante o el tutor cree un registro de avance."""
    proyecto = serializers.PrimaryKeyRelatedField(
        queryset=Proyecto.objects.select_related("iniciativa")
    )
    etapa = serializers.PrimaryKeyRelatedField(
        queryset=SubRubrica.objects.select_related("rubrica")
    )
    evidencias = serializers.PrimaryKeyRelatedField(
        queryset=Evidencia.objects.all(), many=True, allow_empty=False
    )

    class Meta:
        model = RegistroAvance
        fields = [
            "proyecto", "etapa", "evidencias",
            "estado_avance", "porcentaje_avance",
            "descripcion_avance",
            "dificultades", "riesgos", "recomendaciones",
        ]

    def validate(self, attrs):
        usuario = self.context["request"].user
        proyecto = attrs["proyecto"]
        etapa = attrs["etapa"]

        if not puede_registrar_avance(usuario, proyecto):
            raise serializers.ValidationError(
                {"proyecto": (
                    "Solo puede registrar avance el titular de la iniciativa aprobada, "
                    "un integrante del equipo o el tutor asignado a este proyecto."
                )}
            )

        # La etapa debe pertenecer a la rúbrica del tipo de este proyecto
        if etapa.rubrica.tipo_iniciativa != proyecto.iniciativa.tipo:
            raise serializers.ValidationError(
                {"etapa": "La etapa no pertenece a la rúbrica de este tipo de proyecto."}
            )

        # El avance se respalda con evidencia ya publicada en este proyecto y esta etapa
        if any(ev.proyecto_id != proyecto.pk or ev.etapa_id != etapa.pk for ev in attrs["evidencias"]):
            raise serializers.ValidationError(
                {"evidencias": "Las evidencias deben estar publicadas en este proyecto y en esta etapa."}
            )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        evidencias = validated_data.pop("evidencias")
        registro = RegistroAvance.objects.create(
            registrado_por=self.context["request"].user,
            **validated_data,
        )
        registro.evidencias.set(evidencias)
        return registro


class RetroalimentacionCrearSerializer(serializers.ModelSerializer):
    """Serializer para que el tutor deje retroalimentación sobre un registro de avance."""

    class Meta:
        model = RetroalimentacionAvance
        fields = ["comentario", "aprobado"]

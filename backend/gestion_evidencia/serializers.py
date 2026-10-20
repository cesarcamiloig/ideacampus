from django.core.validators import FileExtensionValidator
from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from rest_framework import serializers

from gestion_emprendimiento_2.models import EquipoEmprendedor, Proyecto
from gestion_evaluacion.models import SubRubrica
from .models import Evidencia, DocumentoEvidencia, validar_tamano_archivo

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
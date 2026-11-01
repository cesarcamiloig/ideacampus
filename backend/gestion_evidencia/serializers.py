from django.core.validators import FileExtensionValidator
from django.db import transaction
from django.urls import reverse
from django.utils import timezone
from rest_framework import serializers

from gestion_emprendimiento_2.models import Actividad, EquipoEmprendedor, Proyecto
from gestion_emprendimiento_2.services import (  # noqa: F401 (las vistas los importan desde aquí)
    ESTADOS_APROBADOS,
    es_lider_del_proyecto,
    proyectos_del_estudiante,
    proyectos_del_tutor,
)
from gestion_evaluacion.models import SubRubrica
from .models import Evidencia, DocumentoEvidencia, validar_tamano_archivo

EXTENSIONES = ["pdf", "docx", "pptx", "png", "jpg", "jpeg"]


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


def puede_gestionar_evidencia(usuario, evidencia):
    """
    Editar o eliminar una evidencia: el líder del equipo puede con todas las del
    proyecto; los demás integrantes solo con las que subieron ellos.
    """
    return evidencia.usuario_id == usuario.pk or es_lider_del_proyecto(usuario, evidencia.proyecto)


def crear_documentos(evidencia, archivos, enlaces):
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


def borrar_documentos(evidencia):
    # Los adjuntos antiguos guardados en disco también se borran del almacenamiento
    for documento in evidencia.documentos.exclude(archivo="").exclude(archivo__isnull=True):
        documento.archivo.delete(save=False)
    evidencia.documentos.all().delete()


def completar_actividad(actividad):
    """Al subir la evidencia de una actividad, esta queda completada."""
    if actividad.estado != Actividad.Estado.COMPLETADA:
        actividad.estado = Actividad.Estado.COMPLETADA
        actividad.fecha_completada = timezone.localdate()
        actividad.save(update_fields=["estado", "fecha_completada"])


def reabrir_actividad_sin_evidencias(actividad):
    """Si se eliminan todas las evidencias de una actividad, vuelve a quedar pendiente."""
    if actividad and not actividad.evidencias.exists():
        actividad.estado = Actividad.Estado.PENDIENTE
        actividad.fecha_completada = None
        actividad.save(update_fields=["estado", "fecha_completada"])


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
    actividad_nombre = serializers.CharField(source="actividad.nombre", read_only=True, default=None)
    documentos = DocumentoEvidenciaSerializer(many=True, read_only=True)

    class Meta:
        model = Evidencia
        fields = ["id", "proyecto", "iniciativa", "actividad", "actividad_nombre",
                  "etapa", "etapa_nombre", "usuario", "usuario_nombre", "titulo",
                  "descripcion", "tipo", "creado", "documentos"]
        read_only_fields = fields


# ---------- Creación ----------
class EvidenciaCrearSerializer(serializers.ModelSerializer):
    proyecto = serializers.PrimaryKeyRelatedField(
        queryset=Proyecto.objects.select_related("iniciativa"))
    actividad = serializers.PrimaryKeyRelatedField(
        queryset=Actividad.objects.select_related("plan_trabajo__hito"),
        required=False, allow_null=True)
    # Con actividad, la etapa es el hito de su plan de trabajo y puede omitirse
    etapa = serializers.PrimaryKeyRelatedField(
        queryset=SubRubrica.objects.select_related("rubrica"), required=False)
    archivos = serializers.ListField(
        child=serializers.FileField(validators=[
            FileExtensionValidator(EXTENSIONES), validar_tamano_archivo]),
        required=False, allow_empty=True, write_only=True)
    enlaces = serializers.ListField(
        child=serializers.URLField(max_length=500),
        required=False, allow_empty=True, write_only=True)

    class Meta:
        model = Evidencia
        fields = ["proyecto", "actividad", "etapa", "titulo", "descripcion",
                  "tipo", "archivos", "enlaces"]

    def validate(self, attrs):
        usuario = self.context["request"].user
        proyecto = attrs["proyecto"]
        actividad = attrs.get("actividad")
        archivos = attrs.get("archivos", [])
        enlaces = attrs.get("enlaces", [])

        if not puede_subir_evidencia(usuario, proyecto):
            raise serializers.ValidationError(
                {"proyecto": (
                    "Solo puede subir evidencias el titular de la iniciativa aprobada "
                    "o un integrante del equipo de este proyecto."
                )})

        if actividad:
            plan = actividad.plan_trabajo
            if plan.proyecto_id != proyecto.pk:
                raise serializers.ValidationError(
                    {"actividad": "La actividad no pertenece a este proyecto."})
            if actividad.responsable_id != usuario.pk:
                raise serializers.ValidationError(
                    {"actividad": "Solo el responsable de la actividad puede subir su evidencia."})
            if "etapa" not in attrs:
                attrs["etapa"] = plan.hito
            elif attrs["etapa"].pk != plan.hito_id:
                raise serializers.ValidationError(
                    {"etapa": "La etapa debe ser el hito del plan de trabajo de la actividad."})
        elif "etapa" not in attrs:
            raise serializers.ValidationError({"etapa": "Este campo es requerido."})

        etapa = attrs["etapa"]
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
        crear_documentos(evidencia, archivos, enlaces)
        if evidencia.actividad:
            completar_actividad(evidencia.actividad)
        return evidencia


# ---------- Edición ----------
class EvidenciaEditarSerializer(serializers.ModelSerializer):
    """
    Edita los datos de la evidencia. Si se envían archivos o enlaces, reemplazan
    todos los adjuntos anteriores. Proyecto, actividad y etapa no cambian.
    """
    archivos = serializers.ListField(
        child=serializers.FileField(validators=[
            FileExtensionValidator(EXTENSIONES), validar_tamano_archivo]),
        required=False, allow_empty=True, write_only=True)
    enlaces = serializers.ListField(
        child=serializers.URLField(max_length=500),
        required=False, allow_empty=True, write_only=True)

    class Meta:
        model = Evidencia
        fields = ["titulo", "descripcion", "tipo", "archivos", "enlaces"]

    def validate(self, attrs):
        reemplaza = "archivos" in attrs or "enlaces" in attrs
        archivos = attrs.get("archivos", [])
        enlaces = attrs.get("enlaces", [])
        if reemplaza and not archivos and not enlaces:
            raise serializers.ValidationError(
                "Debes adjuntar al menos un archivo o un enlace.")

        tipo = attrs.get("tipo", self.instance.tipo)
        if tipo == Evidencia.Tipo.ENLACE:
            tiene_archivos = (bool(archivos) if reemplaza
                              else self.instance.documentos.filter(enlace__isnull=True).exists())
            if tiene_archivos:
                raise serializers.ValidationError(
                    {"archivos": "El tipo 'enlace' solo admite enlaces."})
        return attrs

    @transaction.atomic
    def update(self, instance, validated_data):
        reemplaza = "archivos" in validated_data or "enlaces" in validated_data
        archivos = validated_data.pop("archivos", [])
        enlaces = validated_data.pop("enlaces", [])
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        if reemplaza:
            borrar_documentos(instance)
            crear_documentos(instance, archivos, enlaces)
        return instance
from rest_framework import serializers

from .models import ESTADOS_AUTORIZABLES, PublicacionCatalogo
from .services import esta_publicada, etiqueta_madurez, nivel_madurez, radicado


class CatalogoPublicoSerializer(serializers.Serializer):
    """
    Ficha pública de una iniciativa autorizada. Solo lleva datos de difusión:
    ni correos, ni postulante, ni integrantes.
    """

    def to_representation(self, iniciativa):
        publicacion = iniciativa.publicacion_catalogo
        equipo = getattr(iniciativa, "equipo", None)
        nivel = nivel_madurez(iniciativa)
        return {
            "id_iniciativa": iniciativa.id_iniciativa,
            "nombre": iniciativa.nombre,
            "tipo": iniciativa.tipo,
            "tipo_display": iniciativa.get_tipo_display(),
            "origen_academico": iniciativa.origen_academico,
            "origen_academico_display": iniciativa.get_origen_academico_display(),
            "detalle_origen": iniciativa.detalle_origen,
            "sector_tecnologico": iniciativa.sector_tecnologico,
            "convocatoria": iniciativa.convocatoria.nombre if iniciativa.convocatoria else None,
            "equipo": equipo.nombre_equipo if equipo else None,
            "nivel_madurez": nivel,
            "nivel_madurez_display": etiqueta_madurez(nivel) if nivel else None,
            "resumen_publico": publicacion.resumen_publico,
            "resultados": publicacion.resultados,
            "fecha_publicacion": publicacion.fecha_publicacion,
        }


class PublicacionCatalogoSerializer(serializers.ModelSerializer):
    autorizado_por_nombre = serializers.CharField(source="autorizado_por.nombre", read_only=True, default=None)

    class Meta:
        model = PublicacionCatalogo
        fields = ["publicada", "resumen_publico", "resultados",
                  "autorizado_por_nombre", "fecha_publicacion", "fecha_actualizacion"]
        read_only_fields = ["autorizado_por_nombre", "fecha_publicacion", "fecha_actualizacion"]
        extra_kwargs = {"resumen_publico": {"allow_blank": True, "required": False}}

    def validate(self, attrs):
        iniciativa = self.context["iniciativa"]
        publicada = attrs.get("publicada", getattr(self.instance, "publicada", False))
        resumen = attrs.get("resumen_publico", getattr(self.instance, "resumen_publico", "")) or ""

        if publicada and iniciativa.estado not in ESTADOS_AUTORIZABLES:
            raise serializers.ValidationError(
                {"publicada": "Solo se pueden publicar en el catálogo las iniciativas aprobadas."})
        if publicada and not resumen.strip():
            raise serializers.ValidationError(
                {"resumen_publico": "Escribe el resumen que verá el público antes de publicar."})
        return attrs


class CatalogoGestionSerializer(serializers.Serializer):
    """Iniciativa aprobada con el estado de su autorización en el catálogo, para el coordinador."""

    def to_representation(self, iniciativa):
        publicacion = getattr(iniciativa, "publicacion_catalogo", None)
        equipo = getattr(iniciativa, "equipo", None)
        nivel = nivel_madurez(iniciativa)
        return {
            "id_iniciativa": iniciativa.id_iniciativa,
            "radicado": radicado(iniciativa),
            "nombre": iniciativa.nombre,
            "descripcion": iniciativa.descripcion,
            "tipo": iniciativa.tipo,
            "tipo_display": iniciativa.get_tipo_display(),
            "origen_academico_display": iniciativa.get_origen_academico_display(),
            "convocatoria": iniciativa.convocatoria.nombre if iniciativa.convocatoria else None,
            "postulante": iniciativa.usuario.nombre if iniciativa.usuario else None,
            "equipo": equipo.nombre_equipo if equipo else None,
            "nivel_madurez_display": etiqueta_madurez(nivel) if nivel else None,
            "en_catalogo": esta_publicada(iniciativa),
            "publicacion": PublicacionCatalogoSerializer(publicacion).data if publicacion else None,
        }

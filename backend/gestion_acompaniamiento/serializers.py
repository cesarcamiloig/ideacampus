from rest_framework import serializers
from .models import Tutor, Mentor


class TutorPerfilSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="usuario.nombre", read_only=True)
    correo = serializers.CharField(source="usuario.correo", read_only=True)

    class Meta:
        model = Tutor
        fields = [
            "nombre", "correo",
            "area_conocimiento", "nivel_academico", "anios_experiencia",
            "biografia", "enlace_perfil",
        ]
        extra_kwargs = {
            "area_conocimiento": {"required": True, "allow_blank": False},
            "nivel_academico": {"required": True, "allow_null": False},
            "anios_experiencia": {"required": True, "allow_null": False, "max_value": 60},
        }


class MentorPerfilSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source="usuario.nombre", read_only=True)
    correo = serializers.CharField(source="usuario.correo", read_only=True)

    class Meta:
        model = Mentor
        fields = [
            "nombre", "correo",
            "area_especializacion", "nivel_academico", "anios_experiencia",
            "biografia", "enlace_perfil", "disponibilidad",
        ]
        extra_kwargs = {
            "area_especializacion": {"required": True, "allow_blank": False},
            "nivel_academico": {"required": True, "allow_null": False},
            "anios_experiencia": {"required": True, "allow_null": False, "max_value": 60},
            "disponibilidad": {"required": False},
        }
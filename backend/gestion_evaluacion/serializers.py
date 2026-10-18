from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from .models import CriterioRubrica, Rubrica, SubRubrica

# Deben coincidir con los valores que usa el campo tipo de Iniciativa
TIPOS_INICIATIVA = ("emprendimiento", "innovacion")
CIEN = Decimal("100")


def suma_ponderaciones(queryset, excluir_pk=None):
    if excluir_pk:
        queryset = queryset.exclude(pk=excluir_pk)
    return queryset.aggregate(total=Sum("ponderacion"))["total"] or Decimal("0")


# ---------------------------------------------------------------
# Serializers de lectura y de edición individual
# ---------------------------------------------------------------
class CriterioRubricaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriterioRubrica
        fields = [
            "id", "subrubrica", "nombre", "descripcion",
            "ponderacion", "escala_min", "escala_max",
        ]

    def validate_ponderacion(self, value):
        if value <= 0 or value > CIEN:
            raise serializers.ValidationError("La ponderación debe estar entre 0 y 100.")
        return value

    def validate(self, attrs):
        inst = self.instance
        subrubrica = attrs.get("subrubrica", getattr(inst, "subrubrica", None))
        ponderacion = attrs.get("ponderacion", getattr(inst, "ponderacion", None))
        escala_min = attrs.get("escala_min", getattr(inst, "escala_min", 1))
        escala_max = attrs.get("escala_max", getattr(inst, "escala_max", 5))

        # No se mueve un criterio a otra subrúbrica
        if inst and subrubrica != inst.subrubrica:
            raise serializers.ValidationError(
                {"subrubrica": "No se puede cambiar la subrúbrica de un criterio."}
            )

        # Escala coherente
        if escala_min >= escala_max:
            raise serializers.ValidationError(
                {"escala_max": "La escala máxima debe ser mayor que la mínima."}
            )

        # Los criterios de una subrúbrica no pueden pasar de 100 %
        otros = CriterioRubrica.objects.filter(subrubrica=subrubrica)
        suma_otros = suma_ponderaciones(otros, inst.pk if inst else None)
        if suma_otros + ponderacion > CIEN:
            raise serializers.ValidationError(
                {"ponderacion": f"Las ponderaciones superarían 100 %. Disponible: {CIEN - suma_otros} %."}
            )

        # Un criterio que ya tiene notas no cambia de peso ni de escala
        if inst and inst.notas.exists():
            cambios = any(
                campo in attrs and attrs[campo] != getattr(inst, campo)
                for campo in ("ponderacion", "escala_min", "escala_max")
            )
            if cambios:
                raise serializers.ValidationError(
                    "Este criterio ya tiene notas registradas; no se puede modificar su peso ni su escala."
                )
        return attrs


class SubRubricaSerializer(serializers.ModelSerializer):
    criterios = CriterioRubricaSerializer(many=True, read_only=True)
    suma_criterios = serializers.SerializerMethodField()

    class Meta:
        model = SubRubrica
        fields = [
            "id", "rubrica", "numero_hito", "nombre", "descripcion",
            "ponderacion", "suma_criterios", "criterios",
        ]

    def get_suma_criterios(self, obj):
        return suma_ponderaciones(obj.criterios.all())

    def validate_numero_hito(self, value):
        if value < 1:
            raise serializers.ValidationError("El número de hito debe ser 1 o mayor.")
        return value

    def validate_ponderacion(self, value):
        if value <= 0 or value > CIEN:
            raise serializers.ValidationError("La ponderación debe estar entre 0 y 100.")
        return value

    def validate(self, attrs):
        inst = self.instance
        rubrica = attrs.get("rubrica", getattr(inst, "rubrica", None))
        ponderacion = attrs.get("ponderacion", getattr(inst, "ponderacion", None))

        if inst and rubrica != inst.rubrica:
            raise serializers.ValidationError(
                {"rubrica": "No se puede cambiar la rúbrica de una subrúbrica."}
            )

        # Los hitos de una rúbrica no pueden pasar de 100 %
        otros = SubRubrica.objects.filter(rubrica=rubrica)
        suma_otros = suma_ponderaciones(otros, inst.pk if inst else None)
        if suma_otros + ponderacion > CIEN:
            raise serializers.ValidationError(
                {"ponderacion": f"Las ponderaciones superarían 100 %. Disponible: {CIEN - suma_otros} %."}
            )
        return attrs


class RubricaSerializer(serializers.ModelSerializer):
    subrubricas = SubRubricaSerializer(many=True, read_only=True)

    class Meta:
        model = Rubrica
        fields = ["id", "nombre", "tipo_iniciativa", "creado", "subrubricas"]
        read_only_fields = ["creado"]

    def validate_tipo_iniciativa(self, value):
        if value not in TIPOS_INICIATIVA:
            raise serializers.ValidationError(
                f"Tipo inválido. Use uno de: {', '.join(TIPOS_INICIATIVA)}."
            )
        return value


# ---------------------------------------------------------------
# Creación completa en una sola petición
# ---------------------------------------------------------------
class CriterioNuevoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriterioRubrica
        fields = ["nombre", "descripcion", "ponderacion", "escala_min", "escala_max"]

    def validate_ponderacion(self, value):
        if value <= 0 or value > CIEN:
            raise serializers.ValidationError("La ponderación debe estar entre 0 y 100.")
        return value

    def validate(self, attrs):
        if attrs.get("escala_min", 1) >= attrs.get("escala_max", 5):
            raise serializers.ValidationError(
                {"escala_max": "La escala máxima debe ser mayor que la mínima."}
            )
        return attrs


class SubRubricaNuevaSerializer(serializers.ModelSerializer):
    criterios = CriterioNuevoSerializer(many=True, allow_empty=False)

    class Meta:
        model = SubRubrica
        fields = ["numero_hito", "nombre", "descripcion", "ponderacion", "criterios"]
        validators = []  # la unicidad (rubrica, numero_hito) se valida en la rúbrica

    def validate_numero_hito(self, value):
        if value < 1:
            raise serializers.ValidationError("El número de hito debe ser 1 o mayor.")
        return value

    def validate_ponderacion(self, value):
        if value <= 0 or value > CIEN:
            raise serializers.ValidationError("La ponderación debe estar entre 0 y 100.")
        return value

    def validate(self, attrs):
        suma = sum(c["ponderacion"] for c in attrs["criterios"])
        if suma != CIEN:
            raise serializers.ValidationError(
                {"criterios": f"Los criterios suman {suma} %, deben sumar 100 %."}
            )
        return attrs


class RubricaCrearSerializer(serializers.ModelSerializer):
    subrubricas = SubRubricaNuevaSerializer(many=True, allow_empty=False)

    class Meta:
        model = Rubrica
        fields = ["id", "nombre", "tipo_iniciativa", "subrubricas"]

    def validate_tipo_iniciativa(self, value):
        if value not in TIPOS_INICIATIVA:
            raise serializers.ValidationError(
                f"Tipo inválido. Use uno de: {', '.join(TIPOS_INICIATIVA)}."
            )
        return value

    def validate_subrubricas(self, value):
        numeros = [s["numero_hito"] for s in value]
        if len(set(numeros)) != len(numeros):
            raise serializers.ValidationError("Hay números de hito repetidos.")
        if sorted(numeros) != list(range(1, len(numeros) + 1)):
            raise serializers.ValidationError(
                "Los números de hito deben ser consecutivos desde 1."
            )
        suma = sum(s["ponderacion"] for s in value)
        if suma != CIEN:
            raise serializers.ValidationError(
                f"Los hitos suman {suma} %, deben sumar 100 %."
            )
        return value

    @transaction.atomic
    def create(self, validated_data):
        subrubricas = validated_data.pop("subrubricas")
        rubrica = Rubrica.objects.create(**validated_data)
        for datos in subrubricas:
            criterios = datos.pop("criterios")
            sub = SubRubrica.objects.create(rubrica=rubrica, **datos)
            CriterioRubrica.objects.bulk_create(
                [CriterioRubrica(subrubrica=sub, **c) for c in criterios]
            )
        return rubrica
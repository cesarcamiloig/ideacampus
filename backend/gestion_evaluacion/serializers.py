from decimal import Decimal

from django.db import transaction
from django.db.models import F, ProtectedError, Sum
from rest_framework import serializers

from .models import CriterioRubrica, Rubrica, SubRubrica

CERO = Decimal("0")
CIEN = Decimal("100")
# Desplazamiento temporal de numero_hito para que la restricción única
# (rubrica, numero_hito) no choque al reordenar o intercambiar hitos
DESPLAZAMIENTO_HITO = 1000
CAMPOS_PROTEGIDOS_CRITERIO = ("ponderacion", "escala_min", "escala_max")


def suma_ponderaciones(queryset, excluir_pk=None):
    """Suma (Decimal) de las ponderaciones del queryset, excluyendo opcionalmente un registro."""
    if excluir_pk is not None:
        queryset = queryset.exclude(pk=excluir_pk)
    return queryset.aggregate(total=Sum("ponderacion"))["total"] or CERO


def validar_ponderacion(value):
    if value <= CERO or value > CIEN:
        raise serializers.ValidationError("La ponderación debe ser mayor que 0 y máximo 100.")
    return value


def tiene_notas(criterio):
    # Mientras no exista el modelo de notas, el related_name "notas" no está disponible
    notas = getattr(criterio, "notas", None)
    return notas is not None and notas.exists()


def ids_repetidos(elementos):
    ids = [e["id"] for e in elementos if e.get("id") is not None]
    return len(ids) != len(set(ids))


# ---------------------------------------------------------------
# Serializers de lectura
# ---------------------------------------------------------------
class CriterioRubricaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CriterioRubrica
        fields = [
            "id", "subrubrica", "nombre", "descripcion",
            "ponderacion", "escala_min", "escala_max",
        ]
        read_only_fields = fields


class SubRubricaSerializer(serializers.ModelSerializer):
    criterios = CriterioRubricaSerializer(many=True, read_only=True)
    suma_criterios = serializers.SerializerMethodField()

    class Meta:
        model = SubRubrica
        fields = [
            "id", "rubrica", "numero_hito", "nombre", "descripcion",
            "ponderacion", "suma_criterios", "criterios",
        ]
        read_only_fields = fields

    def get_suma_criterios(self, obj):
        return suma_ponderaciones(obj.criterios.all())


class HitoListaSerializer(serializers.ModelSerializer):
    """Vista liviana de un hito, sin descripción, ponderación ni criterios."""
    tipo_iniciativa = serializers.CharField(source="rubrica.tipo_iniciativa", read_only=True)

    class Meta:
        model = SubRubrica
        fields = ["id", "numero_hito", "nombre", "tipo_iniciativa"]
        read_only_fields = fields


class RubricaSerializer(serializers.ModelSerializer):
    subrubricas = SubRubricaSerializer(many=True, read_only=True)

    class Meta:
        model = Rubrica
        fields = ["id", "nombre", "tipo_iniciativa", "creado", "subrubricas"]
        read_only_fields = fields


# ---------------------------------------------------------------
# Serializers de edición (PUT de la rúbrica completa)
# ---------------------------------------------------------------
class CriterioEdicionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CriterioRubrica
        fields = ["id", "nombre", "descripcion", "ponderacion", "escala_min", "escala_max"]

    def validate_ponderacion(self, value):
        return validar_ponderacion(value)

    def validate(self, attrs):
        # Si no se envían, aplican los valores por defecto del modelo
        if attrs.get("escala_min", 1) >= attrs.get("escala_max", 5):
            raise serializers.ValidationError(
                {"escala_max": "La escala mínima debe ser menor que la escala máxima."}
            )
        return attrs


class SubRubricaEdicionSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    criterios = CriterioEdicionSerializer(many=True)

    class Meta:
        model = SubRubrica
        fields = ["id", "numero_hito", "nombre", "descripcion", "ponderacion", "criterios"]
        validators = []  # la unicidad de numero_hito se valida en la rúbrica

    def validate_numero_hito(self, value):
        if value < 1:
            raise serializers.ValidationError("El número de hito debe ser 1 o mayor.")
        return value

    def validate_ponderacion(self, value):
        return validar_ponderacion(value)

    def validate_criterios(self, value):
        if not value:
            raise serializers.ValidationError("El hito debe tener al menos un criterio.")
        if ids_repetidos(value):
            raise serializers.ValidationError("Hay ids de criterio repetidos.")
        suma = sum((c["ponderacion"] for c in value), CERO)
        if suma != CIEN:
            raise serializers.ValidationError(
                f"Los criterios del hito suman {suma} %, deben sumar exactamente 100 %."
            )
        return value


class RubricaEdicionSerializer(serializers.ModelSerializer):
    subrubricas = SubRubricaEdicionSerializer(many=True)

    class Meta:
        model = Rubrica
        fields = ["id", "nombre", "tipo_iniciativa", "subrubricas"]
        read_only_fields = ["id", "nombre", "tipo_iniciativa"]

    def validate_subrubricas(self, value):
        if not value:
            raise serializers.ValidationError("La rúbrica debe tener al menos un hito.")
        if ids_repetidos(value):
            raise serializers.ValidationError("Hay ids de hito repetidos.")

        numeros = [h["numero_hito"] for h in value]
        if len(set(numeros)) != len(numeros):
            raise serializers.ValidationError("Hay números de hito repetidos.")
        if sorted(numeros) != list(range(1, len(numeros) + 1)):
            raise serializers.ValidationError("Los números de hito deben ser consecutivos desde 1.")

        suma = sum((h["ponderacion"] for h in value), CERO)
        if suma != CIEN:
            raise serializers.ValidationError(
                f"Los hitos suman {suma} %, deben sumar exactamente 100 %."
            )
        return value

    def validate(self, attrs):
        rubrica = self.instance
        hitos_actuales = {h.pk: h for h in rubrica.subrubricas.prefetch_related("criterios")}

        for hito in attrs["subrubricas"]:
            hito_id = hito.get("id")
            if hito_id is None:
                # Un hito nuevo solo puede traer criterios nuevos
                if any(c.get("id") is not None for c in hito["criterios"]):
                    raise serializers.ValidationError(
                        {"subrubricas": f"El hito nuevo {hito['numero_hito']} no puede traer criterios con id."}
                    )
                continue

            actual = hitos_actuales.get(hito_id)
            if actual is None:
                raise serializers.ValidationError(
                    {"subrubricas": f"El hito con id {hito_id} no pertenece a esta rúbrica."}
                )

            criterios_actuales = {c.pk: c for c in actual.criterios.all()}
            for criterio in hito["criterios"]:
                criterio_id = criterio.get("id")
                if criterio_id is None:
                    continue
                existente = criterios_actuales.get(criterio_id)
                if existente is None:
                    raise serializers.ValidationError(
                        {"subrubricas": f"El criterio con id {criterio_id} no pertenece al hito {hito_id}."}
                    )
                # Un criterio con notas no cambia de peso ni de escala
                cambia = any(
                    campo in criterio and criterio[campo] != getattr(existente, campo)
                    for campo in CAMPOS_PROTEGIDOS_CRITERIO
                )
                if cambia and tiene_notas(existente):
                    raise serializers.ValidationError(
                        {"subrubricas": (
                            f"El criterio '{existente.nombre}' ya tiene notas registradas; "
                            f"no se puede cambiar su ponderación ni su escala."
                        )}
                    )
        return attrs

    @staticmethod
    def _borrar(queryset, descripcion):
        try:
            queryset.delete()
        except ProtectedError:
            raise serializers.ValidationError(
                {"subrubricas": (
                    f"No se puede eliminar {descripcion}: tiene evaluaciones o notas registradas."
                )}
            )

    @staticmethod
    def _sincronizar_criterios(hito, criterios):
        ids_enviados = [c["id"] for c in criterios if c.get("id") is not None]
        omitidos = hito.criterios.exclude(pk__in=ids_enviados)
        for criterio in omitidos:
            RubricaEdicionSerializer._borrar(
                CriterioRubrica.objects.filter(pk=criterio.pk), f"el criterio '{criterio.nombre}'"
            )

        for datos in criterios:
            datos = dict(datos)
            criterio_id = datos.pop("id", None)
            if criterio_id is None:
                CriterioRubrica.objects.create(subrubrica=hito, **datos)
            else:
                CriterioRubrica.objects.filter(pk=criterio_id).update(**datos)

    @transaction.atomic
    def update(self, instance, validated_data):
        hitos = validated_data["subrubricas"]
        ids_enviados = [h["id"] for h in hitos if h.get("id") is not None]

        # 1. Borrar los hitos que no vienen en el body
        for hito in instance.subrubricas.exclude(pk__in=ids_enviados):
            self._borrar(SubRubrica.objects.filter(pk=hito.pk), f"el hito {hito.numero_hito} '{hito.nombre}'")

        # 2. Desplazar numero_hito de los que se conservan para evitar choques de unicidad
        instance.subrubricas.update(numero_hito=F("numero_hito") + DESPLAZAMIENTO_HITO)

        # 3. Actualizar o crear cada hito y sincronizar sus criterios
        for datos in hitos:
            datos = dict(datos)
            criterios = datos.pop("criterios")
            hito_id = datos.pop("id", None)
            if hito_id is None:
                hito = SubRubrica.objects.create(rubrica=instance, **datos)
            else:
                SubRubrica.objects.filter(pk=hito_id).update(**datos)
                hito = SubRubrica.objects.get(pk=hito_id)
            self._sincronizar_criterios(hito, criterios)

        return instance

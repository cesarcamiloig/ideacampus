from django.db import migrations

# tipo_iniciativa debe coincidir con los valores del campo tipo de Iniciativa
RUBRICAS_INICIALES = [
    ("emprendimiento", "Rubrica de Emprendimientos"),
    ("innovacion", "Rubrica de Innovación"),
]


def crear_rubricas(apps, schema_editor):
    Rubrica = apps.get_model("gestion_evaluacion", "Rubrica")
    for tipo, nombre in RUBRICAS_INICIALES:
        Rubrica.objects.get_or_create(tipo_iniciativa=tipo, defaults={"nombre": nombre})


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_evaluacion", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_rubricas, migrations.RunPython.noop),
    ]

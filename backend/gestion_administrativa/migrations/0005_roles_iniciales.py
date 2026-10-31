from django.db import migrations

ROLES_INICIALES = [
    ("admin", "Administrador del Sistema"),
    ("coordinador", "Coordinador de Emprendimiento"),
    ("direccion_del_programa", "Dirección del Programa"),
    ("tutor", "Tutor Académico"),
    ("mentor", "Mentor Especializado"),
    ("evaluador", "Evaluador de Proyectos"),
    ("estudiante", "Usuario Estudiante"),
]


def crear_roles_iniciales(apps, schema_editor):
    Rol = apps.get_model("gestion_administrativa", "Rol")
    for nombre, descripcion in ROLES_INICIALES:
        Rol.objects.get_or_create(nombre_rol=nombre, defaults={"descripcion": descripcion})


class Migration(migrations.Migration):

    dependencies = [
        ("gestion_administrativa", "0004_alter_rolpermiso_id_alter_usuariorol_id"),
    ]

    operations = [
        migrations.RunPython(crear_roles_iniciales, migrations.RunPython.noop),
    ]

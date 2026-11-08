import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    HU-20: el modelo Actividad pasa de gestion_evidencia a esta app.
    La tabla "actividad" ya existe (la creó gestion_evidencia.0003), así que
    solo se mueve el estado de Django, sin tocar la base de datos.
    """

    dependencies = [
        ('gestion_administrativa', '0005_roles_iniciales'),
        ('gestion_emprendimiento_2', '0008_remove_entregableactividad_actividad_and_more'),
        ('gestion_evaluacion', '0002_rubricas_iniciales'),
        ('gestion_evidencia', '0003_actividad_evidencia_actividad'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='Actividad',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('nombre', models.CharField(max_length=200)),
                        ('descripcion', models.TextField(blank=True)),
                        ('entregable', models.CharField(blank=True, max_length=300)),
                        ('fecha_inicio', models.DateField(blank=True, null=True)),
                        ('fecha_fin', models.DateField()),
                        ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('completada', 'Completada')], default='pendiente', max_length=20)),
                        ('fecha_completada', models.DateField(blank=True, null=True)),
                        ('creado', models.DateTimeField(auto_now_add=True)),
                        ('creado_por', models.ForeignKey(db_column='id_creado_por', on_delete=django.db.models.deletion.PROTECT, related_name='actividades_creadas', to='gestion_administrativa.usuario')),
                        ('hito', models.ForeignKey(db_column='id_hito', on_delete=django.db.models.deletion.PROTECT, related_name='actividades', to='gestion_evaluacion.subrubrica')),
                        ('proyecto', models.ForeignKey(db_column='id_proyecto', on_delete=django.db.models.deletion.PROTECT, related_name='actividades', to='gestion_emprendimiento_2.proyecto')),
                        ('responsable', models.ForeignKey(db_column='id_responsable', on_delete=django.db.models.deletion.PROTECT, related_name='actividades_asignadas', to='gestion_administrativa.usuario')),
                    ],
                    options={
                        'db_table': 'actividad',
                        'ordering': ['fecha_fin'],
                    },
                ),
            ],
            database_operations=[],
        ),
    ]

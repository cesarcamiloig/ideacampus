import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    HU-20: plan de trabajo por hito del proyecto. La actividad deja de tener
    proyecto e hito propios y pasa a pertenecer a un plan de trabajo.
    La tabla "actividad" estaba vacía, así que plan_trabajo se agrega sin valor por defecto.
    """

    dependencies = [
        ('gestion_emprendimiento_2', '0009_actividad'),
        ('gestion_evaluacion', '0002_rubricas_iniciales'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlanTrabajo',
            fields=[
                ('id_plan_trabajo', models.AutoField(primary_key=True, serialize=False)),
                ('titulo', models.CharField(default='Plan de Trabajo', max_length=200)),
                ('descripcion', models.TextField(blank=True, null=True)),
                ('estado', models.CharField(choices=[('pendiente', 'Pendiente'), ('en_curso', 'En curso'), ('finalizado', 'Finalizado')], default='pendiente', max_length=30)),
                ('fecha_inicio', models.DateField(blank=True, null=True)),
                ('fecha_fin', models.DateField(blank=True, null=True)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('hito', models.ForeignKey(db_column='id_hito', on_delete=django.db.models.deletion.PROTECT, related_name='planes_trabajo', to='gestion_evaluacion.subrubrica')),
                ('proyecto', models.ForeignKey(db_column='id_proyecto', on_delete=django.db.models.deletion.CASCADE, related_name='planes_trabajo', to='gestion_emprendimiento_2.proyecto')),
            ],
            options={
                'db_table': 'plan_trabajo',
                'ordering': ['hito__numero_hito'],
                'constraints': [models.UniqueConstraint(fields=('proyecto', 'hito'), name='uq_plan_trabajo_proyecto_hito')],
            },
        ),
        migrations.RemoveField(
            model_name='actividad',
            name='hito',
        ),
        migrations.RemoveField(
            model_name='actividad',
            name='proyecto',
        ),
        migrations.AddField(
            model_name='actividad',
            name='plan_trabajo',
            field=models.ForeignKey(db_column='id_plan_trabajo', on_delete=django.db.models.deletion.CASCADE, related_name='actividades', to='gestion_emprendimiento_2.plantrabajo'),
        ),
    ]

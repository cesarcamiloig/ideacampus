# Generated for HU-17: Asignación de Evaluadores a Iniciativas

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gestion_administrativa', '0004_alter_rolpermiso_id_alter_usuariorol_id'),
        ('gestion_convocatorias', '0006_alerta_rol'),
    ]

    operations = [
        migrations.AddField(
            model_name='iniciativa',
            name='evaluador',
            field=models.ForeignKey(
                blank=True,
                db_column='id_evaluador',
                help_text='Evaluador institucional asignado para calificar la iniciativa (HU-17).',
                limit_choices_to=models.Q(
                    ('estado', 'activo'),
                    ('usuariorol__estado', 'activo'),
                    ('usuariorol__rol__nombre_rol', 'evaluador')
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='iniciativas_evaluadas',
                to='gestion_administrativa.usuario',
            ),
        ),
        migrations.AddField(
            model_name='iniciativa',
            name='coordinador_asignador',
            field=models.ForeignKey(
                blank=True,
                db_column='id_coordinador_asignador',
                help_text='Coordinador que realizó la asignación del evaluador (HU-17).',
                limit_choices_to=models.Q(
                    ('estado', 'activo'),
                    ('usuariorol__estado', 'activo'),
                    ('usuariorol__rol__nombre_rol', 'coordinador')
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='iniciativas_coordinadas_asignadas',
                to='gestion_administrativa.usuario',
            ),
        ),
        migrations.AddField(
            model_name='iniciativa',
            name='fecha_asignacion_evaluador',
            field=models.DateTimeField(
                blank=True,
                help_text='Fecha y hora en la que se efectuó la asignación del evaluador.',
                null=True,
            ),
        ),
    ]


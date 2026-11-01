import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    El modelo Actividad pasa a gestion_emprendimiento_2 (misma tabla "actividad"):
    evidencia.actividad apunta al nuevo modelo y se quita del estado de esta app,
    sin cambios en la base de datos.
    """

    dependencies = [
        ('gestion_emprendimiento_2', '0009_actividad'),
        ('gestion_evidencia', '0003_actividad_evidencia_actividad'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='evidencia',
                    name='actividad',
                    field=models.ForeignKey(blank=True, db_column='id_actividad', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='evidencias', to='gestion_emprendimiento_2.actividad'),
                ),
                migrations.DeleteModel(name='Actividad'),
            ],
            database_operations=[],
        ),
    ]

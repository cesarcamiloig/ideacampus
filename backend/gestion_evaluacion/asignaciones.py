def es_evaluador_asignado(usuario, proyecto):
    """
    Indica si el usuario puede evaluar el proyecto (HU-09 / HU-17).
    Si el proyecto tiene un evaluador asignado (HU-17), solo ese evaluador puede calificarlo.
    Si aún no tiene un evaluador asignado, permite calificar a cualquier evaluador activo.
    """
    evaluador_id = getattr(proyecto, "evaluador_id", None)
    if evaluador_id is not None:
        return evaluador_id == usuario.pk
    return True

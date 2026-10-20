from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import EsEstudiante, TieneRolPermitido
from gestion_administrativa.models import Usuario, UsuarioRol

from .models import (
    Estudiante,
    EquipoEmprendedor,
    Proyecto,
    PlanTrabajo,
    HitoPlanTrabajo,
    ActividadPlanTrabajo,
    EntregableActividad,
)
from .services import evaluadores_activos
from .serializers import (
    EstudianteDisponibleSerializer,
    CrearEquipoSerializer,
    ActualizarEquipoSerializer,
    AgregarMiembroSerializer,
    PlanTrabajoDetalleSerializer,
    HitoPlanTrabajoSerializer,
    ActividadPlanTrabajoSerializer,
    EntregableSerializer,
)


class EstudiantesDisponiblesView(APIView):
    """
    Retorna la lista de usuarios con rol activo de 'estudiante' que
    actualmente NO pertenecen a ningún equipo emprendedor,
    excluyendo además al usuario que realiza la consulta.
    Permite filtrar por nombre o correo mediante ?nombre= o ?q=.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def get(self, request):
        ids_usuarios_estudiantes = UsuarioRol.objects.filter(
            rol__nombre_rol='estudiante',
            estado='activo'
        ).values_list('usuario_id', flat=True)

        ids_usuarios_con_equipo = Estudiante.objects.filter(
            usuario_id__in=ids_usuarios_estudiantes,
            equipo__isnull=False
        ).values_list('usuario_id', flat=True)

        usuarios_disponibles = Usuario.objects.filter(
            id_usuario__in=ids_usuarios_estudiantes
        ).exclude(
            id_usuario__in=ids_usuarios_con_equipo
        ).exclude(
            id_usuario=request.user.id_usuario
        )

        busqueda = request.query_params.get('nombre') or request.query_params.get('q')
        if busqueda and busqueda.strip():
            busqueda = busqueda.strip()
            usuarios_disponibles = usuarios_disponibles.filter(
                Q(nombre__icontains=busqueda) | Q(correo__icontains=busqueda)
            )

        usuarios_disponibles = usuarios_disponibles.order_by('nombre')
        serializer = EstudianteDisponibleSerializer(usuarios_disponibles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CrearEquipoView(APIView):
    """
    Crea un nuevo equipo emprendedor asignando al usuario autenticado como líder
    y asociando a los miembros indicados.
    Cumple con las reglas institucionales:
    - Solo un estudiante activo puede crear un equipo.
    - El estudiante solo puede crear un equipo para una iniciativa que él mismo haya creado/subido.
    - La iniciativa debe haber sido aprobada por la coordinación.
    - Cada iniciativa aprobada puede tener como máximo un equipo activo.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def post(self, request):
        usuario = request.user

        # 1. Verificar si el usuario ya pertenece a un equipo
        estudiante_actual = Estudiante.objects.filter(usuario=usuario, equipo__isnull=False).first()
        if estudiante_actual:
            return Response(
                {"error": f"Ya perteneces al equipo '{estudiante_actual.equipo.nombre_equipo}'. No puedes crear otro equipo."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CrearEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre_equipo = serializer.validated_data['nombre_equipo'].strip()
        lider_usuario_id = serializer.validated_data['id_usuario_lider']
        usuarios_miembros = serializer.validated_data['usuarios_obj']
        id_iniciativa = serializer.validated_data.get('id_iniciativa')

        if usuario.id_usuario != lider_usuario_id:
            return Response(
                {"error": "Solo puedes crear un equipo donde tú seas el líder"},
                status=status.HTTP_403_FORBIDDEN
            )

        # 2. Validar reglas de la Iniciativa
        from gestion_convocatorias.models import Iniciativa, NotificacionConvocatoria

        def esta_aprobada(est):
            return str(est).strip().lower() in ['aprobada', 'aprobado', 'aceptada', 'aceptado', 'validada', 'validado']

        iniciativa = None
        if id_iniciativa:
            try:
                iniciativa = Iniciativa.objects.select_related('convocatoria').get(id_iniciativa=id_iniciativa)
            except Iniciativa.DoesNotExist:
                return Response(
                    {"error": "La iniciativa especificada no existe."},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Regla: Un estudiante únicamente puede registrar un equipo para una iniciativa que él mismo haya creado/subido
            if iniciativa.usuario_id != usuario.id_usuario:
                return Response(
                    {"error": "Solo puedes registrar un equipo para una iniciativa que tú mismo hayas creado/subido."},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Regla: Un estudiante únicamente puede registrar un equipo cuando la iniciativa correspondiente haya sido aprobada
            if not esta_aprobada(iniciativa.estado):
                return Response(
                    {"error": f"La iniciativa '{iniciativa.nombre}' se encuentra en estado '{iniciativa.estado}'. Un estudiante únicamente puede registrar un equipo cuando la iniciativa correspondiente haya sido aprobada."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Regla: La iniciativa no puede tener ya otro equipo
            if hasattr(iniciativa, 'equipo') and iniciativa.equipo is not None:
                return Response(
                    {"error": f"La iniciativa '{iniciativa.nombre}' ya tiene un equipo asignado ('{iniciativa.equipo.nombre_equipo}')."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Si no se pasó id_iniciativa explícito, buscar si tiene alguna iniciativa aprobada disponible
            candidatas = [
                i for i in Iniciativa.objects.filter(usuario=usuario).select_related('convocatoria')
                if esta_aprobada(i.estado) and (not hasattr(i, 'equipo') or i.equipo is None)
            ]
            if not candidatas:
                tiene_iniciativas = Iniciativa.objects.filter(usuario=usuario).exists()
                if tiene_iniciativas:
                    return Response(
                        {"error": "Tus iniciativas aún no han sido aprobadas. Un estudiante únicamente puede registrar un equipo cuando la iniciativa correspondiente haya sido aprobada."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {"error": "No tienes ninguna iniciativa registrada. Para crear un equipo debes contar con una iniciativa previa aprobada en una convocatoria abierta."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            iniciativa = candidatas[0]

        with transaction.atomic():
            estudiantes_emprendedores = []
            for u in usuarios_miembros:
                ee, _ = Estudiante.objects.get_or_create(usuario=u)
                estudiantes_emprendedores.append(ee)

            ya_con_equipo = [ee for ee in estudiantes_emprendedores if ee.equipo_id is not None]
            if ya_con_equipo:
                nombres_ocupados = [ee.usuario.nombre for ee in ya_con_equipo]
                return Response(
                    {"error": f"Los siguientes usuarios ya pertenecen a un equipo: {', '.join(nombres_ocupados)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lider_ee = next(ee for ee in estudiantes_emprendedores if ee.usuario_id == lider_usuario_id)

            equipo = EquipoEmprendedor.objects.create(
                nombre_equipo=nombre_equipo,
                estudiante_lider=lider_ee,
                iniciativa=iniciativa
            )

            for ee in estudiantes_emprendedores:
                ee.equipo = equipo
                ee.save(update_fields=['equipo'])

            # Notificaciones institucionales
            if iniciativa and hasattr(iniciativa, 'convocatoria') and iniciativa.convocatoria:
                NotificacionConvocatoria.objects.create(
                    convocatoria=iniciativa.convocatoria,
                    usuario=usuario,
                    titulo="Equipo Emprendedor Registrado",
                    mensaje=f"Has registrado exitosamente el equipo '{nombre_equipo}' para tu iniciativa aprobada '{iniciativa.nombre}'.",
                    tipo="actualizacion"
                )
                for ee in estudiantes_emprendedores:
                    if ee.usuario_id != usuario.id_usuario:
                        NotificacionConvocatoria.objects.create(
                            convocatoria=iniciativa.convocatoria,
                            usuario=ee.usuario,
                            titulo="Incorporación a Equipo Emprendedor",
                            mensaje=f"Has sido vinculado como integrante del equipo '{nombre_equipo}' en la iniciativa '{iniciativa.nombre}'.",
                            tipo="actualizacion"
                        )

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "id_iniciativa": iniciativa.id_iniciativa if iniciativa else None,
            "iniciativa_nombre": iniciativa.nombre if iniciativa else None,
            "estudiante_lider": lider_usuario_id,
            "miembros": [ee.usuario_id for ee in estudiantes_emprendedores],
            "message": "Equipo creado exitosamente"
        }, status=status.HTTP_201_CREATED)


class MiEquipoView(APIView):
    """
    Retorna los datos del equipo al que pertenece el estudiante autenticado
    (incluyendo nombre, líder, lista de miembros, iniciativa vinculada y si el usuario actual es el líder).
    Permite además eliminar el equipo completo si el solicitante es el líder.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def get(self, request):
        estudiante = Estudiante.objects.select_related(
            'equipo__estudiante_lider__usuario',
            'equipo__iniciativa__convocatoria',
            'usuario'
        ).filter(usuario=request.user, equipo__isnull=False).first()

        if not estudiante or not estudiante.equipo:
            return Response({
                "tiene_equipo": False,
                "equipo": None
            }, status=status.HTTP_200_OK)

        equipo = estudiante.equipo
        miembros_qs = Estudiante.objects.select_related('usuario').filter(
            equipo=equipo
        ).order_by('usuario__nombre')

        lider_usuario = equipo.estudiante_lider.usuario
        es_lider = (lider_usuario.id_usuario == request.user.id_usuario)

        miembros_data = [
            {
                "id_usuario": m.usuario.id_usuario,
                "id_estudiante": m.id_estudiante,
                "nombre": m.usuario.nombre,
                "correo": m.usuario.correo,
                "codigo": m.codigo,
                "semestre": m.semestre,
                "es_lider": (m.id_estudiante == equipo.estudiante_lider_id),
            }
            for m in miembros_qs
        ]

        iniciativa_data = None
        if hasattr(equipo, 'iniciativa') and equipo.iniciativa:
            ini = equipo.iniciativa
            iniciativa_data = {
                "id_iniciativa": ini.id_iniciativa,
                "nombre": ini.nombre,
                "tipo": ini.tipo,
                "estado": ini.estado,
                "convocatoria_nombre": ini.convocatoria.nombre if ini.convocatoria else None,
                "radicado": f"UFPS-POST-{ini.fecha_postulacion.year}-{ini.id_iniciativa:04d}" if ini.fecha_postulacion else None,
            }

        return Response({
            "tiene_equipo": True,
            "equipo": {
                "id_equipo": equipo.id_equipo,
                "nombre_equipo": equipo.nombre_equipo,
                "fecha_creacion": equipo.fecha_creacion.isoformat() if equipo.fecha_creacion else None,
                "es_lider": es_lider,
                "iniciativa": iniciativa_data,
                "lider": {
                    "id_usuario": lider_usuario.id_usuario,
                    "nombre": lider_usuario.nombre,
                    "correo": lider_usuario.correo,
                },
                "miembros": miembros_data,
            }
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        estudiante = Estudiante.objects.select_related('equipo__estudiante_lider').filter(
            usuario=request.user, equipo__isnull=False
        ).first()

        if not estudiante or not estudiante.equipo:
            return Response(
                {"error": "No perteneces a ningún equipo para eliminar"},
                status=status.HTTP_404_NOT_FOUND
            )

        equipo = estudiante.equipo
        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return Response(
                {"error": "Solo el líder del equipo tiene permisos para eliminar el equipo"},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            nombre_eliminado = equipo.nombre_equipo
            Estudiante.objects.filter(equipo=equipo).update(equipo=None)
            equipo.delete()

        return Response({
            "message": f"El equipo '{nombre_eliminado}' ha sido eliminado exitosamente. Los estudiantes ya están disponibles para conformar o unirse a nuevos equipos."
        }, status=status.HTTP_200_OK)


class EquipoDetalleView(APIView):
    """
    Consulta, actualización del nombre o eliminación de un equipo específico.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ["estudiante", "admin", "coordinador"]

    def _obtener_equipo(self, id_equipo):
        try:
            return EquipoEmprendedor.objects.select_related(
                'estudiante_lider__usuario',
                'iniciativa__convocatoria'
            ).get(id_equipo=id_equipo), None
        except EquipoEmprendedor.DoesNotExist:
            return None, Response({"error": "Equipo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

    def get(self, request, id_equipo):
        equipo, error_response = self._obtener_equipo(id_equipo)
        if error_response:
            return error_response

        miembros_qs = Estudiante.objects.select_related('usuario').filter(
            equipo=equipo
        ).order_by('usuario__nombre')

        lider_usuario = equipo.estudiante_lider.usuario
        es_lider = (lider_usuario.id_usuario == request.user.id_usuario)

        miembros_data = [
            {
                "id_usuario": m.usuario.id_usuario,
                "id_estudiante": m.id_estudiante,
                "nombre": m.usuario.nombre,
                "correo": m.usuario.correo,
                "codigo": m.codigo,
                "semestre": m.semestre,
                "es_lider": (m.id_estudiante == equipo.estudiante_lider_id),
            }
            for m in miembros_qs
        ]

        iniciativa_data = None
        if hasattr(equipo, 'iniciativa') and equipo.iniciativa:
            ini = equipo.iniciativa
            iniciativa_data = {
                "id_iniciativa": ini.id_iniciativa,
                "nombre": ini.nombre,
                "tipo": ini.tipo,
                "estado": ini.estado,
                "convocatoria_nombre": ini.convocatoria.nombre if ini.convocatoria else None,
                "radicado": f"UFPS-POST-{ini.fecha_postulacion.year}-{ini.id_iniciativa:04d}" if ini.fecha_postulacion else None,
            }

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "fecha_creacion": equipo.fecha_creacion.isoformat() if equipo.fecha_creacion else None,
            "es_lider": es_lider,
            "iniciativa": iniciativa_data,
            "lider": {
                "id_usuario": lider_usuario.id_usuario,
                "nombre": lider_usuario.nombre,
                "correo": lider_usuario.correo,
            },
            "miembros": miembros_data,
        }, status=status.HTTP_200_OK)

    def patch(self, request, id_equipo):
        equipo, error_response = self._obtener_equipo(id_equipo)
        if error_response:
            return error_response

        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return Response(
                {"error": "Solo el líder del equipo puede modificarlo"},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ActualizarEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre_nuevo = serializer.validated_data.get('nombre_equipo')
        if nombre_nuevo:
            equipo.nombre_equipo = nombre_nuevo.strip()
            equipo.save(update_fields=['nombre_equipo'])

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "message": "Equipo actualizado exitosamente"
        }, status=status.HTTP_200_OK)

    def delete(self, request, id_equipo):
        equipo, error_response = self._obtener_equipo(id_equipo)
        if error_response:
            return error_response

        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return Response(
                {"error": "Solo el líder del equipo tiene permisos para eliminar el equipo"},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            nombre_eliminado = equipo.nombre_equipo
            miembros = list(Estudiante.objects.filter(equipo=equipo).select_related('usuario'))
            Estudiante.objects.filter(equipo=equipo).update(equipo=None)
            if hasattr(equipo, 'iniciativa') and equipo.iniciativa and equipo.iniciativa.convocatoria:
                from gestion_convocatorias.models import NotificacionConvocatoria
                for m in miembros:
                    if m.usuario_id != request.user.id_usuario:
                        NotificacionConvocatoria.objects.create(
                            convocatoria=equipo.iniciativa.convocatoria,
                            usuario=m.usuario,
                            titulo="Disolución de Equipo Emprendedor",
                            mensaje=f"El equipo '{nombre_eliminado}' ha sido disuelto por su líder. Ya te encuentras disponible para conformar o unirte a otro equipo.",
                            tipo="actualizacion"
                        )
            equipo.delete()

        return Response({
            "message": f"El equipo '{nombre_eliminado}' ha sido eliminado exitosamente. Los estudiantes ya están disponibles para conformar o unirse a nuevos equipos."
        }, status=status.HTTP_200_OK)


class EquipoMiembroView(APIView):
    """
    Gestión de miembros de un equipo (agregar o eliminar).
    Solo el líder del equipo puede realizar estas acciones.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def _obtener_equipo_y_validar_lider(self, request, id_equipo):
        try:
            equipo = EquipoEmprendedor.objects.select_related('estudiante_lider', 'iniciativa__convocatoria').get(id_equipo=id_equipo)
        except EquipoEmprendedor.DoesNotExist:
            return None, Response({"error": "Equipo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return None, Response(
                {"error": "Solo el líder del equipo puede gestionar sus miembros"},
                status=status.HTTP_403_FORBIDDEN
            )
        return equipo, None

    def post(self, request, id_equipo):
        equipo, error_response = self._obtener_equipo_y_validar_lider(request, id_equipo)
        if error_response:
            return error_response

        serializer = AgregarMiembroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        id_usuario = serializer.validated_data['id_usuario']

        try:
            target_user = Usuario.objects.get(id_usuario=id_usuario)
        except Usuario.DoesNotExist:
            return Response({"error": "El usuario no existe"}, status=status.HTTP_404_NOT_FOUND)

        # Validar que tenga rol activo de estudiante
        tiene_rol_estudiante = UsuarioRol.objects.filter(
            usuario=target_user,
            rol__nombre_rol='estudiante',
            estado='activo'
        ).exists()
        if not tiene_rol_estudiante:
            return Response(
                {"error": "El usuario seleccionado no tiene un rol activo de estudiante"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar si ya pertenece a un equipo
        estudiante_target, _ = Estudiante.objects.get_or_create(usuario=target_user)
        if estudiante_target.equipo_id is not None:
            if estudiante_target.equipo_id == equipo.id_equipo:
                return Response(
                    {"error": "Este estudiante ya es miembro de este equipo"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"error": f"El estudiante ya pertenece a otro equipo ('{estudiante_target.equipo.nombre_equipo}')"},
                status=status.HTTP_400_BAD_REQUEST
            )

        estudiante_target.equipo = equipo
        estudiante_target.save(update_fields=['equipo'])

        # Notificación al nuevo integrante
        if hasattr(equipo, 'iniciativa') and equipo.iniciativa and equipo.iniciativa.convocatoria:
            from gestion_convocatorias.models import NotificacionConvocatoria
            NotificacionConvocatoria.objects.create(
                convocatoria=equipo.iniciativa.convocatoria,
                usuario=target_user,
                titulo="Incorporación a Equipo Emprendedor",
                mensaje=f"Has sido incorporado(a) como integrante del equipo '{equipo.nombre_equipo}' para la iniciativa '{equipo.iniciativa.nombre}'.",
                tipo="actualizacion"
            )

        return Response({
            "message": "Miembro agregado exitosamente",
            "miembro": {
                "id_usuario": target_user.id_usuario,
                "id_estudiante": estudiante_target.id_estudiante,
                "nombre": target_user.nombre,
                "correo": target_user.correo,
                "codigo": estudiante_target.codigo,
                "semestre": estudiante_target.semestre,
                "es_lider": False,
            }
        }, status=status.HTTP_201_CREATED)

    def delete(self, request, id_equipo, id_usuario):
        equipo, error_response = self._obtener_equipo_y_validar_lider(request, id_equipo)
        if error_response:
            return error_response

        if equipo.estudiante_lider.usuario_id == id_usuario:
            return Response(
                {"error": "El líder no puede eliminarse a sí mismo del equipo"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            miembro = Estudiante.objects.select_related('usuario').get(usuario_id=id_usuario, equipo=equipo)
        except Estudiante.DoesNotExist:
            return Response(
                {"error": "Ese usuario no pertenece a este equipo"},
                status=status.HTTP_404_NOT_FOUND
            )

        miembro.equipo = None
        miembro.save(update_fields=['equipo'])

        # Notificación al integrante retirado
        if hasattr(equipo, 'iniciativa') and equipo.iniciativa and equipo.iniciativa.convocatoria:
            from gestion_convocatorias.models import NotificacionConvocatoria
            NotificacionConvocatoria.objects.create(
                convocatoria=equipo.iniciativa.convocatoria,
                usuario=miembro.usuario,
                titulo="Retiro de Equipo Emprendedor",
                mensaje=f"Has sido retirado(a) del equipo '{equipo.nombre_equipo}'. Ya te encuentras disponible para integrar otro equipo.",
                tipo="actualizacion"
            )

        return Response({"message": "Miembro eliminado del equipo exitosamente"}, status=status.HTTP_200_OK)

ROLES_GESTORES_PROYECTO = ('admin', 'direccion_del_programa', 'direccion')


class EvaluadoresDisponiblesView(APIView):
    """Lista de usuarios con rol 'evaluador' activo que pueden asignarse a un proyecto."""
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTORES_PROYECTO

    def get(self, request):
        data = [
            {"id_usuario": u.id_usuario, "nombre": u.nombre, "correo": u.correo}
            for u in evaluadores_activos()
        ]
        return Response(data, status=status.HTTP_200_OK)


class AsignarEvaluadorView(APIView):
    """
    Asigna (o quita, enviando id_evaluador = null) el evaluador de un proyecto.
    Solo se permiten usuarios con el rol 'evaluador' activo.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = ROLES_GESTORES_PROYECTO

    def patch(self, request, id_proyecto):
        proyecto = Proyecto.objects.filter(pk=id_proyecto).first()
        if proyecto is None:
            return Response({"error": "Proyecto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if 'id_evaluador' not in request.data:
            return Response(
                {"error": "Debe enviar el campo 'id_evaluador'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        id_evaluador = request.data.get('id_evaluador')
        evaluador = None
        if id_evaluador:
            evaluador = evaluadores_activos().filter(pk=id_evaluador).first()
            if evaluador is None:
                return Response(
                    {"error": "El usuario seleccionado no es un evaluador activo."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        proyecto.evaluador = evaluador
        proyecto.save(update_fields=['evaluador'])
        return Response(
            {
                "id_proyecto": proyecto.id_proyecto,
                "id_evaluador": evaluador.id_usuario if evaluador else None,
                "evaluador_nombre": evaluador.nombre if evaluador else None,
            },
            status=status.HTTP_200_OK
        )

# =========================================================================
# HU-20: GESTIÓN DEL PLAN DE TRABAJO, HITOS, ACTIVIDADES Y ENTREGABLES
# =========================================================================


def _usuario_es_gestor_institucional(usuario):
    roles = getattr(usuario, "roles_asignados", [])
    rol_activo = getattr(usuario, "rol_activo", "")
    permitidos = {"admin", "coordinador", "direccion_del_programa", "direccion"}
    return any(r in permitidos for r in roles) or (rol_activo in permitidos)


def _puede_ver_plan_trabajo(usuario, plan_trabajo):
    if _usuario_es_gestor_institucional(usuario):
        return True

    ini = plan_trabajo.iniciativa
    # Autor de la iniciativa
    if ini.usuario_id == usuario.id_usuario:
        return True

    # Miembro o líder del equipo emprendedor
    equipo = getattr(ini, "equipo", None)
    if equipo:
        if equipo.estudiante_lider.usuario_id == usuario.id_usuario:
            return True
        if Estudiante.objects.filter(usuario=usuario, equipo=equipo).exists():
            return True

    # Tutor o evaluador asignado al proyecto
    proyecto = getattr(ini, "proyecto", None)
    if proyecto:
        if proyecto.evaluador_id == usuario.id_usuario:
            return True
        if proyecto.tutor and proyecto.tutor.usuario_id == usuario.id_usuario:
            return True
        if proyecto.asignaciones_mentor.filter(mentor__usuario=usuario, activo=True).exists():
            return True

    return False


def _puede_editar_plan_trabajo(usuario, plan_trabajo):
    if _usuario_es_gestor_institucional(usuario):
        return True

    ini = plan_trabajo.iniciativa
    # El líder del equipo emprendedor o el estudiante autor
    equipo = getattr(ini, "equipo", None)
    if equipo:
        if equipo.estudiante_lider.usuario_id == usuario.id_usuario:
            return True
        if Estudiante.objects.filter(usuario=usuario, equipo=equipo).exists():
            return True

    if ini.usuario_id == usuario.id_usuario:
        return True

    return False


class PlanTrabajoIniciativaView(APIView):
    """
    HU-20: Consulta y definición del Plan de Trabajo para una iniciativa.
    Accesible para el equipo emprendedor, tutores y coordinadores.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_iniciativa):
        from gestion_convocatorias.models import Iniciativa
        iniciativa = Iniciativa.objects.select_related("convocatoria", "usuario").filter(pk=id_iniciativa).first()
        if not iniciativa:
            return Response({"error": "Iniciativa no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        plan, _ = PlanTrabajo.objects.get_or_create(
            iniciativa=iniciativa,
            defaults={"titulo": f"Plan de Trabajo - {iniciativa.nombre}"}
        )

        if not _puede_ver_plan_trabajo(request.user, plan):
            return Response(
                {"error": "No tienes permisos para visualizar el plan de trabajo de esta iniciativa."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PlanTrabajoDetalleSerializer(plan)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, id_iniciativa):
        from gestion_convocatorias.models import Iniciativa
        iniciativa = Iniciativa.objects.select_related("convocatoria", "usuario").filter(pk=id_iniciativa).first()
        if not iniciativa:
            return Response({"error": "Iniciativa no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        plan, creado = PlanTrabajo.objects.get_or_create(
            iniciativa=iniciativa,
            defaults={"titulo": request.data.get("titulo") or f"Plan de Trabajo - {iniciativa.nombre}"}
        )

        if not _puede_editar_plan_trabajo(request.user, plan):
            return Response(
                {"error": "Solo el equipo emprendedor o los gestores pueden definir el plan de trabajo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        titulo = request.data.get("titulo")
        descripcion = request.data.get("descripcion")
        fecha_inicio = request.data.get("fecha_inicio")
        fecha_fin = request.data.get("fecha_fin")
        estado = request.data.get("estado")

        if titulo:
            plan.titulo = titulo.strip()
        if descripcion is not None:
            plan.descripcion = descripcion
        if fecha_inicio:
            plan.fecha_inicio = fecha_inicio
        if fecha_fin:
            plan.fecha_fin = fecha_fin
        if estado in dict(PlanTrabajo.Estado.choices):
            plan.estado = estado

        plan.save()
        serializer = PlanTrabajoDetalleSerializer(plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK)


class PlanTrabajoProyectoView(APIView):
    """
    HU-20: Consulta y acceso al Plan de Trabajo desde la perspectiva del Proyecto.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_proyecto):
        proyecto = Proyecto.objects.select_related("iniciativa").filter(pk=id_proyecto).first()
        if not proyecto:
            return Response({"error": "Proyecto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        plan, _ = PlanTrabajo.objects.get_or_create(
            iniciativa=proyecto.iniciativa,
            defaults={"titulo": f"Plan de Trabajo - {proyecto.nombre_proyecto}"}
        )

        if not _puede_ver_plan_trabajo(request.user, plan):
            return Response(
                {"error": "No tienes permisos para visualizar este plan de trabajo."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = PlanTrabajoDetalleSerializer(plan)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlanTrabajoDetalleView(APIView):
    """
    HU-20: Actualización parcial y consulta directa del Plan de Trabajo por ID.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_plan):
        plan = PlanTrabajo.objects.filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_ver_plan_trabajo(request.user, plan):
            return Response({"error": "No autorizado para consultar este plan."}, status=status.HTTP_403_FORBIDDEN)

        serializer = PlanTrabajoDetalleSerializer(plan)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, id_plan):
        plan = PlanTrabajo.objects.filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, plan):
            return Response({"error": "No tienes permisos para modificar este plan."}, status=status.HTTP_403_FORBIDDEN)

        for campo in ["titulo", "descripcion", "fecha_inicio", "fecha_fin", "estado"]:
            if campo in request.data:
                valor = request.data.get(campo)
                if campo == "estado" and valor not in dict(PlanTrabajo.Estado.choices):
                    continue
                setattr(plan, campo, valor)

        plan.save()
        return Response(PlanTrabajoDetalleSerializer(plan).data, status=status.HTTP_200_OK)


class HitoPlanTrabajoListCreateView(APIView):
    """
    HU-20: Listado y creación de hitos para un plan de trabajo.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_plan):
        plan = PlanTrabajo.objects.filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_ver_plan_trabajo(request.user, plan):
            return Response({"error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        hitos = plan.hitos.all()
        return Response(HitoPlanTrabajoSerializer(hitos, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, id_plan):
        plan = PlanTrabajo.objects.filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, plan):
            return Response({"error": "No tienes permisos para agregar hitos a este plan."}, status=status.HTTP_403_FORBIDDEN)

        nombre = request.data.get("nombre")
        if not nombre or not nombre.strip():
            return Response({"error": "El nombre del hito es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        orden = request.data.get("orden")
        if not orden:
            orden = plan.hitos.count() + 1

        hito = HitoPlanTrabajo.objects.create(
            plan_trabajo=plan,
            nombre=nombre.strip(),
            descripcion=request.data.get("descripcion", ""),
            fecha_limite=request.data.get("fecha_limite") or None,
            orden=int(orden),
        )
        return Response(HitoPlanTrabajoSerializer(hito).data, status=status.HTTP_201_CREATED)


class HitoPlanTrabajoDetailView(APIView):
    """
    HU-20: Edición o eliminación de un hito del plan de trabajo.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def patch(self, request, id_hito):
        hito = HitoPlanTrabajo.objects.select_related("plan_trabajo").filter(pk=id_hito).first()
        if not hito:
            return Response({"error": "Hito no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, hito.plan_trabajo):
            return Response({"error": "No tienes permisos para editar este hito."}, status=status.HTTP_403_FORBIDDEN)

        if "nombre" in request.data:
            hito.nombre = request.data["nombre"].strip()
        if "descripcion" in request.data:
            hito.descripcion = request.data["descripcion"]
        if "fecha_limite" in request.data:
            hito.fecha_limite = request.data["fecha_limite"] or None
        if "orden" in request.data:
            hito.orden = int(request.data["orden"])
        if "completado" in request.data:
            from django.utils import timezone
            comp = bool(request.data["completado"])
            hito.completado = comp
            hito.fecha_completado = timezone.now() if comp else None

        hito.save()
        return Response(HitoPlanTrabajoSerializer(hito).data, status=status.HTTP_200_OK)

    def delete(self, request, id_hito):
        hito = HitoPlanTrabajo.objects.select_related("plan_trabajo").filter(pk=id_hito).first()
        if not hito:
            return Response({"error": "Hito no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, hito.plan_trabajo):
            return Response({"error": "No tienes permisos para eliminar este hito."}, status=status.HTTP_403_FORBIDDEN)

        hito.delete()
        return Response({"message": "Hito eliminado exitosamente."}, status=status.HTTP_200_OK)


class ActividadPlanTrabajoListCreateView(APIView):
    """
    HU-20: Listado y creación de actividades del plan de trabajo con responsable y fechas.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_plan):
        plan = PlanTrabajo.objects.filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_ver_plan_trabajo(request.user, plan):
            return Response({"error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        qs = plan.actividades.select_related("hito", "responsable__usuario").prefetch_related("entregables")
        estado_f = request.query_params.get("estado")
        if estado_f:
            qs = qs.filter(estado=estado_f)

        id_hito = request.query_params.get("id_hito")
        if id_hito:
            qs = qs.filter(hito_id=id_hito)

        return Response(ActividadPlanTrabajoSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, id_plan):
        plan = PlanTrabajo.objects.select_related("iniciativa__equipo").filter(pk=id_plan).first()
        if not plan:
            return Response({"error": "Plan de trabajo no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, plan):
            return Response({"error": "No tienes permisos para agregar actividades a este plan."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ActividadPlanTrabajoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre = serializer.validated_data["nombre"]
        descripcion = serializer.validated_data.get("descripcion", "")
        fecha_inicio = serializer.validated_data.get("fecha_inicio")
        fecha_fin = serializer.validated_data.get("fecha_fin")
        prioridad = serializer.validated_data.get("prioridad", ActividadPlanTrabajo.Prioridad.MEDIA)
        estado = serializer.validated_data.get("estado", ActividadPlanTrabajo.Estado.PENDIENTE)

        # Validar hito
        hito_obj = None
        id_hito = request.data.get("id_hito")
        if id_hito:
            hito_obj = plan.hitos.filter(pk=id_hito).first()
            if not hito_obj:
                return Response({"error": "El hito indicado no pertenece a este plan de trabajo."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar responsable (debe pertenecer al equipo emprendedor de la iniciativa o ser líder)
        responsable_obj = None
        id_responsable = request.data.get("id_responsable")
        if id_responsable:
            responsable_obj = Estudiante.objects.filter(
                Q(pk=id_responsable) | Q(usuario_id=id_responsable)
            ).first()
            if not responsable_obj:
                return Response({"error": "El estudiante responsable no existe."}, status=status.HTTP_400_BAD_REQUEST)

            equipo = plan.equipo
            if equipo:
                es_del_equipo = (
                    responsable_obj.pk == equipo.estudiante_lider_id
                    or responsable_obj.equipo_id == equipo.pk
                )
                if not es_del_equipo:
                    return Response(
                        {"error": "El responsable debe ser un integrante activo del equipo emprendedor."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        actividad = ActividadPlanTrabajo.objects.create(
            plan_trabajo=plan,
            hito=hito_obj,
            responsable=responsable_obj,
            nombre=nombre,
            descripcion=descripcion,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            prioridad=prioridad,
            estado=estado,
        )

        # Emisión de alerta automática al responsable (HU-12)
        if responsable_obj and responsable_obj.usuario_id != request.user.id_usuario:
            from gestion_convocatorias.models import AlertaRol
            from django.utils import timezone
            import datetime

            fecha_venc = None
            if actividad.fecha_fin:
                fecha_venc = timezone.make_aware(
                    datetime.datetime.combine(actividad.fecha_fin, datetime.time.min)
                )
            else:
                fecha_venc = timezone.now() + timedelta(days=7)

            AlertaRol.objects.create(
                usuario=responsable_obj.usuario,
                titulo=f"Nueva Actividad Asignada: {actividad.nombre}",
                mensaje=(
                    f"Se te ha asignado como responsable de la actividad '{actividad.nombre}' "
                    f"en el plan de trabajo de '{plan.iniciativa.nombre}'."
                ),
                rol_destinatario="estudiante",
                tipo="general",
                prioridad="media",
                fecha_vencimiento=fecha_venc,
                modulo_destino="plan_trabajo",
            )

        return Response(ActividadPlanTrabajoSerializer(actividad).data, status=status.HTTP_201_CREATED)


class ActividadPlanTrabajoDetailView(APIView):
    """
    HU-20: Edición o eliminación de una actividad específica del plan de trabajo.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def patch(self, request, id_actividad):
        actividad = (
            ActividadPlanTrabajo.objects.select_related("plan_trabajo__iniciativa__equipo", "responsable")
            .filter(pk=id_actividad)
            .first()
        )
        if not actividad:
            return Response({"error": "Actividad no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, actividad.plan_trabajo):
            return Response({"error": "No tienes permisos para modificar esta actividad."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ActividadPlanTrabajoSerializer(actividad, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if "id_responsable" in request.data:
            id_resp = request.data.get("id_responsable")
            if id_resp is None:
                actividad.responsable = None
            else:
                resp = Estudiante.objects.filter(Q(pk=id_resp) | Q(usuario_id=id_resp)).first()
                if not resp:
                    return Response({"error": "Responsable no encontrado."}, status=status.HTTP_400_BAD_REQUEST)
                equipo = actividad.plan_trabajo.equipo
                if equipo:
                    es_del_equipo = (resp.pk == equipo.estudiante_lider_id or resp.equipo_id == equipo.pk)
                    if not es_del_equipo:
                        return Response(
                            {"error": "El responsable debe ser un integrante del equipo emprendedor."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                actividad.responsable = resp

        if "id_hito" in request.data:
            id_h = request.data.get("id_hito")
            if id_h is None:
                actividad.hito = None
            else:
                hito = actividad.plan_trabajo.hitos.filter(pk=id_h).first()
                if not hito:
                    return Response({"error": "El hito indicado no pertenece a este plan."}, status=status.HTTP_400_BAD_REQUEST)
                actividad.hito = hito

        serializer.save()
        return Response(ActividadPlanTrabajoSerializer(actividad).data, status=status.HTTP_200_OK)

    def delete(self, request, id_actividad):
        actividad = ActividadPlanTrabajo.objects.select_related("plan_trabajo").filter(pk=id_actividad).first()
        if not actividad:
            return Response({"error": "Actividad no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, actividad.plan_trabajo):
            return Response({"error": "No tienes permisos para eliminar esta actividad."}, status=status.HTTP_403_FORBIDDEN)

        actividad.delete()
        return Response({"message": "Actividad eliminada exitosamente."}, status=status.HTTP_200_OK)


class EntregableActividadListCreateView(APIView):
    """
    HU-20: Listado y creación de entregables para una actividad.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def get(self, request, id_actividad):
        actividad = ActividadPlanTrabajo.objects.select_related("plan_trabajo").filter(pk=id_actividad).first()
        if not actividad:
            return Response({"error": "Actividad no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_ver_plan_trabajo(request.user, actividad.plan_trabajo):
            return Response({"error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

        entregables = actividad.entregables.all()
        return Response(EntregableSerializer(entregables, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, id_actividad):
        actividad = ActividadPlanTrabajo.objects.select_related("plan_trabajo").filter(pk=id_actividad).first()
        if not actividad:
            return Response({"error": "Actividad no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, actividad.plan_trabajo):
            return Response({"error": "No tienes permisos para agregar entregables a esta actividad."}, status=status.HTTP_403_FORBIDDEN)

        nombre = request.data.get("nombre")
        if not nombre or not nombre.strip():
            return Response({"error": "El nombre del entregable es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

        entregable = EntregableActividad.objects.create(
            actividad=actividad,
            plan_trabajo=actividad.plan_trabajo,
            nombre=nombre.strip(),
            descripcion=request.data.get("descripcion", ""),
            fecha_limite=request.data.get("fecha_limite") or None,
            tipo=request.data.get("tipo", "documento"),
            enlace=request.data.get("enlace", ""),
            estado=request.data.get("estado", EntregableActividad.Estado.PENDIENTE),
        )
        return Response(EntregableSerializer(entregable).data, status=status.HTTP_201_CREATED)


class EntregableActividadDetailView(APIView):
    """
    HU-20: Edición, retroalimentación (observaciones de tutor) o eliminación de entregable.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [TieneRolPermitido]
    roles_permitidos = (
        "estudiante",
        "tutor",
        "mentor",
        "coordinador",
        "admin",
        "direccion_del_programa",
        "direccion",
    )

    def patch(self, request, id_entregable):
        entregable = (
            EntregableActividad.objects.select_related("actividad__plan_trabajo", "plan_trabajo")
            .filter(pk=id_entregable)
            .first()
        )
        if not entregable:
            return Response({"error": "Entregable no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        plan = entregable.plan_trabajo
        es_editor = _puede_editar_plan_trabajo(request.user, plan)
        roles = getattr(request.user, "roles_asignados", [])
        rol_activo = getattr(request.user, "rol_activo", "")
        es_acompanamiento = any(r in {"tutor", "coordinador", "admin", "direccion_del_programa", "direccion"} for r in roles) or (rol_activo in {"tutor", "coordinador"})

        if not es_editor and not es_acompanamiento:
            return Response({"error": "No tienes permisos para modificar este entregable."}, status=status.HTTP_403_FORBIDDEN)

        from django.utils import timezone
        for campo in ["nombre", "descripcion", "fecha_limite", "tipo", "enlace", "observaciones"]:
            if campo in request.data:
                setattr(entregable, campo, request.data.get(campo))

        if "estado" in request.data:
            nuevo_est = request.data["estado"]
            if nuevo_est in dict(EntregableActividad.Estado.choices):
                entregable.estado = nuevo_est
                if nuevo_est == EntregableActividad.Estado.ENTREGADO and not entregable.fecha_entrega:
                    entregable.fecha_entrega = timezone.now()

        entregable.save()
        return Response(EntregableSerializer(entregable).data, status=status.HTTP_200_OK)

    def delete(self, request, id_entregable):
        entregable = EntregableActividad.objects.select_related("plan_trabajo").filter(pk=id_entregable).first()
        if not entregable:
            return Response({"error": "Entregable no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not _puede_editar_plan_trabajo(request.user, entregable.plan_trabajo):
            return Response({"error": "No tienes permisos para eliminar este entregable."}, status=status.HTTP_403_FORBIDDEN)

        entregable.delete()
        return Response({"message": "Entregable eliminado exitosamente."}, status=status.HTTP_200_OK)


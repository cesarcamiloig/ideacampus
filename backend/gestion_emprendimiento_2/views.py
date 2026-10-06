from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.db.models import Q

from gestion_administrativa.authentication import JWTAuthentication
from gestion_administrativa.permissions import EsEstudiante
from gestion_administrativa.models import Usuario, UsuarioRol

from .models import Estudiante, EquipoEmprendedor
from .serializers import EstudianteDisponibleSerializer, CrearEquipoSerializer


class EstudiantesDisponiblesView(APIView):
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
        )

        # Filtro opcional por nombre o correo: ?nombre=jose
        busqueda = request.query_params.get('nombre')
        if busqueda:
            usuarios_disponibles = usuarios_disponibles.filter(
                Q(nombre__icontains=busqueda) | Q(correo__icontains=busqueda)
            )

        serializer = EstudianteDisponibleSerializer(usuarios_disponibles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CrearEquipoView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def post(self, request):
        usuario = request.user

        serializer = CrearEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre_equipo = serializer.validated_data['nombre_equipo']
        lider_usuario_id = serializer.validated_data['id_usuario_lider']
        usuarios_miembros = serializer.validated_data['usuarios_obj']

        if usuario.id_usuario != lider_usuario_id:
            return Response(
                {"error": "Solo puedes crear un equipo donde tú seas el líder"},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            estudiantes_emprendedores = []
            for u in usuarios_miembros:
                ee, _ = Estudiante.objects.get_or_create(usuario=u)
                estudiantes_emprendedores.append(ee)

            ya_con_equipo = [ee for ee in estudiantes_emprendedores if ee.equipo_id is not None]
            if ya_con_equipo:
                ids_ocupados = [ee.usuario_id for ee in ya_con_equipo]
                return Response(
                    {"error": f"Los siguientes usuarios ya pertenecen a un equipo: {ids_ocupados}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            lider_ee = next(ee for ee in estudiantes_emprendedores if ee.usuario_id == lider_usuario_id)

            equipo = EquipoEmprendedor.objects.create(
                nombre_equipo=nombre_equipo,
                estudiante_lider=lider_ee
            )

            for ee in estudiantes_emprendedores:
                ee.equipo = equipo
                ee.save(update_fields=['equipo'])

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "estudiante_lider": lider_usuario_id,
            "miembros": [ee.usuario_id for ee in estudiantes_emprendedores],
            "message": "Equipo creado exitosamente"
        }, status=status.HTTP_201_CREATED)

class EquipoDetalleView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def _obtener_equipo_y_validar_lider(self, request, id_equipo):
        try:
            equipo = EquipoEmprendedor.objects.select_related('estudiante_lider').get(id_equipo=id_equipo)
        except EquipoEmprendedor.DoesNotExist:
            return None, Response({"error": "Equipo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return None, Response(
                {"error": "Solo el líder del equipo puede modificarlo"},
                status=status.HTTP_403_FORBIDDEN
            )
        return equipo, None

    def patch(self, request, id_equipo):
        equipo, error_response = self._obtener_equipo_y_validar_lider(request, id_equipo)
        if error_response:
            return error_response

        serializer = ActualizarEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        nombre_nuevo = serializer.validated_data.get('nombre_equipo')
        if nombre_nuevo:
            equipo.nombre_equipo = nombre_nuevo
            equipo.save(update_fields=['nombre_equipo'])

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "message": "Equipo actualizado exitosamente"
        }, status=status.HTTP_200_OK)


class EquipoMiembroView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def delete(self, request, id_equipo, id_usuario):
        try:
            equipo = EquipoEmprendedor.objects.select_related('estudiante_lider').get(id_equipo=id_equipo)
        except EquipoEmprendedor.DoesNotExist:
            return Response({"error": "Equipo no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        if equipo.estudiante_lider.usuario_id != request.user.id_usuario:
            return Response(
                {"error": "Solo el líder del equipo puede eliminar miembros"},
                status=status.HTTP_403_FORBIDDEN
            )

        if equipo.estudiante_lider.usuario_id == id_usuario:
            return Response(
                {"error": "El líder no puede eliminarse a sí mismo del equipo"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            miembro = EstudianteEmprendedor.objects.get(usuario_id=id_usuario, equipo=equipo)
        except EstudianteEmprendedor.DoesNotExist:
            return Response(
                {"error": "Ese usuario no pertenece a este equipo"},
                status=status.HTTP_404_NOT_FOUND
            )

        miembro.equipo = None
        miembro.save(update_fields=['equipo'])

        return Response({"message": "Miembro eliminado del equipo"}, status=status.HTTP_200_OK)
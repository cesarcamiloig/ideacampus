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


class MiEquipoView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [EsEstudiante]

    def get(self, request):
        estudiante = Estudiante.objects.select_related(
            'equipo',
            'equipo__estudiante_lider',
        ).filter(usuario_id=request.user.id_usuario, equipo__isnull=False).first()

        if estudiante is None:
            return Response(None, status=status.HTTP_200_OK)

        equipo = estudiante.equipo
        miembros = equipo.miembros.select_related('usuario').order_by('usuario__nombre')
        lider_usuario_id = equipo.estudiante_lider.usuario_id

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "id_usuario_lider": lider_usuario_id,
            "es_lider": lider_usuario_id == request.user.id_usuario,
            "integrantes": [
                {
                    "id_usuario": miembro.usuario_id,
                    "nombre": miembro.usuario.nombre,
                    "correo": miembro.usuario.correo,
                    "es_lider": miembro.usuario_id == lider_usuario_id,
                }
                for miembro in miembros
            ],
        }, status=status.HTTP_200_OK)

    def put(self, request):
        serializer = CrearEquipoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lider_usuario_id = serializer.validated_data['id_usuario_lider']
        usuarios_miembros = serializer.validated_data['usuarios_obj']
        miembros_ids = [usuario.id_usuario for usuario in usuarios_miembros]

        if lider_usuario_id != request.user.id_usuario:
            return Response(
                {"error": "Solo puedes actualizar un equipo donde tú seas el líder"},
                status=status.HTTP_403_FORBIDDEN
            )

        estudiantes_activos = set(
            UsuarioRol.objects.filter(
                usuario_id__in=miembros_ids,
                usuario__estado='activo',
                rol__nombre_rol='estudiante',
                estado='activo',
            ).values_list('usuario_id', flat=True).distinct()
        )
        if estudiantes_activos != set(miembros_ids):
            return Response(
                {"error": "Todos los integrantes deben tener el rol estudiante activo"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            equipo = EquipoEmprendedor.objects.select_for_update().filter(
                estudiante_lider__usuario_id=request.user.id_usuario
            ).first()
            if equipo is None:
                return Response(
                    {"error": "No tienes un equipo liderado para actualizar"},
                    status=status.HTTP_404_NOT_FOUND
                )

            usuarios_en_otro_equipo = set(
                Estudiante.objects.filter(
                    usuario_id__in=miembros_ids,
                    equipo__isnull=False,
                ).exclude(
                    equipo=equipo
                ).values_list('usuario_id', flat=True)
            )
            if usuarios_en_otro_equipo:
                return Response(
                    {
                        "error": (
                            "Algunos integrantes ya pertenecen a otro equipo: "
                            f"{sorted(usuarios_en_otro_equipo)}"
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            equipo.nombre_equipo = serializer.validated_data['nombre_equipo']
            equipo.save(update_fields=['nombre_equipo'])

            Estudiante.objects.filter(equipo=equipo).exclude(
                usuario_id__in=miembros_ids
            ).update(equipo=None)

            for usuario in usuarios_miembros:
                estudiante, _ = Estudiante.objects.get_or_create(usuario=usuario)
                if estudiante.equipo_id != equipo.id_equipo:
                    estudiante.equipo = equipo
                    estudiante.save(update_fields=['equipo'])

        miembros_actualizados = Estudiante.objects.select_related(
            'usuario'
        ).filter(equipo=equipo).order_by('usuario__nombre')

        return Response({
            "id_equipo": equipo.id_equipo,
            "nombre_equipo": equipo.nombre_equipo,
            "id_usuario_lider": lider_usuario_id,
            "es_lider": True,
            "integrantes": [
                {
                    "id_usuario": miembro.usuario_id,
                    "nombre": miembro.usuario.nombre,
                    "correo": miembro.usuario.correo,
                    "es_lider": miembro.usuario_id == lider_usuario_id,
                }
                for miembro in miembros_actualizados
            ],
            "message": "Equipo actualizado exitosamente",
        }, status=status.HTTP_200_OK)
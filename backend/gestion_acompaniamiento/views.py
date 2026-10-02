from rest_framework.views import APIView
from rest_framework.response import Response

from gestion_administrativa.permissions import EsTutor, EsMentor
from .models import Tutor, Mentor
from .serializers import TutorPerfilSerializer, MentorPerfilSerializer


class PerfilAcademicoBaseView(APIView):
    """Lógica compartida. Cada subclase define modelo, serializer y permiso."""
    modelo = None
    serializer_class = None

    def get_perfil(self, request):
        # Siempre desde request.user, nunca desde un id que llegue en la petición
        perfil, _ = self.modelo.objects.get_or_create(usuario=request.user)
        return perfil

    def get(self, request):
        perfil = self.get_perfil(request)
        return Response(self.serializer_class(perfil).data)

    def put(self, request):
        perfil = self.get_perfil(request)
        serializer = self.serializer_class(perfil, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PerfilTutorView(PerfilAcademicoBaseView):
    permission_classes = [EsTutor]
    modelo = Tutor
    serializer_class = TutorPerfilSerializer


class PerfilMentorView(PerfilAcademicoBaseView):
    permission_classes = [EsMentor]
    modelo = Mentor
    serializer_class = MentorPerfilSerializer
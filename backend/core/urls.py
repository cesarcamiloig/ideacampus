from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Conectamos las rutas del módulo; verifica que el nombre coincida con tu carpeta
    path('api/v1/', include('gestion_convocatorias.urls')), 
]
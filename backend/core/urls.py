from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('api/', include('gestion_administrativa.urls')),
    path('api/', include('gestion_acompaniamiento.urls')),
    path('api/', include('gestion_convocatorias.urls')),
    path('api/', include('gestion_emprendimiento_2.urls')),
]


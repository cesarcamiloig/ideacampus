from django.conf import settings
from django.conf.urls.static import static
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

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


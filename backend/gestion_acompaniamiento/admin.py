from django.contrib import admin

from .models import (
    Tutor,
    Mentor
)

admin.site.register(Tutor)
admin.site.register(Mentor)


from django.db import models


class Usuario(models.Model):
    id_usuario = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    correo = models.EmailField(max_length=150, unique=True)
    google_id = models.CharField(max_length=100, unique=True)
    estado = models.CharField(max_length=20, default='activo')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'usuario'

    def __str__(self):
        return self.nombre


class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)
    nombre_rol = models.CharField(max_length=50, unique=True)
    descripcion = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'rol'

    def __str__(self):
        return self.nombre_rol


class UsuarioRol(models.Model):
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        db_column='id_usuario'
    )

    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        db_column='id_rol'
    )

    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table = 'usuario_rol'
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'rol'],
                name='unique_usuario_rol'
            )
        ]

    def __str__(self):
        return f'{self.usuario} - {self.rol}'


class Permiso(models.Model):
    id_permiso = models.AutoField(primary_key=True)
    codigo = models.CharField(max_length=100, unique=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    modulo = models.CharField(
        max_length=50,
        null=True,
        blank=True
    )
    estado = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table = 'permiso'

    def __str__(self):
        return self.codigo


class RolPermiso(models.Model):
    rol = models.ForeignKey(
        Rol,
        on_delete=models.CASCADE,
        db_column='id_rol'
    )

    permiso = models.ForeignKey(
        Permiso,
        on_delete=models.CASCADE,
        db_column='id_permiso'
    )

    class Meta:
        db_table = 'rol_permiso'
        constraints = [
            models.UniqueConstraint(
                fields=['rol', 'permiso'],
                name='unique_rol_permiso'
            )
        ]

    def __str__(self):
        return f'{self.rol} - {self.permiso}'


class VariableCaracterizacion(models.Model):
    id_variable = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=150)
    descripcion = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )
    tipo_dato = models.CharField(max_length=20)
    opciones = models.CharField(
        max_length=500,
        null=True,
        blank=True
    )
    obligatoria = models.BooleanField(default=False)
    orden = models.IntegerField(
        null=True,
        blank=True
    )
    estado = models.CharField(max_length=20, default='activo')

    class Meta:
        db_table = 'variable_caracterizacion'

    def __str__(self):
        return self.nombre
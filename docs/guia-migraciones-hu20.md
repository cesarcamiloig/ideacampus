# Guía Técnica para el Desarrollo de Nuevas Migraciones de HU-20

**Módulo:** `gestion_emprendimiento_2`  
**Historia de Usuario:** HU-20 — Gestión del Plan de Trabajo y Entregables (GENNOVA-89)  
**Destinatario:** Desarrollador responsable de reimplementar la HU-20  

---

## 1. Contexto y Estado Actual del Repositorio

El backend de la HU-20 fue previamente integrado en `develop` incorporando 4 modelos de datos:
1. `PlanTrabajo` (tabla física: `plan_trabajo`)
2. `HitoPlanTrabajo` (tabla física: `hito_plan_trabajo`)
3. `ActividadPlanTrabajo` (tabla física: `actividad_plan_trabajo`)
4. `EntregableActividad` (tabla física: `entregable_actividad`)

Dichas estructuras quedaron registradas en la migración:
`backend/gestion_emprendimiento_2/migrations/0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more.py`.

---

## 2. Regla Crítica: NO Eliminar el Archivo de Migración `0007_...`

> [!CAUTION]
> **Dependencia Cruzada Obligatoria:**
> La migración de la HU-19 en `gestion_evidencia`:
> `backend/gestion_evidencia/migrations/0003_registro_avance.py`
> 
> contiene explícitamente en su lista de dependencias:
> ```python
> ('gestion_emprendimiento_2', '0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more'),
> ```
> 
> Si eliminas o renombras físicamente el archivo `0007_...` en `gestion_emprendimiento_2/migrations/`, Django arrojará un error fatal `django.db.migrations.exceptions.NodeNotFoundError` impidiendo cualquier ejecución de `migrate`, `test` o `check`.

---

## 3. Flujo de Trabajo Recomendado

Para desarrollar nuevamente las estructuras de la HU-20 de forma limpia y profesional:

### Paso 1: Trabajar en una rama independiente
```bash
git checkout develop
git pull origin develop
git checkout -b feat/HU-20-nuevas-migraciones
```

### Paso 2: Modificar los modelos en `models.py`
Edita `backend/gestion_emprendimiento_2/models.py` con las definiciones, campos y relaciones que requiera la nueva especificación técnica de la HU-20.

### Paso 3: Generar la nueva migración consecutiva
Ejecuta la creación automática de migraciones:
```bash
docker compose exec backend python manage.py makemigrations gestion_emprendimiento_2
```
Esto generará la migración `0008_<nombre>.py`, la cual dependerá automáticamente de la `0007_...` preexistente, preservando el grafo de dependencias de todo el proyecto.

### Paso 4: Limpiar la base de datos destino antes de migrar
Antes de aplicar las nuevas migraciones sobre la base de datos compartida o de desarrollo (MySQL / TiDB Cloud), ejecuta el script de limpieza para evitar colisiones:

**Opción A — Usando el script Python:**
```bash
python scripts/limpiar_tablas_hu20.py --host <HOST> --port <PUERTO> --user <USUARIO> --password <PASS> --db <DB_NAME> [--ssl]
```

**Opción B — Usando el script SQL directo en el cliente MySQL:**
```bash
mysql -h <HOST> -P <PUERTO> -u <USUARIO> -p <DB_NAME> < database/limpieza_hu20.sql
```

### Paso 5: Aplicar las migraciones
```bash
docker compose exec backend python manage.py migrate
```

### Paso 6: Verificar con la suite de pruebas
Asegúrate de que todas las pruebas pasen (las 170 existentes más las nuevas que desarrolles):
```bash
docker compose exec backend python manage.py test
```

---

## 4. Archivos Clave del Módulo
* Modelos: `backend/gestion_emprendimiento_2/models.py`
* Migraciones: `backend/gestion_emprendimiento_2/migrations/`
* Serializadores: `backend/gestion_emprendimiento_2/serializers.py`
* Vistas REST: `backend/gestion_emprendimiento_2/views.py`
* Pruebas: `backend/gestion_emprendimiento_2/tests.py`
* Script SQL de limpieza: `database/limpieza_hu20.sql`
* Utilidad de limpieza: `scripts/limpiar_tablas_hu20.py`

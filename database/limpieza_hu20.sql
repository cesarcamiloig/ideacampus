-- =============================================================================
-- IdeaCampus (GENNOVA) - Script de Limpieza de Base de Datos para HU-20
-- =============================================================================
-- Propósito: Eliminar de manera controlada y sin efectos colaterales las tablas
-- correspondientes a la Historia de Usuario 20 (Plan de Trabajo y Entregables),
-- preparando el esquema para la implementación de las nuevas migraciones.
-- =============================================================================

-- 1. Desactivar temporalmente revisión de claves foráneas
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Eliminar tablas en orden inverso de dependencias jerárquicas
-- (entregable -> actividad -> hito -> plan_trabajo)
DROP TABLE IF EXISTS `entregable_actividad`;
DROP TABLE IF EXISTS `actividad_plan_trabajo`;
DROP TABLE IF EXISTS `hito_plan_trabajo`;
DROP TABLE IF EXISTS `plan_trabajo`;

-- 3. Reactivar revisión de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- 4. Depurar el registro de la migración previa de HU-20 en Django
-- para que el motor reconozca las nuevas migraciones que desarrollará el compañero
DELETE FROM `django_migrations` 
WHERE `app` = 'gestion_emprendimiento_2' 
  AND `name` = '0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more';

-- Fin del script de limpieza

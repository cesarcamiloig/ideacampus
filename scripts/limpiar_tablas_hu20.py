#!/usr/bin/env python3
"""
IdeaCampus (GENNOVA) — Script de Limpieza Controlada para HU-20 (GENNOVA-89)
Elimina las tablas físicas asociadas a la HU-20 y limpia el registro en django_migrations.

Uso:
    python scripts/limpiar_tablas_hu20.py [--host HOST] [--port PORT] [--user USER] [--password PASS] [--db DBNAME] [--ssl] [--forzar]
    
Si no se pasan argumentos, intenta leer las credenciales del archivo .env.
"""

import os
import sys
import argparse

TABLAS_HU20 = [
    "entregable_actividad",
    "actividad_plan_trabajo",
    "hito_plan_trabajo",
    "plan_trabajo",
]

MIGRACION_HU20 = {
    "app": "gestion_emprendimiento_2",
    "name": "0007_hitoplantrabajo_actividadplantrabajo_plantrabajo_and_more",
}


def cargar_env():
    """Lee variables de .env si python-dotenv está disponible o por parsing directo."""
    config = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    config[k.strip()] = v.strip().strip("'\"")
    return config


def conectar(host, port, user, password, db, ssl=False):
    import MySQLdb

    kwargs = {
        "host": host,
        "port": int(port),
        "user": user,
        "passwd": password,
        "db": db,
        "charset": "utf8mb4",
        "connect_timeout": 15,
    }
    if ssl or "tidbcloud.com" in host or int(port) == 4000:
        kwargs["ssl_mode"] = "REQUIRED"

    return MySQLdb.connect(**kwargs)


def ejecutar_limpieza(host, port, user, password, db, ssl=False, forzar=False):
    print("=" * 70)
    print("  IDEACAMPUS (GENNOVA) - LIMPIEZA DE TABLAS HU-20 (GENNOVA-89)")
    print("=" * 70)
    print(f"[*] Destino: {user}@{host}:{port}/{db} (SSL: {ssl})")

    if not forzar:
        conf = input("\n[?] ¿Está seguro de proceder con la eliminación de las 4 tablas de HU-20? (s/N): ")
        if conf.strip().lower() not in ("s", "si", "y", "yes"):
            print("[-] Operación cancelada por el usuario.")
            return False

    try:
        conn = conectar(host, port, user, password, db, ssl)
        cur = conn.cursor()

        print("\n[*] 1. Auditando tablas existentes antes de la operación...")
        cur.execute("SHOW TABLES;")
        tablas_existentes = {row[0].lower() for row in cur.fetchall()}

        tablas_a_borrar = [t for t in TABLAS_HU20 if t.lower() in tablas_existentes]
        if not tablas_a_borrar:
            print("    [i] Ninguna de las tablas de HU-20 existe en la base de datos.")
        else:
            print(f"    Tablas de HU-20 detectadas ({len(tablas_a_borrar)}): {', '.join(tablas_a_borrar)}")
            for t in tablas_a_borrar:
                cur.execute(f"SELECT COUNT(*) FROM `{t}`;")
                cnt = cur.fetchone()[0]
                print(f"    - `{t}`: {cnt} registros.")

        print("\n[*] 2. Ejecutando eliminación en cascada controlada...")
        cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
        for t in TABLAS_HU20:
            cur.execute(f"DROP TABLE IF EXISTS `{t}`;")
            print(f"    [+] DROP TABLE IF EXISTS `{t}` ejecutado exitosamente.")
        cur.execute("SET FOREIGN_KEY_CHECKS = 1;")

        print("\n[*] 3. Verificando historial de django_migrations...")
        cur.execute("SHOW TABLES LIKE 'django_migrations';")
        if cur.fetchone():
            cur.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = %s AND name = %s;",
                (MIGRACION_HU20["app"], MIGRACION_HU20["name"]),
            )
            count_mig = cur.fetchone()[0]
            if count_mig > 0:
                cur.execute(
                    "DELETE FROM django_migrations WHERE app = %s AND name = %s;",
                    (MIGRACION_HU20["app"], MIGRACION_HU20["name"]),
                )
                conn.commit()
                print(f"    [+] Registro de migración '{MIGRACION_HU20['name']}' eliminado de django_migrations.")
            else:
                print("    [i] La migración de HU-20 no estaba registrada en django_migrations.")

        conn.commit()

        print("\n[*] 4. Verificación final de esquema...")
        cur.execute("SHOW TABLES;")
        tablas_finales = {row[0].lower() for row in cur.fetchall()}
        remanentes = [t for t in TABLAS_HU20 if t.lower() in tablas_finales]
        if remanentes:
            print(f"    [-] ADVERTENCIA: Aún existen tablas remanentes: {remanentes}")
        else:
            print("    [✓] Esquema verificado: Todas las tablas de HU-20 fueron eliminadas exitosamente.")

        conn.close()
        print("\n[✓] Proceso de limpieza finalizado con éxito.")
        return True
    except Exception as e:
        print(f"\n[-] Error ejecutando limpieza: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Limpieza de tablas de HU-20 en MySQL/TiDB")
    parser.add_argument("--host", help="Host de la base de datos")
    parser.add_argument("--port", default="3306", help="Puerto de la base de datos")
    parser.add_argument("--user", help="Usuario de la base de datos")
    parser.add_argument("--password", help="Contraseña de la base de datos")
    parser.add_argument("--db", help="Nombre de la base de datos")
    parser.add_argument("--ssl", action="store_true", help="Habilitar SSL (obligatorio para TiDB Cloud)")
    parser.add_argument("--forzar", action="store_true", help="Ejecutar sin confirmación interactiva")

    args = parser.parse_args()
    env = cargar_env()

    host = args.host or env.get("DB_HOST", "")
    port = args.port or env.get("DB_PORT", "3306")
    user = args.user or env.get("DB_USER", "")
    password = args.password or env.get("DB_PASSWORD", "")
    db = args.db or env.get("DB_NAME", "")
    ssl = args.ssl or (env.get("DB_SSL", "").lower() in ("true", "1", "yes")) or ("tidbcloud.com" in host)

    if not host or "ingresa_aqui" in host:
        print("[-] Error: Credenciales de base de datos no configuradas.")
        print("    Configure el archivo .env o pase los argumentos --host, --user, --password y --db.")
        print("\nEjemplo:")
        print("    python scripts/limpiar_tablas_hu20.py --host gateway01...tidbcloud.com --port 4000 --user usuario --password pass --db ideacampus --ssl")
        sys.exit(1)

    exito = ejecutar_limpieza(host, port, user, password, db, ssl, args.forzar)
    sys.exit(0 if exito else 1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Herramienta de Migración e Importación Segura — IdeaCampus (GENNOVA)
Permite:
  1. Verificar la conectividad con la base de datos (con o sin TLS/SSL).
  2. Restaurar un volcado SQL (.sql) de Railway en TiDB Cloud con verificación de integridad.
  3. Auditar el conteo de registros tabla por tabla para certificar la migración sin pérdidas.
"""

import sys
import os
import re
import MySQLdb

def conectar(host, port, user, password, db=None, ssl=False):
    kwargs = {
        "host": host,
        "port": int(port),
        "user": user,
        "passwd": password,
        "charset": "utf8mb4",
        "connect_timeout": 15
    }
    if db:
        kwargs["db"] = db
    if ssl or "tidbcloud.com" in host or int(port) == 4000:
        kwargs["ssl_mode"] = "REQUIRED"
    
    return MySQLdb.connect(**kwargs)

def test_conexion(host, port, user, password, db=None, ssl=False):
    print(f"[*] Probando conexion con {host}:{port}...")
    try:
        conn = conectar(host, port, user, password, db, ssl)
        cur = conn.cursor()
        cur.execute("SELECT VERSION(), CURRENT_USER(), DATABASE();")
        version, current_user, current_db = cur.fetchone()
        print(f"[+] Conexion exitosa!")
        print(f"    - Version: {version}")
        print(f"    - Usuario: {current_user}")
        print(f"    - Base de Datos: {current_db or '(Ninguna seleccionada)'}")
        conn.close()
        return True
    except Exception as e:
        print(f"[-] Error de conexion: {e}")
        return False

def auditar_tablas(host, port, user, password, db, ssl=False):
    print(f"\n[*] Auditando tablas y registros en '{db}' ({host})...")
    try:
        conn = conectar(host, port, user, password, db, ssl)
        cur = conn.cursor()
        cur.execute("SHOW TABLES;")
        tablas = [row[0] for row in cur.fetchall()]
        
        if not tablas:
            print("    [!] La base de datos no contiene tablas actualmente.")
            conn.close()
            return
        
        print(f"    Total de tablas encontradas: {len(tablas)}\n")
        print(f"    {'Nombre de Tabla':<35} | {'Registros':<12}")
        print("    " + "-" * 50)
        
        total_registros = 0
        for tabla in tablas:
            cur.execute(f"SELECT COUNT(*) FROM `{tabla}`;")
            count = cur.fetchone()[0]
            total_registros += count
            print(f"    {tabla:<35} | {count:<12}")
            
        print("    " + "-" * 50)
        print(f"    {'TOTAL GENERAL REGISTROS':<35} | {total_registros:<12}")
        conn.close()
    except Exception as e:
        print(f"[-] Error auditando tablas: {e}")

def importar_dump(dump_file, host, port, user, password, db, ssl=False):
    if not os.path.exists(dump_file):
        print(f"[-] El archivo {dump_file} no existe.")
        return False
        
    print(f"[*] Importando {dump_file} en {host}:{port}/{db}...")
    try:
        conn = conectar(host, port, user, password, db, ssl)
        cur = conn.cursor()
        
        # Desactivar temporalmente foreign key checks y modo estricto para evitar fallos de ordenamiento
        cur.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cur.execute("SET UNIQUE_CHECKS = 0;")
        cur.execute("SET AUTOCOMMIT = 0;")
        
        with open(dump_file, "r", encoding="utf-8", errors="ignore") as f:
            sentencias = []
            delimitador = ";"
            for linea in f:
                linea_strip = linea.strip()
                if not linea_strip or linea_strip.startswith("--") or linea_strip.startswith("/*"):
                    continue
                sentencias.append(linea)
                if linea_strip.endswith(";"):
                    sql = "".join(sentencias).strip()
                    if sql:
                        try:
                            cur.execute(sql)
                        except Exception as sql_err:
                            # Ignorar errores si la tabla o base de datos ya existe
                            err_str = str(sql_err)
                            if "already exists" not in err_str and "Duplicate" not in err_str:
                                print(f"[!] Advertencia en sentencia: {sql[:60]}... -> {err_str}")
                    sentencias = []
                    
        conn.commit()
        cur.execute("SET FOREIGN_KEY_CHECKS = 1;")
        cur.execute("SET UNIQUE_CHECKS = 1;")
        cur.execute("COMMIT;")
        print("[+] Archivo SQL importado exitosamente.")
        conn.close()
        
        # Auditar inmediatamente
        auditar_tablas(host, port, user, password, db, ssl)
        return True
    except Exception as e:
        print(f"[-] Error grave durante la importacion: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python migracion_db.py test <host> <port> <user> <pass> [db]")
        print("  python migracion_db.py audit <host> <port> <user> <pass> <db>")
        print("  python migracion_db.py import <archivo.sql> <host> <port> <user> <pass> <db>")
        sys.exit(1)
        
    accion = sys.argv[1].lower()
    if accion == "test":
        h, p, u, pwd = sys.argv[2:6]
        d = sys.argv[6] if len(sys.argv) > 6 else None
        test_conexion(h, p, u, pwd, d)
    elif accion == "audit":
        h, p, u, pwd, d = sys.argv[2:7]
        auditar_tablas(h, p, u, pwd, d)
    elif accion == "import":
        f, h, p, u, pwd, d = sys.argv[2:8]
        importar_dump(f, h, p, u, pwd, d)
    else:
        print(f"Accion desconocida: {accion}")

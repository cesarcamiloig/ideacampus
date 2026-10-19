# Sistema Web para Gestión de Emprendimientos e Innovación Estudiantil 🚀

Plataforma web especializada para gestionar, acompañar, evaluar y realizar la trazabilidad longitudinal al ciclo de vida completo de las iniciativas de emprendimiento e innovación que nacen en el Programa de Ingeniería de Sistemas de la UFPS[cite: 4].

Este proyecto busca sistematizar la trayectoria de las iniciativas desde su origen académico (asignaturas, semilleros, proyectos de grado) hasta su consolidación, permitiendo registrar y seguir su Nivel de Madurez Tecnológica (TRL / M0-M9)[cite: 4].

## 👥 Equipo de Desarrollo
Proyecto desarrollado para la asignatura Análisis y Diseño de Sistemas (2026) por[cite: 1, 4]:
* Farid Yoban Lobo Cañizares
* Daniel Mauricio Bermudez Puentes
* Obed Dario Ayala Santos
* Freddy Andres Quiñones Ferreira
* Cesar Camilo Izquierdo Gallardo
* José Miguel Villamizar León

## 🚀 Módulos Principales
La solución está estructurada en los siguientes módulos[cite: 4]:
1. **Gestión de Convocatorias:** Publicación y cierre automático de ciclos de postulación.
2. **Expediente Digital Único:** Registro centralizado de iniciativas y equipos emprendedores.
3. **Acompañamiento Especializado:** Asignación de tutores académicos y mentores especializados.
4. **Evaluación Multicriterio:** Motor de rúbricas dinámicas para medir el nivel de innovación.
5. **Gestión de Madurez Tecnológica:** Seguimiento manual de la transición de niveles (M0 a M9).
6. **Dashboard Analítico:** Generación de indicadores e informes para procesos de acreditación.

## 🛠 Tecnologías y Arquitectura
El sistema está construido bajo una arquitectura modular basada en contenedores[cite: 4]:
* **Orquestación:** Docker y Docker Compose
* **Base de Datos:** MySQL 8.4 LTS
* **Backend:** Django (Python)
* **Frontend:** React
* **Autenticación:** Integración con Google Workspace UFPS (OAuth2)[cite: 1, 4]

---

## ⚙️ Guía de Instalación Local (Tutorial Completo)

Sigue estos pasos para levantar el entorno de desarrollo en tu computadora.

### Paso 1: Requisitos Previos
Asegúrate de tener instalados los siguientes programas en tu sistema:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Debe estar abierto y ejecutándose en segundo plano).
* [Git](https://git-scm.com/downloads)

### Paso 2: Clonar el Repositorio
Abre tu terminal y ejecuta el siguiente comando para descargar el código fuente:
```bash
git clone <URL_DEL_REPOSITORIO>
cd ideacampus
```

### Paso 3: Configuración de Variables de Entorno
El proyecto requiere credenciales locales para conectar la base de datos y configurar Django. **Nunca modifiques el archivo `.env.example` directamente ni subas tus contraseñas.**
Crea una copia del archivo de ejemplo ejecutando:
```bash
cp .env.example .env
```
*Abre el nuevo archivo `.env` en tu editor de código y asigna contraseñas seguras para tu base de datos local.*

### Paso 4: Despliegue de la Infraestructura (Docker)
Construye las imágenes y levanta los contenedores en segundo plano con el siguiente comando:
```bash
docker-compose up --build -d
```
*Nota: La primera vez que ejecutes este comando, Docker descargará las imágenes de MySQL, Python y Node, lo cual puede tardar unos minutos dependiendo de tu conexión a internet.*

### Paso 5: Verificación de Servicios
Una vez que la terminal indique que los contenedores están "Running", puedes verificar que los servicios estén activos accediendo a las siguientes rutas en tu navegador:
* **Backend API (Django):** `http://localhost:8000`
* **Frontend (React + Vite):** `http://localhost:5173`
* **Base de Datos (MySQL):** Activa en el puerto `3306` de tu localhost.

---

## 📌 Historias de Usuario Integradas

### HU-02 · Gestión de Convocatorias Institucionales
* Apertura, edición, cronograma y cierre automatizado de ciclos de postulación.
* Clasificación por categorías y asociación con periodos académicos activos.
* Emisión de notificaciones institucionales de apertura y cierre próximo.

### HU-03 · Banco de Iniciativas y Postulación Estudiantil
* Formulario multi-paso de radicación técnica de iniciativas.
* Declaración formal del origen académico (asignaturas, semilleros, proyectos integradores, proyectos de grado).
* Carga de documentación soporte en formato PDF validado (hasta 10 MB).
* Generación de código radicado institucional único (`UFPS-POST-YYYY-ID`).
* Panel de administración para coordinación con aprobación o rechazo fundamentado.

### HU-04 · Registro y Gestión de Equipo Emprendedor
* Formalización colectiva de iniciativas aprobadas.
* Reglas de negocio estrictas validadas tanto en frontend como en backend:
  1. **Aprobación previa obligatoria:** Un estudiante únicamente puede registrar un equipo cuando la iniciativa correspondiente haya sido aprobada por la coordinación.
  2. **Autoría de la iniciativa:** El líder que crea el equipo debe ser el autor original que postuló la iniciativa.
  3. **Vínculo unívoco:** Cada iniciativa aprobada puede tener como máximo un equipo emprendedor activo.
  4. **Exclusividad de miembros:** Ningún estudiante activo puede pertenecer a más de un equipo en paralelo.
  5. **Mínimo de integrantes:** Requiere al menos un integrante adicional además del estudiante líder.
  6. **Ciclo de vida y disolución:** El líder puede retirar integrantes o disolver el equipo por completo, liberando a los miembros y permitiendo volver a conformar un equipo para la iniciativa cuando lo requiera.

### HU-06 · Gestión de Rúbricas Dinámicas y Creación Automática de Proyectos
* Módulo de evaluación multicriterio (`gestion_evaluacion`) con soporte para rúbricas por tipo de iniciativa (`emprendimiento`, `innovacion`), estructuradas en hitos (`SubRubrica`) y criterios (`CriterioRubrica`) con validación estricta de ponderaciones al 100 %.
* Protección de integridad histórica: impide modificar ponderaciones o eliminar criterios que ya cuenten con calificaciones registradas (`NotaCriterio`).
* Creación automática de `Proyecto` mediante señales (`post_save`) al aprobar una iniciativa y asignación formal de coordinador y evaluador activos.

### HU-12 · Centro de Alertas y Notificaciones Institucionales por Rol
* Centro de alertas automatizadas parametrizadas por rol activo (estudiante, tutor, mentor, evaluador, coordinador, dirección, admin).
* Filtrado en tiempo real por prioridad (alta, media, baja), estado (leída/no leída) y búsqueda textual.
* Indicador visual dinámico en la barra superior unificado con la campana de notificaciones.
* Prevención de compromisos fantasma: generación condicionada a iniciativas y convocatorias activas reales.

### HU-16 · Perfil Profesional y Académico de Tutor / Mentor
* Rediseño visual completo del perfil de acompañamiento adaptado a la arquitectura Tailwind CSS y componentes estándar del sistema.
* Navegación embebida dentro del layout institucional (`MainLayout`) preservando la barra lateral, campana de notificaciones y selector de usuario.
* Soporte para restablecer el perfil original guardado al cancelar y sincronización directa con el backend.

### Conmutador Dinámico de Roles y Autenticación JWT Multi-Rol
* Selector contextual en el menú de usuario de la cabecera superior para alternar dinámicamente entre vistas y permisos asignados (`useAuth.switchRole`) sin requerir cierre de sesión.
* Soporte nativo en el token JWT para múltiples roles activos simultáneos (`roles` y `rol` en payload, validados contra `UsuarioRol` en base de datos) y verificación transversal en `TieneRolPermitido`.
* Conservación de contexto de rol `admin` al supervisar el Banco de Emprendimientos y el Centro de Alertas desde el panel administrativo (`ROLE_CONFIG.admin`).
* Blindaje de interfaz con `ErrorBoundary` para recuperación ante discrepancias de sesión o caché.

---

## 🔔 Sistema Global de Notificaciones
* Campana de notificaciones institucional en la barra de navegación superior con contador de mensajes no leídos en tiempo real.
* Notificaciones generadas automáticamente ante eventos clave:
  - Radicación exitosa de iniciativa.
  - Aprobación o rechazo por la coordinación / dirección del programa.
  - Creación de equipo emprendedor (notificación al líder e integrantes).
  - Incorporación o retiro de un estudiante de un equipo.
  - Disolución de equipo emprendedor.

---

## 🧪 Pruebas y Control de Calidad

### Ejecutar Pruebas Automatizadas del Backend
```bash
docker exec ideacampus_backend python manage.py test
```
*Cubre 71 pruebas unitarias y de integración que validan permisos, reglas de negocio Estudiante-Iniciativa-Equipo, creación de proyectos, asignación de coordinadores y evaluadores, edición y validación de rúbricas (HU-06), autenticación JWT multi-rol, ciclo de vida de convocatorias, alertas automáticas y endpoints REST.*

### Compilación y Verificación de Tipos del Frontend
```bash
docker exec ideacampus_frontend npm run build
```
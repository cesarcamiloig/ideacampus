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
* **Frontend (React):** `http://localhost:5173`
* **Base de Datos (MySQL):** Activa en el puerto `3306` de tu localhost.
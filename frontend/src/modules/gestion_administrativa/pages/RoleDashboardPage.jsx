import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  User,
  GraduationCap,
  Layers,
  Award,
  BookOpen,
} from "lucide-react";
import MainLayout from "../components/layout/MainLayout";
import { useAuth } from "../../../context/AuthContext";
import TutorProfileForm from "../../gestion_acompaniamiento/pages/TutorProfileForm";
import EstudianteIniciativasPage from "../../gestion_convocatorias/pages/EstudianteIniciativasPage";

const ROLE_CONFIG = {
  estudiante: {
    roleName: "Estudiante Emprendedor",
    defaultModule: "postulaciones",
    icon: GraduationCap,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    subtitle:
      "Plataforma de postulación, seguimiento y madurez tecnológica de tus iniciativas de innovación.",
    description:
      "Bienvenido a tu espacio de trabajo en GENNOVA. Desde aquí puedes postularte a las convocatorias abiertas de la UFPS, declarar el origen académico de tu proyecto y dar seguimiento a su trazabilidad.",
    modules: {
      postulaciones: {
        title: "Convocatorias Abiertas",
        tag: "HU-03",
        desc: "Consulta los ciclos de postulación activos publicados por la coordinación y radica tu iniciativa adjuntando documentación y declarando su origen académico.",
        details:
          "Revisa requisitos mínimos, fechas límite de entrega, rúbricas de evaluación aplicables y postula tu propuesta.",
        actionLabel: "Ver convocatorias vigentes",
      },
      "mi-iniciativa": {
        title: "Mis Iniciativas y Expedientes",
        tag: "HU-03 / HU-04",
        desc: "Consulta el historial de iniciativas radicadas, número de radicado, documentos y el nivel de madurez tecnológica (TRL).",
        details:
          "Trazabilidad longitudinal del origen académico (asignaturas, semilleros, proyectos de grado), integrantes y estado de la solución.",
        actionLabel: "Ver mis radicados",
      },
    },
    stats: [
      { label: "Nivel de Madurez", value: "M0 - M3", subtext: "Ideación a Prototipo" },
      { label: "Convocatorias", value: "Abiertas", subtext: "Periodo 2026-1" },
      { label: "Cuenta UFPS", value: "Validada", subtext: "Acceso institucional activo" },
    ],
  },
  coordinador: {
    roleName: "Coordinador de Emprendimiento",
    defaultModule: "convocatorias",
    icon: Layers,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    subtitle:
      "Administración integral de convocatorias, banco de iniciativas y métricas de impacto.",
    description:
      "Supervisa el ciclo de vida de las convocatorias, coordina la asignación de evaluadores y acompaña el banco de proyectos del Programa de Ingeniería de Sistemas.",
    modules: {
      convocatorias: {
        title: "Gestión de Convocatorias",
        tag: "HU-02",
        desc: "Apertura, cronograma, cierre y publicación de resultados de los ciclos de postulación.",
        details:
          "Configuración de fechas de apertura, límite de postulación y cierre automático con notificación.",
        actionLabel: "Gestionar convocatorias",
      },
      emprendimientos: {
        title: "Banco de Emprendimientos",
        tag: "HU-04 / HU-05",
        desc: "Inventario centralizado de iniciativas estudiantiles registradas, clasificadas por TRL y área.",
        details:
          "Acceso a los expedientes digitales únicos de todos los equipos del programa.",
        actionLabel: "Explorar iniciativas",
      },
      reportes: {
        title: "Métricas e Impacto",
        tag: "HU-14",
        desc: "Generación de indicadores longitudinales y reportes estadísticos para procesos de acreditación.",
        details:
          "Consolidados de participación, tasa de avance tecnológico e impacto por cohorte.",
        actionLabel: "Ver estadísticas",
      },
    },
    stats: [
      { label: "Ciclo Académico", value: "Vigente", subtext: "Configurado en Parámetros" },
      { label: "Convocatorias", value: "En línea", subtext: "Monitoreo continuo" },
      { label: "Banco de Proyectos", value: "Habilitado", subtext: "Ingeniería de Sistemas" },
    ],
  },
  tutor: {
    roleName: "Tutor Académico",
    defaultModule: "tutorias",
    icon: BookOpen,
    badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
    subtitle:
      "Acompañamiento docente, orientación técnica y registro de sesiones de tutoría.",
    description:
      "Orienta pedagógica y metodológicamente a los equipos emprendedores asignados en el desarrollo de sus soluciones de software e innovación.",
    modules: {
      tutorias: {
        title: "Mis Iniciativas Asignadas",
        tag: "HU-16",
        desc: "Equipos y proyectos que tienes bajo tu orientación durante el semestre académico actual.",
        details:
          "Seguimiento al cumplimiento de hitos, compromisos técnicos y validación de avance.",
        actionLabel: "Ver iniciativas asignadas",
      },
      acompanamiento: {
        title: "Registro de Tutorías",
        tag: "HU-17",
        desc: "Bitácora digital de reuniones, acuerdos, horas de acompañamiento y observaciones.",
        details:
          "Generación de actas y trazabilidad del acompañamiento docente brindado a cada equipo.",
        actionLabel: "Registrar nueva sesión",
      },
      perfil: {
        title: "Mi Perfil Académico",
        tag: "HU-16",
        desc: "Información de especialidad, áreas de conocimiento y nivel académico para asignación de iniciativas.",
        details:
          "Formulario completo para actualizar tus áreas de experiencia y enlaces profesionales.",
        actionLabel: "Abrir formulario de perfil",
      },
    },
    stats: [
      { label: "Rol Institucional", value: "Tutor Académico", subtext: "Docente UFPS" },
      { label: "Perfil Registrado", value: "HU-16", subtext: "Formulario disponible" },
      { label: "Acompañamiento", value: "Activo", subtext: "Periodo vigente" },
    ],
  },
  mentor: {
    roleName: "Mentor Especializado",
    defaultModule: "mentorias",
    icon: Award,
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    subtitle:
      "Mentoría experta en validación de mercado, modelo de negocio y vinculación externa.",
    description:
      "Asesora a las iniciativas en etapas intermedias y avanzadas para fortalecer su factibilidad comercial y vinculación con el sector productivo.",
    modules: {
      mentorias: {
        title: "Mentorías Asignadas",
        tag: "HU-16",
        desc: "Iniciativas en fase de validación que requieren mentoría especializada en tu campo.",
        details:
          "Revisión de prototipos, propuesta de valor y retroalimentación técnica o de negocio.",
        actionLabel: "Ver mentorías",
      },
      acompanamiento: {
        title: "Sesiones de Asesoría",
        tag: "HU-17",
        desc: "Agendamiento de sesiones especializadas y seguimiento a compromisos con los emprendedores.",
        details:
          "Registro del tiempo dedicado y recomendaciones para la maduración del producto.",
        actionLabel: "Gestionar sesiones",
      },
      perfil: {
        title: "Mi Perfil Profesional",
        tag: "HU-16",
        desc: "Área de especialización, disponibilidad horaria y enlaces de contacto profesional.",
        details:
          "Actualiza tu disponibilidad para la asignación de nuevas iniciativas.",
        actionLabel: "Abrir formulario de perfil",
      },
    },
    stats: [
      { label: "Red de Expertos", value: "Mentor Activo", subtext: "GENNOVA UFPS" },
      { label: "Disponibilidad", value: "Configurable", subtext: "Según agenda" },
      { label: "Acompañamiento", value: "Especializado", subtext: "Validación de mercado" },
    ],
  },
  evaluador: {
    roleName: "Evaluador de Iniciativas",
    defaultModule: "evaluaciones",
    icon: CheckCircle2,
    badgeColor: "bg-teal-100 text-teal-800 border-teal-200",
    subtitle:
      "Evaluación multicriterio, rúbricas dinámicas y calificación de proyectos de innovación.",
    description:
      "Aplica las rúbricas institucionales dinámicas para valorar el grado de innovación, rigor técnico y viabilidad de las postulaciones.",
    modules: {
      evaluaciones: {
        title: "Iniciativas por Evaluar",
        tag: "HU-06",
        desc: "Listado de iniciativas asignadas pendientes de calificación en la convocatoria activa.",
        details:
          "Acceso a la documentación, resumen ejecutivo y rúbrica de ponderación por criterios.",
        actionLabel: "Iniciar evaluación",
      },
      rubricas: {
        title: "Historial de Calificaciones",
        tag: "HU-07",
        desc: "Consulta de evaluaciones emitidas, observaciones cuantitativas y cualitativas.",
        details:
          "Trazabilidad de dictámenes remitidos a la coordinación de convocatorias.",
        actionLabel: "Ver historial",
      },
    },
    stats: [
      { label: "Comité Evaluador", value: "Habilitado", subtext: "Convocatorias activas" },
      { label: "Rúbrica", value: "Multicriterio", subtext: "Calificación objetiva" },
      { label: "Dictamen", value: "Digital", subtext: "Enviado a coordinación" },
    ],
  },
  direccion_del_programa: {
    roleName: "Dirección de Programa",
    defaultModule: "dashboard",
    icon: Sparkles,
    badgeColor: "bg-rose-100 text-rose-800 border-rose-200",
    subtitle:
      "Supervisión estratégica de resultados, trazabilidad longitudinal e indicadores de alta calidad.",
    description:
      "Tablero de control institucional para conocer el impacto de las iniciativas del Programa de Ingeniería de Sistemas para procesos de acreditación.",
    modules: {
      dashboard: {
        title: "Panel Estratégico",
        tag: "HU-14",
        desc: "Consolidado gerencial de iniciativas activas, tasa de éxito y evolución del ecosistema.",
        details:
          "Monitoreo de la transición de niveles de madurez tecnológica (M0 a M9).",
        actionLabel: "Ver resumen directivo",
      },
      iniciativas: {
        title: "Banco de Iniciativas del Programa",
        tag: "HU-04",
        desc: "Trazabilidad completa de proyectos nacidos en asignaturas, semilleros y trabajos de grado.",
        details:
          "Historial acumulado de emprendimientos estudiantiles.",
        actionLabel: "Consultar inventario",
      },
      indicadores: {
        title: "Métricas para Acreditación",
        tag: "Acreditación",
        desc: "Evidencias e indicadores estructurados para informes del Consejo Nacional de Acreditación (CNA).",
        details:
          "Reportes de producción, innovación y participación de la comunidad académica.",
        actionLabel: "Exportar indicadores",
      },
    },
    stats: [
      { label: "Programa", value: "Ing. de Sistemas", subtext: "UFPS Cúcuta" },
      { label: "Acreditación", value: "Alta Calidad", subtext: "Métricas longitudinales" },
      { label: "Plataforma", value: "GENNOVA", subtext: "Ecosistema Institucional" },
    ],
  },
};

export default function RoleDashboardPage({ role }) {
  const { usuario } = useAuth();
  const normalizedRole = (role || usuario?.rol || "estudiante").trim().toLowerCase();
  const roleConfig =
    ROLE_CONFIG[normalizedRole] ||
    ROLE_CONFIG.estudiante;

  const [activeModule, setActiveModule] = useState(roleConfig.defaultModule);
  const [showProfileForm, setShowProfileForm] = useState(false);

  // Si es tutor o mentor y seleccionó el módulo 'perfil' o activó el flag
  if (
    (normalizedRole === "tutor" || normalizedRole === "mentor") &&
    (activeModule === "perfil" || showProfileForm)
  ) {
    return (
      <div className="relative">
        <div className="mb-4 flex items-center justify-between bg-white px-8 py-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setShowProfileForm(false);
              setActiveModule(roleConfig.defaultModule);
            }}
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5"
          >
            ← Volver al Panel Principal ({roleConfig.roleName})
          </button>
          <span className="text-xs text-slate-500 font-medium">
            Formulario de Perfil Académico · HU-16
          </span>
        </div>
        <TutorProfileForm />
      </div>
    );
  }

  const currentModuleData =
    roleConfig.modules[activeModule] ||
    Object.values(roleConfig.modules)[0];

  const RoleIcon = roleConfig.icon;

  return (
    <MainLayout
      activeModule={activeModule}
      onModuleChange={(modId) => {
        if (modId === "perfil") {
          setShowProfileForm(true);
        } else {
          setShowProfileForm(false);
        }
        setActiveModule(modId);
      }}
      activeRole={normalizedRole}
    >
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* BANNER DE BIENVENIDA INSTITUCIONAL */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-600" />
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleConfig.badgeColor}`}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleConfig.roleName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Sesión activa
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                ¡Bienvenido(a), {usuario?.nombre || "Usuario Institucional"}!
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                {roleConfig.subtitle}
              </p>
            </div>

            <div className="hidden lg:flex flex-col items-end text-right border-l border-slate-100 pl-6 text-xs text-slate-500 space-y-1">
              <span className="font-semibold text-slate-800">
                Universidad Francisco de Paula Santander
              </span>
              <span>Programa de Ingeniería de Sistemas</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {usuario?.correo || "@ufps.edu.co"}
              </span>
            </div>
          </div>

          {/* TARJETAS DE ESTADÍSTICAS / ESTADO */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-5">
            {roleConfig.stats.map((st, i) => (
              <div
                key={i}
                className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {st.label}
                </div>
                <div className="mt-1 text-lg font-bold text-slate-900">{st.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{st.subtext}</div>
              </div>
            ))}
          </div>
        </section>


        {/* CONTENIDO ESPECÍFICO SEGÚN ROL */}
        {normalizedRole === "estudiante" ? (
          <EstudianteIniciativasPage
            key={activeModule}
            initialTab={
              activeModule === "postulaciones" ? "convocatorias" : "mis_postulaciones"
            }
          />
        ) : (
          /* DETALLE DEL MÓDULO SELECCIONADO (PARA OTROS ROLES) */
          <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                    Módulo Seleccionado
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {currentModuleData.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {currentModuleData.title}
                </h3>
              </div>

              {(normalizedRole === "tutor" || normalizedRole === "mentor") && (
                <button
                  type="button"
                  onClick={() => setShowProfileForm(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Actualizar Mi Perfil (HU-16)
                </button>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {currentModuleData.details}
              </p>

              <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-4 text-xs text-amber-900 flex items-start gap-3">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Módulo en etapa de integración continua</p>
                  <p className="mt-0.5 text-amber-800">
                    La estructura institucional, la navegación y la sesión para el rol de{" "}
                    <strong>{roleConfig.roleName}</strong> se encuentran 100% operativas.
                    Los componentes específicos de este módulo se cargarán automáticamente
                    conforme avancen las historias de usuario del equipo.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Validado con Google Workspace UFPS
                </span>
                <span>•</span>
                <span>Base de Datos MySQL Railway conectada</span>
              </div>
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}

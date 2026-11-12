import React, { useState, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import { obtenerMiEquipo, obtenerMisIniciativasAprobadas } from "../../gestion_emprendimiento_2/services/equipoService";
import MainLayout from "../components/layout/MainLayout";
import BienvenidaBanner from "../components/BienvenidaBanner";
import { useAuth } from "../../../context/AuthContext";
import TutorProfileForm from "../../gestion_acompaniamiento/pages/TutorProfileForm";
import EstudianteIniciativasPage from "../../gestion_convocatorias/pages/EstudianteIniciativasPage";
import EquipoPage from "../../gestion_emprendimiento_2/pages/EquipoPage";
import EvidenciaForm from "../../gestion_emprendimiento_2/pages/EvidenciaForm";
import AvanceProyectoPage from "../../gestion_emprendimiento_2/pages/AvanceProyectoPage";
import ProyectosTutorPage from "../../gestion_emprendimiento_2/pages/ProyectosTutorPage";
import PlanTrabajoPage from "../../gestion_emprendimiento_2/pages/PlanTrabajoPage";
import BancoIniciativasView from "../../gestion_convocatorias/components/BancoIniciativasView";
import AlertasPage from "../../gestion_convocatorias/pages/AlertasPage";
import RubricasTab from "../../gestion_evaluacion/components/RubricasTab";

export const ROLE_CONFIG = {
  estudiante: {
    roleName: "Estudiante Emprendedor",
    defaultModule: "equipo",
    icon: GraduationCap,
    badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
    subtitle:
      "Plataforma de postulación, seguimiento y madurez tecnológica de tus iniciativas de innovación.",
    description:
      "Bienvenido a tu espacio de trabajo en GENNOVA. Desde aquí puedes postularte a las convocatorias abiertas de la UFPS, declarar el origen académico de tu proyecto y dar seguimiento a su trazabilidad.",
    modules: {
      equipo: {
        title: "Equipo Emprendedor",
        desc: "Registra y gestiona tu equipo de trabajo, asigna al líder e incorpora a estudiantes activos para postular iniciativas.",
        details:
          "Formaliza la participación colectiva de tu iniciativa con integrantes registrados en la plataforma.",
        actionLabel: "Gestionar equipo",
      },
      postulaciones: {
        title: "Convocatorias Abiertas",
        tag: "Convocatorias",
        desc: "Consulta los ciclos de postulación activos publicados por la coordinación y radica tu iniciativa adjuntando documentación y declarando su origen académico.",
        details:
          "Revisa requisitos mínimos, fechas límite de entrega, rúbricas de evaluación aplicables y postula tu propuesta.",
        actionLabel: "Ver convocatorias vigentes",
      },
      "mi-iniciativa": {
        title: "Mis Iniciativas y Expedientes",
        tag: "Iniciativas",
        desc: "Consulta el historial de iniciativas radicadas, número de radicado, documentos y el nivel de madurez tecnológica (TRL).",
        details:
          "Trazabilidad longitudinal del origen académico (asignaturas, semilleros, proyectos de grado), integrantes y estado de la solución.",
        actionLabel: "Ver mis radicados",
      },
      "plan-trabajo": {
        title: "Plan de Trabajo",
        desc: "Define por hito las actividades, responsables, fechas y entregables de tu proyecto.",
        details:
          "Organización y seguimiento de la ejecución del proyecto por parte del equipo emprendedor.",
        actionLabel: "Ver plan de trabajo",
      },
      evidencias: {
        title: "Evidencias de Avance",
        desc: "Adjunta documentos, enlaces, prototipos y presentaciones que respalden el avance de tu iniciativa.",
        details:
          "Registro de evidencias al finalizar cada etapa para la trazabilidad de la madurez tecnológica.",
        actionLabel: "Registrar evidencia",
      },
      avance: {
        title: "Avance por Etapas",
        desc: "Registra el avance de cada etapa con la evidencia publicada, sus dificultades y riesgos.",
        details:
          "Control formal de la trayectoria del proyecto, revisado por el tutor asignado.",
        actionLabel: "Registrar avance",
      },
    },
  },
  coordinador: {
    roleName: "Coordinador de Emprendimiento",
    defaultModule: "iniciativas",
    icon: Layers,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    subtitle:
      "Seguimiento de los proyectos de emprendimiento y métricas de impacto.",
    description:
      "Acompaña los proyectos aprobados y coordina la asignación de mentores del Programa de Ingeniería de Sistemas.",
    modules: {
      iniciativas: {
        title: "Proyectos",
        desc: "Iniciativas recibidas en las convocatorias y mentores de los proyectos aprobados.",
        details: "Revisión de expedientes y asignación de mentores a los proyectos.",
        actionLabel: "Ver iniciativas",
      },
      reportes: {
        title: "Métricas e Impacto",
        desc: "Generación de indicadores longitudinales y reportes estadísticos para procesos de acreditación.",
        details:
          "Consolidados de participación, tasa de avance tecnológico e impacto por cohorte.",
        actionLabel: "Ver estadísticas",
      },
    },
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
        desc: "Equipos y proyectos que tienes bajo tu orientación durante el semestre académico actual.",
        details:
          "Seguimiento al cumplimiento de hitos, compromisos técnicos y validación de avance.",
        actionLabel: "Ver iniciativas asignadas",
      },
      avance: {
        title: "Avance de Proyectos",
        desc: "Revisa el avance que registra cada equipo: deja recomendaciones y señala los errores a corregir.",
        details:
          "Control formal de la trayectoria de cada proyecto a través de sus etapas.",
        actionLabel: "Revisar avance",
      },
      acompanamiento: {
        title: "Registro de Tutorías",
        desc: "Bitácora digital de reuniones, acuerdos, horas de acompañamiento y observaciones.",
        details:
          "Generación de actas y trazabilidad del acompañamiento docente brindado a cada equipo.",
        actionLabel: "Registrar nueva sesión",
      },
      perfil: {
        title: "Mi Perfil Académico",
        desc: "Información de especialidad, áreas de conocimiento y nivel académico para asignación de iniciativas.",
        details:
          "Formulario completo para actualizar tus áreas de experiencia y enlaces profesionales.",
        actionLabel: "Abrir formulario de perfil",
      },
    },
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
        desc: "Iniciativas en fase de validación que requieren mentoría especializada en tu campo.",
        details:
          "Revisión de prototipos, propuesta de valor y retroalimentación técnica o de negocio.",
        actionLabel: "Ver mentorías",
      },
      acompanamiento: {
        title: "Sesiones de Asesoría",
        desc: "Agendamiento de sesiones especializadas y seguimiento a compromisos con los emprendedores.",
        details:
          "Registro del tiempo dedicado y recomendaciones para la maduración del producto.",
        actionLabel: "Gestionar sesiones",
      },
      perfil: {
        title: "Mi Perfil Profesional",
        desc: "Área de especialización, disponibilidad horaria y enlaces de contacto profesional.",
        details:
          "Actualiza tu disponibilidad para la asignación de nuevas iniciativas.",
        actionLabel: "Abrir formulario de perfil",
      },
    },
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
        desc: "Listado de iniciativas asignadas pendientes de calificación en la convocatoria activa.",
        details:
          "Acceso a la documentación, resumen ejecutivo y rúbrica de ponderación por criterios.",
        actionLabel: "Iniciar evaluación",
      },
      rubricas: {
        title: "Historial de Calificaciones",
        desc: "Consulta de evaluaciones emitidas, observaciones cuantitativas y cualitativas.",
        details:
          "Trazabilidad de dictámenes remitidos a la coordinación de convocatorias.",
        actionLabel: "Ver historial",
      },
    },
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
        desc: "Consolidado gerencial de iniciativas activas, tasa de éxito y evolución del ecosistema.",
        details:
          "Monitoreo de la transición de niveles de madurez tecnológica (M0 a M9).",
        actionLabel: "Ver resumen directivo",
      },
      iniciativas: {
        title: "Banco de Iniciativas del Programa",
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
      rubricas: {
        title: "Rúbricas de Evaluación",
        desc: "Configuración de los módulos y porcentajes con los que se evalúan las iniciativas de emprendimiento e innovación.",
        details:
          "Una rúbrica por tipo de iniciativa, calificable de 1 a 5 por módulo.",
        actionLabel: "Configurar rúbricas",
      },
    },
  },
  admin: {
    roleName: "Administrador del Sistema",
    defaultModule: "parametros",
    icon: ShieldCheck,
    badgeColor: "bg-red-100 text-red-800 border-red-200",
    subtitle:
      "Supervisión integral de parámetros institucionales, convocatorias, iniciativas y usuarios.",
    description:
      "Control maestro y auditoría de la plataforma institucional GENNOVA UFPS.",
    modules: {
      parametros: {
        title: "Administración Paramétrica",
        desc: "Gestión de variables, periodos académicos y asignación de roles.",
        details: "Control maestro del sistema.",
        actionLabel: "Gestionar parámetros",
      },
      convocatorias: {
        title: "Convocatorias Institucionales",
        desc: "Supervisión y control de las convocatorias.",
        details: "Monitoreo del ciclo de vida.",
        actionLabel: "Ver convocatorias",
      },
      emprendimientos: {
        title: "Banco de Emprendimientos",
        desc: "Supervisión de iniciativas y expedientes de innovación.",
        details: "Inventario centralizado de iniciativas.",
        actionLabel: "Explorar iniciativas",
      },
      alertas: {
        title: "Centro de Alertas",
        desc: "Notificaciones y compromisos del sistema.",
        details: "Monitoreo de compromisos y plazos.",
        actionLabel: "Ver alertas",
      },
    },
  },
};

export default function RoleDashboardPage({ role, onNavigate, defaultModule, mostrarBienvenida = false }) {
  const { usuario } = useAuth();
  const normalizedRole = (role || usuario?.rol || "estudiante").trim().toLowerCase();
  const roleConfig =
    ROLE_CONFIG[normalizedRole] ||
    ROLE_CONFIG.estudiante;

  const [activeModule, setActiveModule] = useState(defaultModule || roleConfig.defaultModule);

  useEffect(() => {
    if (defaultModule) {
      setActiveModule(defaultModule);
    }
  }, [defaultModule]);

  // Sincronizar el módulo activo si cambia el rol
  useEffect(() => {
    setActiveModule(defaultModule || roleConfig.defaultModule);
  }, [normalizedRole, defaultModule, roleConfig.defaultModule]);

  // Acceso al apartado "Proyecto" del estudiante:
  // - Equipo Emprendedor: si ya pertenece a un equipo o tiene una iniciativa aprobada con la cual crearlo.
  // - Plan de Trabajo, Evidencias de Avance y Avance por Etapas: solo si pertenece a un equipo.
  const esEstudiante = normalizedRole === "estudiante";
  const [accesoProyecto, setAccesoProyecto] = useState({ cargando: esEstudiante, tieneEquipo: false, tieneAprobada: false });

  async function cargarAccesoProyecto() {
    try {
      const [dataEquipo, aprobadas] = await Promise.all([
        obtenerMiEquipo().catch(() => null),
        obtenerMisIniciativasAprobadas().catch(() => []),
      ]);
      setAccesoProyecto({
        cargando: false,
        tieneEquipo: Boolean(dataEquipo?.tiene_equipo && dataEquipo?.equipo),
        tieneAprobada: Array.isArray(aprobadas) && aprobadas.length > 0,
      });
    } catch {
      setAccesoProyecto({ cargando: false, tieneEquipo: false, tieneAprobada: false });
    }
  }

  useEffect(() => {
    if (esEstudiante) {
      cargarAccesoProyecto();
    }
  }, [esEstudiante]);

  const modulosOcultos = [];
  if (esEstudiante) {
    if (!accesoProyecto.tieneEquipo) modulosOcultos.push("plan-trabajo", "evidencias", "avance");
    if (!accesoProyecto.tieneEquipo && !accesoProyecto.tieneAprobada) modulosOcultos.push("equipo");
  }
  const moduloBloqueado = modulosOcultos.includes(activeModule);

  // Si llega a un apartado que no puede ver (módulo por defecto, notificación, etc.), se le envía a sus iniciativas
  useEffect(() => {
    if (esEstudiante && !accesoProyecto.cargando && moduloBloqueado) {
      // Redirección automática: no cuenta como navegar, así que no oculta la bienvenida
      cambiarModulo("mi-iniciativa", { automatico: true });
    }
  }, [esEstudiante, accesoProyecto.cargando, moduloBloqueado]);

  const esAcompanante = normalizedRole === "tutor" || normalizedRole === "mentor";
  const mostrarPerfil = esAcompanante && activeModule === "perfil";

  function cambiarModulo(modId, opciones) {
    setActiveModule(modId);
    if (onNavigate) {
      onNavigate(modId, opciones);
    }
  }

  const currentModuleData =
    roleConfig.modules[activeModule] ||
    Object.values(roleConfig.modules)[0];

  return (
    <MainLayout
      activeModule={activeModule}
      onModuleChange={cambiarModulo}
      onNavigate={onNavigate}
      activeRole={normalizedRole}
      modulosOcultos={modulosOcultos}
      onRoleChange={() => {
        if (onNavigate) {
          onNavigate(null);
        }
      }}
    >
      {mostrarPerfil ? (
        <TutorProfileForm onCancel={() => cambiarModulo(roleConfig.defaultModule)} />
      ) : (
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* BANNER DE BIENVENIDA: solo en la primera pantalla tras iniciar sesión */}
          {mostrarBienvenida && <BienvenidaBanner roleConfig={roleConfig} usuario={usuario} />}

          {/* CONTENIDO ESPECÍFICO SEGÚN ROL */}
          {activeModule === "alertas" ? (
            <AlertasPage
              key="alertas-page"
              onNavigate={(mod) => {
                cambiarModulo(mod);
              }}
              activeRole={normalizedRole}
            />
          ) : activeModule === "rubricas" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
              <RubricasTab key="rubricas" />
            </section>
) : normalizedRole === "tutor" && activeModule === "avance" ? (
            <AvanceProyectoPage key="avance" rol="tutor" />
          ) : normalizedRole === "tutor" && activeModule === "tutorias" ? (
            <ProyectosTutorPage key="tutorias" />
          ) : normalizedRole === "estudiante" ? (
            moduloBloqueado || (accesoProyecto.cargando && ["equipo", "plan-trabajo", "evidencias", "avance"].includes(activeModule)) ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              </div>
            ) : activeModule === "equipo" ? (
              <EquipoPage key="equipo" onEstadoEquipoCambiado={cargarAccesoProyecto} />
            ) : activeModule === "plan-trabajo" ? (
              <PlanTrabajoPage key="plan-trabajo" />
            ) : activeModule === "evidencias" ? (
              <EvidenciaForm key="evidencias" />
            ) : activeModule === "avance" ? (
              <AvanceProyectoPage key="avance" rol="estudiante" />
            ) : (
              <EstudianteIniciativasPage
                key={activeModule}
                initialTab={
                  activeModule === "postulaciones" ? "convocatorias" : "mis_postulaciones"
                }
                onNavigate={(mod) => {
                  cambiarModulo(mod);
                }}
              />
            )
          ) : activeModule === "emprendimientos" || activeModule === "iniciativas" ? (
            <BancoIniciativasView
              key="banco-iniciativas"
              titulo={normalizedRole === "coordinador" ? "Proyectos" : undefined}
              encabezado={normalizedRole !== "coordinador"}
            />
          ) : (
            /* DETALLE DEL MÓDULO SELECCIONADO (PARA OTROS ROLES) */
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                      Módulo Seleccionado
                    </span>
                    {currentModuleData.tag && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {currentModuleData.tag}
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {currentModuleData.title}
                  </h3>
                </div>

                {esAcompanante && (
                  <button
                    type="button"
                    onClick={() => cambiarModulo("perfil")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Actualizar Mi Perfil
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
      )}
    </MainLayout>
  );
}

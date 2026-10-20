import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Users,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getTodasLasIniciativas,
  cambiarEstadoIniciativa,
  getCoordinadores,
} from "../services/postulacionService";
import DetalleExpedienteModal from "./DetalleExpedienteModal";
import MentoresPanel from "../../gestion_acompaniamiento/components/MentoresPanel";
import TutorPanel from "../../gestion_acompaniamiento/components/TutorPanel";

const ESTADOS_APROBADOS = ["aprobada", "aprobado", "aceptada", "aceptado"];

function esAprobada(item) {
  return ESTADOS_APROBADOS.includes((item.estado || "").toLowerCase());
}

const ROL_SINGULAR = { mentores: "mentor", tutor: "tutor", evaluador: "evaluador" };

// Botón de un rol del proyecto (mentores, tutor, evaluador). Todos miden lo mismo; si al
// proyecto le falta ese rol, lleva un punto ámbar y lo dice en el título y al lector de pantalla.
function BotonRol({ etiqueta, Icono, falta, onClick, proximamente = false }) {
  const rol = etiqueta.toLowerCase();
  const titulo = [
    falta ? `Falta asignar ${ROL_SINGULAR[rol] || rol}` : null,
    proximamente ? "Disponible próximamente" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={proximamente ? undefined : onClick}
      aria-haspopup={proximamente ? undefined : "dialog"}
      aria-disabled={proximamente ? "true" : undefined}
      title={titulo || `Ver ${rol} del proyecto`}
      className={`relative inline-flex w-28 items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border bg-white text-slate-700 hover:bg-slate-50 transition-colors ${
        falta ? "border-amber-300" : "border-slate-200"
      }`}
    >
      <Icono className="h-3.5 w-3.5 text-slate-500" />
      <span>{etiqueta}</span>
      {falta && (
        <>
          <span
            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
            aria-hidden="true"
          />
          <span className="sr-only"> (falta asignar)</span>
        </>
      )}
    </button>
  );
}

// titulo: el coordinador ve esta vista como "Proyectos"
export default function BancoIniciativasView({ titulo = "Banco de Iniciativas y Emprendimientos" }) {
  const { rolActivo } = useAuth();
  const esCoordinador = (rolActivo || "").trim().toLowerCase() === "coordinador";
  const [iniciativas, setIniciativas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Modal de expediente y modal de confirmación
  const [expedienteSeleccionado, setExpedienteSeleccionado] = useState(null);
  const [accionConfirmacion, setAccionConfirmacion] = useState(null); // { iniciativa, accion: 'aprobada' | 'rechazada' }
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  // HU-10: panel de mentores del proyecto de una iniciativa aprobada
  const [iniciativaMentores, setIniciativaMentores] = useState(null);
  // Panel del tutor académico del proyecto
  const [iniciativaTutor, setIniciativaTutor] = useState(null);

  // Actualiza el resumen de roles de una fila tras asignar o quitar desde un panel
  const actualizarProyecto = (idIniciativa, cambios) =>
    setIniciativas((prev) =>
      prev.map((i) =>
        i.id_iniciativa === idIniciativa && i.proyecto ? { ...i, proyecto: { ...i.proyecto, ...cambios } } : i
      )
    );

  // Coordinadores disponibles para asignar al proyecto al aprobar
  const [coordinadores, setCoordinadores] = useState([]);
  const [cargandoCoordinadores, setCargandoCoordinadores] = useState(false);
  const [coordinadorSeleccionado, setCoordinadorSeleccionado] = useState("");

  // Mensajes de feedback
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const cargarIniciativas = async () => {
    setCargando(true);
    setError("");
    try {
      const data = await getTodasLasIniciativas();
      setIniciativas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar iniciativas:", err);
      setError(err.message || "Error al conectar con el banco de iniciativas.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarIniciativas();
  }, []);

  // Al abrir el modal de aprobación se cargan los coordinadores disponibles
  useEffect(() => {
    setCoordinadorSeleccionado("");
    if (accionConfirmacion?.accion !== "aprobada") return;

    setCargandoCoordinadores(true);
    getCoordinadores()
      .then(setCoordinadores)
      .catch((err) => {
        setCoordinadores([]);
        setMensajeError(err.message || "No se pudo cargar la lista de coordinadores.");
      })
      .finally(() => setCargandoCoordinadores(false));
  }, [accionConfirmacion]);

  const handleCambiarEstado = async (iniciativa, nuevoEstado) => {
    setProcesandoAccion(true);
    setMensajeError("");
    setMensajeExito("");
    try {
      await cambiarEstadoIniciativa(
        iniciativa.id_iniciativa || iniciativa.id,
        nuevoEstado,
        nuevoEstado === "aprobada" ? coordinadorSeleccionado : null
      );
      setMensajeExito(
        `Iniciativa "${iniciativa.iniciativa?.titulo || iniciativa.nombre}" ${
          nuevoEstado === "aprobada" ? "aprobada exitosamente" : "marcada como no seleccionada"
        }.`
      );
      setAccionConfirmacion(null);
      await cargarIniciativas();
    } catch (err) {
      setMensajeError(err.message || "Error al actualizar el estado de la iniciativa.");
    } finally {
      setProcesandoAccion(false);
    }
  };

  // Filtrado
  const iniciativasFiltradas = iniciativas.filter((item) => {
    const q = busqueda.toLowerCase().trim();
    const titulo = (item.iniciativa?.titulo || item.nombre || "").toLowerCase();
    const radicado = (item.radicado || "").toLowerCase();
    const autor = (item.equipo?.lider?.nombre || item.usuario_nombre || "").toLowerCase();
    const correo = (item.equipo?.lider?.correo || item.usuario_correo || "").toLowerCase();
    const coincideTexto =
      !q ||
      titulo.includes(q) ||
      radicado.includes(q) ||
      autor.includes(q) ||
      correo.includes(q);

    const estadoNorm = (item.estado || "").toLowerCase();
    const coincideEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "aprobada" &&
        ["aprobada", "aprobado", "aceptada", "aceptado"].includes(estadoNorm)) ||
      (filtroEstado === "pendiente" &&
        ["pendiente", "en_espera", "radicada"].includes(estadoNorm)) ||
      (filtroEstado === "rechazada" &&
        ["rechazada", "rechazado"].includes(estadoNorm)) ||
      estadoNorm === filtroEstado;

    return coincideTexto && coincideEstado;
  });

  const conteoPendientes = iniciativas.filter((i) =>
    ["pendiente", "en_espera", "radicada"].includes((i.estado || "").toLowerCase())
  ).length;

  const conteoAprobadas = iniciativas.filter((i) =>
    ["aprobada", "aprobado", "aceptada", "aceptado"].includes((i.estado || "").toLowerCase())
  ).length;

  const getBadgeEstado = (estado) => {
    const e = (estado || "").toLowerCase();
    if (["aprobada", "aprobado", "aceptada", "aceptado"].includes(e)) {
      return {
        label: "Aprobada",
        cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: CheckCircle2,
      };
    }
    if (["rechazada", "rechazado"].includes(e)) {
      return {
        label: "Rechazada",
        cls: "bg-red-50 text-red-800 border-red-200",
        icon: XCircle,
      };
    }
    if (e === "en_revision") {
      return {
        label: "En Revisión",
        cls: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock,
      };
    }
    return {
      label: "Pendiente",
      cls: "bg-blue-50 text-blue-800 border-blue-200",
      icon: Clock,
    };
  };

  return (
    <div className="w-full space-y-6">
      {/* HEADER INSTITUCIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-100">
            <Lightbulb className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Coordinación de Emprendimiento
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Revisión, validación de origen académico y habilitación para conformación de equipos emprendedores.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={cargarIniciativas}
          disabled={cargando}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-center"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-red-600" : ""}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-slate-500">
            Total Registradas
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900">{iniciativas.length}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Iniciativas recibidas en convocatorias
          </span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-blue-700">
            Pendientes de Evaluación
          </span>
          <div className="mt-1 text-2xl font-bold text-blue-900">{conteoPendientes}</div>
          <span className="text-[11px] text-blue-600 mt-0.5 block">
            Requieren revisión documental
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase text-emerald-700">
            Aprobadas
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{conteoAprobadas}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            Pueden registrar su equipo emprendedor
          </span>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito("")}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError("")}
            className="text-red-700 hover:text-red-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* BARRA DE BÚSQUEDA Y FILTRO */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, estudiante o correo..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          >
            <option value="todos">Todos los Estados</option>
            <option value="pendiente">Pendientes de Evaluación</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
          </select>
        </div>
      </div>

      {/* LISTA / TABLA DE INICIATIVAS */}
      {cargando ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-3" />
          <span className="text-xs text-slate-500">Cargando banco de iniciativas...</span>
        </div>
      ) : iniciativasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
          <Lightbulb className="h-10 w-10 text-slate-300 mb-3" />
          <h4 className="text-sm font-bold text-slate-700">No se encontraron iniciativas</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {busqueda || filtroEstado !== "todos"
              ? "Prueba cambiando los términos de búsqueda o los filtros."
              : "Aún no se han recibido iniciativas de estudiantes en las convocatorias abiertas."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Iniciativa / Categoría</th>
                  <th className="px-5 py-3.5">Estudiante Postulante</th>
                  <th className="px-5 py-3.5">Origen Académico</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {iniciativasFiltradas.map((item) => {
                  const badge = getBadgeEstado(item.estado);
                  const Icon = badge.icon;
                  const doc = item.documentacion?.archivos?.[0];

                  return (
                    <tr key={item.id || item.id_iniciativa} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 align-top max-w-xs">
                        <div className="font-bold text-slate-900 leading-snug">
                          {item.iniciativa?.titulo || item.nombre}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {item.iniciativa?.resumen_ejecutivo || item.descripcion}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {item.iniciativa?.categoria || "Software"}
                          </span>
                          <span className="text-[10px] font-bold text-red-600">
                            TRL: {item.iniciativa?.trl_inicial || "M1"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-slate-800">
                          {item.equipo?.lider?.nombre || item.usuario_nombre || "Estudiante"}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.equipo?.lider?.correo || item.usuario_correo}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="capitalize font-semibold text-slate-700 block">
                          {(item.origen_academico?.tipo || "").replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {item.origen_academico?.asignatura_nombre ||
                            item.origen_academico?.descripcion_origen ||
                            item.detalle_origen ||
                            "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.cls}`}
                        >
                          <Icon className="h-3 w-3" />
                          <span>{badge.label}</span>
                        </span>
                        {item.tiene_equipo && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded block mt-1 w-fit">
                            Equipo Registrado
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <div className="flex flex-col items-end gap-2.5">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpedienteSeleccionado(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                              title="Ver Expediente Digital"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>Expediente</span>
                            </button>

                            {/* Botón de Aprobación */}
                            {!esAprobada(item) && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAccionConfirmacion({ iniciativa: item, accion: "aprobada" })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                                title="Aprobar iniciativa para que el estudiante conforme equipo"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Aprobar</span>
                              </button>
                            )}

                            {/* Botón de Rechazo (el coordinador no puede rechazar iniciativas) */}
                            {!esCoordinador && (item.estado || "").toLowerCase() !== "rechazada" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setAccionConfirmacion({ iniciativa: item, accion: "rechazada" })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                title="Rechazar postulación"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Rechazar</span>
                              </button>
                            )}

                            {/* Mentores del proyecto (solo iniciativas aprobadas) */}
                            {esAprobada(item) && (
                              <BotonRol
                                etiqueta="Mentores"
                                Icono={Users}
                                falta={!item.proyecto || !item.proyecto.mentores_asignados}
                                onClick={() => setIniciativaMentores(item)}
                              />
                            )}
                          </div>

                          {/* Tutor y Evaluador (este último aún sin funcionalidad) */}
                          {esAprobada(item) && (
                            <div className="flex items-center justify-end gap-1.5">
                              <BotonRol
                                etiqueta="Tutor"
                                Icono={GraduationCap}
                                falta={!item.proyecto?.tiene_tutor}
                                onClick={() => setIniciativaTutor(item)}
                              />
                              <BotonRol
                                etiqueta="Evaluador"
                                Icono={ClipboardCheck}
                                falta={!item.proyecto?.tiene_evaluador}
                                proximamente
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE EXPEDIENTE */}
      {expedienteSeleccionado && (
        <DetalleExpedienteModal
          postulacion={expedienteSeleccionado}
          onCerrar={() => setExpedienteSeleccionado(null)}
        />
      )}

      {iniciativaMentores && (
        <MentoresPanel
          key={iniciativaMentores.id_iniciativa}
          iniciativa={iniciativaMentores}
          onClose={() => setIniciativaMentores(null)}
          onAsignadosCambiados={(cantidad) =>
            actualizarProyecto(iniciativaMentores.id_iniciativa, { mentores_asignados: cantidad })
          }
        />
      )}

      {iniciativaTutor && (
        <TutorPanel
          key={iniciativaTutor.id_iniciativa}
          iniciativa={iniciativaTutor}
          onClose={() => setIniciativaTutor(null)}
          onTutorCambiado={(tieneTutor) =>
            actualizarProyecto(iniciativaTutor.id_iniciativa, { tiene_tutor: tieneTutor })
          }
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN (APROBAR / RECHAZAR) */}
      {accionConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  accionConfirmacion.accion === "aprobada"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {accionConfirmacion.accion === "aprobada" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {accionConfirmacion.accion === "aprobada"
                    ? "¿Aprobar Iniciativa Institucional?"
                    : "¿Marcar Iniciativa como Rechazada?"}
                </h3>
                <p className="text-xs text-slate-500">
                  Radicado:{" "}
                  <strong className="font-mono text-slate-700">
                    {accionConfirmacion.iniciativa.radicado}
                  </strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {accionConfirmacion.accion === "aprobada" ? (
                <>
                  Al <strong>aprobar</strong> la iniciativa{" "}
                  <em>"{accionConfirmacion.iniciativa.iniciativa?.titulo || accionConfirmacion.iniciativa.nombre}"</em>,
                  el estudiante líder recibirá una notificación institucional y quedará <strong>autorizado para conformar su Equipo Emprendedor</strong>.
                </>
              ) : (
                <>
                  Al marcar como <strong>rechazada</strong>, el estudiante no podrá conformar un equipo para esta postulación y será notificado del resultado.
                  {["aprobada", "aprobado", "aceptada", "aceptado"].includes(
                    (accionConfirmacion.iniciativa.estado || "").toLowerCase()
                  ) && (
                    <>
                      {" "}Como la iniciativa ya estaba aprobada,{" "}
                      <strong>se eliminará su proyecto</strong> y sus asignaciones de
                      coordinador, tutor y mentores.
                    </>
                  )}
                </>
              )}
            </p>

            {accionConfirmacion.accion === "aprobada" && (
              <div className="space-y-1.5">
                <label
                  htmlFor="coordinador-proyecto"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Coordinador a cargo del proyecto <span className="text-red-600">*</span>
                </label>
                {cargandoCoordinadores ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cargando coordinadores...
                  </div>
                ) : coordinadores.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    No hay coordinadores activos registrados. Asigna el rol de coordinador a un
                    usuario para poder aprobar la iniciativa.
                  </p>
                ) : (
                  <select
                    id="coordinador-proyecto"
                    value={coordinadorSeleccionado}
                    onChange={(e) => setCoordinadorSeleccionado(e.target.value)}
                    disabled={procesandoAccion}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Selecciona un coordinador...</option>
                    {coordinadores.map((c) => (
                      <option key={c.id_usuario} value={c.id_usuario}>
                        {c.nombre} — {c.correo}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAccionConfirmacion(null)}
                disabled={procesandoAccion}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCambiarEstado(
                    accionConfirmacion.iniciativa,
                    accionConfirmacion.accion
                  )
                }
                disabled={
                  procesandoAccion ||
                  (accionConfirmacion.accion === "aprobada" && !coordinadorSeleccionado)
                }
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  accionConfirmacion.accion === "aprobada"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {procesandoAccion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  Confirmar {accionConfirmacion.accion === "aprobada" ? "Aprobación" : "Rechazo"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

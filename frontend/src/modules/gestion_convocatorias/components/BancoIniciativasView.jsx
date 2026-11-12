import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Users,
  GraduationCap,
  ClipboardCheck,
  History,
  SlidersHorizontal,
} from "lucide-react";
import {
  AvisoPanel,
  BLOQUE_SUAVE,
  BOTON_SECUNDARIO,
  Buscador,
  Cargando,
  DialogoConfirmacion,
  Distintivo,
  EncabezadoPagina,
  EstadoVacio,
  MenuAcciones,
  Selector,
  TABLA_FILA,
  TABLA_TD,
  TARJETA,
  Tabla,
} from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import {
  getTodasLasIniciativas,
  cambiarEstadoIniciativa,
  getCoordinadores,
} from "../services/postulacionService";
import DetalleExpedienteModal from "./DetalleExpedienteModal";
import MentoresPanel from "../../gestion_acompaniamiento/components/MentoresPanel";
import TutorPanel from "../../gestion_acompaniamiento/components/TutorPanel";
import LineaTiempoPanel from "../../gestion_emprendimiento_2/components/LineaTiempoPanel";
import EvaluadorPanel from "../../gestion_acompaniamiento/components/EvaluadorPanel";

// Roles que pueden consultar la línea de tiempo evolutiva (el backend responde 403 a los demás)
const ROLES_LINEA_TIEMPO = ["coordinador", "direccion_del_programa", "direccion"];

const ESTADOS_APROBADOS = ["aprobada", "aprobado", "aceptada", "aceptado"];

function esAprobada(item) {
  return ESTADOS_APROBADOS.includes((item.estado || "").toLowerCase());
}

// Etiqueta de estado de un rol del proyecto dentro del menú de acciones
function estadoRol(falta, singular) {
  return falta ? `Falta asignar ${singular}` : "Asignado";
}

// titulo: el coordinador ve esta vista como "Proyectos"
// encabezado: false oculta el bloque de título y deja Actualizar junto al filtro de estados
export default function BancoIniciativasView({ titulo = "Banco de Iniciativas y Emprendimientos", encabezado = true }) {
  const { rolActivo } = useAuth();
  const rolNormalizado = (rolActivo || "").trim().toLowerCase();
  const esCoordinador = rolNormalizado === "coordinador";
  const veLineaTiempo = ROLES_LINEA_TIEMPO.includes(rolNormalizado);
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
  // HU-08: línea de tiempo evolutiva de la iniciativa
  const [iniciativaLineaTiempo, setIniciativaLineaTiempo] = useState(null);
  // Panel del evaluador del proyecto
  const [iniciativaEvaluador, setIniciativaEvaluador] = useState(null);

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

  const getBadgeEstado = (estado) => {
    const e = (estado || "").toLowerCase();
    if (["aprobada", "aprobado", "aceptada", "aceptado"].includes(e)) {
      return { label: "Aprobada", tono: "rojo", icon: CheckCircle2 };
    }
    if (["rechazada", "rechazado"].includes(e)) {
      return { label: "Rechazada", tono: "alerta", icon: XCircle };
    }
    if (e === "en_revision") {
      return { label: "En Revisión", tono: "oscuro", icon: Clock };
    }
    return { label: "Pendiente", tono: "gris", icon: Clock };
  };

  const botonActualizar = (
    <button type="button" onClick={cargarIniciativas} disabled={cargando} className={BOTON_SECUNDARIO}>
      <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin text-ufps" : ""}`} aria-hidden="true" />
      Actualizar
    </button>
  );

  const aprobando = accionConfirmacion?.accion === "aprobada";

  if (iniciativaLineaTiempo) {
    return (
      <LineaTiempoPanel
        key={iniciativaLineaTiempo.id_iniciativa}
        modo="pagina"
        idIniciativa={iniciativaLineaTiempo.id_iniciativa}
        nombre={iniciativaLineaTiempo.iniciativa?.titulo || iniciativaLineaTiempo.nombre}
        seccion={`Línea de tiempo${iniciativaLineaTiempo.radicado ? ` · ${iniciativaLineaTiempo.radicado}` : ""}`}
        textoVolver={esCoordinador ? "Volver a proyectos" : "Volver al banco de iniciativas"}
        onClose={() => setIniciativaLineaTiempo(null)}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ENCABEZADO (sin él, Actualizar pasa a la barra de filtros) */}
      {encabezado && (
        <EncabezadoPagina
          seccion="Coordinación de Emprendimiento"
          titulo={titulo}
          descripcion="Revisión, validación de origen académico y habilitación para conformación de equipos emprendedores."
          acciones={botonActualizar}
        />
      )}

      <AvisoPanel aviso={mensajeExito ? { tipo: "exito", titulo: mensajeExito } : null} onCerrar={() => setMensajeExito("")} />
      <AvisoPanel aviso={mensajeError ? { tipo: "error", titulo: mensajeError } : null} onCerrar={() => setMensajeError("")} />

      {/* BÚSQUEDA Y FILTRO */}
      <div className={`${TARJETA} flex flex-col gap-3 p-4 sm:flex-row sm:items-center`}>
        <Buscador
          className="flex-1"
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar por título, estudiante o correo…"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Selector
            className="sm:w-60"
            valor={filtroEstado}
            onChange={setFiltroEstado}
            aria-label="Filtrar por estado"
            opciones={[
              { valor: "todos", texto: "Todos los Estados" },
              { valor: "pendiente", texto: "Pendientes de Evaluación" },
              { valor: "aprobada", texto: "Aprobadas" },
              { valor: "rechazada", texto: "Rechazadas" },
            ]}
          />
          {!encabezado && botonActualizar}
        </div>
      </div>

      {/* TABLA DE INICIATIVAS */}
      {cargando ? (
        <Cargando texto="Cargando banco de iniciativas…" />
      ) : iniciativasFiltradas.length === 0 ? (
        <EstadoVacio icono={Lightbulb} titulo="No se encontraron iniciativas">
          {busqueda || filtroEstado !== "todos"
            ? "Prueba cambiando los términos de búsqueda o los filtros."
            : "Aún no se han recibido iniciativas de estudiantes en las convocatorias abiertas."}
        </EstadoVacio>
      ) : (
        <Tabla
          etiqueta="Iniciativas"
          columnas={[
            { id: "iniciativa", label: "Iniciativa / Categoría" },
            { id: "estudiante", label: "Estudiante Postulante" },
            { id: "origen", label: "Origen Académico" },
            { id: "estado", label: "Estado" },
            { id: "acciones", label: "Acciones", className: "text-right" },
          ]}
        >
          {iniciativasFiltradas.map((item) => {
            const badge = getBadgeEstado(item.estado);
            const aprobada = esAprobada(item);
            const faltaMentores = aprobada && (!item.proyecto || !item.proyecto.mentores_asignados);
            const faltaTutor = aprobada && !item.proyecto?.tiene_tutor;
            const faltaEvaluador = aprobada && !item.proyecto?.tiene_evaluador;
            const faltaRol = faltaMentores || faltaTutor || faltaEvaluador;

            return (
              <tr key={item.id || item.id_iniciativa} className={TABLA_FILA}>
                <td className={`${TABLA_TD} max-w-xs align-top`}>
                  <p className="font-semibold leading-snug text-slate-900">{item.iniciativa?.titulo || item.nombre}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {item.iniciativa?.resumen_ejecutivo || item.descripcion}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {item.iniciativa?.categoria || "Software"}
                    </span>
                    <span className="text-[11px] font-bold text-ufps">TRL: {item.iniciativa?.trl_inicial || "M1"}</span>
                  </div>
                </td>

                <td className={`${TABLA_TD} align-top`}>
                  <p className="font-semibold text-slate-900">
                    {item.equipo?.lider?.nombre || item.usuario_nombre || "Estudiante"}
                  </p>
                  <p className="font-mono text-xs text-slate-500">{item.equipo?.lider?.correo || item.usuario_correo}</p>
                </td>

                <td className={`${TABLA_TD} align-top`}>
                  <p className="font-semibold capitalize text-slate-800">
                    {(item.origen_academico?.tipo || "").replace(/_/g, " ")}
                  </p>
                  <p className="max-w-[180px] truncate text-xs text-slate-500">
                    {item.origen_academico?.asignatura_nombre ||
                      item.origen_academico?.descripcion_origen ||
                      item.detalle_origen ||
                      "—"}
                  </p>
                </td>

                <td className={`${TABLA_TD} align-top`}>
                  <Distintivo tono={badge.tono} icono={badge.icon}>
                    {badge.label}
                  </Distintivo>
                  {item.tiene_equipo && (
                    <span className="mt-1.5 block w-fit text-[11px] font-semibold text-slate-600">Equipo Registrado</span>
                  )}
                </td>

                <td className={`${TABLA_TD} align-top text-right`}>
                  <MenuAcciones
                    etiqueta="Gestionar"
                    icono={SlidersHorizontal}
                    etiquetaAccesible={`Acciones de la iniciativa ${item.iniciativa?.titulo || item.nombre}`}
                    alerta={faltaRol}
                    textoAlerta="falta asignar roles al proyecto"
                    grupos={[
                      {
                        titulo: "Consultar",
                        items: [
                          {
                            id: "expediente",
                            label: "Ver expediente",
                            detalle: "Documentos y datos de la postulación",
                            icono: Eye,
                            haspopup: "dialog",
                            onClick: () => setExpedienteSeleccionado(item),
                          },
                          veLineaTiempo && {
                            id: "linea",
                            label: "Línea de tiempo",
                            detalle: "Evolución cronológica de la iniciativa",
                            icono: History,
                            onClick: () => setIniciativaLineaTiempo(item),
                          },
                        ],
                      },
                      {
                        titulo: "Decisión",
                        items: [
                          !aprobada && {
                            id: "aprobar",
                            label: "Aprobar iniciativa",
                            detalle: "El estudiante podrá conformar su equipo",
                            icono: CheckCircle2,
                            haspopup: "dialog",
                            onClick: () => setAccionConfirmacion({ iniciativa: item, accion: "aprobada" }),
                          },
                          // El coordinador no puede rechazar iniciativas
                          !esCoordinador &&
                            (item.estado || "").toLowerCase() !== "rechazada" && {
                              id: "rechazar",
                              label: "Rechazar postulación",
                              detalle: aprobada ? "Se eliminará su proyecto" : "Se notificará al estudiante",
                              icono: XCircle,
                              peligro: true,
                              haspopup: "dialog",
                              onClick: () => setAccionConfirmacion({ iniciativa: item, accion: "rechazada" }),
                            },
                        ],
                      },
                      {
                        titulo: "Acompañamiento del proyecto",
                        items: aprobada
                          ? [
                              {
                                id: "mentores",
                                label: "Mentores",
                                detalle: estadoRol(faltaMentores, "mentor"),
                                alerta: faltaMentores,
                                icono: Users,
                                haspopup: "dialog",
                                onClick: () => setIniciativaMentores(item),
                              },
                              {
                                id: "tutor",
                                label: "Tutor",
                                detalle: estadoRol(faltaTutor, "tutor"),
                                alerta: faltaTutor,
                                icono: GraduationCap,
                                haspopup: "dialog",
                                onClick: () => setIniciativaTutor(item),
                              },
                              {
                                id: "evaluador",
                                label: "Evaluador",
                                detalle: estadoRol(faltaEvaluador, "evaluador"),
                                alerta: faltaEvaluador,
                                icono: ClipboardCheck,
                                haspopup: "dialog",
                                onClick: () => setIniciativaEvaluador(item),
                              },
                            ]
                          : [],
                      },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </Tabla>
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


      {iniciativaEvaluador && (
        <EvaluadorPanel
          key={iniciativaEvaluador.id_iniciativa}
          iniciativa={iniciativaEvaluador}
          onClose={() => setIniciativaEvaluador(null)}
          onEvaluadorCambiado={(tieneEvaluador) =>
            actualizarProyecto(iniciativaEvaluador.id_iniciativa, { tiene_evaluador: tieneEvaluador })
          }
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ACCIÓN (APROBAR / RECHAZAR) */}
      <DialogoConfirmacion
        open={Boolean(accionConfirmacion)}
        titulo={aprobando ? "¿Aprobar Iniciativa Institucional?" : "¿Marcar Iniciativa como Rechazada?"}
        textoConfirmar={`Confirmar ${aprobando ? "Aprobación" : "Rechazo"}`}
        peligro={!aprobando}
        procesando={procesandoAccion}
        deshabilitado={aprobando && !coordinadorSeleccionado}
        onConfirmar={() => handleCambiarEstado(accionConfirmacion.iniciativa, accionConfirmacion.accion)}
        onCancelar={() => setAccionConfirmacion(null)}
      >
        {accionConfirmacion && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Radicado: <strong className="font-mono text-slate-700">{accionConfirmacion.iniciativa.radicado}</strong>
            </p>
            <p className={`${BLOQUE_SUAVE} text-sm leading-relaxed text-slate-700`}>
              {aprobando ? (
                <>
                  Al <strong>aprobar</strong> la iniciativa{" "}
                  <em>"{accionConfirmacion.iniciativa.iniciativa?.titulo || accionConfirmacion.iniciativa.nombre}"</em>, el
                  estudiante líder recibirá una notificación institucional y quedará{" "}
                  <strong>autorizado para conformar su Equipo Emprendedor</strong>.
                </>
              ) : (
                <>
                  Al marcar como <strong>rechazada</strong>, el estudiante no podrá conformar un equipo para esta
                  postulación y será notificado del resultado.
                  {["aprobada", "aprobado", "aceptada", "aceptado"].includes(
                    (accionConfirmacion.iniciativa.estado || "").toLowerCase()
                  ) && (
                    <>
                      {" "}Como la iniciativa ya estaba aprobada, <strong>se eliminará su proyecto</strong> y sus
                      asignaciones de coordinador, tutor y mentores.
                    </>
                  )}
                </>
              )}
            </p>

            {aprobando &&
              (cargandoCoordinadores ? (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Cargando coordinadores...
                </p>
              ) : coordinadores.length === 0 ? (
                <p className="rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
                  No hay coordinadores activos registrados. Asigna el rol de coordinador a un usuario para poder aprobar la
                  iniciativa.
                </p>
              ) : (
                <Selector
                  etiqueta={
                    <>
                      Coordinador a cargo del proyecto <span className="text-ufps">*</span>
                    </>
                  }
                  valor={coordinadorSeleccionado}
                  onChange={setCoordinadorSeleccionado}
                  disabled={procesandoAccion}
                  placeholder="Selecciona un coordinador..."
                  opciones={coordinadores.map((c) => ({ valor: c.id_usuario, texto: `${c.nombre} — ${c.correo}` }))}
                />
              ))}
          </div>
        )}
      </DialogoConfirmacion>
    </div>
  );
}

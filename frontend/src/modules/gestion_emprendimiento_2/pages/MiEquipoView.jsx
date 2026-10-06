import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  actualizarEquipo,
  eliminarMiembro,
  agregarMiembro,
  fetchEstudiantes,
  eliminarEquipo,
} from "../services/equipoService";

export default function MiEquipoView({ equipo, onActualizarEquipo }) {
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre_equipo || "");
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [eliminandoEquipo, setEliminandoEquipo] = useState(false);

  // Búsqueda y agregar estudiantes
  const [busqueda, setBusqueda] = useState("");
  const [estudiantesDisponibles, setEstudiantesDisponibles] = useState([]);
  const [cargandoDisponibles, setCargandoDisponibles] = useState(false);
  const [agregandoId, setAgregandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);

  // Notificaciones
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeError, setMensajeError] = useState("");

  const esLider = Boolean(equipo.es_lider);

  const handleEliminarEquipo = async () => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas disolver y eliminar este equipo? Se desvincularán todos los integrantes y podrás registrar un nuevo equipo para tu iniciativa aprobada cuando lo requieras."
      )
    ) {
      return;
    }
    setEliminandoEquipo(true);
    setMensajeError("");
    setMensajeExito("");
    try {
      await eliminarEquipo(equipo.id_equipo);
      setMensajeExito("Equipo disuelto y eliminado exitosamente.");
      if (onActualizarEquipo) {
        setTimeout(() => {
          onActualizarEquipo();
        }, 600);
      }
    } catch (err) {
      setMensajeError(err.message || "Error al eliminar el equipo.");
      setEliminandoEquipo(false);
    }
  };

  // Cargar estudiantes disponibles si es líder
  useEffect(() => {
    let activo = true;
    async function cargar() {
      if (!esLider) return;
      setCargandoDisponibles(true);
      try {
        const data = await fetchEstudiantes(busqueda);
        if (activo) {
          const idsActuales = new Set(equipo.miembros.map((m) => m.id_usuario));
          setEstudiantesDisponibles(data.filter((e) => !idsActuales.has(e.id)));
        }
      } catch (err) {
        console.error("Error al cargar estudiantes disponibles:", err);
      } finally {
        if (activo) setCargandoDisponibles(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [busqueda, esLider, equipo.miembros]);

  const handleGuardarNombre = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || nuevoNombre.trim().length < 3) {
      setMensajeError("El nombre del equipo debe tener al menos 3 caracteres.");
      return;
    }

    setGuardandoNombre(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      await actualizarEquipo(equipo.id_equipo, { nombre_equipo: nuevoNombre.trim() });
      setMensajeExito("Nombre del equipo actualizado con éxito.");
      setEditandoNombre(false);
      onActualizarEquipo();
    } catch (err) {
      setMensajeError(err.message || "No se pudo actualizar el nombre del equipo.");
    } finally {
      setGuardandoNombre(false);
    }
  };

  const handleEliminarMiembro = async (miembro) => {
    if (!window.confirm(`¿Estás seguro de retirar a ${miembro.nombre} del equipo?`)) {
      return;
    }

    setEliminandoId(miembro.id_usuario);
    setMensajeError("");
    setMensajeExito("");

    try {
      await eliminarMiembro(equipo.id_equipo, miembro.id_usuario);
      setMensajeExito(`${miembro.nombre} fue retirado(a) del equipo.`);
      onActualizarEquipo();
    } catch (err) {
      setMensajeError(err.message || "Error al retirar al miembro del equipo.");
    } finally {
      setEliminandoId(null);
    }
  };

  const handleAgregarMiembro = async (estudiante) => {
    setAgregandoId(estudiante.id);
    setMensajeError("");
    setMensajeExito("");

    try {
      await agregarMiembro(equipo.id_equipo, estudiante.id);
      setMensajeExito(`${estudiante.nombre} fue incorporado(a) al equipo exitosamente.`);
      onActualizarEquipo();
    } catch (err) {
      setMensajeError(err.message || "Error al agregar integrante al equipo.");
    } finally {
      setAgregandoId(null);
    }
  };

  const fechaFormateada = equipo.fecha_creacion
    ? new Date(equipo.fecha_creacion).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Fecha no disponible";

  return (
    <div className="w-full space-y-6">
      {/* MENSAJES DE ESTADO */}
      {mensajeExito && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeExito("")}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {mensajeError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{mensajeError}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensajeError("")}
            className="text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TARJETA PRINCIPAL DEL EQUIPO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Users className="h-3.5 w-3.5" />
                Equipo Emprendedor Registrado (HU-04)
              </span>
              {esLider && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Líder
                </span>
              )}
            </div>

            {editandoNombre ? (
              <form onSubmit={handleGuardarNombre} className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-lg font-bold text-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="Nombre del equipo"
                  disabled={guardandoNombre}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={guardandoNombre}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {guardandoNombre ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNuevoNombre(equipo.nombre_equipo);
                    setEditandoNombre(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {equipo.nombre_equipo}
                </h2>
                {esLider && (
                  <button
                    type="button"
                    onClick={() => setEditandoNombre(true)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    title="Editar nombre del equipo"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Registrado el {fechaFormateada}
              </span>
              <span>•</span>
              <span>
                Líder: <strong className="text-slate-700">{equipo.lider?.nombre}</strong> ({equipo.lider?.correo})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-right">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Integrantes
              </div>
              <div className="text-xl font-bold text-slate-800">
                {equipo.miembros?.length || 0}
              </div>
            </div>
          </div>
        </div>

        {/* INICIATIVA APROBADA ASOCIADA (HU-03 / HU-04) */}
        {equipo.iniciativa ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Iniciativa Aprobada Vinculada
                  </span>
                  {equipo.iniciativa.radicado && (
                    <span className="text-xs font-mono font-medium text-slate-500">
                      Radicado: {equipo.iniciativa.radicado}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {equipo.iniciativa.titulo}
                </h4>
                {equipo.iniciativa.convocatoria_nombre && (
                  <p className="text-xs text-slate-500">
                    Convocatoria: <span className="font-semibold text-slate-700">{equipo.iniciativa.convocatoria_nombre}</span>
                  </p>
                )}
                {equipo.iniciativa.descripcion && (
                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                    {equipo.iniciativa.descripcion}
                  </p>
                )}
              </div>
              {equipo.iniciativa.documento_url && (
                <a
                  href={equipo.iniciativa.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Ver Documento</span>
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </a>
              )}
            </div>
          </div>
        ) : null}

        {/* MENSAJE DE PERMISOS */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 border border-slate-100">
          {esLider ? (
            <p>
              🌟 <strong>Eres el Líder del Equipo:</strong> Puedes modificar el nombre de tu equipo, incorporar nuevos compañeros registrados y gestionar a los integrantes.
            </p>
          ) : (
            <p>
              👤 <strong>Eres Integrante de este Equipo:</strong> Puedes consultar los integrantes de tu iniciativa. Las modificaciones de nombre y miembros están a cargo del estudiante líder (<strong>{equipo.lider?.nombre}</strong>).
            </p>
          )}
        </div>

        {/* TABLA DE INTEGRANTES ACTUALES */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Integrantes del Equipo ({equipo.miembros?.length || 0})
            </h3>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Estudiante</th>
                  <th className="px-5 py-3.5">Correo Institucional</th>
                  <th className="px-5 py-3.5">Rol en el Equipo</th>
                  {esLider && <th className="px-5 py-3.5 text-right">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {equipo.miembros?.map((m) => {
                  const iniciales = (m.nombre || "")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("") || "E";

                  return (
                    <tr key={m.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {iniciales}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{m.nombre}</div>
                            {m.codigo && (
                              <div className="text-xs text-slate-400">Cód. {m.codigo}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                        {m.correo}
                      </td>
                      <td className="px-5 py-3.5">
                        {m.es_lider ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                            <ShieldCheck className="h-3 w-3" />
                            Líder
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            <UserCheck className="h-3 w-3" />
                            Integrante
                          </span>
                        )}
                      </td>
                      {esLider && (
                        <td className="px-5 py-3.5 text-right">
                          {m.es_lider ? (
                            <span className="text-xs text-slate-400 italic">No retirable</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEliminarMiembro(m)}
                              disabled={eliminandoId === m.id_usuario}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              {eliminandoId === m.id_usuario ? "Retirando..." : "Quitar"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECCIÓN PARA AGREGAR NUEVOS INTEGRANTES (SOLO LÍDER) */}
        {esLider && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-red-600" />
                Agregar Nuevo Integrante al Equipo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Busca estudiantes de Ingeniería de Sistemas activos que aún no formen parte de ningún equipo emprendedor.
              </p>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo institucional..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {cargandoDisponibles ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Buscando estudiantes disponibles...
                </div>
              ) : estudiantesDisponibles.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  {busqueda.trim()
                    ? "No se encontraron estudiantes disponibles que coincidan con la búsqueda."
                    : "No hay más estudiantes disponibles para agregar en este momento."}
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Nombre</th>
                      <th className="px-5 py-3">Correo Institucional</th>
                      <th className="px-5 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estudiantesDisponibles.slice(0, 10).map((est) => (
                      <tr key={est.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-800 text-xs">
                          {est.nombre}
                        </td>
                        <td className="px-5 py-3 text-slate-500 font-mono text-xs">
                          {est.correo}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleAgregarMiembro(est)}
                            disabled={agregandoId === est.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <UserPlus className="h-3 w-3" />
                            {agregandoId === est.id ? "Agregando..." : "+ Agregar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ZONA DE GESTIÓN AVANZADA / DISOLUCIÓN (SOLO LÍDER) */}
        {esLider && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  Disolver este Equipo Emprendedor
                </h4>
                <p className="text-xs text-slate-600 mt-1">
                  Si eliminas este equipo, todos los integrantes quedarán libres y podrás volver a conformar un nuevo equipo para tu iniciativa aprobada cuando lo requieras.
                </p>
              </div>
              <button
                type="button"
                onClick={handleEliminarEquipo}
                disabled={eliminandoEquipo}
                className="inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{eliminandoEquipo ? "Disolviendo..." : "Eliminar Equipo"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

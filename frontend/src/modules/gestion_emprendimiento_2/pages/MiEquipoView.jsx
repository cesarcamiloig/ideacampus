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
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  Avatar,
  AvisoPanel,
  BLOQUE,
  BOTON_FANTASMA,
  BOTON_PELIGRO_SM,
  BOTON_PRIMARIO,
  BOTON_PRIMARIO_SM,
  BOTON_SECUNDARIO,
  Buscador,
  CAMPO,
  iniciales as inicialesDe,
  Distintivo,
  SECCION,
  TARJETA,
  FilaMensaje,
  ROTULO,
  TABLA_FILA,
  TABLA_TD,
  Tabla,
  Tarjeta,
} from "../../../components/ui";
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
      <AvisoPanel aviso={mensajeExito ? { tipo: "exito", titulo: mensajeExito } : null} onCerrar={() => setMensajeExito("")} />
      <AvisoPanel aviso={mensajeError ? { tipo: "error", titulo: mensajeError } : null} onCerrar={() => setMensajeError("")} />

      {/* 1. ROL DEL USUARIO EN EL EQUIPO: va aparte y primero */}
      <section className={`${TARJETA} flex items-start gap-3 p-4 sm:p-5`}>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${
            esLider ? "bg-ufps" : "bg-slate-800"
          }`}
        >
          {esLider ? (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          ) : (
            <UserCheck className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {esLider ? "Eres el líder del equipo" : "Eres integrante de este equipo"}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
            {esLider ? (
              "Puedes modificar el nombre de tu equipo, incorporar nuevos compañeros registrados y gestionar a los integrantes."
            ) : (
              <>
                Puedes consultar los integrantes de tu iniciativa. Las modificaciones de nombre y miembros están a cargo del
                estudiante líder (<strong className="text-slate-900">{equipo.lider?.nombre}</strong>).
              </>
            )}
          </p>
        </div>
      </section>

      {/* 2. DATOS DEL EQUIPO */}
      <section className={`${TARJETA} p-5 sm:p-6`}>
        <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="space-y-1">
              <p className={SECCION}>Equipo emprendedor registrado</p>
              {editandoNombre ? (
                <form onSubmit={handleGuardarNombre} className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    className={`${CAMPO} sm:max-w-sm`}
                    placeholder="Nombre del equipo"
                    aria-label="Nombre del equipo"
                    disabled={guardandoNombre}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={guardandoNombre} className={BOTON_PRIMARIO}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      {guardandoNombre ? "Guardando..." : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNuevoNombre(equipo.nombre_equipo);
                        setEditandoNombre(false);
                      }}
                      className={BOTON_SECUNDARIO}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                  {equipo.nombre_equipo}
                  {esLider && (
                    <button
                      type="button"
                      onClick={() => setEditandoNombre(true)}
                      className={`${BOTON_FANTASMA} min-h-9 text-xs`}
                      title="Editar nombre del equipo"
                    >
                      <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
                    </button>
                  )}
                </h1>
              )}
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                Registrado el {fechaFormateada}
              </p>
            </div>

            {/* Líder destacado */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-2.5 pr-4 sm:w-fit">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white" aria-hidden="true">{inicialesDe(equipo.lider?.nombre)}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Líder del equipo</p>
                <p className="truncate text-sm font-semibold text-slate-900">{equipo.lider?.nombre}</p>
                <p className="truncate text-xs text-slate-500">{equipo.lider?.correo}</p>
              </div>
            </div>
          </div>

          {/* Rol e integrantes, arriba a la derecha */}
          <div className="flex shrink-0 items-center gap-2 md:justify-end">
            {esLider ? (
              <Distintivo tono="oscuro" icono={ShieldCheck}>
                Líder
              </Distintivo>
            ) : (
              <Distintivo tono="gris" icono={UserCheck}>
                Integrante
              </Distintivo>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <strong className="font-bold text-slate-900">{equipo.miembros?.length || 0}</strong>
              {(equipo.miembros?.length || 0) === 1 ? "integrante" : "integrantes"}
            </span>
          </div>
        </div>

        {/* INICIATIVA APROBADA ASOCIADA */}
        {equipo.iniciativa ? (
          <div className={`${BLOQUE} mt-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <Distintivo tono="rojo" icono={CheckCircle2}>
                  Iniciativa Aprobada Vinculada
                </Distintivo>
                <h4 className="pt-1 text-base font-semibold text-slate-900">{equipo.iniciativa.titulo}</h4>
                {equipo.iniciativa.convocatoria_nombre && (
                  <p className="text-xs text-slate-500">
                    Convocatoria: <span className="font-semibold text-slate-700">{equipo.iniciativa.convocatoria_nombre}</span>
                  </p>
                )}
                {equipo.iniciativa.descripcion && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{equipo.iniciativa.descripcion}</p>
                )}
              </div>
              {equipo.iniciativa.documento_url && (
                <a
                  href={equipo.iniciativa.documento_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${BOTON_SECUNDARIO} shrink-0 self-start sm:self-center`}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Ver Documento
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* INTEGRANTES ACTUALES */}
      <section className="space-y-3">
        <h3 className={ROTULO}>Integrantes del Equipo ({equipo.miembros?.length || 0})</h3>
        <Tabla
          etiqueta="Integrantes del equipo"
          columnas={[
            { id: "estudiante", label: "Estudiante" },
            { id: "correo", label: "Correo Institucional" },
            { id: "rol", label: "Rol en el Equipo" },
            ...(esLider ? [{ id: "accion", label: "Acción", className: "text-right" }] : []),
          ]}
        >
          {equipo.miembros?.map((m) => {
            const iniciales =
              (m.nombre || "")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join("") || "E";

            return (
              <tr key={m.id_usuario} className={TABLA_FILA}>
                <td className={TABLA_TD}>
                  <div className="flex items-center gap-3">
                    <Avatar texto={iniciales} tamano="h-9 w-9" />
                    <div>
                      <p className="font-semibold text-slate-900">{m.nombre}</p>
                      {m.codigo && <p className="text-xs text-slate-400">Cód. {m.codigo}</p>}
                    </div>
                  </div>
                </td>
                <td className={`${TABLA_TD} font-mono text-xs`}>{m.correo}</td>
                <td className={TABLA_TD}>
                  {m.es_lider ? (
                    <Distintivo tono="oscuro" icono={ShieldCheck}>
                      Líder
                    </Distintivo>
                  ) : (
                    <Distintivo tono="gris" icono={UserCheck}>
                      Integrante
                    </Distintivo>
                  )}
                </td>
                {esLider && (
                  <td className={`${TABLA_TD} text-right`}>
                    {m.es_lider ? (
                      <span className="text-xs italic text-slate-400">No retirable</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEliminarMiembro(m)}
                        disabled={eliminandoId === m.id_usuario}
                        className={BOTON_PELIGRO_SM}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {eliminandoId === m.id_usuario ? "Retirando..." : "Quitar"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </Tabla>
      </section>

      {/* AGREGAR NUEVOS INTEGRANTES (SOLO LÍDER) */}
      {esLider && (
        <Tarjeta>
          <div className="space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <UserPlus className="h-4 w-4 text-ufps" aria-hidden="true" />
                Agregar Nuevo Integrante al Equipo
              </h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Busca estudiantes de Ingeniería de Sistemas activos que aún no formen parte de ningún equipo emprendedor.
              </p>
            </div>
            <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o correo institucional…" />
            <Tabla
              etiqueta="Estudiantes disponibles"
              className="shadow-none"
              columnas={[
                { id: "nombre", label: "Nombre" },
                { id: "correo", label: "Correo Institucional" },
                { id: "accion", label: "Acción", className: "text-right" },
              ]}
            >
              {cargandoDisponibles ? (
                <FilaMensaje columnas={3} cargando>
                  Buscando estudiantes disponibles...
                </FilaMensaje>
              ) : estudiantesDisponibles.length === 0 ? (
                <FilaMensaje columnas={3}>
                  {busqueda.trim()
                    ? "No se encontraron estudiantes disponibles que coincidan con la búsqueda."
                    : "No hay más estudiantes disponibles para agregar en este momento."}
                </FilaMensaje>
              ) : (
                estudiantesDisponibles.slice(0, 10).map((est) => (
                  <tr key={est.id} className={TABLA_FILA}>
                    <td className={`${TABLA_TD} font-medium text-slate-900`}>{est.nombre}</td>
                    <td className={`${TABLA_TD} font-mono text-xs text-slate-500`}>{est.correo}</td>
                    <td className={`${TABLA_TD} text-right`}>
                      <button
                        type="button"
                        onClick={() => handleAgregarMiembro(est)}
                        disabled={agregandoId === est.id}
                        className={BOTON_PRIMARIO_SM}
                      >
                        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                        {agregandoId === est.id ? "Agregando..." : "Agregar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </Tabla>
          </div>
        </Tarjeta>
      )}

      {/* DISOLUCIÓN (SOLO LÍDER) */}
      {esLider && (
        <section className="rounded-2xl border border-ufps bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ufps">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Disolver este Equipo Emprendedor
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Si eliminas este equipo, todos los integrantes quedarán libres y podrás volver a conformar un nuevo equipo para
                tu iniciativa aprobada cuando lo requieras.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEliminarEquipo}
              disabled={eliminandoEquipo}
              className={`${BOTON_PRIMARIO} shrink-0 self-start sm:self-center`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {eliminandoEquipo ? "Disolviendo..." : "Eliminar Equipo"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

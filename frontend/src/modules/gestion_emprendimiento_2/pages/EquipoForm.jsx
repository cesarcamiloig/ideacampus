import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { fetchEstudiantes, registerEquipo, obtenerMisIniciativasAprobadas } from "../services/equipoService";
import {
  Avatar,
  AvisoPanel,
  BLOQUE,
  BOTON_FANTASMA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_SM,
  Buscador,
  CAMPO,
  Campo,
  Distintivo,
  FilaMensaje,
  MensajeError,
  ROTULO,
  SECCION,
  TABLA_FILA,
  TABLA_TD,
  TARJETA,
  Tabla,
} from "../../../components/ui";

const PASOS = [
  { titulo: "Iniciativa Aprobada", desc: "Asociada directamente a tu postulación aprobada." },
  { titulo: "Datos del equipo", desc: "Nombre y verificación institucional." },
  { titulo: "Integrantes", desc: "Busca y agrega estudiantes registrados." },
];

const MIN_INTEGRANTES = 2;

function EquipoForm({ onEquipoCreado, onCancelar, showHeader = false, iniciativasAprobadas = [] }) {
  const { usuario } = useAuth();

  const [nombreEquipo, setNombreEquipo] = useState("");
  const [iniciativas, setIniciativas] = useState(iniciativasAprobadas);
  const [idIniciativa, setIdIniciativa] = useState(
    iniciativasAprobadas[0]?.id_iniciativa || null
  );
  const [miembros, setMiembros] = useState(() =>
    usuario
      ? [
          {
            id: usuario.id_usuario,
            nombre: usuario.nombre,
            correo: usuario.correo,
            esLider: true,
          },
        ]
      : []
  );

  const [estudiantes, setEstudiantes] = useState([]);
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(true);
  const [errorEstudiantes, setErrorEstudiantes] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (iniciativasAprobadas.length > 0) {
      setIniciativas(iniciativasAprobadas);
      if (!idIniciativa) {
        setIdIniciativa(iniciativasAprobadas[0].id_iniciativa);
      }
    } else {
      obtenerMisIniciativasAprobadas().then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setIniciativas(data);
          setIdIniciativa(data[0].id_iniciativa);
        }
      });
    }
  }, [iniciativasAprobadas]);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      setCargandoEstudiantes(true);
      setErrorEstudiantes("");
      try {
        const data = await fetchEstudiantes(busqueda);
        if (activo) setEstudiantes(Array.isArray(data) ? data : []);
      } catch (err) {
        if (activo) setErrorEstudiantes(err.message || "No pudimos cargar los estudiantes.");
      } finally {
        if (activo) setCargandoEstudiantes(false);
      }
    }
    cargar();
    return () => {
      activo = false;
    };
  }, [busqueda]);

  const idsAgregados = useMemo(() => new Set(miembros.map((m) => m.id)), [miembros]);

  const estudiantesFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return estudiantes
      .filter((e) => !idsAgregados.has(e.id))
      .filter(
        (e) =>
          !term ||
          e.nombre?.toLowerCase().includes(term) ||
          e.correo?.toLowerCase().includes(term)
      );
  }, [estudiantes, idsAgregados, busqueda]);

  function agregarMiembro(estudiante) {
    setMiembros((prev) => [...prev, { ...estudiante, esLider: false }]);
  }

  function quitarMiembro(id) {
    setMiembros((prev) => prev.filter((m) => m.id !== id));
  }

  function validar() {
    const nuevosErrores = {};
    if (!idIniciativa) {
      nuevosErrores.idIniciativa = "Debes seleccionar una iniciativa aprobada para formalizar el equipo.";
    }
    if (!nombreEquipo.trim()) {
      nuevosErrores.nombreEquipo = "Indica el nombre del equipo.";
    } else if (nombreEquipo.trim().length < 3) {
      nuevosErrores.nombreEquipo = "El nombre del equipo debe tener al menos 3 caracteres.";
    }

    const integrantesSinLider = miembros.filter((m) => !m.esLider).length;
    if (integrantesSinLider < 1) {
      nuevosErrores.miembros = `Agrega al menos 1 integrante adicional además del líder (recomendado: ${MIN_INTEGRANTES}).`;
    }
    return nuevosErrores;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevosErrores = validar();
    setErrors(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    setStatus("loading");
    setServerError("");
    try {
      const response = await registerEquipo({
        nombre_equipo: nombreEquipo.trim(),
        id_usuario_lider: usuario?.id_usuario,
        id_iniciativa: idIniciativa,
        id_usuarios: miembros.map((m) => m.id),
      });
      setStatus("success");
      if (onEquipoCreado) {
        setTimeout(() => {
          onEquipoCreado(response);
        }, 800);
      }
    } catch (err) {
      setStatus("error");
      setServerError(err.message || "Error al registrar el equipo.");
    }
  }

  function iniciales(nombre) {
    return (nombre || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  return (
    <div className="w-full space-y-6">
      {showHeader && (
        <header className={`${TARJETA} flex items-center justify-between gap-4 px-5 py-4`}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ufps font-bold text-white">U</span>
            <div>
              <p className="font-marca text-base font-bold tracking-[0.04em] text-slate-900">GENNOVA</p>
              <p className="text-xs text-slate-500">Universidad Francisco de Paula Santander</p>
            </div>
          </div>
          <span className="text-sm font-medium text-slate-600">Equipo Emprendedor</span>
        </header>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Guía lateral */}
        <aside className={`${TARJETA} h-fit space-y-5 p-5 sm:p-6`}>
          <div className="space-y-1">
            <p className={SECCION}>Equipo emprendedor</p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Registra tu equipo</h1>
            <p className="text-sm leading-relaxed text-slate-600">
              Como líder, agrega a cada integrante para formalizar la participación colectiva de tu iniciativa de
              innovación aprobada.
            </p>
          </div>

          <ol className="space-y-4">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ufps text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{paso.titulo}</p>
                  <p className="text-xs text-slate-500">{paso.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Se requiere al menos <strong className="text-slate-900">1 integrante</strong> además del líder para registrar el
            equipo.
          </p>
        </aside>

        <section className={`${TARJETA} p-5 sm:p-6`}>
          <form onSubmit={handleSubmit} noValidate className="space-y-7">
            {/* Iniciativa */}
            <div className="space-y-3">
              <h2 className={ROTULO}>Iniciativa Aprobada Vinculada</h2>
              <div className={BLOQUE}>
                {iniciativas.length > 1 ? (
                  <Campo etiqueta="Selecciona tu iniciativa aprobada" requerido>
                    {(props) => (
                      <select
                        {...props}
                        value={idIniciativa || ""}
                        onChange={(e) => setIdIniciativa(Number(e.target.value))}
                        className={CAMPO}
                      >
                        {iniciativas.map((ini) => (
                          <option key={ini.id_iniciativa} value={ini.id_iniciativa}>
                            {ini.titulo} {ini.radicado ? `(${ini.radicado})` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                ) : iniciativas.length === 1 ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{iniciativas[0].titulo}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {iniciativas[0].radicado ? `Radicado: ${iniciativas[0].radicado} • ` : ""}
                        {iniciativas[0].convocatoria_nombre ? `Convocatoria: ${iniciativas[0].convocatoria_nombre}` : ""}
                      </p>
                    </div>
                    <Distintivo tono="rojo" icono={CheckCircle2}>
                      Aprobada
                    </Distintivo>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-ufps">
                    No tienes iniciativas aprobadas disponibles para crear un equipo.
                  </p>
                )}
                <div className="mt-2">
                  <MensajeError>{errors.idIniciativa}</MensajeError>
                </div>
              </div>
            </div>

            {/* Datos */}
            <div className="space-y-3">
              <h2 className={ROTULO}>Datos del equipo</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre del equipo" requerido error={errors.nombreEquipo}>
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      placeholder="Ej. EcoSoluciones UFPS"
                      value={nombreEquipo}
                      onChange={(e) => setNombreEquipo(e.target.value)}
                      className={CAMPO}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Líder responsable">
                  {(props) => (
                    <input
                      {...props}
                      type="text"
                      value={`${usuario?.nombre || "Estudiante"} (${usuario?.correo || ""})`}
                      disabled
                      className={CAMPO}
                    />
                  )}
                </Campo>
              </div>
            </div>

            {/* Integrantes */}
            <div className="space-y-3">
              <h2 className={ROTULO}>Integrantes del equipo</h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
                {miembros.map((m) => (
                  <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${m.esLider ? "bg-slate-50" : "bg-white"}`}>
                    <Avatar texto={iniciales(m.nombre)} tamano="h-9 w-9" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.nombre}</p>
                      <p className="truncate text-xs text-slate-500">{m.correo}</p>
                    </div>
                    {m.esLider ? (
                      <Distintivo tono="oscuro">Líder</Distintivo>
                    ) : (
                      <button type="button" className={`${BOTON_FANTASMA} min-h-9 text-xs text-ufps`} onClick={() => quitarMiembro(m.id)}>
                        Quitar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <MensajeError>{errors.miembros}</MensajeError>
            </div>

            {/* Agregar estudiantes */}
            <div className="space-y-3">
              <h2 className={ROTULO}>Agregar estudiante registrado</h2>
              <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o correo…" />
              <Tabla
                etiqueta="Estudiantes disponibles"
                className="max-h-80 overflow-y-auto shadow-none"
                columnas={[
                  { id: "nombre", label: "Nombre" },
                  { id: "correo", label: "Correo institucional" },
                  { id: "accion", label: <span className="sr-only">Acción</span> },
                ]}
              >
                {cargandoEstudiantes ? (
                  <FilaMensaje columnas={3} cargando>
                    Cargando estudiantes disponibles...
                  </FilaMensaje>
                ) : errorEstudiantes ? (
                  <FilaMensaje columnas={3}>
                    <span className="text-ufps">{errorEstudiantes}</span>
                  </FilaMensaje>
                ) : estudiantesFiltrados.length === 0 ? (
                  <FilaMensaje columnas={3}>
                    {busqueda.trim()
                      ? "No hay estudiantes que coincidan con la búsqueda."
                      : "No hay más estudiantes activos disponibles para agregar."}
                  </FilaMensaje>
                ) : (
                  estudiantesFiltrados.map((est) => (
                    <tr key={est.id} className={TABLA_FILA}>
                      <td className={`${TABLA_TD} font-medium text-slate-900`}>{est.nombre}</td>
                      <td className={TABLA_TD}>{est.correo}</td>
                      <td className={`${TABLA_TD} text-right`}>
                        <button type="button" className={BOTON_SECUNDARIO_SM} onClick={() => agregarMiembro(est)}>
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Agregar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </Tabla>
              <p className="text-xs leading-relaxed text-slate-500">
                Se muestran estudiantes de Ingeniería de Sistemas con rol activo que todavía no pertenecen a otro equipo. Al
                presionar "+ Agregar", pasan a la lista de integrantes del equipo.
              </p>
            </div>

            <AvisoPanel aviso={status === "success" ? { tipo: "exito", titulo: "¡Tu equipo se registró exitosamente!" } : null} />
            <AvisoPanel aviso={status === "error" ? { tipo: "error", titulo: serverError } : null} />

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              {onCancelar && (
                <button type="button" className={BOTON_SECUNDARIO} onClick={onCancelar}>
                  Cancelar
                </button>
              )}
              <button type="submit" className={BOTON_PRIMARIO} disabled={status === "loading"}>
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {status === "loading" ? "Guardando..." : "Guardar equipo"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default EquipoForm;
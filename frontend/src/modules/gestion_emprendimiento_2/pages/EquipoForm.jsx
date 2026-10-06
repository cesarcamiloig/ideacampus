import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { fetchEstudiantes, registerEquipo, obtenerMisIniciativasAprobadas } from "../services/equipoService";
import "./EquipoForm.css";

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
    <div className={showHeader ? "equipo-page" : "w-full"}>
      {showHeader && (
        <header className="equipo-header">
          <div className="equipo-brand">
            <div className="equipo-brand-mark">U</div>
            <div>
              <div className="equipo-brand-name">GENNOVA</div>
              <div className="equipo-brand-sub">Universidad Francisco de Paula Santander</div>
            </div>
          </div>
          <span className="equipo-breadcrumb">HU-04 · Equipo Emprendedor</span>
        </header>
      )}

      <main className="equipo-layout" style={!showHeader ? { padding: "0", maxWidth: "100%" } : undefined}>
        <aside className="equipo-aside">
          <h1>Registra tu equipo</h1>
          <p className="equipo-aside-text">
            Como líder, agrega a cada integrante para formalizar la
            participación colectiva de tu iniciativa de innovación aprobada.
          </p>

          <div className="equipo-steps">
            <div className="equipo-step">
              <span className="equipo-step-number">1</span>
              <div>
                <div className="equipo-step-title">Iniciativa Aprobada</div>
                <div className="equipo-step-desc">Asociada directamente a tu postulación aprobada.</div>
              </div>
            </div>
            <div className="equipo-step">
              <span className="equipo-step-number">2</span>
              <div>
                <div className="equipo-step-title">Datos del equipo</div>
                <div className="equipo-step-desc">Nombre y verificación institucional.</div>
              </div>
            </div>
            <div className="equipo-step">
              <span className="equipo-step-number">3</span>
              <div>
                <div className="equipo-step-title">Integrantes</div>
                <div className="equipo-step-desc">Busca y agrega estudiantes registrados.</div>
              </div>
            </div>
          </div>

          <div className="equipo-required-note">
            Se requiere al menos <span>1 integrante</span> además del líder para registrar el equipo.
          </div>
        </aside>

        <section className="equipo-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="equipo-section-label">Iniciativa Aprobada Vinculada</div>
            <div style={{ marginBottom: 20, padding: 14, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
              {iniciativas.length > 1 ? (
                <div className="equipo-field">
                  <label htmlFor="selectIniciativa">
                    Selecciona tu iniciativa aprobada <span className="required">*</span>
                  </label>
                  <select
                    id="selectIniciativa"
                    value={idIniciativa || ""}
                    onChange={(e) => setIdIniciativa(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.875rem" }}
                  >
                    {iniciativas.map((ini) => (
                      <option key={ini.id_iniciativa} value={ini.id_iniciativa}>
                        {ini.titulo} {ini.radicado ? `(${ini.radicado})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : iniciativas.length === 1 ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
                      {iniciativas[0].titulo}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
                      {iniciativas[0].radicado ? `Radicado: ${iniciativas[0].radicado} • ` : ""}
                      {iniciativas[0].convocatoria_nombre ? `Convocatoria: ${iniciativas[0].convocatoria_nombre}` : ""}
                    </div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#dcfce7", color: "#15803d", borderRadius: 9999, fontSize: "0.75rem", fontWeight: 700 }}>
                    <CheckCircle2 size={13} /> Aprobada
                  </span>
                </div>
              ) : (
                <div style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
                  No tienes iniciativas aprobadas disponibles para crear un equipo.
                </div>
              )}
              {errors.idIniciativa && (
                <span className="equipo-error" role="alert" style={{ marginTop: 6, display: "block" }}>
                  {errors.idIniciativa}
                </span>
              )}
            </div>

            <div className="equipo-section-label">Datos del equipo</div>
            <div className="equipo-field-grid">
              <div className="equipo-field">
                <label htmlFor="nombreEquipo">
                  Nombre del equipo <span className="required">*</span>
                </label>
                <input
                  id="nombreEquipo"
                  type="text"
                  placeholder="Ej. EcoSoluciones UFPS"
                  value={nombreEquipo}
                  onChange={(e) => setNombreEquipo(e.target.value)}
                  aria-invalid={Boolean(errors.nombreEquipo)}
                />
                {errors.nombreEquipo && (
                  <span className="equipo-error" role="alert">{errors.nombreEquipo}</span>
                )}
              </div>
              <div className="equipo-field">
                <label htmlFor="estudianteLider">Líder responsable</label>
                <input
                  id="estudianteLider"
                  type="text"
                  value={`${usuario?.nombre || "Estudiante"} (${usuario?.correo || ""})`}
                  disabled
                />
              </div>
            </div>

            <div className="equipo-section-label">Integrantes del equipo</div>
            <div className="equipo-members">
              {miembros.map((m) => (
                <div key={m.id} className={`equipo-member-row${m.esLider ? " equipo-member-row--lider" : ""}`}>
                  <div className="equipo-avatar">{iniciales(m.nombre)}</div>
                  <div>
                    <div className="equipo-member-name">{m.nombre}</div>
                    <div className="equipo-member-email">{m.correo}</div>
                  </div>
                  {m.esLider ? (
                    <span className="equipo-badge-lider">Líder</span>
                  ) : (
                    <button
                      type="button"
                      className="equipo-remove-btn"
                      onClick={() => quitarMiembro(m.id)}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.miembros && (
              <span className="equipo-error" role="alert">{errors.miembros}</span>
            )}

            <div className="equipo-section-label" style={{ marginTop: 28 }}>
              Agregar estudiante registrado
            </div>
            <input
              type="text"
              className="equipo-search"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <div className="equipo-table-wrap">
              {cargandoEstudiantes ? (
                <p className="equipo-table-msg">Cargando estudiantes disponibles...</p>
              ) : errorEstudiantes ? (
                <p className="equipo-table-msg equipo-table-msg--error">{errorEstudiantes}</p>
              ) : estudiantesFiltrados.length === 0 ? (
                <p className="equipo-table-msg">
                  {busqueda.trim()
                    ? "No hay estudiantes que coincidan con la búsqueda."
                    : "No hay más estudiantes activos disponibles para agregar."}
                </p>
              ) : (
                <table className="equipo-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo institucional</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesFiltrados.map((est) => (
                      <tr key={est.id}>
                        <td>{est.nombre}</td>
                        <td>{est.correo}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="equipo-add-btn"
                            onClick={() => agregarMiembro(est)}
                          >
                            + Agregar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="equipo-table-hint">
              Se muestran estudiantes de Ingeniería de Sistemas con rol activo que todavía no pertenecen
              a otro equipo. Al presionar "+ Agregar", pasan a la lista de integrantes del equipo.
            </p>

            <div className="equipo-actions">
              {onCancelar && (
                <button
                  type="button"
                  className="equipo-cancel"
                  onClick={onCancelar}
                >
                  Cancelar
                </button>
              )}
              <button type="submit" className="equipo-submit" disabled={status === "loading"}>
                {status === "loading" ? "Guardando..." : "Guardar equipo"}
              </button>
            </div>

            {status === "success" && (
              <p className="equipo-success">¡Tu equipo se registró exitosamente!</p>
            )}
            {status === "error" && (
              <p className="equipo-error-banner" role="alert">{serverError}</p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

export default EquipoForm;
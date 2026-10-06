import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { fetchEstudiantes, registerEquipo } from "../services/equipoService";
import "./EquipoForm.css";

const MIN_INTEGRANTES = 2;

function EquipoForm({ onEquipoCreado, onCancelar, showHeader = false }) {
  const { usuario } = useAuth();

  const [nombreEquipo, setNombreEquipo] = useState("");
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
            participación colectiva de tu iniciativa de innovación.
          </p>

          <div className="equipo-steps">
            <div className="equipo-step">
              <span className="equipo-step-number">1</span>
              <div>
                <div className="equipo-step-title">Datos del equipo</div>
                <div className="equipo-step-desc">Nombre del equipo y verificación institucional.</div>
              </div>
            </div>
            <div className="equipo-step">
              <span className="equipo-step-number">2</span>
              <div>
                <div className="equipo-step-title">Integrantes</div>
                <div className="equipo-step-desc">Busca y agrega estudiantes ya registrados en la plataforma.</div>
              </div>
            </div>
            <div className="equipo-step equipo-step-last">
              <span className="equipo-step-number">3</span>
              <div>
                <div className="equipo-step-title">Confirmación</div>
                <div className="equipo-step-desc">Revisa la lista y guarda tu equipo formalizado.</div>
              </div>
            </div>
          </div>

          <div className="equipo-required-note">
            Se requiere al menos <span>1 integrante</span> además del líder para registrar el equipo.
          </div>
        </aside>

        <section className="equipo-card">
          <form onSubmit={handleSubmit} noValidate>
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
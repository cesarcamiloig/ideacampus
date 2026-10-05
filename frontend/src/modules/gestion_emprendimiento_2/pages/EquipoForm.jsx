import { useEffect, useMemo, useState } from "react";
import { getUsuario } from "../../gestion_administrativa/services/authService";
import { fetchEstudiantes, registerEquipo } from "../services/equipoService";
import "./EquipoForm.css";

const MIN_INTEGRANTES = 2;

function EquipoForm() {
  const usuario = getUsuario();

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
        const data = await fetchEstudiantes();
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
  }, []);

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
    }
    const integrantesSinLider = miembros.filter((m) => !m.esLider).length;
    if (integrantesSinLider < MIN_INTEGRANTES) {
      nuevosErrores.miembros = `Agrega al menos ${MIN_INTEGRANTES} integrantes además del líder.`;
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
      await registerEquipo({
        nombre_equipo: nombreEquipo,
        id_usuario_lider: usuario.id_usuario,
        id_usuarios: miembros.map((m) => m.id),
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
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
    <div className="equipo-page">
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

      <main className="equipo-layout">
        <aside className="equipo-aside">
          <h1>Registra tu equipo</h1>
          <p className="equipo-aside-text">
            Como líder, agrega a cada integrante para formalizar la
            participación colectiva de tu iniciativa.
          </p>

          <div className="equipo-steps">
            <div className="equipo-step">
              <span className="equipo-step-number">1</span>
              <div>
                <div className="equipo-step-title">Datos del equipo</div>
                <div className="equipo-step-desc">Nombre del equipo y la iniciativa a la que pertenece.</div>
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
                <div className="equipo-step-desc">Revisa la lista y guarda tu equipo.</div>
              </div>
            </div>
          </div>

          <div className="equipo-required-note">
            Se requieren al menos <span>{MIN_INTEGRANTES} integrantes</span> además
            del líder para registrar el equipo.
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
                <label htmlFor="iniciativa">Iniciativa asociada</label>
                <input
                  id="iniciativa"
                  type="text"
                  value={usuario?.iniciativa_nombre || "Sin iniciativa asignada"}
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
                <p className="equipo-table-msg">Cargando estudiantes...</p>
              ) : errorEstudiantes ? (
                <p className="equipo-table-msg equipo-table-msg--error">{errorEstudiantes}</p>
              ) : estudiantesFiltrados.length === 0 ? (
                <p className="equipo-table-msg">
                  {busqueda.trim()
                    ? "No hay estudiantes que coincidan con la búsqueda."
                    : "No hay estudiantes activos disponibles para agregar."}
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
              Se muestran estudiantes con rol activo que todavía no pertenecen
              a otro equipo. Al presionar "Agregar", pasan a la lista de
              integrantes de arriba.
            </p>

            <div className="equipo-actions">
              <button type="button" className="equipo-cancel">Cancelar</button>
              <button type="submit" className="equipo-submit" disabled={status === "loading"}>
                {status === "loading" ? "Guardando..." : "Guardar equipo"}
              </button>
            </div>

            {status === "success" && (
              <p className="equipo-success">Tu equipo se guardó correctamente.</p>
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
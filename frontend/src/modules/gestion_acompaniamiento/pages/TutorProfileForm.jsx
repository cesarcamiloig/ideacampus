import { useState } from "react";
import { getUsuario } from "../../gestion_administrativa/services/authService";
import { registerTutorProfile } from "../services/tutorService";
import "./TutorProfileForm.css";

const NIVELES_ACADEMICOS = ["Pregrado", "Especializacion", "Maestria", "Doctorado"];

const STEPS = [
  { number: 1, title: "Área y nivel", subtitle: "Tu especialización y formación, para emparejarte con iniciativas afines." },
  { number: 2, title: "Experiencia", subtitle: "Años acompañando proyectos o emprendimientos." },
  { number: 3, title: "Presentación", subtitle: "Una breve biografía y, si quieres, tu CV o LinkedIn." },
];

const initialState = {
  areaEspecializacion: "",
  nivelAcademico: "",
  aniosExperiencia: "",
  biografia: "",
  enlacePerfil: "",
  disponibilidad: "",
};

function validate(form, esMentor) {
  const errors = {};
  if (!form.areaEspecializacion.trim()) {
    errors.areaEspecializacion = "Indica tu área de conocimiento o especialización.";
  }
  if (!form.nivelAcademico) {
    errors.nivelAcademico = "Selecciona tu nivel académico.";
  }
  if (form.aniosExperiencia === "" || Number(form.aniosExperiencia) < 0) {
    errors.aniosExperiencia = "Ingresa un número válido de años de experiencia.";
  }
  if (esMentor && !form.disponibilidad.trim()) {
    errors.disponibilidad = "Indica tu disponibilidad.";
  }
  return errors;
}

function ChevronDown() {
  return (
    <svg className="tutor-select-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TutorProfileForm() {
  const usuario = getUsuario();
  const esMentor = usuario?.rol === "mentor";

  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form, esMentor);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("loading");
    setServerError("");
    try {
      await registerTutorProfile({
        nombre: usuario?.nombre || "",
        correo: usuario?.correo || "",
        area_especializacion: form.areaEspecializacion,
        nivel_academico: form.nivelAcademico.toLowerCase(),
        anios_experiencia: Number(form.aniosExperiencia),
        biografia: form.biografia,
        enlace_perfil: form.enlacePerfil,
        ...(esMentor && { disponibilidad: form.disponibilidad }),
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
    }
  }

  return (
    <div className="tutor-page">
      <header className="tutor-header">
        <div className="tutor-brand">
          <div className="tutor-brand-mark">U</div>
          <div>
            <div className="tutor-brand-name">GENNOVA</div>
            <div className="tutor-brand-sub">Universidad Francisco de Paula Santander</div>
          </div>
        </div>
        <span className="tutor-breadcrumb">
          HU-16 · Perfil de {esMentor ? "Mentor" : "Tutor"}
        </span>
      </header>

      <main className="tutor-layout">
        <aside className="tutor-aside">
          <h1>Completa tu perfil académico</h1>
          <p className="tutor-aside-text">
            Esta información se usa para asignarte a iniciativas acordes a tu
            área y experiencia. Puedes actualizarla cuando quieras.
          </p>

          <div className="tutor-steps">
            {STEPS.map((step) => (
              <div key={step.number} className="tutor-step">
                <span className="tutor-step-number">{step.number}</span>
                <div>
                  <div className="tutor-step-title">{step.title}</div>
                  <div className="tutor-step-desc">{step.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="tutor-required-note">
            <p>
              Los campos marcados con <span>*</span> son obligatorios para
              poder asignarte a una iniciativa.
            </p>
          </div>
        </aside>

        <section className="tutor-card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="tutor-section-label">Cuenta institucional</div>
            <div className="tutor-grid-2">
              <div className="tutor-field">
                <label htmlFor="nombre">Nombre completo</label>
                <input id="nombre" type="text" value={usuario?.nombre || ""} disabled />
              </div>
              <div className="tutor-field">
                <label htmlFor="correo">Correo institucional</label>
                <input id="correo" type="text" value={usuario?.correo || ""} disabled />
              </div>
            </div>

            <div className="tutor-section-label">Perfil académico</div>

            <div className="tutor-field">
              <label htmlFor="areaEspecializacion">
                Área de conocimiento o especialización <span className="required">*</span>
              </label>
              <input
                id="areaEspecializacion"
                name="areaEspecializacion"
                type="text"
                placeholder="Ej. Desarrollo de software, Finanzas, Marketing digital"
                value={form.areaEspecializacion}
                onChange={handleChange}
                aria-invalid={Boolean(errors.areaEspecializacion)}
              />
              <span className="tutor-hint">Esta es la base para asignarte iniciativas afines.</span>
              {errors.areaEspecializacion && (
                <span className="tutor-error" role="alert">{errors.areaEspecializacion}</span>
              )}
            </div>

            <div className="tutor-grid-2">
              <div className="tutor-field">
                <label htmlFor="nivelAcademico">
                  Nivel académico <span className="required">*</span>
                </label>
                <div className="tutor-select-wrap">
                  <select
                    id="nivelAcademico"
                    name="nivelAcademico"
                    value={form.nivelAcademico}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.nivelAcademico)}
                  >
                    <option value="">Selecciona una opción</option>
                    {NIVELES_ACADEMICOS.map((nivel) => (
                      <option key={nivel} value={nivel}>{nivel}</option>
                    ))}
                  </select>
                  <ChevronDown />
                </div>
                {errors.nivelAcademico && (
                  <span className="tutor-error" role="alert">{errors.nivelAcademico}</span>
                )}
              </div>
              <div className="tutor-field">
                <label htmlFor="aniosExperiencia">
                  Años de experiencia <span className="required">*</span>
                </label>
                <input
                  id="aniosExperiencia"
                  name="aniosExperiencia"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="0"
                  value={form.aniosExperiencia}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.aniosExperiencia)}
                />
                {errors.aniosExperiencia && (
                  <span className="tutor-error" role="alert">{errors.aniosExperiencia}</span>
                )}
              </div>
            </div>

            {esMentor && (
              <div className="tutor-field">
                <label htmlFor="disponibilidad">
                  Disponibilidad <span className="required">*</span>
                </label>
                <input
                  id="disponibilidad"
                  name="disponibilidad"
                  type="text"
                  placeholder="Ej. Martes y jueves en la tarde"
                  value={form.disponibilidad}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.disponibilidad)}
                />
                <span className="tutor-hint">Días y horarios en los que puedes acompañar iniciativas.</span>
                {errors.disponibilidad && (
                  <span className="tutor-error" role="alert">{errors.disponibilidad}</span>
                )}
              </div>
            )}

            <div className="tutor-field">
              <label htmlFor="biografia">Biografía o resumen profesional</label>
              <textarea
                id="biografia"
                name="biografia"
                rows={4}
                placeholder="Cuéntanos brevemente tu trayectoria como mentor o tutor..."
                value={form.biografia}
                onChange={handleChange}
              />
              <span className="tutor-hint">Opcional · visible para quien revise tu asignación.</span>
            </div>

            <div className="tutor-field">
              <label htmlFor="enlacePerfil">Enlace a CV o LinkedIn</label>
              <input
                id="enlacePerfil"
                name="enlacePerfil"
                type="url"
                placeholder="https://"
                value={form.enlacePerfil}
                onChange={handleChange}
              />
              <span className="tutor-hint">Opcional.</span>
            </div>

            <div className="tutor-actions">
              <button type="button" className="tutor-cancel">Cancelar</button>
              <button type="submit" className="tutor-submit" disabled={status === "loading"}>
                {status === "loading" ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>

            {status === "success" && (
              <p className="tutor-success">Tu perfil se guardó correctamente.</p>
            )}
            {status === "error" && (
              <p className="tutor-error-banner" role="alert">{serverError}</p>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}

export default TutorProfileForm;
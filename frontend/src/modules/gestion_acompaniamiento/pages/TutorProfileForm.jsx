import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Save } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getCachedTutorProfile,
  getTutorProfile,
  registerTutorProfile,
} from "../services/tutorService";

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

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 aria-[invalid=true]:border-red-500";
const READONLY_CLASS =
  "w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500";
const LABEL_CLASS = "text-xs font-semibold text-slate-700";
const HINT_CLASS = "text-[11px] text-slate-500";
const ERROR_CLASS = "text-xs font-medium text-red-600";
const SECTION_CLASS =
  "mb-4 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-red-600";

function mapProfileToForm(perfil, esMentor) {
  if (!perfil) return initialState;

  const nivelAcademico = NIVELES_ACADEMICOS.find(
    (nivel) => nivel.toLowerCase() === perfil.nivel_academico?.toLowerCase()
  ) || "";

  return {
    areaEspecializacion: (esMentor
      ? perfil.area_especializacion
      : perfil.area_conocimiento) || "",
    nivelAcademico,
    aniosExperiencia: perfil.anios_experiencia ?? "",
    biografia: perfil.biografia || "",
    enlacePerfil: perfil.enlace_perfil || "",
    disponibilidad: perfil.disponibilidad || "",
  };
}

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

function Required() {
  return <span className="text-red-600">*</span>;
}

function TutorProfileForm() {
  const { usuario } = useAuth();
  const rolActivo = usuario?.rol?.trim().toLowerCase();
  const esMentor = rolActivo === "mentor";
  const hasEditedForm = useRef(false);

  const [form, setForm] = useState(() =>
    mapProfileToForm(
      getCachedTutorProfile(rolActivo, usuario?.id_usuario),
      esMentor
    )
  );
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");
  const [profileLoadError, setProfileLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setProfileLoadError("");
      try {
        const perfil = await getTutorProfile(rolActivo, usuario?.id_usuario);
        if (cancelled) return;
        if (!hasEditedForm.current) {
          setForm(mapProfileToForm(perfil, esMentor));
        }
      } catch (err) {
        if (!cancelled) {
          setProfileLoadError(err.message || "No se pudo cargar el perfil.");
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [esMentor, rolActivo, usuario?.id_usuario]);

  function handleChange(e) {
    const { name, value } = e.target;
    hasEditedForm.current = true;
    setForm((prev) => ({ ...prev, [name]: value }));
    setStatus("idle");
  }

  function handleCancel() {
    hasEditedForm.current = false;
    setForm(
      mapProfileToForm(
        getCachedTutorProfile(rolActivo, usuario?.id_usuario),
        esMentor
      )
    );
    setErrors({});
    setStatus("idle");
    setServerError("");
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
        ...(esMentor
          ? { area_especializacion: form.areaEspecializacion }
          : { area_conocimiento: form.areaEspecializacion }),
        nivel_academico: form.nivelAcademico.toLowerCase(),
        anios_experiencia: Number(form.aniosExperiencia),
        biografia: form.biografia,
        enlace_perfil: form.enlacePerfil,
        ...(esMentor && { disponibilidad: form.disponibilidad }),
      }, rolActivo, usuario?.id_usuario);
      hasEditedForm.current = false;
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {esMentor ? "Mi Perfil Profesional" : "Mi Perfil Académico"}
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Esta información se usa para asignarte a iniciativas acordes a tu área y
        experiencia. Puedes actualizarla cuando quieras.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Guía del formulario */}
        <aside className="h-fit space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">¿Qué debes completar?</h3>
          <ol className="space-y-4">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600 ring-1 ring-red-200">
                  {step.number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{step.subtitle}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-lg border border-slate-100 bg-[#f4f5f7] p-3 text-xs leading-relaxed text-slate-600">
            Los campos marcados con <Required /> son obligatorios para poder
            asignarte a una iniciativa.
          </p>
        </aside>

        {/* Formulario */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            <div>
              <h2 className={SECTION_CLASS}>Cuenta institucional</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="nombre" className={LABEL_CLASS}>Nombre completo</label>
                  <input id="nombre" type="text" value={usuario?.nombre || ""} disabled className={READONLY_CLASS} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="correo" className={LABEL_CLASS}>Correo institucional</label>
                  <input id="correo" type="text" value={usuario?.correo || ""} disabled className={READONLY_CLASS} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className={SECTION_CLASS}>
                {esMentor ? "Perfil profesional" : "Perfil académico"}
              </h2>

              {profileLoadError && (
                <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {profileLoadError}
                </p>
              )}

              <div className="space-y-1">
                <label htmlFor="areaEspecializacion" className={LABEL_CLASS}>
                  Área de conocimiento o especialización <Required />
                </label>
                <input
                  id="areaEspecializacion"
                  name="areaEspecializacion"
                  type="text"
                  placeholder="Ej. Desarrollo de software, Finanzas, Marketing digital"
                  value={form.areaEspecializacion}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.areaEspecializacion)}
                  className={INPUT_CLASS}
                />
                <p className={HINT_CLASS}>Esta es la base para asignarte iniciativas afines.</p>
                {errors.areaEspecializacion && (
                  <p className={ERROR_CLASS} role="alert">{errors.areaEspecializacion}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="nivelAcademico" className={LABEL_CLASS}>
                    Nivel académico <Required />
                  </label>
                  <div className="relative">
                    <select
                      id="nivelAcademico"
                      name="nivelAcademico"
                      value={form.nivelAcademico}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.nivelAcademico)}
                      className={`${INPUT_CLASS} appearance-none pr-9`}
                    >
                      <option value="">Selecciona una opción</option>
                      {NIVELES_ACADEMICOS.map((nivel) => (
                        <option key={nivel} value={nivel}>{nivel}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {errors.nivelAcademico && (
                    <p className={ERROR_CLASS} role="alert">{errors.nivelAcademico}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label htmlFor="aniosExperiencia" className={LABEL_CLASS}>
                    Años de experiencia <Required />
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
                    className={INPUT_CLASS}
                  />
                  {errors.aniosExperiencia && (
                    <p className={ERROR_CLASS} role="alert">{errors.aniosExperiencia}</p>
                  )}
                </div>
              </div>

              {esMentor && (
                <div className="space-y-1">
                  <label htmlFor="disponibilidad" className={LABEL_CLASS}>
                    Disponibilidad <Required />
                  </label>
                  <input
                    id="disponibilidad"
                    name="disponibilidad"
                    type="text"
                    placeholder="Ej. Martes y jueves en la tarde"
                    value={form.disponibilidad}
                    onChange={handleChange}
                    aria-invalid={Boolean(errors.disponibilidad)}
                    className={INPUT_CLASS}
                  />
                  <p className={HINT_CLASS}>Días y horarios en los que puedes acompañar iniciativas.</p>
                  {errors.disponibilidad && (
                    <p className={ERROR_CLASS} role="alert">{errors.disponibilidad}</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="biografia" className={LABEL_CLASS}>Biografía o resumen profesional</label>
                <textarea
                  id="biografia"
                  name="biografia"
                  rows={4}
                  placeholder="Cuéntanos brevemente tu trayectoria como mentor o tutor..."
                  value={form.biografia}
                  onChange={handleChange}
                  className={`${INPUT_CLASS} resize-none`}
                />
                <p className={HINT_CLASS}>Opcional · visible para quien revise tu asignación.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="enlacePerfil" className={LABEL_CLASS}>Enlace a CV o LinkedIn</label>
                <input
                  id="enlacePerfil"
                  name="enlacePerfil"
                  type="url"
                  placeholder="https://"
                  value={form.enlacePerfil}
                  onChange={handleChange}
                  className={INPUT_CLASS}
                />
                <p className={HINT_CLASS}>Opcional.</p>
              </div>
            </div>

            {status === "success" && (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Tu perfil se guardó correctamente.
              </p>
            )}
            {status === "error" && (
              <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center gap-2 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {status === "loading" ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default TutorProfileForm;

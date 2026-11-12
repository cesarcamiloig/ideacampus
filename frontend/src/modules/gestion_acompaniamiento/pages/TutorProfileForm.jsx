import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, Save } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getCachedTutorProfile,
  getTutorProfile,
  registerTutorProfile,
} from "../services/tutorService";
import {
  AYUDA,
  AvisoPanel,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  EncabezadoPagina,
  ETIQUETA,
  ErrorGeneral,
  Pagina,
  ROTULO,
  SECCION,
  TARJETA,
} from "../../../components/ui";

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

// Clases del sistema visual compartido (components/ui)
const INPUT_CLASS = CAMPO;
const READONLY_CLASS = CAMPO;
const LABEL_CLASS = ETIQUETA;
const HINT_CLASS = AYUDA;
const ERROR_CLASS = "text-xs font-medium text-ufps";
const SECTION_CLASS = `mb-4 border-b border-slate-100 pb-2 ${ROTULO}`;

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

const MAX_ANIOS = 60;
const MENSAJE_ENLACE = "Escribe un enlace completo que empiece por http:// o https://, por ejemplo https://linkedin.com/in/tu-perfil.";

function esEnlaceValido(valor) {
  try {
    const url = new URL(valor);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

// Campo del backend → campo del formulario, para mostrar cada error junto a su campo
const CAMPOS_BACKEND = {
  area_conocimiento: "areaEspecializacion",
  area_especializacion: "areaEspecializacion",
  nivel_academico: "nivelAcademico",
  anios_experiencia: "aniosExperiencia",
  biografia: "biografia",
  enlace_perfil: "enlacePerfil",
  disponibilidad: "disponibilidad",
};

function aTexto(valor) {
  return Array.isArray(valor) ? valor.join(" ") : String(valor);
}

// Traduce el error del servidor: los 400 van a su campo; el mensaje general solo para fallas reales
function erroresDelServidor(err) {
  if (err?.status === 400 && err.data && typeof err.data === "object") {
    const campos = {};
    const generales = [];
    Object.entries(err.data).forEach(([campo, valor]) => {
      const destino = CAMPOS_BACKEND[campo];
      if (destino === "enlacePerfil") campos.enlacePerfil = MENSAJE_ENLACE;
      else if (destino) campos[destino] = aTexto(valor);
      else generales.push(aTexto(valor));
    });
    return { campos, general: generales.join(" ") };
  }
  if (!err?.status) {
    return { campos: {}, general: "No pudimos conectarnos con el servidor. Revisa tu conexión e inténtalo de nuevo." };
  }
  if (err.status >= 500) {
    return { campos: {}, general: "El servidor tuvo un problema al guardar tu perfil. Inténtalo de nuevo en unos minutos." };
  }
  return { campos: {}, general: err.message || "No se pudo guardar tu perfil." };
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
  } else if (Number(form.aniosExperiencia) > MAX_ANIOS) {
    errors.aniosExperiencia = `Los años de experiencia no pueden ser más de ${MAX_ANIOS}.`;
  }
  if (form.enlacePerfil.trim() && !esEnlaceValido(form.enlacePerfil.trim())) {
    errors.enlacePerfil = MENSAJE_ENLACE;
  }
  if (esMentor && !form.disponibilidad.trim()) {
    errors.disponibilidad = "Indica tu disponibilidad.";
  }
  return errors;
}

function Required() {
  return <span className="text-ufps">*</span>;
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
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
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
        enlace_perfil: form.enlacePerfil.trim(),
        ...(esMentor && { disponibilidad: form.disponibilidad }),
      }, rolActivo, usuario?.id_usuario);
      hasEditedForm.current = false;
      setStatus("success");
    } catch (err) {
      const { campos, general } = erroresDelServidor(err);
      setErrors(campos);
      setServerError(general);
      setStatus(general ? "error" : "idle");
    }
  }

  return (
    <Pagina>
      <EncabezadoPagina
        seccion={esMentor ? "Mentoría" : "Tutoría académica"}
        titulo={esMentor ? "Mi Perfil Profesional" : "Mi Perfil Académico"}
        descripcion="Esta información se usa para asignarte a iniciativas acordes a tu área y experiencia. Puedes actualizarla cuando quieras."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Guía del formulario */}
        <aside className={`${TARJETA} h-fit space-y-5 p-5 sm:p-6`}>
          <div>
            <p className={SECCION}>Guía</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">¿Qué debes completar?</h3>
          </div>
          <ol className="space-y-4">
            {STEPS.map((step) => (
              <li key={step.number} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ufps text-xs font-semibold text-white">
                  {step.number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{step.subtitle}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            Los campos marcados con <Required /> son obligatorios para poder
            asignarte a una iniciativa.
          </p>
        </aside>

        {/* Formulario */}
        <section className={`${TARJETA} p-5 sm:p-6 lg:col-span-2`}>
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

              <ErrorGeneral mensaje={profileLoadError} />

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
                      className={`${INPUT_CLASS} appearance-none pr-10`}
                    >
                      <option value="">Selecciona una opción</option>
                      {NIVELES_ACADEMICOS.map((nivel) => (
                        <option key={nivel} value={nivel}>{nivel}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
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
                    max={MAX_ANIOS}
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
                  aria-invalid={Boolean(errors.biografia)}
                  className={`${INPUT_CLASS} resize-none`}
                />
                <p className={HINT_CLASS}>Opcional · visible para quien revise tu asignación.</p>
                {errors.biografia && (
                  <p className={ERROR_CLASS} role="alert">{errors.biografia}</p>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="enlacePerfil" className={LABEL_CLASS}>Enlace a CV o LinkedIn</label>
                <input
                  id="enlacePerfil"
                  name="enlacePerfil"
                  type="url"
                  placeholder="https://linkedin.com/in/tu-perfil"
                  value={form.enlacePerfil}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.enlacePerfil)}
                  aria-describedby={errors.enlacePerfil ? "enlacePerfil-error" : undefined}
                  className={INPUT_CLASS}
                />
                {errors.enlacePerfil ? (
                  <p id="enlacePerfil-error" className={ERROR_CLASS} role="alert">{errors.enlacePerfil}</p>
                ) : (
                  <p className={HINT_CLASS}>Opcional. Puedes dejarlo vacío.</p>
                )}
              </div>
            </div>

            <AvisoPanel aviso={status === "success" ? { tipo: "exito", titulo: "Tu perfil se guardó correctamente." } : null} />
            <AvisoPanel aviso={status === "error" ? { tipo: "error", titulo: serverError } : null} />

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCancel} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button type="submit" disabled={status === "loading"} className={BOTON_PRIMARIO}>
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {status === "loading" ? "Guardando..." : "Guardar perfil"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </Pagina>
  );
}

export default TutorProfileForm;

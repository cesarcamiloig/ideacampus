import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Link2, Save, Upload, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { registerEvidencia } from "../services/evidenciaService";

// TODO: confirmar con el PO/backend la lista oficial de etapas
const ETAPAS = ["Ideación", "Validación", "Prototipo", "Lanzamiento"];
const TIPOS = ["Documento", "Enlace", "Prototipo", "Presentación"];
const EXTENSIONES = ["pdf", "docx", "pptx", "png", "jpg", "jpeg"];
const MAX_MB = 10;

const ETIQUETA_POR_EXT = { pdf: "PDF", docx: "DOC", pptx: "PPT", png: "IMG", jpg: "IMG", jpeg: "IMG" };

const STEPS = [
  { number: 1, title: "Etapa y datos", subtitle: "Indica la etapa que finalizaste y describe el avance." },
  { number: 2, title: "Evidencias", subtitle: "Sube archivos o agrega enlaces según el tipo." },
  { number: 3, title: "Confirmación", subtitle: "Revisa lo adjuntado y guarda." },
];

// text-base en móvil: Safari de iPhone hace zoom automático en inputs con fuente menor a 16px
const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 aria-[invalid=true]:border-red-500";
const READONLY_CLASS =
  "w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500";
const LABEL_CLASS = "text-xs font-semibold text-slate-700";
const HINT_CLASS = "text-[11px] text-slate-500";
const ERROR_CLASS = "text-xs font-medium text-red-600";
const SECTION_CLASS =
  "mb-4 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-wider text-red-600";
const OUTLINE_BUTTON_CLASS =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-600 bg-white px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionDe(nombre) {
  return nombre.split(".").pop().toLowerCase();
}

function nuevoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function esUrlValida(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function Required() {
  return <span className="text-red-600">*</span>;
}

function EvidenciaForm() {
  const { usuario } = useAuth();
  const inputArchivoRef = useRef(null);

  const [etapa, setEtapa] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("Documento");
  const [evidencias, setEvidencias] = useState([]);
  const [enlace, setEnlace] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const [errors, setErrors] = useState({});
  const [archivoError, setArchivoError] = useState("");
  const [enlaceError, setEnlaceError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [serverError, setServerError] = useState("");

  function agregarArchivos(lista) {
    const nuevos = [];
    const problemas = [];

    Array.from(lista).forEach((file) => {
      const ext = extensionDe(file.name);
      if (!EXTENSIONES.includes(ext)) {
        problemas.push(`"${file.name}": formato no permitido.`);
      } else if (file.size > MAX_MB * 1024 * 1024) {
        problemas.push(`"${file.name}": supera los ${MAX_MB} MB.`);
      } else {
        nuevos.push({
          id: nuevoId(),
          tipo,
          nombre: file.name,
          detalle: `${tipo} · ${formatSize(file.size)}`,
          etiqueta: ETIQUETA_POR_EXT[ext] || "ARCH",
          file,
          url: null,
        });
      }
    });

    setArchivoError(problemas.join(" "));
    if (nuevos.length > 0) {
      setEvidencias((prev) => [...prev, ...nuevos]);
      setErrors((prev) => ({ ...prev, evidencias: undefined }));
      setStatus("idle");
    }
  }

  function handleSeleccionArchivo(e) {
    if (e.target.files?.length) agregarArchivos(e.target.files);
    e.target.value = ""; // permite volver a elegir el mismo archivo
  }

  function handleDrop(e) {
    e.preventDefault();
    setArrastrando(false);
    if (e.dataTransfer.files?.length) agregarArchivos(e.dataTransfer.files);
  }

  function agregarEnlace() {
    const valor = enlace.trim();
    if (!esUrlValida(valor)) {
      setEnlaceError("Ingresa un enlace válido que empiece con http:// o https://");
      return;
    }
    setEnlaceError("");
    setEvidencias((prev) => [
      ...prev,
      {
        id: nuevoId(),
        tipo,
        nombre: valor,
        detalle: `${tipo} · enlace`,
        etiqueta: "URL",
        file: null,
        url: valor,
      },
    ]);
    setErrors((prev) => ({ ...prev, evidencias: undefined }));
    setStatus("idle");
    setEnlace("");
  }

  function quitarEvidencia(id) {
    setEvidencias((prev) => prev.filter((ev) => ev.id !== id));
  }

  function limpiarFormulario() {
    setEtapa("");
    setTitulo("");
    setDescripcion("");
    setTipo("Documento");
    setEvidencias([]);
    setEnlace("");
    setErrors({});
    setArchivoError("");
    setEnlaceError("");
  }

  function handleCancel() {
    limpiarFormulario();
    setStatus("idle");
    setServerError("");
  }

  function validar() {
    const nuevos = {};
    if (!etapa) nuevos.etapa = "Selecciona la etapa que finalizaste.";
    if (!titulo.trim()) nuevos.titulo = "Indica un título para la evidencia.";
    if (evidencias.length === 0) nuevos.evidencias = "Adjunta al menos una evidencia (archivo o enlace).";
    return nuevos;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevos = validar();
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const formData = new FormData();
    formData.append("etapa", etapa);
    formData.append("titulo", titulo.trim());
    formData.append("descripcion", descripcion.trim());
    formData.append(
      "evidencias",
      JSON.stringify(
        evidencias.map((ev) => ({ tipo: ev.tipo, nombre: ev.nombre, url: ev.url }))
      )
    );
    evidencias
      .filter((ev) => ev.file)
      .forEach((ev) => formData.append("archivos", ev.file));

    setStatus("loading");
    setServerError("");
    try {
      await registerEvidencia(formData);
      limpiarFormulario();
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setServerError(err.message);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
          Evidencias de avance
        </span>
        <h2 className="mt-0.5 text-xl font-bold text-slate-900">
          Registra la evidencia de tu avance
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Adjunta documentos, enlaces, prototipos y presentaciones que respalden
          la trayectoria y madurez de tu iniciativa al finalizar una etapa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Guía del formulario */}
        <aside className="h-fit space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">¿Cómo registrar tu avance?</h3>
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
            Formatos: PDF, DOCX, PPTX, PNG, JPG. Máximo{" "}
            <strong className="text-slate-800">{MAX_MB} MB</strong> por archivo.
          </p>
        </aside>

        {/* Formulario */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm lg:col-span-2">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            <div className="space-y-4">
              <h3 className={SECTION_CLASS}>Datos de la evidencia</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="iniciativa" className={LABEL_CLASS}>Iniciativa</label>
                  <input
                    id="iniciativa"
                    type="text"
                    value={usuario?.iniciativa_nombre || "Sin iniciativa asignada"}
                    disabled
                    className={READONLY_CLASS}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="etapa" className={LABEL_CLASS}>
                    Etapa finalizada <Required />
                  </label>
                  <div className="relative">
                    <select
                      id="etapa"
                      value={etapa}
                      onChange={(e) => {
                        setEtapa(e.target.value);
                        setStatus("idle");
                      }}
                      aria-invalid={Boolean(errors.etapa)}
                      className={`${INPUT_CLASS} appearance-none pr-9`}
                    >
                      <option value="">Selecciona una etapa</option>
                      {ETAPAS.map((et) => (
                        <option key={et} value={et}>{et}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {errors.etapa && <p className={ERROR_CLASS} role="alert">{errors.etapa}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="titulo" className={LABEL_CLASS}>
                  Título de la evidencia <Required />
                </label>
                <input
                  id="titulo"
                  type="text"
                  placeholder="Ej. Prototipo funcional v1"
                  value={titulo}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    setStatus("idle");
                  }}
                  aria-invalid={Boolean(errors.titulo)}
                  className={INPUT_CLASS}
                />
                {errors.titulo && <p className={ERROR_CLASS} role="alert">{errors.titulo}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="descripcion" className={LABEL_CLASS}>Descripción del avance</label>
                <textarea
                  id="descripcion"
                  rows={3}
                  placeholder="Describe brevemente qué demuestra esta evidencia..."
                  value={descripcion}
                  onChange={(e) => {
                    setDescripcion(e.target.value);
                    setStatus("idle");
                  }}
                  className={`${INPUT_CLASS} resize-none`}
                />
                <p className={HINT_CLASS}>Opcional.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={SECTION_CLASS}>
                Tipo de evidencia <Required />
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tipo === t}
                    onClick={() => setTipo(t)}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${tipo === t
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-slate-50"
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setArrastrando(true);
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${arrastrando
                  ? "border-red-400 bg-red-50/60"
                  : "border-slate-200 bg-[#f4f5f7]"
                  }`}
              >
                <Upload className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-800">Arrastra tu archivo aquí</p>
                <p className="mb-4 text-xs text-slate-500">o selecciónalo desde tu equipo</p>
                <button
                  type="button"
                  onClick={() => inputArchivoRef.current?.click()}
                  className={OUTLINE_BUTTON_CLASS}
                >
                  Seleccionar archivo
                </button>
                <input
                  ref={inputArchivoRef}
                  type="file"
                  multiple
                  hidden
                  accept={EXTENSIONES.map((x) => `.${x}`).join(",")}
                  onChange={handleSeleccionArchivo}
                />
              </div>
              {archivoError && <p className={ERROR_CLASS} role="alert">{archivoError}</p>}

              <div className="space-y-1">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="url"
                    aria-label="Enlace de la evidencia"
                    placeholder="https:// (enlace a prototipo, video o carpeta)"
                    value={enlace}
                    onChange={(e) => setEnlace(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarEnlace();
                      }
                    }}
                    aria-invalid={Boolean(enlaceError)}
                    className={INPUT_CLASS}
                  />
                  <button type="button" onClick={agregarEnlace} className={OUTLINE_BUTTON_CLASS}>
                    <Link2 className="h-4 w-4" />
                    Agregar enlace
                  </button>
                </div>
                {enlaceError && <p className={ERROR_CLASS} role="alert">{enlaceError}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className={SECTION_CLASS}>Evidencias adjuntas ({evidencias.length})</h3>
              {evidencias.length === 0 ? (
                <p className="text-xs text-slate-400">Aún no has adjuntado ninguna evidencia.</p>
              ) : (
                <ul className="space-y-2">
                  {evidencias.map((ev) => (
                    <li
                      key={ev.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
                    >
                      <span className="min-w-[38px] rounded-md bg-red-50 px-2 py-1 text-center text-[10px] font-bold text-red-700">
                        {ev.etiqueta}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{ev.nombre}</p>
                        <p className="text-[11px] text-slate-500">{ev.detalle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarEvidencia(ev.id)}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Quitar evidencia"
                        aria-label={`Quitar ${ev.nombre}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.evidencias && <p className={ERROR_CLASS} role="alert">{errors.evidencias}</p>}
            </div>

            {status === "success" && (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Tu evidencia se guardó correctamente.
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
                {status === "loading" ? "Guardando..." : "Guardar evidencia"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default EvidenciaForm;

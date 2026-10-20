import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, FolderOpen, Link2, Save, Upload, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getEvidencias, registerEvidencia } from "../services/evidenciaService";
import { obtenerMiEquipo } from "../services/equipoService";
import { getHitos, getRubricas } from "../../gestion_evaluacion/services/rubricaService";
import EvidenciasCargadasPanel from "../components/EvidenciasCargadasPanel";

const TIPOS = [
  { id: "documento", label: "Documento" },
  { id: "enlace", label: "Enlace" },
  { id: "prototipo", label: "Prototipo" },
  { id: "presentacion", label: "Presentación" },
];
const EXTENSIONES = ["pdf", "docx", "pptx", "png", "jpg", "jpeg"];
const MAX_MB = 10;
const MAX_TITULO = 200;

const ETIQUETA_POR_EXT = { pdf: "PDF", docx: "DOC", pptx: "PPT", png: "IMG", jpg: "IMG", jpeg: "IMG" };

// Campos del 400 que se muestran junto a su campo; el resto va al mensaje general
const CAMPOS_ERROR = ["proyecto", "etapa", "titulo", "descripcion", "tipo", "archivos", "enlaces"];

const STEPS = [
  { number: 1, title: "Etapa y datos", subtitle: "Indica la etapa del proyecto y describe el avance." },
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

function aTexto(valor) {
  return Array.isArray(valor) ? valor.join(" ") : String(valor);
}

// Convierte el body del 400 ({ campo: ["mensaje"] }) en { campo: "mensaje", general: "..." }
function erroresDelServidor(data) {
  if (!data || typeof data !== "object") return { general: "No se pudo guardar la evidencia." };
  const resultado = {};
  const generales = [];
  Object.entries(data).forEach(([campo, valor]) => {
    if (CAMPOS_ERROR.includes(campo)) resultado[campo] = aTexto(valor);
    else generales.push(aTexto(valor));
  });
  if (generales.length > 0) resultado.general = generales.join(" ");
  return resultado;
}

// Los hitos salen del endpoint de hitos; si aún no está disponible, de la rúbrica completa
async function cargarHitos(tipoIniciativa) {
  try {
    const hitos = await getHitos(tipoIniciativa);
    return Array.isArray(hitos) ? hitos : hitos?.results || [];
  } catch (err) {
    if (err.status !== 404) throw err;
    const rubricas = await getRubricas();
    const lista = Array.isArray(rubricas) ? rubricas : rubricas?.results || [];
    return lista.find((r) => r.tipo_iniciativa === tipoIniciativa)?.subrubricas || [];
  }
}

function Required() {
  return <span className="text-red-600">*</span>;
}

function EvidenciaForm() {
  const { logout } = useAuth();
  const inputArchivoRef = useRef(null);

  // El proyecto lleva el nombre de la iniciativa aprobada del equipo, y sus etapas son
  // los hitos de la rúbrica del mismo tipo de iniciativa (configurada en Rúbricas).
  const [proyecto, setProyecto] = useState(null); // { id, nombre, tipo }
  const [etapas, setEtapas] = useState([]);
  const [cargandoProyecto, setCargandoProyecto] = useState(true);
  const [cargandoEtapas, setCargandoEtapas] = useState(true);
  const [datosError, setDatosError] = useState("");

  const [registradas, setRegistradas] = useState([]);
  const [cargandoRegistradas, setCargandoRegistradas] = useState(true);
  const [registradasError, setRegistradasError] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);

  const [etapa, setEtapa] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("documento");
  const [adjuntos, setAdjuntos] = useState([]);
  const [enlace, setEnlace] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  const [errors, setErrors] = useState({});
  const [archivoError, setArchivoError] = useState("");
  const [enlaceError, setEnlaceError] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  const soloEnlaces = tipo === "enlace";
  const hayArchivos = adjuntos.some((ad) => ad.file);

  // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  // 401: token ausente o vencido → se cierra la sesión y la app vuelve al login
  const manejarErrorSesion = useCallback((err) => {
    if (err?.status === 401) {
      logoutRef.current?.();
      return true;
    }
    return false;
  }, []);

  const cargarRegistradas = useCallback(async () => {
    setCargandoRegistradas(true);
    setRegistradasError("");
    try {
      const lista = await getEvidencias();
      setRegistradas(lista);
      return lista;
    } catch (err) {
      if (!manejarErrorSesion(err)) {
        setRegistradasError(err.message || "No se pudieron cargar las evidencias registradas.");
      }
      return [];
    } finally {
      setCargandoRegistradas(false);
    }
  }, [manejarErrorSesion]);

  useEffect(() => {
    let activo = true;

    async function cargarDatosProyecto() {
      setDatosError("");
      try {
        const [dataEquipo, lista] = await Promise.all([obtenerMiEquipo(), cargarRegistradas()]);
        if (!activo) return;

        // El nombre del proyecto se muestra apenas llega; los hitos dependen de su tipo de iniciativa
        const equipo = dataEquipo?.equipo;
        const iniciativa = equipo?.iniciativa || null;
        const idProyecto =
          iniciativa?.id_proyecto ?? equipo?.id_proyecto ?? equipo?.proyecto?.id_proyecto ?? lista[0]?.proyecto ?? null;
        setProyecto(iniciativa ? { id: idProyecto, nombre: iniciativa.nombre, tipo: iniciativa.tipo } : null);
        setCargandoProyecto(false);

        if (!iniciativa?.tipo) return;
        const hitos = await cargarHitos(iniciativa.tipo);
        if (!activo) return;
        setEtapas([...hitos].sort((a, b) => a.numero_hito - b.numero_hito));
      } catch (err) {
        if (activo && !manejarErrorSesion(err)) {
          setDatosError(err.message || "No se pudieron cargar los datos del proyecto.");
        }
      } finally {
        if (activo) {
          setCargandoProyecto(false);
          setCargandoEtapas(false);
        }
      }
    }

    cargarDatosProyecto();
    return () => {
      activo = false;
    };
  }, [cargarRegistradas, manejarErrorSesion]);

  function limpiarErrorCampo(campo) {
    setErrors((prev) => (prev[campo] || prev.general ? { ...prev, [campo]: undefined, general: undefined } : prev));
    setStatus("idle");
  }

  function agregarArchivos(lista) {
    if (soloEnlaces) {
      setArchivoError("Con el tipo Enlace solo se aceptan enlaces.");
      return;
    }
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
          nombre: file.name,
          detalle: formatSize(file.size),
          etiqueta: ETIQUETA_POR_EXT[ext] || "ARCH",
          file,
          url: null,
        });
      }
    });

    setArchivoError(problemas.join(" "));
    if (nuevos.length > 0) {
      setAdjuntos((prev) => [...prev, ...nuevos]);
      limpiarErrorCampo("archivos");
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
    if (adjuntos.some((ad) => ad.url === valor)) {
      setEnlaceError("Ese enlace ya está en la lista.");
      return;
    }
    setEnlaceError("");
    setAdjuntos((prev) => [
      ...prev,
      { id: nuevoId(), nombre: valor, detalle: "Enlace", etiqueta: "URL", file: null, url: valor },
    ]);
    limpiarErrorCampo("enlaces");
    setEnlace("");
  }

  function quitarAdjunto(id) {
    setAdjuntos((prev) => prev.filter((ad) => ad.id !== id));
  }

  function limpiarFormulario() {
    setEtapa("");
    setTitulo("");
    setDescripcion("");
    setTipo("documento");
    setAdjuntos([]);
    setEnlace("");
    setErrors({});
    setArchivoError("");
    setEnlaceError("");
  }

  function handleCancel() {
    limpiarFormulario();
    setStatus("idle");
  }

  function validar() {
    const nuevos = {};
    if (!proyecto?.id) nuevos.proyecto = "No se encontró el proyecto de tu equipo.";
    if (!etapa) nuevos.etapa = "Selecciona la etapa del proyecto.";
    if (!titulo.trim()) nuevos.titulo = "Indica un título para la evidencia.";
    else if (titulo.trim().length > MAX_TITULO) nuevos.titulo = `El título admite máximo ${MAX_TITULO} caracteres.`;
    if (adjuntos.length === 0) nuevos.general = "Adjunta al menos una evidencia (archivo o enlace).";
    else if (soloEnlaces && hayArchivos) nuevos.archivos = "Con el tipo Enlace solo se aceptan enlaces: quita los archivos.";
    return nuevos;
  }

  const puedeGuardar =
    Boolean(proyecto?.id && etapa && titulo.trim() && tipo && adjuntos.length > 0) &&
    !(soloEnlaces && hayArchivos) &&
    status !== "loading";

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevos = validar();
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const formData = new FormData();
    formData.append("proyecto", proyecto.id);
    formData.append("etapa", etapa);
    formData.append("titulo", titulo.trim());
    formData.append("descripcion", descripcion.trim());
    formData.append("tipo", tipo);
    adjuntos.forEach((ad) => {
      if (ad.file) formData.append("archivos", ad.file);
      else if (ad.url) formData.append("enlaces", ad.url);
    });

    setStatus("loading");
    try {
      const creada = await registerEvidencia(formData);
      limpiarFormulario();
      setStatus("success");
      if (creada?.id) setRegistradas((prev) => [creada, ...prev.filter((ev) => ev.id !== creada.id)]);
      else cargarRegistradas();
    } catch (err) {
      if (manejarErrorSesion(err)) return;
      setStatus("error");
      if (err.status === 400) setErrors(erroresDelServidor(err.data));
      else if (err.status === 403) setErrors({ general: "No tienes permiso para registrar evidencias." });
      else setErrors({ general: err.message || "No se pudo guardar la evidencia." });
    }
  }

  const textoProyecto = cargandoProyecto ? "Cargando..." : proyecto?.nombre || "Sin proyecto asignado";

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
        <button
          type="button"
          onClick={() => setPanelAbierto(true)}
          aria-haspopup="dialog"
          className={`${OUTLINE_BUTTON_CLASS} self-start sm:self-auto`}
        >
          <FolderOpen className="h-4 w-4" />
          Evidencias cargadas
          {!cargandoRegistradas && !registradasError && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {registradas.length}
            </span>
          )}
        </button>
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
                  <label htmlFor="proyecto" className={LABEL_CLASS}>Proyecto</label>
                  <input
                    id="proyecto"
                    type="text"
                    value={textoProyecto}
                    title={textoProyecto}
                    disabled
                    aria-invalid={Boolean(errors.proyecto)}
                    className={READONLY_CLASS}
                  />
                  {errors.proyecto && <p className={ERROR_CLASS} role="alert">{errors.proyecto}</p>}
                </div>
                <div className="space-y-1">
                  <label htmlFor="etapa" className={LABEL_CLASS}>
                    Etapa <Required />
                  </label>
                  <div className="relative">
                    <select
                      id="etapa"
                      value={etapa}
                      onChange={(e) => {
                        setEtapa(e.target.value);
                        limpiarErrorCampo("etapa");
                      }}
                      aria-invalid={Boolean(errors.etapa)}
                      disabled={cargandoEtapas || etapas.length === 0}
                      className={`${INPUT_CLASS} appearance-none pr-9 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500`}
                    >
                      <option value="">
                        {cargandoEtapas
                          ? "Cargando etapas..."
                          : etapas.length === 0
                            ? "No hay etapas configuradas"
                            : "Selecciona una etapa"}
                      </option>
                      {etapas.map((hito) => (
                        <option key={hito.id} value={hito.id}>
                          {`Hito ${hito.numero_hito} · ${hito.nombre}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  {!cargandoEtapas && !datosError && proyecto && etapas.length === 0 && (
                    <p className={HINT_CLASS}>
                      La rúbrica de tu tipo de iniciativa aún no tiene hitos definidos.
                    </p>
                  )}
                  {errors.etapa && <p className={ERROR_CLASS} role="alert">{errors.etapa}</p>}
                  {datosError && <p className={ERROR_CLASS} role="alert">{datosError}</p>}
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
                  maxLength={MAX_TITULO}
                  onChange={(e) => {
                    setTitulo(e.target.value);
                    limpiarErrorCampo("titulo");
                  }}
                  aria-invalid={Boolean(errors.titulo)}
                  className={INPUT_CLASS}
                />
                <p className={`${HINT_CLASS} text-right`}>{titulo.length}/{MAX_TITULO}</p>
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
                    limpiarErrorCampo("descripcion");
                  }}
                  aria-invalid={Boolean(errors.descripcion)}
                  className={`${INPUT_CLASS} resize-none`}
                />
                <p className={HINT_CLASS}>Opcional.</p>
                {errors.descripcion && <p className={ERROR_CLASS} role="alert">{errors.descripcion}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={SECTION_CLASS}>
                Tipo de evidencia <Required />
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {TIPOS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={tipo === t.id}
                    onClick={() => {
                      setTipo(t.id);
                      setArchivoError("");
                      limpiarErrorCampo("tipo");
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${tipo === t.id
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-slate-50"
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.tipo && <p className={ERROR_CLASS} role="alert">{errors.tipo}</p>}

              {soloEnlaces ? (
                <p className="rounded-lg border border-slate-100 bg-[#f4f5f7] p-3 text-xs text-slate-600">
                  Con el tipo <strong className="text-slate-800">Enlace</strong> solo se aceptan enlaces; no se pueden subir archivos.
                </p>
              ) : (
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
              )}
              {archivoError && <p className={ERROR_CLASS} role="alert">{archivoError}</p>}
              {errors.archivos && <p className={ERROR_CLASS} role="alert">{errors.archivos}</p>}

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
                    aria-invalid={Boolean(enlaceError || errors.enlaces)}
                    className={INPUT_CLASS}
                  />
                  <button type="button" onClick={agregarEnlace} className={OUTLINE_BUTTON_CLASS}>
                    <Link2 className="h-4 w-4" />
                    Agregar enlace
                  </button>
                </div>
                {enlaceError && <p className={ERROR_CLASS} role="alert">{enlaceError}</p>}
                {errors.enlaces && <p className={ERROR_CLASS} role="alert">{errors.enlaces}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className={SECTION_CLASS}>Evidencias adjuntas ({adjuntos.length})</h3>
              {errors.general && (
                <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errors.general}
                </p>
              )}
              {adjuntos.length === 0 ? (
                <p className="text-xs text-slate-400">Aún no has adjuntado ninguna evidencia.</p>
              ) : (
                <ul className="space-y-2">
                  {adjuntos.map((ad) => (
                    <li
                      key={ad.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${soloEnlaces && ad.file ? "border-red-300 bg-red-50/40" : "border-slate-200"}`}
                    >
                      <span className="min-w-[38px] rounded-md bg-red-50 px-2 py-1 text-center text-[10px] font-bold text-red-700">
                        {ad.etiqueta}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{ad.nombre}</p>
                        <p className="text-[11px] text-slate-500">{ad.detalle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarAdjunto(ad.id)}
                        className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Quitar evidencia"
                        aria-label={`Quitar ${ad.nombre}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {status === "success" && (
              <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Tu evidencia se guardó correctamente.
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
                disabled={!puedeGuardar}
                className="inline-flex items-center gap-2 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {status === "loading" ? "Guardando..." : "Guardar evidencia"}
              </button>
            </div>
          </form>
        </section>
      </div>

      <EvidenciasCargadasPanel
        open={panelAbierto}
        onClose={cerrarPanel}
        evidencias={registradas}
        cargando={cargandoRegistradas}
        error={registradasError}
        onReintentar={cargarRegistradas}
      />
    </div>
  );
}

export default EvidenciaForm;

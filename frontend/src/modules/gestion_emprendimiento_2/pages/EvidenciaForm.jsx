import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, FolderOpen, Link2, Loader2, Save, Upload, X } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getEvidencias, registerEvidencia } from "../services/evidenciaService";
import { obtenerMiEquipo } from "../services/equipoService";
import { getActividades } from "../services/planTrabajoService";
import EvidenciasCargadasPanel from "../components/EvidenciasCargadasPanel";
import {
  AYUDA,
  AvisoPanel,
  BOTON_ICONO_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  CONTADOR,
  EncabezadoPagina,
  ETIQUETA,
  ErrorGeneral,
  ROTULO,
  SECCION,
  TARJETA,
  claseOpcion,
} from "../../../components/ui";

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
const CAMPOS_ERROR = ["proyecto", "etapa", "actividad", "titulo", "descripcion", "tipo", "archivos", "enlaces"];

const STEPS = [
  { number: 1, title: "Actividad y datos", subtitle: "Elige la actividad del plan de trabajo y describe el avance." },
  { number: 2, title: "Evidencias", subtitle: "Sube archivos o agrega enlaces según el tipo." },
  { number: 3, title: "Confirmación", subtitle: "Revisa lo adjuntado y guarda." },
];

// Clases del sistema visual compartido (components/ui)
const INPUT_CLASS = CAMPO;
const READONLY_CLASS = CAMPO;
const LABEL_CLASS = ETIQUETA;
const HINT_CLASS = AYUDA;
const ERROR_CLASS = "text-xs font-medium text-ufps";
const SECTION_CLASS = `border-b border-slate-100 pb-2 ${ROTULO}`;
const OUTLINE_BUTTON_CLASS = `${BOTON_SECUNDARIO} shrink-0`;

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

function Required() {
  return <span className="text-ufps">*</span>;
}

function EvidenciaForm() {
  const { usuario, logout } = useAuth();
  const idUsuario = usuario?.id_usuario;
  const inputArchivoRef = useRef(null);

  // El proyecto lleva el nombre de la iniciativa aprobada del equipo. La etapa ya no se
  // elige: es el hito del plan de trabajo de la actividad (el backend la deduce).
  const [proyecto, setProyecto] = useState(null); // { id, nombre, tipo }
  const [esLider, setEsLider] = useState(false);
  const [cargandoProyecto, setCargandoProyecto] = useState(true);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [datosError, setDatosError] = useState("");

  const [registradas, setRegistradas] = useState([]);
  const [cargandoRegistradas, setCargandoRegistradas] = useState(true);
  const [registradasError, setRegistradasError] = useState("");
  const [panelAbierto, setPanelAbierto] = useState(false);
  const cerrarPanel = useCallback(() => setPanelAbierto(false), []);

  // Actividades pendientes del plan de trabajo (HU-20) cuyo responsable es el estudiante
  // (no se listan las de sus compañeros): al subir la evidencia, el backend la completa
  const [misActividades, setMisActividades] = useState([]);
  const [actividad, setActividad] = useState("");
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

        // El nombre del proyecto se muestra apenas llega; luego se cargan sus actividades
        const equipo = dataEquipo?.equipo;
        const iniciativa = equipo?.iniciativa || null;
        const idProyecto =
          iniciativa?.id_proyecto ?? equipo?.id_proyecto ?? equipo?.proyecto?.id_proyecto ?? lista[0]?.proyecto ?? null;
        setProyecto(iniciativa ? { id: idProyecto, nombre: iniciativa.nombre, tipo: iniciativa.tipo } : null);
        setEsLider(Boolean(equipo?.es_lider));
        setCargandoProyecto(false);

        if (!idProyecto) return;
        const pendientes = await getActividades({ proyecto: idProyecto, estado: "pendiente" });
        if (!activo) return;
        setMisActividades(
          pendientes
            .filter((a) => a.responsable === idUsuario)
            .sort((a, b) => (a.fecha_fin || "").localeCompare(b.fecha_fin || "")),
        );
      } catch (err) {
        if (activo && !manejarErrorSesion(err)) {
          setDatosError(err.message || "No se pudieron cargar los datos del proyecto.");
        }
      } finally {
        if (activo) {
          setCargandoProyecto(false);
          setCargandoActividades(false);
        }
      }
    }

    cargarDatosProyecto();
    return () => {
      activo = false;
    };
  }, [cargarRegistradas, manejarErrorSesion, idUsuario]);

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
    setActividad("");
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
    if (!actividad) nuevos.actividad = "Selecciona la actividad a la que corresponde la evidencia.";
    if (!titulo.trim()) nuevos.titulo = "Indica un título para la evidencia.";
    else if (titulo.trim().length > MAX_TITULO) nuevos.titulo = `El título admite máximo ${MAX_TITULO} caracteres.`;
    if (adjuntos.length === 0) nuevos.general = "Adjunta al menos una evidencia (archivo o enlace).";
    else if (soloEnlaces && hayArchivos) nuevos.archivos = "Con el tipo Enlace solo se aceptan enlaces: quita los archivos.";
    return nuevos;
  }

  const puedeGuardar =
    Boolean(proyecto?.id && actividad && titulo.trim() && tipo && adjuntos.length > 0) &&
    !(soloEnlaces && hayArchivos) &&
    status !== "loading";

  async function handleSubmit(e) {
    e.preventDefault();
    const nuevos = validar();
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const formData = new FormData();
    formData.append("proyecto", proyecto.id);
    // Sin "etapa": el backend la toma del hito del plan de trabajo de la actividad
    formData.append("actividad", actividad);
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
      // La actividad quedó completada en el backend: ya no se ofrece como pendiente
      if (actividad) setMisActividades((prev) => prev.filter((a) => String(a.id) !== actividad));
      limpiarFormulario();
      setStatus("success");
      if (creada?.id) setRegistradas((prev) => [creada, ...prev.filter((ev) => ev.id !== creada.id)]);
      else cargarRegistradas();
    } catch (err) {
      if (manejarErrorSesion(err)) return;
      setStatus("error");
      if (err.status === 400) {
        // La etapa ya no es un campo del formulario: sus errores se muestran en la actividad
        const { etapa: errorEtapa, ...resto } = erroresDelServidor(err.data);
        setErrors(errorEtapa ? { ...resto, actividad: resto.actividad || errorEtapa } : resto);
      }
      else if (err.status === 403) setErrors({ general: "No tienes permiso para registrar evidencias." });
      else setErrors({ general: err.message || "No se pudo guardar la evidencia." });
    }
  }

  const actividadSeleccionada = misActividades.find((a) => String(a.id) === actividad) || null;
  const textoProyecto = cargandoProyecto ? "Cargando..." : proyecto?.nombre || "Sin proyecto asignado";

  return (
    <div className="w-full space-y-6">
      <EncabezadoPagina
        seccion="Evidencias de avance"
        titulo="Registra la evidencia de tu avance"
        descripcion="Adjunta documentos, enlaces, prototipos y presentaciones que respalden la trayectoria y madurez de tu iniciativa al finalizar una etapa."
        acciones={
          <button type="button" onClick={() => setPanelAbierto(true)} aria-haspopup="dialog" className={OUTLINE_BUTTON_CLASS}>
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Evidencias cargadas
            {!cargandoRegistradas && !registradasError && <span className={CONTADOR}>{registradas.length}</span>}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Guía del formulario */}
        <aside className={`${TARJETA} h-fit space-y-5 p-5 sm:p-6`}>
          <div>
            <p className={SECCION}>Guía</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">¿Cómo registrar tu avance?</h3>
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
            Formatos: PDF, DOCX, PPTX, PNG, JPG. Máximo{" "}
            <strong className="text-slate-800">{MAX_MB} MB</strong> por archivo.
          </p>
        </aside>

        {/* Formulario */}
        <section className={`${TARJETA} p-5 sm:p-6 lg:col-span-2`}>
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
                  <label htmlFor="actividad" className={LABEL_CLASS}>
                    Actividad del plan de trabajo <Required />
                  </label>
                  <div className="relative">
                    <select
                      id="actividad"
                      value={actividad}
                      onChange={(e) => {
                        setActividad(e.target.value);
                        limpiarErrorCampo("actividad");
                      }}
                      aria-invalid={Boolean(errors.actividad)}
                      disabled={cargandoActividades || misActividades.length === 0}
                      className={`${INPUT_CLASS} appearance-none pr-10`}
                    >
                      <option value="">
                        {cargandoActividades
                          ? "Cargando actividades..."
                          : misActividades.length === 0
                            ? "No tienes actividades pendientes"
                            : "Selecciona una actividad"}
                      </option>
                      {misActividades.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.entregable ? `${a.nombre} · ${a.entregable}` : a.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                  </div>
                  {actividadSeleccionada && (
                    <p className={HINT_CLASS}>
                      Etapa: <strong className="text-slate-700">{actividadSeleccionada.hito_nombre}</strong>
                      {actividadSeleccionada.fecha_fin && ` · Fecha límite: ${actividadSeleccionada.fecha_fin}`}
                    </p>
                  )}
                  {!cargandoActividades && !datosError && proyecto && misActividades.length === 0 && (
                    <p className={HINT_CLASS}>
                      Solo se muestran las actividades del plan de trabajo que tienes asignadas y siguen pendientes.
                    </p>
                  )}
                  {errors.actividad && <p className={ERROR_CLASS} role="alert">{errors.actividad}</p>}
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
                    className={`${claseOpcion(tipo === t.id)} px-3 py-3 text-center text-sm font-semibold ${tipo === t.id ? "text-ufps" : "text-slate-700"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {errors.tipo && <p className={ERROR_CLASS} role="alert">{errors.tipo}</p>}

              {soloEnlaces ? (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
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
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${arrastrando
                    ? "border-ufps bg-white"
                    : "border-slate-300 bg-superficie-alta"
                    }`}
                >
                  <Upload className={`mx-auto h-7 w-7 ${arrastrando ? "text-ufps" : "text-slate-400"}`} aria-hidden="true" />
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
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                    Agregar enlace
                  </button>
                </div>
                {enlaceError && <p className={ERROR_CLASS} role="alert">{enlaceError}</p>}
                {errors.enlaces && <p className={ERROR_CLASS} role="alert">{errors.enlaces}</p>}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className={SECTION_CLASS}>Evidencias adjuntas ({adjuntos.length})</h3>
              <ErrorGeneral mensaje={errors.general} />
              {adjuntos.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no has adjuntado ninguna evidencia.</p>
              ) : (
                <ul className="space-y-2">
                  {adjuntos.map((ad) => (
                    <li
                      key={ad.id}
                      className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2 ${soloEnlaces && ad.file ? "border-ufps" : "border-slate-200"}`}
                    >
                      <span className="min-w-[40px] rounded-md bg-slate-900 px-2 py-1 text-center text-[10px] font-bold text-white">
                        {ad.etiqueta}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{ad.nombre}</p>
                        <p className="text-xs text-slate-500">{ad.detalle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitarAdjunto(ad.id)}
                        className={`${BOTON_ICONO_PELIGRO} -my-1.5 -mr-1.5`}
                        title="Quitar evidencia"
                        aria-label={`Quitar ${ad.nombre}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <AvisoPanel aviso={status === "success" ? { tipo: "exito", titulo: "Tu evidencia se guardó correctamente." } : null} />

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleCancel} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button type="submit" disabled={!puedeGuardar} className={BOTON_PRIMARIO}>
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
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
        puedeEliminar={esLider}
        onEliminada={(id) => setRegistradas((prev) => prev.filter((ev) => ev.id !== id))}
      />
    </div>
  );
}

export default EvidenciaForm;

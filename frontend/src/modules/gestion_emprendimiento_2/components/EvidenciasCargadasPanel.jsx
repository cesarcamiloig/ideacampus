import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, Link2, Loader2, RefreshCw, X } from "lucide-react";
import { descargarDocumentoEvidencia } from "../services/evidenciaService";

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "documento", label: "Documento" },
  { id: "enlace", label: "Enlace" },
  { id: "prototipo", label: "Prototipo" },
  { id: "presentacion", label: "Presentación" },
];

const ETIQUETA_TIPO = {
  documento: "Documento",
  enlace: "Enlace",
  prototipo: "Prototipo",
  presentacion: "Presentación",
};

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(valor) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

const ADJUNTO_CLASS =
  "flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-red-300 hover:bg-red-50/40 disabled:cursor-wait disabled:opacity-70";

function DocumentoAdjunto({ doc }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  if (doc.enlace) {
    return (
      <li>
        <a href={doc.enlace} target="_blank" rel="noopener noreferrer" className={ADJUNTO_CLASS}>
          <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{doc.enlace}</p>
            <p className="text-[11px] text-slate-500">Enlace</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </a>
      </li>
    );
  }

  const nombre = doc.nombre_original || "Archivo adjunto";
  const detalle = [doc.extension?.toUpperCase(), formatSize(doc.tamano_bytes)].filter(Boolean).join(" · ");

  // El archivo se pide a la API con el token y se guarda con su nombre original
  async function descargar() {
    setDescargando(true);
    setError("");
    try {
      const blob = await descargarDocumentoEvidencia(doc.id);
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || "No se pudo descargar el archivo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <li className="space-y-1">
      <button type="button" onClick={descargar} disabled={descargando} className={ADJUNTO_CLASS}>
        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">{nombre}</p>
          {detalle && <p className="text-[11px] text-slate-500">{detalle}</p>}
        </div>
        {descargando ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-red-600" />
        ) : (
          <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
      </button>
      {error && <p className="text-[11px] font-medium text-red-600" role="alert">{error}</p>}
    </li>
  );
}

// Panel lateral flotante con las evidencias ya cargadas en el proyecto del equipo
export default function EvidenciasCargadasPanel({ open, onClose, evidencias, cargando, error, onReintentar }) {
  const [filtro, setFiltro] = useState("todas");
  const botonCerrarRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    botonCerrarRef.current?.focus();
    const cerrarConEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [open, onClose]);

  const conteo = useMemo(() => {
    const totales = { todas: evidencias.length };
    evidencias.forEach((ev) => {
      totales[ev.tipo] = (totales[ev.tipo] || 0) + 1;
    });
    return totales;
  }, [evidencias]);

  const visibles = useMemo(
    () => (filtro === "todas" ? evidencias : evidencias.filter((ev) => ev.tipo === filtro)),
    [evidencias, filtro]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-evidencias-cargadas"
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="titulo-evidencias-cargadas" className="text-sm font-bold text-slate-900">Evidencias cargadas</h3>
              <p className="text-xs text-slate-500">Avances que tu equipo ha cargado en el proyecto.</p>
            </div>
            <button
              ref={botonCerrarRef}
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Cerrar evidencias cargadas"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo de evidencia">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${filtro === f.id
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-slate-50"
                }`}
            >
              {f.label} ({conteo[f.id] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            Cargando evidencias...
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button
              type="button"
              onClick={onReintentar}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {evidencias.length === 0
              ? "Aún no se han registrado evidencias en este proyecto."
              : "No hay evidencias de este tipo."}
          </p>
        ) : (
          <ul className="space-y-4">
            {visibles.map((ev) => (
              <li key={ev.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{ev.titulo}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {[ev.etapa_nombre, ev.usuario_nombre, formatFecha(ev.creado)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="w-fit shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                    {ETIQUETA_TIPO[ev.tipo] || ev.tipo}
                  </span>
                </div>
                {ev.descripcion && (
                  <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">{ev.descripcion}</p>
                )}
                {ev.documentos?.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {ev.documentos.map((doc) => (
                      <DocumentoAdjunto key={doc.id} doc={doc} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      </aside>
    </div>
  );
}

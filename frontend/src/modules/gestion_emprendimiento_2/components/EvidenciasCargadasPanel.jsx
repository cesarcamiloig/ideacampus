import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  BOTON_ICONO_PELIGRO,
  BOTON_PRIMARIO_SM,
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_SM,
  Cargando,
  Distintivo,
  ErrorGeneral,
  FOCO,
  MensajeError,
  PanelLateral,
  Pestanas,
} from "../../../components/ui";
import { descargarDocumentoEvidencia, eliminarEvidencia } from "../services/evidenciaService";

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

const ADJUNTO_CLASS = `flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-left ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:ring-slate-300 disabled:cursor-wait disabled:opacity-70 ${FOCO}`;

export function DocumentoAdjunto({ doc }) {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState("");

  if (doc.enlace) {
    return (
      <li>
        <a href={doc.enlace} target="_blank" rel="noopener noreferrer" className={ADJUNTO_CLASS}>
          <Link2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{doc.enlace}</p>
            <p className="text-xs text-slate-500">Enlace</p>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="sr-only">(se abre en otra pestaña)</span>
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
        <FileText className="h-4 w-4 shrink-0 text-ufps" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{nombre}</p>
          {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
        </div>
        {descargando ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-ufps" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>
      <MensajeError>{error}</MensajeError>
    </li>
  );
}

// Panel lateral flotante con las evidencias ya cargadas en el proyecto del equipo
// Solo el líder del equipo ve el botón de eliminar (el backend también lo valida)
export default function EvidenciasCargadasPanel({
  open,
  onClose,
  evidencias,
  cargando,
  error,
  onReintentar,
  puedeEliminar = false,
  onEliminada,
  titulo = "Evidencias cargadas",
  subtitulo = "Avances que tu equipo ha cargado en el proyecto.",
  mensajeVacio = "Aún no se han registrado evidencias en este proyecto.",
}) {
  const [filtro, setFiltro] = useState("todas");
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState({});

  async function confirmarEliminar(id) {
    setEliminandoId(id);
    setErrorEliminar({});
    try {
      await eliminarEvidencia(id);
      setConfirmandoId(null);
      onEliminada?.(id);
    } catch (err) {
      setErrorEliminar({ [id]: err.message || "No se pudo eliminar la evidencia." });
    } finally {
      setEliminandoId(null);
    }
  }

  // El foco atrapado, Escape y el retorno del foco los maneja PanelLateral
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
    <PanelLateral titulo={titulo} subtitulo={subtitulo} etiquetaCerrar="Cerrar evidencias cargadas" onClose={onClose} ancho="max-w-lg">
      <div className="space-y-5">
        <Pestanas
          etiqueta="Filtrar por tipo de evidencia"
          valor={filtro}
          onChange={setFiltro}
          opciones={FILTROS.map((f) => ({ id: f.id, label: f.label, count: conteo[f.id] || 0 }))}
        />

        {cargando ? (
          <Cargando texto="Cargando evidencias..." enTarjeta={false} />
        ) : error ? (
          <div className="space-y-3">
            <ErrorGeneral mensaje={error} />
            <button type="button" onClick={onReintentar} className={BOTON_SECUNDARIO}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : visibles.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {evidencias.length === 0 ? mensajeVacio : "No hay evidencias de este tipo."}
          </p>
        ) : (
          <ul className="space-y-4">
            {visibles.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{ev.titulo}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[ev.etapa_nombre, ev.usuario_nombre, formatFecha(ev.creado)].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="-my-1.5 flex shrink-0 items-center gap-1">
                    <Distintivo tono="contorno">{ETIQUETA_TIPO[ev.tipo] || ev.tipo}</Distintivo>
                    {puedeEliminar && confirmandoId !== ev.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmandoId(ev.id);
                          setErrorEliminar({});
                        }}
                        className={BOTON_ICONO_PELIGRO}
                        title="Eliminar evidencia"
                        aria-label={`Eliminar la evidencia ${ev.titulo}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                {confirmandoId === ev.id && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-ufps bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-medium text-ufps">
                      ¿Eliminar esta evidencia y todos sus adjuntos? No se puede deshacer.
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(null)}
                        disabled={eliminandoId === ev.id}
                        className={BOTON_SECUNDARIO_SM}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmarEliminar(ev.id)}
                        disabled={eliminandoId === ev.id}
                        className={BOTON_PRIMARIO_SM}
                      >
                        {eliminandoId === ev.id && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        {eliminandoId === ev.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                )}
                {errorEliminar[ev.id] && (
                  <div className="mt-2">
                    <MensajeError>{errorEliminar[ev.id]}</MensajeError>
                  </div>
                )}
                {ev.descripcion && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{ev.descripcion}</p>
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
    </PanelLateral>
  );
}

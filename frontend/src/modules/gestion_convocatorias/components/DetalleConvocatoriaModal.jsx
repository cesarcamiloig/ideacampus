import React from "react";
import {
  X,
  Calendar,
  Clock,
  Tag,
  Building,
  User,
  Edit2,
  Trash2,
  Send,
  Lock,
  Globe,
} from "lucide-react";

export function DetalleConvocatoriaModal({
  open,
  onOpenChange,
  convocatoria,
  isGestor = false,
  onEdit,
  onPublish,
  onCloseConvocatoria,
  onNotify,
  onDelete,
}) {
  if (!open || !convocatoria) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "No definida";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (estado) => {
    const config = {
      abierta: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Abierta para Postulaciones",
        dot: "bg-emerald-500 animate-pulse",
      },
      publicada: {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Publicada (Apertura Próxima)",
        dot: "bg-blue-500",
      },
      borrador: {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: "Borrador Interno",
        dot: "bg-slate-400",
      },
      cerrada: {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Cerrada",
        dot: "bg-amber-500",
      },
      cancelada: {
        bg: "bg-red-50 text-red-700 border-red-200",
        label: "Cancelada",
        dot: "bg-red-500",
      },
    };

    const c = config[estado] || config.borrador;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.bg}`}
      >
        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  const now = new Date();
  const fechaApertura = new Date(convocatoria.fecha_apertura);
  const fechaCierre = new Date(convocatoria.fecha_cierre);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Línea roja UFPS */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500" />

        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="space-y-2 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              {getStatusBadge(convocatoria.estado)}
              {convocatoria.categoria && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                  <Tag className="h-3 w-3 text-slate-500" />
                  {convocatoria.categoria}
                </span>
              )}
              {convocatoria.periodo_nombre && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
                  <Building className="h-3 w-3 text-red-600" />
                  {convocatoria.periodo_nombre}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
              {convocatoria.nombre}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Cronograma temporal */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-red-600" />
              Cronograma Oficial de la Convocatoria
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-3 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block">Fecha de Apertura</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {formatDate(convocatoria.fecha_apertura)}
                </span>
                {now < fechaApertura && (
                  <span className="text-[10px] text-blue-600 font-medium block mt-1">
                    • Apertura programada próximamente
                  </span>
                )}
              </div>

              <div className="rounded-lg bg-white p-3 border border-slate-100">
                <span className="text-[11px] font-semibold text-slate-500 block">Fecha Límite de Cierre</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {formatDate(convocatoria.fecha_cierre)}
                </span>
                {now > fechaCierre ? (
                  <span className="text-[10px] text-amber-600 font-medium block mt-1">
                    • Plazo de recepción cerrado
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-medium block mt-1">
                    • Postulaciones activas actualmente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Creador y metadatos */}
          <div className="flex items-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-4">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Registrada por: <strong className="text-slate-700">{convocatoria.creador_nombre || "Coordinación"}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Creada el: {formatDate(convocatoria.fecha_creacion)}
            </span>
          </div>

          {/* Descripción */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Descripción y Alcance
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              {convocatoria.descripcion || "Sin descripción registrada para esta convocatoria."}
            </p>
          </div>

          {/* Requisitos y Documentación */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Requisitos y Documentación Necesaria
            </h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              {convocatoria.requisitos_documentacion ||
                "No se especificaron requisitos especiales. Consulta con la Coordinación de Emprendimiento."}
            </div>
          </div>

          {/* Criterios de Evaluación */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Criterios de Evaluación y Calificación
            </h4>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 rounded-xl p-4 border border-slate-100">
              {convocatoria.criterios_evaluacion ||
                "Evaluación según la rúbrica general del Programa de Emprendimiento UFPS."}
            </div>
          </div>
        </div>

        {/* Footer con Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cerrar Ventana
          </button>

          {isGestor && (
            <div className="flex flex-wrap items-center gap-2">
              {convocatoria.estado === "borrador" && onPublish && (
                <button
                  type="button"
                  onClick={() => {
                    onPublish(convocatoria);
                    onOpenChange(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Publicar Ahora
                </button>
              )}

              {(convocatoria.estado === "publicada" || convocatoria.estado === "abierta") && (
                <>
                  {onNotify && (
                    <button
                      type="button"
                      onClick={() => onNotify(convocatoria)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Difundir a Estudiantes
                    </button>
                  )}

                  {onCloseConvocatoria && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseConvocatoria(convocatoria);
                        onOpenChange(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Cerrar Convocatoria
                    </button>
                  )}
                </>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(convocatoria);
                    onOpenChange(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  Editar
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(convocatoria);
                    onOpenChange(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

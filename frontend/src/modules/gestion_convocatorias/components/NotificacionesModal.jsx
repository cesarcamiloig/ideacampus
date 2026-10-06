import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import {
  getNotificacionesConvocatoria,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../services/convocatoriaService";

export function NotificacionesModal({ open, onOpenChange, onNotificationRead }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [filterLeida, setFilterLeida] = useState("todas");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const params = {};
      if (filterLeida === "no_leidas") {
        params.leida = "false";
      } else if (filterLeida === "leidas") {
        params.leida = "true";
      }
      const data = await getNotificacionesConvocatoria(params);
      setNotificaciones(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || "Error al cargar las notificaciones.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, filterLeida]);

  if (!open) return null;

  const handleMarkAsRead = async (id) => {
    try {
      await marcarNotificacionLeida(id);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n))
      );
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      setErrorMessage(err.message || "Error al actualizar la notificación.");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await marcarTodasNotificacionesLeidas();
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      if (onNotificationRead) onNotificationRead();
    } catch (err) {
      setErrorMessage(err.message || "Error al marcar todas como leídas.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const unreadCount = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Línea roja UFPS */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Notificaciones de Convocatorias
              </h2>
              <p className="text-xs text-slate-500">
                Avisos institucionales sobre apertura, cierre y postulaciones
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de filtros y marcar todas leídas */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-2.5 bg-slate-50/50">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterLeida("todas")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterLeida === "todas"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFilterLeida("no_leidas")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                filterLeida === "no_leidas"
                  ? "bg-white text-red-600 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              No leídas {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>

        {/* Lista de notificaciones */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              <span className="text-xs">Cargando notificaciones...</span>
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-2">
              <Bell className="h-8 w-8 text-slate-300 stroke-1" />
              <p className="text-xs font-medium text-slate-600">No tienes notificaciones en este momento</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Cuando se publiquen o actualicen convocatorias institucionales, aparecerán listadas aquí.
              </p>
            </div>
          ) : (
            notificaciones.map((notif) => (
              <div
                key={notif.id_notificacion}
                className={`relative rounded-xl border p-4 transition-all ${
                  notif.leida
                    ? "bg-white border-slate-100 text-slate-600"
                    : "bg-red-50/20 border-red-100 text-slate-900 shadow-sm"
                }`}
              >
                {!notif.leida && (
                  <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-red-600" />
                )}

                <div className="flex items-start justify-between gap-3 pr-4">
                  <div className="space-y-1">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-red-600">
                      {notif.tipo === "apertura"
                        ? "Apertura de Convocatoria"
                        : notif.tipo === "cerrada"
                        ? "Convocatoria Cerrada"
                        : "Aviso de Convocatoria"}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {notif.titulo}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {notif.mensaje}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100/70 pt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(notif.fecha_creacion)}
                  </span>

                  {!notif.leida && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id_notificacion)}
                      className="inline-flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 transition-colors"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 rounded-b-2xl flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

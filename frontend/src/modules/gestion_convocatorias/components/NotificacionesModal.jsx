import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_SECUNDARIO,
  Cargando,
  ENLACE,
  ErrorGeneral,
  EstadoVacio,
  Modal,
  Pestanas,
  SECCION,
} from "../../../components/ui";
import {
  getNotificacionesConvocatoria,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from "../services/convocatoriaService";

export function NotificacionesModal({ open, onOpenChange, onNotificationRead, onNavigate }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [filterLeida, setFilterLeida] = useState("todas");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadNotifications = useCallback(async () => {
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
  }, [filterLeida]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

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
    <Modal
      open
      onClose={() => onOpenChange(false)}
      ancho="xl"
      icono={Bell}
      titulo="Notificaciones de Convocatorias"
      subtitulo="Avisos institucionales sobre apertura, cierre y postulaciones"
      etiquetaCerrar="Cerrar notificaciones"
      pie={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onNavigate ? (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onNavigate("alertas");
              }}
              className={ENLACE}
            >
              Ver Centro de Alertas y Vencimientos
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => onOpenChange(false)} className={BOTON_SECUNDARIO}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Pestanas
            etiqueta="Filtrar notificaciones"
            valor={filterLeida}
            onChange={setFilterLeida}
            opciones={[
              { id: "todas", label: "Todas" },
              { id: "no_leidas", label: "No leídas", count: unreadCount > 0 ? unreadCount : undefined },
            ]}
          />
          {unreadCount > 0 && (
            <button type="button" onClick={handleMarkAllAsRead} className={BOTON_FANTASMA}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        <ErrorGeneral mensaje={errorMessage} />

        {isLoading ? (
          <Cargando texto="Cargando notificaciones…" enTarjeta={false} />
        ) : notificaciones.length === 0 ? (
          <EstadoVacio icono={Bell} titulo="No tienes notificaciones en este momento" enTarjeta={false}>
            Cuando se publiquen o actualicen convocatorias institucionales, aparecerán listadas aquí.
          </EstadoVacio>
        ) : (
          <ul className="space-y-3">
            {notificaciones.map((notif) => (
              <li
                key={notif.id_notificacion}
                className={`relative overflow-hidden rounded-xl border bg-white py-4 pl-5 pr-4 ${
                  notif.leida ? "border-slate-200" : "border-ufps shadow-sm"
                }`}
              >
                <span
                  className={`absolute inset-y-0 left-0 w-1 ${notif.leida ? "bg-slate-300" : "bg-ufps"}`}
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className={notif.leida ? "text-[11px] font-bold uppercase tracking-wider text-slate-500" : SECCION}>
                    {notif.tipo === "apertura"
                      ? "Apertura de Convocatoria"
                      : notif.tipo === "cerrada"
                        ? "Convocatoria Cerrada"
                        : "Aviso de Convocatoria"}
                    {!notif.leida && <span className="sr-only"> (no leída)</span>}
                  </p>
                  <h4 className="text-sm font-semibold leading-snug text-slate-900">{notif.titulo}</h4>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{notif.mensaje}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {formatDate(notif.fecha_creacion)}
                  </span>
                  {!notif.leida && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id_notificacion)}
                      className={`${BOTON_FANTASMA} -my-2 -mr-2 min-h-9 text-xs`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Marcar leída
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

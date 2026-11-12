import React from "react";
import { Calendar, Clock, Tag, Building, User, Edit2, Trash2, Send, Lock, Globe } from "lucide-react";
import {
  BOTON_OSCURO,
  BOTON_PELIGRO,
  BOTON_SECUNDARIO,
  BLOQUE,
  Distintivo,
  Modal,
  Rotulo,
} from "../../../components/ui";
import { estadoConvocatoria } from "./estadoConvocatoria";

function BloqueTexto({ titulo, children }) {
  return (
    <section className="space-y-2">
      <Rotulo as="h4">{titulo}</Rotulo>
      <div className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

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

  const estado = estadoConvocatoria(convocatoria.estado);
  const now = new Date();
  const fechaApertura = new Date(convocatoria.fecha_apertura);
  const fechaCierre = new Date(convocatoria.fecha_cierre);
  const cerrar = () => onOpenChange(false);

  return (
    <Modal
      open={open}
      onClose={cerrar}
      ancho="2xl"
      seccion="Convocatoria"
      titulo={convocatoria.nombre}
      etiquetaCerrar="Cerrar detalle de la convocatoria"
      subtitulo={
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Distintivo tono={estado.tono}>{estado.detalle}</Distintivo>
          {convocatoria.categoria && (
            <Distintivo tono="contorno" icono={Tag}>
              {convocatoria.categoria}
            </Distintivo>
          )}
          {convocatoria.periodo_nombre && (
            <Distintivo tono="contorno" icono={Building}>
              {convocatoria.periodo_nombre}
            </Distintivo>
          )}
        </div>
      }
      // Solo acciones de gestión: para cerrar está la X de arriba a la derecha
      pie={
        isGestor && (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(convocatoria);
                    cerrar();
                  }}
                  className={BOTON_PELIGRO}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Eliminar
                </button>
              )}

              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit(convocatoria);
                    cerrar();
                  }}
                  className={BOTON_SECUNDARIO}
                >
                  <Edit2 className="h-4 w-4" aria-hidden="true" />
                  Editar
                </button>
              )}

              {(convocatoria.estado === "publicada" || convocatoria.estado === "abierta") && (
                <>
                  {onCloseConvocatoria && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseConvocatoria(convocatoria);
                        cerrar();
                      }}
                      className={BOTON_SECUNDARIO}
                    >
                      <Lock className="h-4 w-4" aria-hidden="true" />
                      Cerrar convocatoria
                    </button>
                  )}
                  {onNotify && (
                    <button type="button" onClick={() => onNotify(convocatoria)} className={BOTON_OSCURO}>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Difundir a estudiantes
                    </button>
                  )}
                </>
              )}

              {convocatoria.estado === "borrador" && onPublish && (
                <button
                  type="button"
                  onClick={() => {
                    onPublish(convocatoria);
                    cerrar();
                  }}
                  className={BOTON_OSCURO}
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  Publicar ahora
                </button>
              )}
          </div>
        )
      }
    >
      <div className="space-y-6">
        {/* Cronograma */}
        <section className={BLOQUE}>
          <Rotulo as="h4" className="mb-3 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
            Cronograma oficial de la convocatoria
          </Rotulo>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <dt className="text-xs font-semibold text-slate-500">Fecha de apertura</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{formatDate(convocatoria.fecha_apertura)}</dd>
              {now < fechaApertura && (
                <dd className="mt-1 text-xs font-medium text-slate-600">Apertura programada próximamente</dd>
              )}
            </div>
            <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
              <dt className="text-xs font-semibold text-slate-500">Fecha límite de cierre</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{formatDate(convocatoria.fecha_cierre)}</dd>
              {now > fechaCierre ? (
                <dd className="mt-1 text-xs font-semibold text-ufps">Plazo de recepción cerrado</dd>
              ) : (
                <dd className="mt-1 text-xs font-medium text-slate-600">Postulaciones activas actualmente</dd>
              )}
            </div>
          </dl>
        </section>

        {/* Creador y metadatos */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 pb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Registrada por: <strong className="text-slate-700">{convocatoria.creador_nombre || "Coordinación"}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            Creada el: {formatDate(convocatoria.fecha_creacion)}
          </span>
        </div>

        <BloqueTexto titulo="Descripción y alcance">
          {convocatoria.descripcion || "Sin descripción registrada para esta convocatoria."}
        </BloqueTexto>
        <BloqueTexto titulo="Requisitos y documentación necesaria">
          {convocatoria.requisitos_documentacion ||
            "No se especificaron requisitos especiales. Consulta con la Coordinación de Emprendimiento."}
        </BloqueTexto>
      </div>
    </Modal>
  );
}

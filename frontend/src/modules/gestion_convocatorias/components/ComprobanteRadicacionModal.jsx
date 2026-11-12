import React, { useState } from "react";
import { CheckCircle2, Copy, Check, Printer, ArrowRight, ShieldCheck } from "lucide-react";
import { BLOQUE, BOTON_ICONO, BOTON_PRIMARIO, BOTON_SECUNDARIO, Modal, SECCION } from "../../../components/ui";

function FilaComprobante({ etiqueta, children, ultima }) {
  return (
    <div className={`flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${ultima ? "" : "border-b border-slate-200 pb-2"}`}>
      <dt className="font-medium text-slate-500">{etiqueta}</dt>
      <dd className="font-semibold text-slate-800 sm:max-w-xs sm:text-right">{children}</dd>
    </div>
  );
}

export default function ComprobanteRadicacionModal({ postulacion, onCerrar, onVerMisPostulaciones }) {
  const [copiado, setCopiado] = useState(false);

  if (!postulacion) return null;

  const handleCopiarRadicado = () => {
    if (postulacion.radicado) {
      navigator.clipboard.writeText(postulacion.radicado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const fechaFormateada = new Date(postulacion.fecha_radicacion).toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <Modal
      open
      onClose={onCerrar || onVerMisPostulaciones}
      ancho="xl"
      icono={CheckCircle2}
      seccion="Comprobante de radicación"
      titulo="¡Iniciativa Radicada Exitosamente!"
      subtitulo="Tu postulación ha sido registrada con trazabilidad de origen académico en el Programa de Ingeniería de Sistemas de la UFPS."
      etiquetaCerrar="Cerrar comprobante"
      pie={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={handleImprimir} className={BOTON_SECUNDARIO}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir Comprobante
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onCerrar && (
              <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>
                Cerrar
              </button>
            )}
            <button type="button" onClick={onVerMisPostulaciones} className={BOTON_PRIMARIO}>
              Ir a Mis Postulaciones
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Número de radicado */}
        <div className="space-y-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-center">
          <p className={SECCION}>Número Único de Radicado Oficial</p>
          <div className="flex items-center justify-center gap-1">
            <span className="font-mono text-xl font-bold tracking-wider text-slate-900">{postulacion.radicado}</span>
            <button
              type="button"
              onClick={handleCopiarRadicado}
              className={BOTON_ICONO}
              title="Copiar radicado"
              aria-label={copiado ? "Radicado copiado" : "Copiar radicado"}
            >
              {copiado ? <Check className="h-4 w-4 text-ufps" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">Conserva este código para dar seguimiento a la evaluación de tu propuesta.</p>
        </div>

        {/* Ficha técnica */}
        <dl className={`${BLOQUE} space-y-3 text-sm`}>
          <FilaComprobante etiqueta="Fecha y Hora de Radicación">{fechaFormateada}</FilaComprobante>
          <FilaComprobante etiqueta="Iniciativa">
            <span className="font-bold">{postulacion.iniciativa?.titulo}</span>
          </FilaComprobante>
          <FilaComprobante etiqueta="Convocatoria">{postulacion.convocatoria?.nombre}</FilaComprobante>
          <FilaComprobante etiqueta="Origen Académico">
            <span className="capitalize">
              {postulacion.origen_academico?.tipo?.replace(/_/g, " ")}{" "}
              {postulacion.origen_academico?.detalle_origen && `(${postulacion.origen_academico.detalle_origen})`}
            </span>
          </FilaComprobante>
          <FilaComprobante etiqueta="Estudiante Postulante" ultima>
            {postulacion.equipo?.lider?.nombre} ({postulacion.equipo?.lider?.correo})
          </FilaComprobante>
        </dl>

        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          Certificado emitido digitalmente bajo las directrices del Programa de Ingeniería de Sistemas UFPS.
        </p>
      </div>
    </Modal>
  );
}

import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  Printer,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function ComprobanteRadicacionModal({
  postulacion,
  onCerrar,
  onVerMisPostulaciones,
}) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* ENCABEZADO INSTITUCIONAL CON TIRA ROJA */}
        <div className="h-2 bg-gradient-to-r from-red-600 via-red-500 to-rose-600" />

        <div className="p-6 overflow-y-auto space-y-6">
          {/* ICONO Y TÍTULO DE ÉXITO */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 mb-1">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              ¡Iniciativa Radicada Exitosamente!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tu postulación ha sido registrada con trazabilidad de origen académico en el Programa de Ingeniería de Sistemas de la UFPS.
            </p>
          </div>

          {/* TARJETA DEL NÚMERO DE RADICADO */}
          <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-4 text-center space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              Número Único de Radicado Oficial
            </span>
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-xl font-bold text-slate-900 tracking-wider">
                {postulacion.radicado}
              </span>
              <button
                type="button"
                onClick={handleCopiarRadicado}
                className="p-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 transition-colors shadow-sm"
                title="Copiar radicado"
              >
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500">
              Conserva este código para dar seguimiento a la evaluación de tu propuesta.
            </p>
          </div>

          {/* FICHA TÉCNICA DEL COMPROBANTE */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Fecha y Hora de Radicación:</span>
              <span className="font-semibold text-slate-800">{fechaFormateada}</span>
            </div>

            <div className="flex items-start justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Iniciativa:</span>
              <span className="font-bold text-slate-800 text-right max-w-xs">
                {postulacion.iniciativa?.titulo}
              </span>
            </div>

            <div className="flex items-start justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Convocatoria:</span>
              <span className="font-semibold text-slate-800 text-right max-w-xs">
                {postulacion.convocatoria?.nombre}
              </span>
            </div>

            <div className="flex items-start justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Origen Académico:</span>
              <span className="font-semibold text-slate-800 capitalize">
                {postulacion.origen_academico?.tipo?.replace(/_/g, " ")}{" "}
                {postulacion.origen_academico?.asignatura_nombre &&
                  `(${postulacion.origen_academico.asignatura_nombre})`}
                {postulacion.origen_academico?.semillero_nombre &&
                  `(${postulacion.origen_academico.semillero_nombre})`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Estudiante Postulante:</span>
              <span className="font-semibold text-slate-800">
                {postulacion.equipo?.lider?.nombre} ({postulacion.equipo?.lider?.correo})
              </span>
            </div>
          </div>

          {/* MENSAJE DE TRAZABILIDAD */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Certificado emitido digitalmente bajo las directrices del Programa de Ingeniería de Sistemas UFPS.
            </span>
          </div>
        </div>

        {/* ACCIONES DEL COMPROBANTE */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleImprimir}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500" />
            <span>Imprimir Comprobante</span>
          </button>

          <div className="flex items-center gap-2">
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
              >
                Cerrar
              </button>
            )}
            <button
              type="button"
              onClick={onVerMisPostulaciones}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <span>Ir a Mis Postulaciones</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

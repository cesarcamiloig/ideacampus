import React, { useState } from "react";
import {
  X,
  FileText,
  GraduationCap,
  Users,
  Download,
} from "lucide-react";
import { descargarDocumentoIniciativa } from "../services/postulacionService";

export default function DetalleExpedienteModal({ postulacion, onCerrar }) {
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState("");

  if (!postulacion) return null;

  const descargarDocumento = async (archivo) => {
    setDescargando(true);
    setErrorDescarga("");
    try {
      const documento = await descargarDocumentoIniciativa(
        postulacion.id_iniciativa,
      );
      const url = URL.createObjectURL(documento);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorDescarga(error.message || "No se pudo descargar el documento.");
    } finally {
      setDescargando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "radicada":
        return {
          label: "Radicada (En espera)",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "en_revision":
        return {
          label: "Revisión Documental",
          color: "bg-amber-100 text-amber-800 border-amber-200",
        };
      case "en_evaluacion":
        return {
          label: "Evaluación Multicriterio",
          color: "bg-purple-100 text-purple-800 border-purple-200",
        };
      case "aceptada":
        return {
          label: "Aceptada / Seleccionada",
          color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      default:
        return {
          label: estado,
          color: "bg-slate-100 text-slate-800 border-slate-200",
        };
    }
  };

  const badge = getEstadoBadge(postulacion.estado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                {postulacion.radicado}
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}
              >
                {badge.label}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Expediente Digital Único de la Iniciativa
            </h3>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTENIDO DEL EXPEDIENTE */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* INFORMACIÓN BÁSICA DE LA INICIATIVA */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Datos de la Iniciativa
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                {postulacion.iniciativa?.tipo}
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-900">
              {postulacion.iniciativa?.titulo}
            </h4>

            <div>
              <span className="font-semibold text-slate-700">Descripción:</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                {postulacion.iniciativa?.resumen_ejecutivo}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Sector tecnológico:</span>
                <p className="font-semibold text-slate-800">
                  {postulacion.iniciativa?.sector_tecnologico || "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Etapa actual:</span>
                <p className="font-semibold text-slate-800">
                  {postulacion.iniciativa?.etapa_actual || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* TRAZABILIDAD DE ORIGEN ACADÉMICO */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <GraduationCap className="h-4 w-4 text-red-600" />
              <span>Declaración de Origen Académico (HU-03)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 font-medium">Modalidad de Origen:</span>
                <p className="font-bold text-slate-800 capitalize mt-0.5">
                  {postulacion.origen_academico?.tipo?.replace(/_/g, " ")}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Detalle del origen:</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {postulacion.origen_academico?.detalle_origen || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* ESTUDIANTE POSTULANTE */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <Users className="h-4 w-4 text-red-600" />
              <span>Estudiante Postulante</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span className="font-bold text-slate-900">
                  {postulacion.equipo?.lider?.nombre}
                </span>
                <span className="text-[11px] text-slate-500 ml-2 font-mono">
                  ({postulacion.equipo?.lider?.correo})
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                Autor de la Iniciativa
              </span>
            </div>
          </div>

          {/* DOCUMENTO ADJUNTO */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="h-4 w-4 text-red-600" />
              <span>Documento adjunto</span>
            </div>

            <div className="space-y-2">
              {postulacion.documentacion?.archivos?.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => descargarDocumento(file)}
                    disabled={descargando}
                    className="flex min-w-0 items-center gap-2 text-left text-red-700 transition-colors hover:text-red-800 disabled:cursor-wait disabled:opacity-60"
                    title="Descargar PDF"
                  >
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="truncate font-medium underline decoration-red-200 underline-offset-2">
                      {file.nombre}
                    </span>
                    <span className="text-slate-400">({file.tamanio})</span>
                    <Download className="h-4 w-4 shrink-0" />
                  </button>
                  <span className="ml-2 shrink-0 text-[10px] font-semibold text-emerald-700">
                    {descargando ? "Descargando..." : "PDF"}
                  </span>
                </div>
              ))}
            </div>
            {errorDescarga && (
              <p role="alert" className="text-xs font-medium text-red-600">
                {errorDescarga}
              </p>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition-colors"
          >
            Cerrar Expediente
          </button>
        </div>
      </div>
    </div>
  );
}

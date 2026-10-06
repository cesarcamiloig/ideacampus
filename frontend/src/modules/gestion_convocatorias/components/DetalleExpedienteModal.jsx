import React from "react";
import {
  X,
  FileText,
  GraduationCap,
  Users,
  ExternalLink,
} from "lucide-react";

export default function DetalleExpedienteModal({ postulacion, onCerrar }) {
  if (!postulacion) return null;

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
                {postulacion.iniciativa?.categoria}
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-900">
              {postulacion.iniciativa?.titulo}
            </h4>

            <div>
              <span className="font-semibold text-slate-700">Resumen Ejecutivo:</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                {postulacion.iniciativa?.resumen_ejecutivo}
              </p>
            </div>

            <div>
              <span className="font-semibold text-slate-700">Problema y Solución:</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                {postulacion.iniciativa?.problema_solucion}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Madurez Tecnológica:</span>
                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  {postulacion.iniciativa?.trl_inicial}
                </span>
              </div>
              {postulacion.iniciativa?.impacto_esperado && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Impacto:</span>
                  <span className="text-slate-700 italic">
                    {postulacion.iniciativa.impacto_esperado}
                  </span>
                </div>
              )}
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

              {postulacion.origen_academico?.tipo === "asignatura" && (
                <>
                  <div>
                    <span className="text-slate-500 font-medium">Asignatura:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {postulacion.origen_academico.asignatura_nombre}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Docente Titular:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {postulacion.origen_academico.docente_titular}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Semestre Cursado:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {postulacion.origen_academico.asignatura_semestre || "2025-2"}
                    </p>
                  </div>
                </>
              )}

              {postulacion.origen_academico?.tipo === "semillero" && (
                <>
                  <div>
                    <span className="text-slate-500 font-medium">Semillero:</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      {postulacion.origen_academico.semillero_nombre}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Tutor / Coordinador:</span>
                    <p className="font-semibold text-slate-800 mt-0.5">
                      {postulacion.origen_academico.tutor_semillero}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Descripción de la Trayectoria Previa:</span>
              <p className="text-slate-700 mt-1 italic leading-relaxed">
                "{postulacion.origen_academico?.descripcion_origen}"
              </p>
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

          {/* DOCUMENTACIÓN ADJUNTA Y ENLACES */}
          <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="h-4 w-4 text-red-600" />
              <span>Documentación y Soportes Adjuntos</span>
            </div>

            <div className="space-y-2">
              {postulacion.documentacion?.archivos?.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-slate-800">{file.nombre}</span>
                    <span className="text-slate-400">({file.tamanio})</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Cargado
                  </span>
                </div>
              ))}
            </div>

            {postulacion.documentacion?.repositorio_url && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-slate-500 font-medium">Repositorio:</span>
                <a
                  href={postulacion.documentacion.repositorio_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-600 hover:underline flex items-center gap-1 font-mono"
                >
                  <span>{postulacion.documentacion.repositorio_url}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
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

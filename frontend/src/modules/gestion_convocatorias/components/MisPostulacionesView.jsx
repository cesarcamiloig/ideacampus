import React, { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  Layers,
  Search,
  Plus,
  GraduationCap,
  Eye,
} from "lucide-react";
import { getMisPostulaciones } from "../services/postulacionService";
import { useAuth } from "../../../context/AuthContext";
import DetalleExpedienteModal from "./DetalleExpedienteModal";
import ComprobanteRadicacionModal from "./ComprobanteRadicacionModal";

export default function MisPostulacionesView({ onNuevaPostulacion }) {
  const { usuario } = useAuth();
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPostulacion, setSelectedPostulacion] = useState(null);
  const [selectedComprobante, setSelectedComprobante] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getMisPostulaciones(usuario);
        if (isMounted) {
          setPostulaciones(data);
          setLoadError("");
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "No se pudieron cargar tus iniciativas.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [usuario]);

  const filtradas = postulaciones.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.radicado?.toLowerCase().includes(q) ||
      p.iniciativa?.titulo?.toLowerCase().includes(q) ||
      p.convocatoria?.nombre?.toLowerCase().includes(q) ||
      p.origen_academico?.tipo?.toLowerCase().includes(q)
    );
  });

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "radicada":
        return {
          label: "Radicada",
          color: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "en_revision":
        return {
          label: "En Revisión Documental",
          color: "bg-amber-100 text-amber-800 border-amber-200",
        };
      case "en_evaluacion":
        return {
          label: "En Evaluación Multicriterio",
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

  return (
    <div className="space-y-6">
      {/* HEADER DE MIS POSTULACIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <Layers className="h-3.5 w-3.5" />
              Trazabilidad Longitudinal
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Expedientes de Emprendimiento UFPS
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Mis Iniciativas Postuladas
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Consulta el estado de radicación, el origen académico declarado y la documentación de tus propuestas enviadas a convocatorias institucionales.
          </p>
        </div>

        {onNuevaPostulacion && (
          <button
            type="button"
            onClick={onNuevaPostulacion}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Postular a Convocatoria Abierta</span>
          </button>
        )}
      </div>

      {/* BARRA DE BÚSQUEDA Y ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por radicado, título de iniciativa o convocatoria..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Iniciativas:</span>
          <span className="text-base font-bold text-slate-900">
            {postulaciones.length}
          </span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
          <span className="mt-3 text-xs font-medium text-slate-500">
            Cargando tus postulaciones registradas...
          </span>
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          {loadError}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            Aún no has radicado ninguna iniciativa
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Explora las convocatorias abiertas de este periodo académico y postula tu proyecto declarando su origen académico.
          </p>
          {onNuevaPostulacion && (
            <button
              type="button"
              onClick={onNuevaPostulacion}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Ver Convocatorias Abiertas</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtradas.map((post) => {
            const badge = getEstadoBadge(post.estado);
            const fechaStr = new Date(post.fecha_radicacion).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={post.id || post.radicado}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100">
                      {post.radicado}
                    </span>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Radicada el {fechaStr}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {post.iniciativa?.titulo}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Convocatoria: </span>
                      <strong className="text-slate-700">
                        {post.convocatoria?.nombre}
                      </strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-slate-400">Origen: </span>
                      <span className="font-medium text-slate-800 capitalize">
                        {post.origen_academico?.tipo?.replace(/_/g, " ")}
                        {post.origen_academico?.detalle_origen &&
                          ` (${post.origen_academico.detalle_origen})`}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400">Etapa: </span>
                      <span className="font-bold text-red-600">
                        {post.iniciativa?.trl_inicial}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400">Archivos: </span>
                      <span className="font-medium text-slate-700">
                        {post.documentacion?.archivos?.length || 0} adjunto(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedComprobante(post)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <span>Comprobante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPostulacion(post)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Ver Expediente</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALLE DE EXPEDIENTE */}
      {selectedPostulacion && (
        <DetalleExpedienteModal
          postulacion={selectedPostulacion}
          onCerrar={() => setSelectedPostulacion(null)}
        />
      )}

      {/* MODAL DE COMPROBANTE DE RADICACIÓN */}
      {selectedComprobante && (
        <ComprobanteRadicacionModal
          postulacion={selectedComprobante}
          onCerrar={() => setSelectedComprobante(null)}
          onVerMisPostulaciones={() => setSelectedComprobante(null)}
        />
      )}
    </div>
  );
}

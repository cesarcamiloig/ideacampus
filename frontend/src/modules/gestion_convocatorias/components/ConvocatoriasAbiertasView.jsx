import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
} from "lucide-react";
import { getConvocatoriasAbiertas } from "../services/postulacionService";

export default function ConvocatoriasAbiertasView({ onSelectConvocatoria, onVerMisPostulaciones }) {
  const [convocatorias, setConvocatorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchConvocatorias() {
      setLoading(true);
      try {
        const data = await getConvocatoriasAbiertas();
        if (isMounted) {
          setConvocatorias(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("No fue posible cargar las convocatorias abiertas.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchConvocatorias();
    return () => {
      isMounted = false;
    };
  }, []);

  const categorias = [
    "todas",
    ...new Set(convocatorias.map((c) => c.categoria).filter(Boolean)),
  ];

  const convocatoriasFiltradas = convocatorias.filter((conv) => {
    const matchesSearch =
      conv.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.categoria?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria =
      categoriaFiltro === "todas" ||
      conv.categoria?.toLowerCase() === categoriaFiltro.toLowerCase();
    return matchesSearch && matchesCategoria;
  });

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return "Fecha no especificada";
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fechaStr;
    }
  };

  const calcularDiasRestantes = (fechaCierreStr) => {
    if (!fechaCierreStr) return null;
    const diff = new Date(fechaCierreStr).getTime() - Date.now();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  return (
    <div className="space-y-6">
      {/* HEADER INSTITUCIONAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              <BookOpen className="h-3.5 w-3.5" />
              HU-03: Postulación de Iniciativas
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Periodo Académico 2026-1
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Convocatorias Abiertas de Emprendimiento e Innovación
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Explora los ciclos de postulación activos publicados por el Programa de Ingeniería de Sistemas y radica tu proyecto declarando su origen académico.
          </p>
        </div>

        {onVerMisPostulaciones && (
          <button
            type="button"
            onClick={onVerMisPostulaciones}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors shrink-0"
          >
            <Layers className="h-4 w-4 text-slate-500" />
            Ver Mis Iniciativas Radicadas
          </button>
        )}
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, tecnología o área..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categorias.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap capitalize ${
                categoriaFiltro === cat
                  ? "bg-red-600 border-red-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {cat === "todas" ? "Todas las Áreas" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* LISTADO DE CONVOCATORIAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
          <span className="mt-3 text-xs font-medium text-slate-500">
            Consultando convocatorias vigentes en el servidor...
          </span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : convocatoriasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <FileText className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            No se encontraron convocatorias con estos criterios
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Prueba ajustando el término de búsqueda o seleccionando otra área temática.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setCategoriaFiltro("todas");
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {convocatoriasFiltradas.map((conv) => {
            const diasRestantes = calcularDiasRestantes(conv.fecha_cierre);
            const isExpanded = expandedCard === conv.id_convocatoria;

            return (
              <div
                key={conv.id_convocatoria}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          Convocatoria Abierta
                        </span>

                        {conv.categoria && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <Tag className="h-3 w-3 text-slate-400" />
                            {conv.categoria}
                          </span>
                        )}

                        {conv.periodo_nombre && (
                          <span className="text-[11px] text-slate-500 font-medium">
                            • {conv.periodo_nombre}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 leading-snug">
                        {conv.nombre}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {conv.descripcion || "Sin descripción proporcionada."}
                      </p>

                      {/* FECHAS Y CRONOGRAMA */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>Apertura: <strong>{formatearFecha(conv.fecha_apertura)}</strong></span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-red-500" />
                          <span>Límite de entrega: <strong className="text-slate-800">{formatearFecha(conv.fecha_cierre)}</strong></span>
                        </div>
                        {diasRestantes !== null && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200 text-[11px]">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>{diasRestantes === 0 ? "Cierra hoy" : `Quedan ${diasRestantes} días`}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BOTÓN DE ACCIÓN PRINCIPAL: POSTULARSE */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectConvocatoria(conv)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:shadow transition-all group"
                      >
                        <span>Postular Mi Iniciativa</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCard(isExpanded ? null : conv.id_convocatoria)
                        }
                        className="inline-flex items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 py-1"
                      >
                        <span>{isExpanded ? "Ocultar requisitos y rúbrica" : "Ver requisitos y rúbrica"}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN EXPANDIBLE: REQUISITOS Y CRITERIOS */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                          <FileText className="h-3.5 w-3.5 text-red-600" />
                          <span>Requisitos Documentales Obligatorios</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {conv.requisitos_documentacion ||
                            "1. Formato de propuesta técnica.\n2. Aval de origen académico firmado por el docente o tutor.\n3. Enlace a repositorio o prototipo funcional."}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                          <Layers className="h-3.5 w-3.5 text-red-600" />
                          <span>Criterios de Evaluación y Ponderación</span>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                          {conv.criterios_evaluacion ||
                            "Rigor técnico e innovación de la propuesta (40%), Trazabilidad y validación de origen académico (30%), Nivel de madurez tecnológica inicial TRL (30%)."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

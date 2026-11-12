import React, { useState, useEffect } from "react";
import { Calendar, Clock, FileText, CheckCircle2, ArrowRight, Layers, ChevronDown, ChevronUp, Tag } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  Buscador,
  Cargando,
  Distintivo,
  EncabezadoPagina,
  ErrorGeneral,
  EstadoVacio,
  Pestanas,
  Rotulo,
  TARJETA,
} from "../../../components/ui";
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
      } catch {
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
      <EncabezadoPagina
        seccion="Postulación de iniciativas · Periodo Académico 2026-1"
        titulo="Convocatorias Abiertas de Emprendimiento e Innovación"
        descripcion="Explora los ciclos de postulación activos publicados por el Programa de Ingeniería de Sistemas y radica tu proyecto declarando su origen académico."
        acciones={
          onVerMisPostulaciones && (
            <button type="button" onClick={onVerMisPostulaciones} className={BOTON_SECUNDARIO}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              Ver Mis Iniciativas Radicadas
            </button>
          )
        }
      />

      {/* Filtros y búsqueda */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Buscador
          className="flex-1"
          valor={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por nombre, tecnología o área…"
        />
        <Pestanas
          etiqueta="Área temática"
          valor={categoriaFiltro}
          onChange={setCategoriaFiltro}
          className="capitalize"
          opciones={categorias.map((cat) => ({ id: cat, label: cat === "todas" ? "Todas las Áreas" : cat }))}
        />
      </div>

      {loading ? (
        <Cargando texto="Consultando convocatorias vigentes en el servidor…" />
      ) : error ? (
        <ErrorGeneral mensaje={error} />
      ) : convocatorias.length === 0 ? (
        <EstadoVacio icono={FileText} titulo="No hay convocatorias abiertas en este momento">
          Actualmente no hay ciclos de postulación activos publicados en la plataforma.
        </EstadoVacio>
      ) : convocatoriasFiltradas.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo="No se encontraron convocatorias con estos criterios"
          accion={
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setCategoriaFiltro("todas");
              }}
              className={BOTON_SECUNDARIO}
            >
              Restablecer filtros
            </button>
          }
        >
          Prueba ajustando el término de búsqueda o seleccionando otra área temática.
        </EstadoVacio>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {convocatoriasFiltradas.map((conv) => {
            const diasRestantes = calcularDiasRestantes(conv.fecha_cierre);
            const isExpanded = expandedCard === conv.id_convocatoria;
            const idDetalle = `requisitos-${conv.id_convocatoria}`;

            return (
              <article key={conv.id_convocatoria} className={`${TARJETA} p-5 sm:p-6`}>
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Distintivo tono="rojo" icono={CheckCircle2}>
                        Convocatoria Abierta
                      </Distintivo>
                      {conv.categoria && (
                        <Distintivo tono="contorno" icono={Tag}>
                          {conv.categoria}
                        </Distintivo>
                      )}
                      {conv.periodo_nombre && <span className="text-xs font-medium text-slate-500">{conv.periodo_nombre}</span>}
                    </div>

                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-slate-900">{conv.nombre}</h3>

                    <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                      {conv.descripcion || "Sin descripción proporcionada."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        Apertura: <strong className="text-slate-800">{formatearFecha(conv.fecha_apertura)}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-ufps" aria-hidden="true" />
                        Límite de entrega: <strong className="text-slate-800">{formatearFecha(conv.fecha_cierre)}</strong>
                      </span>
                      {diasRestantes !== null && (
                        <span className="flex items-center gap-1 font-semibold text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          {diasRestantes === 0 ? "Cierra hoy" : `Quedan ${diasRestantes} días`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-stretch justify-between gap-2 border-t border-slate-100 pt-3 sm:flex-row lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
                    <button type="button" onClick={() => onSelectConvocatoria(conv)} className={BOTON_PRIMARIO}>
                      Postular Mi Iniciativa
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedCard(isExpanded ? null : conv.id_convocatoria)}
                      aria-expanded={isExpanded}
                      aria-controls={idDetalle}
                      className={BOTON_FANTASMA}
                    >
                      {isExpanded ? "Ocultar requisitos y rúbrica" : "Ver requisitos y rúbrica"}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    id={idDetalle}
                    className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 animate-aparecer motion-reduce:animate-desvanecer md:grid-cols-2"
                  >
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Rotulo as="h4" className="mb-2 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
                        Requisitos Documentales Obligatorios
                      </Rotulo>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                        {conv.requisitos_documentacion ||
                          "1. Formato de propuesta técnica.\n2. Aval de origen académico firmado por el docente o tutor.\n3. Enlace a repositorio o prototipo funcional."}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <Rotulo as="h4" className="mb-2 flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
                        Criterios de Evaluación y Ponderación
                      </Rotulo>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                        {conv.criterios_evaluacion ||
                          "Rigor técnico e innovación de la propuesta (40%), Trazabilidad y validación de origen académico (30%), Nivel de madurez tecnológica inicial TRL (30%)."}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

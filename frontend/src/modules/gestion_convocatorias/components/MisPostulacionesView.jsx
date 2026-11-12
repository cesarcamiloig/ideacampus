import React, { useState, useEffect } from "react";
import { FileText, Calendar, Plus, GraduationCap, Eye } from "lucide-react";
import {
  BOTON_OSCURO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  Buscador,
  Cargando,
  Distintivo,
  EncabezadoPagina,
  ErrorGeneral,
  EstadoVacio,
  SECCION,
  TARJETA,
} from "../../../components/ui";
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
        return { label: "Radicada", tono: "gris" };
      case "en_revision":
        return { label: "En Revisión Documental", tono: "contorno" };
      case "en_evaluacion":
        return { label: "En Evaluación Multicriterio", tono: "oscuro" };
      case "aceptada":
        return { label: "Aceptada / Seleccionada", tono: "rojo" };
      default:
        return { label: estado, tono: "gris" };
    }
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Trazabilidad longitudinal"
        titulo="Mis Iniciativas Postuladas"
        descripcion="Consulta el estado de radicación, el origen académico declarado y la documentación de tus propuestas enviadas a convocatorias institucionales."
        acciones={
          onNuevaPostulacion && (
            <button type="button" onClick={onNuevaPostulacion} className={BOTON_PRIMARIO}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Postular a Convocatoria Abierta
            </button>
          )
        }
      />

      {/* Búsqueda y total */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Buscador
          className="md:col-span-3"
          valor={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por radicado, título de iniciativa o convocatoria…"
        />
        <div className={`${TARJETA} flex items-center justify-between px-4 py-2`}>
          <span className="text-xs font-medium text-slate-500">Total iniciativas</span>
          <span className="text-lg font-bold text-slate-900">{postulaciones.length}</span>
        </div>
      </div>

      {loading ? (
        <Cargando texto="Cargando tus postulaciones registradas…" />
      ) : loadError ? (
        <ErrorGeneral mensaje={loadError} />
      ) : filtradas.length === 0 ? (
        <EstadoVacio
          icono={FileText}
          titulo="Aún no has radicado ninguna iniciativa"
          accion={
            onNuevaPostulacion && (
              <button type="button" onClick={onNuevaPostulacion} className={BOTON_PRIMARIO}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Ver Convocatorias Abiertas
              </button>
            )
          }
        >
          Explora las convocatorias abiertas de este periodo académico y postula tu proyecto declarando su origen académico.
        </EstadoVacio>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
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
              <li
                key={post.id || post.radicado}
                className={`${TARJETA} flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${SECCION} font-mono`}>{post.radicado}</span>
                    <Distintivo tono={badge.tono}>{badge.label}</Distintivo>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      Radicada el {fechaStr}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold leading-snug text-slate-900">{post.iniciativa?.titulo}</h3>

                  <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <div className="flex gap-1">
                      <dt className="text-slate-500">Convocatoria:</dt>
                      <dd className="font-semibold text-slate-800">{post.convocatoria?.nombre}</dd>
                    </div>
                    <div className="flex items-center gap-1">
                      <dt className="flex items-center gap-1 text-slate-500">
                        <GraduationCap className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        Origen:
                      </dt>
                      <dd className="font-medium capitalize text-slate-800">
                        {post.origen_academico?.tipo?.replace(/_/g, " ")}
                        {post.origen_academico?.detalle_origen && ` (${post.origen_academico.detalle_origen})`}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="text-slate-500">Etapa:</dt>
                      <dd className="font-bold text-ufps">{post.iniciativa?.trl_inicial}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="text-slate-500">Archivos:</dt>
                      <dd className="font-medium text-slate-800">{post.documentacion?.archivos?.length || 0} adjunto(s)</dd>
                    </div>
                  </dl>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                  <button type="button" onClick={() => setSelectedComprobante(post)} className={BOTON_SECUNDARIO}>
                    Comprobante
                  </button>
                  <button type="button" onClick={() => setSelectedPostulacion(post)} className={BOTON_OSCURO}>
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Ver Expediente
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
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

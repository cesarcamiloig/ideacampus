import React, { useState } from "react";
import { FileText, Layers } from "lucide-react";
import ConvocatoriasAbiertasView from "../components/ConvocatoriasAbiertasView";
import FormularioPostulacion from "../components/FormularioPostulacion";
import MisPostulacionesView from "../components/MisPostulacionesView";
import ComprobanteRadicacionModal from "../components/ComprobanteRadicacionModal";

export default function EstudianteIniciativasPage({ initialTab = "convocatorias" }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'convocatorias' | 'mis_postulaciones'
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState(null);
  const [comprobanteModal, setComprobanteModal] = useState(null);

  const handleSelectConvocatoria = (convocatoria) => {
    setConvocatoriaSeleccionada(convocatoria);
  };

  const handleCancelarPostulacion = () => {
    setConvocatoriaSeleccionada(null);
  };

  const handlePostulacionExitosa = (nuevaPostulacion) => {
    setConvocatoriaSeleccionada(null);
    setComprobanteModal(nuevaPostulacion);
    setActiveTab("mis_postulaciones");
  };

  return (
    <div className="w-full space-y-6">
      {/* NAVEGACIÓN SECUNDARIA SI NO ESTÁ EN MEDIO DE UN FORMULARIO */}
      {!convocatoriaSeleccionada && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("convocatorias")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "convocatorias"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Convocatorias Abiertas (HU-03)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mis_postulaciones")}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "mis_postulaciones"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Mis Iniciativas y Radicados</span>
          </button>
        </div>
      )}

      {/* VISTA SEGÚN ESTADO */}
      {convocatoriaSeleccionada ? (
        <FormularioPostulacion
          convocatoria={convocatoriaSeleccionada}
          onCancelar={handleCancelarPostulacion}
          onPostulacionExitosa={handlePostulacionExitosa}
        />
      ) : activeTab === "convocatorias" ? (
        <ConvocatoriasAbiertasView
          onSelectConvocatoria={handleSelectConvocatoria}
          onVerMisPostulaciones={() => setActiveTab("mis_postulaciones")}
        />
      ) : (
        <MisPostulacionesView
          onNuevaPostulacion={() => setActiveTab("convocatorias")}
        />
      )}

      {/* MODAL DE COMPROBANTE TRAS RADICAR EXITOSAMENTE */}
      {comprobanteModal && (
        <ComprobanteRadicacionModal
          postulacion={comprobanteModal}
          onCerrar={() => setComprobanteModal(null)}
          onVerMisPostulaciones={() => {
            setComprobanteModal(null);
            setActiveTab("mis_postulaciones");
          }}
        />
      )}
    </div>
  );
}

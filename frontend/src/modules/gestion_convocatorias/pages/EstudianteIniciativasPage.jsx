import React, { useState, useEffect } from "react";
import ConvocatoriasAbiertasView from "../components/ConvocatoriasAbiertasView";
import FormularioPostulacion from "../components/FormularioPostulacion";
import MisPostulacionesView from "../components/MisPostulacionesView";
import ComprobanteRadicacionModal from "../components/ComprobanteRadicacionModal";

export default function EstudianteIniciativasPage({ initialTab = "convocatorias", onNavigate }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'convocatorias' | 'mis_postulaciones'
  const [convocatoriaSeleccionada, setConvocatoriaSeleccionada] = useState(null);
  const [comprobanteModal, setComprobanteModal] = useState(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleSelectConvocatoria = (convocatoria) => {
    setConvocatoriaSeleccionada(convocatoria);
  };

  const handleCancelarPostulacion = () => {
    setConvocatoriaSeleccionada(null);
  };

  const handlePostulacionExitosa = (nuevaPostulacion) => {
    setConvocatoriaSeleccionada(null);
    setComprobanteModal(nuevaPostulacion);
    if (onNavigate) {
      onNavigate("mi-iniciativa");
    } else {
      setActiveTab("mis_postulaciones");
    }
  };

  const handleVerMisPostulaciones = () => {
    if (onNavigate) {
      onNavigate("mi-iniciativa");
    } else {
      setActiveTab("mis_postulaciones");
    }
  };

  const handleNuevaPostulacion = () => {
    if (onNavigate) {
      onNavigate("postulaciones");
    } else {
      setActiveTab("convocatorias");
    }
  };

  return (
    <div className="w-full space-y-6">
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
          onVerMisPostulaciones={handleVerMisPostulaciones}
        />
      ) : (
        <MisPostulacionesView
          onNuevaPostulacion={handleNuevaPostulacion}
        />
      )}

      {/* MODAL DE COMPROBANTE TRAS RADICAR EXITOSAMENTE */}
      {comprobanteModal && (
        <ComprobanteRadicacionModal
          postulacion={comprobanteModal}
          onCerrar={() => setComprobanteModal(null)}
          onVerMisPostulaciones={() => {
            setComprobanteModal(null);
            handleVerMisPostulaciones();
          }}
        />
      )}
    </div>
  );
}

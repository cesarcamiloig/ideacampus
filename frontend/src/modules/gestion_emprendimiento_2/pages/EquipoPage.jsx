import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { obtenerMiEquipo } from "../services/equipoService";
import MiEquipoView from "./MiEquipoView";
import EquipoForm from "./EquipoForm";

export default function EquipoPage() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [equipoData, setEquipoData] = useState(null);

  const cargarEquipo = async () => {
    setCargando(true);
    setError("");
    try {
      const data = await obtenerMiEquipo();
      if (data && data.tiene_equipo && data.equipo) {
        setEquipoData(data.equipo);
      } else {
        setEquipoData(null);
      }
    } catch (err) {
      console.error("Error al obtener información del equipo:", err);
      setError(err.message || "Error al verificar el estado de tu equipo.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEquipo();
  }, []);

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-red-600 mb-3" />
        <span className="text-sm font-medium text-slate-600">
          Cargando información del equipo emprendedor...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <h4 className="font-bold">Error al cargar equipo</h4>
        </div>
        <p>{error}</p>
        <button
          type="button"
          onClick={cargarEquipo}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (equipoData) {
    return (
      <MiEquipoView
        equipo={equipoData}
        onActualizarEquipo={cargarEquipo}
      />
    );
  }

  return (
    <EquipoForm
      onEquipoCreado={cargarEquipo}
    />
  );
}

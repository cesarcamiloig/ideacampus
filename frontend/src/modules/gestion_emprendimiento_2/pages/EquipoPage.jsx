import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, ShieldAlert, FileText, RefreshCw, CheckCircle2 } from "lucide-react";
import { obtenerMiEquipo, obtenerMisIniciativasAprobadas } from "../services/equipoService";
import MiEquipoView from "./MiEquipoView";
import EquipoForm from "./EquipoForm";

export default function EquipoPage({ onIrAConvocatorias }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [equipoData, setEquipoData] = useState(null);
  const [iniciativasAprobadas, setIniciativasAprobadas] = useState([]);

  const cargarEquipo = async () => {
    setCargando(true);
    setError("");
    try {
      const [dataEquipo, dataIniciativas] = await Promise.all([
        obtenerMiEquipo(),
        obtenerMisIniciativasAprobadas(),
      ]);

      if (dataEquipo && dataEquipo.tiene_equipo && dataEquipo.equipo) {
        setEquipoData(dataEquipo.equipo);
      } else {
        setEquipoData(null);
      }

      setIniciativasAprobadas(Array.isArray(dataIniciativas) ? dataIniciativas : []);
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
          Verificando estado de equipo e iniciativas aprobadas...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <h4 className="font-bold">Error al consultar información</h4>
        </div>
        <p className="text-xs text-red-700">{error}</p>
        <button
          type="button"
          onClick={cargarEquipo}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // 1. Si ya pertenece a un equipo, mostrar MiEquipoView
  if (equipoData) {
    return (
      <MiEquipoView
        equipo={equipoData}
        onActualizarEquipo={cargarEquipo}
      />
    );
  }

  // 2. Si no tiene equipo y NO tiene iniciativas aprobadas, mostrar requisito institucional
  if (iniciativasAprobadas.length === 0) {
    return (
      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Requisito Institucional · HU-03 & HU-04
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Iniciativa Aprobada Requerida para Registrar Equipo
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                De acuerdo con el reglamento del ecosistema GENNOVA UFPS, un estudiante únicamente puede registrar un equipo de trabajo cuando la iniciativa correspondiente haya sido radicada y aprobada por la coordinación.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-red-600 uppercase">Paso 1 · Postulación</span>
              <h4 className="text-xs font-bold text-slate-800">Radicar Iniciativa</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Postula tu solución técnica en una convocatoria abierta declarando su origen académico.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-amber-600 uppercase">Paso 2 · Evaluación</span>
              <h4 className="text-xs font-bold text-slate-800">Aprobación Institucional</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                La coordinación de emprendimiento revisa los soportes y emite la aprobación de tu iniciativa.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-600 uppercase">Paso 3 · Conformación</span>
              <h4 className="text-xs font-bold text-slate-800">Registro de Equipo</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Una vez aprobada, se habilitará automáticamente este formulario para vincular a tus compañeros.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={cargarEquipo}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              <span>Verificar Aprobaciones Nuevas</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Si tiene iniciativas aprobadas disponibles, habilitar el formulario
  return (
    <EquipoForm
      onEquipoCreado={cargarEquipo}
      iniciativasAprobadas={iniciativasAprobadas}
    />
  );
}


import React, { useState, useEffect } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { BOTON_SECUNDARIO, CabeceraTarjeta, Cargando, ErrorCarga, Tarjeta } from "../../../components/ui";
import { obtenerMiEquipo, obtenerMisIniciativasAprobadas } from "../services/equipoService";
import MiEquipoView from "./MiEquipoView";
import EquipoForm from "./EquipoForm";

export default function EquipoPage({ onIrAConvocatorias, onEstadoEquipoCambiado }) {
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
      // Al crear, abandonar o disolver el equipo se actualiza lo que se muestra en el menú "Proyecto"
      if (onEstadoEquipoCambiado) {
        onEstadoEquipoCambiado();
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
    return <Cargando texto="Verificando estado de equipo e iniciativas aprobadas..." />;
  }

  if (error) {
    return <ErrorCarga titulo="Error al consultar información" mensaje={error} onReintentar={cargarEquipo} />;
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
    const pasos = [
      {
        rotulo: "Paso 1 · Postulación",
        titulo: "Radicar Iniciativa",
        desc: "Postula tu solución técnica en una convocatoria abierta declarando su origen académico.",
      },
      {
        rotulo: "Paso 2 · Evaluación",
        titulo: "Aprobación Institucional",
        desc: "La coordinación de emprendimiento revisa los soportes y emite la aprobación de tu iniciativa.",
      },
      {
        rotulo: "Paso 3 · Conformación",
        titulo: "Registro de Equipo",
        desc: "Una vez aprobada, se habilitará automáticamente este formulario para vincular a tus compañeros.",
      },
    ];
    return (
      <Tarjeta
        cabecera={
          <CabeceraTarjeta
            seccion="Requisito Institucional"
            titulo="Iniciativa Aprobada Requerida para Registrar Equipo"
            descripcion="De acuerdo con el reglamento del ecosistema GENNOVA UFPS, un estudiante únicamente puede registrar un equipo de trabajo cuando la iniciativa correspondiente haya sido radicada y aprobada por la coordinación."
          />
        }
      >
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-ufps" aria-hidden="true" />
          <ol className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
            {pasos.map((paso) => (
              <li key={paso.rotulo} className="space-y-1.5 rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">{paso.rotulo}</p>
                <h4 className="text-sm font-semibold text-slate-900">{paso.titulo}</h4>
                <p className="text-xs leading-relaxed text-slate-600">{paso.desc}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <button type="button" onClick={cargarEquipo} className={BOTON_SECUNDARIO}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Verificar Aprobaciones Nuevas
          </button>
        </div>
      </Tarjeta>
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


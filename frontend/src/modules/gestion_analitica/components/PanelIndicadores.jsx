import { CabeceraTarjeta, Tarjeta } from "../../../components/ui";
import { formatoDecimal, formatoPorcentaje } from "../utils/filtrosAnalitica";
import AtencionRequerida from "./AtencionRequerida";
import { EscaleraMadurez } from "./Graficos";

// Indicadores del dashboard: qué requiere atención y cómo avanza la madurez tecnológica
export default function PanelIndicadores({ metricas: m, filtros, opciones, onFiltrar }) {
  const madurez = m.madurez || {};

  // Un nivel solo filtra si existe en las opciones del backend
  function filtrarNivel(valor) {
    if (valor === "" || opciones.nivel_madurez?.some((o) => o.valor === valor)) onFiltrar("nivel_madurez", valor);
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Tarjeta
        className="xl:col-span-2"
        cabecera={
          <CabeceraTarjeta
            seccion="Atención requerida"
            titulo="Qué revisar primero"
            descripcion="Pendientes de los proyectos filtrados, de mayor a menor."
          />
        }
      >
        <AtencionRequerida metricas={m} filtros={filtros} onFiltrar={onFiltrar} />
      </Tarjeta>

      <Tarjeta
        className="xl:col-span-3"
        cabecera={
          <CabeceraTarjeta
            seccion="Madurez tecnológica"
            titulo="Escalera de madurez M0 a M9"
            descripcion={`Nivel promedio ${madurez.nivel_promedio == null ? "—" : `M${formatoDecimal(madurez.nivel_promedio, 1)}`} · ${madurez.proyectos_con_avance_madurez ?? 0} proyecto(s) por encima de M0 (${formatoPorcentaje(madurez.tasa_avance_madurez)}). Toca un nivel para filtrar.`}
          />
        }
      >
        {madurez.distribucion?.length ? (
          <EscaleraMadurez niveles={madurez.distribucion} seleccionado={filtros.nivel_madurez} onSeleccionar={filtrarNivel} />
        ) : (
          <p className="py-6 text-center text-sm text-slate-500">Sin niveles de madurez registrados.</p>
        )}
      </Tarjeta>
    </div>
  );
}

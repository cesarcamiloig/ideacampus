import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Lock, RefreshCw } from "lucide-react";
import {
  BOTON_SECUNDARIO,
  Cargando,
  EncabezadoPagina,
  ErrorCarga,
  EstadoVacio,
  Pagina,
} from "../../../components/ui";
import {
  construirQuery,
  getMetricasPorQuery,
  getOpcionesFiltros,
  getProyectosPorQuery,
  mensajeErrorAnalitica,
} from "../services/analiticaService";
import { FILTROS_INICIALES, construirOpciones, errorRangoFechas } from "../utils/filtrosAnalitica";
import PanelFiltros from "../components/PanelFiltros";
import TarjetasResumen from "../components/TarjetasResumen";
import TablaProyectos from "../components/TablaProyectos";
import PanelIndicadores from "../components/PanelIndicadores";

const TAMANO_PAGINA = 20;
const ORDEN_INICIAL = "-creado";

// Resultado de una petición asociado a la clave con la que se pidió: si la clave actual no
// coincide, esa sección está cargando (así no hace falta poner "cargando" dentro del efecto)
const SIN_RESPUESTA = { clave: null, datos: null, error: null };

function useConsulta(clave, pedir) {
  const [resultado, setResultado] = useState(SIN_RESPUESTA);
  useEffect(() => {
    if (clave === null) return undefined;
    let vigente = true;
    pedir().then(
      (datos) => vigente && setResultado({ clave, datos, error: null }),
      (error) => vigente && setResultado((prev) => ({ clave, datos: prev.datos, error })),
    );
    return () => {
      vigente = false;
    };
    // `pedir` cambia con la clave: la clave es la que decide cuándo volver a consultar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return { ...resultado, cargando: clave !== null && resultado.clave !== clave };
}

// HU-14: Dashboard de indicadores y métricas de impacto para la Dirección del Programa
export default function DashboardAnaliticaPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState(ORDEN_INICIAL);
  const [intento, setIntento] = useState(0);

  const errorFechas = errorRangoFechas(filtros);
  // Con un rango de fechas invertido no se consulta: se conserva lo último mostrado
  const query = errorFechas ? null : construirQuery(filtros);

  const opcionesConsulta = useConsulta(`filtros|${intento}`, getOpcionesFiltros);
  const metricas = useConsulta(query === null ? null : `${query}|${intento}`, () => getMetricasPorQuery(query));
  const proyectos = useConsulta(query === null ? null : `${query}|${page}|${ordering}|${intento}`, () =>
    getProyectosPorQuery(query, { page, pageSize: TAMANO_PAGINA, ordering }),
  );

  const opciones = useMemo(() => construirOpciones(opcionesConsulta.datos || {}), [opcionesConsulta.datos]);

  const cambiarFiltro = useCallback((clave, valor) => {
    setFiltros((prev) => (prev[clave] === valor ? prev : { ...prev, [clave]: valor }));
    setPage(1);
  }, []);

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    setPage(1);
  }

  function cambiarOrden(nuevo) {
    setOrdering(nuevo);
    setPage(1);
  }

  const sinAcceso = [opcionesConsulta.error, metricas.error, proyectos.error].some((e) => e?.status === 403);
  if (sinAcceso) {
    return (
      <EstadoVacio icono={Lock} titulo="No tienes acceso a este módulo">
        El dashboard de indicadores solo está disponible para la Dirección del Programa. Cambia al rol de Dirección desde tu
        perfil para consultarlo.
      </EstadoVacio>
    );
  }

  const m = metricas.datos;

  // Si el servicio no responde y aún no hay nada que mostrar, un solo aviso en lugar de
  // repetir el mismo error en filtros, indicadores y tabla
  const errorInicial = !m && !metricas.cargando ? metricas.error || (!opcionesConsulta.datos && opcionesConsulta.error) : null;
  if (errorInicial) {
    return (
      <Pagina>
        <EncabezadoPagina
          seccion="Métricas e indicadores"
          titulo="Indicadores de impacto del programa"
          descripcion="Proyectos de emprendimiento e innovación, aprobación por hitos, madurez tecnológica, tutoría y seguimiento."
        />
        <ErrorCarga
          titulo="No se pudieron cargar los indicadores"
          mensaje={mensajeErrorAnalitica(errorInicial)}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      </Pagina>
    );
  }

  const total = m?.resumen?.total_proyectos;
  const actualizando = metricas.cargando || proyectos.cargando;

  return (
    <Pagina>
      <EncabezadoPagina
        seccion="Métricas e indicadores"
        titulo="Indicadores de impacto del programa"
        descripcion="Proyectos de emprendimiento e innovación, aprobación por hitos, madurez tecnológica, tutoría y seguimiento, con filtros combinables para sustentar procesos de acreditación y toma de decisiones."
        acciones={
          <button type="button" onClick={() => setIntento((n) => n + 1)} disabled={actualizando} className={BOTON_SECUNDARIO}>
            <RefreshCw className={`h-4 w-4 ${actualizando ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualizar
          </button>
        }
      >
        {m ? (
          <TarjetasResumen metricas={m} />
        ) : metricas.error ? null : (
          <Cargando texto="Calculando indicadores…" enTarjeta={false} />
        )}
      </EncabezadoPagina>

      {opcionesConsulta.error && (
        <ErrorCarga
          titulo="No se pudieron cargar las opciones de los filtros"
          mensaje={mensajeErrorAnalitica(opcionesConsulta.error)}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      )}

      <PanelFiltros
        filtros={filtros}
        opciones={opciones}
        onCambiar={cambiarFiltro}
        onLimpiar={limpiarFiltros}
        errorFechas={errorFechas}
        totalProyectos={total}
      />

      {metricas.error && (
        <ErrorCarga
          titulo={m ? "No se pudieron actualizar los indicadores" : "No se pudieron cargar los indicadores"}
          mensaje={`${mensajeErrorAnalitica(metricas.error)}${m ? " Se muestran los últimos datos cargados." : ""}`}
          onReintentar={() => setIntento((n) => n + 1)}
        />
      )}

      {m && total === 0 && (
        <EstadoVacio icono={BarChart3} titulo="No hay proyectos con estos filtros">
          Prueba con otra combinación o limpia los filtros. Los proyectos se crean cuando se aprueba una iniciativa en la
          convocatoria.
        </EstadoVacio>
      )}

      {m && total > 0 && (
        <div className={`transition-opacity ${metricas.cargando ? "opacity-60" : ""}`} aria-busy={metricas.cargando}>
          <PanelIndicadores metricas={m} filtros={filtros} opciones={opciones} onFiltrar={cambiarFiltro} />
        </div>
      )}

      <TablaProyectos
        datos={proyectos.datos}
        cargando={proyectos.cargando}
        error={proyectos.error ? mensajeErrorAnalitica(proyectos.error) : null}
        page={page}
        pageSize={TAMANO_PAGINA}
        ordering={ordering}
        onPagina={setPage}
        onOrdenar={cambiarOrden}
      />
    </Pagina>
  );
}

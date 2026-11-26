import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Lock, RefreshCw } from "lucide-react";
import {
  BOTON_SECUNDARIO,
  CabeceraTarjeta,
  Cargando,
  EncabezadoPagina,
  ErrorCarga,
  EstadoVacio,
  Estadistica,
  Estadisticas,
  Pagina,
  Tarjeta,
} from "../../../components/ui";
import {
  construirQuery,
  getMetricasPorQuery,
  getOpcionesFiltros,
  getProyectosPorQuery,
  mensajeErrorAnalitica,
} from "../services/analiticaService";
import {
  FILTROS_INICIALES,
  aBarras,
  construirOpciones,
  errorRangoFechas,
  formatoDecimal,
  formatoPorcentaje,
} from "../utils/filtrosAnalitica";
import PanelFiltros from "../components/PanelFiltros";
import TarjetasResumen from "../components/TarjetasResumen";
import TablaProyectos from "../components/TablaProyectos";
import { BarrasHorizontales, Columnas } from "../components/Graficos";

const TAMANO_PAGINA = 20;
const ORDEN_INICIAL = "-creado";
const SERIE_MADUREZ = [{ id: "proyectos", label: "Proyectos", clase: "bg-ufps" }];

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

function TarjetaGrafico({ seccion, titulo, descripcion, children }) {
  return (
    <Tarjeta cabecera={<CabeceraTarjeta seccion={seccion} titulo={titulo} descripcion={descripcion} />}>{children}</Tarjeta>
  );
}

function SinDatos({ children = "Sin datos para estos filtros." }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
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

  // Clic en una barra: aplica su valor al filtro (o lo quita si ya estaba). Solo se aceptan
  // valores que existen en las opciones del backend, p. ej. "Sin tutor" no es un id de tutor.
  function filtrarDesde(clave) {
    return (valor) => {
      if (valor === "" || opciones[clave]?.some((o) => o.valor === valor)) cambiarFiltro(clave, valor);
    };
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
  const madurez = m?.madurez;
  const seguimiento = m?.seguimiento || {};
  const evaluacion = m?.evaluacion || {};
  const caracterizacion = m?.caracterizacion || {};
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
          <TarjetasResumen
            metricas={m}
            filtroAprobados={filtros.aprobado_hitos}
            onFiltrarAprobados={(v) => cambiarFiltro("aprobado_hitos", v)}
          />
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
        <div className={`space-y-6 transition-opacity ${metricas.cargando ? "opacity-60" : ""}`} aria-busy={metricas.cargando}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <TarjetaGrafico seccion="Vigencia" titulo="Proyectos por estado" descripcion="Activos frente a pausados, finalizados o cancelados.">
              {m.por_estado?.length ? <BarrasHorizontales datos={aBarras(m.por_estado)} etiqueta="Proyectos por estado" /> : <SinDatos />}
            </TarjetaGrafico>

            <TarjetaGrafico seccion="Tipo" titulo="Emprendimiento e innovación" descripcion="Toca un tipo para filtrar.">
              {m.por_tipo?.length ? (
                <BarrasHorizontales
                  datos={aBarras(m.por_tipo)}
                  etiqueta="Proyectos por tipo"
                  seleccionado={filtros.tipo}
                  onSeleccionar={filtrarDesde("tipo")}
                />
              ) : (
                <SinDatos />
              )}
            </TarjetaGrafico>

            <TarjetaGrafico
              seccion="Madurez tecnológica"
              titulo="Proyectos por nivel (M0 a M9)"
              descripcion={`Nivel promedio ${madurez?.nivel_promedio == null ? "—" : `M${formatoDecimal(madurez.nivel_promedio, 1)}`} · ${formatoPorcentaje(madurez?.tasa_avance_madurez)} con avance.`}
            >
              {madurez?.distribucion?.length ? (
                <Columnas
                  datos={madurez.distribucion.map((n) => ({
                    clave: n.nivel,
                    etiqueta: n.nivel,
                    detalle: n.etiqueta,
                    valores: { proyectos: n.total },
                  }))}
                  series={SERIE_MADUREZ}
                  etiqueta="Proyectos por nivel de madurez"
                />
              ) : (
                <SinDatos />
              )}
            </TarjetaGrafico>

            <TarjetaGrafico seccion="Evolución" titulo="Proyectos por periodo" descripcion="Toca un periodo para filtrar.">
              {m.por_periodo?.length ? (
                <BarrasHorizontales
                  datos={aBarras(m.por_periodo)}
                  etiqueta="Proyectos por periodo"
                  seleccionado={filtros.periodo}
                  onSeleccionar={filtrarDesde("periodo")}
                />
              ) : (
                <SinDatos />
              )}
            </TarjetaGrafico>

            <TarjetaGrafico seccion="Acompañamiento" titulo="Proyectos por tutor" descripcion="Toca un tutor para filtrar.">
              {m.por_tutor?.length ? (
                <BarrasHorizontales
                  datos={aBarras(m.por_tutor)}
                  etiqueta="Proyectos por tutor"
                  seleccionado={filtros.tutor}
                  onSeleccionar={filtrarDesde("tutor")}
                />
              ) : (
                <SinDatos />
              )}
            </TarjetaGrafico>

            <TarjetaGrafico seccion="Seguimiento" titulo="Actividades, avances y evaluaciones">
              <Estadisticas columnas="grid-cols-2">
                <Estadistica
                  etiqueta="Actividades"
                  valor={`${seguimiento.actividades_completadas ?? 0} / ${seguimiento.actividades_total ?? 0}`}
                  detalle={`Cumplimiento ${formatoPorcentaje(seguimiento.tasa_cumplimiento_actividades)}`}
                />
                <Estadistica etiqueta="Vencidas" valor={seguimiento.actividades_vencidas ?? 0} detalle="Actividades sin completar a tiempo" />
                <Estadistica
                  etiqueta="Registros de avance"
                  valor={seguimiento.registros_avance ?? 0}
                  detalle={`Avance promedio ${formatoPorcentaje(seguimiento.porcentaje_avance_promedio)}`}
                />
                <Estadistica etiqueta="Evidencias" valor={seguimiento.evidencias_registradas ?? 0} detalle={`${seguimiento.proyectos_con_avance ?? 0} proyecto(s) con avance`} />
                <Estadistica
                  etiqueta="Evaluaciones"
                  valor={`${evaluacion.evaluaciones_calificadas ?? 0} / ${evaluacion.evaluaciones_registradas ?? 0}`}
                  detalle="Calificadas / registradas"
                />
                <Estadistica
                  etiqueta="Nota promedio"
                  valor={evaluacion.nota_promedio == null ? "—" : formatoDecimal(evaluacion.nota_promedio)}
                  detalle="Promedio de todas las notas (0 a 5)"
                />
              </Estadisticas>
            </TarjetaGrafico>
          </div>

          <Tarjeta
            cabecera={
              <CabeceraTarjeta
                seccion="Caracterización"
                titulo="Origen, sector, etapa y semestre"
                descripcion="Toca una barra para filtrar por esa variable."
              />
            }
          >
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              {[
                { clave: "origen_academico", titulo: "Origen académico", datos: caracterizacion.origen_academico },
                { clave: "sector_tecnologico", titulo: "Sector tecnológico", datos: caracterizacion.sector_tecnologico },
                { clave: "etapa_actual", titulo: "Etapa actual", datos: caracterizacion.etapa_actual },
                { clave: "semestre", titulo: "Semestre de los estudiantes", datos: caracterizacion.semestre_estudiantes },
              ].map((bloque) => (
                <div key={bloque.clave}>
                  <h3 className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{bloque.titulo}</h3>
                  {bloque.datos?.length ? (
                    <BarrasHorizontales
                      datos={aBarras(bloque.datos)}
                      etiqueta={bloque.titulo}
                      seleccionado={filtros[bloque.clave]}
                      onSeleccionar={filtrarDesde(bloque.clave)}
                    />
                  ) : (
                    <SinDatos />
                  )}
                </div>
              ))}
            </div>
          </Tarjeta>
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

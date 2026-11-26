import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Download,
  FilterX,
  FolderKanban,
  Gauge,
  Info,
  Lightbulb,
  RefreshCw,
  Star,
} from "lucide-react";
import {
  AvisoPanel,
  BOTON_FANTASMA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CabeceraTarjeta,
  Cargando,
  Distintivo,
  EncabezadoPagina,
  ErrorCarga,
  EstadoVacio,
  Estadistica,
  Estadisticas,
  Pagina,
  Selector,
  TABLA_FILA,
  TABLA_TD,
  Tabla,
  Tarjeta,
} from "../../../components/ui";
import { cargarDatosDashboard } from "../services/dashboardService";
import { BarrasHorizontales, Columnas } from "../components/Graficos";
import {
  ESTADOS_INICIATIVA,
  FILTROS_VACIOS,
  ORIGENES_ACADEMICOS,
  aplicarFiltros,
  calcularIndicadores,
  cargaPorTutor,
  distribucionEstados,
  distribucionMadurez,
  distribucionOrigen,
  distribucionTipo,
  evolucionPorPeriodo,
  formatoMadurez,
  formatoNota,
  formatoPorcentaje,
  hayFiltros,
  opcionesFiltros,
  registrosACsv,
} from "../utils/metricas";

const FILAS_POR_PAGINA = 10;

const SERIES_PERIODO = [
  { id: "radicadas", label: "Radicadas", clase: "bg-slate-800" },
  { id: "aprobadas", label: "Aprobadas", clase: "bg-ufps" },
];
const SERIE_MADUREZ = [{ id: "proyectos", label: "Proyectos", clase: "bg-ufps" }];

const COLUMNAS_TABLA = [
  { id: "iniciativa", label: "Iniciativa" },
  { id: "estudiante", label: "Estudiante" },
  { id: "periodo", label: "Periodo · Cohorte" },
  { id: "tutor", label: "Tutor" },
  { id: "estado", label: "Estado" },
  { id: "madurez", label: "Madurez", className: "text-center" },
  { id: "nota", label: "Nota", className: "text-right" },
];

function horaCorta(fecha) {
  return fecha?.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) ?? "";
}

function descargarCsv(registros) {
  const blob = new Blob([registrosACsv(registros)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `indicadores-gennova-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

// HU-14: Dashboard de métricas e indicadores para la Dirección del Programa
export default function DashboardMetricasPage() {
  const [estado, setEstado] = useState({ cargando: true, error: null, registros: [], avisos: [], actualizado: null });
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [filasVisibles, setFilasVisibles] = useState(FILAS_POR_PAGINA);

  const obtenerDatos = useCallback(
    () =>
      cargarDatosDashboard().then(
        (datos) => setEstado({ cargando: false, error: null, ...datos }),
        (err) =>
          setEstado((prev) => ({ ...prev, cargando: false, error: err.message || "No se pudieron cargar los indicadores." })),
      ),
    [],
  );

  // El estado inicial ya está en "cargando": el efecto solo dispara la primera carga
  useEffect(() => {
    let vigente = true;
    cargarDatosDashboard().then(
      (datos) => vigente && setEstado({ cargando: false, error: null, ...datos }),
      (err) =>
        vigente &&
        setEstado((prev) => ({ ...prev, cargando: false, error: err.message || "No se pudieron cargar los indicadores." })),
    );
    return () => {
      vigente = false;
    };
  }, []);

  function cargar() {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));
    obtenerDatos();
  }

  const { registros } = estado;
  const opciones = useMemo(() => opcionesFiltros(registros), [registros]);
  const filtrados = useMemo(() => aplicarFiltros(registros, filtros), [registros, filtros]);
  const indicadores = useMemo(() => calcularIndicadores(filtrados), [filtrados]);

  // Las gráficas por estado ignoran el filtro de estado para poder ver el embudo completo
  // y elegir otro estado desde la propia gráfica
  const sinFiltroEstado = useMemo(() => aplicarFiltros(registros, { ...filtros, estado: "" }), [registros, filtros]);

  const graficos = useMemo(
    () => ({
      estados: distribucionEstados(sinFiltroEstado),
      madurez: distribucionMadurez(filtrados),
      periodos: evolucionPorPeriodo(filtrados),
      origen: distribucionOrigen(filtrados),
      tipo: distribucionTipo(filtrados),
      tutores: cargaPorTutor(filtrados),
    }),
    [filtrados, sinFiltroEstado],
  );

  function cambiarFiltro(clave, valor) {
    setFiltros((prev) => ({ ...prev, [clave]: valor }));
    setFilasVisibles(FILAS_POR_PAGINA);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_VACIOS);
    setFilasVisibles(FILAS_POR_PAGINA);
  }

  if (estado.cargando && registros.length === 0) {
    return <Cargando texto="Calculando indicadores…" detalle="Reuniendo iniciativas, proyectos, madurez y evaluaciones." />;
  }

  if (estado.error && registros.length === 0) {
    return <ErrorCarga titulo="No se pudieron cargar los indicadores" mensaje={estado.error} onReintentar={cargar} />;
  }

  const filtrosActivos = hayFiltros(filtros);
  const sinDatos = registros.length === 0;

  return (
    <Pagina>
      <EncabezadoPagina
        seccion="Métricas e indicadores"
        titulo="Métricas e indicadores de impacto"
        descripcion="Consolidado de iniciativas, proyectos, madurez tecnológica y evaluaciones del Programa de Ingeniería de Sistemas, con filtros para sustentar procesos de acreditación y toma de decisiones."
        acciones={
          <>
            <button type="button" onClick={cargar} disabled={estado.cargando} className={BOTON_SECUNDARIO}>
              <RefreshCw className={`h-4 w-4 ${estado.cargando ? "animate-spin" : ""}`} aria-hidden="true" />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => descargarCsv(filtrados)}
              disabled={filtrados.length === 0}
              className={BOTON_PRIMARIO}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </button>
          </>
        }
      >
        <Estadisticas columnas="sm:grid-cols-2 lg:grid-cols-5">
          <Estadistica
            icono={Lightbulb}
            etiqueta="Iniciativas radicadas"
            valor={indicadores.total}
            detalle={`${indicadores.estudiantes} estudiante(s) postulante(s)`}
          />
          <Estadistica
            icono={CheckCircle2}
            etiqueta="Tasa de aprobación"
            valor={formatoPorcentaje(indicadores.tasaAprobacion)}
            detalle={
              indicadores.dictaminadas
                ? `${indicadores.aprobadas} de ${indicadores.dictaminadas} dictaminada(s)`
                : "Sin iniciativas dictaminadas"
            }
          />
          <Estadistica
            icono={FolderKanban}
            etiqueta="Proyectos activos"
            valor={indicadores.proyectos}
            detalle={
              indicadores.proyectos
                ? `${formatoPorcentaje(indicadores.coberturaTutoria)} con tutor asignado`
                : "Sin proyectos aprobados"
            }
          />
          <Estadistica
            icono={Gauge}
            etiqueta="Madurez promedio"
            valor={formatoMadurez(indicadores.madurezPromedio)}
            detalle={
              indicadores.proyectosConMadurez
                ? `${indicadores.sobreM0} proyecto(s) por encima de M0`
                : "Sin niveles registrados"
            }
          />
          <Estadistica
            icono={Star}
            etiqueta="Nota promedio"
            valor={indicadores.notaPromedio == null ? "—" : `${formatoNota(indicadores.notaPromedio)} / 5`}
            detalle={`${indicadores.proyectosEvaluados} proyecto(s) evaluado(s)`}
          />
        </Estadisticas>
      </EncabezadoPagina>

      {estado.error && (
        <AvisoPanel aviso={{ tipo: "error", titulo: "No se pudo actualizar", detalle: `${estado.error} Se muestran los últimos datos cargados.` }} />
      )}

      {estado.avisos.length > 0 && (
        <AvisoPanel
          aviso={{
            tipo: "error",
            titulo: "Algunos datos no están completos",
            detalle: estado.avisos.join(" "),
          }}
        />
      )}

      {/* FILTROS */}
      <Tarjeta
        cabecera={
          <CabeceraTarjeta
            seccion="Filtros"
            titulo="Segmentar indicadores"
            descripcion={
              filtrosActivos
                ? `${filtrados.length} de ${registros.length} iniciativa(s) cumplen los filtros.`
                : `Mostrando las ${registros.length} iniciativa(s) registradas.`
            }
            acciones={
              filtrosActivos && (
                <button type="button" onClick={limpiarFiltros} className={BOTON_FANTASMA}>
                  <FilterX className="h-4 w-4" aria-hidden="true" />
                  Limpiar filtros
                </button>
              )
            }
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Selector
            etiqueta="Periodo"
            valor={filtros.periodo}
            onChange={(v) => cambiarFiltro("periodo", v)}
            opciones={opciones.periodos}
            placeholder="Todos los periodos"
          />
          <Selector
            etiqueta="Cohorte (convocatoria)"
            valor={filtros.cohorte}
            onChange={(v) => cambiarFiltro("cohorte", v)}
            opciones={opciones.cohortes}
            placeholder="Todas las cohortes"
          />
          <Selector
            etiqueta="Estudiante"
            valor={filtros.estudiante}
            onChange={(v) => cambiarFiltro("estudiante", v)}
            opciones={opciones.estudiantes}
            placeholder="Todos los estudiantes"
          />
          <Selector
            etiqueta="Tutor"
            valor={filtros.tutor}
            onChange={(v) => cambiarFiltro("tutor", v)}
            opciones={opciones.tutores}
            placeholder="Todos los tutores"
          />
          <Selector
            etiqueta="Estado"
            valor={filtros.estado}
            onChange={(v) => cambiarFiltro("estado", v)}
            opciones={opciones.estados}
            placeholder="Todos los estados"
          />
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          La cohorte agrupa a los estudiantes que postularon en una misma convocatoria. El periodo es el de la convocatoria
          (o el semestre de radicación cuando la convocatoria no tiene uno).
        </p>
      </Tarjeta>

      {sinDatos ? (
        <EstadoVacio icono={BarChart3} titulo="Aún no hay iniciativas registradas">
          Los indicadores aparecerán cuando los estudiantes radiquen iniciativas en las convocatorias.
        </EstadoVacio>
      ) : filtrados.length === 0 ? (
        <EstadoVacio
          icono={FilterX}
          titulo="Ninguna iniciativa cumple los filtros"
          accion={
            <button type="button" onClick={limpiarFiltros} className={BOTON_SECUNDARIO}>
              Limpiar filtros
            </button>
          }
        >
          Prueba con otra combinación de periodo, cohorte, estudiante, tutor o estado.
        </EstadoVacio>
      ) : (
        <>
          {/* GRÁFICAS */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Tarjeta
              cabecera={
                <CabeceraTarjeta
                  seccion="Embudo"
                  titulo="Iniciativas por estado"
                  descripcion="Toca un estado para filtrar el tablero."
                />
              }
            >
              <BarrasHorizontales
                datos={graficos.estados}
                etiqueta="Iniciativas por estado"
                seleccionado={filtros.estado}
                onSeleccionar={(v) => cambiarFiltro("estado", v)}
              />
            </Tarjeta>

            <Tarjeta
              cabecera={
                <CabeceraTarjeta
                  seccion="Madurez tecnológica"
                  titulo="Proyectos por nivel (M0 a M9)"
                  descripcion={`${indicadores.proyectosConMadurez} proyecto(s) con nivel registrado.`}
                />
              }
            >
              {indicadores.proyectosConMadurez ? (
                <Columnas datos={graficos.madurez} series={SERIE_MADUREZ} etiqueta="Proyectos por nivel de madurez" />
              ) : (
                <EstadoVacio icono={Gauge} titulo="Sin niveles de madurez" enTarjeta={false}>
                  Los niveles aparecen cuando los evaluadores dictaminan la madurez de los proyectos aprobados.
                </EstadoVacio>
              )}
            </Tarjeta>

            <Tarjeta
              cabecera={
                <CabeceraTarjeta
                  seccion="Evolución"
                  titulo="Radicadas y aprobadas por periodo"
                />
              }
            >
              <Columnas datos={graficos.periodos} series={SERIES_PERIODO} etiqueta="Iniciativas radicadas y aprobadas por periodo" />
            </Tarjeta>

            <Tarjeta
              cabecera={<CabeceraTarjeta seccion="Trazabilidad" titulo="Origen académico de las iniciativas" />}
            >
              <BarrasHorizontales datos={graficos.origen} etiqueta="Iniciativas por origen académico" />
              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {graficos.tipo.map((t) => (
                  <Distintivo key={t.clave} tono="contorno">
                    {t.etiqueta}: <span className="tabular-nums">{t.valor}</span>
                  </Distintivo>
                ))}
              </div>
            </Tarjeta>
          </div>

          <Tarjeta
            cabecera={
              <CabeceraTarjeta
                seccion="Acompañamiento"
                titulo="Proyectos por tutor"
                descripcion={
                  indicadores.proyectos
                    ? `${indicadores.conTutor} de ${indicadores.proyectos} proyecto(s) tienen tutor asignado.`
                    : undefined
                }
              />
            }
          >
            {graficos.tutores.length ? (
              <BarrasHorizontales
                datos={graficos.tutores}
                etiqueta="Proyectos por tutor"
                mostrarPorcentaje={false}
                seleccionado={filtros.tutor}
                onSeleccionar={(v) => cambiarFiltro("tutor", v)}
              />
            ) : (
              <EstadoVacio icono={FolderKanban} titulo="Sin tutores asignados" enTarjeta={false}>
                Ningún proyecto de esta selección tiene un tutor académico asignado todavía.
              </EstadoVacio>
            )}
          </Tarjeta>

          {/* DETALLE */}
          <section className="space-y-3" aria-labelledby="detalle-iniciativas">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="detalle-iniciativas" className="text-base font-semibold text-slate-900">
                  Detalle de iniciativas
                </h2>
                <p className="text-xs text-slate-500">
                  {filtrados.length} registro(s){estado.actualizado && ` · Datos actualizados a las ${horaCorta(estado.actualizado)}`}
                </p>
              </div>
            </div>

            <Tabla columnas={COLUMNAS_TABLA} etiqueta="Detalle de iniciativas filtradas">
              {filtrados.slice(0, filasVisibles).map((r) => (
                <tr key={r.id} className={TABLA_FILA}>
                  <td className={TABLA_TD}>
                    <p className="font-semibold text-slate-900">{r.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {r.radicado} · {ORIGENES_ACADEMICOS[r.origen] || "Sin origen"}
                    </p>
                  </td>
                  <td className={TABLA_TD}>{r.estudiante}</td>
                  <td className={TABLA_TD}>
                    <p>{r.periodo}</p>
                    <p className="text-xs text-slate-500">{r.cohorte}</p>
                  </td>
                  <td className={TABLA_TD}>
                    {r.idProyecto == null ? (
                      <span className="text-slate-400">Sin proyecto</span>
                    ) : (
                      r.tutor || <span className="text-slate-500">Sin tutor</span>
                    )}
                  </td>
                  <td className={TABLA_TD}>
                    <Distintivo tono={ESTADOS_INICIATIVA[r.estado].tono}>{ESTADOS_INICIATIVA[r.estado].label}</Distintivo>
                  </td>
                  <td className={`${TABLA_TD} text-center font-semibold tabular-nums text-slate-900`}>{r.madurez || "—"}</td>
                  <td className={`${TABLA_TD} text-right tabular-nums`}>{formatoNota(r.nota)}</td>
                </tr>
              ))}
            </Tabla>

            {filtrados.length > filasVisibles && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setFilasVisibles((n) => n + FILAS_POR_PAGINA)}
                  className={BOTON_SECUNDARIO}
                >
                  Mostrar más ({filtrados.length - filasVisibles} restantes)
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </Pagina>
  );
}

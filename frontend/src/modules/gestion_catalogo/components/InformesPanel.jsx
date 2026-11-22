import { useCallback, useEffect, useRef, useState } from "react";
import { FileDown, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  Campo,
  Cargando,
  ErrorCarga,
  ErrorGeneral,
  Estadistica,
  Estadisticas,
  Rotulo,
  Selector,
  Tarjeta,
} from "../../../components/ui";
import { useManejarErrorSesion } from "../../gestion_acompaniamiento/components/panelUtilidades";
import { descargarInforme, getResumenInforme } from "../services/catalogoService";
import {
  ESTADOS,
  OPCIONES_CATALOGO,
  ORIGENES,
  TIPOS,
  guardarArchivo,
  nombreInforme,
} from "../utils/catalogoUtils";

const FILTROS_VACIOS = { estado: "", tipo: "", origen: "", convocatoria: "", desde: "", hasta: "", catalogo: "" };

// Totales de una categoría con una barra proporcional al total del informe
function Desglose({ titulo, items, total }) {
  return (
    <div className="space-y-3">
      <Rotulo>{titulo}</Rotulo>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos para estos filtros.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.etiqueta} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700">{item.etiqueta}</span>
                <span className="shrink-0 font-semibold text-slate-900">{item.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-ufps"
                  style={{ width: `${total ? Math.round((item.total / total) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Informe de iniciativas: filtros, vista previa de totales y descarga en Excel o CSV
export default function InformesPanel() {
  const manejarErrorSesion = useManejarErrorSesion();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [resumen, setResumen] = useState(null);
  const [convocatorias, setConvocatorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [descargando, setDescargando] = useState(null); // "xlsx" | "csv"
  const [errorDescarga, setErrorDescarga] = useState("");

  // Solo la última consulta actualiza la vista si se cambian los filtros mientras carga
  const ultimaConsulta = useRef(0);
  const cargar = useCallback(
    async (valores) => {
      const consulta = ++ultimaConsulta.current;
      setCargando(true);
      setErrorCarga("");
      try {
        const datos = await getResumenInforme(valores);
        if (consulta !== ultimaConsulta.current) return;
        setResumen(datos);
        // Las convocatorias se conservan aunque un filtro deje el resumen vacío
        if (datos.convocatorias?.length) setConvocatorias(datos.convocatorias);
      } catch (err) {
        if (consulta !== ultimaConsulta.current || manejarErrorSesion(err)) return;
        setErrorCarga(err.message || "No se pudo generar la vista previa del informe.");
      } finally {
        if (consulta === ultimaConsulta.current) setCargando(false);
      }
    },
    [manejarErrorSesion]
  );

  useEffect(() => {
    cargar(filtros);
  }, [cargar, filtros]);

  function cambiarFiltro(campo, valor) {
    setErrorDescarga("");
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  async function descargar(formato) {
    setDescargando(formato);
    setErrorDescarga("");
    try {
      guardarArchivo(await descargarInforme(filtros, formato), nombreInforme(formato));
    } catch (err) {
      if (!manejarErrorSesion(err)) setErrorDescarga(err.message || "No se pudo descargar el informe.");
    } finally {
      setDescargando(null);
    }
  }

  const hayFiltros = Object.values(filtros).some(Boolean);
  const total = resumen?.total ?? 0;

  return (
    <div className="space-y-6">
      <Tarjeta>
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Rotulo as="h2">Filtros del informe</Rotulo>
              <p className="mt-1 text-sm text-slate-600">
                La vista previa y los archivos descargados usan los mismos filtros.
              </p>
            </div>
            {hayFiltros && (
              <button type="button" onClick={() => setFiltros(FILTROS_VACIOS)} className={BOTON_FANTASMA}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Selector
              etiqueta="Estado"
              valor={filtros.estado}
              onChange={(v) => cambiarFiltro("estado", v)}
              opciones={ESTADOS}
              placeholder="Todos los estados"
            />
            <Selector
              etiqueta="Tipo"
              valor={filtros.tipo}
              onChange={(v) => cambiarFiltro("tipo", v)}
              opciones={TIPOS}
              placeholder="Todos los tipos"
            />
            <Selector
              etiqueta="Origen académico"
              valor={filtros.origen}
              onChange={(v) => cambiarFiltro("origen", v)}
              opciones={ORIGENES}
              placeholder="Todos los orígenes"
            />
            <Selector
              etiqueta="Convocatoria"
              valor={filtros.convocatoria}
              onChange={(v) => cambiarFiltro("convocatoria", v)}
              opciones={convocatorias.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
              placeholder="Todas las convocatorias"
            />
            <Campo etiqueta="Postuladas desde">
              {(props) => (
                <input
                  {...props}
                  type="date"
                  value={filtros.desde}
                  max={filtros.hasta || undefined}
                  onChange={(e) => cambiarFiltro("desde", e.target.value)}
                  className={CAMPO}
                />
              )}
            </Campo>
            <Campo etiqueta="Postuladas hasta">
              {(props) => (
                <input
                  {...props}
                  type="date"
                  value={filtros.hasta}
                  min={filtros.desde || undefined}
                  onChange={(e) => cambiarFiltro("hasta", e.target.value)}
                  className={CAMPO}
                />
              )}
            </Campo>
            <Selector
              etiqueta="Catálogo público"
              valor={filtros.catalogo}
              onChange={(v) => cambiarFiltro("catalogo", v)}
              opciones={OPCIONES_CATALOGO}
              placeholder="Todas"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {cargando ? "Calculando…" : `${total} ${total === 1 ? "iniciativa incluida" : "iniciativas incluidas"} en el informe.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => descargar("csv")}
                disabled={Boolean(descargando) || cargando || total === 0}
                className={BOTON_SECUNDARIO}
              >
                {descargando === "csv" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                )}
                Descargar CSV
              </button>
              <button
                type="button"
                onClick={() => descargar("xlsx")}
                disabled={Boolean(descargando) || cargando || total === 0}
                className={BOTON_PRIMARIO}
              >
                {descargando === "xlsx" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                )}
                Descargar Excel
              </button>
            </div>
          </div>
          <ErrorGeneral mensaje={errorDescarga} />
        </div>
      </Tarjeta>

      {errorCarga ? (
        <ErrorCarga titulo="No se pudo generar la vista previa" mensaje={errorCarga} onReintentar={() => cargar(filtros)} />
      ) : !resumen ? (
        <Cargando texto="Generando la vista previa del informe…" />
      ) : (
        <Tarjeta>
          <div className={`space-y-6 transition-opacity ${cargando ? "opacity-60" : ""}`} aria-busy={cargando}>
            <Estadisticas>
              <Estadistica etiqueta="Iniciativas" valor={resumen.total} detalle="Según los filtros aplicados" />
              <Estadistica etiqueta="Con proyecto" valor={resumen.con_proyecto} detalle="Aprobadas y formalizadas" />
              <Estadistica
                etiqueta="En el catálogo público"
                valor={resumen.publicadas_catalogo}
                detalle="Autorizadas para difusión"
              />
            </Estadisticas>
            <div className="grid grid-cols-1 gap-8 border-t border-slate-100 pt-6 md:grid-cols-2">
              <Desglose titulo="Por estado" items={resumen.por_estado} total={resumen.total} />
              <Desglose titulo="Por tipo" items={resumen.por_tipo} total={resumen.total} />
              <Desglose titulo="Por origen académico" items={resumen.por_origen} total={resumen.total} />
              <Desglose titulo="Por nivel de madurez" items={resumen.por_madurez} total={resumen.con_proyecto} />
            </div>
          </div>
        </Tarjeta>
      )}
    </div>
  );
}

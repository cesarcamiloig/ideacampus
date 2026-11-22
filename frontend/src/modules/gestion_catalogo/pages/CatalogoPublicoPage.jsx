import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2, CalendarDays, Gauge, Globe, Layers, LogIn, Users } from "lucide-react";
import {
  BLOQUE_SUAVE,
  BOTON_SECUNDARIO,
  Buscador,
  Cargando,
  Distintivo,
  ErrorCarga,
  EstadoVacio,
  Pagina,
  Pestanas,
  ROTULO,
  SECCION,
  Selector,
  TARJETA,
} from "../../../components/ui";
import { getCatalogoPublico } from "../services/catalogoService";
import { ORIGENES, formatoFecha } from "../utils/catalogoUtils";

function FichaIniciativa({ iniciativa }) {
  const datos = [
    { icono: Building2, texto: iniciativa.origen_academico_display + (iniciativa.detalle_origen ? ` · ${iniciativa.detalle_origen}` : "") },
    iniciativa.sector_tecnologico && { icono: Layers, texto: iniciativa.sector_tecnologico },
    iniciativa.equipo && { icono: Users, texto: `Equipo ${iniciativa.equipo}` },
    iniciativa.nivel_madurez_display && { icono: Gauge, texto: iniciativa.nivel_madurez_display },
    iniciativa.convocatoria && { icono: CalendarDays, texto: iniciativa.convocatoria },
  ].filter(Boolean);

  return (
    <article className={`${TARJETA} flex flex-col gap-4 p-5 sm:p-6`}>
      <header className="space-y-1">
        <p className={SECCION}>{iniciativa.tipo_display}</p>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{iniciativa.nombre}</h2>
      </header>

      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{iniciativa.resumen_publico}</p>

      {iniciativa.resultados && (
        <div className={BLOQUE_SUAVE}>
          <p className={ROTULO}>Resultados</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{iniciativa.resultados}</p>
        </div>
      )}

      <ul className="mt-auto space-y-1.5 border-t border-slate-100 pt-4">
        {datos.map(({ icono: Icono, texto }) => (
          <li key={texto} className="flex items-start gap-2 text-xs text-slate-600">
            <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="min-w-0 break-words">{texto}</span>
          </li>
        ))}
      </ul>
      {iniciativa.fecha_publicacion && (
        <p className="text-[11px] text-slate-400">Publicada el {formatoFecha(iniciativa.fecha_publicacion)}</p>
      )}
    </article>
  );
}

// Catálogo público de iniciativas autorizadas por la coordinación. Se abre sin iniciar sesión.
// onSalir lleva al inicio de sesión (o de vuelta a la plataforma si ya hay sesión).
export default function CatalogoPublicoPage({ onSalir, haySesion = false }) {
  const [iniciativas, setIniciativas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("todas");
  const [origen, setOrigen] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setIniciativas(await getCatalogoPublico());
    } catch (err) {
      setError(err.message || "No se pudo cargar el catálogo de iniciativas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const q = busqueda.trim().toLowerCase();
  const visibles = iniciativas.filter((i) => {
    const texto = [i.nombre, i.resumen_publico, i.resultados, i.sector_tecnologico, i.equipo]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (tipo === "todas" || i.tipo === tipo) && (!origen || i.origen_academico === origen) && (!q || texto.includes(q));
  });
  const contar = (valor) => iniciativas.filter((i) => i.tipo === valor).length;

  return (
    <div className="min-h-screen bg-superficie">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ufps text-white">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-marca text-sm font-bold tracking-[0.05em] text-slate-900">GENNOVA</p>
              <p className="truncate text-xs text-slate-500">Universidad Francisco de Paula Santander</p>
            </div>
          </div>
          <button type="button" onClick={onSalir} className={BOTON_SECUNDARIO}>
            {haySesion ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            {haySesion ? "Volver a la plataforma" : "Iniciar sesión"}
          </button>
        </div>
      </header>

      <main className="px-4 py-8 sm:px-6">
        <Pagina>
          <section className={`${TARJETA} space-y-5 p-5 sm:p-8`}>
            <div className="space-y-2">
              <p className={SECCION}>Catálogo de iniciativas</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Emprendimiento e innovación estudiantil
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
                Iniciativas de estudiantes del Programa de Ingeniería de Sistemas, aprobadas y autorizadas por la
                coordinación de emprendimiento para difundir sus resultados.
              </p>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
              <Pestanas
                etiqueta="Filtrar por tipo de iniciativa"
                valor={tipo}
                onChange={setTipo}
                opciones={[
                  { id: "todas", label: "Todas", count: iniciativas.length },
                  { id: "emprendimiento", label: "Emprendimiento", count: contar("emprendimiento") },
                  { id: "innovacion", label: "Innovación", count: contar("innovacion") },
                ]}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Selector
                  valor={origen}
                  onChange={setOrigen}
                  opciones={ORIGENES}
                  placeholder="Todos los orígenes"
                  className="sm:w-56"
                />
                <Buscador
                  valor={busqueda}
                  onChange={setBusqueda}
                  placeholder="Buscar iniciativas…"
                  className="sm:w-64"
                />
              </div>
            </div>
          </section>

          {cargando ? (
            <Cargando texto="Cargando el catálogo…" />
          ) : error ? (
            <ErrorCarga titulo="No se pudo cargar el catálogo" mensaje={error} onReintentar={cargar} />
          ) : visibles.length === 0 ? (
            <EstadoVacio icono={Globe} titulo={iniciativas.length ? "Ninguna iniciativa coincide" : "Aún no hay iniciativas publicadas"}>
              {iniciativas.length
                ? "Prueba con otros términos de búsqueda o quita los filtros."
                : "Pronto encontrarás aquí las iniciativas que la coordinación autorice para su difusión."}
            </EstadoVacio>
          ) : (
            <>
              <p className="text-sm text-slate-600" aria-live="polite">
                <Distintivo tono="oscuro">{visibles.length}</Distintivo>{" "}
                {visibles.length === 1 ? "iniciativa encontrada" : "iniciativas encontradas"}
              </p>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {visibles.map((iniciativa) => (
                  <FichaIniciativa key={iniciativa.id_iniciativa} iniciativa={iniciativa} />
                ))}
              </div>
            </>
          )}
        </Pagina>
      </main>
    </div>
  );
}

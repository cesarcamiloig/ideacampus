import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, ExternalLink, Globe, PencilLine } from "lucide-react";
import {
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_SM,
  Buscador,
  Cargando,
  Distintivo,
  ErrorCarga,
  EstadoVacio,
  FilaMensaje,
  Pestanas,
  TABLA_FILA,
  TABLA_TD,
  Tabla,
  Toast,
} from "../../../components/ui";
import { useManejarErrorSesion } from "../../gestion_acompaniamiento/components/panelUtilidades";
import { getCatalogoGestion } from "../services/catalogoService";
import { RUTA_CATALOGO, formatoFecha } from "../utils/catalogoUtils";
import FichaCatalogoPanel from "./FichaCatalogoPanel";

const COLUMNAS = [
  { id: "iniciativa", label: "Iniciativa" },
  { id: "equipo", label: "Equipo" },
  { id: "madurez", label: "Madurez" },
  { id: "catalogo", label: "Catálogo" },
  { id: "acciones", label: "", className: "text-right" },
];

function EstadoCatalogo({ iniciativa }) {
  if (iniciativa.en_catalogo) {
    return (
      <div className="space-y-1">
        <Distintivo tono="rojo" icono={Globe}>Publicada</Distintivo>
        <p className="text-xs text-slate-500">Desde {formatoFecha(iniciativa.publicacion?.fecha_publicacion)}</p>
      </div>
    );
  }
  return iniciativa.publicacion ? (
    <Distintivo tono="contorno">Borrador</Distintivo>
  ) : (
    <Distintivo tono="gris">Sin ficha</Distintivo>
  );
}

// Iniciativas aprobadas y su autorización para el catálogo público
export default function GestionCatalogoPanel() {
  const manejarErrorSesion = useManejarErrorSesion();
  const [iniciativas, setIniciativas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todas");
  const [seleccionada, setSeleccionada] = useState(null);
  const [toast, setToast] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      setIniciativas(await getCatalogoGestion());
    } catch (err) {
      if (!manejarErrorSesion(err)) setErrorCarga(err.message || "No se pudieron cargar las iniciativas aprobadas.");
    } finally {
      setCargando(false);
    }
  }, [manejarErrorSesion]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!toast) return undefined;
    const temporizador = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(temporizador);
  }, [toast]);

  function alGuardar(actualizada) {
    setIniciativas((prev) => prev.map((i) => (i.id_iniciativa === actualizada.id_iniciativa ? actualizada : i)));
    setSeleccionada(null);
    setToast(actualizada.en_catalogo ? "La iniciativa quedó publicada en el catálogo." : "Ficha guardada sin publicar.");
  }

  if (cargando) return <Cargando texto="Cargando iniciativas aprobadas…" />;
  if (errorCarga) return <ErrorCarga titulo="No se pudo cargar el catálogo" mensaje={errorCarga} onReintentar={cargar} />;
  if (iniciativas.length === 0) {
    return (
      <EstadoVacio icono={BookOpenCheck} titulo="Aún no hay iniciativas aprobadas">
        Cuando se apruebe una iniciativa podrás autorizar su difusión en el catálogo público.
      </EstadoVacio>
    );
  }

  const publicadas = iniciativas.filter((i) => i.en_catalogo).length;
  const q = busqueda.trim().toLowerCase();
  const visibles = iniciativas.filter((i) => {
    const coincideFiltro =
      filtro === "todas" || (filtro === "publicadas" ? i.en_catalogo : !i.en_catalogo);
    const texto = [i.nombre, i.radicado, i.equipo, i.postulante].filter(Boolean).join(" ").toLowerCase();
    return coincideFiltro && (!q || texto.includes(q));
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Pestanas
          etiqueta="Filtrar por estado en el catálogo"
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { id: "todas", label: "Todas", count: iniciativas.length },
            { id: "publicadas", label: "Publicadas", count: publicadas },
            { id: "sin_publicar", label: "Sin publicar", count: iniciativas.length - publicadas },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Buscador
            valor={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por nombre, radicado o equipo…"
            className="sm:w-72"
          />
          <a href={RUTA_CATALOGO} target="_blank" rel="noopener noreferrer" className={BOTON_SECUNDARIO}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ver catálogo público
            <span className="sr-only">(se abre en otra pestaña)</span>
          </a>
        </div>
      </div>

      <Tabla columnas={COLUMNAS} etiqueta="Iniciativas aprobadas y su estado en el catálogo">
        {visibles.length === 0 ? (
          <FilaMensaje columnas={COLUMNAS.length}>No hay iniciativas que coincidan con la búsqueda.</FilaMensaje>
        ) : (
          visibles.map((iniciativa) => (
            <tr key={iniciativa.id_iniciativa} className={TABLA_FILA}>
              <td className={`${TABLA_TD} max-w-xs`}>
                <p className="font-semibold text-slate-900">{iniciativa.nombre}</p>
                <p className="text-xs text-slate-500">
                  {iniciativa.radicado} · {iniciativa.tipo_display}
                </p>
              </td>
              <td className={TABLA_TD}>{iniciativa.equipo || <span className="text-slate-400">Sin equipo</span>}</td>
              <td className={TABLA_TD}>{iniciativa.nivel_madurez_display || <span className="text-slate-400">—</span>}</td>
              <td className={TABLA_TD}>
                <EstadoCatalogo iniciativa={iniciativa} />
              </td>
              <td className={`${TABLA_TD} text-right`}>
                <button
                  type="button"
                  onClick={() => setSeleccionada(iniciativa)}
                  aria-haspopup="dialog"
                  className={BOTON_SECUNDARIO_SM}
                >
                  <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                  {iniciativa.publicacion ? "Editar ficha" : "Preparar ficha"}
                </button>
              </td>
            </tr>
          ))
        )}
      </Tabla>

      {seleccionada && (
        <FichaCatalogoPanel
          key={seleccionada.id_iniciativa}
          iniciativa={seleccionada}
          onClose={() => setSeleccionada(null)}
          onGuardada={alGuardar}
        />
      )}
      <Toast mensaje={toast} onCerrar={() => setToast("")} />
    </div>
  );
}

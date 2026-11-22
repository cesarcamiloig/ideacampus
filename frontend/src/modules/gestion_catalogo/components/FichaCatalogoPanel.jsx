import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AYUDA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  Campo,
  ErrorGeneral,
  Interruptor,
  PanelLateral,
  Rotulo,
} from "../../../components/ui";
import { useManejarErrorSesion } from "../../gestion_acompaniamiento/components/panelUtilidades";
import { guardarPublicacion } from "../services/catalogoService";
import { formatoFecha } from "../utils/catalogoUtils";

const MAX_RESUMEN = 1500;

// Campos del 400 que se muestran junto a su campo; el resto va al mensaje general
const CAMPOS = ["publicada", "resumen_publico", "resultados"];

function erroresDelServidor(err) {
  if (err.status !== 400 || !err.data || typeof err.data !== "object") {
    return { general: err.message || "No se pudo guardar la ficha del catálogo." };
  }
  const resultado = {};
  const generales = [];
  Object.entries(err.data).forEach(([campo, valor]) => {
    const texto = Array.isArray(valor) ? valor.join(" ") : String(valor);
    if (CAMPOS.includes(campo)) resultado[campo] = texto;
    else generales.push(texto);
  });
  if (generales.length) resultado.general = generales.join(" ");
  return resultado;
}

// Ficha pública de una iniciativa aprobada: resumen, resultados y autorización de difusión
export default function FichaCatalogoPanel({ iniciativa, onClose, onGuardada }) {
  const manejarErrorSesion = useManejarErrorSesion();
  const publicacion = iniciativa.publicacion;
  const [datos, setDatos] = useState({
    // Primera vez: se propone la descripción de la postulación como punto de partida
    resumen_publico: publicacion?.resumen_publico ?? iniciativa.descripcion ?? "",
    resultados: publicacion?.resultados ?? "",
    publicada: publicacion?.publicada ?? false,
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  function actualizar(campo, valor) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setErrores((prev) => ({ ...prev, [campo]: undefined, general: undefined }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (datos.publicada && !datos.resumen_publico.trim()) {
      setErrores({ resumen_publico: "Escribe el resumen que verá el público antes de publicar." });
      return;
    }
    setGuardando(true);
    try {
      const actualizada = await guardarPublicacion(iniciativa.id_iniciativa, {
        publicada: datos.publicada,
        resumen_publico: datos.resumen_publico.trim(),
        resultados: datos.resultados.trim(),
      });
      onGuardada(actualizada);
    } catch (err) {
      if (manejarErrorSesion(err)) return;
      setErrores(erroresDelServidor(err));
      setGuardando(false);
    }
  }

  return (
    <PanelLateral
      titulo="Ficha del catálogo"
      subtitulo={iniciativa.nombre}
      etiquetaCerrar="Cerrar ficha del catálogo"
      onClose={onClose}
      ancho="max-w-lg"
    >
      <form id="ficha-catalogo" onSubmit={guardar} noValidate className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Radicado</dt>
            <dd className="font-medium text-slate-900">{iniciativa.radicado}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Tipo</dt>
            <dd className="font-medium text-slate-900">{iniciativa.tipo_display}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Equipo</dt>
            <dd className="font-medium text-slate-900">{iniciativa.equipo || "Sin equipo"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Madurez</dt>
            <dd className="font-medium text-slate-900">{iniciativa.nivel_madurez_display || "Sin proyecto"}</dd>
          </div>
        </dl>

        <Campo
          etiqueta="Resumen público"
          requerido={datos.publicada}
          error={errores.resumen_publico}
          ayuda="Lo verá cualquier visitante del catálogo. No incluyas correos ni datos personales."
        >
          {(props) => (
            <textarea
              {...props}
              rows={6}
              maxLength={MAX_RESUMEN}
              value={datos.resumen_publico}
              onChange={(e) => actualizar("resumen_publico", e.target.value)}
              className={`${CAMPO} resize-y`}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Resultados alcanzados"
          error={errores.resultados}
          ayuda="Logros, pilotos, premios o impacto que se quieren difundir. Opcional."
        >
          {(props) => (
            <textarea
              {...props}
              rows={4}
              value={datos.resultados}
              onChange={(e) => actualizar("resultados", e.target.value)}
              className={`${CAMPO} resize-y`}
            />
          )}
        </Campo>

        <div className="space-y-2">
          <Rotulo>Difusión</Rotulo>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Publicar en el catálogo público</p>
              <p className={AYUDA}>
                {publicacion?.publicada && publicacion.autorizado_por_nombre
                  ? `Autorizada por ${publicacion.autorizado_por_nombre} el ${formatoFecha(publicacion.fecha_publicacion)}.`
                  : "Al guardar quedará registrado que autorizaste su difusión."}
              </p>
            </div>
            <Interruptor
              activo={datos.publicada}
              onChange={(e) => actualizar("publicada", e.target.checked)}
              etiqueta="Publicar en el catálogo público"
            />
          </div>
          {errores.publicada && <ErrorGeneral mensaje={errores.publicada} />}
        </div>

        <ErrorGeneral mensaje={errores.general} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={guardando} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
            {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {datos.publicada ? "Guardar y publicar" : "Guardar sin publicar"}
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}

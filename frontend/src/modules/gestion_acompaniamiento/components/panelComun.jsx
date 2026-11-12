import { ExternalLink } from "lucide-react";
import { Avatar, ENLACE, iniciales } from "../../../components/ui";

// Los diálogos, avisos y selectores viven en el sistema visual compartido
export { AvisoPanel, PanelLateral, SelectorPersona } from "../../../components/ui";

// Piezas compartidas por los paneles de asignación de roles del proyecto (mentores, tutor).

export function Esqueleto({ texto }) {
  return (
    <div className="space-y-8" aria-busy="true">
      <span className="sr-only">{texto}</span>
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
        {[0, 1].map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-superficie motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-11 w-full animate-pulse rounded-xl bg-superficie motion-reduce:animate-none" />
    </div>
  );
}

export function EstadoCompleto({ icono: Icono, titulo, children, accion }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6 animate-aparecer motion-reduce:animate-desvanecer">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-superficie text-slate-600">
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-900">{titulo}</p>
        <div className="max-w-sm text-sm leading-relaxed text-slate-600">{children}</div>
      </div>
      {accion}
    </div>
  );
}

// Fila de una persona asignada: iniciales, nombre, área y correo, con una acción a la derecha
export function FilaPersona({ nombre, area, correo, accion }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar texto={iniciales(nombre)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{nombre}</p>
        <p className="truncate text-xs text-slate-600">
          {area || "Sin área registrada"}
          {correo && (
            <>
              {" · "}
              <a
                href={`mailto:${correo}`}
                className="rounded-sm underline decoration-slate-300 underline-offset-2 hover:text-slate-900 hover:decoration-slate-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15"
              >
                {correo}
              </a>
            </>
          )}
        </p>
      </div>
      {accion}
    </div>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-600">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{valor || "Sin dato"}</dd>
    </div>
  );
}

// Vista previa del perfil académico: datos en rejilla, biografía y enlace al perfil profesional
export function VistaPreviaPerfil({ datos, biografia, enlacePerfil }) {
  return (
    <div className="space-y-3 rounded-2xl bg-superficie-alta p-4 ring-1 ring-slate-200/70 animate-aparecer motion-reduce:animate-desvanecer">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {datos.map((d) => (
          <Dato key={d.etiqueta} etiqueta={d.etiqueta} valor={d.valor} />
        ))}
      </dl>
      {biografia && <p className="text-sm leading-relaxed text-slate-700">{biografia}</p>}
      {enlacePerfil && (
        <a
          href={enlacePerfil}
          target="_blank"
          rel="noopener noreferrer"
          className={ENLACE}
        >
          Ver perfil profesional
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      )}
    </div>
  );
}

import { useId } from "react";
import { AlertCircle, Check, ChevronDown, Loader2, RefreshCw, Search, X } from "lucide-react";
import {
  AYUDA,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  CONTADOR,
  DESCRIPCION,
  DISTINTIVO_BASE,
  ERROR,
  ETIQUETA,
  FOCO,
  ROTULO,
  SECCION,
  TABLA,
  TABLA_CABECERA,
  TABLA_CONTENEDOR,
  TABLA_TH,
  TARJETA,
  TARJETA_CABECERA,
  TITULO_PAGINA,
  TITULO_TARJETA,
  TONOS_DISTINTIVO,
} from "./estilos";

// ---------------------------------------------------------------------------
// Estructura de página
// ---------------------------------------------------------------------------

// Contenedor de cada vista: ancho máximo y separación vertical uniforme
export function Pagina({ ancho = "max-w-6xl", className = "", children }) {
  return <div className={`mx-auto w-full ${ancho} space-y-6 ${className}`}>{children}</div>;
}

// Tarjeta blanca de encabezado: rótulo rojo, título, descripción, acciones y contenido extra (estadísticas)
export function EncabezadoPagina({ seccion, titulo, descripcion, acciones, children }) {
  return (
    <section className={`${TARJETA} p-5 sm:p-6`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          {seccion && <p className={SECCION}>{seccion}</p>}
          <h1 className={TITULO_PAGINA}>{titulo}</h1>
          {descripcion && <div className={`max-w-2xl ${DESCRIPCION}`}>{descripcion}</div>}
        </div>
        {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      {children && <div className="mt-5 border-t border-slate-100 pt-5">{children}</div>}
    </section>
  );
}

// Tarjeta blanca genérica. `cabecera` dibuja la franja gris superior (como cada hito del plan)
export function Tarjeta({ as: Etiqueta = "section", cabecera, padding = true, className = "", children, ...props }) {
  return (
    <Etiqueta className={`${TARJETA} ${cabecera ? "overflow-hidden" : ""} ${className}`} {...props}>
      {cabecera}
      {padding ? <div className="p-5 sm:p-6">{children}</div> : children}
    </Etiqueta>
  );
}

// Franja superior de una tarjeta: rótulo + título + acciones a la derecha
export function CabeceraTarjeta({ seccion, titulo, descripcion, acciones, id }) {
  return (
    <header className={`${TARJETA_CABECERA} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}>
      <div className="min-w-0">
        {seccion && <p className={SECCION}>{seccion}</p>}
        <h2 id={id} className={`${seccion ? "mt-1" : ""} ${TITULO_TARJETA}`}>
          {titulo}
        </h2>
        {descripcion && <p className="mt-0.5 text-sm text-slate-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

// Subtítulo de sección dentro de una tarjeta ("Actividades (3)")
export function Rotulo({ as: Etiqueta = "h3", className = "", children }) {
  return <Etiqueta className={`${ROTULO} ${className}`}>{children}</Etiqueta>;
}

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

export function Distintivo({ tono = "gris", icono: Icono, className = "", children }) {
  return (
    <span className={`${DISTINTIVO_BASE} ${TONOS_DISTINTIVO[tono] || TONOS_DISTINTIVO.gris} ${className}`}>
      {Icono && <Icono className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Contador({ children }) {
  return <span className={CONTADOR}>{children}</span>;
}

// Rejilla de cifras resumen (como "Planes definidos / Actividades completadas / Mis pendientes")
export function Estadisticas({ columnas = "sm:grid-cols-3", children }) {
  return <dl className={`grid grid-cols-1 gap-4 ${columnas}`}>{children}</dl>;
}

export function Estadistica({ etiqueta, valor, detalle, icono: Icono }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {Icono && <Icono className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
        {etiqueta}
      </dt>
      <dd className="mt-1 text-lg font-bold text-slate-900">{valor}</dd>
      {detalle && <dd className="mt-0.5 text-xs text-slate-500">{detalle}</dd>}
    </div>
  );
}

// Par etiqueta / valor con icono (dentro de un <dl>)
export function Dato({ etiqueta, icono: Icono, children }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{etiqueta}</dt>
      <dd className="flex items-start gap-1.5 text-xs text-slate-700">
        {Icono && <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />}
        <span className="min-w-0 break-words">{children}</span>
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estados de carga / vacío / error
// ---------------------------------------------------------------------------

export function Cargando({ texto = "Cargando…", detalle, enTarjeta = true }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-16 text-center ${enTarjeta ? TARJETA : ""}`}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-ufps" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-700">{texto}</p>
      {detalle && <p className="text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

export function EstadoVacio({ icono: Icono, titulo, children, accion, enTarjeta = true }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${enTarjeta ? TARJETA : ""}`}>
      {Icono && (
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-superficie text-slate-500">
          <Icono className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-900">{titulo}</p>
        {children && <div className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">{children}</div>}
      </div>
      {accion}
    </div>
  );
}

// Mensaje de error en bloque (borde rojo sobre blanco)
export function ErrorGeneral({ mensaje, titulo, children }) {
  if (!mensaje && !titulo && !children) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {mensaje && <p>{mensaje}</p>}
        {children}
      </div>
    </div>
  );
}

// Error al cargar una vista completa, con botón de reintento
export function ErrorCarga({ titulo, mensaje, onReintentar }) {
  return (
    <section className={`${TARJETA} p-5 sm:p-6`}>
      <ErrorGeneral titulo={titulo} mensaje={mensaje} />
      {onReintentar && (
        <button type="button" onClick={onReintentar} className={`${BOTON_SECUNDARIO} mt-4`}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </button>
      )}
    </section>
  );
}

// Aviso de resultado dentro de una vista (éxito en negro/gris, error en rojo)
export function AvisoPanel({ aviso, onCerrar }) {
  if (!aviso) return null;
  const esError = aviso.tipo === "error";
  return (
    <div
      role={esError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border bg-white p-3.5 text-sm shadow-sm animate-aparecer motion-reduce:animate-desvanecer ${
        esError ? "border-ufps text-ufps" : "border-slate-200 text-slate-900"
      }`}
    >
      {esError ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white animate-confirmar motion-reduce:animate-desvanecer">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="font-semibold">{aviso.titulo}</p>
        {aviso.detalle && <p className={esError ? "text-ufps" : "text-slate-600"}>{aviso.detalle}</p>}
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          className={`-my-3 -mr-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100 ${FOCO}`}
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Notificación flotante (abajo a la derecha)
export function Toast({ mensaje, tipo = "exito", onCerrar }) {
  if (!mensaje) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] w-[min(24rem,calc(100vw-3rem))]">
      <AvisoPanel aviso={{ tipo: tipo === "error" ? "error" : "exito", titulo: mensaje }} onCerrar={onCerrar} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formularios
// ---------------------------------------------------------------------------

// children es una función que recibe los props de accesibilidad del control
export function Campo({ etiqueta, requerido, error, ayuda, className = "", children }) {
  const id = useId();
  const props = { id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined };
  return (
    <div className={`space-y-1.5 ${className}`}>
      {etiqueta && (
        <label htmlFor={id} className={ETIQUETA}>
          {etiqueta} {requerido && <span className="text-ufps">*</span>}
        </label>
      )}
      {typeof children === "function" ? children(props) : children}
      {ayuda && !error && <p className={AYUDA}>{ayuda}</p>}
      {error && (
        <p id={`${id}-error`} className={ERROR} role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

export function MensajeError({ children }) {
  if (!children) return null;
  return (
    <p className={ERROR} role="alert">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function BotonesFormulario({ guardando, textoGuardar = "Guardar", onCancelar, textoCancelar = "Cancelar", deshabilitado }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      {onCancelar && (
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO} disabled={guardando}>
          {textoCancelar}
        </button>
      )}
      <button type="submit" className={BOTON_PRIMARIO} disabled={guardando || deshabilitado}>
        {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {textoGuardar}
      </button>
    </div>
  );
}

// Selector nativo con etiqueta y chevron del sistema visual
export function Selector({ etiqueta, valor, onChange, opciones, placeholder, disabled, selectRef, className = "", ...props }) {
  const id = useId();
  const control = (
    <div className="relative">
      <select
        ref={selectRef}
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${CAMPO} appearance-none pr-10`}
        aria-label={etiqueta ? undefined : placeholder}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
    </div>
  );
  if (!etiqueta) return <div className={className}>{control}</div>;
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta}
      </label>
      {control}
    </div>
  );
}

// Compatibilidad con el nombre usado en los paneles de asignación
export const SelectorPersona = Selector;

// Caja de búsqueda con icono y botón de limpiar
export function Buscador({ valor, onChange, placeholder = "Buscar…", etiqueta, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={etiqueta || placeholder}
        className={`${CAMPO} pl-10 ${valor ? "pr-10" : ""} [&::-webkit-search-cancel-button]:hidden`}
      />
      {valor && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 ${FOCO}`}
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// Pestañas o filtros segmentados. opciones: [{ id, label, count?, icono? }]
export function Pestanas({ opciones, valor, onChange, etiqueta = "Secciones", className = "" }) {
  return (
    <div role="tablist" aria-label={etiqueta} className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {opciones.map((op) => {
        const activa = op.id === valor;
        const Icono = op.icono;
        return (
          <button
            key={op.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onChange(op.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${FOCO} ${
              activa ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900"
            }`}
          >
            {Icono && <Icono className="h-4 w-4" aria-hidden="true" />}
            <span>{op.label}</span>
            {op.count !== undefined && op.count !== null && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                  activa ? "bg-ufps text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {op.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla
// ---------------------------------------------------------------------------

// columnas: [{ id, label, className? }] — las filas se pasan como children (<tr className={TABLA_FILA}>)
export function Tabla({ columnas, children, etiqueta, className = "" }) {
  return (
    <div className={`${TABLA_CONTENEDOR} ${className}`}>
      <table className={TABLA} aria-label={etiqueta}>
        <thead className={TABLA_CABECERA}>
          <tr>
            {columnas.map((c) => (
              <th key={c.id || c.label} scope="col" className={`${TABLA_TH} ${c.className || ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// Avatar de iniciales
export function Avatar({ texto, tamano = "h-10 w-10", className = "" }) {
  return (
    <span
      className={`inline-flex ${tamano} shrink-0 items-center justify-center rounded-full bg-superficie text-xs font-semibold text-slate-700 ${className}`}
      aria-hidden="true"
    >
      {texto}
    </span>
  );
}

// Fila de ancho completo dentro de una tabla (cargando, vacío)
export function FilaMensaje({ columnas, cargando = false, children }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-4 py-10 text-center text-sm text-slate-500">
        <span className="inline-flex items-center justify-center gap-2">
          {cargando && <Loader2 className="h-4 w-4 animate-spin text-ufps" aria-hidden="true" />}
          {children}
        </span>
      </td>
    </tr>
  );
}

// Interruptor de activo / inactivo (rojo UFPS cuando está activo)
export function Interruptor({ activo, onChange, etiqueta, disabled = false }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        role="switch"
        checked={Boolean(activo)}
        onChange={onChange}
        disabled={disabled}
        aria-label={etiqueta}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="h-6 w-11 rounded-full bg-slate-300 transition-colors duration-150 ease-out-suave after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:duration-150 after:content-[''] peer-checked:bg-ufps peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-ufps/15 motion-reduce:transition-none motion-reduce:after:transition-none"
      />
    </label>
  );
}

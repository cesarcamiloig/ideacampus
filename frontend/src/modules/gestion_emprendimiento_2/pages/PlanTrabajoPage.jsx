import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { obtenerMiEquipo } from "../services/equipoService";
import { getEvidencias } from "../services/evidenciaService";
import EvidenciasCargadasPanel from "../components/EvidenciasCargadasPanel";
import {
  actualizarActividad,
  actualizarPlanTrabajo,
  crearActividad,
  crearPlanTrabajo,
  eliminarActividad,
  eliminarPlanTrabajo,
  getActividades,
  getPlanesTrabajo,
} from "../services/planTrabajoService";
import { getHitosDeTipo } from "../../gestion_evaluacion/services/rubricaService";
import { AvisoPanel, PanelLateral, SelectorPersona } from "../../gestion_acompaniamiento/components/panelComun";
import {
  AYUDA,
  BOTON_FANTASMA,
  BOTON_ICONO,
  BOTON_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  ERROR,
  ETIQUETA,
} from "../../gestion_evaluacion/components/estilos";

const ESTADOS_PLAN = [
  { id: "pendiente", label: "Pendiente", clase: "bg-slate-200 text-slate-800" },
  { id: "en_curso", label: "En curso", clase: "bg-slate-800 text-white" },
  { id: "finalizado", label: "Finalizado", clase: "bg-ufps text-white" },
];

const MAX_NOMBRE = 200;
const MAX_ENTREGABLE = 300;

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

// "2026-11-04" → "4 nov 2026" (se lee como fecha local para no correr el día por la zona horaria)
function formatoFecha(iso) {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split("-").map(Number);
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia));
}

const UNIDADES = [
  "cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
  "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
  "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis",
  "veintisiete", "veintiocho", "veintinueve",
];
const DECENAS = { 3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa" };

// 2 → "dos", 21 → "veintiún", 31 → "treinta y un" (forma corta de "uno" ante sustantivo masculino)
function numeroEnLetras(n) {
  let texto;
  if (n < 30) texto = UNIDADES[n];
  else if (n < 100) texto = DECENAS[Math.floor(n / 10)] + (n % 10 ? ` y ${UNIDADES[n % 10]}` : "");
  else return String(n);
  return texto.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
}

function cantidad(n, singular, plural) {
  return n === 1 ? `Queda un ${singular}` : `Quedan ${numeroEnLetras(n)} ${plural}`;
}

// Tiempo que falta hasta la fecha fin: "Quedan dos días", "Queda un mes", "Quedan tres años"
function tiempoRestante(fin) {
  if (!fin) return null;
  const [anio, mes, dia] = fin.split("-").map(Number);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(anio, mes - 1, dia);
  const dias = Math.round((limite - hoy) / 86400000);

  if (dias < 0) return { texto: "Plazo vencido", vencido: true };
  if (dias === 0) return { texto: "Vence hoy", vencido: false };
  if (dias < 31) return { texto: cantidad(dias, "día", "días"), vencido: false };

  let meses = (limite.getFullYear() - hoy.getFullYear()) * 12 + (limite.getMonth() - hoy.getMonth());
  if (limite.getDate() < hoy.getDate()) meses -= 1;
  if (meses < 12) return { texto: cantidad(Math.max(meses, 1), "mes", "meses"), vencido: false };
  const anios = Math.floor(meses / 12);
  return { texto: cantidad(anios, "año", "años"), vencido: false };
}

function rangoFechas(inicio, fin) {
  if (inicio && fin) return `${formatoFecha(inicio)} – ${formatoFecha(fin)}`;
  if (fin) return `Hasta el ${formatoFecha(fin)}`;
  if (inicio) return `Desde el ${formatoFecha(inicio)}`;
  return "Sin fechas definidas";
}

function aTexto(valor) {
  return Array.isArray(valor) ? valor.join(" ") : String(valor);
}

// Convierte el error del API en { campo: "mensaje", general: "..." } para los campos del formulario
function erroresDelServidor(err, campos, mensajePorDefecto) {
  const data = err?.data;
  if (!data || typeof data !== "object" || err.status >= 500) {
    return { general: err?.message || mensajePorDefecto };
  }
  const resultado = {};
  const generales = [];
  Object.entries(data).forEach(([campo, valor]) => {
    if (campos.includes(campo)) resultado[campo] = aTexto(valor);
    else generales.push(aTexto(valor));
  });
  if (generales.length > 0) resultado.general = generales.join(" ");
  return Object.keys(resultado).length > 0 ? resultado : { general: mensajePorDefecto };
}

function validarFechas(inicio, fin, errores) {
  if (inicio && fin && fin < inicio) {
    errores.fecha_fin = "No puede ser anterior a la fecha de inicio.";
  }
}

// ---------------------------------------------------------------------------
// Piezas de formulario
// ---------------------------------------------------------------------------

function Campo({ etiqueta, requerido, error, ayuda, children }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={ETIQUETA}>
        {etiqueta} {requerido && <span className="text-ufps">*</span>}
      </label>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined })}
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

function ErrorGeneral({ mensaje }) {
  if (!mensaje) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-ufps bg-white p-3 text-sm text-ufps">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{mensaje}</p>
    </div>
  );
}

function BotonesFormulario({ guardando, textoGuardar, onCancelar }) {
  return (
    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO} disabled={guardando}>
        Cancelar
      </button>
      <button type="submit" className={BOTON_PRIMARIO} disabled={guardando}>
        {guardando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {textoGuardar}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario del plan de trabajo de un hito
// ---------------------------------------------------------------------------

function FormularioPlan({ idProyecto, hito, plan, onGuardado, onCancelar }) {
  const [titulo, setTitulo] = useState(plan?.titulo || `Plan de trabajo · ${hito.nombre}`);
  const [descripcion, setDescripcion] = useState(plan?.descripcion || "");
  const [estado, setEstado] = useState(plan?.estado || "pendiente");
  const [fechaInicio, setFechaInicio] = useState(plan?.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(plan?.fecha_fin || "");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    const nuevos = {};
    if (!titulo.trim()) nuevos.titulo = "Escribe el título del plan.";
    validarFechas(fechaInicio, fechaFin, nuevos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      estado,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
    };
    setGuardando(true);
    try {
      const guardado = plan
        ? await actualizarPlanTrabajo(plan.id_plan_trabajo, datos)
        : await crearPlanTrabajo({ ...datos, proyecto: idProyecto, hito: hito.id });
      onGuardado(guardado, plan ? "Plan de trabajo actualizado." : "Plan de trabajo creado.");
    } catch (err) {
      setErrores(
        erroresDelServidor(
          err,
          ["titulo", "descripcion", "estado", "fecha_inicio", "fecha_fin"],
          "No se pudo guardar el plan de trabajo.",
        ),
      );
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-5">
      <ErrorGeneral mensaje={errores.general} />
      <Campo etiqueta="Título" requerido error={errores.titulo}>
        {(props) => (
          <input
            {...props}
            type="text"
            value={titulo}
            maxLength={MAX_NOMBRE}
            onChange={(e) => setTitulo(e.target.value)}
            className={CAMPO}
          />
        )}
      </Campo>
      <Campo etiqueta="Descripción" error={errores.descripcion} ayuda="Objetivo del plan para este hito.">
        {(props) => (
          <textarea
            {...props}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={`${CAMPO} resize-y`}
          />
        )}
      </Campo>
      <Campo etiqueta="Estado" error={errores.estado}>
        {(props) => (
          <select {...props} value={estado} onChange={(e) => setEstado(e.target.value)} className={CAMPO}>
            {ESTADOS_PLAN.map((op) => (
              <option key={op.id} value={op.id}>
                {op.label}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha de inicio" error={errores.fecha_inicio}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={CAMPO}
            />
          )}
        </Campo>
        <Campo etiqueta="Fecha de fin" error={errores.fecha_fin}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              className={CAMPO}
            />
          )}
        </Campo>
      </div>
      <BotonesFormulario
        guardando={guardando}
        textoGuardar={plan ? "Guardar cambios" : "Crear plan"}
        onCancelar={onCancelar}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Formulario de una actividad del plan
// ---------------------------------------------------------------------------

function FormularioActividad({ plan, actividad, miembros, onGuardado, onCancelar }) {
  const [nombre, setNombre] = useState(actividad?.nombre || "");
  const [descripcion, setDescripcion] = useState(actividad?.descripcion || "");
  const [entregable, setEntregable] = useState(actividad?.entregable || "");
  const [responsable, setResponsable] = useState(actividad?.responsable ? String(actividad.responsable) : "");
  const [fechaInicio, setFechaInicio] = useState(actividad?.fecha_inicio || plan.fecha_inicio || "");
  const [fechaFin, setFechaFin] = useState(actividad?.fecha_fin || "");
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    const nuevos = {};
    if (!nombre.trim()) nuevos.nombre = "Escribe el nombre de la actividad.";
    if (!responsable) nuevos.responsable = "Selecciona el integrante responsable.";
    if (!fechaFin) nuevos.fecha_fin = "Indica la fecha límite de la actividad.";
    validarFechas(fechaInicio, fechaFin, nuevos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    const datos = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      entregable: entregable.trim(),
      responsable: Number(responsable),
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin,
    };
    setGuardando(true);
    try {
      const guardada = actividad
        ? await actualizarActividad(actividad.id, datos)
        : await crearActividad({ ...datos, plan_trabajo: plan.id_plan_trabajo });
      onGuardado(guardada, actividad ? "Actividad actualizada." : "Actividad agregada al plan.");
    } catch (err) {
      setErrores(
        erroresDelServidor(
          err,
          ["nombre", "descripcion", "entregable", "responsable", "fecha_inicio", "fecha_fin"],
          "No se pudo guardar la actividad.",
        ),
      );
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="space-y-5">
      <ErrorGeneral mensaje={errores.general} />
      <Campo etiqueta="Actividad" requerido error={errores.nombre}>
        {(props) => (
          <input
            {...props}
            type="text"
            value={nombre}
            maxLength={MAX_NOMBRE}
            placeholder="Ej. Entrevistar a 10 usuarios potenciales"
            onChange={(e) => setNombre(e.target.value)}
            className={CAMPO}
          />
        )}
      </Campo>
      <Campo etiqueta="Descripción" error={errores.descripcion}>
        {(props) => (
          <textarea
            {...props}
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className={`${CAMPO} resize-y`}
          />
        )}
      </Campo>
      <Campo
        etiqueta="Entregable"
        error={errores.entregable}
        ayuda="Lo que debe quedar listo. El responsable lo sube como evidencia para completar la actividad."
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={entregable}
            maxLength={MAX_ENTREGABLE}
            placeholder="Ej. Informe de validación en PDF"
            onChange={(e) => setEntregable(e.target.value)}
            className={CAMPO}
          />
        )}
      </Campo>
      <div className="space-y-1.5">
        <SelectorPersona
          etiqueta="Responsable *"
          valor={responsable}
          onChange={setResponsable}
          placeholder="Selecciona un integrante"
          opciones={miembros.map((m) => ({
            valor: String(m.id_usuario),
            texto: m.es_lider ? `${m.nombre} (líder)` : m.nombre,
          }))}
        />
        {errores.responsable && (
          <p className={ERROR} role="alert">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {errores.responsable}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha de inicio" error={errores.fecha_inicio}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className={CAMPO}
            />
          )}
        </Campo>
        <Campo etiqueta="Fecha límite" requerido error={errores.fecha_fin}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={fechaFin}
              min={fechaInicio || undefined}
              onChange={(e) => setFechaFin(e.target.value)}
              className={CAMPO}
            />
          )}
        </Campo>
      </div>
      <BotonesFormulario
        guardando={guardando}
        textoGuardar={actividad ? "Guardar cambios" : "Agregar actividad"}
        onCancelar={onCancelar}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Vista del plan
// ---------------------------------------------------------------------------

// Paleta UFPS: la actividad completada se ve en rojo; la que no, en gris
const ESTILO_ACTIVIDAD = {
  completada: {
    borde: "border-ufps",
    barra: "bg-ufps",
    numero: "bg-ufps text-white",
    titulo: "text-ufps",
    distintivo: "bg-ufps text-white",
    etiqueta: "Realizada",
  },
  noCompletada: {
    borde: "border-slate-300",
    barra: "bg-slate-400",
    numero: "bg-slate-200 text-slate-800",
    titulo: "text-slate-900",
    distintivo: "bg-slate-800 text-white",
    etiqueta: "Pendiente",
  },
};

function DatoActividad({ etiqueta, icono: Icono, children }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{etiqueta}</dt>
      <dd className="flex items-start gap-1.5 text-xs text-slate-700">
        <Icono className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="min-w-0 break-words">{children}</span>
      </dd>
    </div>
  );
}

function FilaActividad({ actividad, numero, esLider, onEditar, onEliminar }) {
  const completada = actividad.estado === "completada";
  const estilo = completada ? ESTILO_ACTIVIDAD.completada : ESTILO_ACTIVIDAD.noCompletada;

  return (
    <li className={`relative overflow-hidden rounded-xl border bg-white py-4 pl-5 pr-4 shadow-sm ${estilo.borde}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${estilo.barra}`} aria-hidden="true" />

      <div className="flex items-start gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${estilo.numero}`}
          aria-label={`Actividad ${numero}`}
        >
          {numero}
        </span>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <h5 className={`text-base font-bold leading-snug ${estilo.titulo}`}>{actividad.nombre}</h5>
            {actividad.descripcion && (
              <div className="pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Descripción</p>
                <p className="mt-0.5 text-sm font-normal leading-relaxed text-slate-600">{actividad.descripcion}</p>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-superficie-alta p-3 sm:grid-cols-3">
            <DatoActividad etiqueta="Responsable" icono={User}>
              {actividad.responsable_nombre}
            </DatoActividad>
            <DatoActividad etiqueta="Fechas" icono={CalendarDays}>
              {rangoFechas(actividad.fecha_inicio, actividad.fecha_fin)}
            </DatoActividad>
            <DatoActividad etiqueta="Entregable" icono={Package}>
              {actividad.entregable || <span className="text-slate-400">Sin definir</span>}
            </DatoActividad>
          </dl>

        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Mismo formato que el estado del plan de trabajo */}
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${estilo.distintivo}`}>
            {estilo.etiqueta}
          </span>
          {esLider && (
            <div className="-my-1.5 flex gap-1">
              <button
                type="button"
                onClick={onEditar}
                className={BOTON_ICONO}
                aria-label={`Editar la actividad ${actividad.nombre}`}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onEliminar}
                className={BOTON_ICONO}
                aria-label={`Eliminar la actividad ${actividad.nombre}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function SeccionHito({ hito, plan, actividades, totalEvidencias, esLider, onAccion }) {
  const estadoPlan = ESTADOS_PLAN.find((e) => e.id === plan?.estado) || ESTADOS_PLAN[0];
  // Un plan finalizado ya no tiene tiempo pendiente
  const restante = plan && plan.estado !== "finalizado" ? tiempoRestante(plan.fecha_fin) : null;

  return (
    <section
      aria-labelledby={`hito-${hito.id}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* 1. Hito: franja propia, solo con el número y el nombre del hito */}
      <header className="border-b border-slate-200 bg-superficie-alta px-5 py-4 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">Hito {hito.numero_hito}</p>
        <h3 id={`hito-${hito.id}`} className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
          {hito.nombre}
        </h3>
      </header>

      <div className="p-5 sm:p-6">
        {!plan ? (
          <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {esLider
                ? "Este hito aún no tiene plan de trabajo. Créalo para asignar actividades al equipo."
                : "El líder del equipo aún no ha definido el plan de trabajo de este hito."}
            </p>
            {esLider && (
              <button type="button" onClick={() => onAccion({ tipo: "plan", hito })} className={BOTON_PRIMARIO}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Crear plan
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 2. Plan de trabajo: bloque aparte con su título, fechas, estado y descripción */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plan de trabajo</p>
                  <h4 className="text-base font-semibold text-slate-900">{plan.titulo}</h4>
                </div>
                <span className={`inline-flex shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${estadoPlan.clase}`}>
                  {estadoPlan.label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
                <p className="flex items-center gap-1.5 text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
                </p>
                {restante && (
                  <p className={`font-semibold ${restante.vencido ? "text-ufps" : "text-slate-800"}`}>
                    {restante.texto}
                  </p>
                )}
              </div>
              {plan.descripcion && (
                <p className="mt-3 border-t border-slate-200 pt-3 text-sm leading-relaxed text-slate-700">
                  {plan.descripcion}
                </p>
              )}
            </div>

            {/* 3. Actividades del plan */}
            <h4 className="mt-6 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Actividades ({actividades.length})
            </h4>

            {actividades.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">Todavía no hay actividades en este plan.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {actividades.map((actividad, indice) => (
                  <FilaActividad
                    key={actividad.id}
                    actividad={actividad}
                    numero={indice + 1}
                    esLider={esLider}
                    onEditar={() => onAccion({ tipo: "actividad", plan, actividad })}
                    onEliminar={() => onAccion({ tipo: "eliminar-actividad", actividad })}
                  />
                ))}
              </ul>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {esLider && (
                <>
                  <button type="button" onClick={() => onAccion({ tipo: "actividad", plan })} className={BOTON_SECUNDARIO}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Agregar actividad
                  </button>
                  <button type="button" onClick={() => onAccion({ tipo: "plan", hito, plan })} className={BOTON_FANTASMA}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar plan
                  </button>
                  <button type="button" onClick={() => onAccion({ tipo: "eliminar-plan", hito, plan })} className={BOTON_PELIGRO}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Eliminar plan
                  </button>
                </>
              )}
              {/* Evidencias cargadas a este hito: las ve todo el equipo */}
              <button
                type="button"
                onClick={() => onAccion({ tipo: "evidencias", hito })}
                aria-haspopup="dialog"
                className={`${BOTON_SECUNDARIO} sm:ml-auto`}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Evidencias del hito
                {totalEvidencias !== null && (
                  <span className="rounded-full bg-ufps px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {totalEvidencias}
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function PlanTrabajoPage() {
  const { usuario, logout } = useAuth();
  const idUsuario = usuario?.id_usuario;

  const [proyecto, setProyecto] = useState(null); // { id, nombre, tipo }
  const [esLider, setEsLider] = useState(false);
  const [miembros, setMiembros] = useState([]);
  const [hitos, setHitos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [editor, setEditor] = useState(null); // { tipo: "plan" | "actividad", hito?, plan?, actividad? }
  const [aviso, setAviso] = useState(null);

  // Evidencias del proyecto: el panel de cada hito muestra solo las de su etapa
  const [evidencias, setEvidencias] = useState([]);
  const [cargandoEvidencias, setCargandoEvidencias] = useState(true);
  const [errorEvidencias, setErrorEvidencias] = useState("");
  const [hitoEvidencias, setHitoEvidencias] = useState(null);
  const cerrarEvidencias = useCallback(() => setHitoEvidencias(null), []);

  // logout cambia en cada render del AuthProvider: se guarda en una ref para no recargar los datos
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  const manejarError = useCallback((err, mensaje) => {
    if (err?.status === 401) {
      logoutRef.current?.();
      return;
    }
    setAviso({ tipo: "error", titulo: mensaje, detalle: err?.message });
  }, []);

  const cargarEvidencias = useCallback(async () => {
    setCargandoEvidencias(true);
    setErrorEvidencias("");
    try {
      setEvidencias(await getEvidencias());
    } catch (err) {
      if (err?.status === 401) logoutRef.current?.();
      else setErrorEvidencias(err.message || "No se pudieron cargar las evidencias.");
    } finally {
      setCargandoEvidencias(false);
    }
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const dataEquipo = await obtenerMiEquipo();
      const equipo = dataEquipo?.equipo;
      const iniciativa = equipo?.iniciativa;
      if (!iniciativa?.id_proyecto) {
        setProyecto(null);
        return;
      }
      setProyecto({ id: iniciativa.id_proyecto, nombre: iniciativa.nombre, tipo: iniciativa.tipo });
      setEsLider(Boolean(equipo.es_lider));
      setMiembros(equipo.miembros || []);
      // No bloquea la página: el panel muestra su propio estado de carga o error
      cargarEvidencias();

      const [listaHitos, listaPlanes, listaActividades] = await Promise.all([
        getHitosDeTipo(iniciativa.tipo),
        getPlanesTrabajo({ proyecto: iniciativa.id_proyecto }),
        getActividades({ proyecto: iniciativa.id_proyecto }),
      ]);
      setHitos([...listaHitos].sort((a, b) => a.numero_hito - b.numero_hito));
      setPlanes(listaPlanes);
      setActividades(listaActividades);
    } catch (err) {
      if (err?.status === 401) logoutRef.current?.();
      else setErrorCarga(err.message || "No se pudo cargar el plan de trabajo.");
    } finally {
      setCargando(false);
    }
  }, [cargarEvidencias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function evidenciasDe(hito) {
    return evidencias.filter((ev) => ev.etapa === hito.id && ev.proyecto === proyecto?.id);
  }

  function alEliminarEvidencia(id) {
    setEvidencias((prev) => prev.filter((ev) => ev.id !== id));
    // Si la actividad se queda sin evidencias, el backend la vuelve a dejar pendiente
    getActividades({ proyecto: proyecto.id })
      .then(setActividades)
      .catch(() => {});
  }

  function alGuardarPlan(guardado, mensaje) {
    setPlanes((prev) => {
      const existe = prev.some((p) => p.id_plan_trabajo === guardado.id_plan_trabajo);
      return existe
        ? prev.map((p) => (p.id_plan_trabajo === guardado.id_plan_trabajo ? guardado : p))
        : [...prev, guardado];
    });
    setEditor(null);
    setAviso({ tipo: "exito", titulo: mensaje });
  }

  function alGuardarActividad(guardada, mensaje) {
    setActividades((prev) => {
      const existe = prev.some((a) => a.id === guardada.id);
      return existe ? prev.map((a) => (a.id === guardada.id ? guardada : a)) : [...prev, guardada];
    });
    // El conteo de actividades del plan viene del backend: se refresca el plan afectado
    getPlanesTrabajo({ proyecto: proyecto.id })
      .then(setPlanes)
      .catch(() => {});
    setEditor(null);
    setAviso({ tipo: "exito", titulo: mensaje });
  }

  async function eliminarPlan(hito, plan) {
    const cantidad = actividadesDe(plan).length;
    const detalle = cantidad > 0 ? ` También se eliminarán sus ${cantidad} actividad(es).` : "";
    if (!window.confirm(`¿Eliminar el plan de trabajo del hito "${hito.nombre}"?${detalle}`)) return;
    try {
      await eliminarPlanTrabajo(plan.id_plan_trabajo);
      setPlanes((prev) => prev.filter((p) => p.id_plan_trabajo !== plan.id_plan_trabajo));
      setActividades((prev) => prev.filter((a) => a.plan_trabajo !== plan.id_plan_trabajo));
      setAviso({ tipo: "exito", titulo: "Plan de trabajo eliminado." });
    } catch (err) {
      manejarError(err, "No se pudo eliminar el plan de trabajo.");
    }
  }

  async function quitarActividad(actividad) {
    if (!window.confirm(`¿Eliminar la actividad "${actividad.nombre}"?`)) return;
    try {
      await eliminarActividad(actividad.id);
      setActividades((prev) => prev.filter((a) => a.id !== actividad.id));
      getPlanesTrabajo({ proyecto: proyecto.id })
        .then(setPlanes)
        .catch(() => {});
      setAviso({ tipo: "exito", titulo: "Actividad eliminada." });
    } catch (err) {
      manejarError(err, "No se pudo eliminar la actividad.");
    }
  }

  function manejarAccion(accion) {
    if (accion.tipo === "eliminar-plan") eliminarPlan(accion.hito, accion.plan);
    else if (accion.tipo === "eliminar-actividad") quitarActividad(accion.actividad);
    else if (accion.tipo === "evidencias") setHitoEvidencias(accion.hito);
    else setEditor(accion);
  }

  function actividadesDe(plan) {
    return plan ? actividades.filter((a) => a.plan_trabajo === plan.id_plan_trabajo) : [];
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-ufps" aria-label="Cargando plan de trabajo" />
      </div>
    );
  }

  if (errorCarga) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ErrorGeneral mensaje={errorCarga} />
        <button type="button" onClick={cargar} className={`${BOTON_SECUNDARIO} mt-4`}>
          Reintentar
        </button>
      </section>
    );
  }

  if (!proyecto) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
          <div>
            <p className="font-semibold text-slate-900">Tu equipo aún no tiene un proyecto activo</p>
            <p className="mt-1 text-sm text-slate-600">
              El plan de trabajo se habilita cuando la iniciativa de tu equipo es aprobada y pasa a ser un proyecto.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const misPendientes = actividades.filter((a) => a.responsable === idUsuario && a.estado !== "completada").length;
  const totalCompletadas = actividades.filter((a) => a.estado === "completada").length;
  const planEnEdicion = editor?.plan && planes.find((p) => p.id_plan_trabajo === editor.plan.id_plan_trabajo);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">Plan de trabajo</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{proyecto.nombre}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          {esLider
            ? "Define por cada hito las actividades, sus responsables, fechas y entregables. Cada actividad se completa cuando su responsable sube la evidencia."
            : "Consulta las actividades del equipo. Las que tienes asignadas se completan al subir su evidencia en Evidencias de Avance."}
        </p>
        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Planes definidos</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              {planes.length} de {hitos.length} hitos
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actividades completadas</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">
              {totalCompletadas} de {actividades.length}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mis pendientes</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">{misPendientes}</dd>
          </div>
        </dl>
      </section>

      <AvisoPanel aviso={aviso} onCerrar={() => setAviso(null)} />

      {hitos.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          La rúbrica de tu tipo de iniciativa aún no tiene hitos definidos. Cuando la Dirección del Programa los
          configure podrás armar el plan de trabajo.
        </section>
      ) : (
        hitos.map((hito) => {
          const plan = planes.find((p) => p.hito === hito.id);
          return (
            <SeccionHito
              key={hito.id}
              hito={hito}
              plan={plan}
              actividades={actividadesDe(plan)}
              totalEvidencias={cargandoEvidencias || errorEvidencias ? null : evidenciasDe(hito).length}
              esLider={esLider}
              onAccion={manejarAccion}
            />
          );
        })
      )}

      {editor?.tipo === "plan" && (
        <PanelLateral
          titulo={editor.plan ? "Editar plan de trabajo" : "Nuevo plan de trabajo"}
          subtitulo={`Hito ${editor.hito.numero_hito} · ${editor.hito.nombre}`}
          etiquetaCerrar="Cerrar formulario del plan"
          onClose={() => setEditor(null)}
        >
          <FormularioPlan
            idProyecto={proyecto.id}
            hito={editor.hito}
            plan={planEnEdicion}
            onGuardado={alGuardarPlan}
            onCancelar={() => setEditor(null)}
          />
        </PanelLateral>
      )}

      {editor?.tipo === "actividad" && (
        <PanelLateral
          titulo={editor.actividad ? "Editar actividad" : "Nueva actividad"}
          subtitulo={`${editor.plan.hito_nombre} · ${editor.plan.titulo}`}
          etiquetaCerrar="Cerrar formulario de la actividad"
          onClose={() => setEditor(null)}
        >
          <FormularioActividad
            plan={editor.plan}
            actividad={editor.actividad}
            miembros={miembros}
            onGuardado={alGuardarActividad}
            onCancelar={() => setEditor(null)}
          />
        </PanelLateral>
      )}

      <EvidenciasCargadasPanel
        open={Boolean(hitoEvidencias)}
        onClose={cerrarEvidencias}
        evidencias={hitoEvidencias ? evidenciasDe(hitoEvidencias) : []}
        cargando={cargandoEvidencias}
        error={errorEvidencias}
        onReintentar={cargarEvidencias}
        puedeEliminar={esLider}
        onEliminada={alEliminarEvidencia}
        titulo="Evidencias del hito"
        subtitulo={hitoEvidencias ? `Hito ${hitoEvidencias.numero_hito} · ${hitoEvidencias.nombre}` : ""}
        mensajeVacio="Aún no se han cargado evidencias en este hito."
      />
    </div>
  );
}

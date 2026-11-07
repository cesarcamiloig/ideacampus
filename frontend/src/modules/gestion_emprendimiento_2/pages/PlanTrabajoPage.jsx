import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { obtenerMiEquipo } from "../services/equipoService";
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
  { id: "pendiente", label: "Pendiente", clase: "bg-slate-100 text-slate-700" },
  { id: "en_curso", label: "En curso", clase: "bg-amber-50 text-amber-800" },
  { id: "finalizado", label: "Finalizado", clase: "bg-emerald-50 text-emerald-800" },
];

const MAX_NOMBRE = 200;
const MAX_ENTREGABLE = 300;

const FORMATO_FECHA = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

function hoyISO() {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

// "2026-11-04" → "4 nov 2026" (se lee como fecha local para no correr el día por la zona horaria)
function formatoFecha(iso) {
  if (!iso) return null;
  const [anio, mes, dia] = iso.split("-").map(Number);
  return FORMATO_FECHA.format(new Date(anio, mes - 1, dia));
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
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-ufps-suave p-3 text-sm text-ufps">
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

function EstadoActividad({ actividad }) {
  if (actividad.estado === "completada") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Completada
      </span>
    );
  }
  if (actividad.fecha_fin && actividad.fecha_fin < hoyISO()) {
    return (
      <span className="inline-flex rounded-full bg-ufps-suave px-2.5 py-0.5 text-xs font-semibold text-ufps">
        Vencida
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      Pendiente
    </span>
  );
}

function FilaActividad({ actividad, esMia, esLider, onEditar, onEliminar }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{actividad.nombre}</p>
          <EstadoActividad actividad={actividad} />
          {esMia && (
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Asignada a ti
            </span>
          )}
        </div>
        {actividad.descripcion && <p className="text-sm leading-relaxed text-slate-600">{actividad.descripcion}</p>}
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Responsable</dt>
            <User className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <dd>{actividad.responsable_nombre}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Fechas</dt>
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <dd>{rangoFechas(actividad.fecha_inicio, actividad.fecha_fin)}</dd>
          </div>
          {actividad.entregable && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Entregable</dt>
              <Package className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <dd>{actividad.entregable}</dd>
            </div>
          )}
          {actividad.fecha_completada && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Completada el</dt>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              <dd>Completada el {formatoFecha(actividad.fecha_completada)}</dd>
            </div>
          )}
        </dl>
      </div>
      {esLider && (
        <div className="-my-1.5 flex shrink-0 gap-1">
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
    </li>
  );
}

function SeccionHito({ hito, plan, actividades, esLider, idUsuario, onAccion }) {
  const estadoPlan = ESTADOS_PLAN.find((e) => e.id === plan?.estado) || ESTADOS_PLAN[0];
  const completadas = actividades.filter((a) => a.estado === "completada").length;
  const porcentaje = actividades.length > 0 ? Math.round((completadas / actividades.length) * 100) : 0;

  return (
    <section
      aria-labelledby={`hito-${hito.id}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ufps">Hito {hito.numero_hito}</p>
          <h3 id={`hito-${hito.id}`} className="text-lg font-semibold tracking-tight text-slate-900">
            {hito.nombre}
          </h3>
          {plan && (
            <p className="text-sm text-slate-600">
              {plan.titulo} · {rangoFechas(plan.fecha_inicio, plan.fecha_fin)}
            </p>
          )}
        </div>
        {plan && (
          <span className={`inline-flex shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${estadoPlan.clase}`}>
            {estadoPlan.label}
          </span>
        )}
      </header>

      {!plan ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
          {plan.descripcion && <p className="mt-3 text-sm leading-relaxed text-slate-700">{plan.descripcion}</p>}

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Avance de actividades</span>
              <span className="font-semibold text-slate-900">
                {completadas} de {actividades.length}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentaje}
              aria-label={`Avance del hito ${hito.numero_hito}`}
            >
              <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${porcentaje}%` }} />
            </div>
          </div>

          {actividades.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">Todavía no hay actividades en este plan.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {actividades.map((actividad) => (
                <FilaActividad
                  key={actividad.id}
                  actividad={actividad}
                  esMia={actividad.responsable === idUsuario}
                  esLider={esLider}
                  onEditar={() => onAccion({ tipo: "actividad", plan, actividad })}
                  onEliminar={() => onAccion({ tipo: "eliminar-actividad", actividad })}
                />
              ))}
            </ul>
          )}

          {esLider && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
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
            </div>
          )}
        </>
      )}
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
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
              esLider={esLider}
              idUsuario={idUsuario}
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
    </div>
  );
}

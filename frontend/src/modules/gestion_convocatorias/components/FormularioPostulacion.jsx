import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, HelpCircle, Lightbulb, Loader2, UploadCloud, X } from "lucide-react";
import {
  BOTON_FANTASMA,
  BOTON_OSCURO,
  Modal,
  BOTON_ICONO,
  BOTON_ICONO_PELIGRO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  Campo,
  CabeceraTarjeta,
  ErrorGeneral,
  ETIQUETA,
  AYUDA,
  MensajeError,
  SECCION,
  TARJETA,
  Tarjeta,
  ZONA_ARCHIVO,
  claseOpcion,
} from "../../../components/ui";
import { useAuth } from "../../../context/AuthContext";
import { registrarPostulacion } from "../services/postulacionService";

const TIPOS_INICIATIVA = [
  { id: "emprendimiento", titulo: "Emprendimiento" },
  { id: "innovacion", titulo: "Innovación" },
];

// Sectores tecnológicos sugeridos (el backend guarda el texto tal cual, máx. 100 caracteres)
const SECTORES_TECNOLOGICOS = [
  "Software y aplicaciones",
  "Inteligencia artificial y analítica de datos",
  "IoT y sistemas embebidos",
  "Agrotecnología (AgTech)",
  "Salud y bienestar (HealthTech)",
  "Educación (EdTech)",
  "Servicios financieros (FinTech)",
  "Comercio electrónico y retail",
  "Energía y medio ambiente (CleanTech)",
  "Movilidad y logística",
  "Ciberseguridad",
  "Industria 4.0 y manufactura",
  "Turismo, cultura y entretenimiento",
  "Impacto social",
  "Otro",
];

// Etapa actual = nivel de madurez de la plataforma (M0 a M9, el mismo que luego actualiza la evaluación)
const ETAPAS_MADUREZ = [
  { valor: "M0", texto: "M0 · Ideación inicial (solo la idea)" },
  { valor: "M1", texto: "M1 · Formulación tecnológica" },
  { valor: "M2", texto: "M2 · Concepto validado" },
  { valor: "M3", texto: "M3 · Prueba de concepto" },
  { valor: "M4", texto: "M4 · Prototipo básico" },
  { valor: "M5", texto: "M5 · Prototipo de alta fidelidad" },
  { valor: "M6", texto: "M6 · Sistema de demostración" },
  { valor: "M7", texto: "M7 · Validación real con usuarios" },
  { valor: "M8", texto: "M8 · Sistema calificado" },
  { valor: "M9", texto: "M9 · Transferencia al mercado" },
];

// Qué escribir en "Detalle del origen" según el origen académico elegido
const DETALLE_POR_ORIGEN = {
  asignatura: { ayuda: "Escribe el nombre de la asignatura donde nació la idea.", ejemplo: "Ej: Sistemas Distribuidos" },
  proyecto_aula: { ayuda: "Escribe la asignatura o el nombre del proyecto de aula.", ejemplo: "Ej: Proyecto de aula de Ingeniería de Software" },
  integrador: { ayuda: "Escribe el nombre del proyecto integrador y su semestre.", ejemplo: "Ej: Proyecto Integrador VI semestre" },
  semillero: { ayuda: "Escribe el nombre del semillero de investigación.", ejemplo: "Ej: Semillero de Investigación en Desarrollo de Software" },
  practica: { ayuda: "Escribe la empresa o entidad donde hiciste la práctica.", ejemplo: "Ej: Práctica en Alcaldía de Cúcuta" },
  trabajo_grado: { ayuda: "Escribe el título de tu trabajo de grado.", ejemplo: "Ej: Plataforma de monitoreo de cultivos con IoT" },
};

const ORIGENES_ACADEMICOS = [
  { id: "asignatura", titulo: "Asignatura", desc: "Proyecto desarrollado en una materia." },
  { id: "proyecto_aula", titulo: "Proyecto de Aula", desc: "Iniciativa surgida de un proyecto de aula." },
  { id: "integrador", titulo: "Proyecto Integrador", desc: "Proyecto que integra varias áreas." },
  { id: "semillero", titulo: "Semillero de Investigación", desc: "Trabajo vinculado a un semillero." },
  { id: "practica", titulo: "Práctica Profesional", desc: "Iniciativa desarrollada durante la práctica." },
  { id: "trabajo_grado", titulo: "Trabajo de Grado", desc: "Propuesta relacionada con el trabajo de grado." },
];

// Grupo de opciones en tarjeta (tipo de iniciativa, origen académico)
function GrupoOpciones({ etiqueta, ayuda, opciones, valor, onChange, error, columnas, accion }) {
  return (
    <fieldset className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <legend className={ETIQUETA}>
            {etiqueta} <span className="text-ufps">*</span>
          </legend>
          {ayuda && <p className={`${AYUDA} mt-0.5`}>{ayuda}</p>}
        </div>
        {accion}
      </div>
      <div className={`grid grid-cols-1 gap-3 ${columnas}`}>
        {opciones.map((opcion) => {
          const seleccionado = valor === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              aria-pressed={seleccionado}
              onClick={() => onChange(opcion.id)}
              className={claseOpcion(seleccionado)}
            >
              <span className={`flex items-center justify-between gap-2 ${opcion.desc ? "mb-1.5" : ""}`}>
                <span className="text-sm font-semibold text-slate-900">{opcion.titulo}</span>
                {seleccionado && <CheckCircle2 className="h-4 w-4 shrink-0 text-ufps" aria-hidden="true" />}
              </span>
              {opcion.desc && <span className="block text-xs leading-snug text-slate-500">{opcion.desc}</span>}
            </button>
          );
        })}
      </div>
      <MensajeError>{error}</MensajeError>
    </fieldset>
  );
}

export default function FormularioPostulacion({
  convocatoria,
  onCancelar,
  onPostulacionExitosa,
}) {
  const { usuario } = useAuth();
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: "",
    origen_academico: "",
    detalle_origen: "",
    sector_tecnologico: "",
    etapa_actual: "",
  });
  const [documento, setDocumento] = useState(null);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [ayudaTipoAbierta, setAyudaTipoAbierta] = useState(false);

  const actualizar = (campo, valor) => {
    setForm((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: "" }));
  };

  const seleccionarDocumento = (event) => {
    const archivo = event.target.files?.[0] || null;
    event.target.value = "";

    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith(".pdf")) {
      setErrores((actual) => ({
        ...actual,
        documento_adjunto: "El documento debe ser un archivo PDF.",
      }));
      return;
    }
    if (archivo.size > 10 * 1024 * 1024) {
      setErrores((actual) => ({
        ...actual,
        documento_adjunto: "El archivo supera el tamaño máximo permitido de 10 MB.",
      }));
      return;
    }

    setDocumento(archivo);
    setErrores((actual) => ({ ...actual, documento_adjunto: "" }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (form.nombre.trim().length < 3) {
      nuevosErrores.nombre = "El nombre debe tener al menos 3 caracteres.";
    }
    if (!form.descripcion.trim()) {
      nuevosErrores.descripcion = "Ingresa una descripción para la iniciativa.";
    }
    if (!form.tipo) nuevosErrores.tipo = "Selecciona el tipo de iniciativa.";
    if (!form.origen_academico) {
      nuevosErrores.origen_academico = "Selecciona el origen académico.";
    }
    if (!form.detalle_origen.trim()) {
      nuevosErrores.detalle_origen = "Indica el nombre o detalle del origen académico.";
    }
    if (!form.sector_tecnologico.trim()) {
      nuevosErrores.sector_tecnologico = "Indica el sector tecnológico.";
    }
    if (!form.etapa_actual.trim()) {
      nuevosErrores.etapa_actual = "Indica la etapa actual de la iniciativa.";
    }
    if (!documento) {
      nuevosErrores.documento_adjunto = "Adjunta un único documento PDF.";
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    try {
      const resultado = await registrarPostulacion(
        {
          ...form,
          convocatoria: convocatoria.id_convocatoria,
          documento_adjunto: documento,
        },
        usuario,
        convocatoria,
      );
      onPostulacionExitosa?.(resultado);
    } catch (error) {
      const erroresApi = error.data
        ? Object.values(error.data).flat().filter(Boolean).join(" ")
        : "";
      setErrores((actual) => ({
        ...actual,
        submit:
          erroresApi ||
          error.message ||
          "Ocurrió un error al registrar la iniciativa.",
      }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className={`${TARJETA} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className={`${BOTON_ICONO} ring-1 ring-slate-200`}
            title="Volver a convocatorias"
            aria-label="Volver a convocatorias"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className={SECCION}>
              Nueva iniciativa{convocatoria.categoria ? ` · ${convocatoria.categoria}` : ""}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-snug tracking-tight text-slate-900">{convocatoria.nombre}</h1>
          </div>
        </div>
        <button type="button" onClick={onCancelar} className={`${BOTON_FANTASMA} self-start sm:self-center`}>
          Cancelar postulación
        </button>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tarjeta
          cabecera={
            <CabeceraTarjeta
              seccion="Paso 1"
              titulo="Información de la iniciativa"
              descripcion="Completa los datos principales que se registrarán en la convocatoria."
            />
          }
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Campo etiqueta="Nombre de la iniciativa" requerido error={errores.nombre} className="md:col-span-2">
              {(props) => (
                <input
                  {...props}
                  className={CAMPO}
                  value={form.nombre}
                  onChange={(event) => actualizar("nombre", event.target.value)}
                  placeholder="Ej: Sistema Inteligente de Riego"
                  maxLength={150}
                  required
                />
              )}
            </Campo>
            <Campo etiqueta="Descripción" requerido error={errores.descripcion} className="md:col-span-2">
              {(props) => (
                <textarea
                  {...props}
                  className={`${CAMPO} min-h-24 resize-y`}
                  value={form.descripcion}
                  onChange={(event) => actualizar("descripcion", event.target.value)}
                  placeholder="Describe brevemente la iniciativa."
                  maxLength={1000}
                  required
                />
              )}
            </Campo>
            <Campo
              etiqueta="Sector tecnológico"
              requerido
              error={errores.sector_tecnologico}
              ayuda="Área en la que se aplica tu solución. Si ninguna encaja, elige «Otro»."
            >
              {(props) => (
                <div className="relative">
                  <select
                    {...props}
                    className={`${CAMPO} appearance-none pr-10`}
                    value={form.sector_tecnologico}
                    onChange={(event) => actualizar("sector_tecnologico", event.target.value)}
                    required
                  >
                    <option value="">Selecciona un sector</option>
                    {SECTORES_TECNOLOGICOS.map((sector) => (
                      <option key={sector} value={sector}>
                        {sector}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                </div>
              )}
            </Campo>
            <Campo
              etiqueta="Etapa actual"
              requerido
              error={errores.etapa_actual}
              ayuda="Qué tan avanzada está hoy tu iniciativa. Si solo tienes la idea, elige M0."
            >
              {(props) => (
                <div className="relative">
                  <select
                    {...props}
                    className={`${CAMPO} appearance-none pr-10`}
                    value={form.etapa_actual}
                    onChange={(event) => actualizar("etapa_actual", event.target.value)}
                    required
                  >
                    <option value="">Selecciona la etapa</option>
                    {ETAPAS_MADUREZ.map((etapa) => (
                      <option key={etapa.valor} value={etapa.valor}>
                        {etapa.texto}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                </div>
              )}
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta
          cabecera={
            <CabeceraTarjeta
              seccion="Paso 2"
              titulo="Clasificación académica"
              descripcion="Selecciona el tipo de iniciativa y su origen académico."
            />
          }
        >
          <div className="space-y-6">
            <GrupoOpciones
              etiqueta="Tipo de iniciativa"
              ayuda="Selecciona solo una opción."
              opciones={TIPOS_INICIATIVA}
              valor={form.tipo}
              onChange={(id) => actualizar("tipo", id)}
              error={errores.tipo}
              columnas="sm:grid-cols-2"
              accion={
                <button
                  type="button"
                  onClick={() => setAyudaTipoAbierta(true)}
                  aria-haspopup="dialog"
                  className={`${BOTON_FANTASMA} -mt-2 min-h-9 shrink-0 text-xs`}
                >
                  <HelpCircle className="h-4 w-4 text-ufps" aria-hidden="true" />
                  ¿Cuál selecciono?
                </button>
              }
            />
            <GrupoOpciones
              etiqueta="Origen académico"
              ayuda="Selecciona solo una opción: dónde nació la iniciativa."
              opciones={ORIGENES_ACADEMICOS}
              valor={form.origen_academico}
              onChange={(id) => actualizar("origen_academico", id)}
              error={errores.origen_academico}
              columnas="sm:grid-cols-2 lg:grid-cols-3"
            />
            <Campo
              etiqueta="Detalle del origen"
              requerido
              error={errores.detalle_origen}
              ayuda={
                DETALLE_POR_ORIGEN[form.origen_academico]?.ayuda ||
                "Primero elige el origen académico; aquí escribirás el nombre de la asignatura, semillero, empresa o trabajo de grado."
              }
            >
              {(props) => (
                <input
                  {...props}
                  className={CAMPO}
                  value={form.detalle_origen}
                  onChange={(event) => actualizar("detalle_origen", event.target.value)}
                  placeholder={DETALLE_POR_ORIGEN[form.origen_academico]?.ejemplo || "Ej: Sistemas Distribuidos"}
                  maxLength={150}
                  required
                />
              )}
            </Campo>
          </div>
        </Tarjeta>

        <Tarjeta
          cabecera={
            <CabeceraTarjeta
              seccion="Paso 3"
              titulo="Documento de la iniciativa"
              descripcion="Adjunta un único documento en formato PDF (máximo 10 MB)."
            />
          }
        >
          <div className="space-y-3">
            <p className={ETIQUETA}>
              Documento PDF <span className="text-ufps">*</span>
            </p>
            <div className={ZONA_ARCHIVO}>
              <input
                type="file"
                onChange={seleccionarDocumento}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept=".pdf,application/pdf"
                aria-label="Seleccionar documento PDF"
              />
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400 transition-colors group-hover:text-ufps" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-800">Arrastra tu documento o haz clic para buscarlo</p>
              <p className="mt-0.5 text-xs text-slate-500">Solo se permite un archivo .PDF de hasta 10 MB.</p>
            </div>
            <MensajeError>{errores.documento_adjunto}</MensajeError>
            {documento && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ufps text-[10px] font-bold text-white">
                    PDF
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{documento.name}</p>
                    <p className="text-xs text-slate-500">{(documento.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDocumento(null)}
                  className={BOTON_ICONO_PELIGRO}
                  title="Quitar documento"
                  aria-label="Quitar documento"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </Tarjeta>

        <Modal
          open={ayudaTipoAbierta}
          onClose={() => setAyudaTipoAbierta(false)}
          icono={HelpCircle}
          seccion="Tipo de iniciativa"
          titulo="¿Cuál selecciono?"
          ancho="md"
          etiquetaCerrar="Cerrar ayuda"
          pie={
            <button type="button" onClick={() => setAyudaTipoAbierta(false)} className={BOTON_OSCURO}>
              Entendido
            </button>
          }
        >
          <div className="space-y-4 text-sm leading-relaxed text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Emprendimiento</p>
              <p className="mt-1">
                Elígelo si tu meta es crear una empresa o llevar al mercado un producto o servicio que quieres vender y
                volver sostenible.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Innovación</p>
              <p className="mt-1">
                Elígelo si buscas resolver un problema (tecnológico, social o de un proceso) con algo nuevo o mejorado,
                aunque todavía no tenga un modelo de negocio.
              </p>
            </div>
            <p className="text-xs text-slate-500">Solo puedes seleccionar una de las dos opciones.</p>
          </div>
        </Modal>

        <ErrorGeneral mensaje={errores.submit} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
            {enviando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Registrar iniciativa
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

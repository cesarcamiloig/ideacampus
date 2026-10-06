import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  GraduationCap,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { registrarPostulacion } from "../services/postulacionService";

const TIPOS_INICIATIVA = [
  { id: "emprendimiento", titulo: "Emprendimiento", desc: "Propuesta de negocio o empresa." },
  { id: "innovacion", titulo: "Innovación", desc: "Solución novedosa a un problema." },
];

const ORIGENES_ACADEMICOS = [
  { id: "asignatura", titulo: "Asignatura", desc: "Proyecto desarrollado en una materia." },
  { id: "proyecto_aula", titulo: "Proyecto de Aula", desc: "Iniciativa surgida de un proyecto de aula." },
  { id: "integrador", titulo: "Proyecto Integrador", desc: "Proyecto que integra varias áreas." },
  { id: "semillero", titulo: "Semillero de Investigación", desc: "Trabajo vinculado a un semillero." },
  { id: "practica", titulo: "Práctica Profesional", desc: "Iniciativa desarrollada durante la práctica." },
  { id: "trabajo_grado", titulo: "Trabajo de Grado", desc: "Propuesta relacionada con el trabajo de grado." },
];

const CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-all placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20";

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
            title="Volver a convocatorias"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                Nueva iniciativa
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">{convocatoria.categoria}</span>
            </div>
            <h2 className="text-lg font-bold leading-snug text-slate-900">
              {convocatoria.nombre}
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="self-start text-xs font-semibold text-slate-500 transition-colors hover:text-red-600 sm:self-center"
        >
          Cancelar postulación
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
      >
        <section className="space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Información de la iniciativa</h3>
            <p className="mt-1 text-xs text-slate-500">
              Completa los datos principales que se registrarán en la convocatoria.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="nombre-iniciativa" className="block text-xs font-bold text-slate-700">
                Nombre de la iniciativa <span className="text-red-600">*</span>
              </label>
              <input
                id="nombre-iniciativa"
                className={CAMPO}
                value={form.nombre}
                onChange={(event) => actualizar("nombre", event.target.value)}
                placeholder="Ej: Sistema Inteligente de Riego"
                maxLength={150}
                required
              />
              {errores.nombre && <p className="text-[11px] font-medium text-red-600">{errores.nombre}</p>}
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="descripcion-iniciativa" className="block text-xs font-bold text-slate-700">
                Descripción <span className="text-red-600">*</span>
              </label>
              <textarea
                id="descripcion-iniciativa"
                className={`${CAMPO} min-h-24 resize-y`}
                value={form.descripcion}
                onChange={(event) => actualizar("descripcion", event.target.value)}
                placeholder="Describe brevemente la iniciativa."
                maxLength={1000}
                required
              />
              {errores.descripcion && <p className="text-[11px] font-medium text-red-600">{errores.descripcion}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sector-tecnologico" className="block text-xs font-bold text-slate-700">
                Sector tecnológico <span className="text-red-600">*</span>
              </label>
              <input
                id="sector-tecnologico"
                className={CAMPO}
                value={form.sector_tecnologico}
                onChange={(event) => actualizar("sector_tecnologico", event.target.value)}
                placeholder="Ej: IoT"
                maxLength={100}
                required
              />
              {errores.sector_tecnologico && <p className="text-[11px] font-medium text-red-600">{errores.sector_tecnologico}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="etapa-actual" className="block text-xs font-bold text-slate-700">
                Etapa actual <span className="text-red-600">*</span>
              </label>
              <input
                id="etapa-actual"
                className={CAMPO}
                value={form.etapa_actual}
                onChange={(event) => actualizar("etapa_actual", event.target.value)}
                placeholder="Ej: Prototipo"
                maxLength={50}
                required
              />
              {errores.etapa_actual && <p className="text-[11px] font-medium text-red-600">{errores.etapa_actual}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <GraduationCap className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Clasificación académica</h3>
              <p className="mt-1 text-xs text-slate-500">
                Selecciona el tipo de iniciativa y su origen académico.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Tipo de iniciativa <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TIPOS_INICIATIVA.map((opcion) => {
                const seleccionado = form.tipo === opcion.id;
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    aria-pressed={seleccionado}
                    onClick={() => actualizar("tipo", opcion.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      seleccionado
                        ? "border-red-500 bg-red-50/60 shadow-sm ring-2 ring-red-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{opcion.titulo}</span>
                      {seleccionado && <CheckCircle2 className="h-4 w-4 text-red-600" />}
                    </div>
                    <p className="text-[11px] leading-snug text-slate-500">{opcion.desc}</p>
                  </button>
                );
              })}
            </div>
            {errores.tipo && <p className="text-[11px] font-medium text-red-600">{errores.tipo}</p>}
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Origen académico <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ORIGENES_ACADEMICOS.map((opcion) => {
                const seleccionado = form.origen_academico === opcion.id;
                return (
                  <button
                    key={opcion.id}
                    type="button"
                    aria-pressed={seleccionado}
                    onClick={() => actualizar("origen_academico", opcion.id)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      seleccionado
                        ? "border-red-500 bg-red-50/60 shadow-sm ring-2 ring-red-500/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">{opcion.titulo}</span>
                      {seleccionado && <CheckCircle2 className="h-4 w-4 shrink-0 text-red-600" />}
                    </div>
                    <p className="text-[11px] leading-snug text-slate-500">{opcion.desc}</p>
                  </button>
                );
              })}
            </div>
            {errores.origen_academico && (
              <p className="text-[11px] font-medium text-red-600">{errores.origen_academico}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="detalle-origen" className="block text-xs font-bold text-slate-700">
              Detalle del origen <span className="text-red-600">*</span>
            </label>
            <input
              id="detalle-origen"
              className={CAMPO}
              value={form.detalle_origen}
              onChange={(event) => actualizar("detalle_origen", event.target.value)}
              placeholder="Ej: Sistemas Distribuidos"
              maxLength={150}
              required
            />
            {errores.detalle_origen && <p className="text-[11px] font-medium text-red-600">{errores.detalle_origen}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-bold text-slate-900">Documento de la iniciativa</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Adjunta un único documento en formato PDF (máximo 10 MB).
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Documento PDF <span className="text-red-600">*</span>
            </label>
            <div className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition-colors hover:border-red-400">
              <input
                type="file"
                onChange={seleccionarDocumento}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                accept=".pdf,application/pdf"
                aria-label="Seleccionar documento PDF"
              />
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400 transition-colors group-hover:text-red-600" />
              <p className="mt-2 text-xs font-bold text-slate-800">
                Arrastra tu documento o haz clic para buscarlo
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Solo se permite un archivo .PDF de hasta 10 MB.
              </p>
            </div>
            {errores.documento_adjunto && (
              <p className="text-[11px] font-medium text-red-600">{errores.documento_adjunto}</p>
            )}
            {documento && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-xs font-bold text-red-600">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800">{documento.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(documento.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDocumento(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  title="Quitar documento"
                  aria-label="Quitar documento"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </section>

        {errores.submit && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {errores.submit}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Registrar iniciativa"}
          </button>
        </div>
      </form>
    </div>
  );
}

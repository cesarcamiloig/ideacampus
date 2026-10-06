import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  X,
  FileText,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { registrarPostulacion } from "../services/postulacionService";

const PASOS = [
  { numero: 1, titulo: "Iniciativa y Alcance", desc: "Datos generales del proyecto" },
  { numero: 2, titulo: "Origen Académico", desc: "Trazabilidad UFPS obligatoria" },
  { numero: 3, titulo: "Documentación y Enlaces", desc: "Adjuntos requeridos y repos" },
  { numero: 4, titulo: "Revisión y Radicación", desc: "Declaración jurada y envío" },
];

const CATEGORIAS_INICIATIVA = [
  "Software & Inteligencia Artificial",
  "Desarrollo Web & Cloud Computing",
  "Internet de las Cosas (IoT) & Hardware",
  "Ciberseguridad & Infraestructura",
  "FinTech & Soluciones Comerciales",
  "EdTech & Tecnologías para la Educación",
  "AgroTech & Sostenibilidad",
  "Impacto Social e Innovación Comunitaria",
];

const NIVELES_TRL = [
  {
    codigo: "M0",
    titulo: "M0 - Fase de Ideación",
    desc: "Problema identificado, necesidad del usuario clara y solución conceptual formulada.",
  },
  {
    codigo: "M1",
    titulo: "M1 - Concepto Básico",
    desc: "Principios básicos observados y formulación preliminar de requerimientos de software.",
  },
  {
    codigo: "M2",
    titulo: "M2 - Validación de Concepto",
    desc: "Arquitectura preliminar, wireframes o maquetas funcionales probadas con usuarios.",
  },
  {
    codigo: "M3",
    titulo: "M3 - Prueba de Concepto Experimental",
    desc: "Prototipo de laboratorio o código mínimo viable con funcionalidades críticas operativas.",
  },
];

export default function FormularioPostulacion({
  convocatoria,
  onCancelar,
  onPostulacionExitosa,
}) {
  const { usuario } = useAuth();
  const [pasoActual, setPasoActual] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState({});

  // ESTADO GENERAL DEL FORMULARIO
  const [form, setForm] = useState({
    // Paso 1: Iniciativa
    titulo: "",
    categoria: "Software & Inteligencia Artificial",
    resumen_ejecutivo: "",
    problema_solucion: "",
    trl_inicial: "M1",
    impacto_esperado: "",

    // Paso 2: Origen Académico (HU-03 core)
    origen_tipo: "asignatura", // asignatura | semillero | proyecto_grado | extracurricular
    asignatura_nombre: "",
    asignatura_semestre: "2025-2",
    docente_titular: "",
    codigo_grupo: "",
    entregable_previo: "",

    semillero_nombre: "",
    tutor_semillero: "",
    linea_investigacion: "",

    modalidad_grado: "",
    director_proyecto: "",

    justificacion_extracurricular: "",
    descripcion_origen: "",

    // Datos del Postulante
    lider_nombre: usuario?.nombre || "Estudiante UFPS",
    lider_correo: usuario?.correo || "estudiante@ufps.edu.co",
    lider_codigo: "1152000",
    integrantes: [],

    // Paso 3: Documentación
    archivos: [],
    repositorio_url: "",
    demo_url: "",
    observaciones_adjuntos: "",

    // Paso 4: Declaración
    declaracion_aceptada: false,
  });

  // GESTIÓN DE ARCHIVOS ADJUNTOS
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const nuevos = files.map((file) => ({
      id: `file-${Date.now()}-${Math.random()}`,
      nombre: file.name,
      tamanio: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      tipo: file.type || "application/pdf",
      fechaSubida: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      file: file,
    }));

    setForm((prev) => ({
      ...prev,
      archivos: [...prev.archivos, ...nuevos],
    }));
    e.target.value = "";
  };

  const handleEliminarArchivo = (id) => {
    setForm((prev) => ({
      ...prev,
      archivos: prev.archivos.filter((a) => a.id !== id),
    }));
  };

  // VALIDACIONES POR PASO
  const validarPaso = (paso) => {
    const errs = {};
    if (paso === 1) {
      if (!form.titulo.trim() || form.titulo.trim().length < 5) {
        errs.titulo = "El título de la iniciativa debe tener al menos 5 caracteres.";
      }
      if (!form.resumen_ejecutivo.trim() || form.resumen_ejecutivo.trim().length < 30) {
        errs.resumen_ejecutivo = "El resumen ejecutivo debe contener al menos 30 caracteres.";
      }
      if (!form.problema_solucion.trim()) {
        errs.problema_solucion = "Describe el problema identificado y la solución propuesta.";
      }
    } else if (paso === 2) {
      if (form.origen_tipo === "asignatura") {
        if (!form.asignatura_nombre.trim()) {
          errs.asignatura_nombre = "Indica el nombre de la asignatura del plan de estudios.";
        }
        if (!form.docente_titular.trim()) {
          errs.docente_titular = "Indica el nombre del docente titular de la asignatura.";
        }
      } else if (form.origen_tipo === "semillero") {
        if (!form.semillero_nombre.trim()) {
          errs.semillero_nombre = "Indica el nombre del semillero de investigación.";
        }
        if (!form.tutor_semillero.trim()) {
          errs.tutor_semillero = "Indica el docente tutor del semillero.";
        }
      } else if (form.origen_tipo === "proyecto_grado") {
        if (!form.director_proyecto.trim()) {
          errs.director_proyecto = "Indica el director o codirector del proyecto de grado.";
        }
      } else if (form.origen_tipo === "extracurricular") {
        if (!form.justificacion_extracurricular.trim()) {
          errs.justificacion_extracurricular = "Justifica la articulación con el programa de Ingeniería de Sistemas.";
        }
      }

      if (!form.descripcion_origen.trim() || form.descripcion_origen.trim().length < 20) {
        errs.descripcion_origen = "Describe brevemente la trayectoria u origen previo de la iniciativa (mínimo 20 caracteres).";
      }
    } else if (paso === 3) {
      if (form.archivos.length === 0) {
        errs.archivos = "Debes adjuntar al menos un documento o ficha de postulación (PDF/Word/ZIP).";
      }
    } else if (paso === 4) {
      if (!form.declaracion_aceptada) {
        errs.declaracion_aceptada = "Debes aceptar la declaración juramentada de autoría y veracidad.";
      }
    }

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSiguiente = () => {
    if (validarPaso(pasoActual)) {
      setPasoActual((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleAnterior = () => {
    setPasoActual((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ENVÍO FINAL Y RADICACIÓN INSTITUCIONAL
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarPaso(4)) return;

    setEnviando(true);
    try {
      const payload = {
        id_convocatoria: convocatoria.id_convocatoria,
        convocatoria_nombre: convocatoria.nombre,
        convocatoria_categoria: convocatoria.categoria,
        convocatoria_periodo: convocatoria.periodo_nombre,
        ...form,
      };

      const resultado = await registrarPostulacion(payload, usuario);
      if (onPostulacionExitosa) {
        onPostulacionExitosa(resultado);
      }
    } catch (err) {
      setErrores({
        submit: err.message || "Ocurrió un error al radicar la postulación.",
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE RETORNO Y CONVOCATORIA SELECCIONADA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Volver a Convocatorias"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                Postulación Abierta · HU-03
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500">{convocatoria.categoria}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {convocatoria.nombre}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors self-start sm:self-center"
        >
          Cancelar postulación
        </button>
      </div>

      {/* STEPPER / BARRA DE PROGRESO DE 4 PASOS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PASOS.map((paso) => {
            const isCompleted = pasoActual > paso.numero;
            const isCurrent = pasoActual === paso.numero;
            return (
              <div
                key={paso.numero}
                onClick={() => {
                  if (paso.numero < pasoActual) setPasoActual(paso.numero);
                }}
                className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-red-50/50 border-red-500 shadow-sm ring-1 ring-red-500/20"
                    : isCompleted
                    ? "bg-slate-50 border-emerald-300 cursor-pointer hover:bg-slate-100"
                    : "bg-white border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[11px] font-bold ${
                      isCurrent
                        ? "bg-red-600 text-white"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : paso.numero}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Paso {paso.numero}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">
                  {paso.titulo}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {paso.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORMULARIO POR PASOS */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-7 shadow-sm space-y-6">
        {/* ============================================================== */}
        {/* PASO 1: DATOS GENERALES DE LA INICIATIVA */}
        {/* ============================================================== */}
        {pasoActual === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                1. Información General de la Iniciativa
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Define el nombre, área técnica, alcance de la propuesta y su nivel de madurez inicial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Título o Nombre de la Iniciativa <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ej: Sistema Inteligente para Monitoreo de Cultivos con Visión Artificial"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                    errores.titulo ? "border-red-500" : "border-slate-200 focus:border-red-500"
                  }`}
                />
                {errores.titulo && (
                  <p className="text-[11px] text-red-600 font-medium">{errores.titulo}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Categoría / Área Temática <span className="text-red-600">*</span>
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800"
                >
                  {CATEGORIAS_INICIATIVA.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nivel de Madurez Tecnológica Inicial (TRL / Escala M0-M9) <span className="text-red-600">*</span>
                </label>
                <select
                  value={form.trl_inicial}
                  onChange={(e) => setForm({ ...form, trl_inicial: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-slate-800"
                >
                  {NIVELES_TRL.map((trl) => (
                    <option key={trl.codigo} value={trl.codigo}>
                      {trl.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Resumen Ejecutivo del Emprendimiento <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.resumen_ejecutivo}
                  onChange={(e) => setForm({ ...form, resumen_ejecutivo: e.target.value })}
                  placeholder="Describe de forma concisa qué es tu iniciativa, para quién está pensada y qué valor diferencial genera..."
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                    errores.resumen_ejecutivo ? "border-red-500" : "border-slate-200 focus:border-red-500"
                  }`}
                />
                {errores.resumen_ejecutivo && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {errores.resumen_ejecutivo}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Problema Identificado y Solución Propuesta <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.problema_solucion}
                  onChange={(e) => setForm({ ...form, problema_solucion: e.target.value })}
                  placeholder="¿Cuál es la necesidad o dolor específico que resuelve en el entorno regional o tecnológico? ¿Cómo lo aborda tu solución?"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                    errores.problema_solucion ? "border-red-500" : "border-slate-200 focus:border-red-500"
                  }`}
                />
                {errores.problema_solucion && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {errores.problema_solucion}
                  </p>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Impacto Esperado (Social, Tecnológico, Económico)
                </label>
                <input
                  type="text"
                  value={form.impacto_esperado}
                  onChange={(e) => setForm({ ...form, impacto_esperado: e.target.value })}
                  placeholder="Ej: Automatizar en un 40% el tiempo de análisis en pequeñas agroindustrias de Norte de Santander."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 2: DECLARACIÓN DE ORIGEN ACADÉMICO (CORE HU-03) */}
        {/* ============================================================== */}
        {pasoActual === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  2. Declaración de Origen Académico (Trazabilidad Longitudinal)
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Para asegurar la trazabilidad institucional en el Programa de Ingeniería de Sistemas UFPS, debes declarar el contexto formativo donde se originó esta iniciativa.
              </p>
            </div>

            {/* SELECCIÓN DEL TIPO DE ORIGEN */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Selecciona la Modalidad de Origen Académico <span className="text-red-600">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    id: "asignatura",
                    titulo: "Asignatura de Carrera",
                    desc: "Proyecto de aula o materia cursada",
                    badge: "Plan de Estudios",
                  },
                  {
                    id: "semillero",
                    titulo: "Semillero de Investigación",
                    desc: "Grupo o línea de semillero UFPS",
                    badge: "I+D+i",
                  },
                  {
                    id: "proyecto_grado",
                    titulo: "Proyecto de Grado",
                    desc: "Modalidad de trabajo de grado",
                    badge: "Tesis / Pasantía",
                  },
                  {
                    id: "extracurricular",
                    titulo: "Iniciativa Independiente",
                    desc: "Emprendimiento estudiantil extracurricular",
                    badge: "Autónomo",
                  },
                ].map((tipo) => {
                  const isSelected = form.origen_tipo === tipo.id;
                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setForm({ ...form, origen_tipo: tipo.id })}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-red-50/60 border-red-500 shadow-sm ring-2 ring-red-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {tipo.badge}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-red-600 shrink-0" />
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {tipo.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                        {tipo.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CAMPOS ESPECÍFICOS SEGÚN EL TIPO DE ORIGEN */}
            <div className="rounded-2xl bg-slate-50/80 p-5 border border-slate-200 space-y-4">
              {form.origen_tipo === "asignatura" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nombre de la Asignatura <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.asignatura_nombre}
                      onChange={(e) =>
                        setForm({ ...form, asignatura_nombre: e.target.value })
                      }
                      placeholder="Ej: Análisis y Diseño de Sistemas / Ingeniería de Software"
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                        errores.asignatura_nombre
                          ? "border-red-500"
                          : "border-slate-200 focus:border-red-500"
                      }`}
                    />
                    {errores.asignatura_nombre && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errores.asignatura_nombre}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Docente Titular de la Materia <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.docente_titular}
                      onChange={(e) =>
                        setForm({ ...form, docente_titular: e.target.value })
                      }
                      placeholder="Ej: Ing. Claudia Gómez"
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                        errores.docente_titular
                          ? "border-red-500"
                          : "border-slate-200 focus:border-red-500"
                      }`}
                    />
                    {errores.docente_titular && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errores.docente_titular}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Semestre en que se Cursó
                    </label>
                    <input
                      type="text"
                      value={form.asignatura_semestre}
                      onChange={(e) =>
                        setForm({ ...form, asignatura_semestre: e.target.value })
                      }
                      placeholder="Ej: 2025-2 o 2026-1"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Entregable o Hito Académico Logrado
                    </label>
                    <input
                      type="text"
                      value={form.entregable_previo}
                      onChange={(e) =>
                        setForm({ ...form, entregable_previo: e.target.value })
                      }
                      placeholder="Ej: Diagramas C4, modelo de datos y primer prototipo interactivo"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {form.origen_tipo === "semillero" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Nombre del Semillero de Investigación <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.semillero_nombre}
                      onChange={(e) =>
                        setForm({ ...form, semillero_nombre: e.target.value })
                      }
                      placeholder="Ej: Semillero SILOGIC / SIDIS"
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                        errores.semillero_nombre
                          ? "border-red-500"
                          : "border-slate-200 focus:border-red-500"
                      }`}
                    />
                    {errores.semillero_nombre && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errores.semillero_nombre}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Tutor o Docente a Cargo <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.tutor_semillero}
                      onChange={(e) =>
                        setForm({ ...form, tutor_semillero: e.target.value })
                      }
                      placeholder="Ej: Docente coordinador del semillero"
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                        errores.tutor_semillero
                          ? "border-red-500"
                          : "border-slate-200 focus:border-red-500"
                      }`}
                    />
                    {errores.tutor_semillero && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errores.tutor_semillero}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Línea de Investigación o Eje Temático
                    </label>
                    <input
                      type="text"
                      value={form.linea_investigacion}
                      onChange={(e) =>
                        setForm({ ...form, linea_investigacion: e.target.value })
                      }
                      placeholder="Ej: Inteligencia Artificial, Sistemas Distribuidos, Ingeniería de Software"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    />
                  </div>
                </div>
              )}

              {form.origen_tipo === "proyecto_grado" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Modalidad del Proyecto de Grado
                    </label>
                    <select
                      value={form.modalidad_grado}
                      onChange={(e) =>
                        setForm({ ...form, modalidad_grado: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    >
                      <option value="">Selecciona modalidad</option>
                      <option value="desarrollo_tecnologico">Desarrollo Tecnológico</option>
                      <option value="investigacion">Investigación Aplicada</option>
                      <option value="pasantia">Pasantía Institucional / Empresarial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Director o Codirector del Proyecto <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.director_proyecto}
                      onChange={(e) =>
                        setForm({ ...form, director_proyecto: e.target.value })
                      }
                      placeholder="Ej: Docente director de tesis"
                      className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                        errores.director_proyecto
                          ? "border-red-500"
                          : "border-slate-200 focus:border-red-500"
                      }`}
                    />
                    {errores.director_proyecto && (
                      <p className="text-[11px] text-red-600 font-medium">
                        {errores.director_proyecto}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {form.origen_tipo === "extracurricular" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Justificación y Articulación con Ingeniería de Sistemas <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.justificacion_extracurricular}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        justificacion_extracurricular: e.target.value,
                      })
                    }
                    placeholder="Explica cómo esta iniciativa se articula con tus competencias como futuro Ingeniero de Sistemas UFPS..."
                    className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                      errores.justificacion_extracurricular
                        ? "border-red-500"
                        : "border-slate-200 focus:border-red-500"
                    }`}
                  />
                  {errores.justificacion_extracurricular && (
                    <p className="text-[11px] text-red-600 font-medium">
                      {errores.justificacion_extracurricular}
                    </p>
                  )}
                </div>
              )}

              {/* DESCRIPCIÓN DE LA TRAYECTORIA ACADÉMICA */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-slate-700">
                  Descripción de la Trayectoria Previa y Contexto de Gestación <span className="text-red-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={form.descripcion_origen}
                  onChange={(e) =>
                    setForm({ ...form, descripcion_origen: e.target.value })
                  }
                  placeholder="Relata cómo y cuándo nació esta idea, qué pruebas o retroalimentaciones docentes ha recibido y cómo se busca potenciar en esta convocatoria..."
                  className={`w-full px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all ${
                    errores.descripcion_origen
                      ? "border-red-500"
                      : "border-slate-200 focus:border-red-500"
                  }`}
                />
                {errores.descripcion_origen && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {errores.descripcion_origen}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 3: DOCUMENTACIÓN REQUERIDA Y ENLACES */}
        {/* ============================================================== */}
        {pasoActual === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  3. Documentación Requerida y Enlaces de Soporte
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Adjunta la propuesta técnica, soporte de origen académico y los enlaces a tu repositorio o demo funcional.
              </p>
            </div>

            {/* REQUISITOS RECORDATORIO */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Requisitos exigidos por esta convocatoria:
              </span>
              <p className="whitespace-pre-line text-amber-800 pl-5">
                {convocatoria.requisitos_documentacion ||
                  "Ficha de propuesta técnica (PDF) y constancia o aval de origen académico."}
              </p>
            </div>

            {/* ZONA DE SUBIDA DRAG & DROP */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Archivos Adjuntos (PDF, DOCX, ZIP - Máx. 25MB) <span className="text-red-600">*</span>
              </label>

              <div className="relative border-2 border-dashed border-slate-300 hover:border-red-400 rounded-2xl p-8 text-center bg-slate-50/50 transition-colors cursor-pointer group">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.docx,.doc,.zip,.rar,.png,.jpg"
                />
                <UploadCloud className="mx-auto h-10 w-10 text-slate-400 group-hover:text-red-600 transition-colors" />
                <p className="mt-2 text-xs font-bold text-slate-800">
                  Arrastra aquí tus documentos o haz clic para explorar en tu equipo
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Soporta propuesta técnica, aval académico firmado, pitch deck y soportes adicionales.
                </p>
              </div>

              {errores.archivos && (
                <p className="text-[11px] text-red-600 font-medium">
                  {errores.archivos}
                </p>
              )}
            </div>

            {/* LISTADO DE ARCHIVOS SUBIDOS */}
            {form.archivos.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">
                  Documentos listos para radicar ({form.archivos.length}):
                </span>
                <div className="space-y-2">
                  {form.archivos.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                          PDF
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {file.nombre}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {file.tamanio} · Subido a las {file.fechaSubida}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEliminarArchivo(file.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Quitar archivo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENLACES COMPLEMENTARIOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>Enlace a Repositorio de Código (GitHub / GitLab)</span>
                </label>
                <input
                  type="url"
                  value={form.repositorio_url}
                  onChange={(e) =>
                    setForm({ ...form, repositorio_url: e.target.value })
                  }
                  placeholder="https://github.com/usuario/mi-iniciativa"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                  <span>Demo en Vivo o Video Pitch (YouTube / Loom)</span>
                </label>
                <input
                  type="url"
                  value={form.demo_url}
                  onChange={(e) => setForm({ ...form, demo_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=... o https://app.demo.com"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 4: RESUMEN, DECLARACIÓN ÉTICA Y RADICACIÓN */}
        {/* ============================================================== */}
        {pasoActual === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  4. Verificación del Expediente y Radicación Institucional
                </h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Revisa los datos registrados antes de generar tu número único de radicado para trazabilidad.
              </p>
            </div>

            {/* FICHA RESUMEN */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Convocatoria
                  </span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {convocatoria.nombre}
                  </p>
                  <p className="text-slate-500 font-medium">
                    {convocatoria.periodo_nombre}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Iniciativa
                  </span>
                  <p className="font-bold text-slate-800 text-sm mt-0.5">
                    {form.titulo || "Sin título"}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                    {form.categoria} · {form.trl_inicial}
                  </span>
                </div>

                <div className="md:col-span-2 border-t border-slate-200/60 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Trazabilidad de Origen Académico Declarado
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase text-[10px]">
                      {form.origen_tipo.replace(/_/g, " ")}
                    </span>
                    {form.origen_tipo === "asignatura" && (
                      <span className="text-slate-700 font-semibold">
                        Materia: {form.asignatura_nombre} (Docente: {form.docente_titular})
                      </span>
                    )}
                    {form.origen_tipo === "semillero" && (
                      <span className="text-slate-700 font-semibold">
                        Semillero: {form.semillero_nombre} (Tutor: {form.tutor_semillero})
                      </span>
                    )}
                    {form.origen_tipo === "proyecto_grado" && (
                      <span className="text-slate-700 font-semibold">
                        Director: {form.director_proyecto} ({form.modalidad_grado})
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 mt-1 italic">
                    "{form.descripcion_origen}"
                  </p>
                </div>

                <div className="border-t border-slate-200/60 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Estudiante Postulante
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {usuario?.nombre || form.lider_nombre}
                  </p>
                  <p className="text-slate-500 font-mono text-[11px]">
                    {usuario?.correo || form.lider_correo}
                  </p>
                </div>

                <div className="border-t border-slate-200/60 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Documentación Adjunta
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {form.archivos.length} archivo(s) adjunto(s)
                  </p>
                  {form.repositorio_url && (
                    <p className="text-slate-500 truncate font-mono text-[11px]">
                      Repo: {form.repositorio_url}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* DECLARACIÓN JURADA DE AUTORÍA Y ORIGINALIDAD */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.declaracion_aceptada}
                  onChange={(e) =>
                    setForm({ ...form, declaracion_aceptada: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed select-none">
                  Declaro bajo la gravedad de juramento que la información suministrada es verídica, que la iniciativa postulada respeta los derechos de autor, propiedad intelectual y la normativa de la <strong>Universidad Francisco de Paula Santander</strong>, y autorizo el seguimiento y trazabilidad de la trayectoria de este proyecto en el Programa de Ingeniería de Sistemas.
                </span>
              </label>

              {errores.declaracion_aceptada && (
                <p className="text-[11px] text-red-600 font-medium pl-7">
                  {errores.declaracion_aceptada}
                </p>
              )}
            </div>

            {errores.submit && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errores.submit}</span>
              </div>
            )}
          </div>
        )}

        {/* BOTONES DE NAVEGACIÓN Y ACCIÓN */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100">
          {pasoActual > 1 ? (
            <button
              type="button"
              onClick={handleAnterior}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Paso anterior</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancelar}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
          )}

          {pasoActual < 4 ? (
            <button
              type="button"
              onClick={handleSiguiente}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-semibold text-white shadow-sm transition-all"
            >
              <span>Continuar</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={enviando}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white shadow-md hover:shadow transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{enviando ? "Radicando en el Sistema..." : "Radicar Postulación Institucional"}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

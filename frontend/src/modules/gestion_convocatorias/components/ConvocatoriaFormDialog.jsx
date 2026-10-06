import React, { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, Clock, CheckCircle2 } from "lucide-react";

export function ConvocatoriaFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  periodos = [],
  categories = [],
}) {
  const [formData, setFormData] = useState({
    nombre: "",
    categoria: "Innovación y Base Tecnológica",
    periodo: "",
    fecha_apertura: "",
    fecha_cierre: "",
    estado: "borrador",
    descripcion: "",
    requisitos_documentacion: "",
    criterios_evaluacion: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatear fechas ISO para input datetime-local (YYYY-MM-DDTHH:mm)
  const formatForDatetimeInput = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          nombre: initialData.nombre || "",
          categoria: initialData.categoria || "Innovación y Base Tecnológica",
          periodo: initialData.periodo ? String(initialData.periodo) : "",
          fecha_apertura: formatForDatetimeInput(initialData.fecha_apertura),
          fecha_cierre: formatForDatetimeInput(initialData.fecha_cierre),
          estado: initialData.estado || "borrador",
          descripcion: initialData.descripcion || "",
          requisitos_documentacion: initialData.requisitos_documentacion || "",
          criterios_evaluacion: initialData.criterios_evaluacion || "",
        });
      } else {
        // Valores por defecto para nueva convocatoria
        const now = new Date();
        const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días

        setFormData({
          nombre: "",
          categoria: "Innovación y Base Tecnológica",
          periodo: periodos.length > 0 ? String(periodos[0].id || periodos[0].id_periodo || "") : "",
          fecha_apertura: formatForDatetimeInput(now.toISOString()),
          fecha_cierre: formatForDatetimeInput(future.toISOString()),
          estado: "borrador",
          descripcion: "",
          requisitos_documentacion: "",
          criterios_evaluacion: "",
        });
      }
      setErrors({});
    }
  }, [open, initialData, periodos]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.nombre || formData.nombre.trim().length < 3) {
      errs.nombre = "El nombre de la convocatoria debe tener al menos 3 caracteres.";
    }

    if (!formData.fecha_apertura) {
      errs.fecha_apertura = "La fecha y hora de apertura es obligatoria.";
    }

    if (!formData.fecha_cierre) {
      errs.fecha_cierre = "La fecha y hora de cierre es obligatoria.";
    }

    if (formData.fecha_apertura && formData.fecha_cierre) {
      const apertura = new Date(formData.fecha_apertura);
      const cierre = new Date(formData.fecha_cierre);
      if (apertura >= cierre) {
        errs.fecha_cierre = "La fecha de cierre debe ser posterior a la fecha de apertura (GENNOVA-50).";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        categoria: formData.categoria.trim(),
        periodo: formData.periodo ? parseInt(formData.periodo, 10) : null,
        fecha_apertura: new Date(formData.fecha_apertura).toISOString(),
        fecha_cierre: new Date(formData.fecha_cierre).toISOString(),
        estado: formData.estado,
        descripcion: formData.descripcion.trim(),
        requisitos_documentacion: formData.requisitos_documentacion.trim(),
        criterios_evaluacion: formData.criterios_evaluacion.trim(),
      };

      await onSave(payload);
      onOpenChange(false);
    } catch (err) {
      if (err.data && typeof err.data === "object") {
        const backendErrors = {};
        for (const [key, val] of Object.entries(err.data)) {
          backendErrors[key] = Array.isArray(val) ? val.join(" ") : String(val);
        }
        setErrors(backendErrors);
      } else {
        setErrors({ general: err.message || "Error al guardar la convocatoria." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Categorías institucionales recomendadas
  const defaultCategories = [
    "Innovación y Base Tecnológica",
    "Emprendimiento Social y Ambiental",
    "Investigación y Desarrollo (I+D)",
    "Industrias Creativas y Digitales",
    "General / Multidisciplinar",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Línea roja decorativa UFPS */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500" />

        {/* Encabezado del modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
              {initialData ? "Modificar Convocatoria" : "Nueva Convocatoria Institucional"}
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              {initialData ? initialData.nombre : "Registrar Convocatoria de Emprendimiento"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido scrolleable del formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errors.general && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Nombre de la Convocatoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Convocatoria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Convocatoria Semillero de Ideas 2026-I"
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:outline-none focus:ring-2 ${
                errors.nombre
                  ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 bg-white focus:border-red-500 focus:ring-red-500/20"
              }`}
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-600 font-medium">{errors.nombre}</p>}
          </div>

          {/* Categoría y Periodo Académico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría Temática
              </label>
              <input
                list="categorias-list"
                name="categoria"
                value={formData.categoria}
                onChange={handleChange}
                placeholder="Selecciona o escribe una categoría"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <datalist id="categorias-list">
                {defaultCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
                {categories.map((c) => (
                  <option key={c.id || c.name} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ciclo / Periodo Académico
              </label>
              <select
                name="periodo"
                value={formData.periodo}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="">(Sin periodo asociado)</option>
                {periodos.map((p) => {
                  const id = p.id || p.id_periodo;
                  const label = p.name || p.nombre_periodo || `Ciclo ${p.year || p.anio}-${p.semester || p.semestre}`;
                  return (
                    <option key={id} value={id}>
                      {label} {p.isCurrent || p.vigente ? "— [Vigente]" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Fechas de Apertura y Cierre (GENNOVA-50) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Clock className="h-4 w-4 text-red-600" />
              <span>Cronograma y Ventana de Postulación (GENNOVA-50)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha y Hora de Apertura <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="fecha_apertura"
                  value={formData.fecha_apertura}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 transition-colors focus:outline-none focus:ring-2 ${
                    errors.fecha_apertura
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 bg-white focus:border-red-500 focus:ring-red-500/20"
                  }`}
                />
                {errors.fecha_apertura && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.fecha_apertura}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha y Hora de Cierre <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  name="fecha_cierre"
                  value={formData.fecha_cierre}
                  onChange={handleChange}
                  className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 transition-colors focus:outline-none focus:ring-2 ${
                    errors.fecha_cierre
                      ? "border-red-300 bg-red-50/30 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-200 bg-white focus:border-red-500 focus:ring-red-500/20"
                  }`}
                />
                {errors.fecha_cierre && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.fecha_cierre}</p>
                )}
              </div>
            </div>
          </div>

          {/* Estado inicial */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estado de la Convocatoria
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="borrador">Borrador (Solo visible para coordinadores y administradores)</option>
              <option value="publicada">Publicada (Visible públicamente, abre según fecha programada)</option>
              <option value="abierta">Abierta (Recepción de iniciativas activa inmediatamente)</option>
              {initialData && <option value="cerrada">Cerrada</option>}
              {initialData && <option value="cancelada">Cancelada</option>}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción del Objetivo y Alcance
            </label>
            <textarea
              name="descripcion"
              rows={3}
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Detalla el propósito de la convocatoria, público objetivo y beneficios para los emprendedores..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Requisitos de documentación */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Requisitos y Documentación Solicitada
            </label>
            <textarea
              name="requisitos_documentacion"
              rows={2}
              value={formData.requisitos_documentacion}
              onChange={handleChange}
              placeholder="Ej: Documento de identidad, propuesta de valor Canvas, pitch deck en formato PDF..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          {/* Criterios de Evaluación */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Criterios de Evaluación y Calificación
            </label>
            <textarea
              name="criterios_evaluacion"
              rows={2}
              value={formData.criterios_evaluacion}
              onChange={handleChange}
              placeholder="Ej: Grado de innovación (30%), Viabilidad técnica (30%), Impacto social/económico (40%)..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
        </form>

        {/* Footer del modal */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{initialData ? "Actualizar Convocatoria" : "Crear Convocatoria"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

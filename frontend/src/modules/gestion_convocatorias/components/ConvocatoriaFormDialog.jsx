import React, { useState, useEffect } from "react";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import {
  BLOQUE,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  CAMPO,
  Campo,
  ErrorGeneral,
  Modal,
  Rotulo,
} from "../../../components/ui";

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
    <Modal
      open
      onClose={() => onOpenChange(false)}
      ancho="2xl"
      seccion={initialData ? "Modificar Convocatoria" : "Nueva Convocatoria Institucional"}
      titulo={initialData ? initialData.nombre : "Registrar Convocatoria de Emprendimiento"}
      etiquetaCerrar="Cerrar formulario de convocatoria"
      cerrarConFondo={!isSubmitting}
      pie={
        <>
          <button type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className={BOTON_PRIMARIO}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Guardando…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {initialData ? "Actualizar Convocatoria" : "Crear Convocatoria"}
              </>
            )}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <ErrorGeneral mensaje={errors.general} />

        <Campo etiqueta="Nombre de la Convocatoria" requerido error={errors.nombre}>
          {(props) => (
            <input
              {...props}
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ej: Convocatoria Semillero de Ideas 2026-I"
              className={CAMPO}
            />
          )}
        </Campo>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Categoría Temática">
            {(props) => (
              <>
                <input
                  {...props}
                  list="categorias-list"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  placeholder="Selecciona o escribe una categoría"
                  className={CAMPO}
                />
                <datalist id="categorias-list">
                  {defaultCategories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>

          <Campo etiqueta="Ciclo / Periodo Académico">
            {(props) => (
              <select {...props} name="periodo" value={formData.periodo} onChange={handleChange} className={CAMPO}>
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
            )}
          </Campo>
        </div>

        {/* Fechas de apertura y cierre (GENNOVA-50) */}
        <fieldset className={`${BLOQUE} space-y-3`}>
          <legend className="sr-only">Cronograma y ventana de postulación</legend>
          <Rotulo as="p" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
            Cronograma y ventana de postulación
          </Rotulo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Fecha y Hora de Apertura" requerido error={errors.fecha_apertura}>
              {(props) => (
                <input
                  {...props}
                  type="datetime-local"
                  name="fecha_apertura"
                  value={formData.fecha_apertura}
                  onChange={handleChange}
                  className={CAMPO}
                />
              )}
            </Campo>
            <Campo etiqueta="Fecha y Hora de Cierre" requerido error={errors.fecha_cierre}>
              {(props) => (
                <input
                  {...props}
                  type="datetime-local"
                  name="fecha_cierre"
                  value={formData.fecha_cierre}
                  onChange={handleChange}
                  className={CAMPO}
                />
              )}
            </Campo>
          </div>
        </fieldset>

        <Campo etiqueta="Estado de la Convocatoria">
          {(props) => (
            <select {...props} name="estado" value={formData.estado} onChange={handleChange} className={CAMPO}>
              <option value="borrador">Borrador (Solo visible para coordinadores y administradores)</option>
              <option value="publicada">Publicada (Visible públicamente, abre según fecha programada)</option>
              <option value="abierta">Abierta (Recepción de iniciativas activa inmediatamente)</option>
              {initialData && <option value="cerrada">Cerrada</option>}
              {initialData && <option value="cancelada">Cancelada</option>}
            </select>
          )}
        </Campo>

        <Campo etiqueta="Descripción del Objetivo y Alcance">
          {(props) => (
            <textarea
              {...props}
              name="descripcion"
              rows={3}
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Detalla el propósito de la convocatoria, público objetivo y beneficios para los emprendedores..."
              className={`${CAMPO} resize-y`}
            />
          )}
        </Campo>

        <Campo etiqueta="Requisitos y Documentación Solicitada">
          {(props) => (
            <textarea
              {...props}
              name="requisitos_documentacion"
              rows={2}
              value={formData.requisitos_documentacion}
              onChange={handleChange}
              placeholder="Ej: Documento de identidad, propuesta de valor Canvas, pitch deck en formato PDF..."
              className={`${CAMPO} resize-y`}
            />
          )}
        </Campo>
        {/* Los criterios de evaluación ya no se piden aquí: se envía el valor que tuviera la convocatoria (o vacío) */}
      </form>
    </Modal>
  );
}

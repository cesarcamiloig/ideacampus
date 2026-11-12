import React, { useState } from "react"
import { Calendar } from "lucide-react"
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, Campo, Modal } from "../../../components/ui"


export function PeriodoFormDialog({ open, onOpenChange, onSave, initialData }) {
    const [formData, setFormData] = useState({
        year: "2026",
        semester: "1",
        name: "Ciclo 2026-I",
        startDate: "",
        endDate: "",
    })
    const [errors, setErrors] = useState({})

    React.useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    year: String(initialData.year || "2026"),
                    semester: String(initialData.semester || "1").replace("°", "").replace("º", ""),
                    name: initialData.name || "",
                    startDate: initialData.startDate || "",
                    endDate: initialData.endDate || "",
                })
            } else {
                setFormData({
                    year: "2026",
                    semester: "1",
                    name: "Ciclo 2026-I",
                    startDate: "",
                    endDate: "",
                })
            }
            setErrors({})
        }
    }, [open, initialData])

    if (!open) return null

    const handleChange = (e) => {
        const { name, value } = e.target
        const updated = { ...formData, [name]: value }

        // Auto-generar el nombre del ciclo si cambia año o semestre
        if (name === "year" || name === "semester") {
            const semRoman = (name === "semester" ? value : formData.semester) === "1" ? "I" : "II"
            const yr = name === "year" ? value : formData.year
            updated.name = `Ciclo ${yr}-${semRoman}`
        }

        setFormData(updated)
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }))
        }
    }

    const validate = () => {
        const errs = {}
        if (!formData.year || isNaN(formData.year) || formData.year < 2020) {
            errs.year = "Ingresa un año válido"
        }
        if (!formData.startDate) {
            errs.startDate = "La fecha de inicio es obligatoria"
        }
        if (!formData.endDate) {
            errs.endDate = "La fecha de cierre es obligatoria"
        }
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
            errs.endDate = "La fecha de finalización debe ser posterior a la fecha de inicio"
        }
        setErrors(errs)
        return Object.keys(errs).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!validate()) return

        onSave({
            year: parseInt(formData.year, 10),
            semester: `${formData.semester}°`,
            name: formData.name,
            startDate: formData.startDate,
            endDate: formData.endDate,
        })

        setErrors({})
        onOpenChange(false)
    }

    const handleClose = () => {
        setErrors({})
        onOpenChange(false)
    }

    return (
        <Modal
            open
            onClose={handleClose}
            icono={Calendar}
            titulo="Añadir Periodo Académico"
            subtitulo="Configuración de ciclos semestrales para apertura de convocatorias (CU-18 / RF33)."
            etiquetaCerrar="Cerrar formulario de periodo"
        >
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Año Académico" error={errors.year}>
                        {(props) => (
                            <input
                                {...props}
                                type="number"
                                name="year"
                                value={formData.year}
                                onChange={handleChange}
                                min="2024"
                                max="2035"
                                className={CAMPO}
                            />
                        )}
                    </Campo>
                    <Campo etiqueta="Semestre">
                        {(props) => (
                            <select {...props} name="semester" value={formData.semester} onChange={handleChange} className={CAMPO}>
                                <option value="1">Primer Semestre (I)</option>
                                <option value="2">Segundo Semestre (II)</option>
                            </select>
                        )}
                    </Campo>
                </div>

                <Campo etiqueta="Nombre del Ciclo">
                    {(props) => (
                        <input
                            {...props}
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Ciclo 2026-I"
                            className={CAMPO}
                        />
                    )}
                </Campo>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Fecha de Inicio" error={errors.startDate}>
                        {(props) => (
                            <input {...props} type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={CAMPO} />
                        )}
                    </Campo>
                    <Campo etiqueta="Fecha de Cierre" error={errors.endDate}>
                        {(props) => (
                            <input {...props} type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={CAMPO} />
                        )}
                    </Campo>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={handleClose} className={BOTON_SECUNDARIO}>
                        Cancelar
                    </button>
                    <button type="submit" className={BOTON_PRIMARIO}>
                        Crear Periodo
                    </button>
                </div>
            </form>
        </Modal>
    )
}
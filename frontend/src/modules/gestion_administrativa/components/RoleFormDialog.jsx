import React, { useState, useEffect } from "react"
import { X, Calendar } from "lucide-react"

export function PeriodoFormDialog({ open, onOpenChange, onSave, initialData = null }) {
    const [formData, setFormData] = useState({
        year: "2026",
        semester: "1",
        name: "Ciclo 2026-I",
        startDate: "",
        endDate: "",
    })
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (initialData) {
            setFormData({
                year: String(initialData.year),
                semester: initialData.semester.replace("°", ""),
                name: initialData.name,
                startDate: initialData.startDate,
                endDate: initialData.endDate,
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
    }, [initialData, open])

    if (!open) return null

    const handleChange = (e) => {
        const { name, value } = e.target
        const updated = { ...formData, [name]: value }

        if (!initialData && (name === "year" || name === "semester")) {
            const semRoman = (name === "semester" ? value : formData.semester) === "1" ? "I" : "II"
            const yr = name === "year" ? value : formData.year
            updated.name = `Ciclo ${yr}-${semRoman}`
        }

        setFormData(updated)
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
    }

    const validate = () => {
        const errs = {}
        if (!formData.year || isNaN(formData.year) || formData.year < 2020) {
            errs.year = "Año no válido"
        }
        if (!formData.startDate) errs.startDate = "Fecha requerida"
        if (!formData.endDate) errs.endDate = "Fecha requerida"
        if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
            errs.endDate = "El cierre debe ser posterior al inicio"
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

        onOpenChange(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                            <Calendar className="h-4 w-4" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900">
                            {initialData ? "Modificar Periodo Académico" : "Nuevo Periodo Académico"}
                        </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Parámetros temporales y ventana de recepción de iniciativas UFPS.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Año</label>
                            <input
                                type="number"
                                name="year"
                                disabled={!!initialData}
                                value={formData.year}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 disabled:bg-slate-100"
                            />
                            {errors.year && <p className="text-xs text-red-600">{errors.year}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Semestre</label>
                            <select
                                name="semester"
                                disabled={!!initialData}
                                value={formData.semester}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 bg-white disabled:bg-slate-100"
                            >
                                <option value="1">Primer Semestre (I)</option>
                                <option value="2">Segundo Semestre (II)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Nombre del Ciclo</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Fecha de Inicio</label>
                            <input
                                type="date"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                            />
                            {errors.startDate && <p className="text-xs text-red-600">{errors.startDate}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-700">Fecha de Cierre</label>
                            <input
                                type="date"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleChange}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                            />
                            {errors.endDate && <p className="text-xs text-red-600">{errors.endDate}</p>}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700"
                        >
                            {initialData ? "Actualizar Periodo" : "Crear Periodo"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
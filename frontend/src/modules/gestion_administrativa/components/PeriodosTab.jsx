import React, { useState } from "react"
import { Plus, Calendar, CheckCircle2, Clock, Edit2, AlertTriangle } from "lucide-react"
import { PeriodoFormDialog } from "./PeriodoFormDialog"

export default function PeriodosTab() {
  const [periodos, setPeriodos] = useState([
    {
      id: "PER-2026-1",
      year: 2026,
      semester: "1°",
      name: "Ciclo 2026-I",
      startDate: "2026-03-15",
      endDate: "2026-12-15",
      isActive: true,
      isCurrent: true,
    },
    {
      id: "PER-2025-2",
      year: 2025,
      semester: "2°",
      name: "Ciclo 2025-II",
      startDate: "2025-08-01",
      endDate: "2025-12-20",
      isActive: false,
      isCurrent: false,
    },
    {
      id: "PER-2025-1",
      year: 2025,
      semester: "1°",
      name: "Ciclo 2025-I",
      startDate: "2025-02-15",
      endDate: "2025-07-10",
      isActive: false,
      isCurrent: false,
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriodo, setEditingPeriodo] = useState(null)
  const [warningPeriodo, setWarningPeriodo] = useState(null)

  // Desactivación lógica con advertencia si es el vigente
  const handleToggleActive = (periodo) => {
    if (periodo.isCurrent && periodo.isActive) {
      setWarningPeriodo(periodo)
      return
    }
    setPeriodos((prev) =>
      prev.map((p) => (p.id === periodo.id ? { ...p, isActive: !p.isActive } : p))
    )
  }

  const confirmDeactivation = () => {
    if (!warningPeriodo) return
    setPeriodos((prev) =>
      prev.map((p) => (p.id === warningPeriodo.id ? { ...p, isActive: false, isCurrent: false } : p))
    )
    setWarningPeriodo(null)
  }

  // Establecer como ciclo vigente oficial (solo uno a la vez)
  const handleSetCurrent = (id) => {
    setPeriodos((prev) =>
      prev.map((p) => ({
        ...p,
        isCurrent: p.id === id,
        isActive: p.id === id ? true : p.isActive,
      }))
    )
  }

  const handleOpenCreate = () => {
    setEditingPeriodo(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (periodo) => {
    setEditingPeriodo(periodo)
    setIsDialogOpen(true)
  }

  const handleSavePeriodo = (data) => {
    if (editingPeriodo) {
      setPeriodos((prev) =>
        prev.map((p) => (p.id === editingPeriodo.id ? { ...p, ...data } : p))
      )
    } else {
      const newEntry = {
        ...data,
        id: `PER-${data.year}-${data.semester.replace("°", "")}`,
        isActive: true,
        isCurrent: false,
      }
      setPeriodos((prev) => [newEntry, ...prev])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Control de convocatorias y trazabilidad semestral de iniciativas institucionales.
        </p>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-md bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Periodo</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
            <tr>
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Año / Semestre</th>
              <th className="px-5 py-3">Nombre del Periodo</th>
              <th className="px-5 py-3">Rango de Vigencia</th>
              <th className="px-5 py-3 text-center">Estado del Ciclo</th>
              <th className="px-5 py-3 text-center">Acciones</th>
              <th className="px-5 py-3 text-center">Estado Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {periodos.map((periodo) => (
              <tr key={periodo.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-900">{periodo.id}</td>
                <td className="px-5 py-3.5 text-slate-600">
                  {periodo.year} - {periodo.semester}
                </td>
                <td className="px-5 py-3.5 font-semibold text-slate-800">
                  {periodo.name}
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {periodo.startDate} al {periodo.endDate}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {periodo.isCurrent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Vigente
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetCurrent(periodo.id)}
                      title="Marcar como ciclo oficial actual"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      Hacer Vigente
                    </button>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(periodo)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="h-3 w-3 text-slate-500" />
                    <span>Editar</span>
                  </button>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={periodo.isActive}
                      onChange={() => handleToggleActive(periodo)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full" />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PeriodoFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePeriodo}
        initialData={editingPeriodo}
      />

      {/* Alerta de confirmación de desactivación (Regla CU-18 / FE1) */}
      {warningPeriodo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-bold text-slate-900">Periodo en Curso</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              El periodo <strong className="text-slate-900">{warningPeriodo.name}</strong> está configurado como vigente. Si lo deshabilitas, ninguna convocatoria podrá recibir postulaciones activas.
            </p>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWarningPeriodo(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeactivation}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700"
              >
                Inhabilitar Ciclo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
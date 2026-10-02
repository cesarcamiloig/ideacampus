import React, { useState, useEffect } from "react"
import { Plus, Search, Edit2, Loader2, AlertCircle } from "lucide-react"
import { VariableFormDialog } from "./VariableFormDialog"
import {
  getVariables,
  createVariable,
  updateVariable,
  toggleVariableActive,
} from "../services/parametroService"

export default function CategoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  async function loadVariables() {
    setIsLoading(true)
    setErrorMessage("")
    try {
      const data = await getVariables()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      setErrorMessage(err.message || "Error al cargar las variables de caracterización.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVariables()
  }, [])


  const handleToggleActive = async (id, currentActive) => {
    try {
      const updated = await toggleVariableActive(id, !currentActive)
      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? { ...cat, isActive: updated.isActive } : cat))
      )
    } catch (err) {
      setErrorMessage(err.message || "Error al cambiar el estado de la variable.")
    }
  }

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (category) => {
    setEditingCategory(category)
    setIsDialogOpen(true)
  }

  const handleSaveCategory = async (data) => {
    try {
      if (editingCategory) {
        const updated = await updateVariable(editingCategory.id, data)
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategory.id ? updated : c))
        )
      } else {
        const created = await createVariable(data)
        setCategories((prev) => [...prev, created])
      }
      setIsDialogOpen(false)
      setEditingCategory(null)
    } catch (err) {
      setErrorMessage(err.message || "Error al guardar la variable de caracterización.")
    }
  }

  const filteredCategories = categories.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por variable o criterio..."
            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-md bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva Variable</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Nombre de Variable</th>
              <th className="px-5 py-3">Descripción</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Creación</th>
              <th className="px-5 py-3 text-center">Acciones</th>
              <th className="px-5 py-3 text-center">Estado Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    <span>Cargando variables de caracterización...</span>
                  </div>
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  No hay variables de caracterización registradas.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-slate-600 font-medium">{cat.id}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{cat.name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{cat.description || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{cat.type}</td>
                  <td className="px-5 py-3.5 text-slate-600">{cat.createdAt}</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cat)}
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
                        checked={Boolean(cat.isActive)}
                        onChange={() => handleToggleActive(cat.id, cat.isActive)}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full" />
                    </label>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VariableFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCategory}
        initialData={editingCategory}
      />
    </div>
  )
}
import React, { useState, useEffect } from "react"
import { Plus, Edit2 } from "lucide-react"
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO_SM,
  Buscador,
  ErrorGeneral,
  FilaMensaje,
  Interruptor,
  TABLA_FILA,
  TABLA_TD,
  Tabla,
} from "../../../components/ui"
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
      <ErrorGeneral mensaje={errorMessage} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Buscador
          className="w-full sm:w-80"
          valor={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar por variable o criterio…"
        />
        <button type="button" onClick={handleOpenCreate} className={BOTON_PRIMARIO}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nueva Variable
        </button>
      </div>

      <Tabla
        etiqueta="Variables de caracterización"
        columnas={[
          { id: "id", label: "ID" },
          { id: "nombre", label: "Nombre de Variable" },
          { id: "descripcion", label: "Descripción" },
          { id: "tipo", label: "Tipo" },
          { id: "creacion", label: "Creación" },
          { id: "acciones", label: "Acciones", className: "text-center" },
          { id: "estado", label: "Estado Activo", className: "text-center" },
        ]}
      >
        {isLoading ? (
          <FilaMensaje columnas={7} cargando>
            Cargando variables de caracterización...
          </FilaMensaje>
        ) : filteredCategories.length === 0 ? (
          <FilaMensaje columnas={7}>No hay variables de caracterización registradas.</FilaMensaje>
        ) : (
          filteredCategories.map((cat) => (
            <tr key={cat.id} className={TABLA_FILA}>
              <td className={`${TABLA_TD} font-medium text-slate-500`}>{cat.id}</td>
              <td className={`${TABLA_TD} font-semibold text-slate-900`}>{cat.name}</td>
              <td className={TABLA_TD}>{cat.description || "—"}</td>
              <td className={TABLA_TD}>{cat.type}</td>
              <td className={TABLA_TD}>{cat.createdAt}</td>
              <td className={`${TABLA_TD} text-center`}>
                <button type="button" onClick={() => handleOpenEdit(cat)} className={BOTON_SECUNDARIO_SM}>
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Editar
                </button>
              </td>
              <td className={`${TABLA_TD} text-center`}>
                <Interruptor
                  activo={cat.isActive}
                  onChange={() => handleToggleActive(cat.id, cat.isActive)}
                  etiqueta={`Variable ${cat.name} activa`}
                />
              </td>
            </tr>
          ))
        )}
      </Tabla>

      <VariableFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCategory}
        initialData={editingCategory}
      />
    </div>
  )
}
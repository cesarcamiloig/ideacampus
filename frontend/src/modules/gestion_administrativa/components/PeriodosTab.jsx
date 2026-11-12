import React, { useState, useEffect } from "react"
import { Plus, Calendar, CheckCircle2, Clock, Edit2 } from "lucide-react"
import {
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO_SM,
  DialogoConfirmacion,
  Distintivo,
  ErrorGeneral,
  FilaMensaje,
  Interruptor,
  TABLA_FILA,
  TABLA_TD,
  Tabla,
} from "../../../components/ui"
import { PeriodoFormDialog } from "./PeriodoFormDialog"
import {
  getPeriodos,
  createPeriodo,
  updatePeriodo,
  setPeriodoCurrent,
  togglePeriodoActive,
} from "../services/parametroService"

export default function PeriodosTab() {
  const [periodos, setPeriodos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPeriodo, setEditingPeriodo] = useState(null)
  const [warningPeriodo, setWarningPeriodo] = useState(null)

  async function loadPeriodos() {
    setIsLoading(true)
    setErrorMessage("")
    try {
      const data = await getPeriodos()
      setPeriodos(Array.isArray(data) ? data : [])
    } catch (err) {
      setErrorMessage(err.message || "Error al cargar los periodos académicos.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPeriodos()
  }, [])

  // Desactivación lógica con advertencia si es el vigente
  const handleToggleActive = (periodo) => {
    if (periodo.isCurrent && periodo.isActive) {
      setWarningPeriodo(periodo)
      return
    }
    executeToggle(periodo)
  }

  const executeToggle = async (periodo) => {
    try {
      const updated = await togglePeriodoActive(periodo.id, !periodo.isActive)
      setPeriodos((prev) =>
        prev.map((p) => (p.id === periodo.id ? { ...p, ...updated } : p))
      )
    } catch (err) {
      setErrorMessage(err.message || "Error al cambiar el estado del periodo.")
    }
  }

  const confirmDeactivation = async () => {
    if (!warningPeriodo) return
    try {
      const updated = await togglePeriodoActive(warningPeriodo.id, false)
      setPeriodos((prev) =>
        prev.map((p) =>
          p.id === warningPeriodo.id
            ? { ...p, ...updated, isActive: false, isCurrent: false }
            : p
        )
      )
    } catch (err) {
      setErrorMessage(err.message || "Error al inhabilitar el periodo.")
    } finally {
      setWarningPeriodo(null)
    }
  }

  // Establecer como ciclo vigente oficial (solo uno a la vez en BD)
  const handleSetCurrent = async (id) => {
    try {
      await setPeriodoCurrent(id)
      setPeriodos((prev) =>
        prev.map((p) => ({
          ...p,
          isCurrent: p.id === id,
          isActive: p.id === id ? true : p.isActive,
        }))
      )

    } catch (err) {
      setErrorMessage(err.message || "Error al establecer el periodo como vigente.")
    }
  }

  const handleOpenCreate = () => {
    setEditingPeriodo(null)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (periodo) => {
    setEditingPeriodo(periodo)
    setIsDialogOpen(true)
  }

  const handleSavePeriodo = async (data) => {
    try {
      if (editingPeriodo) {
        const updated = await updatePeriodo(editingPeriodo.id, data)
        setPeriodos((prev) =>
          prev.map((p) => (p.id === editingPeriodo.id ? { ...p, ...updated } : p))
        )
      } else {
        const created = await createPeriodo(data)
        setPeriodos((prev) => [created, ...prev])
      }
      setIsDialogOpen(false)
      setEditingPeriodo(null)
    } catch (err) {
      setErrorMessage(err.message || "Error al guardar el periodo académico.")
    }
  }

  return (
    <div className="space-y-4">
      <ErrorGeneral mensaje={errorMessage} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Control de convocatorias y trazabilidad semestral de iniciativas institucionales.
        </p>
        <button type="button" onClick={handleOpenCreate} className={BOTON_PRIMARIO}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo Periodo
        </button>
      </div>

      <Tabla
        etiqueta="Periodos académicos"
        columnas={[
          { id: "codigo", label: "Código" },
          { id: "anio", label: "Año / Semestre" },
          { id: "nombre", label: "Nombre del Periodo" },
          { id: "rango", label: "Rango de Vigencia" },
          { id: "ciclo", label: "Estado del Ciclo", className: "text-center" },
          { id: "acciones", label: "Acciones", className: "text-center" },
          { id: "activo", label: "Estado Activo", className: "text-center" },
        ]}
      >
        {isLoading ? (
          <FilaMensaje columnas={7} cargando>
            Cargando periodos académicos...
          </FilaMensaje>
        ) : periodos.length === 0 ? (
          <FilaMensaje columnas={7}>No hay periodos académicos registrados.</FilaMensaje>
        ) : (
          periodos.map((periodo) => (
            <tr key={periodo.id} className={TABLA_FILA}>
              <td className={`${TABLA_TD} font-medium text-slate-900`}>{periodo.id}</td>
              <td className={TABLA_TD}>
                {periodo.year} - {periodo.semester}
              </td>
              <td className={`${TABLA_TD} font-semibold text-slate-900`}>{periodo.name}</td>
              <td className={TABLA_TD}>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {periodo.startDate} al {periodo.endDate}
                </span>
              </td>
              <td className={`${TABLA_TD} text-center`}>
                {periodo.isCurrent ? (
                  <Distintivo tono="rojo" icono={CheckCircle2}>
                    Vigente
                  </Distintivo>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetCurrent(periodo.id)}
                    title="Marcar como ciclo oficial actual"
                    className={BOTON_SECUNDARIO_SM}
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Hacer Vigente
                  </button>
                )}
              </td>
              <td className={`${TABLA_TD} text-center`}>
                <button type="button" onClick={() => handleOpenEdit(periodo)} className={BOTON_SECUNDARIO_SM}>
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Editar
                </button>
              </td>
              <td className={`${TABLA_TD} text-center`}>
                <Interruptor
                  activo={periodo.isActive}
                  onChange={() => handleToggleActive(periodo)}
                  etiqueta={`Periodo ${periodo.name} activo`}
                />
              </td>
            </tr>
          ))
        )}
      </Tabla>

      <PeriodoFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSavePeriodo}
        initialData={editingPeriodo}
      />

      {/* Alerta de confirmación de desactivación (Regla CU-18 / FE1) */}
      <DialogoConfirmacion
        open={Boolean(warningPeriodo)}
        titulo="Periodo en Curso"
        textoConfirmar="Inhabilitar Ciclo"
        peligro
        onConfirmar={confirmDeactivation}
        onCancelar={() => setWarningPeriodo(null)}
      >
        {warningPeriodo && (
          <p className="text-sm leading-relaxed text-slate-700">
            El periodo <strong className="text-slate-900">{warningPeriodo.name}</strong> está configurado como vigente. Si
            lo deshabilitas, ninguna convocatoria podrá recibir postulaciones activas.
          </p>
        )}
      </DialogoConfirmacion>
    </div>
  )
}
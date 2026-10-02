import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { X } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().min(5, "Ingresa una descripción clara de la variable"),
})

export function VariableFormDialog({ open, onOpenChange, onSave, initialData }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name || "",
          description: initialData.description || "",
        })
      } else {
        reset({
          name: "",
          description: "",
        })
      }
    }
  }, [open, initialData, reset])

  if (!open) return null

  const onSubmit = (data) => {
    onSave({
      name: data.name,
      description: data.description,
    })
    reset()
    onOpenChange(false)
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      {/* Contenedor Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        
        {/* Botón de cerrar (X) */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            {initialData ? "Editar Variable de Caracterización" : "Nueva Variable de Caracterización"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {initialData ? "Modifica los datos del parámetro de caracterización." : "Registra una variable para la matriz de iniciativas (RF12 / RF33)."}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Nombre de la Variable
            </label>
            <input
              type="text"
              placeholder="Ej: Nivel de Madurez Tecnológica"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Descripción / Criterio
            </label>
            <textarea
              rows={3}
              placeholder="Explica qué evalúa o clasifica esta variable"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 resize-none"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-red-600 font-medium">{errors.description.message}</p>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors"
            >
              Guardar Parámetro
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
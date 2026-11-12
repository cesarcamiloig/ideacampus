import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, Campo, Modal } from "../../../components/ui"

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
    <Modal
      open
      onClose={handleClose}
      seccion="Administración paramétrica"
      titulo={initialData ? "Editar Variable de Caracterización" : "Nueva Variable de Caracterización"}
      subtitulo={
        initialData
          ? "Modifica los datos del parámetro de caracterización."
          : "Registra una variable para la matriz de iniciativas (RF12 / RF33)."
      }
      etiquetaCerrar="Cerrar formulario de variable"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Campo etiqueta="Nombre de la Variable" error={errors.name?.message}>
          {(props) => (
            <input {...props} type="text" placeholder="Ej: Nivel de Madurez Tecnológica" className={CAMPO} {...register("name")} />
          )}
        </Campo>
        <Campo etiqueta="Descripción / Criterio" error={errors.description?.message}>
          {(props) => (
            <textarea
              {...props}
              rows={3}
              placeholder="Explica qué evalúa o clasifica esta variable"
              className={`${CAMPO} resize-none`}
              {...register("description")}
            />
          )}
        </Campo>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleClose} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="submit" className={BOTON_PRIMARIO}>
            Guardar Parámetro
          </button>
        </div>
      </form>
    </Modal>
  )
}
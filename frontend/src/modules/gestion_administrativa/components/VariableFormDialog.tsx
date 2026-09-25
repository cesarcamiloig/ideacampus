import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CharacterizationCategory } from "../types/parameter.types"

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().min(5, "Ingresa una descripción clara de la variable"),
})

type FormValues = z.infer<typeof formSchema>

interface VariableFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (variable: Omit<CharacterizationCategory, "id">) => void
}

export function VariableFormDialog({ open, onOpenChange, onSave }: VariableFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const onSubmit = (data: FormValues) => {
    onSave({
      name: data.name,
      description: data.description,
      isActive: true,
      hasActiveInitiatives: false,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nueva Variable de Caracterización</DialogTitle>
          <DialogDescription>
            Registra una variable para la matriz de iniciativas (RF12 / RF33).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Nombre de la Variable</label>
            <Input
              placeholder="Ej: Nivel de Madurez Tecnológica"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-rose-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Descripción / Criterio</label>
            <Input
              placeholder="Explica qué evalúa o clasifica esta variable"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-rose-500">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Guardar Parámetro</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
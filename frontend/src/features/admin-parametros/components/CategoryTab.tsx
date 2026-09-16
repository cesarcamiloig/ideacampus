import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlusCircle, AlertTriangle } from "lucide-react"
import type { CharacterizationCategory } from "../types/parameter.types"

// Datos simulados de prueba basados en el modelo institucional
const initialCategories: CharacterizationCategory[] = [
  { id: "1", name: "Sector Tecnológico", description: "Clasificación de base tecnológica", isActive: true, hasActiveInitiatives: true },
  { id: "2", name: "Población Beneficiaria", description: "Impacto y comunidad objetivo", isActive: true, hasActiveInitiatives: false },
  { id: "3", name: "Enfoque de Sostenibilidad", description: "Impacto ambiental y social", isActive: false, hasActiveInitiatives: false },
]

export function CategoryTab() {
  const [categories, setCategories] = useState<CharacterizationCategory[]>(initialCategories)
  const [warningTarget, setWarningTarget] = useState<CharacterizationCategory | null>(null)

  const handleToggleRequest = (item: CharacterizationCategory) => {
    // FE1: Si está activa y tiene iniciativas asociadas, requerir advertencia previa
    if (item.isActive && item.hasActiveInitiatives) {
      setWarningTarget(item)
      return
    }
    applyToggle(item.id)
  }

  const applyToggle = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    )
    setWarningTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-slate-900">Variables de Caracterización</h3>
          <p className="text-sm text-slate-500">
            Define los criterios aplicables a las iniciativas sin romper el histórico registrado.
          </p>
        </div>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nueva Variable
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Uso en Iniciativas</TableHead>
              <TableHead className="text-center">Estado (Activo)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="text-slate-600">{cat.description}</TableCell>
                <TableCell>
                  {cat.hasActiveInitiatives ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 font-medium">
                      <AlertTriangle className="h-3 w-3" /> En uso activo
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                      Sin iniciativas
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={cat.isActive}
                    onCheckedChange={() => handleToggleRequest(cat)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Advertencia por Dependencia Activa (CU-18 FE1) */}
      <AlertDialog open={!!warningTarget} onOpenChange={() => setWarningTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Parámetro en uso
            </AlertDialogTitle>
            <AlertDialogDescription>
              La variable <strong>{warningTarget?.name}</strong> está actualmente asociada a iniciativas activas.
              Desactivarla impedirá su selección en nuevas postulaciones, pero mantendrá los datos históricos vinculados. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => warningTarget && applyToggle(warningTarget.id)}
            >
              Confirmar Desactivación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CategoryTab } from "@/features/admin-parametros/components/CategoryTab"
import { SlidersHorizontal, Calendar, Users, Tags } from "lucide-react"

export default function AdminParametersPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Encabezado Principal */}
      <div className="mb-8 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Administración Paramétrica del Sistema
            </h1>
            <p className="text-sm text-slate-500">
              Módulo de configuración institucional para periodos, variables y roles.
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de Pestañas */}
      <Tabs defaultValue="variables" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-100">
          <TabsTrigger value="variables" className="gap-2">
            <Tags className="h-4 w-4" />
            Variables
          </TabsTrigger>
          <TabsTrigger value="periodos" className="gap-2">
            <Calendar className="h-4 w-4" />
            Periodos
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Users className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="variables" className="space-y-4">
          <CategoryTab />
        </TabsContent>

        <TabsContent value="periodos" className="space-y-4">
          <div className="p-6 border rounded-md bg-white text-center text-slate-500">
            Módulo de gestión de ciclos y periodos académicos (en construcción).
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="p-6 border rounded-md bg-white text-center text-slate-500">
            Catálogo y configuración de roles institucionales (en construcción).
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
import React, { useState } from "react";
import { Plus } from "lucide-react";
import { CharacterizationCategory } from "../types/parameter.types";
import { VariableFormDialog } from "./VariableFormDialog";

export interface VariableItem {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  creacion: string;
  activo: boolean;
}

export default function CategoryTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variables, setVariables] = useState<VariableItem[]>([
    {
      id: "1001",
      nombre: "SECTOR_TECNOLOGICO",
      descripcion: "Sector de la iniciativa",
      tipo: "Texto",
      creacion: "15/05/2026",
      activo: true,
    },
    {
      id: "1002",
      nombre: "TIPO_EMPRENDIMIENTO",
      descripcion: "Clasificación de la idea",
      tipo: "Texto",
      creacion: "15/05/2026",
      activo: true,
    },
  ]);

  // Desactivación lógica según regla FA1 del CU-18 (sin borrado físico)
  const handleToggle = (id: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.id === id ? { ...v, activo: !v.activo } : v)),
    );
  };

  const handleSaveVariable = (data: Omit<CharacterizationCategory, "id">) => {
    const nuevaVar: VariableItem = {
      id: (1000 + variables.length + 1).toString(),
      nombre: data.name.toUpperCase().replace(/\s+/g, "_"),
      descripcion: data.description,
      tipo: "Texto",
      creacion: new Date().toLocaleDateString("es-ES"),
      activo: data.isActive,
    };

    setVariables((prev) => [...prev, nuevaVar]);
    setIsDialogOpen(false);
  };

  return (
    <div>
      {/* Botón superior de acción */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Nueva Variable</span>
        </button>
      </div>

      {/* Tabla de variables */}
      <div className="overflow-hidden rounded-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Nombre de Variable</th>
              <th className="px-5 py-3">Descripción</th>
              <th className="px-5 py-3">Tipo</th>
              <th className="px-5 py-3">Creación</th>
              <th className="px-5 py-3 text-center">Estado Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {variables.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-5 py-3.5 text-slate-500">{item.id}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-900">
                  {item.nombre}
                </td>
                <td className="px-5 py-3.5">{item.descripcion}</td>
                <td className="px-5 py-3.5">{item.tipo}</td>
                <td className="px-5 py-3.5 text-slate-500">{item.creacion}</td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      item.activo ? "bg-[#16a34a]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.activo ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Diálogo Modal conectado */}
      {isDialogOpen && (
        <VariableFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSave={handleSaveVariable}
        />
      )}
    </div>
  );
}

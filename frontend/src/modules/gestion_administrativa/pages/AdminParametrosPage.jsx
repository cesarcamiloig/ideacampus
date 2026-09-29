import React, { useState } from "react"
import MainLayout from "../components/layout/MainLayout"
import CategoryTab from "../components/CategoryTab"
import PeriodosTab from "../components/PeriodosTab"
import RolesTab from "../components/RolesTab"

export default function AdminParametrosPage() {
  const [activeTab, setActiveTab] = useState("variables")

  return (
    <MainLayout activeModule="parametros">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">
          Módulo de Administración Paramétrica
        </h1>

        {/* Pestañas de navegación tipo carpeta */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setActiveTab("variables")}
            className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${activeTab === "variables"
              ? "bg-white text-slate-900 border-slate-200 shadow-sm"
              : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
              }`}
          >
            Variables
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("periodos")}
            className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${activeTab === "periodos"
              ? "bg-white text-slate-900 border-slate-200 shadow-sm"
              : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
              }`}
          >
            Periodos Académicos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${activeTab === "roles"
              ? "bg-white text-slate-900 border-slate-200 shadow-sm"
              : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
              }`}
          >
            Roles
          </button>
        </div>

        {/* Contenedor blanco de la pestaña activa */}
        <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[340px]">
          {activeTab === "variables" && <CategoryTab />}
          {activeTab === "periodos" && <PeriodosTab />}
          {activeTab === "roles" && <RolesTab />}
        </div>

        {/* Tarjeta inferior: Ciclos Académicos Activos */}
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Ciclos Académicos Activos
            </h3>

            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-2 rounded-l">Año</th>
                  <th className="px-4 py-2">Semestre</th>
                  <th className="px-4 py-2 rounded-r" colSpan={2}>
                    Nombre del Ciclo
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-700 font-medium">
                <tr>
                  <td className="px-4 py-3">2026</td>
                  <td className="px-4 py-3">1º</td>
                  <td className="px-4 py-3">Ciclo 2026-I</td>
                  <td className="px-4 py-3 text-slate-500">
                    15-Mar a 15-Dic-2026
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
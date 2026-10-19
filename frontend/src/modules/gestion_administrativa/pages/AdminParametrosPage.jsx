import React, { useState, useEffect } from "react"
import MainLayout from "../components/layout/MainLayout"
import CategoryTab from "../components/CategoryTab"
import PeriodosTab from "../components/PeriodosTab"
import RolesTab from "../components/RolesTab"
import { getPeriodos } from "../services/parametroService"
import RubricasTab from "../../gestion_evaluacion/components/RubricasTab"

const TABS = [
  { id: "variables", label: "Variables" },
  { id: "periodos", label: "Periodos Académicos" },
  { id: "roles", label: "Roles" },
  { id: "rubricas", label: "Rúbricas" },
]

export default function AdminParametrosPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("variables")
  const [activePeriodos, setActivePeriodos] = useState([])

  useEffect(() => {
    async function fetchActivePeriodos() {
      try {
        const data = await getPeriodos()
        if (Array.isArray(data)) {
          setActivePeriodos(data.filter((p) => p.isActive))
        }
      } catch {
        // Silencioso si falla la carga inicial
      }
    }
    fetchActivePeriodos()
  }, [activeTab])

  return (
    <MainLayout
      activeModule="parametros"
      onNavigate={onNavigate}
      onRoleChange={() => {
        if (onNavigate) onNavigate(null);
      }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-6 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Módulo de Administración Paramétrica
        </h1>

        {/* Pestañas de navegación tipo carpeta (se deslizan horizontalmente en pantallas pequeñas) */}
        <div className="flex items-end overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 shrink-0 whitespace-nowrap rounded-t-xl px-5 py-3 text-center text-sm font-semibold transition-colors border-t border-x sm:flex-none sm:w-44 lg:w-52 ${activeTab === tab.id
                ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenedor blanco de la pestaña activa */}
        <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm min-h-[340px]">
          {activeTab === "variables" && <CategoryTab />}
          {activeTab === "periodos" && <PeriodosTab />}
          {activeTab === "roles" && <RolesTab />}
          {activeTab === "rubricas" && <RubricasTab />}
        </div>

        {/* Tarjeta inferior: Ciclos Académicos Activos */}
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Ciclos Académicos Activos
            </h3>

            <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-left text-xs">
              <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
                <tr>
                  <th className="px-4 py-2 rounded-l">Año</th>
                  <th className="px-4 py-2">Semestre</th>
                  <th className="px-4 py-2">Nombre del Ciclo</th>
                  <th className="px-4 py-2 rounded-r">Vigencia</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 font-medium">
                {activePeriodos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-center text-slate-400">
                      No hay ciclos activos registrados actualmente.
                    </td>
                  </tr>
                ) : (
                  activePeriodos.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">{p.year}</td>
                      <td className="px-4 py-3">{p.semester}</td>
                      <td className="px-4 py-3 font-semibold">
                        {p.name}
                        {p.isCurrent && (
                          <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            Vigente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.startDate} a {p.endDate}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
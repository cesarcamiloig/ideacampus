import React, { useState, useEffect } from "react"
import MainLayout from "../components/layout/MainLayout"
import CategoryTab from "../components/CategoryTab"
import PeriodosTab from "../components/PeriodosTab"
import RolesTab from "../components/RolesTab"
import { getPeriodos } from "../services/parametroService"

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
    <MainLayout activeModule="parametros" onNavigate={onNavigate}>
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
    </MainLayout>
  )
}
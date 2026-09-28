import React, { useState } from "react"
import { FileText, Lightbulb, Settings, ChevronDown } from "lucide-react"
import CategoryTab from "../components/CategoryTab"

export default function AdminParametrosPage() {
  const [activeTab, setActiveTab] = useState("variables")

  return (
    <div className="flex h-screen w-full bg-[#f4f5f7] font-sans text-slate-800 antialiased">
      {/* 1. SIDEBAR IZQUIERDO */}
      <aside className="relative flex w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm">
        <div>
          {/* Logo UFPS y Marca GENNOVA */}
          <div className="flex items-center gap-3 px-6 py-6">
            <img
              src="/ufps-logo.png"
              alt="Logo UFPS"
              className="h-10 w-10 object-contain"
            />
            <span className="text-2xl font-semibold tracking-tight text-black">
              GENNOVA
            </span>
          </div>

          {/* Menú de navegación */}
          <nav className="mt-4 flex flex-col space-y-1">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FileText className="h-5 w-5 text-slate-400" />
              <span>Convocatorias</span>
            </button>

            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Lightbulb className="h-5 w-5 text-slate-400" />
              <span>Emprendimientos</span>
            </button>

            {/* Ítem Activo con franja roja */}
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 rounded-r" />
              <button
                type="button"
                className="flex w-full items-center gap-3 bg-red-50/40 px-6 py-3.5 text-left text-sm font-semibold text-slate-900"
              >
                <Settings className="h-5 w-5 text-red-600" />
                <span className="leading-tight">
                  Administración
                  <br />
                  Paramétrica
                </span>
              </button>
            </div>
          </nav>
        </div>

        {/* Footer del Sidebar */}
        <div className="px-6 py-6 text-[11px] text-slate-600">
          <div className="flex items-center gap-2">
            <img
              src="/ufps-logo.png"
              alt="Escudo UFPS"
              className="h-7 w-7 object-contain"
            />
            <p className="font-semibold leading-tight text-slate-800">
              Universidad Francisco
              <br />
              de Paula Santander
            </p>
          </div>
        </div>
      </aside>

      {/* 2. ÁREA DE CONTENIDO */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar superior */}
        <header className="relative flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />

          <span className="text-sm font-medium text-slate-700">
            Programa de Ingeniería de Sistemas
          </span>

          <div className="flex items-center gap-3 cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
              AD
            </div>
            <span className="text-sm font-medium text-slate-800">
              Administrador del sistema
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </header>

        {/* Cuerpo principal */}
        <main className="flex-1 overflow-y-auto p-10 flex flex-col justify-between">
          <div className="mx-auto w-full max-w-5xl">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">
              Módulo de Administración Paramétrica
            </h1>

            {/* Pestañas de navegación tipo carpeta */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setActiveTab("variables")}
                className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${
                  activeTab === "variables"
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
                }`}
              >
                Variables
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("periodos")}
                className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${
                  activeTab === "periodos"
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
                }`}
              >
                Periodos Académicos
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("roles")}
                className={`w-52 rounded-t-xl py-3 text-center text-sm font-semibold transition-colors border-t border-x ${
                  activeTab === "roles"
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-[#eef0f3] text-slate-600 border-slate-200/80 hover:bg-slate-200/70"
                }`}
              >
                Roles
              </button>
            </div>

            {/* Contenedor blanco de la pestaña activa */}
            <div className="rounded-b-2xl rounded-tr-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[300px]">
              {activeTab === "variables" && <CategoryTab />}

              {activeTab === "periodos" && (
                <div className="py-12 text-center text-sm text-slate-500">
                  Gestión de Periodos Académicos (Ciclos de postulación y fechas límite).
                </div>
              )}

              {activeTab === "roles" && (
                <div className="py-12 text-center text-sm text-slate-500">
                  Matriz de Roles y Permisos Institucionales.
                </div>
              )}
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
        </main>
      </div>
    </div>
  )
}
import React, { useState, useEffect } from "react"
import MainLayout from "../components/layout/MainLayout"
import CategoryTab from "../components/CategoryTab"
import PeriodosTab from "../components/PeriodosTab"
import RolesTab from "../components/RolesTab"
import { getPeriodos } from "../services/parametroService"
import RubricasTab from "../../gestion_evaluacion/components/RubricasTab"
import BienvenidaBanner from "../components/BienvenidaBanner"
import { ROLE_CONFIG } from "./RoleDashboardPage"
import { useAuth } from "../../../context/AuthContext"
import {
  Distintivo,
  EncabezadoPagina,
  FilaMensaje,
  Pagina,
  Pestanas,
  TABLA_FILA,
  TABLA_TD,
  TARJETA,
  Tabla,
} from "../../../components/ui"

const TABS = [
  { id: "variables", label: "Variables" },
  { id: "periodos", label: "Periodos Académicos" },
  { id: "roles", label: "Roles" },
  { id: "rubricas", label: "Rúbricas" },
]

export default function AdminParametrosPage({ onNavigate, mostrarBienvenida = false }) {
  const { usuario } = useAuth()
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
      <Pagina ancho="max-w-6xl">
        {/* El admin entra a esta página al iniciar sesión */}
        {mostrarBienvenida && <BienvenidaBanner roleConfig={ROLE_CONFIG.admin} usuario={usuario} />}

        <EncabezadoPagina
          seccion="Administración del sistema"
          titulo="Módulo de Administración Paramétrica"
          descripcion="Variables de caracterización, periodos académicos, roles y rúbricas de evaluación."
        />

        <section className={`${TARJETA} overflow-hidden`}>
          <div className="overflow-x-auto border-b border-slate-200 bg-superficie-alta px-4 py-3 sm:px-6">
            <Pestanas
              etiqueta="Secciones de administración"
              opciones={TABS}
              valor={activeTab}
              onChange={setActiveTab}
              className="flex-nowrap"
            />
          </div>
          <div className="min-h-[340px] p-4 sm:p-6">
            {activeTab === "variables" && <CategoryTab />}
            {activeTab === "periodos" && <PeriodosTab />}
            {activeTab === "roles" && <RolesTab />}
            {activeTab === "rubricas" && <RubricasTab />}
          </div>
        </section>

        {/* Ciclos académicos activos */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ciclos Académicos Activos</h2>
          <Tabla
            etiqueta="Ciclos académicos activos"
            columnas={[
              { id: "anio", label: "Año" },
              { id: "semestre", label: "Semestre" },
              { id: "nombre", label: "Nombre del Ciclo" },
              { id: "vigencia", label: "Vigencia" },
            ]}
          >
            {activePeriodos.length === 0 ? (
              <FilaMensaje columnas={4}>No hay ciclos activos registrados actualmente.</FilaMensaje>
            ) : (
              activePeriodos.map((p) => (
                <tr key={p.id} className={TABLA_FILA}>
                  <td className={TABLA_TD}>{p.year}</td>
                  <td className={TABLA_TD}>{p.semester}</td>
                  <td className={`${TABLA_TD} font-semibold text-slate-900`}>
                    <span className="inline-flex items-center gap-2">
                      {p.name}
                      {p.isCurrent && <Distintivo tono="rojo">Vigente</Distintivo>}
                    </span>
                  </td>
                  <td className={`${TABLA_TD} text-slate-500`}>
                    {p.startDate} a {p.endDate}
                  </td>
                </tr>
              ))
            )}
          </Tabla>
        </section>
      </Pagina>
    </MainLayout>
  )
}

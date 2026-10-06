import React, { useState } from "react"
import {
    FileText,
    Lightbulb,
    Settings,
    ChevronDown,
    LogOut,
    Users,
    ClipboardCheck,
    BookOpen,
    Award,
} from "lucide-react"
import { useAuth } from "../../../../context/AuthContext"

const ROLE_LABELS = {
    admin: "Administrador del Sistema",
    coordinador: "Coordinador de Emprendimiento",
    tutor: "Tutor Académico",
    mentor: "Mentor Especializado",
    evaluador: "Evaluador de Iniciativas",
    estudiante: "Estudiante Emprendedor",
    direccion_del_programa: "Dirección de Programa",
    direccion: "Dirección de Programa",
}

export default function MainLayout({
    children,
    activeModule = "parametros",
    onModuleChange,
    onNavigate,
    activeRole: propActiveRole,
    onRoleChange,
}) {
    // Estado del menú desplegable de perfil
    const [profileMenuOpen, setProfileMenuOpen] = useState(false)

    // Conexión a la sesión real del usuario autenticado
    const { usuario, rolActivo, logout } = useAuth()
    const [activeRole, setActiveRole] = useState(propActiveRole || rolActivo || "admin")

    React.useEffect(() => {
        if (propActiveRole) {
            setActiveRole(propActiveRole)
        } else if (rolActivo) {
            setActiveRole(rolActivo)
        }
    }, [propActiveRole, rolActivo])

    const userName = usuario?.nombre || "Usuario Institucional"
    const userEmail = usuario?.correo || ""
    const initials =
        userName
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "UI"


    // Menús de navegación según el rol seleccionado en la cabecera
    const menuConfigByRole = {
        admin: [
            { id: "convocatorias", label: "Convocatorias", icon: FileText },
            { id: "emprendimientos", label: "Emprendimientos", icon: Lightbulb },
            { id: "parametros", label: "Administración Paramétrica", icon: Settings },
        ],
        tutor: [
            { id: "tutorias", label: "Mis Iniciativas Asignadas", icon: BookOpen },
            { id: "acompanamiento", label: "Registro de Tutorías", icon: Users },
            { id: "perfil", label: "Mi Perfil Académico", icon: Award },
        ],
        mentor: [
            { id: "mentorias", label: "Mentorías Asignadas", icon: BookOpen },
            { id: "acompanamiento", label: "Sesiones de Asesoría", icon: Users },
            { id: "perfil", label: "Mi Perfil Profesional", icon: Award },
        ],
        evaluador: [
            { id: "evaluaciones", label: "Iniciativas por Evaluar", icon: ClipboardCheck },
            { id: "rubricas", label: "Historial de Calificaciones", icon: Award },
        ],
        coordinador: [
            { id: "convocatorias", label: "Gestión de Convocatorias", icon: FileText },
            { id: "emprendimientos", label: "Banco de Emprendimientos", icon: Lightbulb },
            { id: "reportes", label: "Métricas e Impacto", icon: Award },
        ],
        estudiante: [
            { id: "mi-iniciativa", label: "Mi Emprendimiento", icon: Lightbulb },
            { id: "postulaciones", label: "Convocatorias Abiertas", icon: FileText },
        ],
        direccion_del_programa: [
            { id: "dashboard", label: "Panel de Dirección", icon: Award },
            { id: "iniciativas", label: "Banco de Iniciativas", icon: Lightbulb },
            { id: "indicadores", label: "Métricas e Indicadores", icon: FileText },
        ],
        direccion: [
            { id: "dashboard", label: "Panel de Dirección", icon: Award },
            { id: "iniciativas", label: "Banco de Iniciativas", icon: Lightbulb },
            { id: "indicadores", label: "Métricas e Indicadores", icon: FileText },
        ],
    }

    const currentMenuItems = menuConfigByRole[activeRole] || menuConfigByRole.admin


    const activeRoleLabel = ROLE_LABELS[activeRole] || activeRole.replace(/_/g, " ").toUpperCase()

    return (
        <div className="flex h-screen w-full bg-[#f4f5f7] font-sans text-slate-800 antialiased">
            {/* 1. SIDEBAR IZQUIERDO INSTITUCIONAL */}
            <aside className="relative flex w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm shrink-0">
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

                    {/* Menú de navegación dinámico según el rol activo */}
                    <nav className="mt-2 flex flex-col space-y-1">
                        {currentMenuItems.map((item) => {
                            const Icon = item.icon
                            const isActive = item.id === activeModule

                            return (
                                <div key={item.id} className="relative flex items-center">
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600 rounded-r" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onModuleChange) {
                                                onModuleChange(item.id)
                                            }
                                            if (onNavigate) {
                                                onNavigate(item.id)
                                            }
                                        }}
                                        className={`flex w-full items-center gap-3 px-6 py-3.5 text-left text-sm transition-colors ${isActive
                                            ? "bg-red-50/40 font-semibold text-slate-900"
                                            : "font-medium text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        <Icon
                                            className={`h-5 w-5 ${isActive ? "text-red-600" : "text-slate-400"
                                                }`}
                                        />
                                        <span className="leading-tight">{item.label}</span>
                                    </button>
                                </div>
                            )
                        })}
                    </nav>
                </div>

                {/* Footer del Sidebar: Identidad UFPS */}
                <div className="px-6 py-6 text-[11px] text-slate-600 border-t border-slate-100">
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
                <header className="relative flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-8 shrink-0">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />

                    <span className="text-sm font-medium text-slate-700">
                        Programa de Ingeniería de Sistemas
                    </span>

                    {/* Menú de Perfil y Conmutador de Roles */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                            className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-slate-50 transition-colors select-none focus:outline-none"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-200 text-xs font-bold text-slate-600">
                                {initials}
                            </div>
                            <div className="text-left hidden sm:block">
                                <span className="block text-xs font-bold text-slate-800 leading-tight">
                                    {activeRoleLabel}
                                </span>
                                <span className="block text-[10px] text-slate-500">
                                    {userName}
                                </span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                        </button>

                        {/* Dropdown contextual */}
                        {profileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-200 bg-white shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-4 py-2.5 border-b border-slate-100">
                                    <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileMenuOpen(false)
                                        if (logout) {
                                            logout()
                                        }
                                    }}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <LogOut className="h-4 w-4" />
                                    <span>Cerrar Sesión</span>
                                </button>
                            </div>
                        )}

                    </div>
                </header>

                {/* 3. CONTENEDOR PRINCIPAL DINÁMICO */}
                <main className="flex-1 overflow-y-auto p-10 flex flex-col justify-between">
                    {children}
                </main>
            </div>
        </div>
    )
}
import React, { useState, useEffect, useCallback } from "react"
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
    Bell,
    Check,
} from "lucide-react"
import { useAuth } from "../../../../context/AuthContext"
import { NotificacionesModal } from "../../../gestion_convocatorias/components/NotificacionesModal"
import { getResumenNotificaciones } from "../../../gestion_convocatorias/services/convocatoriaService"
import { getResumenAlertas } from "../../../gestion_convocatorias/services/alertaService"

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
    const { usuario, rolActivo, logout, switchRole, rolesAsignados } = useAuth()
    const [activeRole, setActiveRole] = useState(propActiveRole || rolActivo || "admin")

    React.useEffect(() => {
        if (propActiveRole) {
            setActiveRole(propActiveRole)
        } else if (rolActivo) {
            setActiveRole(rolActivo)
        }
    }, [propActiveRole, rolActivo])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest("#header-profile-menu")) {
                setProfileMenuOpen(false)
            }
        }
        document.addEventListener("click", handleClickOutside)
        return () => document.removeEventListener("click", handleClickOutside)
    }, [])

    // Gestión de notificaciones institucionales
    const [notificacionesOpen, setNotificacionesOpen] = useState(false)
    const [unreadNotifCount, setUnreadNotifCount] = useState(0)

    const fetchResumenNotificaciones = useCallback(async () => {
        try {
            const [notifData, alertaData] = await Promise.all([
                getResumenNotificaciones().catch(() => null),
                getResumenAlertas(activeRole).catch(() => null),
            ]);
            const notifUnread = (notifData && typeof notifData.no_leidas === "number") ? notifData.no_leidas : 0;
            const alertaUnread = (alertaData && typeof alertaData.no_leidas === "number") ? alertaData.no_leidas : 0;
            setUnreadNotifCount(notifUnread + alertaUnread);
        } catch {
            // Silencioso
        }
    }, [activeRole])

    useEffect(() => {
        if (usuario) {
            fetchResumenNotificaciones()
            const timer = setInterval(fetchResumenNotificaciones, 45000)
            return () => clearInterval(timer)
        }
    }, [usuario, fetchResumenNotificaciones])

    const userName = (typeof usuario?.nombre === "string" && usuario.nombre) || "Usuario Institucional"
    const userEmail = (typeof usuario?.correo === "string" && usuario.correo) || ""
    const initials =
        (typeof userName === "string" ? userName : "UI")
            .split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "UI"


    // Menús de navegación según el rol seleccionado en la cabecera (HU-12 Centro de Alertas)
    const menuConfigByRole = {
        admin: [
            { id: "convocatorias", label: "Convocatorias", icon: FileText },
            { id: "emprendimientos", label: "Emprendimientos", icon: Lightbulb },
            { id: "parametros", label: "Administración Paramétrica", icon: Settings },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        tutor: [
            { id: "tutorias", label: "Mis Iniciativas Asignadas", icon: BookOpen },
            { id: "acompanamiento", label: "Registro de Tutorías", icon: Users },
            { id: "perfil", label: "Mi Perfil Académico", icon: Award },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        mentor: [
            { id: "mentorias", label: "Mentorías Asignadas", icon: BookOpen },
            { id: "acompanamiento", label: "Sesiones de Asesoría", icon: Users },
            { id: "perfil", label: "Mi Perfil Profesional", icon: Award },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        evaluador: [
            { id: "evaluaciones", label: "Iniciativas por Evaluar", icon: ClipboardCheck },
            { id: "rubricas", label: "Historial de Calificaciones", icon: Award },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        coordinador: [
            { id: "convocatorias", label: "Gestión de Convocatorias", icon: FileText },
            { id: "emprendimientos", label: "Banco de Emprendimientos", icon: Lightbulb },
            { id: "reportes", label: "Métricas e Impacto", icon: Award },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        estudiante: [
            { id: "equipo", label: "Equipo Emprendedor", icon: Users },
            { id: "postulaciones", label: "Convocatorias Abiertas", icon: FileText },
            { id: "mi-iniciativa", label: "Mis Iniciativas", icon: Lightbulb },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        direccion_del_programa: [
            { id: "dashboard", label: "Panel de Dirección", icon: Award },
            { id: "convocatorias", label: "Gestión de Convocatorias", icon: FileText },
            { id: "iniciativas", label: "Banco de Iniciativas", icon: Lightbulb },
            { id: "indicadores", label: "Métricas e Indicadores", icon: FileText },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
        direccion: [
            { id: "dashboard", label: "Panel de Dirección", icon: Award },
            { id: "convocatorias", label: "Gestión de Convocatorias", icon: FileText },
            { id: "iniciativas", label: "Banco de Iniciativas", icon: Lightbulb },
            { id: "indicadores", label: "Métricas e Indicadores", icon: FileText },
            { id: "alertas", label: "Centro de Alertas", icon: Bell },
        ],
    }

    const allKnownRoles = [
        "estudiante",
        "tutor",
        "mentor",
        "evaluador",
        "coordinador",
        "admin",
        "direccion_del_programa",
    ]

    const rawRoles =
        Array.isArray(rolesAsignados) && rolesAsignados.length > 1
            ? rolesAsignados
            : Array.from(new Set([...(Array.isArray(rolesAsignados) ? rolesAsignados : []), rolActivo || "estudiante", ...allKnownRoles]))

    const assignedRoles = rawRoles
        .filter(Boolean)
        .map((r) => {
            const rId = typeof r === "string" ? r : (r?.nombre_rol || r?.rol || r?.id || String(r));
            const label = ROLE_LABELS[rId] || (typeof rId === "string" ? rId.replace(/_/g, " ").toUpperCase() : String(rId));
            return {
                id: rId,
                label,
            };
        });

    const handleRoleSwitch = (roleId) => {
        setActiveRole(roleId)
        setProfileMenuOpen(false)
        if (onRoleChange) {
            onRoleChange(roleId)
        }
        if (onNavigate) {
            onNavigate(null)
        }
        if (switchRole) {
            switchRole(roleId)
        }
    }

    const activeRoleLabel = ROLE_LABELS[activeRole] || (typeof activeRole === "string" ? activeRole.replace(/_/g, " ").toUpperCase() : "ROL")

    const currentMenuItems = menuConfigByRole[activeRole] || menuConfigByRole.admin || []

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

                    {/* Zona derecha: Notificaciones y Perfil */}
                    <div className="flex items-center gap-3">
                        {/* Campana de Notificaciones Institucionales */}
                        <button
                            type="button"
                            onClick={() => setNotificacionesOpen(true)}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50/50 hover:text-red-600 transition-all focus:outline-none shadow-sm"
                            title="Notificaciones institucionales"
                            aria-label="Notificaciones institucionales"
                        >
                            <Bell className="h-4 w-4" />
                            {unreadNotifCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
                                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                                </span>
                            )}
                        </button>

                        {/* Menú de Perfil y Conmutador de Roles */}
                        <div id="header-profile-menu" className="relative">
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
                                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2 border-b border-slate-100">
                                        <p className="text-xs font-bold text-slate-900 truncate">{userName}</p>
                                        <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                                    </div>

                                    <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Cambiar Vista de Rol
                                    </div>

                                    <div className="space-y-0.5 max-h-60 overflow-y-auto">
                                        {assignedRoles.map((role) => {
                                            const isSelected = activeRole === role.id
                                            return (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => handleRoleSwitch(role.id)}
                                                    className={`w-full flex items-center justify-between px-4 py-2 text-xs text-left transition-colors ${
                                                        isSelected
                                                            ? "bg-red-50 text-red-700 font-semibold"
                                                            : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                                >
                                                    <span>{role.label}</span>
                                                    {isSelected && <Check className="h-3.5 w-3.5 text-red-600 shrink-0" />}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="my-1.5 border-t border-slate-100" />

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProfileMenuOpen(false)
                                            if (logout) {
                                                logout()
                                            }
                                        }}
                                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        <span>Cerrar Sesión</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* 3. CONTENEDOR PRINCIPAL DINÁMICO */}
                <main className="flex-1 overflow-y-auto p-10 flex flex-col justify-between">
                    {children}
                </main>
            </div>

            {/* Modal de Notificaciones Institucionales */}
            <NotificacionesModal
                open={notificacionesOpen}
                onOpenChange={setNotificacionesOpen}
                onNotificationRead={fetchResumenNotificaciones}
                onNavigate={(mod) => {
                    if (onModuleChange) onModuleChange(mod);
                    if (onNavigate) onNavigate(mod);
                }}
            />
        </div>
    )
}
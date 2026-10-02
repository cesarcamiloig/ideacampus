import React, { useState, useEffect } from "react"
import { Shield, Search, Mail, Check, AlertCircle, Lock, Loader2, RefreshCw } from "lucide-react"
import {
    getRolesCatalogo,
    getUsuarios,
    updateUsuarioRoles,
    toggleUsuarioActive,
} from "../services/parametroService"

const ROLE_COLORS = {
    admin: "bg-red-50 text-red-700 border-red-200",
    coordinador: "bg-purple-50 text-purple-700 border-purple-200",
    tutor: "bg-blue-50 text-blue-700 border-blue-200",
    mentor: "bg-amber-50 text-amber-700 border-amber-200",
    evaluador: "bg-teal-50 text-teal-700 border-teal-200",
    estudiante: "bg-emerald-50 text-emerald-700 border-emerald-200",
    direccion_del_programa: "bg-slate-100 text-slate-700 border-slate-300",
    direccion: "bg-slate-100 text-slate-700 border-slate-300",
}

export default function RolesTab() {
    const [viewMode, setViewMode] = useState("usuarios") // "usuarios" | "catalogo"
    const [searchTerm, setSearchTerm] = useState("")

    const [rolesCatalog, setRolesCatalog] = useState([])
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState("")

    const [selectedUser, setSelectedUser] = useState(null)
    const [selectedRoles, setSelectedRoles] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalError, setModalError] = useState("")
    const [isSaving, setIsSaving] = useState(false)

    async function loadData() {
        setIsLoading(true)
        setErrorMessage("")
        try {
            const [rolesRes, usersRes] = await Promise.all([
                getRolesCatalogo(),
                getUsuarios(),
            ])
            setRolesCatalog(Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || [])
            setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || [])
        } catch (err) {
            setErrorMessage(err.message || "Error al cargar la información de roles y usuarios.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    // Desactivación lógica según CU-18 / FA1
    const handleToggleUserActive = async (user) => {
        const nextActive = !user.isActive
        try {
            await toggleUsuarioActive(user.id_usuario, nextActive)
            setUsers((prev) =>
                prev.map((u) =>
                    u.id_usuario === user.id_usuario ? { ...u, isActive: nextActive } : u
                )
            )
        } catch (err) {
            setErrorMessage(err.message || "No se pudo actualizar el estado del usuario.")
        }
    }

    const handleOpenAssignModal = (user) => {
        setSelectedUser(user)
        // Se cargan los roles actuales excluyendo "admin"
        setSelectedRoles([...(user.roles || []).filter((r) => r !== "admin")])
        setModalError("")
        setIsModalOpen(true)
    }

    // Permite activar/desactivar múltiples roles funcionales
    const handleToggleRole = (roleId) => {
        setModalError("")
        setSelectedRoles((prev) =>
            prev.includes(roleId)
                ? prev.filter((id) => id !== roleId)
                : [...prev, roleId]
        )
    }

    const handleSaveRoles = async () => {
        if (selectedRoles.length === 0) {
            setModalError("Debes asignar al menos un rol funcional al usuario.")
            return
        }

        setIsSaving(true)
        setModalError("")
        try {
            const updated = await updateUsuarioRoles(selectedUser.id_usuario, selectedRoles)
            setUsers((prev) =>
                prev.map((u) =>
                    u.id_usuario === selectedUser.id_usuario ? (updated?.data || updated) : u
                )
            )
            // Actualizar catálogo de roles con el nuevo conteo
            const rolesRes = await getRolesCatalogo()
            setRolesCatalog(Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || [])

            setIsModalOpen(false)
            setSelectedUser(null)
        } catch (err) {
            const msg =
                err.response?.data?.roles?.[0] ||
                err.response?.data?.error ||
                err.message ||
                "Error al guardar los roles del usuario."
            setModalError(msg)
        } finally {
            setIsSaving(false)
        }
    }

    const filteredUsers = users.filter((u) => {
        const q = searchTerm.toLowerCase()
        return (
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.id && u.id.toLowerCase().includes(q))
        )
    })

    return (
        <div className="space-y-4">
            {/* Mensaje de error general si ocurre */}
            {errorMessage && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                        <RefreshCw className="h-3 w-3" /> Reintentar
                    </button>
                </div>
            )}

            {/* Selector de subvista y buscador */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex rounded-lg border border-slate-200 bg-[#f0f2f5] p-1">
                    <button
                        type="button"
                        onClick={() => setViewMode("usuarios")}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${viewMode === "usuarios"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Asignación de Roles a Usuarios
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("catalogo")}
                        className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${viewMode === "catalogo"
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                    >
                        Catálogo de Roles del Sistema
                    </button>
                </div>

                {viewMode === "usuarios" && (
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por usuario o correo UFPS..."
                            className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                        />
                    </div>
                )}
            </div>

            {/* Estado de carga */}
            {isLoading ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin text-red-600" />
                    <span className="text-xs">Cargando roles y usuarios institucionales...</span>
                </div>
            ) : viewMode === "usuarios" ? (
                /* VISTA 1: TABLA DE USUARIOS Y ROLES MÚLTIPLES */
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
                            <tr>
                                <th className="px-5 py-3">Usuario Institucional</th>
                                <th className="px-5 py-3">Correo Institucional</th>
                                <th className="px-5 py-3">Roles Asignados (RBAC)</th>
                                <th className="px-5 py-3 text-center">Acciones</th>
                                <th className="px-5 py-3 text-center">Estado Activo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                                        No se encontraron usuarios institucionales registrados.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id_usuario || user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="font-semibold text-slate-900">{user.name}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">{user.id}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {!user.roles || user.roles.length === 0 ? (
                                                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                                                        Sin Rol Asignado
                                                    </span>
                                                ) : (
                                                    user.roles.map((rId) => {
                                                        const rData = rolesCatalog.find((r) => r.id === rId)
                                                        const badgeColor = ROLE_COLORS[rId] || "bg-slate-100 text-slate-700 border-slate-200"
                                                        return (
                                                            <span
                                                                key={rId}
                                                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${badgeColor}`}
                                                            >
                                                                {rData ? rData.name : rId}
                                                            </span>
                                                        )
                                                    })
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAssignModal(user)}
                                                className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                Gestionar Roles
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            <label className="relative inline-flex cursor-pointer items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={user.isActive}
                                                    onChange={() => handleToggleUserActive(user)}
                                                    className="peer sr-only"
                                                />
                                                <div className="peer h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full" />
                                            </label>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* VISTA 2: CATÁLOGO DE ROLES DEL SISTEMA */
                <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-[#f0f2f5] text-slate-700 font-semibold">
                            <tr>
                                <th className="px-5 py-3">Código</th>
                                <th className="px-5 py-3">Nombre del Rol</th>
                                <th className="px-5 py-3">Descripción de Alcance</th>
                                <th className="px-5 py-3 text-center">Tipo de Asignación</th>
                                <th className="px-5 py-3 text-center">Usuarios Asignados</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {rolesCatalog.map((role, idx) => {
                                const count =
                                    role.usersCount !== undefined
                                        ? role.usersCount
                                        : users.filter((u) => u.roles?.includes(role.id)).length
                                return (
                                    <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3.5 font-medium text-slate-900">
                                            ROL-0{idx + 1}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{role.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600 max-w-xs leading-relaxed">
                                            {role.description}
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {role.isAssignable ? (
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                                    Delegable por Admin
                                                </span>
                                            ) : (
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                                                    Reservado de Sistema
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-center font-semibold text-slate-700">
                                            {count}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL CON SELECCIÓN MÚLTIPLE Y ROL DE ADMINISTRADOR BLOQUEADO */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="mb-4">
                            <h2 className="text-base font-bold text-slate-900">
                                Asignación de Roles Funcionales
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Usuario: <span className="font-semibold text-slate-700">{selectedUser.name}</span> ({selectedUser.email})
                            </p>
                        </div>

                        {/* Aviso de seguridad sobre el rol de Administrador */}
                        <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                            <Lock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                                Por directriz de seguridad institucional, el rol de <strong>Administrador</strong> está reservado a nivel de sistema y no puede ser asignado desde este panel.
                            </span>
                        </div>

                        <div className="space-y-2 py-1">
                            <label className="text-xs font-semibold text-slate-700">
                                Selecciona uno o más roles aplicables:
                            </label>

                            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {rolesCatalog
                                    .filter((r) => r.isAssignable && r.id !== "admin") // Excluye estrictamente el rol de Administrador
                                    .map((r) => {
                                        const isChecked = selectedRoles.includes(r.id)
                                        return (
                                            <div
                                                key={r.id}
                                                onClick={() => handleToggleRole(r.id)}
                                                className={`flex items-start justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors ${isChecked
                                                        ? "border-red-600 bg-red-50/30 text-slate-900"
                                                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => { }} // Manejado por el onClick del contenedor
                                                        className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-slate-800">{r.name}</div>
                                                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                                            {r.description}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isChecked && (
                                                    <Check className="h-4 w-4 text-red-600 shrink-0 ml-2 mt-0.5" />
                                                )}
                                            </div>
                                        )
                                    })}
                            </div>

                            {modalError && (
                                <div className="flex items-center gap-1.5 pt-2 text-xs text-red-600 font-medium">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                    <span>{modalError}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => {
                                    setIsModalOpen(false)
                                    setSelectedUser(null)
                                }}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={handleSaveRoles}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#c81e1e] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                <span>{isSaving ? "Guardando..." : "Guardar Roles"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
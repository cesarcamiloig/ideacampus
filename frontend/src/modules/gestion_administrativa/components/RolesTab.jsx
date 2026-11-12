import React, { useState, useEffect } from "react"
import { Shield, Mail, Check, Lock, Loader2, RefreshCw } from "lucide-react"
import {
    BOTON_PRIMARIO,
    BOTON_SECUNDARIO,
    BOTON_SECUNDARIO_SM,
    Buscador,
    Cargando,
    Distintivo,
    ErrorGeneral,
    FilaMensaje,
    Interruptor,
    MensajeError,
    Modal,
    Pestanas,
    TABLA_FILA,
    TABLA_TD,
    Tabla,
    claseOpcion,
} from "../../../components/ui"
import { useAuth } from "../../../context/AuthContext"
import {
    getRolesCatalogo,
    getUsuarios,
    updateUsuarioRoles,
    toggleUsuarioActive,
} from "../services/parametroService"


export default function RolesTab() {
    const { usuario, updateCurrentUserRoles, refreshSession, updateUsuario } = useAuth()

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
            const updatedData = updated?.data || updated

            setUsers((prev) =>
                prev.map((u) =>
                    u.id_usuario === selectedUser.id_usuario ? updatedData : u
                )
            )
            // Actualizar catálogo de roles con el nuevo conteo
            const rolesRes = await getRolesCatalogo()
            setRolesCatalog(Array.isArray(rolesRes) ? rolesRes : rolesRes?.data || [])

            // Verificar si el usuario editado es el usuario autenticado actualmente en la sesión
            const isCurrentUser = Boolean(
                usuario &&
                selectedUser &&
                (
                    (usuario.id_usuario != null && selectedUser.id_usuario != null && String(usuario.id_usuario) === String(selectedUser.id_usuario)) ||
                    (usuario.correo && selectedUser.email && usuario.correo.trim().toLowerCase() === selectedUser.email.trim().toLowerCase()) ||
                    (usuario.correo && selectedUser.correo && usuario.correo.trim().toLowerCase() === selectedUser.correo.trim().toLowerCase()) ||
                    (usuario.email && selectedUser.email && usuario.email.trim().toLowerCase() === selectedUser.email.trim().toLowerCase()) ||
                    (usuario.email && selectedUser.correo && usuario.email.trim().toLowerCase() === selectedUser.correo.trim().toLowerCase()) ||
                    (usuario.id && selectedUser.id && usuario.id === selectedUser.id)
                )
            )

            if (isCurrentUser) {
                // Obtener lista completa de roles activos (incluye admin si lo tenía)
                const newRoles = Array.isArray(updatedData?.roles)
                    ? updatedData.roles
                    : Array.from(new Set([
                        ...(usuario.roles?.includes("admin") || usuario.rol === "admin" ? ["admin"] : []),
                        ...selectedRoles
                    ]))

                if (updateCurrentUserRoles) {
                    updateCurrentUserRoles(newRoles)
                } else if (updateUsuario) {
                    const currentRol = usuario.rol
                    const nextRol = newRoles.includes(currentRol) ? currentRol : (newRoles[0] || "estudiante")
                    updateUsuario({
                        ...usuario,
                        rol: nextRol,
                        roles: newRoles,
                        roles_asignados: newRoles,
                    })
                }

                // Refrescar en segundo plano con el backend para sincronización completa
                if (refreshSession) {
                    refreshSession()
                }
            }

            // Notificar a toda la aplicación para sincronizar componentes dependientes de roles
            window.dispatchEvent(new CustomEvent("gennova:session-updated", {
                detail: { id_usuario: selectedUser.id_usuario }
            }))

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
            {errorMessage && (
                <ErrorGeneral mensaje={errorMessage}>
                    <button
                        type="button"
                        onClick={loadData}
                        className="mt-1 inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline"
                    >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Reintentar
                    </button>
                </ErrorGeneral>
            )}

            {/* Subvista y buscador */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Pestanas
                    etiqueta="Vista de roles"
                    valor={viewMode}
                    onChange={setViewMode}
                    opciones={[
                        { id: "usuarios", label: "Asignación de Roles a Usuarios" },
                        { id: "catalogo", label: "Catálogo de Roles del Sistema" },
                    ]}
                />
                {viewMode === "usuarios" && (
                    <Buscador
                        className="w-full lg:w-80"
                        valor={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Buscar por usuario o correo UFPS…"
                    />
                )}
            </div>

            {isLoading ? (
                <Cargando texto="Cargando roles y usuarios institucionales…" enTarjeta={false} />
            ) : viewMode === "usuarios" ? (
                <Tabla
                    etiqueta="Usuarios y roles"
                    columnas={[
                        { id: "usuario", label: "Usuario Institucional" },
                        { id: "correo", label: "Correo Institucional" },
                        { id: "roles", label: "Roles Asignados (RBAC)" },
                        { id: "acciones", label: "Acciones", className: "text-center" },
                        { id: "activo", label: "Estado Activo", className: "text-center" },
                    ]}
                >
                    {filteredUsers.length === 0 ? (
                        <FilaMensaje columnas={5}>No se encontraron usuarios institucionales registrados.</FilaMensaje>
                    ) : (
                        filteredUsers.map((user) => (
                            <tr key={user.id_usuario || user.id} className={TABLA_FILA}>
                                <td className={TABLA_TD}>
                                    <p className="font-semibold text-slate-900">{user.name}</p>
                                    <p className="font-mono text-xs text-slate-400">{user.id}</p>
                                </td>
                                <td className={TABLA_TD}>
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                        {user.email}
                                    </span>
                                </td>
                                <td className={TABLA_TD}>
                                    <div className="flex flex-wrap gap-1.5">
                                        {!user.roles || user.roles.length === 0 ? (
                                            <Distintivo tono="alerta">Sin Rol Asignado</Distintivo>
                                        ) : (
                                            user.roles.map((rId) => {
                                                const rData = rolesCatalog.find((r) => r.id === rId)
                                                return (
                                                    <Distintivo key={rId} tono="contorno">
                                                        {rData ? rData.name : rId}
                                                    </Distintivo>
                                                )
                                            })
                                        )}
                                    </div>
                                </td>
                                <td className={`${TABLA_TD} text-center`}>
                                    <button type="button" onClick={() => handleOpenAssignModal(user)} className={BOTON_SECUNDARIO_SM}>
                                        Gestionar Roles
                                    </button>
                                </td>
                                <td className={`${TABLA_TD} text-center`}>
                                    <Interruptor
                                        activo={user.isActive}
                                        onChange={() => handleToggleUserActive(user)}
                                        etiqueta={`Usuario ${user.name} activo`}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </Tabla>
            ) : (
                <Tabla
                    etiqueta="Catálogo de roles"
                    columnas={[
                        { id: "codigo", label: "Código" },
                        { id: "nombre", label: "Nombre del Rol" },
                        { id: "descripcion", label: "Descripción de Alcance" },
                        { id: "tipo", label: "Tipo de Asignación", className: "text-center" },
                        { id: "usuarios", label: "Usuarios Asignados", className: "text-center" },
                    ]}
                >
                    {rolesCatalog.map((role, idx) => {
                        const count =
                            role.usersCount !== undefined
                                ? role.usersCount
                                : users.filter((u) => u.roles?.includes(role.id)).length
                        return (
                            <tr key={role.id} className={TABLA_FILA}>
                                <td className={`${TABLA_TD} font-medium text-slate-900`}>ROL-0{idx + 1}</td>
                                <td className={`${TABLA_TD} font-semibold text-slate-900`}>
                                    <span className="flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                                        {role.name}
                                    </span>
                                </td>
                                <td className={`${TABLA_TD} max-w-xs leading-relaxed`}>{role.description}</td>
                                <td className={`${TABLA_TD} text-center`}>
                                    {role.isAssignable ? (
                                        <Distintivo tono="oscuro">Delegable por Admin</Distintivo>
                                    ) : (
                                        <Distintivo tono="gris">Reservado de Sistema</Distintivo>
                                    )}
                                </td>
                                <td className={`${TABLA_TD} text-center font-semibold text-slate-900`}>{count}</td>
                            </tr>
                        )
                    })}
                </Tabla>
            )}

            {/* MODAL CON SELECCIÓN MÚLTIPLE Y ROL DE ADMINISTRADOR BLOQUEADO */}
            <Modal
                open={isModalOpen && Boolean(selectedUser)}
                onClose={() => {
                    if (isSaving) return
                    setIsModalOpen(false)
                    setSelectedUser(null)
                }}
                seccion="Roles del usuario"
                titulo="Asignación de Roles Funcionales"
                subtitulo={
                    selectedUser && (
                        <>
                            Usuario: <span className="font-semibold text-slate-800">{selectedUser.name}</span> ({selectedUser.email})
                        </>
                    )
                }
                etiquetaCerrar="Cerrar asignación de roles"
                pie={
                    <>
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                                setIsModalOpen(false)
                                setSelectedUser(null)
                            }}
                            className={BOTON_SECUNDARIO}
                        >
                            Cancelar
                        </button>
                        <button type="button" disabled={isSaving} onClick={handleSaveRoles} className={BOTON_PRIMARIO}>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                            {isSaving ? "Guardando..." : "Guardar Roles"}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span>
                            Por directriz de seguridad institucional, el rol de <strong>Administrador</strong> está reservado a nivel
                            de sistema y no puede ser asignado desde este panel.
                        </span>
                    </p>

                    <fieldset className="space-y-2">
                        <legend className="text-xs font-semibold text-slate-700">Selecciona uno o más roles aplicables:</legend>
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {rolesCatalog
                                .filter((r) => r.isAssignable && r.id !== "admin") // Excluye estrictamente el rol de Administrador
                                .map((r) => {
                                    const isChecked = selectedRoles.includes(r.id)
                                    return (
                                        <label
                                            key={r.id}
                                            className={`${claseOpcion(isChecked)} flex cursor-pointer items-start justify-between gap-3 p-3`}
                                        >
                                            <span className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleRole(r.id)}
                                                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 accent-ufps"
                                                />
                                                <span>
                                                    <span className="block text-sm font-semibold text-slate-900">{r.name}</span>
                                                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{r.description}</span>
                                                </span>
                                            </span>
                                            {isChecked && <Check className="mt-0.5 h-4 w-4 shrink-0 text-ufps" aria-hidden="true" />}
                                        </label>
                                    )
                                })}
                        </div>
                        <MensajeError>{modalError}</MensajeError>
                    </fieldset>
                </div>
            </Modal>
        </div>
    )
}
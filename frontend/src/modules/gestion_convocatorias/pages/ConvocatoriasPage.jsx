import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit2,
  Trash2,
  Send,
  Lock,
  Globe,
  Bell,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import MainLayout from "../../gestion_administrativa/components/layout/MainLayout";
import { useAuth } from "../../../context/AuthContext";
import {
  getConvocatorias,
  createConvocatoria,
  updateConvocatoria,
  deleteConvocatoria,
  publicarConvocatoria,
  cerrarConvocatoria,
  notificarConvocatoria,
  getResumenNotificaciones,
} from "../services/convocatoriaService";
import { getPeriodos } from "../../gestion_administrativa/services/parametroService";
import { ConvocatoriaFormDialog } from "../components/ConvocatoriaFormDialog";
import { DetalleConvocatoriaModal } from "../components/DetalleConvocatoriaModal";
import { NotificacionesModal } from "../components/NotificacionesModal";

export default function ConvocatoriasPage({ onNavigate }) {
  const { rolActivo, hasRole } = useAuth();
  const isGestor =
    hasRole(["admin", "coordinador", "direccion_del_programa", "direccion"]) ||
    ["admin", "coordinador", "direccion_del_programa", "direccion"].includes(
      rolActivo,
    );

  // Estado de convocatorias y filtros
  const [convocatorias, setConvocatorias] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [periodoFilter, setPeriodoFilter] = useState("todos");

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConvocatoria, setEditingConvocatoria] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Modal de confirmación
  const [confirmDialog, setConfirmDialog] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const [convsData, perData] = await Promise.all([
        getConvocatorias(),
        getPeriodos().catch(() => []),
      ]);
      setConvocatorias(Array.isArray(convsData) ? convsData : []);
      setPeriodos(Array.isArray(perData) ? perData : []);
    } catch (err) {
      setErrorMessage(err.message || "Error al cargar las convocatorias.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationCount = async () => {
    try {
      const resumen = await getResumenNotificaciones();
      if (resumen && typeof resumen.no_leidas === "number") {
        setUnreadNotifCount(resumen.no_leidas);
      }
    } catch {
      // Silencioso
    }
  };

  useEffect(() => {
    loadData();
    loadNotificationCount();
  }, []);

  const showToast = (message, type = "success") => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Filtrado reactivo en cliente
  const filteredConvocatorias = useMemo(() => {
    return convocatorias.filter((c) => {
      // Filtro por pestaña de estado
      if (statusFilter !== "todas" && c.estado !== statusFilter) {
        return false;
      }

      // Filtro por término de búsqueda (nombre o descripción)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesNombre = c.nombre?.toLowerCase().includes(term);
        const matchesDesc = c.descripcion?.toLowerCase().includes(term);
        const matchesCat = c.categoria?.toLowerCase().includes(term);
        if (!matchesNombre && !matchesDesc && !matchesCat) return false;
      }

      // Filtro por categoría
      if (categoryFilter !== "todas" && c.categoria !== categoryFilter) {
        return false;
      }

      // Filtro por periodo académico
      if (periodoFilter !== "todos" && String(c.periodo) !== String(periodoFilter)) {
        return false;
      }

      return true;
    });
  }, [convocatorias, statusFilter, searchTerm, categoryFilter, periodoFilter]);

  // Lista única de categorías existentes
  const availableCategories = useMemo(() => {
    const cats = new Set();
    convocatorias.forEach((c) => {
      if (c.categoria) cats.add(c.categoria);
    });
    return Array.from(cats);
  }, [convocatorias]);

  // Contadores por estado para los badges de las pestañas
  const countsByStatus = useMemo(() => {
    const counts = {
      todas: convocatorias.length,
      abierta: 0,
      publicada: 0,
      borrador: 0,
      cerrada: 0,
    };
    convocatorias.forEach((c) => {
      if (counts[c.estado] !== undefined) {
        counts[c.estado] += 1;
      }
    });
    return counts;
  }, [convocatorias]);

  // Handlers para acciones
  const handleOpenCreate = () => {
    setEditingConvocatoria(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (convocatoria) => {
    setEditingConvocatoria(convocatoria);
    setIsFormOpen(true);
  };

  const handleOpenDetail = (convocatoria) => {
    setSelectedConvocatoria(convocatoria);
    setIsDetailOpen(true);
  };

  const handleSaveConvocatoria = async (payload) => {
    if (editingConvocatoria) {
      const updated = await updateConvocatoria(editingConvocatoria.id_convocatoria, payload);
      setConvocatorias((prev) =>
        prev.map((c) =>
          c.id_convocatoria === editingConvocatoria.id_convocatoria ? { ...c, ...updated } : c
        )
      );
      showToast("Convocatoria actualizada exitosamente.");
    } else {
      const created = await createConvocatoria(payload);
      setConvocatorias((prev) => [created, ...prev]);
      showToast("Convocatoria creada exitosamente.");
      loadNotificationCount();
    }
  };

  const handlePublish = (convocatoria) => {
    setConfirmDialog({
      title: "¿Publicar esta convocatoria?",
      message: `La convocatoria "${convocatoria.nombre}" pasará a estado oficial visible para toda la comunidad universitaria y emitirá notificaciones institucionales.`,
      confirmText: "Publicar y Notificar",
      isDanger: false,
      onConfirm: async () => {
        try {
          const resp = await publicarConvocatoria(convocatoria.id_convocatoria);
          const updated = resp.convocatoria || resp;
          setConvocatorias((prev) =>
            prev.map((c) =>
              c.id_convocatoria === convocatoria.id_convocatoria
                ? { ...c, ...updated, estado: updated.estado || "publicada" }
                : c
            )
          );
          const notifs = resp.notificaciones_enviadas || 0;
          showToast(`Convocatoria publicada con éxito. (${notifs} notificaciones emitidas)`);
          loadNotificationCount();
        } catch (err) {
          showToast(err.message || "Error al publicar la convocatoria.", "error");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleCloseConvocatoriaAction = (convocatoria) => {
    setConfirmDialog({
      title: "¿Cerrar recepción de iniciativas?",
      message: `La convocatoria "${convocatoria.nombre}" finalizará su etapa activa de recepción y se notificará a los usuarios.`,
      confirmText: "Cerrar Convocatoria",
      isDanger: true,
      onConfirm: async () => {
        try {
          const resp = await cerrarConvocatoria(convocatoria.id_convocatoria);
          const updated = resp.convocatoria || resp;
          setConvocatorias((prev) =>
            prev.map((c) =>
              c.id_convocatoria === convocatoria.id_convocatoria
                ? { ...c, ...updated, estado: "cerrada" }
                : c
            )
          );
          showToast("Convocatoria cerrada exitosamente.");
          loadNotificationCount();
        } catch (err) {
          showToast(err.message || "Error al cerrar la convocatoria.", "error");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleNotifyAction = (convocatoria) => {
    setConfirmDialog({
      title: "Difundir Convocatoria",
      message: `Se enviará un recordatorio y notificación institucional masiva a todos los estudiantes activos sobre la convocatoria "${convocatoria.nombre}".`,
      confirmText: "Emitir Notificaciones",
      isDanger: false,
      onConfirm: async () => {
        try {
          const resp = await notificarConvocatoria(convocatoria.id_convocatoria);
          const notifs = resp.notificaciones_generadas || 0;
          showToast(`Difusión completada: se emitieron ${notifs} notificaciones institucionales.`);
          loadNotificationCount();
        } catch (err) {
          showToast(err.message || "Error al emitir notificaciones.", "error");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteAction = (convocatoria) => {
    setConfirmDialog({
      title: "¿Eliminar esta convocatoria?",
      message: `¿Estás seguro de que deseas eliminar permanentemente la convocatoria "${convocatoria.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar definitivamente",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteConvocatoria(convocatoria.id_convocatoria);
          setConvocatorias((prev) =>
            prev.filter((c) => c.id_convocatoria !== convocatoria.id_convocatoria)
          );
          showToast("Convocatoria eliminada correctamente.");
        } catch (err) {
          showToast(err.message || "Error al eliminar la convocatoria.", "error");
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (estado) => {
    const config = {
      abierta: {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "Abierta",
        dot: "bg-emerald-500 animate-pulse",
      },
      publicada: {
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        label: "Publicada",
        dot: "bg-blue-500",
      },
      borrador: {
        bg: "bg-slate-100 text-slate-700 border-slate-200",
        label: "Borrador",
        dot: "bg-slate-400",
      },
      cerrada: {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        label: "Cerrada",
        dot: "bg-amber-500",
      },
      cancelada: {
        bg: "bg-red-50 text-red-700 border-red-200",
        label: "Cancelada",
        dot: "bg-red-500",
      },
    };

    const c = config[estado] || config.borrador;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </span>
    );
  };

  return (
    <MainLayout activeModule="convocatorias" onNavigate={onNavigate}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Toast Notificación */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${
              toastMessage.type === "error"
                ? "border-red-200 bg-red-50/95 text-red-800"
                : "border-emerald-200 bg-emerald-50/95 text-emerald-800"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <p className="text-xs font-semibold">{toastMessage.message}</p>
          </div>
        )}

        {/* 1. HEADER DE LA PÁGINA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 font-mono">
                HU-02 • GENNOVA
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Convocatorias de Emprendimiento
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isGestor ? "Gestión de Convocatorias Institucionales" : "Convocatorias Institucionales"}
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Consulta, postulación y administración del ciclo de vida de convocatorias para proyectos y semilleros de innovación.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Botón Centro de Notificaciones */}
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              title="Notificaciones de Convocatorias"
            >
              <Bell className="h-4 w-4 text-slate-500" />
              <span className="hidden sm:inline">Notificaciones</span>
              {unreadNotifCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {/* Botón Refrescar */}
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
              title="Recargar convocatorias"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-red-600" : ""}`} />
            </button>

            {/* Botón Nueva Convocatoria (Solo Gestores) */}
            {isGestor && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Convocatoria</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. TARJETAS DE MÉTRICAS RÁPIDAS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Registradas
            </span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {countsByStatus.todas}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">En el sistema</span>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Abiertas Ahora
            </span>
            <span className="text-2xl font-bold text-emerald-800 mt-1 block">
              {countsByStatus.abierta}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Postulaciones activas</span>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              Programadas
            </span>
            <span className="text-2xl font-bold text-blue-800 mt-1 block">
              {countsByStatus.publicada}
            </span>
            <span className="text-[10px] text-blue-600 block mt-0.5">Apertura próxima</span>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 shadow-sm">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
              {isGestor ? "En Borrador" : "Cerradas"}
            </span>
            <span className="text-2xl font-bold text-amber-800 mt-1 block">
              {isGestor ? countsByStatus.borrador : countsByStatus.cerrada}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">
              {isGestor ? "Pendientes de publicar" : "Histórico de convocatorias"}
            </span>
          </div>
        </div>

        {/* 3. BARRA DE CONTROL, PESTAÑAS Y BÚSQUEDA */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          {/* Pestañas tipo carpeta por estado */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
            {[
              { id: "todas", label: "Todas", count: countsByStatus.todas },
              { id: "abierta", label: "Abiertas", count: countsByStatus.abierta },
              { id: "publicada", label: "Publicadas", count: countsByStatus.publicada },
              ...(isGestor ? [{ id: "borrador", label: "Borradores", count: countsByStatus.borrador }] : []),
              { id: "cerrada", label: "Cerradas", count: countsByStatus.cerrada },
            ].map((tab) => {
              const isSelected = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-red-50 text-red-700 border border-red-200 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      isSelected ? "bg-red-200 text-red-800" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtros secundarios: Búsqueda, Categoría, Periodo */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, categoría o descripción..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="todas">Todas las categorías</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                value={periodoFilter}
                onChange={(e) => setPeriodoFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 transition-colors focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              >
                <option value="todos">Todos los periodos</option>
                {periodos.map((p) => {
                  const id = p.id || p.id_periodo;
                  const label = p.name || p.nombre_periodo || `Ciclo ${p.year || p.anio}-${p.semester || p.semestre}`;
                  return (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* 4. LISTADO DE CONVOCATORIAS */}
        {errorMessage && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="font-semibold">Ocurrió un error al cargar las convocatorias</p>
              <p className="mt-0.5">{errorMessage}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-2 font-bold text-red-800 underline hover:no-underline"
              >
                Reintentar carga
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-xs font-semibold text-slate-700">Cargando convocatorias institucionales...</p>
            <p className="text-[11px] text-slate-400">Verificando consistencia temporal y estados (GENNOVA-50)...</p>
          </div>
        ) : filteredConvocatorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm text-center p-6 space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <FileText className="h-7 w-7 stroke-1" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No se encontraron convocatorias
            </h3>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              {searchTerm || categoryFilter !== "todas" || statusFilter !== "todas"
                ? "No hay resultados que coincidan con los filtros seleccionados. Intenta restablecer los filtros."
                : isGestor
                ? "Aún no se han registrado convocatorias en el sistema. Puedes crear la primera haciendo clic en 'Nueva Convocatoria'."
                : "No hay convocatorias activas disponibles para postulación en este momento."}
            </p>
            {isGestor && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Crear Primera Convocatoria</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredConvocatorias.map((conv) => {
              const estaAbierta = conv.estado === "abierta";
              const estaPublicada = conv.estado === "publicada";
              const estaBorrador = conv.estado === "borrador";

              return (
                <div
                  key={conv.id_convocatoria}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    {/* Top: Badges */}
                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(conv.estado)}
                      {conv.periodo_nombre && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          <Building className="h-2.5 w-2.5 text-slate-400" />
                          {conv.periodo_nombre}
                        </span>
                      )}
                    </div>

                    {/* Título y Categoría */}
                    <div>
                      {conv.categoria && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block mb-1">
                          {conv.categoria}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-2">
                        {conv.nombre}
                      </h3>
                    </div>

                    {/* Fechas / Cronograma */}
                    <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1.5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Apertura:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {formatDateShort(conv.fecha_apertura)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Cierre:
                        </span>
                        <span className="font-semibold text-slate-700">
                          {formatDateShort(conv.fecha_cierre)}
                        </span>
                      </div>
                    </div>

                    {/* Descripción truncada */}
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {conv.descripcion || "Sin descripción registrada."}
                    </p>
                  </div>

                  {/* Acciones del card */}
                  <div className="mt-5 border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(conv)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-red-600 transition-colors"
                      >
                        <span>Ver detalles</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>

                      {isGestor && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(conv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Editar convocatoria"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(conv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Eliminar convocatoria"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Acciones de gestión rápida para coordinadores */}
                    {isGestor && (
                      <div className="flex items-center gap-1.5 pt-1">
                        {estaBorrador && (
                          <button
                            type="button"
                            onClick={() => handlePublish(conv)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-1.5 text-[11px] font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors"
                          >
                            <Globe className="h-3 w-3" />
                            <span>Publicar</span>
                          </button>
                        )}

                        {(estaPublicada || estaAbierta) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleNotifyAction(conv)}
                              className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-blue-50 py-1.5 text-[11px] font-semibold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                              title="Difundir a la comunidad"
                            >
                              <Send className="h-3 w-3" />
                              <span>Difundir</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCloseConvocatoriaAction(conv)}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                              title="Cerrar convocatoria"
                            >
                              <Lock className="h-3 w-3" />
                              <span>Cerrar</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. MODALES Y DIÁLOGOS */}
        <ConvocatoriaFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={handleSaveConvocatoria}
          initialData={editingConvocatoria}
          periodos={periodos}
          categories={availableCategories.map((c) => ({ name: c }))}
        />

        <DetalleConvocatoriaModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          convocatoria={selectedConvocatoria}
          isGestor={isGestor}
          onEdit={handleOpenEdit}
          onPublish={handlePublish}
          onCloseConvocatoria={handleCloseConvocatoriaAction}
          onNotify={handleNotifyAction}
          onDelete={handleDeleteAction}
        />

        <NotificacionesModal
          open={isNotifOpen}
          onOpenChange={setIsNotifOpen}
          onNotificationRead={loadNotificationCount}
        />

        {/* Modal de confirmación genérico */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-100">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    confirmDialog.isDanger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  }`}
                >
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors ${
                    confirmDialog.isDanger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

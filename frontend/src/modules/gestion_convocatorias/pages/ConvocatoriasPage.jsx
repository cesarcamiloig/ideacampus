import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Building,
  FileText,
  Edit2,
  Trash2,
  Send,
  Lock,
  Globe,
  Bell,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  BOTON_ICONO,
  BOTON_ICONO_PELIGRO,
  BOTON_OSCURO,
  BOTON_PRIMARIO,
  BOTON_SECUNDARIO,
  Buscador,
  Cargando,
  Contador,
  DialogoConfirmacion,
  Distintivo,
  EncabezadoPagina,
  ENLACE,
  ErrorGeneral,
  EstadoVacio,
  Pagina,
  Pestanas,
  Selector,
  SECCION,
  TARJETA,
  Toast,
} from "../../../components/ui";
import { estadoConvocatoria } from "../components/estadoConvocatoria";
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
    const c = estadoConvocatoria(estado);
    return <Distintivo tono={c.tono}>{c.label}</Distintivo>;
  };

  const pestanas = [
    { id: "todas", label: "Todas", count: countsByStatus.todas },
    { id: "abierta", label: "Abiertas", count: countsByStatus.abierta },
    { id: "publicada", label: "Publicadas", count: countsByStatus.publicada },
    ...(isGestor ? [{ id: "borrador", label: "Borradores", count: countsByStatus.borrador }] : []),
    { id: "cerrada", label: "Cerradas", count: countsByStatus.cerrada },
  ];

  return (
    <MainLayout
      activeModule="convocatorias"
      onNavigate={onNavigate}
      onRoleChange={() => {
        if (onNavigate) onNavigate(null);
      }}
    >
      <Pagina>
        <Toast
          mensaje={toastMessage?.message}
          tipo={toastMessage?.type === "error" ? "error" : "exito"}
          onCerrar={() => setToastMessage(null)}
        />

        {/* 1. ENCABEZADO DE LA PÁGINA */}
        <EncabezadoPagina
          seccion="Convocatorias de emprendimiento"
          titulo={isGestor ? "Gestión de Convocatorias Institucionales" : "Convocatorias Institucionales"}
          descripcion="Consulta, postulación y administración del ciclo de vida de convocatorias para proyectos y semilleros de innovación."
          acciones={
            <>
              <button
                type="button"
                onClick={() => setIsNotifOpen(true)}
                className={BOTON_SECUNDARIO}
                title="Notificaciones de Convocatorias"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Notificaciones</span>
                {unreadNotifCount > 0 && <Contador>{unreadNotifCount}</Contador>}
              </button>
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className={`${BOTON_ICONO} ring-1 ring-slate-200`}
                title="Recargar convocatorias"
                aria-label="Recargar convocatorias"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-ufps" : ""}`} aria-hidden="true" />
              </button>
              {isGestor && (
                <button type="button" onClick={handleOpenCreate} className={BOTON_PRIMARIO}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nueva Convocatoria
                </button>
              )}
            </>
          }
        />

        {/* 2. PESTAÑAS Y FILTROS */}
        <section className={`${TARJETA} space-y-4 p-4`}>
          <Pestanas
            opciones={pestanas}
            valor={statusFilter}
            onChange={setStatusFilter}
            etiqueta="Estado de la convocatoria"
            className="border-b border-slate-100 pb-3"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <Buscador
              className="md:col-span-6"
              valor={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nombre, categoría o descripción…"
            />
            <Selector
              className="md:col-span-3"
              valor={categoryFilter}
              onChange={setCategoryFilter}
              aria-label="Filtrar por categoría"
              opciones={[
                { valor: "todas", texto: "Todas las categorías" },
                ...availableCategories.map((cat) => ({ valor: cat, texto: cat })),
              ]}
            />
            <Selector
              className="md:col-span-3"
              valor={periodoFilter}
              onChange={setPeriodoFilter}
              aria-label="Filtrar por periodo"
              opciones={[
                { valor: "todos", texto: "Todos los periodos" },
                ...periodos.map((p) => ({
                  valor: p.id || p.id_periodo,
                  texto: p.name || p.nombre_periodo || `Ciclo ${p.year || p.anio}-${p.semester || p.semestre}`,
                })),
              ]}
            />
          </div>
        </section>

        {/* 3. LISTADO DE CONVOCATORIAS */}
        {errorMessage && (
          <ErrorGeneral titulo="Ocurrió un error al cargar las convocatorias" mensaje={errorMessage}>
            <button type="button" onClick={loadData} className="mt-1 font-semibold underline underline-offset-2 hover:no-underline">
              Reintentar carga
            </button>
          </ErrorGeneral>
        )}

        {isLoading ? (
          <Cargando texto="Cargando convocatorias institucionales…" />
        ) : filteredConvocatorias.length === 0 ? (
          <EstadoVacio
            icono={FileText}
            titulo="No se encontraron convocatorias"
            accion={
              isGestor && (
                <button type="button" onClick={handleOpenCreate} className={BOTON_PRIMARIO}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear Primera Convocatoria
                </button>
              )
            }
          >
            {searchTerm || categoryFilter !== "todas" || statusFilter !== "todas"
              ? "No hay resultados que coincidan con los filtros seleccionados. Intenta restablecer los filtros."
              : isGestor
                ? "Aún no se han registrado convocatorias en el sistema. Puedes crear la primera haciendo clic en 'Nueva Convocatoria'."
                : "No hay convocatorias activas disponibles para postulación en este momento."}
          </EstadoVacio>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredConvocatorias.map((conv) => {
              const estaAbierta = conv.estado === "abierta";
              const estaPublicada = conv.estado === "publicada";
              const estaBorrador = conv.estado === "borrador";

              return (
                <article
                  key={conv.id_convocatoria}
                  className={`${TARJETA} flex flex-col justify-between p-5 transition-shadow hover:shadow-md`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(conv.estado)}
                      {conv.periodo_nombre && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                          <Building className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          {conv.periodo_nombre}
                        </span>
                      )}
                    </div>

                    <div>
                      {conv.categoria && <p className={`${SECCION} mb-1`}>{conv.categoria}</p>}
                      <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">{conv.nombre}</h3>
                    </div>

                    <dl className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-1.5 text-slate-500">
                          <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Apertura
                        </dt>
                        <dd className="font-semibold text-slate-800">{formatDateShort(conv.fecha_apertura)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Cierre
                        </dt>
                        <dd className="font-semibold text-slate-800">{formatDateShort(conv.fecha_cierre)}</dd>
                      </div>
                    </dl>

                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                      {conv.descripcion || "Sin descripción registrada."}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => handleOpenDetail(conv)} className={ENLACE}>
                        Ver detalles
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>

                      {isGestor && (
                        <div className="-my-1.5 -mr-2 flex items-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(conv)}
                            className={BOTON_ICONO}
                            title="Editar convocatoria"
                            aria-label={`Editar la convocatoria ${conv.nombre}`}
                          >
                            <Edit2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAction(conv)}
                            className={BOTON_ICONO_PELIGRO}
                            title="Eliminar convocatoria"
                            aria-label={`Eliminar la convocatoria ${conv.nombre}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isGestor && (estaBorrador || estaPublicada || estaAbierta) && (
                      <div className="flex items-center gap-2">
                        {estaBorrador && (
                          <button type="button" onClick={() => handlePublish(conv)} className={`${BOTON_OSCURO} flex-1`}>
                            <Globe className="h-4 w-4" aria-hidden="true" />
                            Publicar
                          </button>
                        )}

                        {(estaPublicada || estaAbierta) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleNotifyAction(conv)}
                              className={`${BOTON_OSCURO} flex-1`}
                              title="Difundir a la comunidad"
                            >
                              <Send className="h-4 w-4" aria-hidden="true" />
                              Difundir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCloseConvocatoriaAction(conv)}
                              className={BOTON_SECUNDARIO}
                              title="Cerrar convocatoria"
                            >
                              <Lock className="h-4 w-4" aria-hidden="true" />
                              Cerrar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 4. MODALES Y DIÁLOGOS */}
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

        <NotificacionesModal open={isNotifOpen} onOpenChange={setIsNotifOpen} onNotificationRead={loadNotificationCount} />

        <DialogoConfirmacion
          open={Boolean(confirmDialog)}
          titulo={confirmDialog?.title}
          mensaje={confirmDialog?.message}
          textoConfirmar={confirmDialog?.confirmText}
          peligro={confirmDialog?.isDanger}
          onConfirmar={confirmDialog?.onConfirm}
          onCancelar={() => setConfirmDialog(null)}
        />
      </Pagina>
    </MainLayout>
  );
}

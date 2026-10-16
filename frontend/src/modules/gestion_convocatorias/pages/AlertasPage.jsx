import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
  Search,
  RefreshCw,
  Calendar,
  Layers,
  GraduationCap,
  BookOpen,
  Award,
  ClipboardCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  X,
  ExternalLink,
  ShieldCheck,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getAlertas,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
  getResumenAlertas,
  sincronizarAlertas,
} from "../services/alertaService";

const ROLE_INFO = {
  estudiante: {
    label: "Estudiante Emprendedor",
    icon: GraduationCap,
    badgeBg: "bg-blue-50 text-blue-800 border-blue-200",
  },
  tutor: {
    label: "Tutor Académico",
    icon: BookOpen,
    badgeBg: "bg-purple-50 text-purple-800 border-purple-200",
  },
  mentor: {
    label: "Mentor Especializado",
    icon: Award,
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200",
  },
  evaluador: {
    label: "Evaluador de Iniciativas",
    icon: ClipboardCheck,
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200",
  },
  coordinador: {
    label: "Coordinador de Emprendimiento",
    icon: Layers,
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  admin: {
    label: "Administrador del Sistema",
    icon: Layers,
    badgeBg: "bg-slate-100 text-slate-800 border-slate-300",
  },
  direccion_del_programa: {
    label: "Dirección de Programa",
    icon: Award,
    badgeBg: "bg-rose-50 text-rose-800 border-rose-200",
  },
};

const TIPO_INFO = {
  vencimiento_convocatoria: {
    label: "Vencimiento de Convocatoria",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  compromiso_tutoria: {
    label: "Compromiso de Tutoría",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  compromiso_mentoria: {
    label: "Compromiso de Mentoría",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  evaluacion_pendiente: {
    label: "Evaluación Pendiente",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  entrega_documentacion: {
    label: "Entrega de Documentos",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  cierre_periodo: {
    label: "Cierre y Supervisión",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  general: {
    label: "Aviso General",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function AlertasPage({ onNavigate, activeRole: propRole }) {
  const { usuario, rolActivo } = useAuth();
  const currentRole = (propRole || rolActivo || usuario?.rol || "estudiante")
    .trim()
    .toLowerCase();
  const roleConfig = ROLE_INFO[currentRole] || ROLE_INFO.estudiante;
  const RoleIcon = roleConfig.icon;

  // Estados
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [resumen, setResumen] = useState({
    total: 0,
    no_leidas: 0,
    alta_prioridad: 0,
    proximas_a_vencer: 0,
    vencidas: 0,
  });

  // Filtros interactivos
  const [activeTab, setActiveTab] = useState("todas"); // 'todas' | 'pendientes' | 'urgentes' | 'leidas'
  const [searchTerm, setSearchTerm] = useState("");
  const [orden, setOrden] = useState("vencimiento_asc"); // 'vencimiento_asc' | 'recientes' | 'prioridad'

  // Modal de detalle
  const [detalleAlerta, setDetalleAlerta] = useState(null);

  // Carga de alertas desde el backend exclusivamente para el rol activo
  const loadAlertas = useCallback(async () => {
    try {
      const params = { rol: currentRole, orden };
      if (activeTab === "pendientes") params.leida = "false";
      if (activeTab === "leidas") params.leida = "true";
      if (activeTab === "urgentes") params.prioridad = "alta";
      if (searchTerm.trim()) params.q = searchTerm.trim();

      const [dataList, dataResumen] = await Promise.all([
        getAlertas(params),
        getResumenAlertas(currentRole),
      ]);

      setAlertas(Array.isArray(dataList) ? dataList : []);
      if (dataResumen) {
        setResumen(dataResumen);
      }
    } catch {
      // Manejo silencioso
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentRole, activeTab, searchTerm, orden]);

  useEffect(() => {
    loadAlertas();
  }, [loadAlertas]);

  // Marcar como leída / no leída
  const handleToggleLeida = async (id, currentLeida, e) => {
    if (e) e.stopPropagation();
    try {
      const nuevaLeida = !currentLeida;
      await marcarAlertaLeida(id, nuevaLeida);
      setAlertas((prev) =>
        prev.map((item) =>
          item.id_alerta === id ? { ...item, leida: nuevaLeida } : item
        )
      );
      setResumen((prev) => ({
        ...prev,
        no_leidas: Math.max(0, prev.no_leidas + (nuevaLeida ? -1 : 1)),
      }));
      if (detalleAlerta?.id_alerta === id) {
        setDetalleAlerta((prev) => ({ ...prev, leida: nuevaLeida }));
      }
    } catch {
      // Silencioso
    }
  };

  // Marcar todas como leídas
  const handleMarcarTodasLeidas = async () => {
    try {
      await marcarTodasAlertasLeidas();
      setAlertas((prev) => prev.map((item) => ({ ...item, leida: true })));
      setResumen((prev) => ({ ...prev, no_leidas: 0 }));
    } catch {
      // Silencioso
    }
  };

  // Sincronizar alertas con el servidor
  const handleSincronizar = async () => {
    setIsRefreshing(true);
    try {
      await sincronizarAlertas(currentRole);
      await loadAlertas();
    } catch {
      setIsRefreshing(false);
    }
  };

  // Redirigir al módulo destino institucional
  const handleIrAlModulo = (moduloDestino, e) => {
    if (e) e.stopPropagation();
    if (!onNavigate || !moduloDestino) return;
    onNavigate(moduloDestino);
  };

  // Helper de cálculo de tiempo restante
  const calcularEstadoVencimiento = (fechaStr) => {
    if (!fechaStr) return null;
    const diffMs = new Date(fechaStr).getTime() - Date.now();
    const diffDias = Math.ceil(diffMs / (1000 * 3600 * 24));
    const diffHoras = Math.ceil(diffMs / (1000 * 3600));

    if (diffMs < 0) {
      return {
        texto: "Vencida",
        urgente: true,
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
      };
    }
    if (diffHoras <= 24) {
      return {
        texto: "Cierra en menos de 24h",
        urgente: true,
        badgeClass: "bg-red-100 text-red-800 border-red-200 animate-pulse",
      };
    }
    if (diffHoras <= 48) {
      return {
        texto: "Cierra en 48 horas",
        urgente: true,
        badgeClass: "bg-red-50 text-red-700 border-red-200",
      };
    }
    if (diffDias <= 7) {
      return {
        texto: `Vence en ${diffDias} días`,
        urgente: false,
        badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      };
    }
    return {
      texto: `Vence en ${diffDias} días`,
      urgente: false,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  // Filtrado reactivo en cliente (búsqueda y orden local inmediato)
  const alertasFiltradas = useMemo(() => {
    return alertas.filter((a) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        a.titulo?.toLowerCase().includes(q) ||
        a.mensaje?.toLowerCase().includes(q) ||
        a.convocatoria_nombre?.toLowerCase().includes(q)
      );
    });
  }, [alertas, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. ENCABEZADO INSTITUCIONAL */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleConfig.badgeBg}`}
              >
                <RoleIcon className="h-3.5 w-3.5" />
                {roleConfig.label}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Periodo Académico 2026-1 · Universidad Francisco de Paula Santander
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Centro de Alertas y Vencimientos
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Supervisión de plazos, convocatorias vigentes y compromisos académicos asignados a tu rol de {roleConfig.label}.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {resumen.no_leidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                title="Marcar todas como leídas"
              >
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                <span>Marcar leídas ({resumen.no_leidas})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSincronizar}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>
          </div>
        </div>

        {/* 2. TARJETAS DE INDICADORES RÁPIDOS (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 border-t border-slate-100 pt-5">
          {/* Pendientes */}
          <button
            type="button"
            onClick={() => setActiveTab("pendientes")}
            className={`text-left rounded-xl p-4 border transition-all ${
              activeTab === "pendientes"
                ? "bg-red-50/60 border-red-300 ring-2 ring-red-500/20 shadow-sm"
                : "bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Pendientes por revisar
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  resumen.no_leidas > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {resumen.no_leidas > 0 ? (
                  <Bell className="h-3.5 w-3.5" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 leading-none">
                {resumen.no_leidas}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {resumen.no_leidas === 1 ? "aviso sin leer" : "avisos sin leer"}
              </span>
            </div>
          </button>

          {/* Alta Prioridad */}
          <button
            type="button"
            onClick={() => setActiveTab("urgentes")}
            className={`text-left rounded-xl p-4 border transition-all ${
              activeTab === "urgentes"
                ? "bg-red-50/60 border-red-300 ring-2 ring-red-500/20 shadow-sm"
                : "bg-slate-50/60 border-slate-200 hover:bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Alta Prioridad / Críticas
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  resumen.alta_prioridad > 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 leading-none">
                {resumen.alta_prioridad}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                vencen en &lt; 48 horas
              </span>
            </div>
          </button>

          {/* Próximos Vencimientos */}
          <div className="rounded-xl p-4 border border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Próximos 7 días
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 leading-none">
                {resumen.proximas_a_vencer}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                compromisos en calendario
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BARRA DE HERRAMIENTAS: PESTAÑAS RÁPIDAS + BÚSQUEDA + ORDEN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 overflow-x-auto">
          {[
            { id: "todas", label: `Todas (${resumen.total})` },
            { id: "pendientes", label: `No Leídas (${resumen.no_leidas})` },
            { id: "urgentes", label: `Críticas (${resumen.alta_prioridad})` },
            { id: "leidas", label: "Leídas" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador y Ordenamiento */}
        <div className="flex items-center gap-2 flex-1 sm:max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar alertas..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              className="text-xs pl-2.5 pr-7 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm cursor-pointer appearance-none"
            >
              <option value="vencimiento_asc">Próximas a vencer</option>
              <option value="recientes">Más recientes</option>
              <option value="prioridad">Mayor prioridad</option>
            </select>
            <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. LISTADO DE ALERTAS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
          <span className="mt-3 text-xs font-medium text-slate-500">
            Consultando alertas de {roleConfig.label}...
          </span>
        </div>
      ) : alertasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {searchTerm || activeTab !== "todas" ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mt-3.5 text-base font-bold text-slate-800">
                No se encontraron alertas con estos criterios
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Prueba ajustando el término de búsqueda o cambiando la pestaña activa.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveTab("todas");
                }}
                className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Restablecer filtros
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-800">
                ¡Estás al día! No tienes alertas ni compromisos pendientes
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
                No hay avisos ni vencimientos activos registrados para tu rol de{" "}
                <strong className="text-slate-700">{roleConfig.label}</strong>. Cuando se publiquen nuevas convocatorias o se asignen compromisos, los verás aquí.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {alertasFiltradas.map((item) => {
            const vInfo = calcularEstadoVencimiento(item.fecha_vencimiento);
            const tipoConfig = TIPO_INFO[item.tipo] || TIPO_INFO.general;
            const esAlta = item.prioridad === "alta";
            const esMedia = item.prioridad === "media";

            const borderClass = esAlta
              ? "border-l-4 border-l-red-500"
              : esMedia
              ? "border-l-4 border-l-amber-500"
              : "border-l-4 border-l-slate-300";

            return (
              <div
                key={item.id_alerta}
                onClick={() => setDetalleAlerta(item)}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md cursor-pointer ${borderClass} ${
                  !item.leida ? "bg-red-50/[0.04]" : "opacity-95"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Fila de etiquetas de estado y tipo */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.leida ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                          No leída
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          <CheckCircle2 className="h-3 w-3 text-slate-400" />
                          Leída
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          esAlta
                            ? "bg-red-50 text-red-700 border-red-200"
                            : esMedia
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {esAlta && <Flame className="h-3 w-3 text-red-500" />}
                        {esMedia && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        Prioridad {item.prioridad?.toUpperCase()}
                      </span>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${tipoConfig.color}`}
                      >
                        {tipoConfig.label}
                      </span>

                      {item.convocatoria_nombre && (
                        <span className="text-[11px] text-slate-500 font-medium">
                          • {item.convocatoria_nombre}
                        </span>
                      )}
                    </div>

                    {/* Título de la alerta */}
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {item.titulo}
                    </h3>

                    {/* Mensaje descriptivo */}
                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl line-clamp-2">
                      {item.mensaje}
                    </p>

                    {/* Fecha de vencimiento si existe */}
                    {vInfo && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${vInfo.badgeClass}`}
                        >
                          <Clock className="h-3 w-3" />
                          {vInfo.texto}
                        </span>
                        {item.fecha_vencimiento && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Fecha límite:{" "}
                            {new Date(item.fecha_vencimiento).toLocaleDateString("es-CO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones de la alerta */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {item.modulo_destino && onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => handleIrAlModulo(item.modulo_destino, e)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
                      >
                        <span>Resolver</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleToggleLeida(item.id_alerta, item.leida, e)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                        item.leida
                          ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                      }`}
                      title={item.leida ? "Marcar como no leída" : "Marcar como leída"}
                    >
                      {item.leida ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                          <span className="hidden sm:inline">No leída</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Marcar leída</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL DE DETALLE DE ALERTA */}
      {detalleAlerta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setDetalleAlerta(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                  Detalle del Compromiso
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {detalleAlerta.titulo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetalleAlerta(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                {detalleAlerta.mensaje}
              </p>

              {detalleAlerta.convocatoria_nombre && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                  <span className="text-slate-500 font-medium">Convocatoria asociada:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {detalleAlerta.convocatoria_nombre}
                  </p>
                </div>
              )}

              {detalleAlerta.fecha_vencimiento && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-amber-900">Fecha límite de cumplimiento:</span>
                    <p className="text-amber-800 mt-0.5">
                      {new Date(detalleAlerta.fecha_vencimiento).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  handleToggleLeida(detalleAlerta.id_alerta, detalleAlerta.leida)
                }
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                {detalleAlerta.leida ? "Marcar como no leída" : "Marcar como leída"}
              </button>

              <div className="flex items-center gap-2">
                {detalleAlerta.modulo_destino && onNavigate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const mod = detalleAlerta.modulo_destino;
                      setDetalleAlerta(null);
                      handleIrAlModulo(mod, e);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <span>Ir al módulo</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetalleAlerta(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
  Filter,
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
  ArrowUpDown,
  ExternalLink,
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
  estudiante: { label: "Estudiante Emprendedor", icon: GraduationCap, color: "text-blue-600 bg-blue-50 border-blue-200" },
  tutor: { label: "Tutor Académico", icon: BookOpen, color: "text-purple-600 bg-purple-50 border-purple-200" },
  mentor: { label: "Mentor Especializado", icon: Award, color: "text-amber-600 bg-amber-50 border-amber-200" },
  evaluador: { label: "Evaluador de Iniciativas", icon: ClipboardCheck, color: "text-teal-600 bg-teal-50 border-teal-200" },
  coordinador: { label: "Coordinador de Emprendimiento", icon: Layers, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  admin: { label: "Administrador del Sistema", icon: Layers, color: "text-slate-700 bg-slate-100 border-slate-300" },
};

const TIPO_INFO = {
  vencimiento_convocatoria: { label: "Vencimiento de Convocatoria", color: "bg-red-50 text-red-700 border-red-200" },
  compromiso_tutoria: { label: "Compromiso de Tutoría", color: "bg-purple-50 text-purple-700 border-purple-200" },
  compromiso_mentoria: { label: "Compromiso de Mentoría", color: "bg-amber-50 text-amber-700 border-amber-200" },
  evaluacion_pendiente: { label: "Evaluación Pendiente", color: "bg-teal-50 text-teal-700 border-teal-200" },
  entrega_documentacion: { label: "Entrega de Documentos", color: "bg-blue-50 text-blue-700 border-blue-200" },
  cierre_periodo: { label: "Cierre de Periodo / Supervisión", color: "bg-rose-50 text-rose-700 border-rose-200" },
  general: { label: "Aviso General", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function AlertasPage({ onNavigate, activeRole: propRole }) {
  const { usuario, rolActivo } = useAuth();
  const currentRole = (propRole || rolActivo || usuario?.rol || "estudiante").trim().toLowerCase();

  // Estados de carga y datos
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
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [filtroLectura, setFiltroLectura] = useState("todas"); // 'todas' | 'no_leidas' | 'leidas'
  const [filtroPrioridad, setFiltroPrioridad] = useState("todas"); // 'todas' | 'alta' | 'media' | 'baja'
  const [filtroFecha, setFiltroFecha] = useState("todas"); // 'todas' | 'hoy_48h' | 'semana' | 'proximas' | 'vencidas'
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [orden, setOrden] = useState("vencimiento_asc"); // 'vencimiento_asc' | 'vencimiento_desc' | 'prioridad' | 'recientes'
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de detalle
  const [detalleAlerta, setDetalleAlerta] = useState(null);

  // Cargar alertas
  const loadAlertas = useCallback(async () => {
    try {
      const params = {};
      if (selectedRole && selectedRole !== "todos") params.rol = selectedRole;
      if (filtroLectura === "no_leidas") params.leida = "false";
      if (filtroLectura === "leidas") params.leida = "true";
      if (filtroPrioridad !== "todas") params.prioridad = filtroPrioridad;
      if (filtroFecha !== "todas") params.ventana_fecha = filtroFecha;
      if (filtroTipo !== "todos") params.tipo = filtroTipo;
      if (searchTerm.trim()) params.q = searchTerm.trim();
      params.orden = orden;

      const [dataList, dataResumen] = await Promise.all([
        getAlertas(params),
        getResumenAlertas(selectedRole),
      ]);

      setAlertas(Array.isArray(dataList) ? dataList : []);
      if (dataResumen) {
        setResumen(dataResumen);
      }
    } catch {
      // Manejo silencioso con fallback
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedRole, filtroLectura, filtroPrioridad, filtroFecha, filtroTipo, searchTerm, orden]);

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
        prev.map((item) => (item.id_alerta === id ? { ...item, leida: nuevaLeida } : item))
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

  // Sincronizar alertas automáticas
  const handleSincronizar = async () => {
    setIsRefreshing(true);
    try {
      await sincronizarAlertas();
      await loadAlertas();
    } catch {
      setIsRefreshing(false);
    }
  };

  // Limpiar todos los filtros
  const handleResetFiltros = () => {
    setFiltroLectura("todas");
    setFiltroPrioridad("todas");
    setFiltroFecha("todas");
    setFiltroTipo("todos");
    setSearchTerm("");
    setOrden("vencimiento_asc");
  };

  // Formato de fechas
  const formatDateTime = (dateString) => {
    if (!dateString) return "Fecha no especificada";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("es-CO", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Cálculo del estado del vencimiento
  const getVencimientoBadge = (dateString) => {
    if (!dateString) return null;
    const now = new Date();
    const target = new Date(dateString);
    const diffMs = target.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 3600);
    const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));

    if (diffMs < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="h-3 w-3" />
          Vencida hace {Math.abs(diffDays)} {Math.abs(diffDays) === 1 ? "día" : "días"}
        </span>
      );
    }
    if (diffHours <= 24) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white shadow-sm animate-pulse">
          <Flame className="h-3 w-3" />
          Vence Hoy ({Math.round(diffHours)}h restantes)
        </span>
      );
    }
    if (diffDays <= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
          <Clock className="h-3 w-3" />
          Vence en {diffDays} días (Crítico)
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="h-3 w-3" />
          Vence en {diffDays} días
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <Calendar className="h-3 w-3" />
        Faltan {diffDays} días
      </span>
    );
  };

  // Navegar al módulo de destino
  const handleActionClick = (modulo, e) => {
    if (e) e.stopPropagation();
    if (onNavigate && modulo) {
      onNavigate(modulo);
    }
  };

  const hasFiltrosActivos =
    filtroLectura !== "todas" ||
    filtroPrioridad !== "todas" ||
    filtroFecha !== "todas" ||
    filtroTipo !== "todos" ||
    searchTerm.trim() !== "";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. ENCABEZADO PRINCIPAL DE LA VISTA INSTITUCIONAL */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-500" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                <Bell className="h-3.5 w-3.5" />
                HU-12 · Alertas Automáticas
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Universidad Francisco de Paula Santander
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Centro de Alertas y Vencimientos
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Recibe avisos oportunos sobre plazos de convocatorias, hitos y compromisos pendientes
              según tu rol institucional para no perder fechas críticas del proceso formativo.
            </p>
          </div>

          {/* Botones de acción superior */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {resumen.no_leidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
              >
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                Marcar todas leídas ({resumen.no_leidas})
              </button>
            )}

            <button
              type="button"
              onClick={handleSincronizar}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Sincronizando..." : "Sincronizar Alertas"}
            </button>
          </div>
        </div>

        {/* SELECTOR DE ROL PARA PRUEBAS Y VISUALIZACIÓN DINÁMICA */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-red-600" />
              Filtrar por Rol Institucional:
            </span>
            <span className="text-xs text-slate-500">
              Mostrando alertas configuradas para el rol seleccionado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {[
              { id: "todos", label: "Todos los Roles", icon: Layers },
              { id: "estudiante", label: "Estudiante", icon: GraduationCap },
              { id: "tutor", label: "Tutor", icon: BookOpen },
              { id: "mentor", label: "Mentor", icon: Award },
              { id: "evaluador", label: "Evaluador", icon: ClipboardCheck },
              { id: "coordinador", label: "Coordinador", icon: Layers },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    isSelected
                      ? "bg-red-600 text-white border-red-600 shadow-sm shadow-red-200 scale-[1.02]"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. TARJETAS DE INDICADORES / KPIS (RESUMEN CUANTITATIVO) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Alertas */}
        <div
          onClick={() => {
            setFiltroLectura("todas");
            setFiltroPrioridad("todas");
          }}
          className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Alertas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{resumen.total}</div>
          <div className="mt-0.5 text-xs text-slate-500">Registradas para el rol</div>
        </div>

        {/* Alta Prioridad / Urgentes */}
        <div
          onClick={() => setFiltroPrioridad("alta")}
          className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
            filtroPrioridad === "alta"
              ? "bg-red-50/50 border-red-300 ring-2 ring-red-200"
              : "bg-white border-slate-200 hover:border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Críticas / Alta</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-700">{resumen.alta_prioridad}</div>
          <div className="mt-0.5 text-xs text-red-600 font-medium">Vencen en &lt; 48 horas</div>
        </div>

        {/* Próximas a vencer */}
        <div
          onClick={() => setFiltroFecha("semana")}
          className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
            filtroFecha === "semana"
              ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-200"
              : "bg-white border-slate-200 hover:border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Próximos 7 Días</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-800">{resumen.proximas_a_vencer}</div>
          <div className="mt-0.5 text-xs text-amber-700 font-medium">Compromisos vigentes</div>
        </div>

        {/* No leídas */}
        <div
          onClick={() => setFiltroLectura("no_leidas")}
          className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
            filtroLectura === "no_leidas"
              ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-200"
              : "bg-white border-slate-200 hover:border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">No Leídas</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-800">{resumen.no_leidas}</div>
          <div className="mt-0.5 text-xs text-blue-700 font-medium">Pendientes por revisar</div>
        </div>
      </section>

      {/* 3. BARRA DE CONTROL, FILTROS Y ORGANIZACIÓN MULTIDIMENSIONAL */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        {/* Barra superior de búsqueda y orden */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, compromiso o convocatoria..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-9 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <label htmlFor="orden-select" className="text-slate-500 font-medium text-[11px] sr-only">
                Ordenar:
              </label>
              <select
                id="orden-select"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer text-xs"
              >
                <option value="vencimiento_asc">Vence más pronto</option>
                <option value="vencimiento_desc">Vence más lejano</option>
                <option value="prioridad">Mayor prioridad primero</option>
                <option value="recientes">Más recientes primero</option>
              </select>
            </div>

            {hasFiltrosActivos && (
              <button
                type="button"
                onClick={handleResetFiltros}
                className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                title="Limpiar todos los filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Grupos de filtros organizados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          {/* A. ORGANIZADO POR ESTADO DE LECTURA */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Estado de Lectura:
            </span>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {[
                { id: "todas", label: "Todas" },
                { id: "no_leidas", label: `No leídas (${resumen.no_leidas})` },
                { id: "leidas", label: "Leídas" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFiltroLectura(opt.id)}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-bold transition-all ${
                    filtroLectura === opt.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* B. ORGANIZADO POR PRIORIDAD */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Nivel de Prioridad:
            </span>
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              {[
                { id: "todas", label: "Todas" },
                { id: "alta", label: "Alta" },
                { id: "media", label: "Media" },
                { id: "baja", label: "Baja" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFiltroPrioridad(opt.id)}
                  className={`flex-1 rounded-lg py-1.5 text-center text-xs font-bold transition-all ${
                    filtroPrioridad === opt.id
                      ? opt.id === "alta"
                        ? "bg-red-600 text-white shadow-sm"
                        : opt.id === "media"
                        ? "bg-amber-600 text-white shadow-sm"
                        : opt.id === "baja"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* C. ORGANIZADO POR FECHA / VENTANA TEMPORAL */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
              Plazo de Vencimiento:
            </span>
            <div className="relative">
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 px-3 text-xs font-semibold text-slate-700 focus:bg-white focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <option value="todas">Cualquier fecha</option>
                <option value="hoy_48h">Vencen en menos de 48 horas</option>
                <option value="semana">Vencen esta semana (próximos 7 días)</option>
                <option value="proximas">Vencen en más de 7 días</option>
                <option value="vencidas">Compromisos vencidos</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LISTADO PRINCIPAL DE ALERTAS Y COMPROMISOS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Alertas Encontradas ({alertas.length})
          </span>
          <span className="text-xs text-slate-400">
            Haz clic en una alerta para ver el detalle y resolver el compromiso
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-400 space-y-3">
            <RefreshCw className="h-7 w-7 animate-spin text-red-600" />
            <p className="text-xs font-semibold text-slate-600">Cargando alertas del sistema...</p>
          </div>
        ) : alertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 px-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              No tienes alertas con los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Estás al día con tus compromisos institucionales o no hay fechas críticas que coincidan
              con tu selección actual.
            </p>
            {hasFiltrosActivos && (
              <button
                type="button"
                onClick={handleResetFiltros}
                className="mt-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                Restablecer Filtros
              </button>
            )}
          </div>
        ) : (
          alertas.map((alerta) => {
            const roleBadge = ROLE_INFO[alerta.rol_destinatario] || ROLE_INFO.estudiante;
            const tipoBadge = TIPO_INFO[alerta.tipo] || TIPO_INFO.general;
            const isUnread = !alerta.leida;
            const isAlta = alerta.prioridad === "alta";
            const isMedia = alerta.prioridad === "media";

            return (
              <div
                key={alerta.id_alerta}
                onClick={() => setDetalleAlerta(alerta)}
                className={`group relative overflow-hidden rounded-2xl border transition-all cursor-pointer ${
                  isUnread
                    ? "bg-white border-slate-300 shadow-md hover:border-red-300 hover:shadow-lg"
                    : "bg-slate-50/70 border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Borde izquierdo con código de prioridad */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isAlta ? "bg-red-600" : isMedia ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />

                <div className="p-5 sm:p-6 pl-6 sm:pl-7">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 pr-2">
                      {/* Badges de clasificación */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Indicador no leída */}
                        {isUnread && (
                          <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
                        )}

                        {/* Prioridad */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isAlta
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : isMedia
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {isAlta ? <Flame className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          Prioridad {alerta.prioridad}
                        </span>

                        {/* Tipo de Alerta */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tipoBadge.color}`}
                        >
                          {tipoBadge.label}
                        </span>

                        {/* Rol destinatario */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${roleBadge.color}`}
                        >
                          <roleBadge.icon className="h-3 w-3" />
                          {roleBadge.label}
                        </span>
                      </div>

                      {/* Título de la alerta */}
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                        {alerta.titulo}
                      </h4>

                      {/* Mensaje descriptivo */}
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {alerta.mensaje}
                      </p>

                      {/* Convocatoria vinculada si existe */}
                      {alerta.convocatoria_nombre && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Layers className="h-3 w-3 text-red-600" />
                            {alerta.convocatoria_nombre}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Vencimiento & Countdown Badge */}
                    <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0">
                      {getVencimientoBadge(alerta.fecha_vencimiento)}
                      <span className="text-[11px] text-slate-400 font-mono">
                        Límite: {new Date(alerta.fecha_vencimiento).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  </div>

                  {/* Barra inferior de la tarjeta con acciones directas */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Emitida {new Date(alerta.fecha_creacion).toLocaleDateString("es-CO")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleLeida(alerta.id_alerta, alerta.leida, e)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                        title={alerta.leida ? "Marcar como no leída" : "Marcar como leída"}
                      >
                        {alerta.leida ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>Marcar no leída</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Marcar leída</span>
                          </>
                        )}
                      </button>

                      {alerta.modulo_destino && (
                        <button
                          type="button"
                          onClick={(e) => handleActionClick(alerta.modulo_destino, e)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-[11px] font-bold transition-colors"
                        >
                          <span>Resolver compromiso</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 5. MODAL DE DETALLE COMPLETO DEL COMPROMISO / ALERTA */}
      {detalleAlerta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    detalleAlerta.prioridad === "alta"
                      ? "bg-red-100 text-red-700"
                      : detalleAlerta.prioridad === "media"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                    Detalle del Compromiso
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {detalleAlerta.titulo}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetalleAlerta(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metadatos */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Nivel de Prioridad:</span>
                <span className="font-bold uppercase tracking-wider text-slate-800">
                  {detalleAlerta.prioridad}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Rol Destinatario:</span>
                <span className="font-bold text-slate-800 capitalize">
                  {ROLE_INFO[detalleAlerta.rol_destinatario]?.label || detalleAlerta.rol_destinatario}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Fecha y Hora Límite:</span>
                <span className="font-bold text-red-700">
                  {formatDateTime(detalleAlerta.fecha_vencimiento)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Estado de Lectura:</span>
                <span className={`font-bold ${detalleAlerta.leida ? "text-slate-700" : "text-red-600"}`}>
                  {detalleAlerta.leida ? "Leída" : "Pendiente de lectura"}
                </span>
              </div>

              {detalleAlerta.convocatoria_nombre && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Convocatoria:</span>
                  <span className="font-bold text-slate-900">{detalleAlerta.convocatoria_nombre}</span>
                </div>
              )}
            </div>

            {/* Mensaje completo */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Instrucciones / Descripción del Compromiso:
              </h5>
              <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5 whitespace-pre-line">
                {detalleAlerta.mensaje}
              </p>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleToggleLeida(detalleAlerta.id_alerta, detalleAlerta.leida)
                }
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {detalleAlerta.leida ? "Marcar no leída" : "Marcar como leída"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetalleAlerta(null)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cerrar
                </button>

                {detalleAlerta.modulo_destino && (
                  <button
                    type="button"
                    onClick={() => {
                      const mod = detalleAlerta.modulo_destino;
                      setDetalleAlerta(null);
                      handleActionClick(mod);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                  >
                    <span>Ir a la pantalla del módulo</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

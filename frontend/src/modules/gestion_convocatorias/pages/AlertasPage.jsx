import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
  Search,
  RefreshCw,
  Layers,
  GraduationCap,
  BookOpen,
  Award,
  ClipboardCheck,
  ChevronRight,
  EyeOff,
  Flame,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  BLOQUE_SUAVE,
  BOTON_FANTASMA,
  BOTON_PRIMARIO,
  BOTON_PRIMARIO_SM,
  BOTON_SECUNDARIO,
  BOTON_SECUNDARIO_SM,
  Buscador,
  Cargando,
  Distintivo,
  EncabezadoPagina,
  EstadoVacio,
  Modal,
  Pestanas,
  Selector,
  claseOpcion,
} from "../../../components/ui";
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
  },
  tutor: {
    label: "Tutor Académico",
    icon: BookOpen,
  },
  mentor: {
    label: "Mentor Especializado",
    icon: Award,
  },
  evaluador: {
    label: "Evaluador de Iniciativas",
    icon: ClipboardCheck,
  },
  coordinador: {
    label: "Coordinador de Emprendimiento",
    icon: Layers,
  },
  admin: {
    label: "Administrador del Sistema",
    icon: Layers,
  },
  direccion_del_programa: {
    label: "Dirección de Programa",
    icon: Award,
  },
};

const TIPO_INFO = {
  vencimiento_convocatoria: {
    label: "Vencimiento de Convocatoria",
  },
  compromiso_tutoria: {
    label: "Compromiso de Tutoría",
  },
  compromiso_mentoria: {
    label: "Compromiso de Mentoría",
  },
  evaluacion_pendiente: {
    label: "Evaluación Pendiente",
  },
  entrega_documentacion: {
    label: "Entrega de Documentos",
  },
  cierre_periodo: {
    label: "Cierre y Supervisión",
  },
  general: {
    label: "Aviso General",
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
      return { texto: "Vencida", urgente: true, tono: "rojo" };
    }
    if (diffHoras <= 24) {
      return { texto: "Cierra en menos de 24h", urgente: true, tono: "rojo" };
    }
    if (diffHoras <= 48) {
      return { texto: "Cierra en 48 horas", urgente: true, tono: "alerta" };
    }
    if (diffDias <= 7) {
      return { texto: `Vence en ${diffDias} días`, urgente: false, tono: "oscuro" };
    }
    return { texto: `Vence en ${diffDias} días`, urgente: false, tono: "gris" };
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
      {/* 1. ENCABEZADO E INDICADORES */}
      <EncabezadoPagina
        seccion="Periodo Académico 2026-1 · Universidad Francisco de Paula Santander"
        titulo="Centro de Alertas y Vencimientos"
        descripcion={
          <>
            <Distintivo tono="oscuro" icono={RoleIcon} className="mb-2">
              {roleConfig.label}
            </Distintivo>
            <p>
              Supervisión de plazos, convocatorias vigentes y compromisos académicos asignados a tu rol de {roleConfig.label}.
            </p>
          </>
        }
        acciones={
          <>
            {resumen.no_leidas > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                className={BOTON_SECUNDARIO}
                title="Marcar todas como leídas"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" />
                Marcar leídas ({resumen.no_leidas})
              </button>
            )}
            <button type="button" onClick={handleSincronizar} disabled={isRefreshing} className={BOTON_PRIMARIO}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isRefreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveTab("pendientes")}
            aria-pressed={activeTab === "pendientes"}
            className={claseOpcion(activeTab === "pendientes")}
          >
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pendientes por revisar</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  resumen.no_leidas > 0 ? "bg-ufps text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {resumen.no_leidas > 0 ? (
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
            </span>
            <span className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold leading-none text-slate-900">{resumen.no_leidas}</span>
              <span className="text-xs font-medium text-slate-500">
                {resumen.no_leidas === 1 ? "aviso sin leer" : "avisos sin leer"}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("urgentes")}
            aria-pressed={activeTab === "urgentes"}
            className={claseOpcion(activeTab === "urgentes")}
          >
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alta Prioridad / Críticas</span>
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  resumen.alta_prioridad > 0 ? "bg-ufps text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </span>
            <span className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold leading-none text-slate-900">{resumen.alta_prioridad}</span>
              <span className="text-xs font-medium text-slate-500">vencen en &lt; 48 horas</span>
            </span>
          </button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Próximos 7 días</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold leading-none text-slate-900">{resumen.proximas_a_vencer}</span>
              <span className="text-xs font-medium text-slate-500">compromisos en calendario</span>
            </div>
          </div>
        </div>
      </EncabezadoPagina>

      {/* 2. PESTAÑAS + BÚSQUEDA + ORDEN */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Pestanas
          etiqueta="Estado de las alertas"
          valor={activeTab}
          onChange={setActiveTab}
          opciones={[
            { id: "todas", label: "Todas", count: resumen.total },
            { id: "pendientes", label: "No Leídas", count: resumen.no_leidas },
            { id: "urgentes", label: "Críticas", count: resumen.alta_prioridad },
            { id: "leidas", label: "Leídas" },
          ]}
        />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:max-w-lg">
          <Buscador className="flex-1" valor={searchTerm} onChange={setSearchTerm} placeholder="Buscar alertas…" />
          <Selector
            className="sm:w-52"
            valor={orden}
            onChange={setOrden}
            aria-label="Ordenar alertas"
            opciones={[
              { valor: "vencimiento_asc", texto: "Próximas a vencer" },
              { valor: "recientes", texto: "Más recientes" },
              { valor: "prioridad", texto: "Mayor prioridad" },
            ]}
          />
        </div>
      </div>

      {/* 3. LISTADO DE ALERTAS */}
      {loading ? (
        <Cargando texto={`Consultando alertas de ${roleConfig.label}…`} />
      ) : alertasFiltradas.length === 0 ? (
        searchTerm || activeTab !== "todas" ? (
          <EstadoVacio
            icono={Search}
            titulo="No se encontraron alertas con estos criterios"
            accion={
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setActiveTab("todas");
                }}
                className={BOTON_SECUNDARIO}
              >
                Restablecer filtros
              </button>
            }
          >
            Prueba ajustando el término de búsqueda o cambiando la pestaña activa.
          </EstadoVacio>
        ) : (
          <EstadoVacio icono={CheckCircle2} titulo="¡Estás al día! No tienes alertas ni compromisos pendientes">
            No hay avisos ni vencimientos activos registrados para tu rol de{" "}
            <strong className="text-slate-800">{roleConfig.label}</strong>. Cuando se publiquen nuevas convocatorias o se
            asignen compromisos, los verás aquí.
          </EstadoVacio>
        )
      ) : (
        <ul className="space-y-3">
          {alertasFiltradas.map((item) => {
            const vInfo = calcularEstadoVencimiento(item.fecha_vencimiento);
            const tipoConfig = TIPO_INFO[item.tipo] || TIPO_INFO.general;
            const esAlta = item.prioridad === "alta";
            const esMedia = item.prioridad === "media";
            const barra = esAlta ? "bg-ufps" : esMedia ? "bg-slate-800" : "bg-slate-300";

            return (
              <li
                key={item.id_alerta}
                onClick={() => setDetalleAlerta(item)}
                className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white py-5 pl-6 pr-5 shadow-sm transition-shadow hover:shadow-md ${
                  item.leida ? "border-slate-200" : "border-slate-300"
                }`}
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${barra}`} aria-hidden="true" />
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!item.leida ? (
                        <Distintivo tono="rojo">No leída</Distintivo>
                      ) : (
                        <Distintivo tono="gris" icono={CheckCircle2}>
                          Leída
                        </Distintivo>
                      )}
                      <Distintivo
                        tono={esAlta ? "alerta" : esMedia ? "oscuro" : "contorno"}
                        icono={esAlta ? Flame : esMedia ? AlertTriangle : undefined}
                      >
                        Prioridad {item.prioridad?.toUpperCase()}
                      </Distintivo>
                      <Distintivo tono="contorno">{tipoConfig.label}</Distintivo>
                      {item.convocatoria_nombre && (
                        <span className="text-xs font-medium text-slate-500">{item.convocatoria_nombre}</span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold leading-snug text-slate-900">{item.titulo}</h3>
                    <p className="line-clamp-2 max-w-3xl text-sm leading-relaxed text-slate-600">{item.mensaje}</p>

                    {vInfo && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Distintivo tono={vInfo.tono} icono={Clock}>
                          {vInfo.texto}
                        </Distintivo>
                        {item.fecha_vencimiento && (
                          <span className="text-xs font-medium text-slate-500">
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

                  <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-t-0 sm:pt-0">
                    {item.modulo_destino && onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => handleIrAlModulo(item.modulo_destino, e)}
                        className={BOTON_PRIMARIO_SM}
                      >
                        Resolver
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleToggleLeida(item.id_alerta, item.leida, e)}
                      className={BOTON_SECUNDARIO_SM}
                      title={item.leida ? "Marcar como no leída" : "Marcar como leída"}
                      aria-label={item.leida ? "Marcar como no leída" : "Marcar como leída"}
                    >
                      {item.leida ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <span className="hidden sm:inline">No leída</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
                          <span className="hidden sm:inline">Marcar leída</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 4. MODAL DE DETALLE DE ALERTA */}
      <Modal
        open={Boolean(detalleAlerta)}
        onClose={() => setDetalleAlerta(null)}
        seccion="Detalle del Compromiso"
        titulo={detalleAlerta?.titulo}
        etiquetaCerrar="Cerrar detalle de la alerta"
        pie={
          detalleAlerta && (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => handleToggleLeida(detalleAlerta.id_alerta, detalleAlerta.leida)}
                className={BOTON_FANTASMA}
              >
                {detalleAlerta.leida ? "Marcar como no leída" : "Marcar como leída"}
              </button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <button type="button" onClick={() => setDetalleAlerta(null)} className={BOTON_SECUNDARIO}>
                  Cerrar
                </button>
                {detalleAlerta.modulo_destino && onNavigate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const mod = detalleAlerta.modulo_destino;
                      setDetalleAlerta(null);
                      handleIrAlModulo(mod, e);
                    }}
                    className={BOTON_PRIMARIO}
                  >
                    Ir al módulo
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          )
        }
      >
        {detalleAlerta && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-700">{detalleAlerta.mensaje}</p>
            {detalleAlerta.convocatoria_nombre && (
              <div className={`${BLOQUE_SUAVE} text-sm`}>
                <p className="text-xs font-medium text-slate-500">Convocatoria asociada</p>
                <p className="mt-0.5 font-semibold text-slate-900">{detalleAlerta.convocatoria_nombre}</p>
              </div>
            )}
            {detalleAlerta.fecha_vencimiento && (
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ufps" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">Fecha límite de cumplimiento</p>
                  <p className="mt-0.5 text-slate-600">
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
        )}
      </Modal>
    </div>
  );
}

import { Activity, FolderKanban, GraduationCap } from "lucide-react";
import { Estadistica, Estadisticas } from "../../../components/ui";
import { formatoPorcentaje } from "../utils/filtrosAnalitica";

// Cifras principales del dashboard (HU-14)
export default function TarjetasResumen({ metricas }) {
  const r = metricas?.resumen || {};

  return (
    <Estadisticas columnas="sm:grid-cols-3">
      <Estadistica
        icono={FolderKanban}
        etiqueta="Total proyectos"
        valor={r.total_proyectos ?? "—"}
        detalle={r.total_proyectos != null ? `${r.proyectos_inactivos ?? 0} inactivo(s)` : null}
      />
      <Estadistica
        icono={Activity}
        etiqueta="Activos"
        valor={r.proyectos_activos ?? "—"}
        detalle={`Tasa de actividad ${formatoPorcentaje(r.tasa_actividad)}`}
      />
      <Estadistica
        icono={GraduationCap}
        etiqueta="Estudiantes"
        valor={r.estudiantes_vinculados ?? "—"}
        detalle={`${r.tutores_vinculados ?? 0} tutor(es) · ${r.mentores_vinculados ?? 0} mentor(es)`}
      />
    </Estadisticas>
  );
}

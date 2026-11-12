import React, { useState } from "react";
import { FileText, GraduationCap, Users, Download, Lightbulb } from "lucide-react";
import {
  BLOQUE,
  BOTON_OSCURO,
  Distintivo,
  MensajeError,
  Modal,
  Rotulo,
} from "../../../components/ui";
import { descargarDocumentoIniciativa } from "../services/postulacionService";

function SeccionExpediente({ icono: Icono, titulo, accion, children }) {
  return (
    <section className={`${BLOQUE} space-y-3`}>
      <div className="flex items-center justify-between gap-2">
        <Rotulo as="h4" className="flex items-center gap-1.5">
          <Icono className="h-3.5 w-3.5 text-ufps" aria-hidden="true" />
          {titulo}
        </Rotulo>
        {accion}
      </div>
      {children}
    </section>
  );
}

function DatoExpediente({ etiqueta, children }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{children}</dd>
    </div>
  );
}

export default function DetalleExpedienteModal({ postulacion, onCerrar }) {
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState("");

  if (!postulacion) return null;

  const descargarDocumento = async (archivo) => {
    setDescargando(true);
    setErrorDescarga("");
    try {
      const documento = await descargarDocumentoIniciativa(postulacion.id_iniciativa);
      const url = URL.createObjectURL(documento);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErrorDescarga(error.message || "No se pudo descargar el documento.");
    } finally {
      setDescargando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case "radicada":
        return { label: "Radicada (En espera)", tono: "gris" };
      case "en_revision":
        return { label: "Revisión Documental", tono: "contorno" };
      case "en_evaluacion":
        return { label: "Evaluación Multicriterio", tono: "oscuro" };
      case "aceptada":
        return { label: "Aceptada / Seleccionada", tono: "rojo" };
      default:
        return { label: estado, tono: "gris" };
    }
  };

  const badge = getEstadoBadge(postulacion.estado);

  return (
    <Modal
      open
      onClose={onCerrar}
      ancho="3xl"
      seccion={`Radicado ${postulacion.radicado}`}
      titulo="Expediente Digital Único de la Iniciativa"
      subtitulo={
        <div className="mt-2">
          <Distintivo tono={badge.tono}>{badge.label}</Distintivo>
        </div>
      }
      etiquetaCerrar="Cerrar expediente"
      pie={
        <button type="button" onClick={onCerrar} className={BOTON_OSCURO}>
          Cerrar Expediente
        </button>
      }
    >
      <div className="space-y-4">
        <SeccionExpediente
          icono={Lightbulb}
          titulo="Datos de la Iniciativa"
          accion={postulacion.iniciativa?.tipo && <Distintivo tono="contorno">{postulacion.iniciativa.tipo}</Distintivo>}
        >
          <h4 className="text-base font-semibold text-slate-900">{postulacion.iniciativa?.titulo}</h4>
          <div>
            <p className="text-xs font-semibold text-slate-700">Descripción</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{postulacion.iniciativa?.resumen_ejecutivo}</p>
          </div>
          <dl className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <DatoExpediente etiqueta="Sector tecnológico">{postulacion.iniciativa?.sector_tecnologico || "—"}</DatoExpediente>
            <DatoExpediente etiqueta="Etapa actual">{postulacion.iniciativa?.etapa_actual || "—"}</DatoExpediente>
          </dl>
        </SeccionExpediente>

        <SeccionExpediente icono={GraduationCap} titulo="Declaración de Origen Académico">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatoExpediente etiqueta="Modalidad de Origen">
              <span className="capitalize">{postulacion.origen_academico?.tipo?.replace(/_/g, " ")}</span>
            </DatoExpediente>
            <DatoExpediente etiqueta="Detalle del origen">{postulacion.origen_academico?.detalle_origen || "—"}</DatoExpediente>
          </dl>
        </SeccionExpediente>

        <SeccionExpediente icono={Users} titulo="Estudiante Postulante">
          <div className="flex flex-col gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm">
              <span className="font-semibold text-slate-900">{postulacion.equipo?.lider?.nombre}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">({postulacion.equipo?.lider?.correo})</span>
            </div>
            <Distintivo tono="oscuro">Autor de la Iniciativa</Distintivo>
          </div>
        </SeccionExpediente>

        <SeccionExpediente icono={FileText} titulo="Documento adjunto">
          <ul className="space-y-2">
            {postulacion.documentacion?.archivos?.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => descargarDocumento(file)}
                  disabled={descargando}
                  className="flex min-w-0 items-center gap-2 rounded-md text-left text-sm text-slate-900 hover:text-ufps focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ufps/15 disabled:cursor-wait disabled:opacity-60"
                  title="Descargar PDF"
                >
                  <FileText className="h-4 w-4 shrink-0 text-ufps" aria-hidden="true" />
                  <span className="truncate font-medium underline decoration-slate-300 underline-offset-2">{file.nombre}</span>
                  <span className="shrink-0 text-xs text-slate-400">({file.tamanio})</span>
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                </button>
                <span className="shrink-0 text-xs font-semibold text-slate-500">{descargando ? "Descargando..." : "PDF"}</span>
              </li>
            ))}
          </ul>
          <MensajeError>{errorDescarga}</MensajeError>
        </SeccionExpediente>
      </div>
    </Modal>
  );
}

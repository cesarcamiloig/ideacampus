import { useState } from "react";
import { FileSpreadsheet, Globe } from "lucide-react";
import { EncabezadoPagina, Pestanas } from "../../../components/ui";
import GestionCatalogoPanel from "../components/GestionCatalogoPanel";
import InformesPanel from "../components/InformesPanel";

const SECCIONES = [
  { id: "informes", label: "Informes exportables", icono: FileSpreadsheet },
  { id: "catalogo", label: "Catálogo público", icono: Globe },
];

// HU-15: el coordinador genera informes exportables y mantiene el catálogo público de iniciativas
export default function CatalogoInformesPage() {
  const [seccion, setSeccion] = useState("informes");

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        seccion="Difusión de resultados"
        titulo="Catálogo e Informes"
        descripcion="Genera informes de las iniciativas para descargar en Excel o CSV y decide qué iniciativas aprobadas se difunden en el catálogo público."
      >
        <Pestanas etiqueta="Secciones de catálogo e informes" opciones={SECCIONES} valor={seccion} onChange={setSeccion} />
      </EncabezadoPagina>

      {seccion === "informes" ? <InformesPanel /> : <GestionCatalogoPanel />}
    </div>
  );
}

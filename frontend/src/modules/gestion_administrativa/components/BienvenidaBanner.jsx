import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Distintivo, SECCION, TARJETA } from "../../../components/ui";

/** Panel de bienvenida institucional que se muestra al iniciar sesión. */
export default function BienvenidaBanner({ roleConfig, usuario }) {
  const RoleIcon = roleConfig.icon;

  return (
    <section className={`${TARJETA} p-5 sm:p-6`}>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className={SECCION}>Bienvenida</p>
          <h1 className="break-words text-xl font-bold tracking-tight text-slate-900">
            ¡Bienvenido(a), {usuario?.nombre || "Usuario Institucional"}!
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">{roleConfig.subtitle}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Distintivo tono="oscuro" icono={RoleIcon}>
              {roleConfig.roleName}
            </Distintivo>
            <Distintivo tono="contorno" icono={CheckCircle2}>
              Sesión activa
            </Distintivo>
          </div>
        </div>

        <div className="hidden flex-col items-end space-y-1 border-l border-slate-100 pl-6 text-right text-xs text-slate-500 lg:flex">
          <span className="font-semibold text-slate-800">Universidad Francisco de Paula Santander</span>
          <span>Programa de Ingeniería de Sistemas</span>
          <span className="font-mono text-[11px] text-slate-400">{usuario?.correo || "@ufps.edu.co"}</span>
        </div>
      </div>
    </section>
  );
}

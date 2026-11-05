import React from "react";
import { CheckCircle2 } from "lucide-react";

/** Panel de bienvenida institucional que se muestra al iniciar sesión. */
export default function BienvenidaBanner({ roleConfig, usuario }) {
  const RoleIcon = roleConfig.icon;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-red-500 to-rose-600" />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleConfig.badgeColor}`}
            >
              <RoleIcon className="h-3.5 w-3.5" />
              {roleConfig.roleName}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Sesión activa
            </span>
          </div>

          <h1 className="break-words text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            ¡Bienvenido(a), {usuario?.nombre || "Usuario Institucional"}!
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            {roleConfig.subtitle}
          </p>
        </div>

        <div className="hidden lg:flex flex-col items-end text-right border-l border-slate-100 pl-6 text-xs text-slate-500 space-y-1">
          <span className="font-semibold text-slate-800">
            Universidad Francisco de Paula Santander
          </span>
          <span>Programa de Ingeniería de Sistemas</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {usuario?.correo || "@ufps.edu.co"}
          </span>
        </div>
      </div>
    </section>
  );
}

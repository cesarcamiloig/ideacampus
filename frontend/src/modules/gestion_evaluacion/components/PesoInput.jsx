import { PESO_TOTAL } from "../utils/rubricaUtils"

const TAMANOS = {
    lg: "h-12 w-28 text-lg",
    md: "h-11 w-24 text-base",
}

function redondear(valor) {
    return Math.round(valor * 100) / 100
}

// Campo de porcentaje: texto con teclado decimal (la rueda del mouse no cambia el valor),
// ↑/↓ suben o bajan 1 punto y Shift + ↑/↓ suben o bajan 10.
export default function PesoInput({
    id,
    value,
    onChange,
    invalid = false,
    describedBy,
    label,
    tamano = "md",
    onFocus,
    onBlur,
}) {
    function manejarCambio(texto) {
        const limpio = texto.replace(",", ".").replace(/[^\d.]/g, "")
        const [entero, ...resto] = limpio.split(".")
        onChange(resto.length > 0 ? `${entero}.${resto.join("")}` : entero)
    }

    function manejarTecla(e) {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return
        e.preventDefault()
        const paso = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1)
        const siguiente = Math.min(PESO_TOTAL, Math.max(0, redondear((Number(value) || 0) + paso)))
        onChange(String(siguiente))
    }

    return (
        <div
            className={`group relative flex shrink-0 items-baseline rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 transition-[box-shadow,background-color] duration-150 ease-out-suave focus-within:ring-2 focus-within:ring-ufps motion-reduce:transition-none ${invalid ? "bg-ufps-suave ring-ufps" : "ring-slate-200 hover:ring-slate-300"
                } ${TAMANOS[tamano]}`}
        >
            <input
                id={id}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                onChange={(e) => manejarCambio(e.target.value)}
                onKeyDown={manejarTecla}
                onFocus={(e) => {
                    e.target.select()
                    onFocus?.()
                }}
                onBlur={onBlur}
                aria-label={label}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className="h-full w-full min-w-0 rounded-xl bg-transparent pl-3 pr-7 text-right font-semibold tabular-nums text-slate-900 focus:outline-none"
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base font-medium text-slate-500"
            >
                %
            </span>
        </div>
    )
}

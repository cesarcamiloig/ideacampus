import { useEffect, useRef } from "react"

// Mantiene los datos al día sin recargar la página: llama a `refrescar` cada `intervaloMs`
// mientras la pestaña está visible y, además, apenas el usuario vuelve a ella.
export function useRefrescoPeriodico(refrescar, intervaloMs = 15000) {
    const refrescarRef = useRef(refrescar)

    useEffect(() => {
        refrescarRef.current = refrescar
    }, [refrescar])

    useEffect(() => {
        function siVisible() {
            if (document.visibilityState === "visible") refrescarRef.current?.()
        }
        const intervalo = window.setInterval(siVisible, intervaloMs)
        document.addEventListener("visibilitychange", siVisible)
        window.addEventListener("focus", siVisible)
        return () => {
            window.clearInterval(intervalo)
            document.removeEventListener("visibilitychange", siVisible)
            window.removeEventListener("focus", siVisible)
        }
    }, [intervaloMs])
}

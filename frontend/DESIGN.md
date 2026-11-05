---
name: PaperLab
description: Aplicación WebAR para superponer física, circuitos, algoritmos y geometría sobre papel real
colors:
  paper-light: "#f4ecd8"
  paper-dark: "#17112a"
  surface-light: "#fffaf0"
  surface-dark: "#221a3c"
  ink-light: "#211a33"
  ink-dark: "#f4ecd8"
  riso-blue: "#2f4bf0"
  riso-pink: "#ff4f9e"
  riso-yellow: "#ffc81f"
  riso-green: "#12a96e"
  riso-tomato: "#ff5435"
  chart-a: "#2f4bf0 (oscuro: #7088ff)"
  chart-b: "#f73f93"
typography:
  display:
    fontFamily: "Bagel Fat One, sans-serif"
    use: "Solo titulares grandes (≥ 24px)"
  heading:
    fontFamily: "Gabarito, sans-serif"
    fontWeight: 900
  body:
    fontFamily: "Gabarito, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "Martian Mono, monospace"
  hand:
    fontFamily: "Gochi Hand, cursive"
    use: "Notas al margen ('¡a escanear!', 'paso 1 →')"
rounded:
  card: "20px"
  chip: "999px"
borders: "2.5px de tinta (--ink)"
shadow: "Dura desplazada 5px 5px 0 (--hard-shadow), sin desenfoque"
motion:
  spring: "--ease-spring (linear() con rebote)"
  squish: "--ease-squish cubic-bezier(0.34, 1.8, 0.5, 1)"
---

# Design System: PaperLab · Riso Lab

## 1. Principios
- **Zine de laboratorio, no SaaS**: tintas de risografía sobre papel de cuaderno. Bordes de tinta gruesos, sombras duras desplazadas (como un desregistro de imprenta), stickers girados, cinta adhesiva y garabatos. Nada de degradados morados, glassmorphism ni tarjetas idénticas.
- **Cada disciplina tiene su tinta y su forma**: Física azul, Circuitos amarillo, Algoritmos verde, Matemáticas rosa; cada sticker tiene una esquina distinta "recortada".
- **Juice**: todo responde. Botones gelatina (`.juicy`: squash al presionar, rebote al soltar), ráfagas de confeti de tinta (`data-juice`, `data-juice="big"` añade un sacudón), entradas escalonadas (`.pop-in` con `--i`), títulos palabra por palabra (`.jelly-word`). Todo se apaga con `prefers-reduced-motion`.
  - El sacudón se aplica al `<main>`, nunca a `#root`: un `transform` en un ancestro rompe los `position: fixed` (modales) en mitad del clic.
- **Paleta de Tailwind remapeada** en `index.css` (`@theme`): `cyan → azul riso`, `fuchsia → rosa`, `amber → girasol`, `emerald → verde`, `slate → neutros papel/tinta violeta`. Los componentes heredan las tintas sin tocarlos uno por uno.
- **Día y noche reales**: papel marfil con tinta violeta / noche violeta tinta con papel como tinta. Cada modo define sus propios tokens.

## 2. Hoja de resolución (AR)
- Con foto o captura congelada, el ejercicio se **recorta** (detector propio de tinta con componentes conexas y crecimiento desde la caja de la IA), se blanquea el papel, se borran bordes y renglones, y se pega arriba a la izquierda de una hoja limpia. La solución y la simulación se escriben en el resto de la hoja.
- El globo de Lumi vive abajo a la izquierda y esa zona queda reservada en el layout.
- `?hoja=0` vuelve al modo anterior (escribir sobre la foto); `?ar=live` es el rastreo experimental en vivo.

## 3. Gráficos (modo docente)
- Una sola paleta validada para series (azul/rosa, ΔE CVD ≥ 16). Barras de una sola serie en un solo tono.
- Estados de alumno con ícono + texto (nunca solo color).
- Tooltips al pasar el mouse, etiquetas directas al final de las líneas y vista de tabla en el reporte.

---
name: PaperLab
description: Aplicación WebAR para superponer física, circuitos, algoritmos y geometría sobre papel real
colors:
  bg-light: "#f5f0e6"
  bg-dark: "#070a11"
  surface-light: "#ffffff"
  surface-dark: "#0e1422"
  border-light: "#d8cebd"
  border-dark: "#212c42"
  text-light: "#14171f"
  text-dark: "#f8fafc"
  accent-cyan: "#00f0ff"
  accent-amber: "#f59e0b"
  accent-emerald: "#10b981"
  accent-violet: "#a855f7"
typography:
  display:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.035em"
  mono:
    fontFamily: "DM Mono, monospace"
    fontWeight: 500
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 500
rounded:
  card: "16px"
  button: "12px"
components:
  card:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.card}"
    padding: "24px"
  button-primary:
    backgroundColor: "{colors.accent-cyan}"
    textColor: "#000000"
    rounded: "{rounded.button}"
    padding: "16px 32px"
---

# Design System: PaperLab (Consola Óptica de Campo)

## 1. Principles
- **Fuera de lo Convencional**: Sin plantillas genéricas de SaaS, sin degradados morados sobre blanco, sin orbes estáticos ni tarjetas idénticas.
- **Tipografía con Carácter**:
  - `Bricolage Grotesque`: Títulos de gran personalidad óptica con trampas de tinta mecánicas.
  - `DM Mono`: Telemetría e instrumentación técnica de laboratorio.
  - `Plus Jakarta Sans`: Texto de lectura limpio y legible.
- **Soporte Lumínico Dual Real**:
  - **Modo Día ("Estudio Papel / Archival Parchment")**: `#f5f0e6` con tinta oscura y retícula milimétrica sutil.
  - **Modo Noche ("Consola Óptica")**: `#070a11` con líneas de alineación holográfica y acentos fluorescentes.
- **Cámara Primero**: Al seleccionar cualquiera de las 4 disciplinas (Física, Circuitos, Algoritmos, Geometría), se solicita de inmediato el permiso de la cámara física del móvil/computador para proyectar sobre el papel real.

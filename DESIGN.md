---
name: PaperLab
description: Laboratorio escolar de ciencias en papel aumentado mediante WebAR offline
colors:
  desk-mat: "#12151e"
  desk-header: "#0d1017"
  paper-sheet: "#faf7ee"
  paper-grid: "rgba(59, 130, 246, 0.10)"
  blueprint-bg: "#0c1e38"
  blueprint-grid: "rgba(255, 255, 255, 0.08)"
  graphite-ink: "#0f172a"
  ar-cyan: "#00f0ff"
  ar-amber: "#f59e0b"
  ar-emerald: "#10b981"
  ar-violet: "#a855f7"
  stamp-red: "#dc2626"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontWeight: 900
    letterSpacing: "-0.02em"
  handwritten:
    fontFamily: "Caveat, cursive"
    fontWeight: 700
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 700
rounded:
  tab: "12px"
  notebook: "24px"
---

# Design System: PaperLab (Mesa de Trazado & Cuaderno Aumentado)

## 1. Physical World & Metaphor
PaperLab rechaza la plantilla de tarjetas genéricas AI (SaaS oscuro con orbes borrosos). En su lugar, el sistema visual se ancla en el **cuaderno de campo de laboratorio físico** encuadernado en espiral sobre una mesa de dibujo técnico.

- **Mesa de corte / Tapete de dibujo (`#12151e`)**: Cuadrícula métrica ortogonal con marcas de coordenadas milimétricas.
- **Cuaderno encuadernado (`#faf7ee`)**: Papel cuadriculado de 5mm con anillas metálicas y pestañas troqueladas de colores para cada materia.
- **Capa WebAR**: Proyección holográfica de haces láser y retículas sobre el grafito físico.

## 2. Pestañas de Materias (Tabs Indexados)
- **1. Física**: Cian Técnico (`#00f0ff`)
- **2. Circuitos**: Ámbar Voltio (`#f59e0b`)
- **3. Algoritmos**: Esmeralda Lógico (`#10b981`)
- **4. Geometría**: Violeta Euclidiano (`#a855f7`)

## 3. Hoja Técnica "En Construcción"
Al navegar a cualquiera de los módulos, la libreta se transforma en un **plano de cianotipia (blueprint)** sujetado con cinta de carrocero (masking tape), que incluye un sello de tinta roja interactivo (`[APROBADO PARA PRODUCCIÓN]`), indicador de ensamblaje WebAR y acción para recibir alertas.


export interface ColorToken {
  name: string;
  role: string;
  hex: string;
  twClass: string;
  glow: string;
  description: string;
}

export interface DesignTheme {
  primaryPalette: ColorToken[];
  paperMaterials: ColorToken[];
  moduleThemes: {
    physics: {
      title: string;
      accent: string;
      secondary: string;
      badge: string;
      glow: string;
      icon: string;
      bgGradient: string;
    };
    circuits: {
      title: string;
      accent: string;
      secondary: string;
      badge: string;
      glow: string;
      icon: string;
      bgGradient: string;
    };
    flowcharts: {
      title: string;
      accent: string;
      secondary: string;
      badge: string;
      glow: string;
      icon: string;
      bgGradient: string;
    };
    math: {
      title: string;
      accent: string;
      secondary: string;
      badge: string;
      glow: string;
      icon: string;
      bgGradient: string;
    };
  };
}

export const paperLabPalette: ColorToken[] = [
  {
    name: "Cian Láser AR (AR Photon)",
    role: "Acento Principal / Escáner WebAR",
    hex: "#00f0ff",
    twClass: "bg-cyan-400 text-black",
    glow: "rgba(0, 240, 255, 0.4)",
    description: "Representa el haz de luz holográfico de la cámara AR cuando detecta el cuaderno."
  },
  {
    name: "Ámbar Voltaje (Circuit Spark)",
    role: "Energía & Circuitos Eléctricos",
    hex: "#f59e0b",
    twClass: "bg-amber-500 text-black",
    glow: "rgba(245, 158, 11, 0.4)",
    description: "Simula el flujo de electrones y chispas sobre los trazos de grafito real."
  },
  {
    name: "Esmeralda Cuántico (Logic Pulse)",
    role: "Algoritmos & Diagramas de Flujo",
    hex: "#10b981",
    twClass: "bg-emerald-500 text-black",
    glow: "rgba(16, 185, 129, 0.4)",
    description: "Indica ejecución exitosa de nodos lógicos y validación de pseudocódigo."
  },
  {
    name: "Violeta Prisma (Math Vector)",
    role: "Geometría & Demostraciones",
    hex: "#a855f7",
    twClass: "bg-purple-500 text-white",
    glow: "rgba(168, 85, 247, 0.4)",
    description: "Destaca vectores, hipotenusas, arcos de ángulos y funciones trigonométricas."
  },
  {
    name: "Obsidiana Espacial (Lab Dark)",
    role: "Fondo Profundo del Laboratorio",
    hex: "#0b0f19",
    twClass: "bg-slate-950 text-slate-100",
    glow: "rgba(11, 15, 25, 0.8)",
    description: "Permite que la fluorescencia de los hologramas resalte con máxima inmersión."
  },
  {
    name: "Pergamino Cuaderno (Draft Paper)",
    role: "Papel de Cuaderno Analógico",
    hex: "#faf7f0",
    twClass: "bg-[#faf7f0] text-slate-900",
    glow: "rgba(250, 247, 240, 0.2)",
    description: "El soporte físico real: textura cálida de cuaderno cuadriculado escolar."
  }
];

export const moduleThemeConfig = {
  physics: {
    id: 'physics',
    title: 'Simulaciones de Física',
    subtitle: 'Mecánica, gravedad y vectores sobre lápiz',
    accent: '#00f0ff',
    secondary: '#38bdf8',
    badge: 'Mecánica Clásica AR',
    glow: 'shadow-[0_0_25px_rgba(0,240,255,0.35)]',
    cardBorder: 'border-cyan-500/30 hover:border-cyan-400',
    icon: 'Atom',
    bgGradient: 'from-cyan-950/40 via-slate-900/60 to-slate-950/80',
    tags: ['Gravedad', 'Plano Inclinado', 'Péndulo', 'Fricción'],
    summary: 'Dibuja una rampa o un péndulo con lápiz: PaperLab detecta el trazo y simula masas reales rodando con vectores de velocidad y energía viva.'
  },
  circuits: {
    id: 'circuits',
    title: 'Circuitos Eléctricos',
    subtitle: 'Chispas y corriente sobre grafito vivo',
    accent: '#f59e0b',
    secondary: '#fbbf24',
    badge: 'Electrónica Cuántica AR',
    glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]',
    cardBorder: 'border-amber-500/30 hover:border-amber-400',
    icon: 'Zap',
    bgGradient: 'from-amber-950/40 via-slate-900/60 to-slate-950/80',
    tags: ['Ley de Ohm', 'LEDs', 'Interruptores', 'Grafito Conductor'],
    summary: 'Aprovecha que el grafito del lápiz es conductor: dibuja una batería y un LED. PaperLab hace fluir electrones neón y enciende la bombilla.'
  },
  flowcharts: {
    id: 'flowcharts',
    title: 'Diagramas de Flujo & Pseudocódigo',
    subtitle: 'Algoritmos dibujados que cobran vida y compilan',
    accent: '#10b981',
    secondary: '#34d399',
    badge: 'Lógica Computacional AR',
    glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]',
    cardBorder: 'border-emerald-500/30 hover:border-emerald-400',
    icon: 'GitBranch',
    bgGradient: 'from-emerald-950/40 via-slate-900/60 to-slate-950/80',
    tags: ['Condicionales', 'Bucles', 'Paso a Paso', 'Python / JS'],
    summary: 'Dibuja rectángulos, rombos y flechas en tu libreta: la app sigue los caminos lógicos con un token luminoso y genera el código en vivo.'
  },
  math: {
    id: 'math',
    title: 'Matemáticas & Geometría',
    subtitle: 'Teoremas, ángulos y funciones holográficas',
    accent: '#a855f7',
    secondary: '#c084fc',
    badge: 'Geometría Euclidiana AR',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.35)]',
    cardBorder: 'border-purple-500/30 hover:border-purple-400',
    icon: 'Triangle',
    bgGradient: 'from-purple-950/40 via-slate-900/60 to-slate-950/80',
    tags: ['Pitágoras', 'Trigonometría', 'Gráficos f(x)', 'Prismas 3D'],
    summary: 'Traza triángulos y coordenadas a mano: PaperLab proyecta los cuadrados de Pitágoras en 3D, mide ángulos y grafica curvas sobre el papel.'
  }
};


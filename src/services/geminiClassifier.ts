import { getExercisesByModule, getExerciseById } from '../data/exercises';
import type { ExerciseDefinition } from '../data/exercises';

export interface GeminiClassificationResult {
  exercise_id: string;
  exercise_name: string;
  topic_id: string;
  confidence: number;
  detected_elements: string[];
  simulation_ready: boolean;
  parameters: Record<string, unknown>;
  explanation: string;
  fullDefinition?: ExerciseDefinition;
}

export const getStoredApiKey = (): string => {
  return localStorage.getItem('paperlab_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const setStoredApiKey = (key: string): void => {
  if (key.trim()) {
    localStorage.setItem('paperlab_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('paperlab_gemini_api_key');
  }
};

/**
 * Classifies an exercise from an image using Gemini Multimodal Vision API.
 * Constrained to the 19 canonical exercises corresponding to the active module.
 */
export async function classifyExerciseWithGemini(
  base64DataWithHeader: string,
  moduleId: string,
  overrideApiKey?: string
): Promise<GeminiClassificationResult> {
  const apiKey = (overrideApiKey || getStoredApiKey()).trim();
  if (!apiKey) {
    throw new Error('Falta la API Key de Google Gemini. Ingrésala para escanear y clasificar.');
  }

  // Extract pure base64 and mime type
  const mimeMatch = base64DataWithHeader.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = mimeMatch ? mimeMatch[2] : base64DataWithHeader;

  // Retrieve candidate exercises for the active module
  const candidateExercises = getExercisesByModule(moduleId);
  const candidateListStr = candidateExercises.map((ex) => `
- ID: "${ex.id}"
  Nombre: "${ex.name}"
  Descripción: ${ex.description}
  Sintaxis visual esperada: ${ex.visual_syntax.primary_shapes.join(', ')}
  Parámetros a extraer: ${JSON.stringify(ex.extracted_parameters)}
`).join('\n');

  const systemPrompt = `Eres el clasificador de visión por computadora de PaperLab WebAR.
Tu trabajo es identificar con precisión matemática qué ejercicio científico de los trazos a lápiz o bolígrafo en una libreta física está dibujado.
Actualmente el usuario está en el tema/módulo: "${moduleId}".

Debes elegir EXACTAMENTE UNO de los siguientes ejercicios candidatos autorizados:
${candidateListStr}

Instrucciones estrictas:
1. Examina cuidadosamente los trazos manuscritos en la imagen (líneas, figuras geométricas, rótulos numéricos, unidades, variables).
2. Selecciona el 'exercise_id' que mejor represente el dibujo.
3. Extrae los valores numéricos de los parámetros dibujados o anotados al lado (ej: masa m, ángulo theta, voltaje V, resistencias R, ecuaciones). Si el usuario no escribió un número específico, usa los valores por defecto del esquema.
4. Devuelve ÚNICAMENTE un objeto JSON válido con la siguiente estructura:
{
  "exercise_id": "string (debe ser exactamente uno de los IDs de la lista)",
  "exercise_name": "string (nombre oficial del ejercicio)",
  "topic_id": "${moduleId}",
  "confidence": 0.95,
  "detected_elements": ["elemento1", "elemento2"],
  "simulation_ready": true,
  "parameters": {
    // Parámetros numéricos extraídos o inferidos acordes al esquema del ejercicio
  },
  "explanation": "Breve explicación en español de qué se reconoció en la libreta"
}`;

  // State-of-the-art models for multimodal vision with fallback
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error HTTP ${response.status} (${model}): ${errorBody}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('La respuesta de Gemini no contiene datos de texto.');
      }

      const parsed: GeminiClassificationResult = JSON.parse(rawText);
      const fullDef = getExerciseById(parsed.exercise_id);
      parsed.fullDefinition = fullDef;

      // Log immediately to the browser developer console as requested:
      // "en consola debe salir el tipo de ejercicio, con los parametros del json para empezar con la simulacion"
      console.log(
        '%c[PaperLab AI] =========================================',
        'color: #00f0ff; font-weight: bold;'
      );
      console.log(
        '%c[PaperLab AI] 🎯 TIPO DE EJERCICIO IDENTIFICADO:',
        'color: #00f0ff; font-weight: bold; font-size: 15px;',
        parsed.exercise_name,
        `[ID: ${parsed.exercise_id}]`
      );
      console.log(
        '%c[PaperLab AI] ⚙️ PARÁMETROS DEL JSON PARA EMPEZAR SIMULACIÓN:',
        'color: #10b981; font-weight: bold; font-size: 14px;',
        parsed.parameters
      );
      console.log(
        '%c[PaperLab AI] 📦 DEFINICIÓN COMPLETA DEL ESQUEMA:',
        'color: #eab308; font-weight: bold;',
        fullDef || '(No matching schema found)'
      );
      console.log(
        '%c[PaperLab AI] 🔍 ELEMENTOS DETECTADOS:',
        'color: #94a3b8;',
        parsed.detected_elements
      );
      console.log(
        '%c[PaperLab AI] =========================================',
        'color: #00f0ff; font-weight: bold;'
      );

      return parsed;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Intento fallido con ${model}:`, err);
    }
  }

  throw lastError || new Error('No se pudo clasificar el ejercicio con Gemini.');
}

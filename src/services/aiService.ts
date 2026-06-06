import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function generateQuestions(topic: string, count: number = 5) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} multiple-choice questions about the topic: "${topic}". 
    Each question must have exactly 4 options and 1 correct answer (index 0-3). 
    The output must be in JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The question text" },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of 4 options"
            },
            correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" }
          },
          required: ["text", "options", "correctAnswer"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

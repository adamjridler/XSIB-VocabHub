import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});
async function run() {
  try {
    const res = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: "Say hi" });
    console.log(res.text);
  } catch (e) {
    console.error(e);
  }
}
run();

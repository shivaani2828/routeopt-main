import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup API Key (Vite/Frontend way)
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: VITE_GEMINI_API_KEY is missing in .env");
}

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(API_KEY);

// 🔥 UPDATED MODEL NAME
const MODEL_NAME = "gemini-2.5-flash";

/**
 * 🛠️ HELPER: Convert Browser File to Base64
 * Required because browsers don't use 'Buffer' like Node.js
 */
const fileToGenerativePart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result looks like "data:image/jpeg;base64,....."
      // We only need the part AFTER the comma
      const base64Data = reader.result.split(",")[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ==========================================
// 🛡️ FEATURE A: ID CARD VERIFICATION
// ==========================================
export const verifyIDCard = async (file) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      Analyze this image. It is an Organizational ID Card (Student ID or Employee ID).
      
      CRITICAL EXTRACTION TASK:
      1. **Extract Name**: Find the full name of the person.
      2. **Extract Institution**: Find the name of the college, university, or company.
      3. **Validity Check**: Mark as 'isValid: true' if it looks like a real ID card with a photo and name.
      
      Return ONLY raw JSON (no markdown):
      {
        "isValid": boolean, 
        "name": "string", 
        "institution": "string",
        "reason": "explanation if invalid"
      }
    `;

    // Convert browser file to format Gemini accepts
    const imagePart = await fileToGenerativePart(file);

    console.log(`Sending ID to Gemini (${MODEL_NAME})...`);
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean markdown formatting if present
    const jsonStr = text.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Verification Error:", error.message);
    // Return pending status so Admin can handle it manually
    return { isValid: false, isPending: true, reason: "AI Extraction Failed" };
  }
};

// ==========================================
// 🌿 FEATURE B: ECO-LOOP AI COACH
// ==========================================
export const generateEcoTip = async (kmSaved, co2Saved) => {
  try {
    const km = Math.round(kmSaved || 0);
    const co2 = Math.round(co2Saved || 0);

    // If stats are very low, give a "Welcome" message immediately without calling AI
    if (km <= 5 && co2 <= 1) {
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              "Take your first shared ride today to unlock AI-powered eco-insights!"
            ),
          800
        )
      );
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      Context: You are an enthusiastic AI coach for a carpooling app focused on sustainability.
      Data: This user has saved ${km} kilometers of driving and avoided ${co2} kg of CO2 emissions so far.
      
      Task: Generate a single, short, punchy, 1-sentence motivational "Green Fact" or specific comparison based on this data to encourage them.
      
      Examples of desired tone: 
      - "That's enough energy saved to charge over 500 smartphones!"
      - "You've offset the equivalent carbon of planting two new trees this month!"
      - "Incredible work; your choices are making the campus air cleaner every day."
      
      Constraint: Return ONLY the single sentence. Do not add quotation marks around the output.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/^"|"$/g, "").trim();

    return text;
  } catch (error) {
    console.error("Gemini Eco-Tip API Error:", error);
    return "Your sustainable choices are making a real difference. Keep it up!";
  }
};

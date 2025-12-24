import { getAI, VertexAIBackend, getGenerativeModel } from "firebase/ai";
import { getApp } from "firebase/app";

export interface PostureAnalysisResult {
  head_posture: { status: string; description: string; deviation_degrees?: number };
  shoulder_alignment: { status: string; description: string; vertical_offset_cm?: number };
  pelvic_position: { status: string; description: string; tilt_degrees?: number };
  risk_flags: string[];
}

export async function analyzePostureImage(imageUrl: string, view: 'front' | 'side-right' | 'side-left' | 'back'): Promise<PostureAnalysisResult> {
  try {
    const firebaseApp = getApp();
    const ai = getAI(firebaseApp, { backend: new VertexAIBackend() });
    
    // Use Gemini 1.5 Flash for speed and reliability
    const model = getGenerativeModel(ai, { 
      model: "gemini-1.5-flash-002"
    });

    const prompt = `
      You are an expert Biomechanics and Posture Analyst. 
      Analyze the attached image of a person from the ${view} view.
      Assume the camera was perfectly vertical.
      The person is standing within a guide box.

      TASK:
      1. Measure head deviation from the vertical axis in degrees. (Positive = right/forward, Negative = left/back)
      2. Measure shoulder imbalance (vertical height difference) in cm.
      3. Measure pelvic tilt or rotation in degrees.
      4. Identify risk flags based on these findings.

      Return ONLY a JSON object with this EXACT structure:
      {
        "head_posture": { 
          "status": "Neutral | Slight Deviation | Severe Deviation", 
          "description": "Short summary of finding",
          "deviation_degrees": number 
        },
        "shoulder_alignment": { 
          "status": "Neutral | Slight Deviation | Severe Deviation", 
          "description": "Short summary",
          "vertical_offset_cm": number 
        },
        "pelvic_position": { 
          "status": "Neutral | Slight Deviation | Severe Deviation", 
          "description": "Short summary",
          "tilt_degrees": number 
        },
        "risk_flags": ["list of string flags"]
      }
    `;

    // Handle data URL vs raw base64
    let base64Data = imageUrl;
    if (imageUrl.startsWith('data:')) {
      base64Data = imageUrl.split(',')[1];
    }

    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const aiResponse = await result.response;
    const text = aiResponse.text();
    
    // Robust JSON extraction
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1) throw new Error('Invalid AI response');
    const jsonString = text.substring(startIdx, endIdx + 1);
    return JSON.parse(jsonString);

  } catch (err) {
    console.error('Posture Analysis Error:', err);
    throw new Error('Failed to analyze posture image.');
  }
}

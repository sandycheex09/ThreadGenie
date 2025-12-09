import { GoogleGenAI } from "@google/genai";

// Helper to ensure we always use the latest API KEY from the environment/session
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const EMBROIDERY_PROMPT = `
Transform this image into a high-quality, realistic embroidery patch. 
The design should simulate stitched thread textures with high detail. 
Use vibrant, thread-like colors. 
CRITICAL: The background MUST be a solid, flat, pure white color (#FFFFFF) completely distinct from the subject to allow for easy background removal.
Ensure the edges of the patch are clean and simulate a stitched border.
`;

/**
 * Encodes a File object to a base64 string.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Transforms an image to embroidery style using Gemini.
 */
export const generateEmbroidery = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: EMBROIDERY_PROMPT,
          },
        ],
      },
    });

    return extractImageFromResponse(response);
  } catch (error) {
    console.error("Error generating embroidery:", error);
    throw error;
  }
};

/**
 * Edits an image based on a user prompt using Gemini.
 */
export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `Edit this image based on the following instruction: ${prompt}. Maintain the high quality. If the user asks for embroidery, use a realistic stitched texture style.`,
          },
        ],
      },
    });

    return extractImageFromResponse(response);
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

/**
 * Upscales an image to 4K resolution using Gemini 3 Pro.
 */
export const upscaleImage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Upscale this image to 4K resolution. Enhance details, sharpness, and texture clarity while strictly preserving the original content and style.",
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: "4K"
        }
      }
    });

    return extractImageFromResponse(response);
  } catch (error) {
    console.error("Error upscaling image:", error);
    throw error;
  }
};

/**
 * Helper to extract the base64 image from the Gemini response.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractImageFromResponse = (response: any): string => {
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("No candidates returned from Gemini API");
    }

    const parts = candidates[0].content.parts;
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    
    // Fallback: sometimes models might chat back instead of returning an image if the prompt is misunderstood,
    // but for 2.5-flash-image with image output expectation, it should return inlineData.
    throw new Error("No image data found in response. The model may have returned text only.");
};

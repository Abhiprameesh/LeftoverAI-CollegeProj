import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiKey } from './config.js'; 


function getApiKey() {
  
  return apiKey; 
}

const genAI = new GoogleGenerativeAI(getApiKey());

async function imageInput(base64Image) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = "You are a doctor. Provide a diagnosis based on the uploaded image.";

  // Gemini API expects images in this format
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg", // Change this if it's PNG
      data: base64Image.split(",")[1], // Remove Base64 prefix
    },
  };

  try {
    const generatedContent = await model.generateContent([prompt, imagePart]);
    return generatedContent.response.text(); // Return response
  } catch (error) {
    console.error("Error generating content:", error);
    return "Error processing image.";
  }
}

export default imageInput;
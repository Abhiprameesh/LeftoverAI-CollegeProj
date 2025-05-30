const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.route');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { connectDB } = require('./lib/db');
const http = require('http');


dotenv.config();

// Initialize Express and Socket.io
const app = express();
const server = http.createServer(app);


// Middleware
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS configuration
app.use(
  cors({

    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);


// Routes
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log("Server Listening on PORT:", PORT);
  connectDB(); // Connect to the database
});

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Test API key on startup
(async function testAPIKey() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Test message");
    console.log("API key validation successful");
  } catch (error) {
    console.error("API KEY VALIDATION FAILED:", error.message);
    console.error("Please check if your API key is valid and has the necessary permissions");
  }
})();

// Initialize models
const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const multimodalModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Normal chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const chatHistory = req.body.history || [];
    const msg = req.body.chat;

    const chat = textModel.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessage(msg);
    const response = await result.response;
    const text = response.text();

    res.send({ text: text });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).send({ text: "An error occurred processing your message." });
  }
});

// Streaming response endpoint
app.post("/stream", async (req, res) => {
  try {
    const chatHistory = req.body.history || [];
    const msg = req.body.chat;

    const chat = textModel.startChat({
      history: chatHistory,
    });

    const result = await chat.sendMessageStream(msg);
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(chunkText);
    }
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write("An error occurred while processing your message.");
    res.end();
  }
});

// Image processing endpoint
app.post("/image", async (req, res) => {
  try {
    console.log("Food image request received");

    if (!req.body.image) {
      return res.status(400).send({ text: "No image data provided" });
    }

    // First verify the API key is still working
    try {
      const testModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      await testModel.generateContent("Test");
      console.log("API key verified before image processing");
    } catch (apiError) {
      console.error("API key validation failed:", apiError.message);
      return res.status(500).send({ 
        text: `API key error: ${apiError.message}. Please check the server configuration or API key status.` 
      });
    }

    const base64Image = req.body.image;
    const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const mimeType = base64Image.includes("data:") ? base64Image.match(/data:(.*?);base64/)?.[1] || "image/jpeg" : "image/jpeg";

    const imageSizeKB = Math.round((imageData.length * 0.75) / 1024);
    console.log(`Image size: ${imageSizeKB} KB`);

    if (imageSizeKB > 10240) {
      return res.status(413).send({
        text: "Image is too large. Please resize to under 10MB.",
      });
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: imageData,
      },
    };

    // Set a longer timeout for the Gemini API calls
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 180000)
    );

    // First, identify the food items in the image
    const foodIdentificationPrompt = `
      You are a food recognition expert. 
      Please identify all the food items visible in this image.
      List them clearly and describe their state (e.g., cooked, raw, leftover).
      Be specific about quantities if possible.
    `;

    // Create identification promise
    const identificationPromise = multimodalModel.generateContent([
      foodIdentificationPrompt,
      imagePart
    ]);
    
    // Wait for identification with timeout
    const identificationResult = await Promise.race([
      identificationPromise,
      timeoutPromise
    ]);
    
    const foodItems = identificationResult.response.text();
    console.log("Food identification completed");

    // Then, suggest recipes based on the identified food items
    const recipePrompt = `
      Based on the following food items:
      ${foodItems}

      Please suggest 3 creative recipes that can be made using these ingredients.
      For each recipe:
      1. Provide a clear title
      2. List all required ingredients (including any common pantry items needed)
      3. Give step-by-step instructions
      4. Mention approximate cooking time
      5. Include any tips or variations

      Format the response in a clear, easy-to-read way.
    `;

    // Create recipe promise
    const recipePromise = multimodalModel.generateContent(recipePrompt);
    
    // Wait for recipe generation with timeout
    const recipeResult = await Promise.race([
      recipePromise,
      timeoutPromise
    ]);
    
    const recipes = recipeResult.response.text();
    console.log("Recipe generation completed");

    // Combine the identification and recipe suggestions
    const response = `
      I've identified the following food items in your image:
      ${foodItems}

      Here are some recipe suggestions:
      ${recipes}
    `;

    console.log("Food analysis complete");
    res.send({ text: response });
  } catch (error) {
    console.error("Error processing food image:", error.message, error.stack);
    
    // Log more detailed error information
    console.error("Error details:", JSON.stringify({
      name: error.name,
      code: error.code,
      status: error.status,
      meta: error.metadata?.toString(),
      details: error.details,
      statusCode: error.statusCode
    }, null, 2));
    
    let errorMessage = "Error processing food image: ";
    
    if (error.message.includes("timed out")) {
      errorMessage += "The request took too long to process. Please try with a smaller or clearer image.";
    } else if (error.message.includes("INVALID_ARGUMENT")) {
      errorMessage += "The image couldn't be processed. Please try a different image format (JPEG or PNG).";
    } else if (error.message.includes("RESOURCE_EXHAUSTED")) {
      errorMessage += "API quota exceeded. Please try again later.";
    } else if (error.message.includes("PERMISSION_DENIED") || error.code === 403) {
      errorMessage += "API key issue or insufficient permissions. Please check server configuration.";
    } else if (error.code === 401) {
      errorMessage += "Unauthorized. The API key may be invalid or expired.";
    } else {
      errorMessage += `${error.message}. Please try again with a clearer image.`;
    }
    
    res.status(500).send({ text: errorMessage });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send({ status: "ok" });
});
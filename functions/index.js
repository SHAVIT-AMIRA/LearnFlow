// Load environment variables from .env file
require('dotenv').config();

const functions = require("firebase-functions");
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Get configuration from environment variables
const config = functions.config();
const GEMINI_API_KEY = config.gemini ? config.gemini.api_key : process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn("⚠️ No Gemini API key found in config or environment variables. " +
    "Please set up the API key using Firebase Config or environment variables.");
}

exports.translateWord = functions.region("europe-west1").https.onCall(async (data, context) => {
  const { word, target } = data;
  
  console.log(`Translating word: "${word}" to language: "${target}"`);

  if (!word || !target) {
    console.error("Missing required parameters: word or target language");
    throw new functions.https.HttpsError("invalid-argument", "Missing word or target language");
  }

  try {
    // Construct the Google Translate API URL (free version)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(word)}`;
    
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    
    const json = await response.json();
    console.log("Response received:", JSON.stringify(json).substring(0, 200) + "...");
    
    // Check if the response structure is as expected
    if (!json || !Array.isArray(json) || !json[0] || !Array.isArray(json[0]) || !json[0][0]) {
      throw new Error("Unexpected response structure from translation API");
    }
    
    // Extract translation and detected language
    const translatedText = json[0][0][0];
    const detectedSourceLanguage = json[2] || "auto";
    
    console.log(`Translation successful: "${word}" -> "${translatedText}" (${detectedSourceLanguage})`);
    
    return {
      translatedText,
      detectedSourceLanguage
    };
  } catch (error) {
    console.error("Translation API error:", error.message);
    console.error("Error stack:", error.stack);
    throw new functions.https.HttpsError("internal", `Translation failed: ${error.message}`);
  }
});

// Initialize the Gemini API client
let genAI;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "");
  console.log("Gemini API initialized successfully");
} catch (error) {
  console.error("Failed to initialize Gemini API:", error);
  // Create a fallback that will throw errors for any model requested
  genAI = {
    getGenerativeModel: () => {
      throw new Error("Gemini API initialization failed. Please check API key configuration.");
    }
  };
}

/**
 * Firebase function to interact with Gemini AI
 * - Uses Gemini 2.5 Pro Preview with fallback to 1.5
 * - Supports chat history for context
 */
exports.askGemini = functions.region("europe-west1").https.onCall(async (data, context) => {
  const { prompt, context: contextText, videoId = "" } = data;
  const history = data.history || [];
  
  console.log(`Received Gemini chat request for video: ${videoId || "unknown"}`);
  console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
  
  if (!prompt) {
    console.error("Missing required parameter: prompt");
    throw new functions.https.HttpsError("invalid-argument", "Missing prompt");
  }

  if (!GEMINI_API_KEY) {
    console.error("No Gemini API key configured");
    throw new functions.https.HttpsError(
      "failed-precondition", 
      "Gemini API is not properly configured. Please contact the administrator."
    );
  }

  try {
    // First try to use Gemini 2.5 Pro Preview
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-03-25" });
    
    // Format the chat history for Gemini API
    const formattedHistory = history.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));
    
    // Add context about the video if available
    let systemPrompt = "You are LearnFlow AI, a helpful video learning assistant.";
    if (contextText) {
      systemPrompt += ` The current video context is: ${contextText}`;
    }
    if (videoId) {
      systemPrompt += ` The user is watching a video with ID: ${videoId}.`;
    }
    
    // Create a chat session
    const chat = model.startChat({
      history: formattedHistory,
      systemInstruction: systemPrompt,
    });
    
    // Send the user's message
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const responseText = response.text();
    
    console.log(`Generated response (${responseText.length} chars)`);
    
    return {
      response: responseText,
    };
  } catch (error) {
    console.error("Error with Gemini 2.5:", error);
    console.log("Falling back to Gemini 1.5 Pro...");
    
    try {
      // Fallback to Gemini 1.5 Pro
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Format the chat history for Gemini API
      const formattedHistory = history.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));
      
      // Add context about the video if available
      let systemPrompt = "You are LearnFlow AI, a helpful video learning assistant.";
      if (contextText) {
        systemPrompt += ` The current video context is: ${contextText}`;
      }
      if (videoId) {
        systemPrompt += ` The user is watching a video with ID: ${videoId}.`;
      }
      
      // Create a chat session
      const chat = fallbackModel.startChat({
        history: formattedHistory,
        systemInstruction: systemPrompt,
      });
      
      // Send the user's message
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      const responseText = response.text();
      
      console.log(`Generated fallback response (${responseText.length} chars)`);
      
      return {
        response: responseText,
      };
    } catch (fallbackError) {
      console.error("Error with fallback Gemini 1.5:", fallbackError);
      throw new functions.https.HttpsError(
        "internal", 
        `Chat generation failed: ${fallbackError.message || "Unknown error"}`
      );
    }
  }
}); 
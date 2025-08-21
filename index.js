/**
 * index.js
 * Entry point for the Ultravox Speech-to-Speech streaming application.
 * This server handles real-time audio streaming between clients and Ultravox's API,
 * performing necessary audio format conversions and WebSocket communication.
 * Supports both agent-specific calls and generic calls.
 *
 * @author Agent Voice Response <info@agentvoiceresponse.com>
 * @see https://www.agentvoiceresponse.com
 */

const express = require("express");
const axios = require("axios");
const WebSocket = require("ws");
require("dotenv").config();

// Initialize Express application
const app = express();

// Configuration for call type
const CALL_TYPE = process.env.ULTRAVOX_CALL_TYPE || 'agent'; // 'agent' or 'generic'
const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;

// Validate configuration based on call type
if (CALL_TYPE === 'agent' && !ULTRAVOX_AGENT_ID) {
  throw new Error("ULTRAVOX_AGENT_ID is required when CALL_TYPE is 'agent'");
}

// Get the configurable Ultravox sample rate
const ULTRAVOX_SAMPLE_RATE = 8000;
const ULTRAVOX_CLIENT_BUFFER_SIZE_MS =
  process.env.ULTRAVOX_CLIENT_BUFFER_SIZE_MS || 60;

// API URLs based on call type
const getApiUrl = () => {
  if (CALL_TYPE === 'agent') {
    return `https://api.ultravox.ai/api/agents/${ULTRAVOX_AGENT_ID}/calls`;
  } else {
    return 'https://api.ultravox.ai/api/calls';
  }
};

/**
 * Connects to Ultravox API and returns an open WebSocket connection
 * @param {string} uuid - The unique identifier for the call
 * @returns {Promise<WebSocket>} The WebSocket connection to Ultravox
 */
async function connectToUltravox(uuid) {
  const apiUrl = getApiUrl();
  console.log(
    `Connecting to Ultravox API (${CALL_TYPE} call)`,
    apiUrl,
    ULTRAVOX_SAMPLE_RATE,
    ULTRAVOX_CLIENT_BUFFER_SIZE_MS
  );

  // Prepare the request body based on call type
  let requestBody;
  
  if (CALL_TYPE === 'agent') {
    // Agent-specific call configuration
    requestBody = {
      metadata: {
        uuid: uuid,
      },
      medium: {
        serverWebSocket: {
          inputSampleRate: ULTRAVOX_SAMPLE_RATE,
          outputSampleRate: ULTRAVOX_SAMPLE_RATE,
          clientBufferSizeMs: ULTRAVOX_CLIENT_BUFFER_SIZE_MS,
        },
      },
    };
  } else {
    // Generic call configuration
    requestBody = {
      systemPrompt: process.env.ULTRAVOX_SYSTEM_PROMPT || "You are a helpful AI assistant.",
      temperature: parseFloat(process.env.ULTRAVOX_TEMPERATURE) || 0,
      model: process.env.ULTRAVOX_MODEL || "fixie-ai/ultravox",
      voice: process.env.ULTRAVOX_VOICE || "Shaun",
      metadata: {
        uuid: uuid,
      },
      medium: {
        serverWebSocket: {
          inputSampleRate: ULTRAVOX_SAMPLE_RATE,
          outputSampleRate: ULTRAVOX_SAMPLE_RATE,
          clientBufferSizeMs: ULTRAVOX_CLIENT_BUFFER_SIZE_MS,
        },
      },
      recordingEnabled: process.env.ULTRAVOX_RECORDING_ENABLED === 'true' || false,
      joinTimeout: process.env.ULTRAVOX_JOIN_TIMEOUT || "30s",
      maxDuration: process.env.ULTRAVOX_MAX_DURATION || "3600s",
    };

    // Add external voice configuration if provided
    if (process.env.ULTRAVOX_EXTERNAL_VOICE_PROVIDER) {
      const voiceProvider = process.env.ULTRAVOX_EXTERNAL_VOICE_PROVIDER.toLowerCase();
      
      switch (voiceProvider) {
        case 'elevenlabs':
          requestBody.externalVoice = {
            elevenLabs: {
              voiceId: process.env.ULTRAVOX_ELEVENLABS_VOICE_ID,
              model: process.env.ULTRAVOX_ELEVENLABS_MODEL || "eleven_monolingual_v1",
              speed: parseFloat(process.env.ULTRAVOX_ELEVENLABS_SPEED) || 1.0,
              useSpeakerBoost: process.env.ULTRAVOX_ELEVENLABS_USE_SPEAKER_BOOST === 'true' || true,
            }
          };
          break;
        case 'cartesia':
          requestBody.externalVoice = {
            cartesia: {
              voiceId: process.env.ULTRAVOX_CARTESIA_VOICE_ID,
              model: process.env.ULTRAVOX_CARTESIA_MODEL || "cartesia-1",
              speed: parseFloat(process.env.ULTRAVOX_CARTESIA_SPEED) || 1.0,
            }
          };
          break;
        case 'lmnt':
          requestBody.externalVoice = {
            lmnt: {
              voiceId: process.env.ULTRAVOX_LMNT_VOICE_ID,
              model: process.env.ULTRAVOX_LMNT_MODEL || "lmnt-1",
              speed: parseFloat(process.env.ULTRAVOX_LMNT_SPEED) || 1.0,
              conversational: process.env.ULTRAVOX_LMNT_CONVERSATIONAL === 'true' || true,
            }
          };
          break;
        case 'generic':
          requestBody.externalVoice = {
            generic: {
              url: process.env.ULTRAVOX_GENERIC_VOICE_URL,
              headers: JSON.parse(process.env.ULTRAVOX_GENERIC_VOICE_HEADERS || '{}'),
              body: JSON.parse(process.env.ULTRAVOX_GENERIC_VOICE_BODY || '{}'),
              responseSampleRate: parseInt(process.env.ULTRAVOX_GENERIC_VOICE_SAMPLE_RATE) || 24000,
              responseWordsPerMinute: parseInt(process.env.ULTRAVOX_GENERIC_VOICE_WPM) || 150,
              responseMimeType: process.env.ULTRAVOX_GENERIC_VOICE_MIME_TYPE || "audio/wav",
              jsonAudioFieldPath: process.env.ULTRAVOX_GENERIC_VOICE_AUDIO_FIELD || "audio",
            }
          };
          break;
      }
    }

    // Add selected tools if provided
    if (process.env.ULTRAVOX_SELECTED_TOOLS) {
      try {
        requestBody.selectedTools = JSON.parse(process.env.ULTRAVOX_SELECTED_TOOLS);
      } catch (error) {
        console.warn("Invalid ULTRAVOX_SELECTED_TOOLS JSON format:", error.message);
      }
    }

    // Add VAD settings if provided
    if (process.env.ULTRAVOX_VAD_SETTINGS) {
      try {
        requestBody.vadSettings = JSON.parse(process.env.ULTRAVOX_VAD_SETTINGS);
      } catch (error) {
        console.warn("Invalid ULTRAVOX_VAD_SETTINGS JSON format:", error.message);
      }
    }
  }

  console.log("Request body:", requestBody);

  const response = await axios.post(
    apiUrl,
    requestBody,
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.ULTRAVOX_API_KEY,
      },
    }
  );

  console.log("Response:", response.data);

  const joinUrl = response.data.joinUrl;
  if (!joinUrl) {
    throw new Error("Missing Ultravox joinUrl");
  }

  return new WebSocket(joinUrl);
}

/**
 * Handles incoming client audio stream and manages communication with Ultravox's API.
 * Implements buffering for audio chunks received before WebSocket connection is established.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
const handleAudioStream = async (req, res) => {
  const uuid = req.headers['x-uuid'];
  console.log('Received UUID:', uuid);
  
  const ultravoxWebSocket = await connectToUltravox(uuid);

  ultravoxWebSocket.on("open", () => {
    console.log("WebSocket connected to Ultravox");
  });

  let ultravoxChunksQueue = Buffer.alloc(0);
  let isFirstUltravoxChunk = true;
  let ultravoxStartTime = null;


  ultravoxWebSocket.on("message", async (data, isBinary) => {
    if (isBinary) {
      // Handle binary audio data from Ultravox
      if (isFirstUltravoxChunk) {
        ultravoxStartTime = Date.now();
        isFirstUltravoxChunk = false;
        console.log("First Ultravox audio chunk received, starting delay...");
      }

      // Add Ultravox chunk to buffer
      ultravoxChunksQueue = Buffer.concat([ultravoxChunksQueue, data]);

      // If we have accumulated enough time, write the buffer
      if (ultravoxStartTime && Date.now() - ultravoxStartTime >= 100 && ultravoxChunksQueue.length >= 320) {
        // Create a copy of the current buffer and reset the original
        const bufferToWrite = ultravoxChunksQueue;
        ultravoxChunksQueue = Buffer.alloc(0);
        
        // Write the buffer to the response
        res.write(bufferToWrite);
      }
    } else {
      // Handle JSON control messages from Ultravox
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "call_started":
          console.log("Call started", message.callId);
          break;

        case "state":
          console.log("State", message.state);
          break;

        case "transcript":
          if (message.final) {
            console.log(
              `${message.role.toUpperCase()} (${message.medium}): ${
                message.text
              }`
            );
          }
          break;

        case "playback_clear_buffer":
          console.log("Playback clear buffer");
          break;

        case "error":
          console.error("Error", message);
          break;

        default:
          console.log("Received message type:", message.type);
          break;
      }
    }
  });

  ultravoxWebSocket.on("close", () => {
    console.log("WebSocket connection closed");
    res.end();
  });

  ultravoxWebSocket.on("error", (err) => {
    console.error("WebSocket error:", err);
    res.end();
  });

  // Handle incoming audio data from client
  req.on("data", async (audioChunk) => {
    if (ultravoxWebSocket.readyState === ultravoxWebSocket.OPEN) {
      ultravoxWebSocket.send(audioChunk);
    }
  });

  req.on("end", () => {
    console.log("Request stream ended");
    ultravoxWebSocket.close();
  });

  req.on("error", (err) => {
    console.error("Request error:", err);
    ultravoxWebSocket.close();
  });
};

// Route for speech-to-speech streaming
app.post("/speech-to-speech-stream", handleAudioStream);

const PORT = process.env.PORT || 6031;
app.listen(PORT, async () => {
  console.log(`Ultravox Speech-to-Speech server running on port ${PORT}`);
});

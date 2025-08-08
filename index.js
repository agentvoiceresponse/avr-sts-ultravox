/**
 * index.js
 * Entry point for the Ultravox Speech-to-Speech streaming application.
 * This server handles real-time audio streaming between clients and Ultravox's API,
 * performing necessary audio format conversions and WebSocket communication.
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

if (!process.env.ULTRAVOX_AGENT_ID) {
  throw new Error("ULTRAVOX_AGENT_ID is not set");
}

// Get the configurable Ultravox sample rate
const ULTRAVOX_SAMPLE_RATE = 8000;
const ULTRAVOX_API_URL = `https://api.ultravox.ai/api/agents/${process.env.ULTRAVOX_AGENT_ID}/calls`;
const ULTRAVOX_CLIENT_BUFFER_SIZE_MS =
  process.env.ULTRAVOX_CLIENT_BUFFER_SIZE_MS || 60;

/**
 * Connects to Ultravox API and returns an open WebSocket connection
 * @returns {Promise<WebSocket>} The WebSocket connection to Ultravox
 */
async function connectToUltravox(uuid) {
  console.log(
    "Connecting to Ultravox API",
    ULTRAVOX_API_URL,
    ULTRAVOX_SAMPLE_RATE,
    ULTRAVOX_CLIENT_BUFFER_SIZE_MS
  );
  const response = await axios.post(
    ULTRAVOX_API_URL,
    {
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
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.ULTRAVOX_API_KEY,
      },
    }
  );

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
      if (ultravoxStartTime && Date.now() - ultravoxStartTime >= 100) {
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
    clearInterval(interval);
    ultravoxWebSocket.close();
  });
};

// Route for speech-to-speech streaming
app.post("/speech-to-speech-stream", handleAudioStream);

const PORT = process.env.PORT || 6031;
app.listen(PORT, async () => {
  console.log(`Ultravox Speech-to-Speech server running on port ${PORT}`);
});

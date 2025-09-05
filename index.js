/**
 * index.js
 * Entry point for the Ultravox Speech-to-Speech streaming WebSocket server.
 * This server handles real-time audio streaming between clients and Ultravox's API,
 * performing necessary audio format conversions and WebSocket communication.
 * Supports both agent-specific calls and generic calls.
 *
 * Client Protocol:
 * - Send {"type": "init", "uuid": "uuid"} to initialize session
 * - Send {"type": "audio", "audio": "base64_encoded_audio"} to stream audio
 * - Receive {"type": "audio", "audio": "base64_encoded_audio"} for responses
 * - Receive {"type": "error", "message": "error_message"} for errors
 *
 * @author Agent Voice Response <info@agentvoiceresponse.com>
 * @see https://www.agentvoiceresponse.com
 */

const WebSocket = require("ws");
const axios = require("axios");
require("dotenv").config();

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
 * Handles incoming client WebSocket connection and manages communication with Ultravox's API.
 * Implements buffering for audio chunks received before WebSocket connection is established.
 *
 * @param {WebSocket} clientWs - Client WebSocket connection
 */
const handleClientConnection = (clientWs) => {
  console.log("New client WebSocket connection received");
  let sessionUuid = null;
  let ultravoxWebSocket = null;

  let ultravoxStartTime = null;

  // Handle client WebSocket messages
  clientWs.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      switch (message.type) {
        case "init":
          sessionUuid = message.uuid;
          console.log("Session UUID:", sessionUuid);
          // Initialize Ultravox connection when client is ready
          initializeUltravoxConnection();
          break;

        case "audio":
          // Handle audio data from client
          if (message.audio && ultravoxWebSocket && ultravoxWebSocket.readyState === WebSocket.OPEN) {
            const audioBuffer = Buffer.from(message.audio, "base64");
            ultravoxWebSocket.send(audioBuffer);
          }
          break;

        default:
          console.log("Unknown message type from client:", message.type);
          break;
      }
    } catch (error) {
      console.error("Error processing client message:", error);
    }
  });

  // Initialize Ultravox WebSocket connection
  const initializeUltravoxConnection = async () => {
    try {
      ultravoxWebSocket = await connectToUltravox(sessionUuid);

      ultravoxWebSocket.on("open", () => {
        console.log("WebSocket connected to Ultravox");
      });

      ultravoxWebSocket.on("message", async (data, isBinary) => {
        if (isBinary) {
          // Handle binary audio data from Ultravox
          clientWs.send(
            JSON.stringify({
              type: "audio",
              audio: data.toString("base64"),
            })
          );
        } else {
          // Handle JSON control messages from Ultravox
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case "call_started":
              console.log("Call started", message.callId);
              break;

            case "state":
              console.log("State", message.state);
              if (message.state === "listening") {
                clientWs.send(
                  JSON.stringify({
                    type: "interruption",
                  })
                );
              }
              break;

            case "transcript":
              if (message.final) {
                console.log(
                  `${message.role.toUpperCase()} (${message.medium}): ${
                    message.text
                  }`
                );
                // Send transcript to client
                clientWs.send(
                  JSON.stringify({
                    type: "transcript",
                    role: message.role,
                    text: message.text,
                  })
                );
              }
              break;

            case "playback_clear_buffer":
              console.log("Playback clear buffer");
              break;

            case "error":
              console.error("Error", message);
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  message: message.message || "Unknown error occurred",
                })
              );
              break;

            default:
              console.log("Received message type:", message.type);
              break;
          }
        }
      });

      ultravoxWebSocket.on("close", () => {
        console.log("Ultravox WebSocket connection closed");
        cleanup();
      });

      ultravoxWebSocket.on("error", (err) => {
        console.error("Ultravox WebSocket error:", err);
        clientWs.send(
          JSON.stringify({
            type: "error",
            message: "Connection to Ultravox failed",
          })
        );
        cleanup();
      });
    } catch (error) {
      console.error("Error initializing Ultravox connection:", error);
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "Failed to connect to Ultravox",
        })
      );
      cleanup();
    }
  };

  // Handle client WebSocket close
  clientWs.on("close", () => {
    console.log("Client WebSocket connection closed");
    cleanup();
  });

  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err);
    cleanup();
  });

  /**
   * Cleans up resources and closes connections.
   */
  function cleanup() {
    if (ultravoxWebSocket) ultravoxWebSocket.close();
    if (clientWs) clientWs.close();
  }
};

// Start WebSocket server
const startServer = async () => {
  try {
    // Create WebSocket server
    const PORT = process.env.PORT || 6031;
    const wss = new WebSocket.Server({ port: PORT });

    wss.on("connection", (clientWs) => {
      console.log("New client connected");
      handleClientConnection(clientWs);
    });

    console.log(
      `Ultravox Speech-to-Speech WebSocket server running on port ${PORT}`
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

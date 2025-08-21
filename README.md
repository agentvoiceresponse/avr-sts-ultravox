# Agent Voice Response - Ultravox Speech-to-Speech Integration

[![Discord](https://img.shields.io/discord/1347239846632226998?label=Discord&logo=discord)](https://discord.gg/DFTU69Hg74)
[![GitHub Repo stars](https://img.shields.io/github/stars/agentvoiceresponse/avr-sts-ultravox?style=social)](https://github.com/agentvoiceresponse/avr-sts-ultravox)
[![Docker Pulls](https://img.shields.io/docker/pulls/agentvoiceresponse/avr-sts-ultravox?label=Docker%20Pulls&logo=docker)](https://hub.docker.com/r/agentvoiceresponse/avr-sts-ultravox)
[![Ko-fi](https://img.shields.io/badge/Support%20us%20on-Ko--fi-ff5e5b.svg)](https://ko-fi.com/agentvoiceresponse)

This repository showcases the integration between **Agent Voice Response** and **Ultravox's Real-time Speech-to-Speech API**. The application leverages Ultravox's powerful language model to process audio input from users, providing intelligent, context-aware responses in real-time audio format.

## Features

- **Dual Call Types**: Support for both agent-specific calls and generic calls
- **Real-time Streaming**: WebSocket-based audio streaming with buffering
- **External Voice Support**: Integration with ElevenLabs, Cartesia, LMNT, and generic voice providers
- **Configurable Audio Settings**: Customizable sample rates and buffer sizes
- **Tool Integration**: Support for custom tools and VAD settings

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Basic Configuration
- `ULTRAVOX_API_KEY`: Your Ultravox API key
- `ULTRAVOX_CALL_TYPE`: Set to `'agent'` or `'generic'`
- `PORT`: Server port (default: 6031)

#### Audio Configuration
- `ULTRAVOX_SAMPLE_RATE`: Audio sample rate (default: 8000)
- `ULTRAVOX_CLIENT_BUFFER_SIZE_MS`: Client buffer size in milliseconds (default: 60)

#### Agent-specific Configuration (when CALL_TYPE=agent)
- `ULTRAVOX_AGENT_ID`: Your Ultravox agent ID (required)

#### Generic Call Configuration (when CALL_TYPE=generic)
- `ULTRAVOX_SYSTEM_PROMPT`: System prompt for the AI (default: "You are a helpful AI assistant.")
- `ULTRAVOX_TEMPERATURE`: AI temperature setting (default: 0)
- `ULTRAVOX_MODEL`: AI model to use (default: "fixie-ai/ultravox")
- `ULTRAVOX_VOICE`: Voice to use (default: "alloy")
- `ULTRAVOX_RECORDING_ENABLED`: Enable call recording (default: false)
- `ULTRAVOX_JOIN_TIMEOUT`: Join timeout (default: "30s")
- `ULTRAVOX_MAX_DURATION`: Maximum call duration (default: "3600s")

#### External Voice Configuration (optional)
Set `ULTRAVOX_EXTERNAL_VOICE_PROVIDER` to one of: `elevenlabs`, `cartesia`, `lmnt`, or `generic`

**ElevenLabs:**
- `ULTRAVOX_ELEVENLABS_VOICE_ID`: Voice ID
- `ULTRAVOX_ELEVENLABS_MODEL`: Model (default: "eleven_monolingual_v1")
- `ULTRAVOX_ELEVENLABS_SPEED`: Speed (default: 1.0)
- `ULTRAVOX_ELEVENLABS_USE_SPEAKER_BOOST`: Use speaker boost (default: true)

**Cartesia:**
- `ULTRAVOX_CARTESIA_VOICE_ID`: Voice ID
- `ULTRAVOX_CARTESIA_MODEL`: Model (default: "cartesia-1")
- `ULTRAVOX_CARTESIA_SPEED`: Speed (default: 1.0)

**LMNT:**
- `ULTRAVOX_LMNT_VOICE_ID`: Voice ID
- `ULTRAVOX_LMNT_MODEL`: Model (default: "lmnt-1")
- `ULTRAVOX_LMNT_SPEED`: Speed (default: 1.0)
- `ULTRAVOX_LMNT_CONVERSATIONAL`: Conversational mode (default: true)

**Generic:**
- `ULTRAVOX_GENERIC_VOICE_URL`: Voice service URL
- `ULTRAVOX_GENERIC_VOICE_HEADERS`: HTTP headers (JSON string)
- `ULTRAVOX_GENERIC_VOICE_BODY`: Request body (JSON string)
- `ULTRAVOX_GENERIC_VOICE_SAMPLE_RATE`: Sample rate (default: 24000)
- `ULTRAVOX_GENERIC_VOICE_WPM`: Words per minute (default: 150)
- `ULTRAVOX_GENERIC_VOICE_MIME_TYPE`: MIME type (default: "audio/wav")
- `ULTRAVOX_GENERIC_VOICE_AUDIO_FIELD`: Audio field path (default: "audio")

#### Advanced Configuration
- `ULTRAVOX_SELECTED_TOOLS`: JSON string of tools to use
- `ULTRAVOX_VAD_SETTINGS`: JSON string of VAD settings

## Usage

### Starting the Server

```bash
npm install
npm start
```

### Making Requests

Send a POST request to `/speech-to-speech-stream` with:

- **Headers:**
  - `x-uuid`: Unique identifier for the call
  - `Content-Type`: `audio/wav` (or appropriate audio format)

- **Body:** Raw audio data stream

### Example Usage

#### Agent-specific Call
```bash
# .env configuration
ULTRAVOX_CALL_TYPE=agent
ULTRAVOX_AGENT_ID=your_agent_id
ULTRAVOX_API_KEY=your_api_key

# Make request
curl -X POST http://localhost:6031/speech-to-speech-stream \
  -H "x-uuid: call-123" \
  -H "Content-Type: audio/wav" \
  --data-binary @audio.wav
```

#### Generic Call with ElevenLabs Voice
```bash
# .env configuration
ULTRAVOX_CALL_TYPE=generic
ULTRAVOX_API_KEY=your_api_key
ULTRAVOX_SYSTEM_PROMPT=You are a customer service representative.
ULTRAVOX_EXTERNAL_VOICE_PROVIDER=elevenlabs
ULTRAVOX_ELEVENLABS_VOICE_ID=your_voice_id

# Make request
curl -X POST http://localhost:6031/speech-to-speech-stream \
  -H "x-uuid: call-456" \
  -H "Content-Type: audio/wav" \
  --data-binary @audio.wav
```

## API Response

The service returns a stream of audio data from Ultravox. The response includes:

- Real-time audio chunks from the AI
- JSON control messages for call state management
- Transcript information

## Error Handling

The service handles various error scenarios:

- Missing required environment variables
- Invalid API responses
- WebSocket connection failures
- Audio processing errors

## Docker Support

```bash
# Build the image
docker build -t avr-sts-ultravox .

# Run with environment file
docker run --env-file .env -p 6031:6031 avr-sts-ultravox
```

## Support & Community

*   **GitHub:** [https://github.com/agentvoiceresponse](https://github.com/agentvoiceresponse) - Report issues, contribute code.
*   **Discord:** [https://discord.gg/DFTU69Hg74](https://discord.gg/DFTU69Hg74) - Join the community discussion.
*   **Docker Hub:** [https://hub.docker.com/u/agentvoiceresponse](https://hub.docker.com/u/agentvoiceresponse) - Find Docker images.
*   **Wiki:** [https://wiki.agentvoiceresponse.com/en/home](https://wiki.agentvoiceresponse.com/en/home) - Project documentation and guides.

## Support AVR

AVR is free and open-source. If you find it valuable, consider supporting its development:

<a href="https://ko-fi.com/agentvoiceresponse" target="_blank"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support us on Ko-fi"></a>

## License

MIT License - see the [LICENSE](LICENSE.md) file for details.

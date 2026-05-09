require("dotenv").config();

const axios = require("axios");

/** @returns {number} */
function amiRequestTimeoutMs() {
  const raw = parseInt(process.env.AMI_REQUEST_TIMEOUT_MS || "10000", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
}

module.exports = {
  name: "avr_hangup",
  description:
    "Ends the call when the customer has no further information to request, after all relevant actions have been completed, or when the customer explicitly says goodbye, ensuring a clean and graceful termination of the interaction.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (uuid, {}) => {
    console.log("Hangup call");
    const url = process.env.AMI_URL || "http://127.0.0.1:6006";
    const timeout = amiRequestTimeoutMs();
    try {
      const res = await axios.post(`${url}/hangup`, { uuid }, { timeout });
      console.log("Hangup response:", res.data);
      if (typeof res.data?.message !== "undefined") return res.data.message;
      return "OK";
    } catch (error) {
      const msg =
        error?.code === "ECONNABORTED"
          ? `AMI hangup timed out after ${timeout}ms`
          : typeof axios.isAxiosError === "function" && axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : error instanceof Error
              ? error.message
              : String(error);
      console.error("Error during hangup:", msg);
      throw new Error(msg);
    }
  },
};

require("dotenv").config();

const axios = require("axios");

/** @returns {number} */
function amiRequestTimeoutMs() {
  const raw = parseInt(process.env.AMI_REQUEST_TIMEOUT_MS || "10000", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 10000;
}

module.exports = {
  name: "avr_transfer",
  description: "Transfers the call to a designated internal extension when the user requests to speak with an internal operator or be redirected to another extension. Optional context and priority information may be included to support proper call handling and routing.",
  input_schema: {
    type: "object",
    properties: {
      transfer_extension: {
        type: "string",
        description: "The transfer extension to transfer the call to.",
      },
      transfer_context: {
        type: "string",
        description: "The context to transfer the call to.",
      },
      transfer_priority: {
        type: "string",
        description: "The priority of the transfer.",
      },
    },
    required: ["transfer_extension"],
  },
  handler: async (
    uuid,
    { transfer_extension, transfer_context, transfer_priority }
  ) => {
    console.log("Transfering call to:", transfer_extension);
    console.log("UUID:", uuid);

    const url = process.env.AMI_URL || "http://127.0.0.1:6006";
    const timeout = amiRequestTimeoutMs();
    try {
      const res = await axios.post(
        `${url}/transfer`,
        {
          uuid,
          exten: transfer_extension,
          context: transfer_context || "demo",
          priority: transfer_priority || 1,
        },
        { timeout }
      );
      console.log("Transfer response:", res.data);
      if (typeof res.data?.message !== "undefined") return res.data.message;
      return "OK";
    } catch (error) {
      const msg =
        error?.code === "ECONNABORTED"
          ? `AMI transfer timed out after ${timeout}ms`
          : typeof axios.isAxiosError === "function" && axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : error instanceof Error
              ? error.message
              : String(error);
      console.error("Error during transfer:", msg);
      throw new Error(msg);
    }
  },
};

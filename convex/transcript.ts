import { v } from "convex/values";
import { action } from "./_generated/server";

// Demo call ID - hardcoded for testing
const DEMO_CALL_ID = "1c604de4-bce6-4eda-8e12-91b533a89d1f";

export const callTranscriptionService = action({
  args: {
    callId: v.string(),
  },
  handler: async () => {
    // Use demo call ID for now, ignore the passed callId
    const callIdToUse = DEMO_CALL_ID;

    const response = await fetch(`https://api.vapi.ai/call/${callIdToUse}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Fetched transcript for call ID: ${callIdToUse}`, data);
    return data;
  },
});

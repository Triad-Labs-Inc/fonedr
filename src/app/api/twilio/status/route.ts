import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;

    console.log("Twilio webhook received:", {
      callSid,
      callStatus,
      callDuration,
      to,
      from,
    });

    // Update call record in Convex
    if (callSid) {
      await convex.mutation(api.calls.updateByTwilioSid, {
        twilioCallSid: callSid,
        status: mapTwilioStatus(callStatus),
        duration: callDuration ? parseInt(callDuration) : undefined,
        endTime: ["completed", "failed", "busy", "no-answer"].includes(callStatus) 
          ? Date.now() 
          : undefined,
      });
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Error handling Twilio webhook:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

type CallStatus = "initiating" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "canceled";

function mapTwilioStatus(twilioStatus: string): CallStatus {
  const statusMap: Record<string, CallStatus> = {
    "queued": "initiating",
    "initiated": "initiating",
    "ringing": "ringing",
    "in-progress": "in-progress",
    "completed": "completed",
    "failed": "failed",
    "busy": "busy",
    "no-answer": "no-answer",
    "canceled": "canceled",
  };
  
  return statusMap[twilioStatus] || "failed";
}
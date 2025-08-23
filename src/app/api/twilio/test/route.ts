import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET() {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  
  response.say("TwiML endpoint is working correctly. Voice connection established.");
  
  return new NextResponse(response.toString(), {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

export async function POST() {
  return GET();
}
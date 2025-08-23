import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const conferenceName = url.searchParams.get("name");

    if (!conferenceName) {
      return new NextResponse("Conference name is required", { status: 400 });
    }

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    const dial = response.dial();
    
    // Add participant to conference
    dial.conference(
      {
        waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
        startConferenceOnEnter: true,
        endConferenceOnExit: false,
        statusCallback: `${url.origin}/api/twilio/conference-status`,
        statusCallbackMethod: "POST",
        statusCallbackEvent: ["start", "end", "join", "leave"],
      },
      conferenceName
    );

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error joining conference:", error);
    return new NextResponse("Failed to join conference", { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests the same way as POST for Twilio compatibility
  return POST(request);
}
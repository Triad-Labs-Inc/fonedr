import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;
    const conferenceMode = formData.get("ConferenceMode") as string;
    const conferenceName = formData.get("ConferenceName") as string;
    
    console.log("Voice endpoint called with:", { to, conferenceMode, conferenceName });
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Add a simple response first to test connectivity
    if (!to && !conferenceMode) {
      response.say("Voice connection established. Ready for calls.");
      return new NextResponse(response.toString(), {
        status: 200,
        headers: {
          "Content-Type": "text/xml",
        },
      });
    }

    if (conferenceMode === "true" && conferenceName) {
      // Get base URL from environment or use a fallback
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
      
      console.log("Conference mode - joining conference:", conferenceName);
      
      // Conference mode: connect caller to conference room
      const dial = response.dial({
        callerId: twilioPhoneNumber,
      });
      
      dial.conference(
        {
          waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
          startConferenceOnEnter: true,
          endConferenceOnExit: true, // End conference when initiator leaves
          statusCallback: `${baseUrl}/api/twilio/conference-status`,
          statusCallbackMethod: "POST",
          statusCallbackEvent: ["start", "end", "join", "leave"],
        },
        conferenceName
      );
    } else if (to) {
      // Regular call mode (existing behavior)
      const dial = response.dial({
        callerId: twilioPhoneNumber,
        answerOnBridge: true,
      });
      
      // Check if it's a phone number or a client
      if (to.startsWith("client:")) {
        dial.client(to.substring(7));
      } else {
        dial.number(to);
      }
    } else {
      response.say("Thanks for calling!");
    }

    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("Error handling voice request:", error);
    return NextResponse.json(
      { error: "Failed to handle voice request" },
      { status: 500 }
    );
  }
}
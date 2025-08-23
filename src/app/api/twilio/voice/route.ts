import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;
    const conferenceMode = formData.get("ConferenceMode") as string;
    const conferenceName = formData.get("ConferenceName") as string;
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (conferenceMode === "true" && conferenceName) {
      // Conference mode: connect caller to conference room
      const dial = response.dial({
        callerId: twilioPhoneNumber,
      });
      
      dial.conference(
        {
          waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
          startConferenceOnEnter: true,
          endConferenceOnExit: true, // End conference when initiator leaves
          statusCallback: `${request.nextUrl.origin}/api/twilio/conference-status`,
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
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const to = formData.get("To") as string;
    
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    if (to) {
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
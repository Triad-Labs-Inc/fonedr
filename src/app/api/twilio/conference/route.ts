import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const secondParticipant = process.env.TWILIO_SECOND_PARTICIPANT_NUMBER;

const client = twilio(accountSid, authToken);

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, conferenceName } = await request.json();

    if (!phoneNumber || !conferenceName) {
      return NextResponse.json(
        { error: "Phone number and conference name are required" },
        { status: 400 }
      );
    }

    if (!secondParticipant) {
      return NextResponse.json(
        { error: "Second participant number not configured" },
        { status: 500 }
      );
    }

    // Create TwiML for joining conference
    const conferenceUrl = `${request.nextUrl.origin}/api/twilio/join-conference?name=${encodeURIComponent(conferenceName)}`;

    // Call the user-entered number and connect to conference
    const call1Promise = client.calls.create({
      url: conferenceUrl,
      to: phoneNumber,
      from: twilioPhoneNumber!,
      statusCallback: `${request.nextUrl.origin}/api/twilio/status`,
      statusCallbackMethod: 'POST',
    });

    // Call the second participant and connect to conference
    const call2Promise = client.calls.create({
      url: conferenceUrl,
      to: secondParticipant,
      from: twilioPhoneNumber!,
      statusCallback: `${request.nextUrl.origin}/api/twilio/status`,
      statusCallbackMethod: 'POST',
    });

    // Execute both calls in parallel
    const [call1, call2] = await Promise.all([call1Promise, call2Promise]);

    console.log('Conference calls initiated:', {
      call1Sid: call1.sid,
      call2Sid: call2.sid,
      conferenceName,
    });

    return NextResponse.json({
      success: true,
      conferenceName,
      calls: [
        { sid: call1.sid, to: phoneNumber },
        { sid: call2.sid, to: secondParticipant },
      ],
    });
  } catch (error) {
    console.error("Error creating conference calls:", error);
    return NextResponse.json(
      { error: "Failed to create conference calls" },
      { status: 500 }
    );
  }
}
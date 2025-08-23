import { NextResponse } from "next/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

export async function POST() {
  try {
    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return NextResponse.json(
        { error: "Twilio credentials not configured" },
        { status: 500 }
      );
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a unique identity for this client
    const identity = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true,
    });

    // Create access token
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      {
        identity: identity,
        ttl: 3600, // 1 hour
      }
    );

    // Add grant to token
    token.addGrant(voiceGrant);

    console.log({token: token.toJwt()})

    return NextResponse.json({
      token: token.toJwt(),
      identity: identity,
    });
  } catch (error) {
    console.error("Error generating Twilio token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
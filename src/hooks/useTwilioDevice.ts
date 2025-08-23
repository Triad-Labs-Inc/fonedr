"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

type CallStatus = "initiating" | "ringing" | "in-progress" | "completed" | "failed" | "busy" | "no-answer" | "canceled";

interface UseTwilioDeviceProps {
  onCallStatusChange?: (status: CallStatus) => void;
  onCallEnd?: () => void;
}

export function useTwilioDevice({ 
  onCallStatusChange, 
  onCallEnd 
}: UseTwilioDeviceProps = {}) {
  const [device, setDevice] = useState<Device | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<Device | null>(null);

  const startTranscription = useAction(api.transcript.callTranscriptionService)

  // Initialize Twilio Device
  const initializeDevice = useCallback(async () => {
    try {
      // Fetch token from API
      const response = await fetch("/api/twilio/token", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get Twilio token");
      }

      const { token } = await response.json();

      // Create and setup device
      const newDevice = new Device(token, {
        logLevel: 1,
        edge: "ashburn",
      });

      // Register device event handlers
      newDevice.on("registered", () => {
        console.log("Twilio Device registered and ready");
        setIsReady(true);
        setError(null);
      });

      newDevice.on("error", (error) => {
        console.error("Twilio Device error:", error);
        setError(error.message);
      });

      newDevice.on("incoming", (call) => {
        console.log("Incoming call from", call.parameters.From);
        // Auto-answer for now, you can add UI for accepting/rejecting
        call.accept();
        setCurrentCall(call);
        setupCallHandlers(call);
      });

      // Register the device
      await newDevice.register();
      
      deviceRef.current = newDevice;
      setDevice(newDevice);
    } catch (err) {
      console.error("Failed to initialize Twilio device:", err);
      setError(err instanceof Error ? err.message : "Failed to initialize");
    }
  }, []);

  // Setup call event handlers
  const setupCallHandlers = useCallback((call: Call) => {
    call.on("accept", () => {
      console.log("Call accepted");
      setCallStatus("connected");
      onCallStatusChange?.("in-progress");
    });

    call.on("ringing", () => {
      console.log("Call ringing");
      setCallStatus("ringing");
      onCallStatusChange?.("ringing");
    });

    call.on("connect", () => {
      console.log("Call connected");
      setCallStatus("connected");
      onCallStatusChange?.("in-progress");
    });

    call.on("disconnect", () => {
      console.log("Call disconnected");
      setCallStatus("disconnected");
      setCurrentCall(null);
      onCallStatusChange?.("completed");
      onCallEnd?.();
    });

    call.on("cancel", () => {
      console.log("Call canceled");
      setCallStatus("canceled");
      setCurrentCall(null);
      onCallStatusChange?.("canceled");
      onCallEnd?.();
    });

    call.on("reject", () => {
      console.log("Call rejected");
      setCallStatus("rejected");
      setCurrentCall(null);
      onCallStatusChange?.("canceled");
      onCallEnd?.();
    });

    call.on("error", (error) => {
      console.error("Call error:", error);
      setError(error.message);
      setCallStatus("error");
      onCallStatusChange?.("failed");
    });
  }, [onCallStatusChange, onCallEnd]);

  // Make an outbound call
  const makeCall = useCallback(async (phoneNumber: string, useConference: boolean = false): Promise<Call | null> => {
    if (!device || !isReady) {
      setError("Device not ready");
      return null;
    }

    try {
      setError(null);
      
      // Format phone number (ensure it has country code)
      let formattedNumber = phoneNumber.replace(/\D/g, "");
      if (!formattedNumber.startsWith("1") && formattedNumber.length === 10) {
        formattedNumber = "1" + formattedNumber; // Add US country code
      }
      if (!formattedNumber.startsWith("+")) {
        formattedNumber = "+" + formattedNumber;
      }

      console.log("Making call to:", formattedNumber, "Conference mode:", useConference);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let params: any = {};
      
      if (useConference) {
        // Conference mode: generate conference name and initiate outbound calls
        const conferenceName = `Conference_${Date.now()}`;
        
        // First, initiate outbound calls to both participants
        const conferenceResponse = await fetch("/api/twilio/conference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phoneNumber: formattedNumber,
            conferenceName,
          }),
        });
        
        if (!conferenceResponse.ok) {
          throw new Error("Failed to create conference calls");
        }
        
        // Then connect the browser client to the conference
        params = {
          ConferenceMode: "true",
          ConferenceName: conferenceName,
        };
      } else {
        // Regular call mode
        params = {
          To: formattedNumber,
        };
      }

      const call = await device.connect({ params });
      setCurrentCall(call);
      setupCallHandlers(call);
      
      return call;
    } catch (err) {
      console.error("Failed to make call:", err);
      setError(err instanceof Error ? err.message : "Failed to make call");
      return null;
    }
  }, [device, isReady, setupCallHandlers]);

  // Hang up current call
  const hangUp = useCallback(() => {
    if (currentCall) {
      console.log("Hanging up call");
      currentCall.disconnect();
      setCurrentCall(null);
      startTranscription()
    }
  }, [currentCall]);

  // Cleanup on unmount
  useEffect(() => {
    initializeDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, [initializeDevice]);

  return {
    device,
    currentCall,
    isReady,
    callStatus,
    error,
    makeCall,
    hangUp,
  };
}
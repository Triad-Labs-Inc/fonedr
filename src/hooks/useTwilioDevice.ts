"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";

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
      newDevice.on("ready", () => {
        console.log("Twilio Device ready");
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
  const makeCall = useCallback(async (phoneNumber: string): Promise<Call | null> => {
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

      console.log("Making call to:", formattedNumber);
      
      const params = {
        To: formattedNumber,
      };

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
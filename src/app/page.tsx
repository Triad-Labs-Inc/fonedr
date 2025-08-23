"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Phone, History, Delete, PhoneCall, PhoneOff } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api as generatedApi } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

type TabKey = "dial" | "log";

type CallLogItem = {
  _id: Id<"calls">;
  number: string;
  name?: string;
  type: "incoming" | "outgoing" | "missed";
  createdAt: number;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dial");
  return (
    <div className="font-sans min-h-dvh bg-background text-foreground grid grid-rows-[1fr_auto]">
      <main className="relative overflow-hidden">
        {activeTab === "dial" ? <DialPad /> : <CallLog />}
      </main>
      <BottomTabs activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function BottomTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="sticky bottom-0 w-full border-t border-black/10 dark:border-white/15 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-md mx-auto grid grid-cols-2">
        <button
          aria-label="Dial pad"
          onClick={() => onChange("dial")}
          className={`flex items-center justify-center gap-2 py-3 ${
            activeTab === "dial" ? "text-foreground" : "text-foreground/60"
          }`}
        >
          <Phone className="size-5" />
          <span className="text-sm">Dial</span>
        </button>
        <button
          aria-label="Call log"
          onClick={() => onChange("log")}
          className={`flex items-center justify-center gap-2 py-3 ${
            activeTab === "log" ? "text-foreground" : "text-foreground/60"
          }`}
        >
          <History className="size-5" />
          <span className="text-sm">Calls</span>
        </button>
      </div>
    </nav>
  );
}

function DialPad() {
  const [digits, setDigits] = useState<string>("");
  const [activeCallId, setActiveCallId] = useState<Id<"calls"> | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const apiAny = generatedApi as any;
  const createCall = useMutation(apiAny.calls.create);
  const updateCallStatus = useMutation(apiAny.calls.updateCallStatus);
  const activeCall = useQuery(apiAny.calls.getActiveCall);
  
  const { 
    makeCall, 
    hangUp, 
    currentCall, 
    isReady, 
    callStatus, 
    error 
  } = useTwilioDevice({
    onCallStatusChange: async (status) => {
      if (activeCallId) {
        await updateCallStatus({
          id: activeCallId,
          status: status,
        });
      }
    },
    onCallEnd: async () => {
      if (activeCallId) {
        await updateCallStatus({
          id: activeCallId,
          status: "completed",
          endTime: Date.now(),
          duration: callDuration,
        });
        setActiveCallId(null);
        setCallDuration(0);
      }
    },
  });

  // Update call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCall && callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentCall, callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const keys = useMemo(
    () => [
      { p: "1", s: "" },
      { p: "2", s: "ABC" },
      { p: "3", s: "DEF" },
      { p: "4", s: "GHI" },
      { p: "5", s: "JKL" },
      { p: "6", s: "MNO" },
      { p: "7", s: "PQRS" },
      { p: "8", s: "TUV" },
      { p: "9", s: "WXYZ" },
      { p: "*", s: "" },
      { p: "0", s: "+" },
      { p: "#", s: "" },
    ],
    []
  );

  function press(key: string) {
    setDigits((d) => (d + key).slice(0, 32));
  }

  function backspace() {
    setDigits((d) => d.slice(0, -1));
  }

  return (
    <div className="max-w-md mx-auto h-full grid grid-rows-[auto_1fr_auto] p-4">
      <div className="flex flex-col items-center justify-center py-4">
        {currentCall && callStatus === "connected" && (
          <div className="text-sm text-foreground/60 mb-2">
            Call Duration: {formatDuration(callDuration)}
          </div>
        )}
        {callStatus && callStatus !== "disconnected" && (
          <div className="text-sm text-foreground/60 mb-2">
            Status: {callStatus}
          </div>
        )}
        {error && (
          <div className="text-sm text-red-500 mb-2">
            Error: {error}
          </div>
        )}
        <input
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/[^0-9*#+]/g, ""))}
          placeholder="Enter number"
          inputMode="tel"
          className="w-full text-center text-3xl bg-transparent outline-none placeholder:text-foreground/40"
          disabled={!!currentCall}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 place-items-center content-center">
        {keys.map((k) => (
          <button
            key={k.p + k.s}
            onClick={() => press(k.p)}
            className="size-20 rounded-full border border-black/10 dark:border-white/15 flex flex-col items-center justify-center active:scale-95 transition-transform"
          >
            <span className="text-2xl font-medium">{k.p}</span>
            {k.s && <span className="text-[10px] tracking-wide text-foreground/60">{k.s}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 py-5">
        <button
          onClick={backspace}
          aria-label="Delete"
          className="size-14 flex items-center justify-center rounded-full border border-black/10 dark:border-white/15"
        >
          <Delete className="size-5" />
        </button>
        {!currentCall ? (
          <button
            onClick={async () => {
              if (!digits || !isReady) return;
              try {
                // Create call record in Convex
                const callId = await createCall({ 
                  number: digits, 
                  type: "outgoing",
                  status: "initiating" 
                });
                setActiveCallId(callId);
                
                // Make actual call via Twilio
                const call = await makeCall(digits);
                if (call) {
                  // Update with Twilio SID
                  await updateCallStatus({
                    id: callId,
                    twilioCallSid: call.parameters.CallSid,
                    status: "ringing",
                  });
                }
              } catch (err) {
                console.error(err);
                alert("Failed to make call: " + (err as Error).message);
              }
            }}
            disabled={!digits || !isReady}
            className="size-16 rounded-full bg-green-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <PhoneCall className="size-6" />
          </button>
        ) : (
          <button
            onClick={() => hangUp()}
            className="size-16 rounded-full bg-red-500 text-white flex items-center justify-center active:scale-95"
          >
            <PhoneOff className="size-6" />
          </button>
        )}
        <span className="size-14" />
      </div>
    </div>
  );
}

function CallLog() {
  const apiAny = generatedApi as any;
  const items = useQuery(apiAny.calls.list) as CallLogItem[] | undefined;
  const remove = useMutation(apiAny.calls.remove);

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Recents</h1>
      {!items ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-foreground/60">No recent calls</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <SwipeToDeleteItem
              key={it._id}
              onDelete={async () => {
                try {
                  await remove({ id: it._id });
                } catch (err) {
                  console.error(err);
                  alert("Failed to delete call");
                }
              }}
            >
              <div className="py-3 px-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {it.name || it.number}
                  </p>
                  <p className="text-xs text-foreground/60 truncate">
                    {it.name ? it.number + " · " : ""}
                    {it.type.charAt(0).toUpperCase() + it.type.slice(1)}
                  </p>
                </div>
                <div className="text-xs text-foreground/60 ml-3 shrink-0">
                  {formatTime(it.createdAt)}
                </div>
              </div>
            </SwipeToDeleteItem>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString();
}

function SwipeToDeleteItem({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void | Promise<void>;
}) {
  const [dx, setDx] = useState(0);
  const startXRef = useRef<number | null>(null);
  const draggingRef = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current || startXRef.current === null) return;
    const delta = e.clientX - startXRef.current;
    if (delta < 0) setDx(delta);
  }

  async function onPointerUp() {
    draggingRef.current = false;
    const threshold = -80;
    if (dx <= threshold) {
      setDx(-120);
      await onDelete();
      setDx(0);
    } else {
      setDx(0);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-background">
      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 text-white flex items-center justify-center">
        <Delete className="size-5" />
      </div>
      <div
        className="relative"
        style={{ transform: `translateX(${dx}px)`, transition: draggingRef.current ? "none" : "transform 0.2s ease" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}

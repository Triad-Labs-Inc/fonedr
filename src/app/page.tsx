"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Phone, History, Delete, PhoneCall, PhoneOff, User, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api as generatedApi } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useTwilioDevice } from "@/hooks/useTwilioDevice";

type TabKey = "dial" | "log" | "contacts";

type CallLogItem = {
  _id: Id<"calls">;
  number: string;
  name?: string;
  type: "incoming" | "outgoing" | "missed";
  createdAt: number;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dial");
  const [digits, setDigits] = useState<string>("");
  return (
    <div className="font-sans min-h-dvh bg-background text-foreground grid grid-rows-[1fr_auto]">
      <main className="relative overflow-hidden">
        {activeTab === "dial" && <DialPad digits={digits} setDigits={setDigits} />}
        {activeTab === "log" && <CallLog />}
        {activeTab === "contacts" && (
          <Contacts
            onSelectNumber={(n) => {
              setDigits(n);
              setActiveTab("dial");
            }}
          />
        )}
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
      <div className="max-w-md mx-auto grid grid-cols-3">
        <button
          aria-label="Dial pad"
          onClick={() => onChange("dial")}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${
            activeTab === "dial" ? "text-foreground" : "text-foreground/60"
          }`}
        >
          <Phone className="size-5" />
          <span className="text-xs">Dial</span>
        </button>
        <button
          aria-label="Call log"
          onClick={() => onChange("log")}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${
            activeTab === "log" ? "text-foreground" : "text-foreground/60"
          }`}
        >
          <History className="size-5" />
          <span className="text-xs">Calls</span>
        </button>
        <button
          aria-label="Contacts"
          onClick={() => onChange("contacts")}
          className={`flex flex-col items-center justify-center gap-1 py-2 ${
            activeTab === "contacts" ? "text-foreground" : "text-foreground/60"
          }`}
        >
          <User className="size-5" />
          <span className="text-xs">Contacts</span>
        </button>
      </div>
    </nav>
  );
}

function DialPad({
  digits,
  setDigits,
}: {
  digits: string;
  setDigits: (val: string) => void;
}) {
  const [activeCallId, setActiveCallId] = useState<Id<"calls"> | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [conferenceMode, setConferenceMode] = useState(true); // Default to conference mode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiAny = generatedApi as any;
  const createCall = useMutation(apiAny.calls.create);
  const updateCallStatus = useMutation(apiAny.calls.updateCallStatus);
  // const activeCall = useQuery(apiAny.calls.getActiveCall);
  const contacts = useQuery(apiAny.contacts.list) as Array<{ _id: string; name: string; number: string }> | undefined;
  
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
    setDigits((digits + key).slice(0, 32));
  }

  function backspace() {
    setDigits(digits.slice(0, -1));
  }

  return (
    <div className="max-w-md mx-auto h-full grid grid-rows-[auto_1fr_auto] p-4">
      <div className="flex flex-col items-center justify-center py-4">
        {/* Conference Mode Toggle */}
        <div className="flex items-center gap-2 mb-3">
          <label className="flex items-center gap-2 text-sm text-foreground/60">
            <input
              type="checkbox"
              checked={conferenceMode}
              onChange={(e) => setConferenceMode(e.target.checked)}
              disabled={!!currentCall}
              className="rounded"
            />
            Conference Mode (3-way calling)
          </label>
        </div>
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
        {(() => {
          if (!contacts || digits.replace(/\D/g, "").length < 3) return null;
          const normalizedDigits = digits.replace(/\D/g, "");
          const match = contacts.find((c) => c.number.replace(/\D/g, "").endsWith(normalizedDigits));
          if (!match) return null;
          return (
            <div className="mt-2 text-sm text-foreground/70">
              {match.name} • {match.number}
            </div>
          );
        })()}
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
      <div className="grid grid-cols-3 items-center justify-items-center gap-6 py-5">
        <span className="size-14" />
        {!currentCall ? (
          <button
            onClick={async () => {
              if (!digits || !isReady) return;
              try {
                // Create call record in Convex
                const secondParticipant = process.env.NEXT_PUBLIC_TWILIO_SECOND_PARTICIPANT || "";
                const callId = await createCall({ 
                  number: digits, 
                  type: "outgoing",
                  status: "initiating",
                  isConference: conferenceMode,
                  participants: conferenceMode ? [digits, secondParticipant] : undefined,
                });
                setActiveCallId(callId);
                
                // Make actual call via Twilio (with conference mode if enabled)
                const call = await makeCall(digits, conferenceMode);
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
            className="size-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            <PhoneCall className="size-6" />
          </button>
        ) : (
          <button
            onClick={() => hangUp()}
            className="size-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg active:scale-95"
          >
            <PhoneOff className="size-6" />
          </button>
        )}
        <button
          onClick={backspace}
          aria-label="Delete"
          className="size-14 flex items-center justify-center rounded-full border border-black/10 dark:border-white/15"
        >
          <Delete className="size-5" />
        </button>
      </div>
    </div>
  );
}

function CallLog() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={it.name} number={it.number} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {it.name || it.number}
                    </p>
                    <p className="text-xs text-foreground/60 truncate">
                      {it.name ? it.number + " · " : ""}
                      {it.type.charAt(0).toUpperCase() + it.type.slice(1)}
                    </p>
                  </div>
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

function Contacts({ onSelectNumber }: { onSelectNumber: (number: string) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiAny = generatedApi as any;
  const contacts = useQuery(apiAny.contacts.list) as Array<{ _id: string; name: string; number: string }> | undefined;
  const create = useMutation(apiAny.contacts.create);

  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;
    try {
      await create({ name: name.trim(), number: number.trim() });
      setName("");
      setNumber("");
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to add contact");
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Contacts</h1>
      <div className="mb-2" />
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full sm:max-w-sm sm:rounded-xl sm:border sm:border-black/10 sm:dark:border-white/15 bg-background p-4 shadow-lg">
            <h2 className="text-base font-semibold mb-3">New contact</h2>
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                autoFocus
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
              />
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Phone number"
                inputMode="tel"
                className="w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-black/10 dark:border-white/15 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-foreground text-background text-sm font-medium px-3 py-2 disabled:opacity-50"
                  disabled={!name.trim() || !number.trim()}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {!contacts ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-foreground/60">No contacts yet</p>
      ) : (
        <ul className="divide-y divide-black/10 dark:divide-white/10">
          {contacts.map((c) => (
            <li key={c._id} className="py-1">
              <button
                onClick={() => onSelectNumber(c.number)}
                className="w-full px-2 py-2 rounded-lg hover:bg-foreground/5 active:bg-foreground/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <Avatar name={c.name} number={c.number} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-foreground/60 truncate">{c.number}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setOpen(true)}
        aria-label="Add contact"
        className="fixed bottom-20 right-6 z-40 size-14 rounded-full bg-foreground text-background flex items-center justify-center shadow-xl"
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}

function Avatar({ name, number }: { name?: string; number: string }) {
  const label = (name?.trim() ? name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") : number.replace(/\D/g, "").slice(-2)) || "?";
  return (
    <div className="size-9 rounded-full bg-foreground/10 text-foreground flex items-center justify-center text-xs font-medium">
      {label}
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

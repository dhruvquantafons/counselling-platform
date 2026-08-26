"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = "http://localhost:4000";

type SessionAccessState =
  | "UNCONFIRMED"
  | "NOT_STARTED"
  | "OPEN_EARLY"
  | "IN_SESSION"
  | "ENDED";

interface SessionInfoBase {
  bookingId: string;
  status: string;
  accessState: SessionAccessState;
  counsellorId: string;
  counsellorName: string;
  visitorName: string;
}

interface SessionInfoConfirmed extends SessionInfoBase {
  accessState: Exclude<SessionAccessState, "UNCONFIRMED">;
  roomId: string | null;
  counsellorSpecialisation: string;
  counsellorEmail: string;
  visitorEmail: string;
  startTime: string;
  sessionDurationMinutes: number;
  earlyEntryAt: string;
  sessionEndsAt: string;
  msUntilEntry: number;
  msUntilEnd: number;
  isJoinable: boolean;
}

type SessionInfo = SessionInfoBase | SessionInfoConfirmed;

// Allow TypeScript access to the lazily-injected Jitsi/JaaS SDK global.
declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// Compact clock-style countdown: MM:SS (or HH:MM:SS when ≥ 1 hour).
function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type DeviceStatus = "idle" | "testing" | "ok" | "denied" | "error";
type ConnBand = "good" | "ok" | "slow" | "idle" | "testing";

export default function Session() {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [role, setRole] = useState<"visitor" | "counsellor" | null>(null);

  // Countdown target refreshed from server msUntilEntry each poll; 100ms ticker for smooth animation.
  const [countdownTarget, setCountdownTarget] = useState<number | null>(null);
  const [, setNowTick] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ───────────────── Device check state (Step 3.3) ─────────────────
  const [deviceCheckOpen, setDeviceCheckOpen] = useState(true);
  const [activeTest, setActiveTest] = useState<"camera" | "mic" | "connection" | null>(null);
  const [cameraStatus, setCameraStatus] = useState<DeviceStatus>("idle");
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [micStatus, setMicStatus] = useState<DeviceStatus>("idle");
  const [micMessage, setMicMessage] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState<ConnBand>("idle");
  const [connMs, setConnMs] = useState<number | null>(null);
  const [connMessage, setConnMessage] = useState<string | null>(null);

  // ─────────────────── Join session state (P3.1) ───────────────────
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<{
    role: string;
    roomId: string;
    moderator: boolean;
    token?: string;
    domain?: string;
  } | null>(null);

  // ─────── Client-side time-window clamp (P3.2: 100ms, no poll lag) ───────
  // Server poll flips accessState every ~1s. This local clamp reacts in one
  // tick (~100ms) the instant msUntilEntry / msUntilEnd cross 0, so the UI
  // and left video panel react immediately instead of lagging up to 1s.
  const [clientForcedEnded, setClientForcedEnded] = useState(false);
  const [clientForcedNotOpen, setClientForcedNotOpen] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  // ───────────── JaaS / Jitsi lazy refs (Step 1 JAAS mount) ─────────────
  // Promise singleton for SDK load — prevents double script injection.
  const jaasScriptLoadedRef = useRef<Promise<void> | null>(null);
  // Active JitsiMeetExternalAPI instance (mutated on mount, disposed on unmount / ENDED / rejoin).
  const jaasApiRef = useRef<any | null>(null);
  // The <div> the Jitsi iframe replaces / fills inside our LEFT panel.
  const jaasMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("bookingId");
    // Fallback: if query param missing, try last-saved booking from localStorage.
    // Prevents dead-end "Missing booking ID" screen when a redirect drops the param.
    const fallback =
      !id ? window.localStorage.getItem("lastBookingId") : null;
    if (fallback && !id) {
      setBookingId(fallback);
    } else {
      setBookingId(id);
    }
  }, []);

  // Persist bookingId so a dropped query param (bare /session) auto-recovers next load.
  useEffect(() => {
    if (typeof window === "undefined" || !bookingId) return;
    try { window.localStorage.setItem("lastBookingId", bookingId); } catch { /* noop */ }
  }, [bookingId]);

  // Load session-info from backend, poll every 1s. Stop polling once ENDED.
  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    let interval: NodeJS.Timeout | null = null;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/session-info`, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setInfoError(body?.error || `Request failed (status ${res.status})`);
          setSessionInfo(null);
          return;
        }
        const data = (await res.json()) as SessionInfo;
        setSessionInfo(data);
        setInfoError(null);

        if (data.accessState === "NOT_STARTED" || data.accessState === "OPEN_EARLY") {
          setCountdownTarget(Date.now() + (data as SessionInfoConfirmed).msUntilEntry);
        } else {
          setCountdownTarget(null);
        }

        if (data.accessState === "ENDED" && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (e) {
        if (cancelled) return;
        setInfoError("Could not reach session server. Check your connection.");
      }
    }

    load();
    interval = setInterval(load, 1000);
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [bookingId]);

  // 100ms ticker for smooth animated countdown display.
  useEffect(() => {
    if (!countdownTarget) {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      return;
    }
    countdownRef.current = setInterval(() => setNowTick((t) => t + 1), 100);
    return () => { if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; } };
  }, [countdownTarget]);

  // ── P3.2: Client-side clamp that runs every render tick (driven by setNowTick / polls) ──
  useEffect(() => {
    if (!sessionInfo || sessionInfo.accessState === "UNCONFIRMED") {
      setClientForcedEnded(false);
      setClientForcedNotOpen(false);
      return;
    }
    const c = sessionInfo as SessionInfoConfirmed;

    // msUntilEnd = negative or 0 → session window has closed client-side.
    if (typeof c.msUntilEnd === "number" && c.msUntilEnd <= 0 && !clientForcedEnded) {
      setClientForcedEnded(true);
      // Clear any stale join state from right before the boundary.
      setJoinSuccess(null);
      setJoinError(null);
      // ── Step 3 disposal: immediately hang up + tear down Jitsi iframe ──
      // Prevents a ~1s gap where user sees "session ended" overlay stacked on
      // top of a still-active video stream before the server poll flips.
      disposeJaas();
      setJaasDisconnected(false);
      setDisconnectedReason(null);
    }
    // msUntilEntry still > 0 → room is still closed client-side (NOT_STARTED clamp display).
    // Clear flag when accessState becomes OPEN_EARLY / IN_SESSION (server confirmed open).
    const stillPendingClient =
      c.accessState === "NOT_STARTED" && typeof c.msUntilEntry === "number" && c.msUntilEntry > 0;
    setClientForcedNotOpen(stillPendingClient);

    // Reset clamp the moment server flips accessState to ENDED (authoritative) so
    // we don't double-apply, and reset the pending clamp if server moved past NOT_STARTED.
    // Also dispose Jitsi once the server confirms authoritative ENDED.
    if (c.accessState === "ENDED") {
      if (!clientForcedEnded) disposeJaas();
      setClientForcedEnded(false);
      setJaasDisconnected(false);
      setDisconnectedReason(null);
    }
    if (c.accessState !== "NOT_STARTED") setClientForcedNotOpen(false);
  }, [sessionInfo, clientForcedEnded]);

  // ── Step 3 disposal: guarantee Jitsi teardown on React unmount ──
  // Kills orphaned iframes + frees the Jitsi listeners if user navigates
  // away mid-session (e.g. close tab, back button, router nav to manage booking).
  useEffect(() => {
    return () => {
      try { disposeJaas(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto detect role — counsellor token in localStorage that matches the booking's counsellorId.
  useEffect(() => {
    if (typeof window === "undefined" || !sessionInfo) return;
    const token = window.localStorage.getItem("counsellorToken");
    if (token && token === sessionInfo.counsellorId) {
      setRole("counsellor");
    } else {
      setRole("visitor");
    }
  }, [sessionInfo]);

  // ──────────── Device check: cleanup on unmount ────────────
  useEffect(() => {
    return () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // ──────────── Device check: Camera test ────────────
  async function testCamera() {
    setCameraStatus("testing");
    setCameraMessage(null);
    // Stop any existing preview first.
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => {});
      }
      setCameraStatus("ok");
      setCameraMessage("Camera is working.");
      // Hold the stream for ~2.5s to show the preview, then release.
      setTimeout(() => {
        cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
      }, 2500);
    } catch (err: any) {
      if (err?.name === "NotAllowedError" || err?.message === "unsupported") {
        setCameraStatus("denied");
        setCameraMessage(
          "Camera permission denied. Please enable it in your browser settings."
        );
      } else {
        setCameraStatus("error");
        setCameraMessage("Camera test failed. Please check your device.");
      }
    }
  }

  // ──────────── Device check: Microphone test with live waveform ────────────
  function stopMic() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  function drawWaveform(analyser: AnalyserNode, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 24;
    const step = Math.floor(bufferLen / bars);
    const barW = canvas.width / bars;
    for (let i = 0; i < bars; i++) {
      const val = data[i * step] / 255;
      const h = Math.max(2, val * canvas.height);
      ctx.fillStyle = val > 0.55 ? "#4c8b75" : val > 0.25 ? "#7bb098" : "#c7ddcd";
      ctx.fillRect(i * barW + 1, canvas.height - h, Math.max(1, barW - 2), h);
    }
  }

  async function testMic() {
    setMicStatus("testing");
    setMicMessage(null);
    stopMic();
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("unsupported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ac = new AC();
      audioCtxRef.current = ac;
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;

      setMicStatus("ok");
      setMicMessage("Microphone is working.");

      // Animate waveform for ~3s, then release the mic.
      const started = Date.now();
      const tick = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        drawWaveform(analyserRef.current, canvasRef.current);
        if (Date.now() - started < 3000) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          stopMic();
          if (canvasRef.current) {
            const c = canvasRef.current.getContext("2d");
            c?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      };
      tick();
    } catch (err: any) {
      stopMic();
      if (err?.name === "NotAllowedError" || err?.message === "unsupported") {
        setMicStatus("denied");
        setMicMessage(
          "Microphone permission denied. Please enable it in your browser settings."
        );
      } else {
        setMicStatus("error");
        setMicMessage("Microphone test failed. Please check your device.");
      }
    }
  }

  // ──────────── Device check: Connection (RTT to session-info) ────────────
  async function testConnection() {
    if (!bookingId) return;
    setConnStatus("testing");
    setConnMs(null);
    setConnMessage(null);
    const start = performance.now();
    try {
      const res = await fetch(
        `${API_BASE}/api/bookings/${bookingId}/session-info`,
        { cache: "no-store" }
      );
      const rtt = Math.round(performance.now() - start);
      setConnMs(rtt);
      if (!res.ok) throw new Error("bad response");
      if (rtt < 200) {
        setConnStatus("good");
        setConnMessage(`Good connection (${rtt}ms)`);
      } else if (rtt < 1000) {
        setConnStatus("ok");
        setConnMessage(`OK connection (${rtt}ms)`);
      } else {
        setConnStatus("slow");
        setConnMessage(
          `Slow connection (${rtt}ms) — video may stutter. Consider a wired or closer Wi-Fi connection.`
        );
      }
    } catch {
      setConnStatus("slow");
      setConnMessage("Could not reach the session server. Check your internet connection.");
    }
  }

  // ──────────────── JaaS SDK lazy loader (Step 1 JAAS mount) ────────────────
  // Injects https://<domain>/external_api.js async via <script> tag only on
  // first Join click. Returns a Promise singleton; clicks while loading reuse
  // the same promise, and failure clears the ref so user can retry.
  function loadJaaSExternalApi(domain: string): Promise<void> {
    if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
    if (window.JitsiMeetExternalAPI) return Promise.resolve();
    if (jaasScriptLoadedRef.current) return jaasScriptLoadedRef.current;
    jaasScriptLoadedRef.current = new Promise<void>((resolve, reject) => {
      const src = `https://${domain}/external_api.js`;
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Failed to load video SDK")));
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.addEventListener("load", () => resolve());
      s.addEventListener("error", () => {
        jaasScriptLoadedRef.current = null;
        reject(new Error("Failed to load video SDK (8x8.vc unreachable)."));
      });
      document.head.appendChild(s);
    });
    return jaasScriptLoadedRef.current;
  }

  // ─────────────────── Join session handler (P3.1 + Step 1) ───────────────────
  async function joinSession() {
    if (!bookingId || !role || !sessionInfo || !confirmed) return;
    setIsJoining(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const params = new URLSearchParams({ role });
      if (role === "counsellor") {
        const token = window.localStorage.getItem("counsellorToken");
        if (token) params.set("counsellorId", token);
      }
      const res = await fetch(
        `${API_BASE}/api/bookings/${bookingId}/join-token?${params.toString()}`,
        { cache: "no-store" }
      );
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        let msg = body?.error || `Join request failed (${res.status})`;
        if (res.status === 403 && body?.msUntilOpen) {
          msg += ` Opens in ${formatDuration(body.msUntilOpen)}.`;
        }
        setJoinError(msg);
        return;
      }
      // All server guards passed. Lazy-load the JaaS External API script.
      // (Step 2 will mount the actual iframe using body.token + roomId + domain.)
      const domain: string = body.domain || "8x8.vc";
      await loadJaaSExternalApi(domain);
      setJoinSuccess({
        role: body.role || role,
        roomId: body.roomId || confirmed.roomId || "",
        moderator: !!body.user?.moderator,
        token: body.token,
        domain,
      });
    } catch (e: any) {
      setJoinError(e?.message || "Could not reach the session server. Check your connection and retry.");
    } finally {
      setIsJoining(false);
    }
  }

  // ──────── JaaS iframe mount state + helpers (Step 2/3 JAAS) ────────
  const [jaasMounted, setJaasMounted] = useState(false);
  const [jaasMountingError, setJaasMountingError] = useState<string | null>(null);
  // Set to true when Jitsi fires videoConferenceLeft / videoConferenceFailed while
  // the session window (msUntilEnd) is still open. Enables Rejoin prompt per spec item 7.
  const [jaasDisconnected, setJaasDisconnected] = useState(false);
  const [disconnectedReason, setDisconnectedReason] = useState<string | null>(null);

  /** Safely tear down any active JitsiMeetExternalAPI + empty the mount div. */
  function disposeJaas() {
    try {
      const api = jaasApiRef.current;
      if (api) {
        try { api.removeAllListeners?.(); } catch {}
        try { api.executeCommand?.("hangup"); } catch {}
        try { api.dispose?.(); } catch {}
        jaasApiRef.current = null;
      }
    } catch {}
    if (jaasMountRef.current) {
      while (jaasMountRef.current.firstChild) {
        jaasMountRef.current.removeChild(jaasMountRef.current.firstChild);
      }
    }
    setJaasMounted(false);
  }

  /** Mount a fresh JitsiMeetExternalAPI using live credentials from /join-token. */
  async function mountJitsi(credentials: {
    token: string;
    roomId: string;
    domain: string;
    displayName: string;
    email: string;
  }) {
    if (typeof window === "undefined" || !window.JitsiMeetExternalAPI) {
      setJaasMountingError("Video SDK not loaded. Please click Join session again.");
      return;
    }
    if (!jaasMountRef.current) return;
    // Destroy any prior instance (supports Rejoin later in Step 3).
    disposeJaas();
    setJaasMountingError(null);
    try {
      const api = new window.JitsiMeetExternalAPI(credentials.domain, {
        roomName: credentials.roomId,
        jwt: credentials.token,
        parentNode: jaasMountRef.current,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName: credentials.displayName,
          email: credentials.email,
        },
        // Bypass Jitsi's built-in "prejoin" page — user already ran our bespoke
        // pre-session device check (camera/mic/connection) in Step 3.3.
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          localRecording: false,
          fileRecordingsEnabled: false,
          liveStreamingEnabled: false,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          // Minimal 1:1 counselling toolbar
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "hangup",
            "chat",
            "fullscreen",
            "settings",
            "raisehand",
            "tileview",
          ],
        },
      });
      jaasApiRef.current = api;

      // ── Step 3 wiring: attach mid-session disconnect listeners ──
      // We listen to 4 events. `removeAllListeners` in disposeJaas() (called on
      // dispose / unmount / rejoin) guarantees zero listener leaks.
      const onLeftOrFailed = (event: any, kind: "left" | "failed") => {
        const c = sessionInfo as SessionInfoConfirmed | null;
        const stillOpen =
          c && typeof c.msUntilEnd === "number" && c.msUntilEnd > 0;
        disposeJaas();
        if (stillOpen) {
          // Session window still alive → surface Rejoin prompt instead of generic mount error.
          setJaasDisconnected(true);
          const reason =
            kind === "failed"
              ? "Your connection to the video server dropped."
              : event?.reason === "kicked"
              ? "You were removed from the room."
              : event?.reason === "hangup"
              ? "The call ended."
              : "The video call ended unexpectedly.";
          setDisconnectedReason(reason);
        } else {
          // Session window already closed → clamp overlay handles it; no rejoin prompt.
          setJaasDisconnected(false);
          setDisconnectedReason(null);
        }
      };
      api.on("videoConferenceLeft", (e: any) => onLeftOrFailed(e, "left"));
      api.on("videoConferenceFailed", (e: any) => onLeftOrFailed(e, "failed"));
      api.on("passwordRequired", () => {
        disposeJaas();
        setJaasMountingError("Unexpected room lock (password protected). Please retry." );
      });
      api.on("readyToClose", () => disposeJaas());

      // If user clicked the built-in "End call" / Jitsi hangup inside the toolbar,
      // they'll land at videoConferenceLeft with reason="hangup", which we allow
      // to surface as a rejoin prompt while the window is still open — consistent
      // with the spec requirement that rejoin is permitted within the window.

      setJaasMounted(true);
      // Clear any stale state from a prior disconnection.
      setJaasDisconnected(false);
      setDisconnectedReason(null);
    } catch (e: any) {
      disposeJaas();
      setJaasMountingError(
        e?.message || "The video room failed to start. Please close any browser popups and retry."
      );
    }
  }

  // Auto-mount Jitsi the moment /join-token returns live credentials.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (joinSuccess?.token && joinSuccess?.domain && joinSuccess?.roomId) {
      const displayName =
        role === "counsellor"
          ? (confirmed?.counsellorName || "Counsellor")
          : (confirmed?.visitorName || "Visitor");
      const email =
        role === "counsellor"
          ? (confirmed?.counsellorEmail || "")
          : (confirmed?.visitorEmail || "");
      void mountJitsi({
        token: joinSuccess.token,
        domain: joinSuccess.domain,
        roomId: joinSuccess.roomId,
        displayName,
        email,
      });
    }
  }, [joinSuccess]);

  const displayRole = useMemo(() => {
    if (!role || !sessionInfo) return null;
    if (role === "counsellor") {
      return { label: sessionInfo.counsellorName, tag: "Counsellor (Moderator)" };
    }
    return { label: sessionInfo.visitorName, tag: "Visitor" };
  }, [role, sessionInfo]);

  // ────────────────── Early error / loading screens ──────────────────
  if (!bookingId) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
        <div className="bg-cream rounded-2xl p-10 text-center border border-ink/5 shadow-soft">
          <div className="w-14 h-14 rounded-full bg-ink/5 flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-ink/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-ink mb-3">Missing booking ID</h1>
          <p className="text-ink/60 max-w-md mx-auto mb-6">
            A valid session link contains a <span className="font-mono text-ink/80">bookingId</span> in the URL.
            Return to your confirmation email or the{" "}
            <Link href="/" className="text-sage-dark underline underline-offset-2">home page</Link> to find your booking.
          </p>
        </div>
      </main>
    );
  }

  if (infoError) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
        <div className="bg-cream rounded-2xl p-10 text-center border border-amber/10 shadow-soft">
          <div className="w-14 h-14 rounded-full bg-amber-light/60 flex items-center justify-center mx-auto mb-5">
            <svg className="w-6 h-6 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-ink mb-3">Could not load your session</h1>
          <p className="text-ink/60 max-w-md mx-auto mb-6">{infoError}</p>
          <Link
            href="/booking/manage"
            className="inline-flex items-center gap-2 bg-sage text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-sage-dark transition-colors active:scale-[0.98]"
          >
            Manage my booking
          </Link>
        </div>
      </main>
    );
  }

  if (!sessionInfo || !displayRole) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-20 animate-fade-in">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="aspect-video bg-ink rounded-2xl flex items-center justify-center shadow-soft-lg">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-white/15 border-t-white/70 mx-auto mb-4 animate-spin" />
              <p className="font-mono text-xs uppercase tracking-wide text-white/50">Loading session…</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-20 bg-cream rounded-2xl animate-pulse-soft" />
            <div className="h-16 bg-cream rounded-xl animate-pulse-soft" />
            <div className="h-28 bg-cream rounded-xl animate-pulse-soft" />
          </div>
        </div>
      </main>
    );
  }

  // UNCONFIRMED state: PENDING or CANCELLED booking — no scheduled slot yet.
  if (sessionInfo.accessState === "UNCONFIRMED") {
    const isPending = sessionInfo.status === "PENDING";
    return (
      <main className="max-w-3xl mx-auto px-6 py-20 animate-fade-in">
        <div className="bg-cream rounded-2xl p-10 border border-ink/5 shadow-soft text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${isPending ? "bg-sage-light" : "bg-ink/5"}`}>
            <svg className={`w-6 h-6 ${isPending ? "text-sage-dark" : "text-ink/40"}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-ink mb-3">
            {isPending ? "Pick your session time" : "This booking has been cancelled"}
          </h1>
          <p className="text-ink/60 max-w-md mx-auto mb-6">
            {isPending
              ? "Your payment is complete, but this booking doesn't have a scheduled time yet. Choose a time slot to unlock the video session room."
              : "This booking was cancelled — there is no scheduled video session. If this is a mistake, go to Manage booking or contact support."}
          </p>
          <Link
            href={`/booking/manage?bookingId=${sessionInfo.bookingId}`}
            className="inline-flex items-center gap-2 bg-sage text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-sage-dark transition-colors active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Manage booking
          </Link>
        </div>
      </main>
    );
  }

  // Confirmed booking: render the main two-column session layout.
  const confirmed = sessionInfo as SessionInfoConfirmed;

  return (
    <main className="max-w-6xl mx-auto px-6 py-16 animate-fade-in">
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* ───────────── LEFT: Video room panel ───────────── */}
        {/* ───────────── LEFT: Video room panel + Device testing ───────────── */}
        <div className="flex flex-col gap-6">
          <div className="relative aspect-video bg-ink rounded-2xl overflow-hidden flex items-center justify-center shadow-soft-lg">
            {/* JAAS iframe mount point (absolute fill, behind placeholder + overlays) */}
            <div ref={jaasMountRef} className="absolute inset-0 z-0 bg-ink" />
            {/* Gradient chrome + placeholder only render when Jitsi iframe is NOT yet mounted. */}
            {!jaasMounted && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-sage-dark/30 to-ink/70 z-[1]" />
                <div className="relative z-[2] text-center px-4 max-w-md mx-auto w-full">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <p className="text-white/70 font-mono text-sm">
                    {isJoining
                      ? "Loading video SDK…"
                      : jaasDisconnected
                      ? "You were disconnected."
                      : jaasMountingError
                      ? "Video room not connected"
                      : "Video room — press Join session to enter"}
                  </p>
                  {/* ── Step 3 spec item 7: Mid-session drop → Rejoin prompt ── */}
                  {jaasDisconnected && confirmed && (
                    <div className="mt-4 max-w-sm mx-auto rounded-lg bg-amber-500/15 border border-amber-300/30 px-3 py-3 text-left animate-fade-in">
                      <div className="flex items-start gap-2 mb-2">
                        <svg className="w-4 h-4 text-amber-200 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        <div>
                          <p className="text-[12px] font-semibold text-amber-50 leading-snug">
                            Connection interrupted
                          </p>
                          <p className="text-[11px] text-amber-100/80 leading-snug mt-0.5">
                            {disconnectedReason || "The video call ended unexpectedly."}
                          </p>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-100/70 leading-snug mb-2.5 pl-6">
                        Rejoin is allowed until <span className="font-mono text-amber-50">{formatDate(confirmed.sessionEndsAt)}</span> ({formatDuration(confirmed.msUntilEnd)} remaining).
                      </p>
                      <div className="pl-6 flex gap-2">
                        <button
                          onClick={() => { setJaasDisconnected(false); setDisconnectedReason(null); joinSession(); }}
                          className="text-[11px] text-amber-950 bg-amber hover:bg-amber-dark rounded-full px-3 py-1.5 font-semibold border border-amber-700/30 transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.25" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                          Rejoin session
                        </button>
                        <button
                          onClick={() => { setJaasDisconnected(false); setDisconnectedReason(null); }}
                          className="text-[11px] text-amber-50 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1.5 font-medium border border-white/10 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                  {jaasMountingError && (
                    <div className="mt-4 max-w-sm mx-auto rounded-lg bg-rose-500/15 border border-rose-300/30 px-3 py-2 text-left">
                      <p className="text-[11px] text-rose-100/90 leading-snug mb-2">{jaasMountingError}</p>
                      <button
                        onClick={() => { setJaasMountingError(null); joinSession(); }}
                        className="text-[11px] text-rose-50 bg-white/10 hover:bg-white/20 rounded-full px-3 py-1 font-medium border border-white/10 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {/* Spinner overlay between credential receipt and first Jitsi paint. */}
            {!jaasMounted && !jaasMountingError && joinSuccess?.token && !isJoining && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 rounded-full bg-black/60 backdrop-blur-sm px-4 py-2 border border-white/10">
                  <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  <span className="text-[12px] text-white/90 font-mono tracking-wide">Entering video room…</span>
                </div>
              </div>
            )}

            {/* ── P3.2 client-side clamp overlay: instant ENDED / NOT_STARTED state ── */}
            {(clientForcedEnded || clientForcedNotOpen) && (
              <div className="absolute inset-0 z-10 bg-ink/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="text-center max-w-sm">
                  {clientForcedEnded ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 ring-1 ring-white/10">
                        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="font-display text-lg text-white mb-1">Session has ended</p>
                      <p className="text-[12px] text-white/60 leading-relaxed">
                        Access to the video room has been automatically revoked because the 50-minute session window closed.
                      </p>
                      <p className="mt-3 text-[11px] text-white/40 font-mono uppercase tracking-widest">
                        Concluded {formatDate(confirmed.sessionEndsAt)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 ring-1 ring-white/10">
                        <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                      </div>
                      <p className="font-display text-lg text-white mb-1">Room not open yet</p>
                      <p className="text-[12px] text-white/60 leading-relaxed mb-3">
                        Video room is locked until 5 minutes before your scheduled time.
                      </p>
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/10">
                        <span className="font-mono text-lg text-white tabular-nums">
                          {formatDuration(confirmed.msUntilEntry)}
                        </span>
                        <span className="text-[10px] text-white/50 uppercase tracking-widest">until opens</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-6 items-start w-full justify-between">
            {/* ──────────────── Device check block of 3 icons ──────────────── */}
            <div className="bg-cream rounded-2xl border border-ink/5 shadow-soft p-2.5 transition-all duration-300 w-fit flex flex-col items-center shrink-0">
              <div className="flex items-center gap-3">
                {/* Camera Button */}
                <button
                  onClick={() => setActiveTest(activeTest === "camera" ? null : "camera")}
                  className={`p-2 rounded-full transition-all duration-200 relative ${
                    activeTest === "camera"
                      ? "bg-sage/10 text-sage-dark scale-105"
                      : "bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink/80"
                  }`}
                  title="Test Camera"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
                  </svg>
                  {cameraStatus !== "idle" && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                      cameraStatus === "testing" ? "bg-amber animate-pulse" :
                      cameraStatus === "ok" ? "bg-sage" : "bg-rose-500"
                    }`} />
                  )}
                </button>

                {/* Microphone Button */}
                <button
                  onClick={() => setActiveTest(activeTest === "mic" ? null : "mic")}
                  className={`p-2 rounded-full transition-all duration-200 relative ${
                    activeTest === "mic"
                      ? "bg-sage/10 text-sage-dark scale-105"
                      : "bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink/80"
                  }`}
                  title="Test Microphone"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                  {micStatus !== "idle" && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                      micStatus === "testing" ? "bg-amber animate-pulse" :
                      micStatus === "ok" ? "bg-sage" : "bg-rose-500"
                    }`} />
                  )}
                </button>

                {/* Connection Button */}
                <button
                  onClick={() => setActiveTest(activeTest === "connection" ? null : "connection")}
                  className={`p-2 rounded-full transition-all duration-200 relative ${
                    activeTest === "connection"
                      ? "bg-sage/10 text-sage-dark scale-105"
                      : "bg-ink/5 text-ink/60 hover:bg-ink/10 hover:text-ink/80"
                  }`}
                  title="Test Connection"
                >
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" />
                  </svg>
                  {connStatus !== "idle" && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                      connStatus === "testing" ? "bg-amber animate-pulse" :
                      connStatus === "good" ? "bg-sage" :
                      connStatus === "ok" ? "bg-amber" : "bg-rose-500"
                    }`} />
                  )}
                </button>
              </div>

              {/* Test Functionality Drawer */}
              {activeTest && (
                <div className="mt-3 border-t border-ink/5 pt-3 animate-fade-in space-y-3 w-72 sm:w-80">
                  {activeTest === "camera" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-ink">Camera Test</h4>
                          <p className="text-[11px] text-ink/50 mt-0.5">
                            {cameraMessage || "Preview what your counsellor will see"}
                          </p>
                        </div>
                        <button
                          onClick={testCamera}
                          disabled={cameraStatus === "testing"}
                          className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                            cameraStatus === "testing"
                              ? "bg-ink/5 text-ink/40 cursor-not-allowed"
                              : "bg-sage/10 text-sage-dark hover:bg-sage/20"
                          }`}
                        >
                          {cameraStatus === "testing" ? "Testing…" : cameraStatus === "idle" ? "Test camera" : "Retest"}
                        </button>
                      </div>

                      {cameraStatus !== "idle" && (
                        <div className="mt-3 rounded-lg overflow-hidden bg-ink aspect-video max-h-48 relative mx-auto">
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          {cameraStatus !== "ok" && (
                            <div className="absolute inset-0 flex items-center justify-center bg-ink/60 px-3 text-center">
                              <p className="text-[11px] text-white/80">
                                {cameraMessage}
                                {cameraStatus === "denied" && (
                                  <>
                                    {" "}
                                    <a
                                      href="https://support.google.com/chrome/answer/2693767"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="underline underline-offset-2 text-sage-200 hover:text-white"
                                    >
                                      Need help?
                                    </a>
                                  </>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTest === "mic" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-ink">Microphone Test</h4>
                          <p className="text-[11px] text-ink/50 mt-0.5">
                            {micMessage || "Check that your voice comes through clearly"}
                          </p>
                        </div>
                        <button
                          onClick={testMic}
                          disabled={micStatus === "testing"}
                          className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                            micStatus === "testing"
                              ? "bg-ink/5 text-ink/40 cursor-not-allowed"
                              : "bg-sage/10 text-sage-dark hover:bg-sage/20"
                          }`}
                        >
                          {micStatus === "testing" ? "Testing…" : micStatus === "idle" ? "Test mic" : "Retest"}
                        </button>
                      </div>

                      {micStatus !== "idle" && (
                        <div className="mt-3 rounded-lg bg-ink/90 p-3 h-14 flex items-center justify-center overflow-hidden">
                          {micStatus === "testing" || micStatus === "ok" ? (
                            <canvas
                              ref={canvasRef}
                              width={240}
                              height={32}
                              className="w-full h-full"
                            />
                          ) : (
                            <p className="text-[11px] text-white/80 text-center px-2">
                              {micMessage}
                              {micStatus === "denied" && (
                                <>
                                  {" "}
                                  <a
                                    href="https://support.google.com/chrome/answer/2693767"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline underline-offset-2 text-sage-200 hover:text-white"
                                  >
                                    Need help?
                                  </a>
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTest === "connection" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-ink">Connection Test</h4>
                          <p className="text-[11px] text-ink/50 mt-0.5">
                            {connMessage || "Round-trip latency to the session server"}
                          </p>
                        </div>
                        <button
                          onClick={testConnection}
                          disabled={connStatus === "testing"}
                          className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                            connStatus === "testing"
                              ? "bg-ink/5 text-ink/40 cursor-not-allowed"
                              : "bg-sage/10 text-sage-dark hover:bg-sage/20"
                          }`}
                        >
                          {connStatus === "testing"
                            ? `Testing…${connMs !== null ? ` ${connMs}ms` : ""}`
                            : connStatus === "idle"
                            ? "Test connection"
                            : "Retest"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── State-machine hero + countdown ── */}
            <div className="bg-cream rounded-2xl p-3 border border-ink/5 shadow-soft flex-1 w-full sm:max-w-xs animate-fade-in flex flex-col justify-center">
              {confirmed.accessState === "NOT_STARTED" && (
                <button disabled className="w-full bg-sage/50 text-white/80 rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Room opens soon — waiting…
                </button>
              )}
              {confirmed.accessState === "OPEN_EARLY" && (
                <button
                  onClick={joinSession}
                  disabled={isJoining}
                  className="w-full bg-amber text-white rounded-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-amber/90 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                  )}
                  {isJoining ? "Joining session…" : "Join session →"}
                </button>
              )}
              {confirmed.accessState === "IN_SESSION" && (
                <button
                  autoFocus
                  onClick={joinSession}
                  disabled={isJoining}
                  className="w-full bg-sage text-white rounded-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-sage-dark transition-colors active:scale-[0.98] shadow-lg shadow-sage/20 disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  {isJoining ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                  )}
                  {isJoining ? "Joining session…" : "Join session →"}
                </button>
              )}
              {/* ── Join inline feedback (P3.1) ── */}
              {(confirmed.accessState === "OPEN_EARLY" || confirmed.accessState === "IN_SESSION") && joinError && (
                <div className="mt-2 rounded-xl border border-rose-200/60 bg-rose-50 px-3 py-2 flex items-start gap-2 animate-fade-in">
                  <svg className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" /><path strokeLinecap="round" strokeLinejoin="round" d="m9.122 4.92 6.756-2.773a2.25 2.25 0 0 1 2.918 2.718l-1.072 3.275M14.878 19.08 8.122 21.853a2.25 2.25 0 0 1-2.918-2.718l1.072-3.275" /></svg>
                  <p className="text-[11px] text-rose-700 leading-snug">{joinError}</p>
                  <button onClick={() => setJoinError(null)} className="ml-auto text-rose-400 hover:text-rose-600 shrink-0" aria-label="Dismiss">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              {(confirmed.accessState === "OPEN_EARLY" || confirmed.accessState === "IN_SESSION") && joinSuccess && (
                <div className="mt-2 rounded-xl border border-sage/30 bg-sage-light/60 px-3 py-2 flex items-start gap-2 animate-fade-in">
                  <svg className="w-4 h-4 text-sage-dark mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <div className="text-[11px] text-sage-900 leading-snug">
                    <p className="font-semibold">{jaasMounted ? "Connected — " : "Credentials ready — "}{joinSuccess.moderator ? "Counsellor (Moderator)" : "Visitor"} access verified.</p>
                    <p className="text-sage-800/80 mt-0.5">Room: <span className="font-mono">{joinSuccess.roomId.slice(0, 12)}…</span> · Domain: <span className="font-mono">{joinSuccess.domain || "8x8.vc"}</span>{!jaasMounted && " · Entering room…"}</p>
                  </div>
                  <button onClick={() => setJoinSuccess(null)} className="ml-auto text-sage-700/70 hover:text-sage-900 shrink-0" aria-label="Dismiss">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
              {confirmed.accessState === "ENDED" && (
                <div className="w-full bg-ink/5 text-ink/50 rounded-full py-3 text-sm font-medium text-center">Session closed</div>
              )}
            </div>
          </div>
        </div>

        {/* ──────────────── RIGHT: Session info column ───────────────── */}
        <div className="space-y-6">
          {/* Role banner */}
          <div className="bg-cream rounded-2xl p-5 border border-sage/10 shadow-soft">
            <p className="text-[10px] font-mono text-sage-dark uppercase tracking-widest mb-2">
              You are joining as
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-sage-light flex items-center justify-center font-display text-base text-sage-dark ring-2 ring-sage/15">
                {initials(displayRole.label)}
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg text-ink truncate">{displayRole.label}</h2>
                <p className="text-xs font-mono text-ink/50 uppercase tracking-wide">
                  {displayRole.tag}
                </p>
              </div>
            </div>
            {role === "visitor" && (
              <p className="mt-3 text-xs text-ink/50">
                A counsellor account is required for moderator privileges.
              </p>
            )}
            {role === "counsellor" && (
              <Link
                href="/counsellor/login"
                className="mt-3 inline-block text-xs text-sage-dark underline underline-offset-2"
              >
                Not you? Sign in to a different counsellor account
              </Link>
            )}
          </div>

          {/* Session meta */}
          <div className="bg-cream/60 rounded-xl p-4 text-xs space-y-2 border border-ink/5 animate-fade-in">
            <div className="flex items-center justify-between"><span className="text-ink/50">Entry opens</span><span className="font-mono text-ink/70 text-right">{formatDate(confirmed.earlyEntryAt)}</span></div>
            <div className="flex items-center justify-between"><span className="text-ink/50">Session ID</span><span className="font-mono text-ink/60">#{confirmed.bookingId.slice(0, 8).toUpperCase()}</span></div>
            {confirmed.roomId && <div className="flex items-center justify-between"><span className="text-ink/50">Room ID</span><span className="font-mono text-ink/60" title={confirmed.roomId}>{confirmed.roomId.slice(0, 16)}…</span></div>}
          </div>




          {/* Session info panels */}
          <div className="bg-cream rounded-2xl p-5 border border-ink/5 shadow-soft space-y-4">
            <div>
              <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest mb-1.5">Session with</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage-light flex items-center justify-center font-display text-sm text-sage-dark ring-2 ring-sage/15">{initials(confirmed.counsellorName)}</div>
                <div className="min-w-0">
                  <p className="font-display text-base text-ink truncate">{confirmed.counsellorName}</p>
                  <p className="text-xs text-ink/50">{confirmed.counsellorSpecialisation}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-ink/5">
              <div>
                <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest mb-1">Scheduled at</p>
                <p className="font-mono text-sm text-ink">{formatDate(confirmed.startTime)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-ink/40 uppercase tracking-widest mb-1">Duration</p>
                <p className="font-mono text-sm text-ink">{confirmed.sessionDurationMinutes} min</p>
              </div>
            </div>
          </div>

          {/* Reschedule banner */}
          <div className="bg-amber-light/50 rounded-xl p-4 text-sm text-ink/70 border border-amber/10">
            <p className="font-medium text-ink mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Need to reschedule?
            </p>
            <p>
              You can reschedule up to 2 hours before your session without any
              charge.{" "}
              <Link
                href={`/booking/manage?bookingId=${confirmed.bookingId}`}
                className="text-sage-dark underline underline-offset-2 font-medium"
              >
                Manage this booking →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
import { useState, useRef, useEffect, useCallback } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  plus: "M12 5v14M5 12h14",
  play: "M5 3l14 9-14 9V3z",
  pause: "M6 4h4v16H6zM14 4h4v16h-4z",
  stop: "M3 3h18v18H3z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  music: "M9 18V5l12-2v13M9 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zM21 16c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z",
  image: "M21 15l-5-5L5 21M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  video: "M23 7l-7 5 7 5V7zM1 5h15a2 2 0 012 2v10a2 2 0 01-2 2H1a2 2 0 01-2-2V7a2 2 0 012-2z",
  text: "M4 7V4h16v3M9 20h6M12 4v16",
  scissors: "M6 3l6 9M6 21l6-9M20 5l-8.5 8.5M20 19l-8.5-8.5M5 5a2 2 0 100 4 2 2 0 000-4zM5 15a2 2 0 100 4 2 2 0 000-4z",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  blur: "M12 3a9 9 0 100 18A9 9 0 0012 3zM8 12h.01M12 12h.01M16 12h.01",
  speed: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  template: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  close: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  chevronLeft: "M15 18l-6-6 6-6",
  chevronRight: "M9 18l6-6-6-6",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  sound: "M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07",
  record: "M12 2a10 10 0 100 20A10 10 0 0012 2z",
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TRANSITIONS = ["fade", "slide", "zoom", "wipe", "blur", "flash"];
const TEMPLATES = [
  { id: "cinematic", name: "Cinematic", duration: 3000, transition: "fade", zoom: true, color: "#1a1a2e" },
  { id: "vibrant", name: "Vibrant", duration: 2000, transition: "slide", zoom: false, color: "#ff6b35" },
  { id: "minimal", name: "Minimal", duration: 4000, transition: "blur", zoom: false, color: "#f5f5f0" },
  { id: "energy", name: "Energy", duration: 1500, transition: "flash", zoom: true, color: "#00d4aa" },
];
const TEXT_ANIMATIONS = ["fadeIn", "slideUp", "typewriter", "bounce", "glow"];
const SOUND_EFFECTS = ["whoosh", "click", "bell", "drum", "chime"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readFileAsDataURL(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function VideoEditor() {
  const [clips, setClips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [currentClipIdx, setCurrentClipIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState("media"); // media | audio | text | effects | export
  const [texts, setTexts] = useState([]);
  const [music, setMusic] = useState(null);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [sfx] = useState({});
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [toast, setToast] = useState(null);
  const [template, setTemplate] = useState(null);
  const [editingText, setEditingText] = useState(null);

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const audioRef = useRef(null);
  const animRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const playStateRef = useRef({ idx: 0, startTime: 0, phase: "show" });
  const currentImgRef = useRef(null);
  const nextImgRef = useRef(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Apply template to all clips
  const applyTemplate = (tmpl) => {
    setTemplate(tmpl);
    setClips(prev => prev.map(c => ({
      ...c,
      duration: tmpl.duration,
      transition: tmpl.transition,
      zoom: tmpl.zoom,
    })));
    showToast(`Template "${tmpl.name}" applied!`, "success");
  };

  // Upload media
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    const newClips = await Promise.all(files.map(async (f) => {
      const url = await readFileAsDataURL(f);
      const isVideo = f.type.startsWith("video/");
      return {
        id: Math.random().toString(36).slice(2),
        url,
        type: isVideo ? "video" : "image",
        name: f.name,
        duration: 3000,
        transition: "fade",
        transitionDuration: 800,
        zoom: false,
        blur: 0,
        speed: 1,
        trimStart: 0,
        trimEnd: null,
        file: f,
      };
    }));
    setClips(prev => [...prev, ...newClips]);
    if (!selected && newClips.length) setSelected(newClips[0].id);
  };

  const handleMusicUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = await readFileAsDataURL(f);
    setMusic({ url, name: f.name });
    showToast("Musik tilføjet!", "success");
  };

  const removeClip = (id) => {
    setClips(prev => prev.filter(c => c.id !== id));
    if (selected === id) setSelected(null);
  };

  const updateClip = (id, patch) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const selectedClip = clips.find(c => c.id === selected);

  // ── Canvas Rendering ────────────────────────────────────────────────────────
  const drawFrame = useCallback((ctx, w, h, img, t, zoom, blurAmount, kenBurns) => {
    ctx.save();
    if (blurAmount > 0) {
      ctx.filter = `blur(${blurAmount}px)`;
    }
    if (kenBurns && zoom) {
      const scale = 1 + kenBurns * 0.15;
      const ox = (w - w * scale) / 2;
      const oy = (h - h * scale) / 2;
      ctx.drawImage(img, ox, oy, w * scale, h * scale);
    } else {
      // Cover fit
      const iw = img.videoWidth || img.naturalWidth || img.width;
      const ih = img.videoHeight || img.naturalHeight || img.height;
      const scale = Math.max(w / iw, h / ih);
      const sw = iw * scale, sh = ih * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
    }
    ctx.restore();
  }, []);

  const drawTransition = useCallback((ctx, w, h, from, to, progress, type, blurFrom, blurTo, zoomFrom, zoomTo) => {
    ctx.clearRect(0, 0, w, h);
    const p = progress;
    if (type === "fade") {
      if (from) drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1);
      ctx.globalAlpha = p;
      if (to) drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0);
      ctx.globalAlpha = 1;
    } else if (type === "slide") {
      if (from) { ctx.save(); ctx.translate(-w * p, 0); drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1); ctx.restore(); }
      if (to) { ctx.save(); ctx.translate(w * (1 - p), 0); drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0); ctx.restore(); }
    } else if (type === "zoom") {
      if (from) { ctx.save(); ctx.translate(w/2, h/2); ctx.scale(1 + p * 2, 1 + p * 2); ctx.translate(-w/2, -h/2); ctx.globalAlpha = 1-p; drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1); ctx.restore(); ctx.globalAlpha=1; }
      if (to) { ctx.save(); ctx.globalAlpha = p; drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0); ctx.restore(); ctx.globalAlpha=1; }
    } else if (type === "wipe") {
      if (from) drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w * p, h); ctx.clip(); if (to) drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0); ctx.restore();
    } else if (type === "blur") {
      if (from) { ctx.filter = `blur(${p * 20}px)`; drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1); ctx.filter = "none"; }
      ctx.globalAlpha = p; ctx.filter = `blur(${(1-p)*20}px)`; if (to) drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
    } else if (type === "flash") {
      if (p < 0.5) { if (from) drawFrame(ctx, w, h, from, 1, zoomFrom, blurFrom, 1); ctx.fillStyle = `rgba(255,255,255,${p*2})`; ctx.fillRect(0,0,w,h); }
      else { if (to) drawFrame(ctx, w, h, to, 1, zoomTo, blurTo, 0); ctx.fillStyle = `rgba(255,255,255,${(1-p)*2})`; ctx.fillRect(0,0,w,h); }
    }
  }, [drawFrame]);

  const drawTexts = useCallback((ctx, w, h, frameTime) => {
    texts.forEach(t => {
      if (!t.text) return;
      ctx.save();
      ctx.font = `${t.bold ? "bold " : ""}${t.size || 32}px "${t.font || "serif"}"`;
      ctx.fillStyle = t.color || "#ffffff";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 6;
      let x = w / 2, y = t.y !== undefined ? t.y * h : h * 0.8;
      let alpha = 1;
      const anim = t.animation || "fadeIn";
      const animT = (frameTime % 2000) / 2000;
      if (anim === "fadeIn") alpha = Math.min(1, animT * 3);
      else if (anim === "slideUp") { y -= (1 - Math.min(1, animT * 3)) * 40; alpha = Math.min(1, animT * 3); }
      else if (anim === "bounce") y += Math.sin(frameTime / 300) * 8;
      else if (anim === "glow") { ctx.shadowColor = t.color || "#fff"; ctx.shadowBlur = 20 + Math.sin(frameTime / 400) * 15; }
      ctx.globalAlpha = alpha;
      ctx.fillText(t.text, x, y);
      ctx.restore();
    });
  }, [texts]);

  // ── Playback ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!playing || clips.length === 0) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;

    let idx = 0;
    let phaseStart = performance.now();
    let phase = "show";
    let imgA = null, imgB = null;

    const loadImg = (clip) => new Promise(res => {
      if (clip.type === "video") {
        const v = document.createElement("video");
        v.src = clip.url; v.muted = true;
        v.onloadeddata = () => { v.currentTime = clip.trimStart || 0; res(v); };
        v.load();
      } else {
        const i = new Image(); i.src = clip.url;
        i.onload = () => res(i);
      }
    });

    let cancelled = false;
    const totalDuration = clips.reduce((s, c) => s + c.duration + c.transitionDuration, 0);

    (async () => {
      imgA = await loadImg(clips[0]);
      if (clips[1]) imgB = await loadImg(clips[1]);

      const tick = (now) => {
        if (cancelled) return;
        const clip = clips[idx];
        const elapsed = now - phaseStart;
        const dur = clip.duration;
        const tdur = clip.transitionDuration;

        // Total progress
        let totalElapsed = clips.slice(0, idx).reduce((s, c) => s + c.duration + c.transitionDuration, 0);
        totalElapsed += elapsed;
        setProgress(Math.min(1, totalElapsed / totalDuration));
        setCurrentClipIdx(idx);

        ctx.clearRect(0, 0, w, h);

        if (phase === "show") {
          const kenBurns = clip.zoom ? elapsed / dur : 0;
          drawFrame(ctx, w, h, imgA, elapsed / dur, clip.zoom, clip.blur, kenBurns);
          drawTexts(ctx, w, h, now);
          if (elapsed >= dur) {
            phaseStart = now;
            phase = "transition";
          }
        } else if (phase === "transition") {
          const p = Math.min(1, elapsed / tdur);
          const nextClip = clips[idx + 1];
          drawTransition(ctx, w, h, imgA, imgB, p, clip.transition, clip.blur, nextClip?.blur || 0, clip.zoom, nextClip?.zoom || false);
          drawTexts(ctx, w, h, now);
          if (elapsed >= tdur) {
            idx++;
            if (idx >= clips.length) { setPlaying(false); setProgress(0); setCurrentClipIdx(0); return; }
            imgA = imgB;
            imgB = null;
            if (clips[idx + 1]) loadImg(clips[idx + 1]).then(i => { imgB = i; });
            phaseStart = now;
            phase = "show";
          }
        }
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    })();

    return () => { cancelled = true; cancelAnimationFrame(animRef.current); };
  }, [playing, clips, drawFrame, drawTransition, drawTexts]);

  // Music sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = musicVolume;
    if (playing) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [playing, musicVolume]);

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportVideo = async () => {
    if (clips.length === 0) { showToast("Tilføj clips først!", "error"); return; }
    setExporting(true);
    setExportProgress(0);
    showToast("Eksporterer... vent venligst", "info");

    const canvas = canvasRef.current;
    const streams = [canvas.captureStream(30)];
    if (audioRef.current && music) {
      try {
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        const src = actx.createMediaElementSource(audioRef.current);
        src.connect(dest); src.connect(actx.destination);
        streams.push(dest.stream);
      } catch (e) {}
    }

    const combined = new MediaStream([
      ...streams.flatMap(s => s.getTracks())
    ]);

    chunksRef.current = [];
    const mr = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9" });
    mr.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "video.webm"; a.click();
      setExporting(false); setExportProgress(0);
      showToast("✅ Video downloadet!", "success");
      setPlaying(false);
    };
    mediaRecorderRef.current = mr;
    mr.start(100);

    // Play through once for recording
    const totalMs = clips.reduce((s, c) => s + c.duration + c.transitionDuration, 0) + 500;
    setPlaying(true);
    audioRef.current?.play().catch(() => {});

    let start = Date.now();
    const prog = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / totalMs);
      setExportProgress(p);
      if (p >= 1) { clearInterval(prog); mr.stop(); }
    }, 200);
  };

  // ── Add Text ─────────────────────────────────────────────────────────────────
  const addText = () => {
    const t = {
      id: Math.random().toString(36).slice(2),
      text: "Ny tekst",
      color: "#ffffff",
      size: 36,
      font: "Georgia",
      animation: "fadeIn",
      bold: false,
      y: 0.8,
    };
    setTexts(prev => [...prev, t]);
    setEditingText(t.id);
  };

  const updateText = (id, patch) => setTexts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  const removeText = (id) => setTexts(prev => prev.filter(t => t.id !== id));

  // ─── UI ───────────────────────────────────────────────────────────────────
  const totalSeconds = Math.round(clips.reduce((s, c) => s + c.duration + c.transitionDuration, 0) / 1000);

  return (
    <div style={{
      background: "#0e0e12",
      minHeight: "100vh",
      color: "#f0ede8",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      display: "flex",
      flexDirection: "column",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e1e28" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5, color: "#f0ede8" }}>CLIPCRAFT</div>
          <div style={{ fontSize: 10, color: "#555", letterSpacing: 2 }}>VIDEO EDITOR</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ background: "#1e1e28", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#888" }}>
            {clips.length} klip · {totalSeconds}s
          </div>
          {exporting && (
            <div style={{ background: "#ff4d4d22", border: "1px solid #ff4d4d44", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "#ff7070" }}>
              {Math.round(exportProgress * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Preview Canvas */}
      <div style={{ position: "relative", background: "#000", aspectRatio: "16/9", margin: "12px 16px 0" }}>
        <canvas ref={canvasRef} width={1280} height={720}
          style={{ width: "100%", height: "100%", display: "block", borderRadius: 10 }} />
        {clips.length === 0 && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#333" }}>
            <Icon d={Icons.video} size={40} color="#333" />
            <div style={{ marginTop: 8, fontSize: 12 }}>Upload media for at starte</div>
          </div>
        )}
        {/* Play controls overlay */}
        <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <button onClick={() => setPlaying(p => !p)}
            style={{ background: playing ? "#ff4d4d" : "#00d4aa", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Icon d={playing ? Icons.pause : Icons.play} size={16} color="#000" />
          </button>
          <div style={{ flex: 1, height: 3, background: "#ffffff22", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", background: "#00d4aa", width: `${progress * 100}%`, transition: "width 0.1s" }} />
          </div>
        </div>
        {music && <audio ref={audioRef} src={music.url} loop style={{ display: "none" }} />}
      </div>

      {/* Timeline */}
      {clips.length > 0 && (
        <div style={{ padding: "10px 16px 0", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 4, minWidth: "max-content", paddingBottom: 4 }}>
            {clips.map((c, i) => (
              <div key={c.id} onClick={() => { setSelected(c.id); setTab("media"); }}
                style={{
                  width: 56, height: 40, borderRadius: 6, overflow: "hidden", cursor: "pointer", flexShrink: 0, position: "relative",
                  border: selected === c.id ? "2px solid #00d4aa" : i === currentClipIdx && playing ? "2px solid #ff4d4d" : "2px solid transparent",
                }}>
                {c.type === "image"
                  ? <img src={c.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <video src={c.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />}
                <div style={{ position: "absolute", bottom: 0, right: 0, background: "#000a", fontSize: 8, padding: "1px 3px", color: "#fff" }}>
                  {c.type === "video" ? "▶" : "🖼"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e1e28", margin: "10px 0 0" }}>
        {[
          { id: "media", icon: Icons.image, label: "Media" },
          { id: "audio", icon: Icons.music, label: "Lyd" },
          { id: "text", icon: Icons.text, label: "Tekst" },
          { id: "effects", icon: Icons.sliders, label: "Effekter" },
          { id: "export", icon: Icons.download, label: "Export" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, background: "none", border: "none", padding: "8px 0", cursor: "pointer",
              color: tab === t.id ? "#00d4aa" : "#555", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              borderBottom: tab === t.id ? "2px solid #00d4aa" : "2px solid transparent",
            }}>
            <Icon d={t.icon} size={16} color={tab === t.id ? "#00d4aa" : "#555"} />
            <span style={{ fontSize: 9, letterSpacing: 0.5 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 80px" }}>

        {/* ── MEDIA TAB ─────────────────────────────────── */}
        {tab === "media" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 8, background: "#1a1a24", border: "2px dashed #2a2a38", borderRadius: 12,
              padding: "14px", cursor: "pointer", justifyContent: "center",
            }}>
              <Icon d={Icons.upload} size={18} color="#00d4aa" />
              <span style={{ fontSize: 13, color: "#00d4aa" }}>Tilføj billeder / video</span>
              <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} style={{ display: "none" }} />
            </label>

            {/* Templates */}
            <div>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 8 }}>TEMPLATES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {TEMPLATES.map(tmpl => (
                  <button key={tmpl.id} onClick={() => applyTemplate(tmpl)}
                    style={{
                      background: template?.id === tmpl.id ? "#00d4aa22" : "#1a1a24",
                      border: template?.id === tmpl.id ? "1px solid #00d4aa" : "1px solid #2a2a38",
                      borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                    }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: tmpl.color, marginBottom: 4 }} />
                    <div style={{ fontSize: 12, color: "#f0ede8" }}>{tmpl.name}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{tmpl.transition} · {tmpl.duration / 1000}s</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Clip list */}
            {clips.map((c, i) => (
              <div key={c.id} onClick={() => setSelected(c.id)}
                style={{
                  background: selected === c.id ? "#1a2a28" : "#151520",
                  border: selected === c.id ? "1px solid #00d4aa44" : "1px solid #1e1e28",
                  borderRadius: 12, padding: 12,
                }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 48, height: 36, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                    {c.type === "image" ? <img src={c.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <video src={c.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#f0ede8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#555" }}>{c.duration / 1000}s · {c.transition}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeClip(c.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Icon d={Icons.trash} size={14} color="#ff4d4d" />
                  </button>
                </div>

                {selected === c.id && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <Row label="Varighed">
                      <input type="range" min={500} max={8000} step={100} value={c.duration}
                        onChange={e => updateClip(c.id, { duration: +e.target.value })}
                        style={{ flex: 1, accentColor: "#00d4aa" }} />
                      <span style={{ fontSize: 11, color: "#888", width: 32 }}>{c.duration / 1000}s</span>
                    </Row>
                    <Row label="Overgang">
                      <select value={c.transition} onChange={e => updateClip(c.id, { transition: e.target.value })}
                        style={{ background: "#1e1e28", border: "1px solid #2a2a38", color: "#f0ede8", borderRadius: 6, padding: "2px 6px", fontSize: 11, flex: 1 }}>
                        {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </Row>
                    {c.type === "video" && (
                      <>
                        <Row label="Trim start">
                          <input type="number" min={0} value={c.trimStart || 0} onChange={e => updateClip(c.id, { trimStart: +e.target.value })}
                            style={{ background: "#1e1e28", border: "1px solid #2a2a38", color: "#f0ede8", borderRadius: 6, padding: "2px 6px", fontSize: 11, width: 60 }} />
                          <span style={{ fontSize: 11, color: "#555" }}>sek</span>
                        </Row>
                        <Row label="Hastighed">
                          <select value={c.speed} onChange={e => updateClip(c.id, { speed: +e.target.value })}
                            style={{ background: "#1e1e28", border: "1px solid #2a2a38", color: "#f0ede8", borderRadius: 6, padding: "2px 6px", fontSize: 11, flex: 1 }}>
                            <option value={0.25}>0.25x (slow)</option>
                            <option value={0.5}>0.5x</option>
                            <option value={1}>1x (normal)</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x (fast)</option>
                            <option value={4}>4x (hyper)</option>
                          </select>
                        </Row>
                      </>
                    )}
                    <ToggleRow label="Ken Burns zoom" value={c.zoom} onChange={v => updateClip(c.id, { zoom: v })} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── AUDIO TAB ─────────────────────────────────── */}
        {tab === "audio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#151520", borderRadius: 12, padding: 14, border: "1px solid #1e1e28" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10, letterSpacing: 1 }}>BAGGRUNDS MUSIK</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: music ? 12 : 0 }}>
                <div style={{ background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 8, padding: "8px 14px", display: "flex", gap: 6, alignItems: "center" }}>
                  <Icon d={Icons.upload} size={14} color="#00d4aa" />
                  <span style={{ fontSize: 12, color: "#00d4aa" }}>Upload musik</span>
                </div>
                <input type="file" accept="audio/*" onChange={handleMusicUpload} style={{ display: "none" }} />
              </label>
              {music && (
                <>
                  <div style={{ fontSize: 11, color: "#f0ede8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon d={Icons.music} size={12} color="#00d4aa" /> {music.name}
                  </div>
                  <Row label="Lydstyrke">
                    <input type="range" min={0} max={1} step={0.05} value={musicVolume}
                      onChange={e => setMusicVolume(+e.target.value)}
                      style={{ flex: 1, accentColor: "#00d4aa" }} />
                    <span style={{ fontSize: 11, color: "#888", width: 32 }}>{Math.round(musicVolume * 100)}%</span>
                  </Row>
                </>
              )}
            </div>
            <div style={{ background: "#151520", borderRadius: 12, padding: 14, border: "1px solid #1e1e28" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 10, letterSpacing: 1 }}>LYDEFFEKTER</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SOUND_EFFECTS.map(s => (
                  <button key={s} onClick={() => showToast(`${s} ▶ (simuleret)`, "info")}
                    style={{ background: "#1e1e28", border: "1px solid #2a2a38", borderRadius: 8, padding: "6px 12px", color: "#888", fontSize: 11, cursor: "pointer" }}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 10, color: "#444" }}>Lydeffekter afspilles i preview</div>
            </div>
          </div>
        )}

        {/* ── TEXT TAB ──────────────────────────────────── */}
        {tab === "text" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={addText}
              style={{ background: "#00d4aa22", border: "1px solid #00d4aa44", borderRadius: 10, padding: "12px", color: "#00d4aa", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
              <Icon d={Icons.plus} size={16} color="#00d4aa" /> Tilføj tekst
            </button>
            {texts.map(t => (
              <div key={t.id} style={{ background: "#151520", borderRadius: 12, padding: 14, border: "1px solid #1e1e28" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#f0ede8" }}>{t.text || "Tom tekst"}</span>
                  <button onClick={() => removeText(t.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                    <Icon d={Icons.trash} size={14} color="#ff4d4d" />
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <input value={t.text} onChange={e => updateText(t.id, { text: e.target.value })}
                    placeholder="Skriv tekst..."
                    style={{ background: "#1e1e28", border: "1px solid #2a2a38", color: "#f0ede8", borderRadius: 8, padding: "6px 10px", fontSize: 13, width: "100%", boxSizing: "border-box" }} />
                  <Row label="Størrelse">
                    <input type="range" min={16} max={80} value={t.size} onChange={e => updateText(t.id, { size: +e.target.value })}
                      style={{ flex: 1, accentColor: "#00d4aa" }} />
                    <span style={{ fontSize: 11, color: "#888", width: 28 }}>{t.size}</span>
                  </Row>
                  <Row label="Farve">
                    <input type="color" value={t.color} onChange={e => updateText(t.id, { color: e.target.value })}
                      style={{ width: 32, height: 24, border: "none", borderRadius: 4, cursor: "pointer", background: "none" }} />
                    <span style={{ fontSize: 11, color: "#888" }}>{t.color}</span>
                  </Row>
                  <Row label="Position Y">
                    <input type="range" min={0.1} max={0.95} step={0.05} value={t.y}
                      onChange={e => updateText(t.id, { y: +e.target.value })}
                      style={{ flex: 1, accentColor: "#00d4aa" }} />
                    <span style={{ fontSize: 11, color: "#888", width: 32 }}>{Math.round(t.y * 100)}%</span>
                  </Row>
                  <Row label="Animation">
                    <select value={t.animation} onChange={e => updateText(t.id, { animation: e.target.value })}
                      style={{ background: "#1e1e28", border: "1px solid #2a2a38", color: "#f0ede8", borderRadius: 6, padding: "2px 6px", fontSize: 11, flex: 1 }}>
                      {TEXT_ANIMATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </Row>
                  <ToggleRow label="Fed" value={t.bold} onChange={v => updateText(t.id, { bold: v })} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── EFFECTS TAB ───────────────────────────────── */}
        {tab === "effects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedClip ? (
              <>
                <div style={{ fontSize: 11, color: "#888", letterSpacing: 1 }}>EFFEKTER: {selectedClip.name}</div>
                <div style={{ background: "#151520", borderRadius: 12, padding: 14, border: "1px solid #1e1e28", display: "flex", flexDirection: "column", gap: 10 }}>
                  <Row label="Blur">
                    <input type="range" min={0} max={20} value={selectedClip.blur || 0}
                      onChange={e => updateClip(selectedClip.id, { blur: +e.target.value })}
                      style={{ flex: 1, accentColor: "#00d4aa" }} />
                    <span style={{ fontSize: 11, color: "#888", width: 24 }}>{selectedClip.blur || 0}</span>
                  </Row>
                  <Row label="Overgang ms">
                    <input type="range" min={100} max={2000} step={100} value={selectedClip.transitionDuration || 800}
                      onChange={e => updateClip(selectedClip.id, { transitionDuration: +e.target.value })}
                      style={{ flex: 1, accentColor: "#00d4aa" }} />
                    <span style={{ fontSize: 11, color: "#888", width: 40 }}>{selectedClip.transitionDuration || 800}ms</span>
                  </Row>
                  <ToggleRow label="Ken Burns zoom" value={selectedClip.zoom} onChange={v => updateClip(selectedClip.id, { zoom: v })} />
                </div>
                <div style={{ background: "#151520", borderRadius: 12, padding: 14, border: "1px solid #1e1e28" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 10, letterSpacing: 1 }}>OVERGANGSTYPE</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {TRANSITIONS.map(tr => (
                      <button key={tr} onClick={() => updateClip(selectedClip.id, { transition: tr })}
                        style={{
                          background: selectedClip.transition === tr ? "#00d4aa22" : "#1e1e28",
                          border: selectedClip.transition === tr ? "1px solid #00d4aa" : "1px solid #2a2a38",
                          borderRadius: 8, padding: "8px 4px", color: selectedClip.transition === tr ? "#00d4aa" : "#888", fontSize: 11, cursor: "pointer",
                        }}>
                        {tr}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", color: "#444", padding: "40px 0" }}>
                <Icon d={Icons.layers} size={32} color="#333" />
                <div style={{ marginTop: 8, fontSize: 12 }}>Vælg et klip for at redigere effekter</div>
              </div>
            )}
          </div>
        )}

        {/* ── EXPORT TAB ────────────────────────────────── */}
        {tab === "export" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#151520", borderRadius: 12, padding: 16, border: "1px solid #1e1e28" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>FORMAT</div>
              <div style={{ fontSize: 16, color: "#00d4aa", fontWeight: 700 }}>WebM (VP9)</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>Understøttet af YouTube, Chrome, Firefox</div>
            </div>
            <div style={{ background: "#151520", borderRadius: 12, padding: 16, border: "1px solid #1e1e28" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>PROJEKT INFO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <InfoRow label="Klip" value={clips.length} />
                <InfoRow label="Tekster" value={texts.length} />
                <InfoRow label="Musik" value={music ? music.name : "Ingen"} />
                <InfoRow label="Samlet tid" value={`${totalSeconds} sek`} />
                <InfoRow label="Opløsning" value="1280×720 (HD)" />
              </div>
            </div>
            {exporting && (
              <div style={{ background: "#1a2020", borderRadius: 12, padding: 14, border: "1px solid #00d4aa44" }}>
                <div style={{ fontSize: 11, color: "#00d4aa", marginBottom: 8 }}>EKSPORTERER...</div>
                <div style={{ background: "#1e1e28", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#00d4aa", width: `${exportProgress * 100}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 6 }}>Afspil ikke eller luk appen under eksport</div>
              </div>
            )}
            <button onClick={exportVideo} disabled={exporting || clips.length === 0}
              style={{
                background: exporting || clips.length === 0 ? "#1e1e28" : "#00d4aa",
                border: "none", borderRadius: 12, padding: "16px", color: exporting || clips.length === 0 ? "#444" : "#000",
                fontSize: 14, fontWeight: 700, cursor: exporting || clips.length === 0 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center", letterSpacing: 0.5,
              }}>
              <Icon d={Icons.download} size={18} color={exporting || clips.length === 0 ? "#444" : "#000"} />
              {exporting ? "Eksporterer..." : "Download WebM"}
            </button>
            <div style={{ fontSize: 10, color: "#444", textAlign: "center", lineHeight: 1.6 }}>
              Videoen optages i realtid fra preview.<br />
              Upload direkte til YouTube efter download.
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "#ff4d4d" : toast.type === "success" ? "#00d4aa" : "#1e1e28",
          color: toast.type === "info" ? "#f0ede8" : "#000",
          borderRadius: 10, padding: "10px 18px", fontSize: 12, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)", zIndex: 1000, whiteSpace: "nowrap",
          animation: "fadeIn 0.2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        input[type=range] { height: 4px; }
        * { -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Row({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#555", width: 70, flexShrink: 0, letterSpacing: 0.5 }}>{label.toUpperCase()}</span>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 10, color: "#555", flex: 1, letterSpacing: 0.5 }}>{label.toUpperCase()}</span>
      <button onClick={() => onChange(!value)}
        style={{
          width: 36, height: 20, borderRadius: 10, background: value ? "#00d4aa" : "#2a2a38",
          border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
        }}>
        <div style={{
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: value ? 19 : 3, transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
      <span style={{ color: "#555" }}>{label}</span>
      <span style={{ color: "#888" }}>{value}</span>
    </div>
  );
}

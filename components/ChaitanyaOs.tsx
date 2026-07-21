"use client";

import React from "react";

type WinId = "terminal" | "projects" | "about" | "skills" | "resume" | "agent" | "contact";

interface WinState {
  open: boolean;
  x: number;
  y: number;
  z: number;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface State {
  booting: boolean;
  hint: boolean;
  mobile: boolean;
  zTop: number;
  win: Record<WinId, WinState>;
  tlog: string;
  tdraft: string;
  messages: Msg[];
  draft: string;
  loading: boolean;
  sent: boolean;
  form: { name: string; email: string; msg: string };
}

type Cmd =
  | { kind: "open" | "close"; target: string }
  | { kind: "theme"; palette: string }
  | { kind: "ls" | "whoami" | "neofetch" | "clear" | "help" | "hijack" }
  | { kind: "wall"; text: string }
  | { kind: "autopilot"; arg: string }
  | { kind: "ask"; q: string };

interface GhostOp {
  op: "moveTo" | "click" | "do" | "dragWin";
  sel?: string;
  pt?: { x: number; y: number };
  fn?: () => void;
  wait?: number;
  id?: WinId;
  to?: { x: number; y: number };
}

const WIN_DEFS: {
  id: WinId;
  title: string;
  icon: string;
  label: string;
  wpx: number;
}[] = [
  { id: "terminal", title: "terminal — chaitanya.sh", icon: ">_", label: "terminal", wpx: 520 },
  { id: "projects", title: "projects.exe", icon: "▣", label: "projects", wpx: 560 },
  { id: "about", title: "about.md", icon: "☰", label: "about", wpx: 480 },
  { id: "skills", title: "skills.json", icon: "▦", label: "skills", wpx: 540 },
  { id: "resume", title: "resume.pdf", icon: "▤", label: "resume", wpx: 560 },
  { id: "agent", title: "chaitanya.agent — live", icon: "✦", label: "agent", wpx: 460 },
  { id: "contact", title: "contact.sh", icon: "@", label: "contact", wpx: 440 },
];

const BUILDS = [
  {
    title: "ARGUS",
    kind: "LIVE · 2026",
    url: "https://opportunity-radar-theta.vercel.app",
    desc: "Student opportunity aggregator — 200+ live opportunities from 14 source adapters with caching, dedup, and health monitoring; 6-signal transparent ranking with per-result match explanations; dual-LLM backend (Groq + Gemini failover) powering 8 AI features; multi-channel deadline reminders.",
    tags: ["Next.js 16", "React 19", "TypeScript", "Firebase", "Groq/Gemini"],
  },
  {
    title: "LAUNCHCOPILOT",
    kind: "RUNNER-UP · HACKONVIBE 2026",
    url: "https://2026-07-ethos-engineers.vercel.app",
    desc: "AI launch automation — reads an App Store / Play Store link, generates channel-native launch copy for 5 platforms with compliance checks, publishes live via OAuth (Reddit, Telegram, X, LinkedIn, Discord) on cron autopilot, closed-loop optimizer AI-rewrites the weakest channel.",
    tags: ["Next.js 15", "Supabase", "Groq", "OAuth", "Vercel Cron"],
  },
  {
    title: "MARKETMIND",
    kind: "MULTI-AGENT · 2025",
    url: "https://github.com/ChaitanyaGidwani/MarketMind",
    desc: "Multi-agent AI marketing platform — an orchestrator scores agent bids, allocates budget, and dispatches 6 specialized agents in parallel over an A2A-style JSON-RPC + SSE protocol; re-negotiation loop with 110% budget guard; 8 microservices on Docker Compose.",
    tags: ["Python", "FastAPI", "React", "Docker", "Groq"],
  },
];

const SKILL_GROUPS = [
  { label: "LANGUAGES", items: ["Java", "JavaScript", "TypeScript", "Python", "C", "Solidity", "SQL"] },
  { label: "FRAMEWORKS / LIBRARIES", items: ["Next.js", "React", "Node.js", "FastAPI", "Tailwind CSS", "Chart.js", "Framer Motion"] },
  { label: "AI & LLM", items: ["Groq (Llama 3.3)", "Google Gemini", "RAG", "Agentic & Multi-Agent Systems", "Prompt Engineering"] },
  { label: "DATABASES & CLOUD", items: ["PostgreSQL", "Firebase/Firestore", "Supabase", "SQLite", "Docker", "Vercel", "Netlify"] },
  { label: "TOOLS", items: ["Git", "GitHub", "VS Code", "Claude Code", "Cursor"] },
];

const MONO = "var(--font-mono), monospace";
const DISPLAY = "var(--font-display), sans-serif";

const THEMES: Record<string, { cyan: string; pink: string }> = {
  "Cyber Mint": { cyan: "#20f4d2", pink: "#ff2ea6" },
  "Vapor Violet": { cyan: "#a78bff", pink: "#3df2ff" },
  "Solar Flare": { cyan: "#ffb020", pink: "#ff4d3d" },
};

export default class ChaitanyaOs extends React.Component<Record<string, never>, State> {
  state: State = {
    booting: true,
    hint: true,
    mobile: false,
    zTop: 10,
    win: {
      terminal: { open: false, x: 60, y: 64, z: 9 },
      projects: { open: false, x: 640, y: 90, z: 8 },
      about: { open: false, x: 140, y: 150, z: 7 },
      skills: { open: false, x: 720, y: 210, z: 6 },
      resume: { open: false, x: 200, y: 110, z: 4 },
      agent: { open: false, x: 380, y: 120, z: 5 },
      contact: { open: false, x: 260, y: 200, z: 3 },
    },
    tlog: "CHAITANYA_OS v2.0 — agentic build\nType `help` for commands.\n",
    tdraft: "",
    messages: [],
    draft: "",
    loading: false,
    sent: false,
    form: { name: "", email: "", msg: "" },
  };

  root: HTMLElement | null = null;
  private _energy = 0.65;
  private _forcedTheme: string | null = null;
  private _wallText: string | null = null;
  private _autopilot: boolean | undefined;
  private _drag: { id: WinId; dx: number; dy: number } | null = null;
  private _mouse = { x: -9999, y: -9999 };
  private _clock?: ReturnType<typeof setInterval>;
  private _bootT?: ReturnType<typeof setTimeout>;
  private _ghostT?: ReturnType<typeof setTimeout>;
  private _idleT?: ReturnType<typeof setTimeout>;
  private _idleT2?: ReturnType<typeof setTimeout>;
  private _raf = 0;
  private _mm?: (e: MouseEvent) => void;
  private _mu?: () => void;
  private _tm?: (e: TouchEvent) => void;
  private _tu?: () => void;
  private _onResize?: () => void;
  private _onResizeMobile?: () => void;
  private _rebuild?: () => void;
  private _ghostTick?: (now: number) => void;
  private ghostResist?: () => void;
  private ghostRun?: (ops: GhostOp[]) => void;
  private _chatScroll: HTMLDivElement | null = null;
  private _termScroll: HTMLDivElement | null = null;

  // ---------- command bus ----------
  dispatch(cmd: Cmd): string | null {
    const W = this.state.win;
    const names = Object.keys(W) as WinId[];
    switch (cmd.kind) {
      case "open":
        if (!names.includes(cmd.target as WinId)) return "! no such window: " + cmd.target;
        this.openWin(cmd.target as WinId);
        return "> opened " + cmd.target;
      case "close":
        if (!names.includes(cmd.target as WinId)) return "! no such window: " + cmd.target;
        this.setWin(cmd.target as WinId, { open: false });
        return "> closed " + cmd.target;
      case "theme": {
        const t = Object.keys(THEMES).find((k) => k.toLowerCase().includes(cmd.palette));
        if (!t) return "! themes: mint, violet, solar";
        this._forcedTheme = t;
        this.applyTheme(t);
        return "> theme: " + t;
      }
      case "ls":
        return names.map((n) => (W[n].open ? "● " : "○ ") + n).join("\n");
      case "whoami":
        return "chaitanya.gidwani — full-stack developer × agentic-ai engineer\nedu: b.tech cse @ abes engineering college (2024–2028)\nlocation: ghaziabad, india · status: seeking swe internship";
      case "neofetch":
        return "CHAITANYA_OS 2.0 (agentic)\n────────────────\nhost: chaitanya.gidwani\nshell: chaitanya.sh\nagents: 1 online\nrepos: 3 shipped\nhackathons: 2× runner-up · sih 2025 qualifier";
      case "clear":
        this.setState({ tlog: "" });
        return null;
      case "hijack":
        this.runHijack();
        return "> ceding pointer control to chaitanya.agent…\n> (shake your mouse hard to fight it for the cursor)";
      case "wall": {
        const t = (cmd.text || "").trim();
        if (!t) return "! usage: wall <text>  (try: wall HIRE ME) — `wall reset` restores";
        this.setWall(t.toLowerCase() === "reset" ? null : t.toUpperCase());
        return "> wallpaper particles re-forming: " + (t.toLowerCase() === "reset" ? "CHAITANYA GIDWANI" : t.toUpperCase());
      }
      case "autopilot":
        this._autopilot = cmd.arg !== "off";
        this.resetIdle();
        return "> autopilot " + (this._autopilot ? "ON — go idle for 35s and watch" : "OFF");
      case "help":
        return (
          "open <" +
          names.join("|") +
          ">\nclose <win>\ntheme <mint|violet|solar>\nhijack → let chaitanya.agent drive the OS\nwall <text> → rewrite the particle wallpaper\nautopilot <on|off> → agent takes over when you idle (off by default)\nls · whoami · neofetch · clear\nask <anything> → routes to chaitanya.agent"
        );
      default:
        return null;
    }
  }

  parse(input: string): Cmd | null {
    const [c, ...args] = input.trim().split(/\s+/);
    const a = (args[0] || "").toLowerCase();
    switch ((c || "").toLowerCase()) {
      case "open":
        return { kind: "open", target: a };
      case "close":
        return { kind: "close", target: a };
      case "theme":
        return { kind: "theme", palette: a };
      case "ls":
        return { kind: "ls" };
      case "whoami":
        return { kind: "whoami" };
      case "neofetch":
        return { kind: "neofetch" };
      case "clear":
        return { kind: "clear" };
      case "help":
        return { kind: "help" };
      case "hijack":
        return { kind: "hijack" };
      case "wall":
        return { kind: "wall", text: args.join(" ") };
      case "autopilot":
        return { kind: "autopilot", arg: a };
      case "ask":
        return { kind: "ask", q: args.join(" ") };
      default:
        return null;
    }
  }

  runTerm = (e: React.FormEvent) => {
    e.preventDefault();
    const input = this.state.tdraft.trim();
    if (!input) return;
    let log = this.state.tlog + "$ " + input + "\n";
    const cmd = this.parse(input);
    if (!cmd) {
      log += "! unknown command — try `help`\n";
      this.setState({ tlog: log, tdraft: "" });
      return;
    }
    if (cmd.kind === "ask") {
      this.setState({ tlog: log + "> routing to chaitanya.agent…\n", tdraft: "" });
      this.openWin("agent");
      this.send(cmd.q);
      return;
    }
    const out = this.dispatch(cmd);
    if (cmd.kind === "clear") {
      this.setState({ tdraft: "" });
      return;
    }
    this.setState({ tlog: log + (out ? out + "\n" : ""), tdraft: "" });
  };

  // ---------- window mgmt ----------
  setWin(id: WinId, patch: Partial<WinState>) {
    this.setState((s) => ({
      win: { ...s.win, [id]: { ...s.win[id], ...patch } },
      // first interaction: retire the onboarding hint once any window opens
      hint: s.hint && !patch.open,
    }));
  }

  // open + focus, clamping the stored position so the window stays on screen
  openWin(id: WinId) {
    const def = WIN_DEFS.find((w) => w.id === id);
    const w = this.state.win[id];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // mobile: full-width windows cascaded down so they don't perfectly overlap
    if (vw <= 640) {
      const openCount = (Object.keys(this.state.win) as WinId[]).filter(
        (k) => this.state.win[k].open && k !== id
      ).length;
      const y = Math.min(52 + openCount * 24, Math.max(52, vh - 260));
      this.setWin(id, { open: true, x: 8, y });
      this.focusWin(id);
      return;
    }
    const ww = Math.min(def ? def.wpx : 480, vw * 0.94);
    const x = Math.min(Math.max(8, w.x), Math.max(8, vw - ww - 8));
    const y = Math.min(Math.max(44, w.y), Math.max(44, vh - 220));
    this.setWin(id, { open: true, x, y });
    this.focusWin(id);
  }

  focusWin(id: WinId) {
    this.setState((s) => ({
      zTop: s.zTop + 1,
      win: { ...s.win, [id]: { ...s.win[id], z: s.zTop + 1 } },
    }));
  }

  startDrag(e: React.MouseEvent, id: WinId) {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    e.preventDefault();
    const w = this.state.win[id];
    this._drag = { id, dx: e.clientX - w.x, dy: e.clientY - w.y };
    this.focusWin(id);
  }

  startDragTouch(e: React.TouchEvent, id: WinId) {
    if ((e.target as HTMLElement).tagName === "BUTTON") return;
    const t = e.touches[0];
    if (!t) return;
    const w = this.state.win[id];
    this._drag = { id, dx: t.clientX - w.x, dy: t.clientY - w.y };
    this.focusWin(id);
  }

  applyTheme(name: string) {
    const t = THEMES[name] || THEMES["Cyber Mint"];
    if (this.root) {
      this.root.style.setProperty("--cyan", t.cyan);
      this.root.style.setProperty("--pink", t.pink);
    }
  }

  componentDidMount() {
    const root = this.root;
    if (!root) return;
    this.applyTheme(this._forcedTheme || "Cyber Mint");

    const clock = root.querySelector("[data-clock]");
    const tick = () => {
      if (clock) clock.textContent = new Date().toLocaleTimeString("en-GB", { hour12: false });
    };
    tick();
    this._clock = setInterval(tick, 1000);

    // boot typing
    const lines = [
      "$ boot chaitanya_os --agentic",
      "> mounting /builds (3 repos) ✓",
      "> starting chaitanya.agent … online ✓",
      "> compiling wallpaper: 4k particles ✓",
      "> desktop ready — it's all yours.",
    ];
    let li = 0,
      ci = 0,
      out = "";
    const type = () => {
      const el = root.querySelector("[data-boot]");
      if (li >= lines.length) {
        this._bootT = setTimeout(() => this.setState({ booting: false }), 650);
        return;
      }
      out += lines[li][ci] ?? "";
      ci++;
      if (ci >= lines[li].length) {
        out += "\n";
        li++;
        ci = 0;
      }
      if (el) el.textContent = out;
      this._bootT = setTimeout(type, ci === 0 ? 230 : 16 + Math.random() * 26);
    };
    type();

    // drag
    this._mm = (e: MouseEvent) => {
      this._mouse = { x: e.clientX, y: e.clientY };
      if (this.ghostResist) this.ghostResist();
      this.resetIdle();
      if (this._drag) {
        const { id, dx, dy } = this._drag;
        this.setWin(id, { x: Math.max(0, e.clientX - dx), y: Math.max(44, e.clientY - dy) });
      }
    };
    this._mu = () => {
      this._drag = null;
    };
    window.addEventListener("mousemove", this._mm);
    window.addEventListener("mouseup", this._mu);

    // touch equivalents so windows can be dragged (and the wallpaper reacts) on mobile
    this._tm = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      this._mouse = { x: t.clientX, y: t.clientY };
      this.resetIdle();
      if (this._drag) {
        e.preventDefault();
        const { id, dx, dy } = this._drag;
        this.setWin(id, { x: Math.max(0, t.clientX - dx), y: Math.max(44, t.clientY - dy) });
      }
    };
    this._tu = () => {
      this._drag = null;
    };
    window.addEventListener("touchmove", this._tm, { passive: false });
    window.addEventListener("touchend", this._tu);

    // track viewport size for the mobile layout switch
    const syncMobile = () => {
      const m = window.innerWidth <= 640;
      if (m !== this.state.mobile) this.setState({ mobile: m });
    };
    syncMobile();
    this._onResizeMobile = syncMobile;
    window.addEventListener("resize", this._onResizeMobile);

    this.initWallpaper(root);
    this.initGhost(root);
    this.resetIdle();
  }

  // ---------- ghost cursor: chaitanya.agent's physical pointer ----------
  initGhost(root: HTMLElement) {
    const el = root.querySelector("[data-ghost]") as HTMLElement | null;
    if (!el) return;
    const pos = { x: window.innerWidth / 2, y: window.innerHeight - 90 };
    let queue: GhostOp[] = [];
    let leg: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      t0: number;
      dur: number;
      after?: () => void;
      onMove?: (p: { x: number; y: number }) => void;
    } | null = null;
    let active = false;
    let resist = 0;
    const minJerk = (t: number) => t * t * t * (10 + t * (-15 + 6 * t));
    const fitts = (d: number) => {
      const e = this._energy;
      return (150 + 95 * Math.log2(1 + d / 40)) * (1.5 - e * 0.8);
    };
    const center = (sel: string) => {
      const t = root.querySelector(sel);
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    const hide = () => {
      el.style.display = "none";
      active = false;
      queue = [];
      leg = null;
    };
    const startLeg = (to: { x: number; y: number } | null, after?: () => void) => {
      if (!to) {
        after && after();
        return;
      }
      leg = {
        from: { x: pos.x, y: pos.y },
        to,
        t0: performance.now(),
        dur: fitts(Math.hypot(to.x - pos.x, to.y - pos.y)),
        after,
      };
    };
    const next = () => {
      const op = queue.shift();
      if (!op) {
        this._ghostT = setTimeout(hide, 750);
        return;
      }
      if (op.op === "moveTo") startLeg(op.pt || (op.sel ? center(op.sel) : null), next);
      else if (op.op === "click") {
        const t = op.sel ? (root.querySelector(op.sel) as HTMLElement | null) : null;
        if (t) t.click();
        this._ghostT = setTimeout(next, 260);
      } else if (op.op === "do") {
        op.fn && op.fn();
        this._ghostT = setTimeout(next, op.wait || 220);
      } else if (op.op === "dragWin") {
        const id = op.id as WinId;
        const w = this.state.win[id];
        if (!w || !w.open || !op.to) {
          next();
          return;
        }
        const to = op.to;
        startLeg({ x: w.x + 70, y: w.y + 15 }, () => {
          this.focusWin(id);
          startLeg({ x: to.x + 70, y: to.y + 15 }, next);
          if (leg)
            leg.onMove = (p) => this.setWin(id, { x: Math.max(0, p.x - 70), y: Math.max(44, p.y - 15) });
        });
      }
    };
    this._ghostTick = (now: number) => {
      if (!leg) return;
      const tau = Math.min(1, (now - leg.t0) / leg.dur);
      const k = minJerk(tau);
      pos.x = leg.from.x + (leg.to.x - leg.from.x) * k;
      pos.y = leg.from.y + (leg.to.y - leg.from.y) * k;
      const v = 7 * tau * (1 - tau);
      el.style.transform =
        "translate(" + (pos.x + (Math.random() - 0.5) * v) + "px," + (pos.y + (Math.random() - 0.5) * v) + "px)";
      if (leg.onMove) leg.onMove(pos);
      if (tau === 1) {
        const a = leg.after;
        leg = null;
        a && a();
      }
    };
    this.ghostResist = () => {
      if (!active) return;
      if (++resist > 34) {
        clearTimeout(this._ghostT);
        hide();
        this.setState((s) => ({ tlog: s.tlog + "! chaitanya.agent: fine — you drive.\n" }));
      }
    };
    this.ghostRun = (ops: GhostOp[]) => {
      clearTimeout(this._ghostT);
      queue = queue.concat(ops);
      if (!active) {
        el.style.display = "block";
        active = true;
        resist = 0;
      }
      if (!leg) next();
    };
  }

  setWall(text: string | null) {
    this._wallText = text;
    if (this._rebuild) this._rebuild();
  }

  resetIdle() {
    clearTimeout(this._idleT);
    if (this._autopilot !== true) return; // opt-in only: `autopilot on` in the terminal
    this._idleT = setTimeout(() => {
      if (this.state.booting) return;
      this.setState((s) => ({ tlog: s.tlog + "! chaitanya.agent: you went quiet — I'll drive.\n" }));
      this.setWall("STILL HERE?");
      this.runHijack();
      this._idleT2 = setTimeout(() => this.setWall(null), 9000);
    }, 35000);
  }

  runHijack() {
    if (!this.ghostRun) return;
    this.ghostRun([
      { op: "moveTo", sel: '[data-dock-id="about"]' },
      { op: "click", sel: '[data-dock-id="about"]' },
      { op: "dragWin", id: "about", to: { x: 540, y: 110 } },
      { op: "moveTo", sel: '[data-dock-id="skills"]' },
      { op: "click", sel: '[data-dock-id="skills"]' },
      { op: "dragWin", id: "skills", to: { x: 70, y: 340 } },
      {
        op: "do",
        fn: () => {
          this._forcedTheme = "Vapor Violet";
          this.applyTheme("Vapor Violet");
        },
        wait: 650,
      },
      {
        op: "do",
        fn: () => {
          this._forcedTheme = null;
          this.applyTheme("Cyber Mint");
        },
        wait: 400,
      },
      { op: "moveTo", sel: '[data-dock-id="agent"]' },
      { op: "click", sel: '[data-dock-id="agent"]' },
    ]);
  }

  initWallpaper(root: HTMLElement) {
    const cv = root.querySelector("[data-hero]") as HTMLCanvasElement | null;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let parts: { hx: number; hy: number; x: number; y: number; vx: number; vy: number }[] = [];
    let W = 0,
      H = 0;
    const build = () => {
      const r = cv.getBoundingClientRect();
      W = cv.width = Math.floor(r.width);
      H = cv.height = Math.floor(r.height);
      const e = this._energy;
      const gap = Math.max(3, Math.round(9 - e * 5));
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d");
      if (!o || W === 0 || H === 0) return;
      o.fillStyle = "#fff";
      o.textAlign = "center";
      o.textBaseline = "middle";
      const custom = this._wallText;
      const lines = custom
        ? custom.length > 12
          ? [custom.slice(0, Math.ceil(custom.length / 2)).trim(), custom.slice(Math.ceil(custom.length / 2)).trim()]
          : [custom]
        : ["CHAITANYA", "GIDWANI"];
      const longest = Math.max(...lines.map((l) => l.length), 1);
      const fs = Math.min(W / (longest * 0.68), H / 3.6);
      const fam = getComputedStyle(root).getPropertyValue("--font-display").trim() || "sans-serif";
      o.font = "900 " + fs + "px " + fam;
      const y0 = H * 0.42 + (lines.length === 1 ? fs * 0.5 : 0);
      lines.forEach((l, i) => o.fillText(l, W / 2, y0 + i * fs * 1.02));
      const data = o.getImageData(0, 0, W, H).data;
      // morph: reuse existing particles so text transitions flow instead of snapping
      const targets: { x: number; y: number }[] = [];
      for (let y = 0; y < H; y += gap)
        for (let x = 0; x < W; x += gap) if (data[(y * W + x) * 4 + 3] > 128) targets.push({ x, y });
      const old = parts;
      parts = [];
      for (let i = 0; i < targets.length; i++) {
        const src = old[i % Math.max(old.length, 1)];
        parts.push({
          hx: targets[i].x,
          hy: targets[i].y,
          x: src ? src.x : Math.random() * W,
          y: src ? src.y : Math.random() * H,
          vx: 0,
          vy: 0,
        });
      }
    };
    const getVar = (n: string) => getComputedStyle(root).getPropertyValue(n).trim();
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const e = this._energy;
      const cyan = getVar("--cyan") || "#20f4d2";
      const pink = getVar("--pink") || "#ff2ea6";
      const m = this._mouse;
      const rad = 70 + e * 80;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const dx = p.x - m.x,
          dy = p.y - m.y,
          d2 = dx * dx + dy * dy;
        if (d2 < rad * rad) {
          const d = Math.sqrt(d2) || 1,
            f = ((rad - d) / rad) * (2 + e * 6);
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx += (p.hx - p.x) * 0.02;
        p.vy += (p.hy - p.y) * 0.02;
        p.vx *= 0.88;
        p.vy *= 0.88;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = i % 11 === 0 ? pink : cyan;
        ctx.fillRect(p.x, p.y, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      if (this._ghostTick) this._ghostTick(performance.now());
      this._raf = requestAnimationFrame(draw);
    };
    this._rebuild = build;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => build());
    build();
    draw();
    this._onResize = () => build();
    window.addEventListener("resize", this._onResize);
  }

  componentDidUpdate() {
    if (this._chatScroll) this._chatScroll.scrollTop = this._chatScroll.scrollHeight;
    if (this._termScroll) this._termScroll.scrollTop = this._termScroll.scrollHeight;
  }

  componentWillUnmount() {
    clearInterval(this._clock);
    clearTimeout(this._bootT);
    clearTimeout(this._ghostT);
    clearTimeout(this._idleT);
    clearTimeout(this._idleT2);
    cancelAnimationFrame(this._raf);
    if (this._mm) window.removeEventListener("mousemove", this._mm);
    if (this._mu) window.removeEventListener("mouseup", this._mu);
    if (this._tm) window.removeEventListener("touchmove", this._tm);
    if (this._tu) window.removeEventListener("touchend", this._tu);
    if (this._onResize) window.removeEventListener("resize", this._onResize);
    if (this._onResizeMobile) window.removeEventListener("resize", this._onResizeMobile);
  }

  // ---------- agent (tool-calling via [[directives]]) ----------
  send = async (text?: string) => {
    const q = (text != null ? text : this.state.draft).trim();
    if (!q || this.state.loading) return;
    const msgs: Msg[] = [...this.state.messages, { role: "user", content: q }];
    this.setState({ messages: msgs, draft: "", loading: true });
    let reply: string;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      reply = data.reply;
    } catch {
      reply = "agent offline right now — use the contact window instead. [[open:contact]]";
    }
    // execute directives, strip from display
    const clean = reply
      .replace(/\[\[hijack\]\]/g, () => {
        this.runHijack();
        return "";
      })
      .replace(/\[\[wall:([^\]]+)\]\]/g, (_, t: string) => {
        t = t.trim();
        this.setWall(t.toLowerCase() === "reset" ? null : t.toUpperCase());
        return "";
      })
      .replace(/\[\[(open|close|theme):([^\]]+)\]\]/g, (_, verb: string, arg: string) => {
        arg = arg.trim();
        if (verb === "theme") {
          this._forcedTheme = arg;
          this.applyTheme(arg);
        } else if (
          verb === "open" &&
          this.ghostRun &&
          this.state.win[arg.toLowerCase() as WinId] &&
          !this.state.win[arg.toLowerCase() as WinId].open
        ) {
          const id = arg.toLowerCase();
          this.ghostRun([
            { op: "moveTo", sel: '[data-dock-id="' + id + '"]' },
            { op: "click", sel: '[data-dock-id="' + id + '"]' },
          ]);
        } else {
          this.dispatch({ kind: verb as "open" | "close", target: arg.toLowerCase() });
        }
        return "";
      })
      .replace(/\s{2,}/g, " ")
      .trim();
    this.setState({ messages: [...msgs, { role: "assistant", content: clean || "done." }], loading: false });
  };

  // ---------- render ----------
  render() {
    const { win, zTop, booting, mobile } = this.state;

    const chips = [
      { label: "> take the wheel — give me a tour", onClick: () => this.runHijack() },
      { label: "> write my name on the wallpaper", onClick: () => this.send('Write "WELCOME, FRIEND" on the wallpaper') },
      ...[
        "Open my projects and pitch LaunchCopilot",
        "How does Argus rank opportunities?",
        "What are you looking for right now?",
      ].map((c) => ({ label: "> " + c, onClick: () => this.send(c) })),
    ];

    return (
      <main
        ref={(el) => {
          this.root = el;
        }}
        className="chaitanya-os"
        style={{
          position: "relative",
          width: "100vw",
          height: "100vh",
          fontFamily: DISPLAY,
          background: "var(--bg)",
          color: "var(--fg)",
          overflow: "hidden",
        }}
      >
        {/* wallpaper: particle name */}
        <canvas data-hero="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: 140,
            zIndex: 1,
            pointerEvents: "none",
            background: "linear-gradient(to bottom,transparent,rgba(32,244,210,.045),transparent)",
            animation: "scanline 9s linear infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            pointerEvents: "none",
            opacity: 0.5,
            background: "repeating-linear-gradient(0deg,rgba(0,0,0,.22) 0 1px,transparent 1px 3px)",
          }}
        />

        {/* MENU BAR */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px clamp(14px,2vw,26px)",
            borderBottom: "1px solid var(--line)",
            background: "rgba(5,5,7,.72)",
            backdropFilter: "blur(8px)",
            fontFamily: MONO,
            fontSize: 12,
            letterSpacing: ".06em",
            animation: booting ? "none" : "fadeUp .5s ease .15s backwards",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>
              CHAITANYA<span style={{ color: "var(--cyan)" }}>_OS</span>
            </span>
            {!mobile && <span style={{ color: "var(--muted)" }}>v2.0 · agentic build</span>}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: mobile ? 10 : 18,
              color: "var(--muted)",
              minWidth: 0,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  animation: "dotPulse 2s infinite",
                  flexShrink: 0,
                }}
              />
              {mobile ? "ONLINE" : "chaitanya.agent ONLINE"}
            </span>
            <span data-clock="" style={{ whiteSpace: "nowrap" }}>
              --:--:--
            </span>
          </div>
        </div>

        {/* WINDOWS */}
        {WIN_DEFS.map((d) => {
          const s = win[d.id];
          if (!s.open) return null;
          return (
            <section
              key={d.id}
              data-win-id={d.id}
              onMouseDown={() => {
                if (s.z !== zTop) this.focusWin(d.id);
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: `translate(${s.x}px,${s.y}px)`,
                zIndex: s.z,
                width: d.wpx,
                maxWidth: "94vw",
                background: "var(--win)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                backdropFilter: "blur(10px)",
                boxShadow: "0 24px 70px rgba(0,0,0,.55)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                animation: "winIn .25s ease",
              }}
            >
              <header
                onMouseDown={(e) => this.startDrag(e, d.id)}
                onTouchStart={(e) => this.startDragTouch(e, d.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderBottom: "1px solid var(--line)",
                  cursor: "grab",
                  userSelect: "none",
                  background: "rgba(238,244,243,.03)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    fontFamily: MONO,
                    fontSize: 11.5,
                    letterSpacing: ".08em",
                    color: "var(--muted)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: s.z === zTop ? "var(--cyan)" : "var(--muted)",
                    }}
                  />
                  {d.title}
                </div>
                <button
                  onClick={() => this.setWin(d.id, { open: false })}
                  style={{
                    cursor: "pointer",
                    background: "transparent",
                    border: "1px solid var(--line)",
                    color: "var(--muted)",
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </header>
              <div style={{ maxHeight: "min(62vh,560px)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {d.id === "terminal" && this.renderTerminal()}
                {d.id === "projects" && this.renderProjects()}
                {d.id === "about" && this.renderAbout()}
                {d.id === "skills" && this.renderSkills()}
                {d.id === "resume" && this.renderResume()}
                {d.id === "agent" && this.renderAgent(chips)}
                {d.id === "contact" && this.renderContact()}
              </div>
            </section>
          );
        })}

        {/* ONBOARDING HINT — retires on first window open */}
        {!booting && this.state.hint && (
          <div
            style={{
              position: "absolute",
              bottom: mobile ? 120 : 92,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 44,
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: ".08em",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              border: "1px solid var(--line)",
              borderRadius: 6,
              background: "rgba(5,5,7,.6)",
              backdropFilter: "blur(6px)",
              pointerEvents: "none",
              whiteSpace: mobile ? "normal" : "nowrap",
              maxWidth: mobile ? "calc(100vw - 28px)" : undefined,
              textAlign: mobile ? "center" : undefined,
              animation: "fadeUpCentered .6s ease 1.1s backwards",
            }}
          >
            <span style={{ color: "var(--cyan)", animation: "blink 1.2s infinite" }}>▸</span>
            this desktop is yours — open anything from the dock below
          </div>
        )}

        {/* DOCK */}
        <div
          style={{
            position: "absolute",
            bottom: mobile ? 10 : 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 45,
            display: "flex",
            flexWrap: mobile ? "wrap" : "nowrap",
            justifyContent: "center",
            gap: mobile ? 6 : 8,
            padding: mobile ? 6 : 8,
            maxWidth: mobile ? "calc(100vw - 12px)" : undefined,
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "rgba(5,5,7,.75)",
            backdropFilter: "blur(10px)",
            animation: booting ? "none" : "fadeUpCentered .5s ease .4s backwards",
          }}
        >
          {WIN_DEFS.map((d) => {
            const open = win[d.id].open;
            return (
              <button
                key={d.id}
                title={d.title}
                data-dock-id={d.id}
                onClick={() => {
                  if (open && win[d.id].z === this.state.zTop) {
                    this.setWin(d.id, { open: false });
                  } else {
                    this.openWin(d.id);
                  }
                }}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                  background: open ? "rgba(32,244,210,.09)" : "transparent",
                  border: `1px solid ${open ? "var(--cyan)" : "var(--line)"}`,
                  color: "var(--fg)",
                  borderRadius: 7,
                  padding: mobile ? "7px 9px" : "9px 13px",
                  fontFamily: MONO,
                  fontSize: 10.5,
                  letterSpacing: ".05em",
                  minWidth: mobile ? 58 : 74,
                }}
              >
                <span style={{ fontSize: 15, color: "var(--cyan)" }}>{d.icon}</span>
                {d.label}
              </button>
            );
          })}
        </div>

        {/* GHOST CURSOR (chaitanya.agent's physical pointer) */}
        <div
          data-ghost=""
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            zIndex: 85,
            pointerEvents: "none",
            display: "none",
            filter: "drop-shadow(0 3px 10px rgba(0,0,0,.65))",
          }}
        >
          <svg width="20" height="22" viewBox="0 0 20 22">
            <path
              d="M2 1 L18 12 L10.5 13.5 L14 21 L11 22 L7.8 14.6 L2 19 Z"
              fill="var(--pink)"
              stroke="#050507"
              strokeWidth="1"
            />
          </svg>
          <span
            style={{
              position: "absolute",
              left: 16,
              top: 18,
              background: "var(--pink)",
              color: "#050507",
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 3,
              whiteSpace: "nowrap",
            }}
          >
            chaitanya.agent
          </span>
        </div>

        {/* BOOT OVERLAY */}
        {booting && (
          <div
            onClick={() => {
              clearTimeout(this._bootT);
              this.setState({ booting: false });
            }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 90,
              background: "#050507",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: "clamp(12px,1.4vw,15px)",
                lineHeight: 2,
                color: "var(--cyan)",
                width: "min(560px,86vw)",
              }}
            >
              <div data-boot="" style={{ whiteSpace: "pre-wrap" }} />
              <span style={{ animation: "blink 1s infinite" }}>▌</span>
              <div style={{ marginTop: 26, fontSize: 11, color: "var(--muted)", letterSpacing: ".14em" }}>
                CLICK TO SKIP
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  renderTerminal() {
    return (
      <>
        <div
          ref={(el) => {
            this._termScroll = el;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          style={{
            padding: "14px 16px",
            fontFamily: MONO,
            fontSize: 12.5,
            lineHeight: 1.75,
            color: "#c9d4d2",
            minHeight: 190,
            maxHeight: 300,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {this.state.tlog}
        </div>
        <form
          onSubmit={this.runTerm}
          style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 14px", borderTop: "1px solid var(--line)" }}
        >
          <span style={{ fontFamily: MONO, fontSize: 13, color: "var(--cyan)" }}>$</span>
          <input
            value={this.state.tdraft}
            onChange={(e) => this.setState({ tdraft: e.target.value })}
            placeholder="type `help`"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--fg)",
              fontFamily: MONO,
              fontSize: 13,
            }}
          />
        </form>
      </>
    );
  }

  renderProjects() {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        {BUILDS.map((b) => (
          <a
            key={b.title}
            href={b.url}
            target="_blank"
            rel="noreferrer"
            style={{ display: "block", padding: "16px 18px", borderBottom: "1px solid var(--line)", color: "inherit" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: ".02em" }}>{b.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 10.5, color: "var(--pink)", whiteSpace: "nowrap" }}>
                {b.kind}
              </span>
            </div>
            <p style={{ margin: "8px 0 10px", fontFamily: MONO, fontSize: 12, lineHeight: 1.65, color: "#a9b5b3" }}>
              {b.desc}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {b.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: ".05em",
                    color: "var(--cyan)",
                    border: "1px solid var(--line)",
                    borderRadius: 3,
                    padding: "3px 7px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    );
  }

  renderAbout() {
    return (
      <div style={{ padding: 18, fontFamily: MONO, fontSize: 13, lineHeight: 1.75, color: "#c3cecc" }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 19, color: "var(--fg)", marginBottom: 10 }}>
          Chaitanya Gidwani
        </div>
        <p style={{ margin: "0 0 12px" }}>
          <span style={{ color: "var(--cyan)" }}>&gt;</span> Computer Science undergraduate and full-stack developer
          shipping production-grade AI products end to end — multi-source data pipelines, multi-agent backends, real
          API integrations, cloud deployment. Hands-on embedding LLMs (Groq, Gemini) into real applications.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <span style={{ color: "var(--cyan)" }}>&gt;</span> B.Tech CSE, ABES Engineering College (AKTU), 2024–2028.
          Technical team member, Technovation — organized CyberQuest and a 5-day Quantum Computing workshop.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <span style={{ color: "var(--cyan)" }}>&gt;</span> Runner-up @ HackOnVibe 2026 · cleared SIH 2025 internal
          round (328 teams) · 2nd @ intra-club Buildathon · Hacktoberfest 2025 contributor · IEEE student member.
        </p>
        <p style={{ margin: 0 }}>
          <span style={{ color: "var(--pink)" }}>&gt;</span> Seeking a Software Developer / SWE internship. Type{" "}
          <span style={{ color: "var(--cyan)" }}>open contact</span> in the terminal.
        </p>
      </div>
    );
  }

  renderSkills() {
    return (
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {SKILL_GROUPS.map((g) => (
          <div key={g.label}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".08em", color: "var(--pink)", marginBottom: 7 }}>
              {g.label}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {g.items.map((skill) => (
                <span
                  key={skill}
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--cyan)",
                    border: "1px solid var(--line)",
                    borderRadius: 3,
                    padding: "4px 8px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  renderResume() {
    const h = (t: string) => (
      <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: ".08em", color: "var(--pink)", margin: "14px 0 7px" }}>
        {t}
      </div>
    );
    const row = (l: string, r: string) => (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ fontWeight: 700, color: "var(--fg)" }}>{l}</span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{r}</span>
      </div>
    );
    return (
      <div style={{ padding: "4px 18px 18px", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.7, color: "#c3cecc" }}>
        {h("SUMMARY")}
        <p style={{ margin: 0 }}>
          CS undergraduate and full-stack developer shipping production-grade AI products end to end — multi-source
          data pipelines, multi-agent backends, real API integrations, cloud deployment. Hackathon runner-up and SIH
          2025 qualifier seeking a Software Developer / SWE internship.
        </p>
        {h("EDUCATION")}
        {row("B.Tech CSE — ABES Engineering College (AKTU)", "2024 – 2028")}
        {h("EXPERIENCE")}
        {row("Technovation (ABESEC) — Technical Team Member", "Jun 2025 – Present")}
        <p style={{ margin: "4px 0 0" }}>
          Organized 2 major campus programs: CyberQuest (flagship technical event) and a 5-day offline Quantum
          Computing workshop — registrations, logistics, onboarding, on-ground technical ops.
        </p>
        {h("PROJECTS")}
        <p style={{ margin: 0 }}>
          Argus (opportunity aggregator, 200+ live listings, dual-LLM backend) · LaunchCopilot (AI launch automation,
          runner-up @ HackOnVibe 2026) · MarketMind (multi-agent marketing platform, 8 microservices) — details in
          projects.exe
        </p>
        {h("ACHIEVEMENTS")}
        <p style={{ margin: 0 }}>
          SIH 2025 internal round cleared (328 teams) · 2nd @ HackOnVibe 2026 · 2nd @ intra-club Buildathon ·
          Hacktoberfest 2025 contributor · IEEE student member · NSS &amp; Trishul clubs
        </p>
        {h("CONTACT")}
        <p style={{ margin: 0 }}>
          chaitanya13197@gmail.com · +91 9792538186 · Ghaziabad (UP), India
        </p>
        <a
          href="/resume.pdf"
          download="Chaitanya_Gidwani_Resume.pdf"
          style={{
            display: "inline-block",
            marginTop: 16,
            background: "var(--cyan)",
            color: "#050507",
            fontWeight: 700,
            padding: "11px 22px",
            borderRadius: 4,
            fontSize: 12,
            letterSpacing: ".05em",
            fontFamily: DISPLAY,
          }}
        >
          DOWNLOAD PDF ▾
        </a>
      </div>
    );
  }

  renderAgent(chips: { label: string; onClick: () => void }[]) {
    const { messages, loading, draft } = this.state;
    return (
      <>
        <div
          ref={(el) => {
            this._chatScroll = el;
            if (el) el.scrollTop = el.scrollHeight;
          }}
          style={{
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 200,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {messages.length === 0 && (
            <div>
              <p style={{ margin: "0 0 12px", fontFamily: MONO, fontSize: 12.5, lineHeight: 1.65, color: "#b8c4c2" }}>
                $ chaitanya.agent online. I answer as Chaitanya — and I can drive this OS. Try &quot;open projects and tell me
                about MarketMind&quot;.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={chip.onClick}
                    style={{
                      cursor: "pointer",
                      textAlign: "left",
                      background: "transparent",
                      border: "1px solid var(--line)",
                      color: "var(--fg)",
                      borderRadius: 4,
                      padding: "9px 12px",
                      fontFamily: MONO,
                      fontSize: 12,
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  background: "var(--cyan)",
                  color: "#050507",
                  padding: "9px 12px",
                  borderRadius: 4,
                  fontFamily: MONO,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  fontWeight: 700,
                }}
              >
                {m.content}
              </div>
            ) : (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "92%",
                  background: "rgba(238,244,243,.05)",
                  color: "#dbe4e2",
                  padding: "9px 12px",
                  borderRadius: 4,
                  fontFamily: MONO,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  borderLeft: "2px solid var(--cyan)",
                }}
              >
                {m.content}
              </div>
            )
          )}
          {loading && (
            <div
              style={{
                alignSelf: "flex-start",
                fontFamily: MONO,
                fontSize: 11.5,
                color: "var(--cyan)",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  animation: "dotPulse 1s infinite",
                }}
              />
              computing…
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            this.send();
          }}
          style={{ padding: "12px 14px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}
        >
          <input
            value={draft}
            onChange={(e) => this.setState({ draft: e.target.value })}
            placeholder="> query"
            style={{
              flex: 1,
              background: "#050507",
              border: "1px solid var(--line)",
              color: "var(--fg)",
              borderRadius: 4,
              padding: "10px 12px",
              fontFamily: MONO,
              fontSize: 12.5,
            }}
          />
          <button
            type="submit"
            style={{
              cursor: "pointer",
              background: "var(--cyan)",
              color: "#050507",
              border: "none",
              width: 40,
              borderRadius: 4,
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            ▸
          </button>
        </form>
      </>
    );
  }

  renderContact() {
    const { form, sent } = this.state;
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          this.setState({ sent: true });
        }}
        style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <input
          value={form.name}
          onChange={(e) => this.setState({ form: { ...form, name: e.target.value } })}
          placeholder="> your name"
          style={{
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 4,
            color: "var(--fg)",
            fontFamily: MONO,
            fontSize: 13,
            padding: "11px 13px",
          }}
        />
        <input
          value={form.email}
          onChange={(e) => this.setState({ form: { ...form, email: e.target.value } })}
          placeholder="> email"
          style={{
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 4,
            color: "var(--fg)",
            fontFamily: MONO,
            fontSize: 13,
            padding: "11px 13px",
          }}
        />
        <textarea
          value={form.msg}
          onChange={(e) => this.setState({ form: { ...form, msg: e.target.value } })}
          placeholder="> what are we building?"
          rows={3}
          style={{
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: 4,
            color: "var(--fg)",
            fontFamily: MONO,
            fontSize: 13,
            padding: "11px 13px",
            resize: "vertical",
          }}
        />
        <button
          type="submit"
          style={{
            alignSelf: "flex-start",
            cursor: "pointer",
            background: "var(--cyan)",
            color: "#050507",
            border: "none",
            fontWeight: 700,
            padding: "11px 22px",
            borderRadius: 4,
            fontSize: 12,
            letterSpacing: ".05em",
            fontFamily: DISPLAY,
          }}
        >
          {sent ? "TRANSMITTED ✦" : "TRANSMIT ▸"}
        </button>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontFamily: MONO,
            fontSize: 12,
            borderTop: "1px solid var(--line)",
            paddingTop: 12,
          }}
        >
          <a href="https://github.com/ChaitanyaGidwani" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href="https://www.linkedin.com/in/chaitanya-gidwani/" target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          <a href="mailto:chaitanya13197@gmail.com">chaitanya13197@gmail.com ↗</a>
        </div>
      </form>
    );
  }
}

import { useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════
   SUPABASE — lightweight fetch-based client (no SDK)
══════════════════════════════════════════════════════ */
const SUPA_URL = "https://psekpvliflmotstocvzl.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZWtwdmxpZmxtb3RzdG9jdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzkxNzMsImV4cCI6MjA4ODU1NTE3M30.gzQF1A4oNHJX7m1a62smZSEivEoitiHFTeQa2qF0VQc";

// Auth token stored in memory
let _token = null;
let _refreshToken = null;
const setSession = (access, refresh) => { _token = access; _refreshToken = refresh; };
const clearSession = () => { _token = null; _refreshToken = null; };

const authHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${_token || SUPA_KEY}`,
  ...extra,
});

// REST helper
const rest = async (method, table, opts = {}) => {
  const { filter = "", body, select = "*", returning = "representation" } = opts;
  const url = `${SUPA_URL}/rest/v1/${table}?${select !== "*" ? `select=${select}` : "select=*"}${filter ? "&" + filter : ""}`;
  const headers = { ...authHeaders(), "Prefer": returning === "representation" ? "return=representation" : "return=minimal" };
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const sb = {
  auth: {
    signUp: async ({ email, password, options }) => {
      const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
        body: JSON.stringify({ email, password, data: options?.data }),
      });
      const data = await res.json();
      if (data.error) return { error: data.error };
      if (data.access_token) setSession(data.access_token, data.refresh_token);
      return { data, error: null };
    },
    signInWithPassword: async ({ email, password }) => {
      const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPA_KEY },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error || data.error_code) return { error: { message: data.error_description || data.msg || "Sign in failed" } };
      setSession(data.access_token, data.refresh_token);
      return { data, error: null };
    },
    signOut: async () => {
      await fetch(`${SUPA_URL}/auth/v1/logout`, { method: "POST", headers: authHeaders() });
      clearSession();
      return { error: null };
    },
    getUser: async () => {
      if (!_token) return { data: { user: null } };
      const res = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: authHeaders() });
      const data = await res.json();
      return { data: { user: data.id ? data : null } };
    },
  },
  from: (_table) => ({}), // unused — direct rest() calls used instead
};

/* ══════════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════════ */
const S = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#f5f5f3;--surface:#ffffff;--surface-2:#ededeb;
    --ink:#1a1a1a;--ink-2:#3a3a3a;--ink-3:#999999;
    --accent:#E8583A;--accent-bg:#fdf0ec;--accent-dim:#f0927a;
    --lime:#4A9B7F;--lime-bg:#e8f5f0;--lime-dim:#6ab89e;
    --lav:#5B8DD9;--lav-bg:#eef3fc;--lav-dim:#85aae6;
    --border:#e0e0de;--border-s:#cecece;
    --r:5px;--t:0.14s ease
  }
  .dark{
    --bg:#141414;--surface:#1c1c1c;--surface-2:#242424;
    --ink:#f0f0ee;--ink-2:#b0b0b0;--ink-3:#606060;
    --accent:#E8583A;--accent-bg:#2a1610;--accent-dim:#c04828;
    --lime:#4A9B7F;--lime-bg:#0e2018;--lime-dim:#3a7a64;
    --lav:#5B8DD9;--lav-bg:#101826;--lav-dim:#4070b8;
    --border:#282828;--border-s:#343434
  }
  html,body{background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;font-size:14px;line-height:1.5;transition:background var(--t),color var(--t)}
  .app{max-width:1400px;margin:0 auto;padding:0 20px 80px}
  .app-body{display:flex;flex-direction:column;gap:0}
  .col-left{flex:1;min-width:0}
  .col-right{flex:1;min-width:0}
  @media(min-width:900px){
    .app-body{flex-direction:row;align-items:stretch;gap:20px;padding-top:4px}
    .col-left{flex:2;display:flex;flex-direction:column}
    .col-right{flex:1;position:relative}
    .col-right .tab-panel{position:absolute;inset:0;display:flex;flex-direction:column;margin-top:0;overflow:hidden}
    .col-right .tscroll{flex:1;min-height:0;overflow-y:auto}
    .col-right .chatfeed{flex:1;min-height:0;overflow-y:auto}
    .col-right .notes-body{flex:1;min-height:0;overflow-y:auto;max-height:none}
  }
  .hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 0 16px;border-bottom:2px solid var(--border-s);margin-bottom:22px}
  .brand{font-family:'IBM Plex Mono',monospace;font-size:16px;font-weight:500;color:var(--ink);letter-spacing:.18em;text-transform:uppercase}
  .brand em{color:var(--accent);font-style:normal;font-weight:400}
  .hdr-r{display:flex;align-items:center;gap:8px}
  .btn{display:inline-flex;align-items:center;gap:5px;padding:8px 15px;border-radius:var(--r);border:1.5px solid var(--border-s);background:var(--surface);color:var(--ink-2);font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all var(--t);white-space:nowrap;line-height:1}
  .btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}
  .btn:disabled{opacity:.45;cursor:not-allowed}
  .btn-fill{background:var(--ink);color:var(--bg);border-color:var(--ink)}
  .btn-fill:hover{background:var(--accent);border-color:var(--accent);color:#fff}
  .btn-accent{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:600}
  .btn-accent:hover{filter:brightness(1.1)}
  .btn-sm{padding:5px 11px;font-size:12px}
  .btn-icon{padding:8px;width:34px;height:34px;justify-content:center}
  .url-row{display:flex;gap:10px;margin-bottom:18px}
  .url-box{flex:1;display:flex;align-items:center;gap:10px;background:var(--surface);border:1.5px solid var(--border-s);border-radius:var(--r);padding:0 14px;transition:border-color var(--t)}
  .url-box:focus-within{border-color:var(--accent)}
  .url-box input{flex:1;background:none;border:none;outline:none;font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;color:var(--ink);padding:11px 0}
  .url-box input::placeholder{color:var(--ink-3)}
  .vid-wrap{position:relative;width:100%;padding-top:56.25%;background:var(--surface-2);border-radius:var(--r);overflow:hidden;border:1.5px solid var(--border-s)}
  .vid-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
  .vid-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px}
  .vid-circle{width:68px;height:68px;border-radius:50%;border:2px solid var(--border-s);display:flex;align-items:center;justify-content:center;color:var(--ink-3)}
  .vid-empty p{font-family:'IBM Plex Sans',sans-serif;font-size:15px;color:var(--ink-3);font-weight:300;letter-spacing:.03em}
  .vid-meta{margin-top:10px;padding:12px 16px;background:var(--surface);border:1.5px solid var(--border-s);border-radius:var(--r);display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .vid-meta-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);flex-shrink:0}
  .tags-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1}
  .tag-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px 3px 8px;border-radius:20px;background:var(--lime-bg);border:1.5px solid var(--lime-dim);color:var(--lime);font-size:12px;font-weight:500}
  .tag-pill-x{background:none;border:none;cursor:pointer;color:var(--ink-2);opacity:.6;font-size:14px;line-height:1;padding:0;margin-left:1px;transition:opacity var(--t)}
  .tag-pill-x:hover{opacity:1}
  .tag-input-wrap{display:flex;align-items:center}
  .tag-input{padding:4px 8px;border:1.5px solid var(--border-s);border-right:none;border-radius:6px 0 0 6px;background:var(--surface-2);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;font-size:12px;outline:none;width:110px;transition:border-color var(--t)}
  .tag-input:focus{border-color:var(--accent)}
  .tag-input::placeholder{color:var(--ink-3)}
  .tag-add-btn{padding:4px 10px;border:1.5px solid var(--border-s);border-left:none;border-radius:0 6px 6px 0;background:var(--surface-2);color:var(--ink-2);font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all var(--t)}
  .tag-add-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}
  .timeline-wrap{margin-top:14px;background:var(--surface);border:1.5px solid var(--border-s);border-radius:var(--r);padding:14px 20px 16px}
  .tl-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .tl-label{font-size:11px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
  .tl-actions{display:flex;gap:8px;align-items:center}
  .tl-track{position:relative;height:28px;display:flex;align-items:center;cursor:pointer;z-index:1}
  .tl-track-rail{position:absolute;left:0;right:0;height:8px;border-radius:4px;background:var(--surface-2);border:1.5px solid var(--border);overflow:hidden;pointer-events:none}
  .tl-progress{height:100%;background:var(--accent);border-radius:3px;pointer-events:none}
  .tl-dot{position:absolute;top:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:var(--lav);opacity:.9;z-index:2;pointer-events:none}
  .tl-scrubber{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:var(--accent);border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.2);z-index:3;pointer-events:none;transition:transform var(--t)}
  .tl-track:hover .tl-scrubber{transform:translate(-50%,-50%) scale(1.25)}
  .tl-ghost{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:transparent;border:2px solid var(--accent);opacity:0.5;z-index:3;pointer-events:none}
  .tl-hover-tip{position:absolute;bottom:calc(100% + 6px);transform:translateX(-50%);background:var(--ink);color:var(--bg);font-size:11px;font-weight:500;padding:3px 8px;border-radius:5px;white-space:nowrap;pointer-events:none;z-index:10}
  .tl-hover-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:var(--ink)}
  .tl-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .tl-chip{display:flex;align-items:center;gap:5px;padding:4px 10px 4px 8px;border-radius:20px;border:1.5px solid var(--border-s);background:var(--surface-2);font-size:12px;color:var(--ink-2);cursor:pointer;transition:all var(--t)}
  .tl-chip:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}
  .tl-chip-ts{color:var(--accent);font-weight:400;font-size:11px;font-family:'IBM Plex Mono',monospace}
  .tl-chip-x{background:none;border:none;cursor:pointer;color:var(--ink-3);font-size:15px;line-height:1;padding:0 0 0 2px;transition:color var(--t)}
  .tl-chip-x:hover{color:var(--ink)}
  .tl-empty{font-size:12.5px;color:var(--ink-3);font-style:italic}
  .tab-panel{margin-top:14px;background:var(--surface);border:1.5px solid var(--border-s);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}
  .tabs{display:flex;border-bottom:1.5px solid var(--border-s);background:var(--surface-2);padding:0 4px;overflow-x:auto;scrollbar-width:none}
  .tabs::-webkit-scrollbar{display:none}
  .tab{padding:12px 16px;font-size:13px;font-weight:500;color:var(--ink-3);border:none;background:none;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;border-bottom:2.5px solid transparent;margin-bottom:-1.5px;transition:color var(--t),border-color var(--t);display:flex;align-items:center;gap:6px;white-space:nowrap}
  .tab:hover{color:var(--ink-2)}
  .tab.on{color:var(--ink);border-bottom-color:var(--accent)}
  .tab-ico{opacity:.65}
  .tab.on .tab-ico{opacity:1;color:var(--accent)}
  .t-controls{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1.5px solid var(--border)}
  .t-hint{font-size:12px;color:var(--ink-3);font-style:italic;display:flex;align-items:center;gap:5px}
  .tscroll{overflow-y:auto;padding:12px 16px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
  .tscroll::-webkit-scrollbar{width:4px}
  .tscroll::-webkit-scrollbar-thumb{background:var(--border-s);border-radius:4px}
  .tline{display:flex;gap:12px;padding:7px 10px;border-radius:6px;cursor:pointer;margin-bottom:3px;transition:background var(--t);border-left:2.5px solid transparent}
  .tline:hover{background:var(--surface-2)}
  .tline.on{background:var(--lime-bg);border-left-color:var(--lime)}
  .tts{font-size:11px;font-weight:400;color:var(--accent);min-width:34px;padding-top:2px;font-family:'IBM Plex Mono',monospace;flex-shrink:0}
  .ttxt{font-size:13.5px;color:var(--ink);line-height:1.65}
  .tw{border-radius:2px;padding:0 1px}
  .lang-sel{padding:5px 9px;border:1.5px solid var(--border-s);border-radius:6px;background:var(--surface);color:var(--ink-2);font-size:12px;font-family:'IBM Plex Sans',sans-serif;cursor:pointer;outline:none}
  .chatfeed{height:340px;overflow-y:auto;padding:16px 18px 8px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
  .chatfeed::-webkit-scrollbar{width:3px}
  .chatfeed::-webkit-scrollbar-thumb{background:var(--border-s)}
  .cmsg{margin-bottom:14px}
  .clabel{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
  .clabel.r{text-align:right}
  .cbub{display:inline-block;max-width:80%;padding:10px 14px;font-size:13.5px;line-height:1.55;border-radius:var(--r)}
  .cbub-u{background:var(--ink);color:var(--bg);border-radius:8px 8px 2px 8px;float:right;clear:both}
  .cmsg.um{text-align:right}
  .cbub-b{background:var(--surface-2);color:var(--ink);border:1.5px solid var(--border);border-radius:8px 8px 8px 2px}
  .clr{clear:both}
  .chatfoot{display:flex;gap:8px;padding:12px 16px 14px;border-top:1.5px solid var(--border)}
  .chatta{flex:1;padding:10px 12px;border:1.5px solid var(--border-s);border-radius:var(--r);outline:none;resize:none;font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:var(--ink);background:var(--surface-2);transition:border-color var(--t);line-height:1.5}
  .chatta::placeholder{color:var(--ink-3)}
  .chatta:focus{border-color:var(--accent)}
  .notes-top{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1.5px solid var(--border)}
  .nfolders{display:flex;overflow-x:auto;scrollbar-width:none;border-bottom:1.5px solid var(--border);padding:0 16px;background:var(--surface-2)}
  .nfolders::-webkit-scrollbar{display:none}
  .nftab{padding:10px 14px;font-size:12px;font-weight:500;color:var(--ink-3);background:none;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;white-space:nowrap;transition:color var(--t),border-color var(--t)}
  .nftab:hover{color:var(--ink-2)}
  .nftab.on{color:var(--lime);border-bottom-color:var(--lime)}
  .notes-body{padding:16px;max-height:340px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
  .notes-body::-webkit-scrollbar{width:4px}
  .notes-body::-webkit-scrollbar-thumb{background:var(--border-s)}
  .ncard{display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-radius:var(--r);border:1.5px solid var(--border);background:var(--surface-2);margin-bottom:8px;transition:border-color var(--t),box-shadow var(--t);cursor:pointer}
  .ncard:hover{border-color:var(--border-s);box-shadow:0 2px 8px rgba(0,0,0,.06)}
  .ncard-ico{color:var(--accent);flex-shrink:0;margin-top:2px}
  .ncard-title{font-size:13.5px;font-weight:500;color:var(--ink);margin-bottom:3px;line-height:1.4}
  .ncard-meta{font-size:11.5px;color:var(--ink-3)}
  .ncard-ts{color:var(--accent);font-weight:400;font-size:11px;margin-right:6px;font-family:'IBM Plex Mono',monospace}
  .nadd{width:100%;padding:12px 14px;border:1.5px dashed var(--border-s);border-radius:var(--r);background:none;color:var(--ink-3);font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;text-align:left;transition:all var(--t);display:flex;align-items:center;gap:8px}
  .nadd:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-bg)}
  .note-modal{position:fixed;z-index:360;width:520px;max-width:95vw;background:var(--surface);border:1.5px solid var(--border-s);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.14);animation:pop .2s ease}
  .note-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1.5px solid var(--border)}
  .note-modal-title{font-family:'IBM Plex Sans',sans-serif;font-size:19px;color:var(--ink)}
  .note-modal-ref{font-size:12px;color:var(--ink-3);padding:10px 20px;background:var(--surface-2);border-bottom:1.5px solid var(--border);display:flex;align-items:center;gap:8px;font-style:italic}
  .note-modal-body{padding:16px 20px 20px;display:flex;flex-direction:column;gap:12px}
  .note-field-label{font-size:11px;font-weight:600;color:var(--ink-2);letter-spacing:.04em;margin-bottom:5px}
  .note-title-input{width:100%;padding:10px 12px;border:1.5px solid var(--border-s);border-radius:var(--r);background:var(--surface-2);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;outline:none;transition:border-color var(--t)}
  .note-title-input:focus{border-color:var(--accent)}
  .note-title-input::placeholder{color:var(--ink-3)}
  .note-content-input{width:100%;padding:10px 12px;border:1.5px solid var(--border-s);border-radius:var(--r);background:var(--surface-2);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;outline:none;resize:vertical;min-height:100px;line-height:1.6;transition:border-color var(--t)}
  .note-content-input:focus{border-color:var(--accent)}
  .note-content-input::placeholder{color:var(--ink-3)}
  .note-folder-row{display:flex;gap:6px;flex-wrap:wrap}
  .note-folder-btn{padding:4px 12px;border-radius:20px;border:1.5px solid var(--border-s);background:var(--surface-2);color:var(--ink-3);font-size:12px;font-weight:500;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;transition:all var(--t)}
  .note-folder-btn.on{background:var(--accent-bg);border-color:var(--accent-dim);color:var(--accent)}
  .note-modal-foot{display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1.5px solid var(--border)}
  .acct-head{display:flex;align-items:center;gap:18px;padding:20px 22px;border-bottom:1.5px solid var(--border);background:var(--surface-2)}
  .avatar{width:48px;height:48px;border-radius:50%;background:var(--accent-bg);border:2px solid var(--accent-dim);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:var(--accent);flex-shrink:0;letter-spacing:.02em}
  .acct-name{font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px}
  .acct-email{font-size:12px;color:var(--ink-3)}
  .acct-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:var(--border);border-bottom:1.5px solid var(--border)}
  .stat{background:var(--surface-2);padding:16px 0;text-align:center}
  .stat-n{font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:400;color:var(--ink);line-height:1;margin-bottom:4px}
  .stat-l{font-size:11px;color:var(--ink-3);font-weight:500;letter-spacing:.05em;text-transform:uppercase}
  .hist-toolbar{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px}
  .hist-title{font-size:12px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3)}
  .seg{display:flex;background:var(--surface-2);border:1.5px solid var(--border);border-radius:6px;overflow:hidden}
  .seg-btn{padding:5px 12px;font-size:12px;font-weight:500;color:var(--ink-3);background:none;border:none;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;transition:all var(--t);display:flex;align-items:center;gap:4px}
  .seg-btn.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .hist-group-label{font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);padding:10px 16px 6px}
  .hist-list{padding-bottom:16px}
  .hcard{display:flex;gap:12px;padding:10px 16px;transition:background var(--t);cursor:pointer}
  .hcard:hover{background:var(--surface-2)}
  .hcard-thumb{width:80px;height:52px;border-radius:5px;background:var(--surface-2);border:1.5px solid var(--border);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--ink-3);flex-shrink:0}
  .hcard-thumb img{width:100%;height:100%;object-fit:cover}
  .hcard-body{flex:1;min-width:0}
  .hcard-title{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .hcard-meta{font-size:11px;color:var(--ink-3);margin-bottom:5px}
  .hcard-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px}
  .hcard-tag{padding:2px 9px;border-radius:20px;font-size:11px;font-weight:500;background:var(--lav-bg);border:1.5px solid var(--lav-dim);color:var(--lav)}
  .badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--ink-3);margin-right:8px}
  .badge-g{color:var(--lime)}
  .hcard-badges{display:flex;align-items:center;flex-wrap:wrap}
  .pbar-wrap{display:flex;align-items:center;gap:8px;margin-top:5px}
  .pbar-track{flex:1;height:3px;background:var(--border);border-radius:2px}
  .pbar-fill{height:100%;background:var(--lime);border-radius:2px}
  .pbar-label{font-size:10px;color:var(--ink-3);white-space:nowrap}
  .tag-filter-bar{display:flex;flex-wrap:wrap;gap:5px;padding:6px 16px 0}
  .tag-fchip{padding:3px 11px;border-radius:20px;border:1.5px solid var(--border-s);background:var(--surface-2);color:var(--ink-3);font-size:11.5px;font-weight:500;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;transition:all var(--t)}
  .tag-fchip.on{background:var(--lav-bg);border-color:var(--lav-dim);color:var(--ink)}
  .acct-tabs{display:flex;border-bottom:1.5px solid var(--border);background:var(--surface-2);padding:0 16px}
  .acct-tab{padding:11px 16px;font-size:13px;font-weight:500;color:var(--ink-3);background:none;border:none;border-bottom:2.5px solid transparent;margin-bottom:-1.5px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;transition:all var(--t);display:flex;align-items:center;gap:6px;white-space:nowrap}
  .acct-tab:hover{color:var(--ink-2)}
  .acct-tab.on{color:var(--ink);border-bottom-color:var(--accent)}
  .acct-item{display:flex;gap:12px;padding:11px 16px;border-bottom:1px solid var(--border);transition:background var(--t);cursor:pointer}
  .acct-item:hover{background:var(--surface-2)}
  .acct-item-thumb{width:40px;height:28px;border-radius:4px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--ink-3)}
  .acct-item-thumb img{width:100%;height:100%;object-fit:cover}
  .acct-item-body{flex:1;min-width:0}
  .acct-item-title{font-size:13px;font-weight:500;color:var(--ink);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .acct-item-meta{font-size:11px;color:var(--ink-3);display:flex;align-items:center;gap:6px}
  .acct-item-ts{color:var(--accent);font-weight:400;font-family:'IBM Plex Mono',monospace}
  .acct-item-content{font-size:12px;color:var(--ink-2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .acct-panel{position:fixed;top:0;right:0;bottom:0;z-index:401;width:440px;max-width:100vw;background:var(--surface);border-left:1.5px solid var(--border-s);display:flex;flex-direction:column;animation:slideIn .25s cubic-bezier(.4,0,.2,1);overflow:hidden}
  @keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
  .acct-panel-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1.5px solid var(--border);background:var(--surface-2);flex-shrink:0}
  .acct-panel-title{font-family:'IBM Plex Sans',sans-serif;font-size:20px;color:var(--ink);font-weight:500}
  .acct-panel-close{background:none;border:none;cursor:pointer;color:var(--ink-3);font-size:22px;line-height:1;transition:color var(--t);padding:0}
  .acct-panel-close:hover{color:var(--ink)}
  .acct-scroll{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
  .acct-scroll::-webkit-scrollbar{width:4px}
  .acct-scroll::-webkit-scrollbar-thumb{background:var(--border-s)}
  .profile-empty{padding:40px 24px;text-align:center}
  .profile-empty p{font-family:'IBM Plex Sans',sans-serif;font-size:18px;color:var(--ink-3);font-style:italic;margin-bottom:16px}
  .sel-bubble{position:absolute;z-index:300;background:var(--ink);color:var(--bg);padding:6px 13px;border-radius:20px;font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 4px 16px rgba(0,0,0,.22);white-space:nowrap;animation:pop .15s ease}
  @keyframes pop{from{opacity:0;transform:translateX(-50%) scale(.88)}to{opacity:1;transform:translateX(-50%) scale(1)}}
  .def-modal{position:fixed;z-index:250;width:480px;max-width:94vw;background:var(--surface);border:1.5px solid var(--border-s);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.14);animation:pop .18s ease;max-height:80vh;display:flex;flex-direction:column}
  .def-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px 14px;border-bottom:1.5px solid var(--border)}
  .def-modal-word{font-family:'IBM Plex Sans',sans-serif;font-size:22px;color:var(--ink)}
  .def-modal-x{background:none;border:none;font-size:22px;cursor:pointer;color:var(--ink-3);line-height:1;transition:color var(--t)}
  .def-modal-x:hover{color:var(--ink)}
  .def-modal-body{padding:16px 22px 20px;overflow-y:auto}
  .def-modal-loading{display:flex;align-items:center;gap:10px;color:var(--ink-3);font-size:13px;font-style:italic;padding:8px 0}
  .def-modal-no{color:var(--ink-3);font-style:italic;font-size:13px}
  .def-modal-text{font-size:13.5px;line-height:1.7;color:var(--ink-2)}
  .def-modal-src{margin-top:14px;display:flex;align-items:center;justify-content:space-between}
  .def-modal-src-label{font-size:11px;color:var(--ink-3)}
  .def-modal-src a{font-size:12px;color:var(--accent);text-decoration:none}
  .def-modal-src a:hover{text-decoration:underline}
  .dots{display:flex;gap:4px}
  .dot{width:6px;height:6px;border-radius:50%;background:var(--ink-3);animation:blink 1.2s infinite}
  .dot:nth-child(2){animation-delay:.2s}
  .dot:nth-child(3){animation-delay:.4s}
  @keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
  .overlay{position:fixed;inset:0;z-index:350;background:rgba(0,0,0,.25);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px}
  .modal{background:var(--surface);border:1.5px solid var(--border-s);border-radius:12px;padding:32px 28px;width:380px;max-width:100%;box-shadow:0 16px 48px rgba(0,0,0,.14);animation:pop .2s ease}
  .m-title{font-family:'IBM Plex Sans',sans-serif;font-size:27px;color:var(--ink);margin-bottom:4px}
  .m-sub{font-size:13px;color:var(--ink-3);margin-bottom:22px}
  .fl{display:block;font-size:12px;font-weight:600;color:var(--ink-2);margin-bottom:5px;letter-spacing:.03em}
  .fi{width:100%;padding:10px 13px;border:1.5px solid var(--border-s);border-radius:var(--r);background:var(--surface-2);color:var(--ink);font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;outline:none;margin-bottom:14px;transition:border-color var(--t)}
  .fi:focus{border-color:var(--accent)}
  .m-link{display:block;text-align:center;font-size:12.5px;color:var(--accent);background:none;border:none;cursor:pointer;margin-top:10px;font-family:'IBM Plex Sans',sans-serif}
  .m-err{font-size:12px;color:var(--accent);margin-bottom:10px;padding:8px 12px;background:var(--accent-bg);border-radius:6px}
  .confirm-overlay{position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.35);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:20px}
  .confirm-box{background:var(--surface);border:1.5px solid var(--border-s);border-radius:10px;padding:28px 26px 22px;width:320px;max-width:100%;box-shadow:0 16px 48px rgba(0,0,0,.18);animation:pop .18s ease}
  .confirm-msg{font-size:15px;color:var(--ink);margin-bottom:20px;line-height:1.5}
  .confirm-btns{display:flex;gap:8px;justify-content:flex-end}
  .toast{position:fixed;bottom:20px;right:20px;z-index:500;background:var(--ink);color:var(--bg);padding:10px 18px;border-radius:var(--r);font-size:13px;font-weight:500;box-shadow:0 6px 20px rgba(0,0,0,.2);animation:slideUp .2s ease}
  @keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .loading-bar{height:2px;background:var(--accent);border-radius:2px;animation:loadbar 1.2s ease-in-out infinite;margin-bottom:10px}
  @keyframes loadbar{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}
  hr{border:none;border-top:1.5px solid var(--border)}
`;

/* ══════════════════════════════════════════════════════
   CONSTANTS & HELPERS
══════════════════════════════════════════════════════ */
const TRANSCRIPT_FALLBACK = [];
const FOLDERS = ["All","Architecture","Philosophy","Favorites"];
const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
const getVid = u => (u.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)||[])[1]||null;
const fmtDate = d => { const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const dt=new Date(d); return `${M[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; };
const DUR = 140;

const Ico = {
  link:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  sun:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  play:<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  send:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  note:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  plus:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  bm:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  tag:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  user:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  txt:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  chat:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  cal:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  trash:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
  edit:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};

/* ══════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [dark,setDark] = useState(false);
  const [url,setUrl] = useState("");
  const [videoId,setVideoId] = useState(null);
  const [videoTitle,setVideoTitle] = useState("");
  const [videoTags,setVideoTags] = useState([]);
  const [tagInput,setTagInput] = useState("");
  const [activeLine,setActiveLine] = useState(0);
  const [scrubPos,setScrubPos] = useState(0);
  const [lang,setLang] = useState("Original");
  const [selBubble,setSelBubble] = useState(null);
  const [defModal,setDefModal] = useState(null);
  const transcriptRef = useRef(null);
  const [bookmarks,setBookmarks] = useState([]);
  const [activeTab,setActiveTab] = useState("transcript");
  const [chat,setChat] = useState([{role:"bot",text:"Ask me anything about this video — I'll answer only from its content."}]);
  const [chatInput,setChatInput] = useState("");
  const [chatLoading,setChatLoading] = useState(false);
  const [noteFolder,setNoteFolder] = useState("All");
  const [transcript,setTranscript] = useState(TRANSCRIPT_FALLBACK);
  const [transcriptLoading,setTranscriptLoading] = useState(false);
  const [transcriptError,setTranscriptError] = useState(null);
  const [tlHover,setTlHover] = useState(null);
  const [notes,setNotes] = useState([]);
  const [noteModal,setNoteModal] = useState(null); // {time, lineText, folder} — ADD mode
  const [viewNote,setViewNote] = useState(null);   // note id being viewed
  const [editNote,setEditNote] = useState(null);   // {id,title,content,folder,time,lineText}
  const [confirmDialog,setConfirmDialog] = useState(null); // {msg, onConfirm}
  const [authMode,setAuthMode] = useState(null);
  const [form,setForm] = useState({name:"",email:"",password:""});
  const [authError,setAuthError] = useState("");
  const [authLoading,setAuthLoading] = useState(false);
  const [user,setUser] = useState(null);
  const [profile,setProfile] = useState(null);
  const [toast,setToast] = useState(null);
  const [history,setHistory] = useState([]);
  const [acctOpen,setAcctOpen] = useState(false);
  const [acctTab,setAcctTab] = useState("videos"); // videos | notes | bookmarks
  const [histView,setHistView] = useState("time");
  const [activeTagFilter,setActiveTagFilter] = useState(null);
  const [dbLoading,setDbLoading] = useState(false);
  const [allAcctNotes,setAllAcctNotes] = useState([]);
  const [allAcctBookmarks,setAllAcctBookmarks] = useState([]);
  const chatEndRef = useRef(null);
  const videoRowId = useRef(null);

  useEffect(()=>{document.documentElement.className=dark?"dark":"";},[dark]);
  useEffect(()=>{chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  /* ── AUTH INIT ── */
  useEffect(() => {
    sb.auth.getUser().then(({ data: { user: u } }) => {
      if (u) initUser(u);
    });
  }, []);

  const initUser = async (sbUser) => {
    setUser(sbUser);
    try {
      const rows = await rest("GET", "profiles", { filter: `id=eq.${sbUser.id}&limit=1` });
      let prof = rows && rows[0];
      if (!prof) {
        const newRows = await rest("POST", "profiles", {
          body: [{ id: sbUser.id, name: sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "User", email: sbUser.email }]
        });
        prof = newRows && newRows[0];
      }
      setProfile(prof);
      const vids = await rest("GET", "videos", { filter: `user_id=eq.${sbUser.id}&order=watched_at.desc` });
      if (vids) {
        // Fetch real titles for all placeholder videos in parallel first
        const titledVids = await Promise.all(vids.map(async v => {
          if(!v.title || v.title.startsWith("Video ")) {
            const ytTitle = await fetchYTTitle(v.video_id);
            if(ytTitle) {
              await rest("PATCH","videos",{body:{title:ytTitle},filter:`id=eq.${v.id}`,returning:"minimal"});
              return {...v, title:ytTitle};
            }
          }
          return v;
        }));
        setHistory(titledVids);

        // Load all notes and bookmarks, enrich with real titles
        const vidIds = titledVids.map(v=>v.id);
        if(vidIds.length>0){
          const [an, ab] = await Promise.all([
            rest("GET","notes",{filter:`video_id=in.(${vidIds.join(",")})&order=created_at.desc`}),
            rest("GET","bookmarks",{filter:`video_id=in.(${vidIds.join(",")})&order=created_at.desc`}),
          ]);
          const vidMap = Object.fromEntries(titledVids.map(v=>[v.id,v]));
          setAllAcctNotes((an||[]).map(n=>({...n,videoTitle:vidMap[n.video_id]?.title||"",videoYtId:vidMap[n.video_id]?.video_id})));
          setAllAcctBookmarks((ab||[]).map(b=>({...b,videoTitle:vidMap[b.video_id]?.title||"",videoYtId:vidMap[b.video_id]?.video_id})));
        }
      }
    } catch(e) { console.error("initUser error:", e); }
  };

  const loadVideoData = useCallback(async rowId => {
    const [bmsRes, ntsRes] = await Promise.all([
      rest("GET", "bookmarks", { filter: `video_id=eq.${rowId}&order=time.asc` }),
      rest("GET", "notes", { filter: `video_id=eq.${rowId}&order=created_at.asc` }),
    ]);
    setBookmarks((bmsRes||[]).map(b => ({ id:b.id, time:b.time, label:b.label })).sort((a,b)=>a.time-b.time));
    setNotes((ntsRes||[]).map(n => ({ id:n.id, time:n.time, title:n.title, folder:n.folder })));
  }, []);

  const ping = msg => {setToast(msg);setTimeout(()=>setToast(null),2600);};

  /* ── FETCH REAL YOUTUBE TITLE ── */
  const fetchYTTitle = async (id) => {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if(!r.ok) return null;
      const d = await r.json();
      return d.title||null;
    } catch { return null; }
  };

  /* ── FETCH TRANSCRIPT (client-side via timedtext API) ── */
  const fetchTranscript = async (id) => {
    setTranscriptLoading(true);
    setTranscriptError(null);
    setTranscript([]);
    try {
      // Step 1: fetch the video page to extract the caption track URL
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
      const pageRes = await fetch(proxyUrl);
      const pageHtml = await pageRes.text();

      // Extract captionTracks from ytInitialPlayerResponse
      const match = pageHtml.match(/"captionTracks":\s*(\[.*?\])\s*,\s*"audioTracks"/s);
      if(!match) throw new Error("No captions found for this video");

      const tracks = JSON.parse(match[1]);
      if(!tracks||tracks.length===0) throw new Error("No captions found for this video");

      // Prefer English, fall back to first available
      const track = tracks.find(t=>t.languageCode==="en"||t.languageCode==="en-US")
                 || tracks.find(t=>t.kind!=="asr"&&t.languageCode?.startsWith("en"))
                 || tracks[0];

      if(!track?.baseUrl) throw new Error("No captions found for this video");

      // Step 2: fetch the actual caption XML
      const capRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(track.baseUrl)}`);
      const xml = await capRes.text();

      // Step 3: parse XML into [{time, text}]
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const texts = Array.from(doc.querySelectorAll("text"));
      if(texts.length===0) throw new Error("Transcript is empty");

      const result = texts.map(el => ({
        time: Math.round(parseFloat(el.getAttribute("start")||0)),
        text: el.textContent
              .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
              .replace(/&quot;/g,'"').replace(/&#39;/g,"'")
              .replace(/<[^>]+>/g,"").trim()
      })).filter(l=>l.text.length>0);

      setTranscript(result);
    } catch(e) {
      setTranscriptError(e.message);
      setTranscript([]);
    }
    setTranscriptLoading(false);
  };

  /* ── LOAD VIDEO ── */
  const loadVideo = async () => {
    const id = getVid(url);
    if(!id){ping("Please paste a valid YouTube URL");return;}
    setVideoId(id);setActiveLine(0);setBookmarks([]);setNotes([]);setVideoTags([]);
    fetchTranscript(id);
    videoRowId.current = null;
    if(!user) return;
    setDbLoading(true);
    try {
      // Fetch real title from YouTube oEmbed (no API key needed)
      const ytTitle = await fetchYTTitle(id);
      const rows = await rest("GET", "videos", { filter: `user_id=eq.${user.id}&video_id=eq.${id}&limit=1` });
      if(rows && rows[0]) {
        const existing = rows[0];
        videoRowId.current = existing.id;
        // Update title if we got a real one and it was previously a placeholder
        const title = ytTitle || existing.title || id;
        if(ytTitle && (!existing.title || existing.title.startsWith("Video "))) {
          await rest("PATCH","videos",{body:{title:ytTitle},filter:`id=eq.${existing.id}`,returning:"minimal"});
          setHistory(h=>h.map(v=>v.id===existing.id?{...v,title:ytTitle}:v));
        }
        setVideoTitle(title);
        setVideoTags(existing.tags||[]);
        await loadVideoData(existing.id);
      } else {
        const title = ytTitle || id;
        const newRows = await rest("POST", "videos", { body: [{ user_id:user.id, video_id:id, title, tags:[], progress:0 }] });
        if(newRows && newRows[0]) {
          videoRowId.current = newRows[0].id;
          setVideoTitle(title);
          setHistory(h=>[{...newRows[0],title},...h]);
        }
      }
    } catch(e) { ping("DB error: "+e.message); }
    setDbLoading(false);
  };

  /* ── TAGS ── */
  const addTag = async (val) => {
    const t = (val||tagInput).trim().toLowerCase().replace(/\s+/g,"-");
    if(!t||videoTags.includes(t)){setTagInput("");return;}
    const nt = [...videoTags,t];
    setVideoTags(nt);setTagInput("");
    if(videoRowId.current){
      await rest("PATCH","videos",{body:{tags:nt},filter:`id=eq.${videoRowId.current}`,returning:"minimal"});
      setHistory(h=>h.map(v=>v.id===videoRowId.current?{...v,tags:nt}:v));
    }
  };
  const removeTag = async t => {
    const nt = videoTags.filter(x=>x!==t);
    setVideoTags(nt);
    if(videoRowId.current){
      await rest("PATCH","videos",{body:{tags:nt},filter:`id=eq.${videoRowId.current}`,returning:"minimal"});
      setHistory(h=>h.map(v=>v.id===videoRowId.current?{...v,tags:nt}:v));
    }
  };

  /* ── BOOKMARKS ── */
  const addBookmark = async () => {
    if(!user){ping("Sign in to save bookmarks");return;}
    if(!videoRowId.current){
      // Try to reload video row if we have a videoId
      if(videoId && user) {
        ping("Re-linking video, try again in a moment…");
        setDbLoading(true);
        try {
          const rows = await rest("GET","videos",{filter:`user_id=eq.${user.id}&video_id=eq.${videoId}&limit=1`});
          if(rows&&rows[0]){ videoRowId.current=rows[0].id; ping("Ready — click Add here again"); }
          else { ping("Load the video first"); }
        } catch(e){ ping("Error: "+e.message); }
        setDbLoading(false);
      } else {
        ping("Load a video first");
      }
      return;
    }
    const ln = transcript[activeLine];
    if(bookmarks.find(b=>b.time===ln.time)){ping("Already bookmarked");return;}
    const label = ln.text.slice(0,36)+"…";
    try {
      const rows = await rest("POST","bookmarks",{body:[{video_id:videoRowId.current,time:ln.time,label}]});
      if(rows&&rows[0]){
        setBookmarks(p=>[...p,{id:rows[0].id,time:rows[0].time,label:rows[0].label}].sort((a,b)=>a.time-b.time));
        setHistory(h=>h.map(v=>v.id===videoRowId.current?{...v,bookmarks:(v.bookmarks||0)+1}:v));
        setAllAcctBookmarks(p=>[{...rows[0],videoTitle:videoTitle||videoId,videoYtId:videoId},...p]);
        ping("Bookmark saved ✓");
      }
    } catch(e){ping("Error: "+e.message);}
  };
  const removeBookmark = async id => {
    await rest("DELETE","bookmarks",{filter:`id=eq.${id}`,returning:"minimal"});
    setBookmarks(p=>p.filter(b=>b.id!==id));
  };

  /* ── NOTES ── */
  const addNote = () => {
    if(!user){ping("Sign in to save notes");return;}
    if(!videoRowId.current){ping("Load a video first");return;}
    const ln = transcript[activeLine];
    const folder = noteFolder==="All"?"Architecture":noteFolder;
    setActiveTab("notes");
    setNoteModal({time:ln.time, lineText:ln.text, folder, title:"", content:""});
  };
  const saveNote = async () => {
    if(!noteModal) return;
    const title = noteModal.title.trim() || noteModal.lineText.slice(0,60)+(noteModal.lineText.length>60?"…":"");
    try {
      const rows = await rest("POST","notes",{body:[{video_id:videoRowId.current,time:noteModal.time,title,content:noteModal.content,folder:noteModal.folder}]});
      if(rows&&rows[0]){
        setNotes(p=>[...p,{id:rows[0].id,time:rows[0].time,title:rows[0].title,content:rows[0].content,folder:rows[0].folder}]);
        setHistory(h=>h.map(v=>v.id===videoRowId.current?{...v,notes:(v.notes||0)+1}:v));
        setAllAcctNotes(p=>[{...rows[0],videoTitle:videoTitle||videoId,videoYtId:videoId},...p]);
        ping("Note saved ✓");
        setNoteModal(null);
      }
    } catch(e){ping("Error: "+e.message);}
  };
  const updateNote = async () => {
    if(!editNote) return;
    const title = editNote.title.trim() || editNote.lineText?.slice(0,60)||"Note";
    try {
      await rest("PATCH","notes",{body:{title,content:editNote.content,folder:editNote.folder},filter:`id=eq.${editNote.id}`,returning:"minimal"});
      setNotes(p=>p.map(n=>n.id===editNote.id?{...n,title,content:editNote.content,folder:editNote.folder}:n));
      setAllAcctNotes(p=>p.map(n=>n.id===editNote.id?{...n,title,content:editNote.content,folder:editNote.folder}:n));
      ping("Note updated ✓");
      setEditNote(null);
      setViewNote(null);
    } catch(e){ping("Error: "+e.message);}
  };
  const removeNote = async id => {
    await rest("DELETE","notes",{filter:`id=eq.${id}`,returning:"minimal"});
    setNotes(p=>p.filter(n=>n.id!==id));
    setAllAcctNotes(p=>p.filter(n=>n.id!==id));
    setViewNote(null);
    setEditNote(null);
  };
  const deleteVideo = async id => {
    await rest("DELETE","videos",{filter:`id=eq.${id}`,returning:"minimal"});
    setHistory(p=>p.filter(v=>v.id!==id));
  };
  const deleteBookmark = async id => {
    await rest("DELETE","bookmarks",{filter:`id=eq.${id}`,returning:"minimal"});
    setBookmarks(p=>p.filter(b=>b.id!==id));
    setAllAcctBookmarks(p=>p.filter(b=>b.id!==id));
  };
  const confirm = (msg, onConfirm) => setConfirmDialog({msg, onConfirm});

  /* ── transcript SELECTION → WIKIPEDIA ── */
  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if(!text||text.length<2||text.length>60){setSelBubble(null);return;}
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelBubble({text,x:rect.left+rect.width/2,y:rect.top+window.scrollY-44});
  };
  const searchDef = async word => {
    setSelBubble(null);window.getSelection()?.removeAllRanges();
    setDefModal({word,loading:true});
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(word.toLowerCase())}`);
      if(r.ok){
        const d = await r.json();
        if(d.type==="disambiguation") throw new Error("dis");
        setDefModal({word,loading:false,result:{extract:d.extract,title:d.title},wikiUrl:d.content_urls?.desktop?.page});
        return;
      }
    } catch {}
    try {
      const sr = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(word)}&format=json&origin=*&srlimit=1`);
      const sd = await sr.json();
      const hit = sd?.query?.search?.[0];
      if(hit){
        const r2 = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`);
        const d2 = await r2.json();
        setDefModal({word,loading:false,result:{extract:d2.extract,title:d2.title},wikiUrl:d2.content_urls?.desktop?.page});
      } else setDefModal({word,loading:false,error:"No definition found."});
    } catch {setDefModal({word,loading:false,error:"Could not fetch definition."});}
  };

  /* ── CHAT ── */
  const sendChat = async () => {
    const q = chatInput.trim();
    if(!q) return;
    setChatInput("");setChat(p=>[...p,{role:"user",text:q}]);setChatLoading(true);
    try {
      const tx = transcript.map(l=>`[${fmt(l.time)}] ${l.text}`).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          system:`Answer ONLY based on this video transcript:\n${tx}`,
          messages:[{role:"user",content:q}]}),
      });
      const data = await res.json();
      setChat(p=>[...p,{role:"bot",text:data.content?.map(c=>c.text||"").join("")||"Couldn't find that."}]);
    } catch {setChat(p=>[...p,{role:"bot",text:"Something went wrong."}]);}
    setChatLoading(false);
  };

  /* ── AUTH ── */
  const doAuth = async e => {
    e.preventDefault();setAuthError("");setAuthLoading(true);
    if(authMode==="signup"){
      const {data,error} = await sb.auth.signUp({email:form.email,password:form.password,options:{data:{name:form.name}}});
      if(error){setAuthError(error.message||"Sign up failed");setAuthLoading(false);return;}
      if(data?.user) await initUser(data.user);
      ping("Account created! Welcome.");
    } else {
      const {data,error} = await sb.auth.signInWithPassword({email:form.email,password:form.password});
      if(error){setAuthError(error.message||"Sign in failed");setAuthLoading(false);return;}
      if(data?.user) await initUser(data.user);
      else if(data?.id) await initUser(data);
      ping("Welcome back!");
    }
    setAuthLoading(false);setAuthMode(null);setForm({name:"",email:"",password:""});
  };
  const doSignOut = async () => {
    await sb.auth.signOut();
    setUser(null);setProfile(null);setHistory([]);setBookmarks([]);setNotes([]);
    setAcctOpen(false);ping("Signed out");
  };

  /* ── DERIVED ── */
  const filteredNotes = noteFolder==="All"?notes:notes.filter(n=>n.folder===noteFolder);
  const initials = profile?profile.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"?";

  // Deduplicate history by video_id, keep most recent
  const dedupedHistory = history.reduce((acc,h)=>{
    if(!acc.find(x=>x.video_id===h.video_id)) acc.push(h);
    return acc;
  },[]);
  const allTags = [...new Set(dedupedHistory.flatMap(h=>h.tags||[]))].sort();
  const filteredHistory = activeTagFilter?dedupedHistory.filter(h=>(h.tags||[]).includes(activeTagFilter)):dedupedHistory;
  const grouped = filteredHistory.reduce((acc,h)=>{
    const d=new Date(h.watched_at);
    const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const label=`${["January","February","March","April","May","June","July","August","September","October","November","December"][d.getMonth()]} ${d.getFullYear()}`;
    if(!acc[key])acc[key]={label,items:[]};
    acc[key].items.push(h);return acc;
  },{});
  const byTag = allTags.reduce((acc,tag)=>{acc[tag]=filteredHistory.filter(h=>(h.tags||[]).includes(tag));return acc;},{});

  // Jump to a history video — load it into the player
  const jumpToVideo = async (h) => {
    setAcctOpen(false);
    setUrl(`https://www.youtube.com/watch?v=${h.video_id}`);
    setVideoId(h.video_id);
    setVideoTitle(h.title||"");
    setVideoTags(h.tags||[]);
    setActiveLine(0);
    fetchTranscript(h.video_id);
    videoRowId.current = h.id;
    await loadVideoData(h.id);
    ping("Video loaded ✓");
  };

  const HistCard = ({h}) => (
    <div className="hcard" style={{cursor:"pointer",position:"relative"}} onClick={()=>jumpToVideo(h)}>
      <div className="hcard-thumb">
        {h.video_id?<img src={`https://img.youtube.com/vi/${h.video_id}/mqdefault.jpg`} alt="" onError={e=>{e.target.style.display="none";}}/>
          :<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
      </div>
      <div className="hcard-body">
        <div className="hcard-title">{h.title&&!h.title.startsWith("Video ")?h.title:h.video_id}</div>
        <div className="hcard-meta">{fmtDate(h.watched_at)}</div>
        <div className="hcard-tags">{(h.tags||[]).map(t=><span key={t} className="hcard-tag">{t}</span>)}</div>
        <div className="hcard-badges">
          <span className="badge">{Ico.bm} {h.bookmarks||0}</span>
          <span className="badge">{Ico.note} {h.notes||0}</span>
        </div>
        {(h.progress||0)>0&&<div className="pbar-wrap"><div className="pbar-track"><div className="pbar-fill" style={{width:`${h.progress||0}%`}}/></div><div className="pbar-label">{h.progress||0}%</div></div>}
      </div>
      <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"4px",flexShrink:0,alignSelf:"flex-start",transition:"color var(--t)"}}
        onClick={e=>{e.stopPropagation();confirm("Delete this video from history?",()=>deleteVideo(h.id));}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"}
        onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
        {Ico.trash}
      </button>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <>
      <style>{S}</style>
      <div className="app">

        {/* HEADER */}
        <header className="hdr">
          <div className="brand">Onion</div>
          <div className="hdr-r">
            <button className="btn btn-icon" onClick={()=>setDark(d=>!d)}>{dark?Ico.sun:Ico.moon}</button>
            {user?(
              <button onClick={()=>setAcctOpen(true)}
                style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px 6px 6px",borderRadius:40,border:"1.5px solid var(--border-s)",background:"var(--surface)",cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",transition:"all var(--t)"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--accent)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border-s)";}}>
                <span style={{width:28,height:28,borderRadius:"50%",background:"var(--accent-bg)",border:"1.5px solid var(--accent-dim)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--accent)",flexShrink:0}}>{initials}</span>
                <span style={{fontSize:13,fontWeight:500,color:"var(--ink-2)"}}>{profile?.name}</span>
              </button>
            ):(
              <button className="btn btn-accent btn-sm" onClick={()=>setAuthMode("login")} style={{gap:5}}>{Ico.user} Sign in</button>
            )}
          </div>
        </header>

        {/* URL BAR */}
        <div className="url-row">
          <div className="url-box">
            <span style={{color:"var(--ink-3)",flexShrink:0}}>{Ico.link}</span>
            <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadVideo()} onClick={()=>{if(videoId)setUrl("");}} placeholder="Paste a YouTube URL to begin…"/>
          </div>
          <button className="btn btn-fill" onClick={loadVideo} style={{padding:"0 20px"}}>Load</button>
        </div>

        {dbLoading&&<div className="loading-bar"/>}

        {/* TWO-COLUMN BODY */}
        <div className="app-body">

          {/* LEFT COLUMN: video + tags + timeline */}
          <div className="col-left">
        <div className="vid-wrap">
          {videoId
            ?<iframe src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`} allowFullScreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" title="YouTube video"/>
            :<div className="vid-empty"><div className="vid-circle">{Ico.play}</div><p>Paste a YouTube link above to start learning</p></div>
          }
        </div>

        {/* TAGS */}
        <div className="vid-meta">
          <span className="vid-meta-label">{Ico.tag} Tags</span>
          <div className="tags-row">
            {videoTags.map(t=>(
              <span key={t} className="tag-pill">{t}<button className="tag-pill-x" onClick={()=>removeTag(t)}>×</button></span>
            ))}
            <div className="tag-input-wrap" style={{position:"relative"}}>
              <input className="tag-input" value={tagInput}
                onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"){addTag();}
                  if(e.key==="Escape"){setTagInput("");}
                }}
                onFocus={()=>setTagInput(tagInput)}
                placeholder="+ add tag…"/>
              <button className="tag-add-btn" onClick={addTag}>Add</button>
              {tagInput.trim().length>0&&(()=>{
                const suggestions = allTags.filter(t=>
                  t.includes(tagInput.trim().toLowerCase()) && !videoTags.includes(t)
                );
                return suggestions.length>0?(
                  <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,minWidth:160,background:"var(--surface)",border:"1.5px solid var(--border-s)",borderRadius:"var(--r)",boxShadow:"0 6px 20px rgba(0,0,0,.1)",zIndex:200,overflow:"hidden"}}>
                    {suggestions.map(t=>(
                      <div key={t}
                        onClick={()=>{addTag(t);setTagInput("");}}
                        style={{padding:"8px 12px",fontSize:13,color:"var(--ink-2)",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"background var(--t)"}}
                        onMouseEnter={e=>e.currentTarget.style.background="var(--surface-2)"}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <span style={{color:"var(--accent)",fontSize:11}}>#</span>{t}
                      </div>
                    ))}
                  </div>
                ):null;
              })()}
            </div>
          </div>
        </div>

        {/* TIMELINE */}
        <div className="timeline-wrap">
          <div className="tl-top">
            <span className="tl-label">Timeline &amp; Bookmarks</span>
            <div className="tl-actions">
              <span style={{fontSize:12,color:"var(--ink-3)"}}>{bookmarks.length} saved</span>
              <button className="btn btn-sm" onClick={addBookmark} style={{gap:5}}>{Ico.bm} Add here</button>
            </div>
          </div>
          <div className="tl-track"
            onMouseMove={e=>{
              const r=e.currentTarget.getBoundingClientRect();
              setTlHover((e.clientX-r.left)/r.width);
            }}
            onMouseLeave={()=>setTlHover(null)}>
            <div className="tl-track-rail">
              <div className="tl-progress" style={{width:`${scrubPos*100}%`}}/>
            </div>
            {bookmarks.map(b=>(
              <div key={b.id} className="tl-dot" style={{left:`${(b.time/DUR)*100}%`,pointerEvents:"none"}}/>
            ))}
            <div className="tl-scrubber" style={{left:`${scrubPos*100}%`,pointerEvents:"none"}}/>
            {tlHover!==null&&(
              <>
                <div className="tl-ghost" style={{left:`${tlHover*100}%`}}/>
                <div className="tl-hover-tip" style={{left:`${tlHover*100}%`,pointerEvents:"none"}}>
                  {fmt(Math.round(tlHover*DUR))}
                </div>
              </>
            )}
            {/* full-width invisible overlay — always on top, captures every click */}
            <div style={{position:"absolute",inset:0,zIndex:20,cursor:"pointer"}} onClick={e=>{
              const r=e.currentTarget.getBoundingClientRect();
              const ratio=(e.clientX-r.left)/r.width;
              const t=Math.round(ratio*DUR);
              setScrubPos(ratio);
              const cl=transcript.reduce((a,b)=>Math.abs(b.time-t)<Math.abs(a.time-t)?b:a);
              setActiveLine(transcript.indexOf(cl));
            }}/>
          </div>
          <div className="tl-chips">
            {bookmarks.length===0&&<span className="tl-empty">No bookmarks yet — click "Add here" to mark a moment</span>}
            {bookmarks.map(b=>(
              <div key={b.id} className="tl-chip">
                <span className="tl-chip-ts">{fmt(b.time)}</span>
                <span onClick={()=>{const i=transcript.findIndex(l=>l.time>=b.time);if(i>=0){setActiveLine(i);setScrubPos(b.time/DUR);}}}>{b.label.length>22?b.label.slice(0,22)+"…":b.label}</span>
                <button className="tl-chip-x" onClick={()=>removeBookmark(b.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

          </div>{/* END col-left */}

          {/* RIGHT COLUMN: transcript + chat + notes */}
          <div className="col-right">

        {/* TAB PANEL */}
        <div className="tab-panel">
          <div className="tabs">
            {[{id:"transcript",label:"Transcript",icon:Ico.txt},{id:"chat",label:"Ask video",icon:Ico.chat},{id:"notes",label:"My Notes",icon:Ico.note}].map(t=>(
              <button key={t.id} className={`tab${activeTab===t.id?" on":""}`} onClick={()=>setActiveTab(t.id)}>
                <span className="tab-ico">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* transcript */}
          {activeTab==="transcript"&&(
            <>
              <div className="t-controls">
                <span className="t-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>
                  Select any word or phrase to look it up
                </span>
                <select className="lang-sel" value={lang} onChange={e=>setLang(e.target.value)}>
                  {["Original","Chinese","Spanish","French","Japanese","Arabic","German","Portuguese"].map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              {transcriptLoading&&<div style={{padding:"20px 16px",display:"flex",alignItems:"center",gap:10,color:"var(--ink-3)",fontSize:13}}><div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>Loading transcript…</div>}
              {transcriptError&&<div style={{padding:"16px",margin:"12px 16px",background:"var(--accent-bg)",borderRadius:"var(--r)",fontSize:12.5,color:"var(--accent)",border:"1px solid var(--accent-dim)"}}>{transcriptError} — this video may not have captions.</div>}
              {!transcriptLoading&&!transcriptError&&transcript.length===0&&<div style={{padding:"24px 16px",textAlign:"center",color:"var(--ink-3)",fontSize:13,fontStyle:"italic"}}>No transcript available. Load a video to begin.</div>}
              <div className="tscroll" ref={transcriptRef} onMouseUp={handleMouseUp}>
                {transcript.map((line,i)=>(
                  <div key={i} className={`tline${activeLine===i?" on":""}`} onClick={()=>{setActiveLine(i);setScrubPos(transcript[i].time/DUR);}}>
                    <span className="tts">{fmt(line.time)}</span>
                    <span className="ttxt">{line.text.split(" ").map((w,j)=><span key={j} className="tw">{w}{" "}</span>)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* CHAT */}
          {activeTab==="chat"&&(
            <>
              <div className="chatfeed">
                {chat.map((m,i)=>(
                  <div key={i} className={`cmsg${m.role==="user"?" um":""}`}>
                    <div className={`clabel${m.role==="user"?" r":""}`}>{m.role==="user"?"You":"Assistant"}</div>
                    <div className={`cbub cbub-${m.role==="user"?"u":"b"}`}>{m.text}</div>
                    <div className="clr"/>
                  </div>
                ))}
                {chatLoading&&<div className="cmsg"><div className="clabel">Assistant</div><div className="cbub cbub-b"><div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div></div></div>}
                <div ref={chatEndRef}/>
              </div>
              <div className="chatfoot">
                <textarea className="chatta" rows={2} value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
                  placeholder="Ask a question about this video… (Enter to send)"
                />
                <button className="btn btn-fill btn-icon" onClick={sendChat} disabled={chatLoading} style={{alignSelf:"flex-end",flexShrink:0}}>{Ico.send}</button>
              </div>
            </>
          )}

          {/* NOTES */}
          {activeTab==="notes"&&(
            <>
              {noteModal ? (
                <>
                  <div className="notes-top">
                    <div style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden"}}>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:"var(--accent)",fontWeight:500,flexShrink:0}}>{fmt(noteModal.time)}</span>
                      <span style={{fontSize:12,color:"var(--ink-3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{noteModal.lineText.slice(0,60)}{noteModal.lineText.length>60?"…":""}"</span>
                    </div>
                    <button className="def-modal-x" onClick={()=>setNoteModal(null)}>×</button>
                  </div>
                  <div className="notes-body" style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <div className="note-field-label">TITLE <span style={{fontWeight:400,color:"var(--ink-3)"}}>(optional)</span></div>
                      <input className="note-title-input" value={noteModal.title} onChange={e=>setNoteModal(m=>({...m,title:e.target.value}))} placeholder="Give this note a title…"/>
                    </div>
                    <div style={{flex:1,display:"flex",flexDirection:"column"}}>
                      <div className="note-field-label">YOUR NOTE</div>
                      <textarea className="note-content-input" style={{flex:1,minHeight:90,resize:"none"}} value={noteModal.content} onChange={e=>setNoteModal(m=>({...m,content:e.target.value}))} placeholder="Write your thoughts, observations, questions…" autoFocus/>
                    </div>
                    <div>
                      <div className="note-field-label">FOLDER</div>
                      <div className="note-folder-row">
                        {["Architecture","Philosophy","Favorites"].map(f=>(
                          <button key={f} className={`note-folder-btn${noteModal.folder===f?" on":""}`} onClick={()=>setNoteModal(m=>({...m,folder:f}))}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                      <button className="btn btn-sm" onClick={()=>setNoteModal(null)}>Cancel</button>
                      <button className="btn btn-accent btn-sm" onClick={saveNote}>Save note</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="notes-top">
                    <span style={{fontSize:12,color:"var(--ink-3)"}}>{filteredNotes.length} note{filteredNotes.length!==1?"s":""}</span>
                    <button className="btn btn-sm" onClick={addNote} style={{gap:5}}>{Ico.plus} Add note</button>
                  </div>
                  <div className="nfolders">
                    {FOLDERS.map(f=><button key={f} className={`nftab${noteFolder===f?" on":""}`} onClick={()=>setNoteFolder(f)}>{f}</button>)}
                  </div>
                  <div className="notes-body">
                    {filteredNotes.length===0&&<div style={{padding:"24px 0",textAlign:"center"}}><p style={{fontSize:14,color:"var(--ink-3)",fontStyle:"italic",fontFamily:"'IBM Plex Sans',sans-serif"}}>No notes in this folder yet</p></div>}
                    {filteredNotes.map(n=>(
                      <div key={n.id} className="ncard" style={{flexDirection:"column",gap:0,cursor:"default"}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}} onClick={()=>{setViewNote(viewNote===n.id?null:n.id);if(ytPlayer.current?.seekTo)ytPlayer.current.seekTo(n.time,true);}}>
                          <div className="ncard-ico" style={{marginTop:3}}>{Ico.note}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="ncard-title">{n.title}</div>
                            <div className="ncard-meta" style={{marginTop:3}}><span className="ncard-ts">{fmt(n.time)}</span>{n.folder}</div>
                          </div>
                          <div style={{display:"flex",gap:2,flexShrink:0}}>
                            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"3px 5px",borderRadius:4,transition:"color var(--t)"}}
                              onClick={e=>{e.stopPropagation();const ln=transcript.find(l=>l.time===n.time)||{text:""};setEditNote({...n,lineText:ln.text});setViewNote(null);}}
                              onMouseEnter={e=>e.currentTarget.style.color="var(--lav)"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
                              {Ico.edit}
                            </button>
                            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"3px 5px",borderRadius:4,transition:"color var(--t)"}}
                              onClick={e=>{e.stopPropagation();confirm("Delete this note?",()=>removeNote(n.id));}}
                              onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
                              {Ico.trash}
                            </button>
                          </div>
                        </div>
                        {viewNote===n.id&&(
                          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",paddingLeft:23}}>
                            {n.content?<p style={{fontSize:13,color:"var(--ink-2)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{n.content}</p>
                              :<p style={{fontSize:12.5,color:"var(--ink-3)",fontStyle:"italic"}}>No note content.</p>}
                          </div>
                        )}
                        {editNote?.id===n.id&&(
                          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:8}}>
                            <input className="note-title-input" value={editNote.title} onChange={e=>setEditNote(m=>({...m,title:e.target.value}))} placeholder="Title…"/>
                            <textarea className="note-content-input" style={{minHeight:72,resize:"none"}} value={editNote.content} onChange={e=>setEditNote(m=>({...m,content:e.target.value}))} placeholder="Your note…" autoFocus/>
                            <div className="note-folder-row">
                              {folders.filter(f=>f!=="All").map(f=>(
                                <button key={f} className={`note-folder-btn${editNote.folder===f?" on":""}`} onClick={()=>setEditNote(m=>({...m,folder:f}))}>{f}</button>
                              ))}
                            </div>
                            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                              <button className="btn btn-sm" onClick={()=>setEditNote(null)}>Cancel</button>
                              <button className="btn btn-accent btn-sm" onClick={updateNote}>Save</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button className="nadd" onClick={addNote}>{Ico.plus} Add note from current transcript position</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

          </div>{/* END col-right */}
        </div>{/* END app-body */}

      {/* ACCOUNT SLIDE-IN PANEL */}
      {acctOpen&&(
        <>
          <div className="acct-overlay" onClick={()=>setAcctOpen(false)}/>
          <div className="acct-panel">
            <div className="acct-panel-head">
              <span className="acct-panel-title">Account</span>
              <button className="acct-panel-close" onClick={()=>setAcctOpen(false)}>×</button>
            </div>
            <div className="acct-scroll">
              {!user?(
                <div className="profile-empty">
                  <p>Sign in to track your learning history</p>
                  <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                    <button className="btn" onClick={()=>{setAcctOpen(false);setAuthMode("login");}}>Sign in</button>
                    <button className="btn btn-accent" onClick={()=>{setAcctOpen(false);setAuthMode("signup");}}>Create account</button>
                  </div>
                </div>
              ):(
                <>
                  {/* Profile head */}
                  <div className="acct-head">
                    <div className="avatar">{initials}</div>
                    <div style={{flex:1}}>
                      <div className="acct-name">{profile?.name}</div>
                      <div className="acct-email">{profile?.email}</div>
                    </div>
                    <button className="btn btn-sm" onClick={doSignOut}>Sign out</button>
                  </div>

                  {/* Stats */}
                  <div className="acct-stats">
                    <div className="stat" style={{cursor:"pointer",borderBottom:acctTab==="videos"?"2.5px solid var(--accent)":"2.5px solid transparent"}} onClick={()=>setAcctTab("videos")}>
                      <div className="stat-n">{dedupedHistory.length}</div><div className="stat-l">Videos</div>
                    </div>
                    <div className="stat" style={{cursor:"pointer",borderBottom:acctTab==="notes"?"2.5px solid var(--accent)":"2.5px solid transparent"}} onClick={()=>setAcctTab("notes")}>
                      <div className="stat-n">{allAcctNotes.length}</div><div className="stat-l">Notes</div>
                    </div>
                    <div className="stat" style={{cursor:"pointer",borderBottom:acctTab==="bookmarks"?"2.5px solid var(--accent)":"2.5px solid transparent"}} onClick={()=>setAcctTab("bookmarks")}>
                      <div className="stat-n">{allAcctBookmarks.length}</div><div className="stat-l">Bookmarks</div>
                    </div>
                  </div>

                  {/* Tabs — switched via stat numbers above */}

                  {/* SHARED TAG FILTER — applies to all tabs */}
                  {allTags.length>0&&(
                    <div className="tag-filter-bar">
                      <button className={`tag-fchip${!activeTagFilter?" on":""}`} onClick={()=>setActiveTagFilter(null)}>All</button>
                      {allTags.map(t=><button key={t} className={`tag-fchip${activeTagFilter===t?" on":""}`} onClick={()=>setActiveTagFilter(activeTagFilter===t?null:t)}>{t}</button>)}
                    </div>
                  )}

                  {/* VIDEOS TAB */}
                  {acctTab==="videos"&&(
                    <>
                      <div className="hist-toolbar">
                        <div className="seg">
                          <button className={`seg-btn${histView==="time"?" on":""}`} onClick={()=>setHistView("time")}>{Ico.cal} By time</button>
                          <button className={`seg-btn${histView==="tag"?" on":""}`} onClick={()=>setHistView("tag")}>{Ico.tag} By tag</button>
                        </div>
                      </div>
                      {histView==="time"&&(
                        <div className="hist-list">
                          {filteredHistory.length===0&&<p style={{fontSize:13,color:"var(--ink-3)",fontStyle:"italic",padding:"12px 16px"}}>No videos match this tag.</p>}
                          {Object.values(grouped).map(g=>(
                            <div key={g.label}><div className="hist-group-label">{g.label}</div>{g.items.map(h=><HistCard key={h.id} h={h}/>)}</div>
                          ))}
                        </div>
                      )}
                      {histView==="tag"&&(
                        <div className="hist-list">
                          {allTags.length===0&&<p style={{fontSize:13,color:"var(--ink-3)",fontStyle:"italic",padding:"12px 16px"}}>No tags yet.</p>}
                          {allTags.map(tag=>(
                            <div key={tag}>
                              <div className="hist-group-label" style={{display:"flex",alignItems:"center",gap:6}}>
                                <span style={{color:"var(--accent)"}}>#</span>{tag}
                                <span style={{fontSize:10,fontWeight:400,color:"var(--ink-3)",textTransform:"none",letterSpacing:0}}>— {byTag[tag]?.length||0} video{byTag[tag]?.length!==1?"s":""}</span>
                              </div>
                              {(byTag[tag]||[]).map(h=><HistCard key={h.id} h={h}/>)}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* NOTES TAB */}
                  {acctTab==="notes"&&(()=>{
                    const tagVidIds = activeTagFilter ? dedupedHistory.filter(h=>(h.tags||[]).includes(activeTagFilter)).map(h=>h.id) : null;
                    const visibleNotes = tagVidIds ? allAcctNotes.filter(n=>tagVidIds.includes(n.video_id)) : allAcctNotes;
                    return (
                      <div style={{paddingBottom:16}}>
                        {visibleNotes.length===0&&<p style={{fontSize:13,color:"var(--ink-3)",fontStyle:"italic",padding:"20px 16px"}}>{activeTagFilter?`No notes tagged #${activeTagFilter}.`:"No notes saved yet."}</p>}
                        {visibleNotes.map(n=>(
                          <div key={n.id} className="acct-item" style={{alignItems:"center"}} onClick={()=>{const vid=dedupedHistory.find(h=>h.id===n.video_id);if(vid)jumpToVideo(vid);}}>
                            <div className="acct-item-thumb">
                              {n.videoYtId?<img src={`https://img.youtube.com/vi/${n.videoYtId}/mqdefault.jpg`} alt=""/>
                                :<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                            </div>
                            <div className="acct-item-body">
                              <div className="acct-item-title">{n.title}</div>
                              {n.content&&<div className="acct-item-content">{n.content}</div>}
                              <div className="acct-item-meta">
                                <span className="acct-item-ts">{fmt(n.time)}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{n.videoTitle||n.videoYtId}</span>
                                <span style={{marginLeft:"auto",flexShrink:0,background:"var(--lav-bg)",border:"1px solid var(--lav-dim)",borderRadius:10,padding:"1px 7px",fontSize:10}}>{n.folder}</span>
                              </div>
                            </div>
                            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"4px",flexShrink:0,transition:"color var(--t)"}}
                              onClick={e=>{e.stopPropagation();confirm("Delete this note?",()=>removeNote(n.id));}}
                              onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
                              {Ico.trash}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* BOOKMARKS TAB */}
                  {acctTab==="bookmarks"&&(()=>{
                    const tagVidIds = activeTagFilter ? dedupedHistory.filter(h=>(h.tags||[]).includes(activeTagFilter)).map(h=>h.id) : null;
                    const visibleBookmarks = tagVidIds ? allAcctBookmarks.filter(b=>tagVidIds.includes(b.video_id)) : allAcctBookmarks;
                    return (
                      <div style={{paddingBottom:16}}>
                        {visibleBookmarks.length===0&&<p style={{fontSize:13,color:"var(--ink-3)",fontStyle:"italic",padding:"20px 16px"}}>{activeTagFilter?`No bookmarks tagged #${activeTagFilter}.`:"No bookmarks saved yet."}</p>}
                        {visibleBookmarks.map(b=>(
                          <div key={b.id} className="acct-item" style={{alignItems:"center"}} onClick={()=>{const vid=dedupedHistory.find(h=>h.id===b.video_id);if(vid)jumpToVideo(vid);}}>
                            <div className="acct-item-thumb">
                              {b.videoYtId?<img src={`https://img.youtube.com/vi/${b.videoYtId}/mqdefault.jpg`} alt=""/>
                                :<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>}
                            </div>
                            <div className="acct-item-body">
                              <div className="acct-item-title">{b.label}</div>
                              <div className="acct-item-meta">
                                <span className="acct-item-ts">{fmt(b.time)}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.videoTitle||b.videoYtId}</span>
                              </div>
                            </div>
                            <button style={{background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:"4px",flexShrink:0,transition:"color var(--t)"}}
                              onClick={e=>{e.stopPropagation();confirm("Delete this bookmark?",()=>deleteBookmark(b.id));}}
                              onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"}
                              onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
                              {Ico.trash}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* SELECTION BUBBLE */}
      {selBubble&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:299}} onMouseDown={()=>setSelBubble(null)}/>
          <div className="sel-bubble" style={{top:selBubble.y,left:selBubble.x,transform:"translateX(-50%)"}}
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();searchDef(selBubble.text);}}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Search "{selBubble.text.length>22?selBubble.text.slice(0,22)+"…":selBubble.text}"
          </div>
        </>
      )}

      {/* DEFINITION MODAL */}
      {defModal&&(
        <>
          <div style={{position:"fixed",inset:0,zIndex:249,background:"rgba(0,0,0,.18)",backdropFilter:"blur(1px)"}} onClick={()=>setDefModal(null)}/>
          <div className="def-modal" style={{top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}>
            <div className="def-modal-head">
              <div className="def-modal-word">{defModal.word}</div>
              <button className="def-modal-x" onClick={()=>setDefModal(null)}>×</button>
            </div>
            <div className="def-modal-body">
              {defModal.loading&&<div className="def-modal-loading"><div className="dots"><div className="dot"/><div className="dot"/><div className="dot"/></div>Looking up definition…</div>}
              {!defModal.loading&&defModal.error&&<div className="def-modal-no">{defModal.error}</div>}
              {!defModal.loading&&defModal.result&&(
                <>
                  {defModal.result.title?.toLowerCase()!==defModal.word?.toLowerCase()&&<div style={{fontSize:11,color:"var(--ink-3)",marginBottom:8}}>Showing result for <strong style={{color:"var(--ink-2)"}}>{defModal.result.title}</strong></div>}
                  <div className="def-modal-text">{defModal.result.extract}</div>
                  <div className="def-modal-src">
                    <span className="def-modal-src-label">Source: Wikipedia</span>
                    {defModal.wikiUrl&&<a href={defModal.wikiUrl} target="_blank" rel="noopener noreferrer">Read full article →</a>}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}



      {/* CONFIRM DIALOG */}
      {confirmDialog&&(
        <div className="confirm-overlay" onClick={()=>setConfirmDialog(null)}>
          <div className="confirm-box" onClick={e=>e.stopPropagation()}>
            <div className="confirm-msg">{confirmDialog.msg}</div>
            <div className="confirm-btns">
              <button className="btn btn-sm" onClick={()=>setConfirmDialog(null)}>Cancel</button>
              <button className="btn btn-accent btn-sm" onClick={()=>{confirmDialog.onConfirm();setConfirmDialog(null);}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {authMode&&(
        <div className="overlay" onClick={()=>setAuthMode(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="m-title">{authMode==="login"?"Welcome back":"Begin your journal"}</div>
            <div className="m-sub">{authMode==="login"?"Sign in to access your notes and history.":"Create an account to track your learning journey."}</div>
            {authError&&<div className="m-err">{authError}</div>}
            <form onSubmit={doAuth}>
              {authMode==="signup"&&(<><label className="fl">Name</label><input className="fi" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your name"/></>)}
              <label className="fl">Email</label>
              <input className="fi" type="email" required value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@example.com"/>
              <label className="fl">Password</label>
              <div style={{position:"relative",marginBottom:0}}>
                <input className="fi" type={form.showPw?"text":"password"} required value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" style={{marginBottom:0,paddingRight:38,width:"100%"}}/>
                <button type="button" onClick={()=>setForm(f=>({...f,showPw:!f.showPw}))}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--ink-3)",padding:2,lineHeight:1,transition:"color var(--t)"}}
                  onMouseEnter={e=>e.currentTarget.style.color="var(--ink)"}
                  onMouseLeave={e=>e.currentTarget.style.color="var(--ink-3)"}>
                  {form.showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              <button type="submit" className="btn btn-fill" disabled={authLoading} style={{width:"100%",justifyContent:"center",padding:11,marginTop:18,fontSize:14}}>
                {authLoading?"…":authMode==="login"?"Sign in":"Create account"}
              </button>
              <button type="button" className="m-link" onClick={()=>{setAuthMode(authMode==="login"?"signup":"login");setAuthError("");}}>
                {authMode==="login"?"No account? Sign up free":"Already have an account? Sign in"}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast&&<div className="toast">{toast}</div>}
      </div>{/* END .app */}
    </>
  );
}

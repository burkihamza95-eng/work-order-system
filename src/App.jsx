import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// Replace these two values with your own from Supabase dashboard
const SUPABASE_URL = "zfinjesxvxevlybipuaa";
const SUPABASE_KEY = "sb_publishable_y_j6e1jD9nyc5pV-rTBOkg_WkHm29Kj";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// DB helpers
const db = {
  // Work Orders
  getWorkOrders: () => sb("work_orders?order=created_at.desc"),
  createWorkOrder: (data) => sb("work_orders", { method:"POST", body:JSON.stringify(data) }),
  updateWorkOrder: (id, data) => sb(`work_orders?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(data) }),
  deleteWorkOrder: (id) => sb(`work_orders?id=eq.${id}`, { method:"DELETE", prefer:"" }),

  // Users
  getUsers: () => sb("app_users?order=created_at.asc"),
  createUser: (data) => sb("app_users", { method:"POST", body:JSON.stringify(data) }),
  updateUser: (id, data) => sb(`app_users?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(data) }),
  deleteUser: (id) => sb(`app_users?id=eq.${id}`, { method:"DELETE", prefer:"" }),
};

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
    html,body { height:100%; background:#f5f5f5; font-family:'Inter',sans-serif; color:#212529; }
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:#f0f0f0; }
    ::-webkit-scrollbar-thumb { background:#c8c8c8; border-radius:3px; }
    input,select,textarea,button { font-family:'Inter',sans-serif; }
    @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes pop     { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
    @keyframes spin    { to{transform:rotate(360deg)} }
  `}</style>
);

// ─── THEME ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#f5f5f5", surface:"#ffffff", border:"#e0e0e0",
  text:"#212529", textMid:"#6c757d", textLight:"#adb5bd",
  primary:"#714b67", primaryHov:"#5c3d55", primaryLight:"#f3eef1",
  success:"#28a745", successBg:"#d4edda",
  warning:"#e07b39", warningBg:"#fdebd0",
  danger:"#dc3545",  dangerBg:"#f8d7da",
  info:"#17a2b8",    infoBg:"#d1ecf1",
  amber:"#ffc107",   amberBg:"#fff3cd",
};

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Pending Review":         { color:"#6c757d", bg:"#f0f0f0", dot:"#adb5bd" },
  "Sent Back to Requester": { color:"#856404", bg:"#fff3cd", dot:"#ffc107" },
  "Request Review Done":    { color:"#0c5460", bg:"#d1ecf1", dot:"#17a2b8" },
  "Material Required":      { color:"#7d3c00", bg:"#fdebd0", dot:"#e07b39" },
  "Material PR Shared":     { color:"#004085", bg:"#cce5ff", dot:"#007bff" },
  "Funds Required":         { color:"#721c24", bg:"#f8d7da", dot:"#dc3545" },
  "Under Production":       { color:"#155a8a", bg:"#d6eaf8", dot:"#2e86c1" },
  "Outsource Services":     { color:"#5c2d91", bg:"#e8d5f5", dot:"#8a4ac1" },
  "Complete":               { color:"#155724", bg:"#d4edda", dot:"#28a745" },
};

const STATUS_SEQUENCE = [
  "Pending Review","Request Review Done","Material Required",
  "Material PR Shared","Funds Required","Under Production","Complete",
];

const getNextAllowed = (cur) => {
  const idx = STATUS_SEQUENCE.indexOf(cur);
  if (idx < 0 || idx >= STATUS_SEQUENCE.length - 1) return [];
  const next = STATUS_SEQUENCE[idx + 1];
  if (next === "Under Production") return ["Under Production","Outsource Services"];
  return [next];
};

const canRollback = (history) => {
  if (!history || history.length < 2) return false;
  const last = history[history.length - 1];
  return last.status !== "Complete" && last.status !== "Pending Review";
};

// ─── DEFAULT USERS (seeded into DB on first run) ──────────────────────────────
const SEED_USERS = [
  { username:"admin",    name:"Admin",       role:"Admin",                avatar:"AD", color:"#714b67", is_admin:true,  is_sohail:false, is_ahsan:false, password:"Admin@123"    },
  { username:"sohail",   name:"Sohail",      role:"Head of Manufacturing",avatar:"SO", color:"#0066cc", is_admin:false, is_sohail:true,  is_ahsan:false, password:"Sohail@123"   },
  { username:"abdullah", name:"Abdullah",    role:"Operations",           avatar:"AB", color:"#017e84", is_admin:false, is_sohail:false, is_ahsan:false, password:"Abdullah@123" },
  { username:"hassan",   name:"Hassan",      role:"Operations",           avatar:"HS", color:"#28a745", is_admin:false, is_sohail:false, is_ahsan:false, password:"Hassan@123"   },
  { username:"ahsan",    name:"Ahsan",       role:"Procurement Officer",  avatar:"AH", color:"#e07b39", is_admin:false, is_sohail:false, is_ahsan:true,  password:"Ahsan@123"    },
  { username:"fahadzeb", name:"Fahad Zeb",   role:"Operations",           avatar:"FZ", color:"#8a4ac1", is_admin:false, is_sohail:false, is_ahsan:false, password:"Fahad@123"    },
  { username:"usman",    name:"Usman",       role:"Operations",           avatar:"US", color:"#c0392b", is_admin:false, is_sohail:false, is_ahsan:false, password:"Usman@123"    },
  { username:"bilal",    name:"Bilal",       role:"Operations",           avatar:"BL", color:"#16a085", is_admin:false, is_sohail:false, is_ahsan:false, password:"Bilal@123"    },
  { username:"kamran",   name:"Kamran",      role:"Operations",           avatar:"KM", color:"#8e44ad", is_admin:false, is_sohail:false, is_ahsan:false, password:"Kamran@123"   },
  { username:"tariq",    name:"Tariq",       role:"Operations",           avatar:"TQ", color:"#2980b9", is_admin:false, is_sohail:false, is_ahsan:false, password:"Tariq@123"    },
  { username:"zainab",   name:"Zainab",      role:"Operations",           avatar:"ZN", color:"#d35400", is_admin:false, is_sohail:false, is_ahsan:false, password:"Zainab@123"   },
  { username:"omar",     name:"Omar",        role:"Operations",           avatar:"OM", color:"#27ae60", is_admin:false, is_sohail:false, is_ahsan:false, password:"Omar@123"     },
  { username:"sara",     name:"Sara",        role:"Operations",           avatar:"SR", color:"#e74c3c", is_admin:false, is_sohail:false, is_ahsan:false, password:"Sara@123"     },
  { username:"nawaz",    name:"Nawaz",       role:"Operations",           avatar:"NW", color:"#1abc9c", is_admin:false, is_sohail:false, is_ahsan:false, password:"Nawaz@123"    },
  { username:"danish",   name:"Danish",      role:"Operations",           avatar:"DN", color:"#f39c12", is_admin:false, is_sohail:false, is_ahsan:false, password:"Danish@123"   },
  { username:"irfan",    name:"Irfan",       role:"Operations",           avatar:"IR", color:"#7f8c8d", is_admin:false, is_sohail:false, is_ahsan:false, password:"Irfan@123"    },
];

// Privileged users who can see all work orders
const PRIVILEGED_USERNAMES = ["admin","sohail","abdullah","hassan","ahsan","fahadzeb"];

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const genId    = () => "WO-" + String(Math.floor(Math.random()*90000)+10000);
const fmtDt    = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTs    = () => new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

// ─── PRIMITIVE UI ─────────────────────────────────────────────────────────────

const Badge = ({ label }) => {
  const s = STATUS_CONFIG[label] || { bg:"#f0f0f0", color:"#6c757d", dot:"#adb5bd" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:s.bg, color:s.color,
      borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {label}
    </span>
  );
};

const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled=false, style={} }) => {
  const V = {
    primary:  { bg:C.primary,    hov:C.primaryHov,  text:"#fff",   border:C.primary  },
    secondary:{ bg:"#fff",       hov:"#f8f9fa",     text:C.text,   border:C.border   },
    danger:   { bg:"#fff",       hov:C.dangerBg,    text:C.danger, border:C.danger   },
    success:  { bg:C.success,    hov:"#218838",     text:"#fff",   border:C.success  },
    warning:  { bg:C.warning,    hov:"#cc6a2f",     text:"#fff",   border:C.warning  },
    ghost:    { bg:"transparent",hov:"#f5f5f5",     text:C.textMid,border:"transparent" },
  }[variant]||{};
  const [h,setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:6,
        background:h&&!disabled?V.hov:V.bg, color:V.text, border:`1px solid ${V.border}`,
        borderRadius:6, padding:size==="sm"?"4px 11px":size==="lg"?"11px 22px":"7px 16px",
        fontSize:size==="sm"?12:13, fontWeight:500,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .15s", whiteSpace:"nowrap", ...style }}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}>
      {icon&&<span style={{fontSize:13}}>{icon}</span>}
      {children}
    </button>
  );
};

const iS = (extra={}) => ({
  width:"100%", border:`1px solid ${C.border}`, borderRadius:6,
  padding:"8px 11px", fontSize:13, color:C.text, background:"#fff",
  outline:"none", boxSizing:"border-box", transition:"border .15s", ...extra
});

const TI = ({ label, required, ...p }) => {
  const [f,setF] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:C.textMid,display:"flex",gap:4}}>
        {label}{required&&<span style={{color:C.danger}}>*</span>}
      </label>}
      <input {...p} style={{...iS(),borderColor:f?C.primary:C.border,boxShadow:f?`0 0 0 3px ${C.primary}22`:"none",...p.style}}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
    </div>
  );
};

const TA = ({ label, required, rows=3, ...p }) => {
  const [f,setF] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      {label&&<label style={{fontSize:12,fontWeight:600,color:C.textMid,display:"flex",gap:4}}>
        {label}{required&&<span style={{color:C.danger}}>*</span>}
      </label>}
      <textarea {...p} rows={rows} style={{...iS(),resize:"vertical",borderColor:f?C.primary:C.border,boxShadow:f?`0 0 0 3px ${C.primary}22`:"none",...p.style}}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
    </div>
  );
};

const Modal = ({ title, onClose, children, width=580 }) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:1000,
    display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
    onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:C.surface,borderRadius:12,width:"100%",maxWidth:width,
      maxHeight:"92vh",overflow:"auto",boxShadow:"0 24px 64px rgba(0,0,0,.22)",animation:"pop .2s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text}}>{title}</div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          color:C.textMid,fontSize:22,lineHeight:1,padding:"2px 6px"}}>×</button>
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  </div>
);

const Alert = ({ type="info", children }) => {
  const s = {
    info:    {bg:C.infoBg,    color:C.info,    icon:"ℹ️"},
    success: {bg:C.successBg, color:C.success, icon:"✅"},
    warning: {bg:C.amberBg,   color:"#856404", icon:"⚠️"},
    danger:  {bg:C.dangerBg,  color:C.danger,  icon:"🚫"},
  }[type]||{};
  return (
    <div style={{background:s.bg,borderRadius:7,padding:"10px 14px",
      display:"flex",gap:8,alignItems:"flex-start",fontSize:13,color:s.color}}>
      <span>{s.icon}</span><span>{children}</span>
    </div>
  );
};

const Spinner = ({ size=20 }) => (
  <div style={{width:size,height:size,border:`2px solid ${C.border}`,
    borderTop:`2px solid ${C.primary}`,borderRadius:"50%",
    animation:"spin .7s linear infinite",flexShrink:0}}/>
);

// ─── PROGRESS STEPPER ────────────────────────────────────────────────────────
const ProgressStepper = ({ currentStatus }) => {
  const steps = [
    {label:"Submitted",  match:["Pending Review","Sent Back to Requester"]},
    {label:"Reviewed",   match:["Request Review Done"]},
    {label:"Materials",  match:["Material Required","Material PR Shared"]},
    {label:"Procurement",match:["Funds Required"]},
    {label:"Production", match:["Under Production","Outsource Services"]},
    {label:"Complete",   match:["Complete"]},
  ];
  const cur = steps.findIndex(s=>s.match.includes(currentStatus));
  return (
    <div style={{display:"flex",alignItems:"center"}}>
      {steps.map((step,i)=>{
        const done=i<cur, active=i===cur;
        return (
          <div key={step.label} style={{display:"flex",alignItems:"center",flex:1}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:28,height:28,borderRadius:"50%",
                background:done?C.success:active?C.primary:"#e9ecef",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:700,color:(done||active)?"#fff":C.textLight,
                border:active?`2px solid ${C.primary}`:"none"}}>
                {done?"✓":i+1}
              </div>
              <span style={{fontSize:9,fontWeight:500,textAlign:"center",maxWidth:52,lineHeight:1.2,
                color:active?C.primary:done?C.success:C.textLight}}>{step.label}</span>
            </div>
            {i<steps.length-1&&(
              <div style={{flex:1,height:2,background:done?C.success:"#e9ecef",margin:"0 2px",marginBottom:16}}/>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════════════════════
const LoginPage = ({ users, onLogin }) => {
  const [sel,  setSel]  = useState(null);
  const [pw,   setPw]   = useState("");
  const [show, setShow] = useState(false);
  const [err,  setErr]  = useState("");
  const ref = useRef();

  const pick = u => { setSel(u); setPw(""); setErr(""); setTimeout(()=>ref.current?.focus(),100); };

  const login = () => {
    if (!sel) { setErr("Please select a user."); return; }
    if (!pw)  { setErr("Please enter your password."); return; }
    if (pw !== sel.password) { setErr("Incorrect password."); setPw(""); return; }
    onLogin(sel);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0edf5,#e8e4f0,#f5f0f8)",
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:560}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:60,height:60,background:C.primary,borderRadius:14,
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 14px",boxShadow:`0 10px 30px ${C.primary}55`}}>
            <span style={{fontSize:28,color:"#fff"}}>🔧</span>
          </div>
          <div style={{fontSize:26,fontWeight:800,color:C.primary}}>Work Order System</div>
          <div style={{fontSize:13,color:C.textMid,marginTop:4}}>Manufacturing Request &amp; Tracking</div>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,
          padding:24,boxShadow:"0 8px 32px rgba(113,75,103,.12)"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:12,
            textTransform:"uppercase",letterSpacing:".06em"}}>Select Your Profile</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20,
            maxHeight:300,overflowY:"auto"}}>
            {users.map(u=>(
              <button key={u.id} onClick={()=>pick(u)}
                style={{padding:"10px 12px",border:`2px solid ${sel?.id===u.id?u.color:C.border}`,
                  borderRadius:10,background:sel?.id===u.id?`${u.color}12`:"#fff",
                  cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                  textAlign:"left",transition:"all .15s"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:u.color,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:11,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                  <div style={{fontSize:10,color:C.textMid,
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.role}</div>
                </div>
              </button>
            ))}
          </div>
          {sel&&(
            <div style={{animation:"slideIn .2s ease",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:8,
                textTransform:"uppercase",letterSpacing:".06em"}}>Password for {sel.name}</div>
              <div style={{position:"relative"}}>
                <input ref={ref} type={show?"text":"password"} value={pw}
                  onChange={e=>{setPw(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&login()}
                  placeholder="Enter password..."
                  style={{...iS(),paddingRight:40}}
                  onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 3px ${C.primary}22`;}}
                  onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>
                <button onClick={()=>setShow(v=>!v)}
                  style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textMid}}>
                  {show?"🙈":"👁️"}
                </button>
              </div>
            </div>
          )}
          {err&&<div style={{background:C.dangerBg,border:`1px solid #f5c6cb`,borderRadius:6,
            padding:"8px 12px",fontSize:12,color:C.danger,marginBottom:12}}>⚠ {err}</div>}
          <button onClick={login} disabled={!sel||!pw}
            style={{width:"100%",padding:"12px",
              background:sel&&pw?C.primary:"#e5e7eb",color:sel&&pw?"#fff":"#9ca3af",
              border:"none",borderRadius:8,fontSize:15,fontWeight:700,
              cursor:sel&&pw?"pointer":"not-allowed",transition:"all .2s",
              boxShadow:sel&&pw?`0 4px 14px ${C.primary}44`:"none"}}>
            {sel&&pw?`Sign in as ${sel.name} →`:"Select a profile & enter password"}
          </button>
        </div>
        <div style={{textAlign:"center",fontSize:11,color:C.textLight,marginTop:14}}>
          Work Order System · Manufacturing Operations
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ════════════════════════════════════════════════════════════════════════════
const ChangePwModal = ({ user, onSave, onClose }) => {
  const [old,setOld]=useState(""); const [nw,setNw]=useState(""); const [cnf,setCnf]=useState("");
  const [msg,setMsg]=useState(null); const [sO,setSO]=useState(false); const [sN,setSN]=useState(false);
  const [saving,setSaving]=useState(false);

  const handle = async () => {
    if (old !== user.password) { setMsg({t:"danger",m:"Current password is incorrect."}); return; }
    if (nw.length < 6)        { setMsg({t:"danger",m:"Min 6 characters."}); return; }
    if (nw !== cnf)           { setMsg({t:"danger",m:"Passwords do not match."}); return; }
    setSaving(true);
    try {
      await onSave(user.id, nw);
      setMsg({t:"success",m:"Password changed!"});
      setOld(""); setNw(""); setCnf("");
    } catch(e) { setMsg({t:"danger",m:"Failed to save. Try again."}); }
    setSaving(false);
  };

  const Row = ({label,val,set,show,setShow}) => (
    <div>
      <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>{label}</div>
      <div style={{position:"relative"}}>
        <input type={show?"text":"password"} value={val} onChange={e=>set(e.target.value)}
          style={{...iS(),paddingRight:36}}
          onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        <button onClick={()=>setShow(v=>!v)} style={{position:"absolute",right:10,top:"50%",
          transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textMid}}>
          {show?"🙈":"👁️"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal title="🔒 Change Password" onClose={onClose} width={420}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Row label="Current Password" val={old} set={setOld} show={sO} setShow={setSO}/>
        <Row label="New Password (min 6 chars)" val={nw} set={setNw} show={sN} setShow={setSN}/>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Confirm New Password</div>
          <input type="password" value={cnf} onChange={e=>setCnf(e.target.value)} style={iS()}
            onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>
        {msg&&<Alert type={msg.t}>{msg.m}</Alert>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handle} disabled={!old||!nw||!cnf||saving}>
            {saving?<Spinner size={14}/>:null} Update Password
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN — USER MANAGEMENT PANEL
// ════════════════════════════════════════════════════════════════════════════
const UserManagementModal = ({ users, onClose, onRefresh }) => {
  const [tab,       setTab]       = useState("list");
  const [editUser,  setEditUser]  = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  const blank = {
    username:"", name:"", role:"Operations", avatar:"",
    color:"#714b67", is_admin:false, is_sohail:false, is_ahsan:false, password:"",
  };
  const [form, setForm] = useState(blank);
  const setF = k => e => setForm(p=>({...p,[k]:e.target.value}));
  const setFB = k => e => setForm(p=>({...p,[k]:e.target.checked}));

  const COLORS = ["#714b67","#0066cc","#017e84","#28a745","#e07b39","#8a4ac1",
    "#c0392b","#16a085","#8e44ad","#2980b9","#d35400","#27ae60","#e74c3c","#1abc9c","#f39c12","#7f8c8d"];

  const handleSave = async () => {
    if (!form.name.trim()||!form.username.trim()||!form.password.trim()) {
      setMsg({t:"danger",m:"Name, username and password are required."}); return;
    }
    setSaving(true); setMsg(null);
    try {
      const avatar = form.avatar.trim() || form.name.trim().substring(0,2).toUpperCase();
      if (editUser) {
        await db.updateUser(editUser.id, { ...form, avatar });
      } else {
        // Check username not taken
        const existing = users.find(u=>u.username===form.username.trim().toLowerCase());
        if (existing) { setMsg({t:"danger",m:"Username already exists."}); setSaving(false); return; }
        await db.createUser({ ...form, username:form.username.trim().toLowerCase(), avatar });
      }
      await onRefresh();
      setEditUser(null); setShowAdd(false); setForm(blank);
      setMsg({t:"success",m:editUser?"User updated!":"User created!"});
    } catch(e) { setMsg({t:"danger",m:"Error saving user. Try again."}); }
    setSaving(false);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete user "${u.name}"? This cannot be undone.`)) return;
    setSaving(true);
    try { await db.deleteUser(u.id); await onRefresh(); }
    catch(e) { setMsg({t:"danger",m:"Error deleting user."}); }
    setSaving(false);
  };

  const openEdit = (u) => { setEditUser(u); setForm({...u}); setShowAdd(true); setTab("edit"); };
  const openAdd  = ()  => { setEditUser(null); setForm(blank); setShowAdd(true); setTab("add"); };

  return (
    <Modal title="👥 User Management (Admin)" onClose={onClose} width={820}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>

        {msg&&<Alert type={msg.t}>{msg.m}</Alert>}

        {/* Tab bar */}
        <div style={{display:"flex",gap:4,borderBottom:`1px solid ${C.border}`,paddingBottom:0}}>
          {[["list","👥 All Users"],["add",editUser?"✏️ Edit User":"➕ Add New User"]].map(([id,label])=>(
            <button key={id} onClick={()=>{ setTab(id); if(id==="list"){setEditUser(null);setShowAdd(false);setForm(blank);} if(id==="add"&&!editUser)setForm(blank); }}
              style={{padding:"8px 16px",border:"none",background:"transparent",fontSize:13,cursor:"pointer",
                fontWeight:tab===id?600:400,color:tab===id?C.primary:C.textMid,
                borderBottom:tab===id?`2px solid ${C.primary}`:"2px solid transparent",marginBottom:-1}}>
              {label}
            </button>
          ))}
        </div>

        {/* User List */}
        {(tab==="list") && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:13,color:C.textMid}}>{users.length} users in system</span>
              <Btn icon="+" onClick={openAdd}>Add New User</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxHeight:420,overflowY:"auto"}}>
              {users.map(u=>(
                <div key={u.id} style={{background:"#fafafa",border:`1px solid ${C.border}`,
                  borderRadius:10,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:38,height:38,borderRadius:"50%",background:u.color,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>{u.avatar}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{u.name}</div>
                    <div style={{fontSize:11,color:C.textMid}}>{u.role}</div>
                    <div style={{fontSize:10,color:C.textLight,fontFamily:"monospace"}}>@{u.username}</div>
                    {u.is_admin&&<span style={{fontSize:10,background:C.primaryLight,color:C.primary,
                      borderRadius:10,padding:"1px 6px",fontWeight:600}}>ADMIN</span>}
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <Btn size="sm" variant="secondary" onClick={()=>openEdit(u)}>✏️ Edit</Btn>
                    {!u.is_admin&&(
                      <Btn size="sm" variant="danger" onClick={()=>handleDelete(u)}>🗑️</Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add / Edit Form */}
        {(tab==="add"||tab==="edit") && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <TI label="Full Name" required value={form.name} onChange={setF("name")} placeholder="e.g. John Smith"/>
              <TI label="Username (login)" required value={form.username} onChange={setF("username")} placeholder="e.g. johnsmith" disabled={!!editUser}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <TI label="Role / Job Title" value={form.role} onChange={setF("role")} placeholder="e.g. Operations"/>
              <TI label="Avatar (2 letters)" value={form.avatar} onChange={setF("avatar")} placeholder="e.g. JS (auto if blank)"/>
            </div>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:6}}>Avatar Color</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {COLORS.map(col=>(
                  <button key={col} onClick={()=>setForm(p=>({...p,color:col}))}
                    style={{width:28,height:28,borderRadius:"50%",background:col,border:`3px solid ${form.color===col?"#fff":"transparent"}`,
                      outline:form.color===col?`2px solid ${col}`:"none",cursor:"pointer",transition:"all .15s"}}/>
                ))}
              </div>
            </div>
            <TI label={editUser?"New Password (leave blank to keep current)":"Password"} required={!editUser}
              type="text" value={form.password} onChange={setF("password")} placeholder="Min 6 characters"/>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={form.is_sohail} onChange={setFB("is_sohail")} style={{accentColor:C.primary,width:15,height:15}}/>
                Is Head of Manufacturing (Sohail role)
              </label>
              <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={form.is_ahsan} onChange={setFB("is_ahsan")} style={{accentColor:C.primary,width:15,height:15}}/>
                Is Procurement Officer (Ahsan role)
              </label>
              <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13}}>
                <input type="checkbox" checked={form.is_admin} onChange={setFB("is_admin")} style={{accentColor:C.primary,width:15,height:15}}/>
                Is Admin
              </label>
            </div>
            <div style={{background:"#f0edf5",border:`1px solid ${C.primary}33`,borderRadius:7,padding:"10px 14px",fontSize:12,color:C.textMid}}>
              💡 Privileged users who see all work orders: admin, sohail, abdullah, hassan, ahsan, fahadzeb — and any user with the Admin flag.
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn variant="secondary" onClick={()=>{setTab("list");setEditUser(null);setForm(blank);}}>Cancel</Btn>
              <Btn onClick={handleSave} disabled={saving}>
                {saving?<Spinner size={14}/>:null} {editUser?"Save Changes":"Create User"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER FORM — create + edit/resubmit
// ════════════════════════════════════════════════════════════════════════════
const WOFormModal = ({ currentUser, existing, onClose, onSave, allUsers }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    itemName:        existing?.itemName        || "",
    qty:             existing?.qty             || "",
    unit:            existing?.unit            || "pcs",
    requirementDate: existing?.requirementDate || "",
    description:     existing?.description     || "",
    priority:        existing?.priority        || "Normal",
    notes:           existing?.notes           || "",
    files:           existing?.files           || [],
  });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const fileRef = useRef();

  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const validate = () => {
    const e = {};
    if (!form.itemName.trim())                       e.itemName="Item name is required.";
    if (!form.qty||isNaN(form.qty)||+form.qty<=0)    e.qty="Valid quantity is required.";
    if (!form.requirementDate)                       e.requirementDate="Requirement date is required.";
    if (!form.description.trim())                    e.description="Description is required.";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleFiles = e => {
    Array.from(e.target.files||[]).forEach(f=>{
      const reader = new FileReader();
      reader.onload = ev => setForm(p=>{
        if (p.files.find(x=>x.name===f.name&&x.size===f.size)) return p;
        return {...p, files:[...p.files,{name:f.name,size:f.size,type:f.type,dataUrl:ev.target.result}]};
      });
      reader.readAsDataURL(f);
    });
    e.target.value="";
  };

  const removeFile = i => setForm(p=>({...p,files:p.files.filter((_,j)=>j!==i)}));

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const base = {
        item_name:        form.itemName.trim(),
        qty:              form.qty,
        unit:             form.unit.trim()||"pcs",
        requirement_date: form.requirementDate,
        description:      form.description.trim(),
        priority:         form.priority,
        notes:            form.notes.trim(),
        files:            JSON.stringify(form.files),
      };
      if (isEdit) {
        const newHistory = [...(existing.status_history||[]),{
          status:"Pending Review", by:currentUser.name, at:nowTs(),
          remarks:"Form revised and resubmitted.",
        }];
        await onSave(existing.id, {
          ...base,
          status:         "Pending Review",
          sohail_action:  null,
          is_complete:    false,
          status_history: JSON.stringify(newHistory),
        });
      } else {
        const history = [{status:"Pending Review",by:currentUser.name,at:nowTs(),remarks:"Work order created."}];
        await onSave(null, {
          ...base,
          wo_id:           genId(),
          request_date:    todayStr(),
          requested_at:    nowTs(),
          requested_by:    currentUser.username,
          requested_by_name: currentUser.name,
          status:          "Pending Review",
          sohail_action:   null,
          sohail_remark:   "",
          is_complete:     false,
          status_history:  JSON.stringify(history),
        });
      }
      onClose();
    } catch(e) { alert("Error saving work order: "+e.message); }
    setSaving(false);
  };

  const Err = ({msg}) => msg?<div style={{fontSize:11,color:C.danger,marginTop:2}}>{msg}</div>:null;

  return (
    <Modal title={isEdit?"✏️ Edit & Resubmit Work Order":"📝 New Work Order Request"} onClose={onClose} width={660}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {isEdit&&<Alert type="warning">Editing a sent-back work order. After saving it returns to <strong>Pending Review</strong>.</Alert>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 110px 80px",gap:12}}>
          <div><TI label="Item Name" required value={form.itemName} onChange={set("itemName")} placeholder="e.g. Bracket Assembly"/><Err msg={errors.itemName}/></div>
          <div><TI label="Quantity" required type="number" min="1" value={form.qty} onChange={set("qty")} placeholder="10"/><Err msg={errors.qty}/></div>
          <TI label="Unit" value={form.unit} onChange={set("unit")} placeholder="pcs"/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Request Date</div>
            <div style={{...iS(),background:"#f9fafb",color:C.textMid,display:"flex",alignItems:"center",gap:6}}>
              📅 {fmtDt(existing?.request_date||todayStr())}
            </div>
          </div>
          <div><TI label="Requirement Date" required type="date" value={form.requirementDate} onChange={set("requirementDate")}/><Err msg={errors.requirementDate}/></div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Priority</div>
            <select value={form.priority} onChange={set("priority")} style={{...iS(),cursor:"pointer"}}
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}>
              <option>Normal</option><option>High</option><option>Urgent</option>
            </select>
          </div>
        </div>

        <div><TA label="Work Order Description" required rows={4} value={form.description} onChange={set("description")} placeholder="Describe what needs to be manufactured..."/><Err msg={errors.description}/></div>
        <TA label="Additional Notes" rows={2} value={form.notes} onChange={set("notes")} placeholder="Any extra instructions..."/>

        <div>
          <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:6}}>
            Attachments / Drawings <span style={{fontSize:11,fontWeight:400,color:C.textLight}}>(optional)</span>
          </div>
          <div style={{border:`2px dashed ${C.border}`,borderRadius:8,padding:"14px 16px",
            display:"flex",flexDirection:"column",gap:10,background:"#fafafa"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <input ref={fileRef} type="file" multiple
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.xlsx,.docx,.sldprt,.SLDPRT,.step,.iges"
                onChange={handleFiles} style={{display:"none"}}/>
              <Btn variant="secondary" icon="📎" onClick={()=>fileRef.current?.click()}>Choose Files</Btn>
              <span style={{fontSize:11,color:C.textLight}}>PDF, PNG, JPG, DWG, DXF, SLDPRT, STEP, Excel, Word</span>
            </div>
            {form.files.length>0&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {form.files.map((f,i)=>(
                  <div key={i} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:6,
                    padding:"4px 10px",fontSize:11,display:"flex",alignItems:"center",gap:6}}>
                    📄 <span style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</span>
                    <button onClick={()=>removeFile(i)} style={{background:"none",border:"none",cursor:"pointer",color:C.danger,fontSize:14}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4,borderTop:`1px solid ${C.border}`}}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn icon={isEdit?"🔄":"📤"} onClick={handleSave} disabled={saving}>
            {saving?<Spinner size={14}/>:null} {isEdit?"Resubmit Work Order":"Submit Work Order"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER DETAIL MODAL
// ════════════════════════════════════════════════════════════════════════════
const WODetailModal = ({ wo, currentUser, onClose, onRefresh, users }) => {
  const [statusVal,  setStatusVal]  = useState("");
  const [remarksVal, setRemarksVal] = useState("");
  const [sohailAct,  setSohailAct]  = useState("ok");
  const [sohailRmk,  setSohailRmk]  = useState("");
  const [showEdit,   setShowEdit]   = useState(false);
  const [confirmRB,  setConfirmRB]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Parse stored JSON fields
  const statusHistory = (() => { try { return typeof wo.status_history==="string" ? JSON.parse(wo.status_history) : (wo.status_history||[]); } catch(e){return[];} })();
  const files         = (() => { try { return typeof wo.files==="string" ? JSON.parse(wo.files) : (wo.files||[]); } catch(e){return[];} })();

  const isRequester  = wo.requested_by === currentUser.username;
  const isPrivileged = currentUser.is_admin || PRIVILEGED_USERNAMES.includes(currentUser.username);
  const isSentBack   = wo.status === "Sent Back to Requester";
  const isComplete   = wo.is_complete;
  const needsSohail  = wo.sohail_action === null && wo.status === "Pending Review";
  const nextAllowed  = getNextAllowed(wo.status);
  const awaitingFunds = wo.status === "Material PR Shared";
  const userCanSetFunds = currentUser.is_ahsan || currentUser.is_admin;
  const allowedNext  = nextAllowed.filter(s => s==="Funds Required" ? userCanSetFunds : true);

  const patch = async (data) => {
    setSaving(true);
    try { await db.updateWorkOrder(wo.id, data); await onRefresh(); }
    catch(e) { alert("Error updating: "+e.message); }
    setSaving(false);
  };

  const handleSohailReview = async () => {
    const ns = sohailAct==="ok" ? "Request Review Done" : "Sent Back to Requester";
    const newHistory = [...statusHistory,{status:ns,by:currentUser.name,at:nowTs(),
      remarks:sohailRmk.trim()||(sohailAct==="ok"?"Reviewed and approved.":"Sent back for revision.")}];
    await patch({sohail_action:sohailAct,sohail_remark:sohailRmk.trim(),status:ns,status_history:JSON.stringify(newHistory)});
    setSohailRmk("");
  };

  const handleStatusUpdate = async () => {
    if (!statusVal) return;
    const done = statusVal==="Complete";
    const newHistory = [...statusHistory,{status:statusVal,by:currentUser.name,at:nowTs(),
      remarks:remarksVal.trim()||`Status updated to ${statusVal}.`}];
    await patch({status:statusVal,is_complete:done,status_history:JSON.stringify(newHistory)});
    setStatusVal(""); setRemarksVal("");
  };

  const handleRollback = async () => {
    const prev = statusHistory[statusHistory.length-2];
    const newHistory = [...statusHistory,{status:prev.status,by:currentUser.name,at:nowTs(),remarks:`Rolled back to: ${prev.status}`}];
    const resetSohail = ["Pending Review","Sent Back to Requester"].includes(prev.status) ? null : wo.sohail_action;
    await patch({status:prev.status,is_complete:false,sohail_action:resetSohail,status_history:JSON.stringify(newHistory)});
    setConfirmRB(false);
  };

  const handleAdminEdit = async (id, data) => {
    await db.updateWorkOrder(id, data); await onRefresh();
  };

  const handleAdminDelete = async () => {
    if (!window.confirm(`Delete work order ${wo.wo_id}? This cannot be undone.`)) return;
    setSaving(true);
    try { await db.deleteWorkOrder(wo.id); await onRefresh(); onClose(); }
    catch(e) { alert("Error deleting: "+e.message); }
    setSaving(false);
  };

  const downloadFile = f => {
    if (f.dataUrl) { const a=document.createElement("a"); a.href=f.dataUrl; a.download=f.name; a.click(); }
    else alert("File data not available for download.");
  };

  const pColors = {Normal:"#6c757d",High:"#e07b39",Urgent:"#dc3545"};

  return (
    <Modal title={`Work Order — ${wo.wo_id}`} onClose={onClose} width={780}>
      <div style={{display:"flex",flexDirection:"column",gap:20}}>

        {/* Header */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",
          padding:"12px 16px",background:"#f9fafb",borderRadius:8}}>
          <Badge label={wo.status}/>
          <span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,
            background:pColors[wo.priority]+"20",color:pColors[wo.priority]}}>⚡ {wo.priority}</span>
          <span style={{fontSize:12,color:C.textMid}}>By: <strong>{wo.requested_by_name}</strong></span>
          {currentUser.is_admin&&(
            <div style={{marginLeft:"auto",display:"flex",gap:6}}>
              <Btn size="sm" variant="secondary" icon="✏️" onClick={()=>setShowEdit(true)}>Edit</Btn>
              <Btn size="sm" variant="danger" icon="🗑️" onClick={handleAdminDelete} disabled={saving}>Delete</Btn>
            </div>
          )}
          {!currentUser.is_admin&&<span style={{fontSize:12,color:C.textMid,marginLeft:"auto"}}>{wo.requested_at}</span>}
        </div>

        {/* Alerts */}
        {isComplete&&isRequester&&<Alert type="success">🎉 Your work order <strong>{wo.wo_id}</strong> has been <strong>Completed</strong>!</Alert>}
        {isComplete&&!isRequester&&<Alert type="success">✅ This work order is <strong>Complete</strong> and locked.</Alert>}
        {isSentBack&&isRequester&&<Alert type="warning">🔄 Sent back for revision. Click <strong>Edit &amp; Resubmit</strong> below.</Alert>}
        {awaitingFunds&&!userCanSetFunds&&isPrivileged&&<Alert type="info">⏳ Waiting for <strong>Ahsan</strong> to set <strong>Funds Required</strong>.</Alert>}

        {/* Stepper */}
        <ProgressStepper currentStatus={wo.status}/>

        {/* Details */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[
            ["Item Name",        wo.item_name],
            ["Quantity",         `${wo.qty} ${wo.unit}`],
            ["Request Date",     fmtDt(wo.request_date)],
            ["Requirement Date", fmtDt(wo.requirement_date)],
            ["Priority",         wo.priority],
            ["Requested By",     wo.requested_by_name],
          ].map(([lbl,val])=>(
            <div key={lbl} style={{background:"#fafafa",borderRadius:7,padding:"10px 14px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,color:C.textMid,fontWeight:500,marginBottom:3}}>{lbl}</div>
              <div style={{fontSize:13,fontWeight:600,color:C.text}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:6}}>DESCRIPTION</div>
          <div style={{background:"#fafafa",border:`1px solid ${C.border}`,borderRadius:7,
            padding:"12px 14px",fontSize:13,lineHeight:1.6}}>{wo.description}</div>
        </div>

        {wo.notes&&(
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:6}}>ADDITIONAL NOTES</div>
            <div style={{background:"#fffbeb",border:`1px solid #fde68a`,borderRadius:7,
              padding:"10px 14px",fontSize:13,color:"#92400e"}}>{wo.notes}</div>
          </div>
        )}

        {/* Files */}
        {files.length>0&&(
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:8}}>
              ATTACHMENTS <span style={{fontSize:11,fontWeight:400,color:C.textLight}}>(click to download)</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {files.map((f,i)=>(
                <button key={i} onClick={()=>downloadFile(f)}
                  style={{background:"#f0edf5",border:`1px solid ${C.primary}44`,borderRadius:6,
                    padding:"6px 13px",fontSize:11,display:"flex",gap:6,alignItems:"center",
                    cursor:"pointer",color:C.primary,fontWeight:600,transition:"all .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background=C.primaryLight}
                  onMouseLeave={e=>e.currentTarget.style.background="#f0edf5"}>
                  📥 {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.textMid,marginBottom:10}}>STATUS HISTORY</div>
          <div style={{display:"flex",flexDirection:"column"}}>
            {statusHistory.map((entry,i)=>(
              <div key={i} style={{display:"flex",gap:12}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  <div style={{width:12,height:12,borderRadius:"50%",
                    background:i===statusHistory.length-1?C.primary:C.success,
                    border:"2px solid #fff",boxShadow:"0 0 0 2px #e0e0e0",flexShrink:0,marginTop:4}}/>
                  {i<statusHistory.length-1&&<div style={{width:2,flex:1,background:"#e0e0e0",minHeight:20}}/>}
                </div>
                <div style={{paddingBottom:14,flex:1}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
                    <Badge label={entry.status}/>
                    <span style={{fontSize:11,color:C.textMid}}>by <strong>{entry.by}</strong> · {entry.at}</span>
                  </div>
                  {entry.remarks&&(
                    <div style={{fontSize:12,color:C.text,background:"#f9fafb",
                      border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",marginTop:4}}>
                      💬 {entry.remarks}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTION PANELS ── */}

        {/* Edit & Resubmit */}
        {isSentBack&&isRequester&&!isComplete&&(
          <div style={{background:"#fffbeb",border:`1px solid #fde68a`,borderRadius:10,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:"#92400e",marginBottom:10}}>✏️ This work order needs your revision.</div>
            <Btn variant="warning" icon="✏️" onClick={()=>setShowEdit(true)}>Edit &amp; Resubmit</Btn>
          </div>
        )}

        {/* Sohail Review */}
        {needsSohail&&currentUser.is_sohail&&!isComplete&&(
          <div style={{background:"#f3eef1",border:`1px solid ${C.primary}33`,borderRadius:10,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.primary,marginBottom:14}}>🔍 Manufacturing Head Review</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[{val:"ok",label:"✅ Approve / OK",color:C.success},{val:"sendback",label:"🔄 Send Back",color:C.warning}].map(opt=>(
                  <label key={opt.val} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",
                    padding:"10px 14px",border:`2px solid ${sohailAct===opt.val?opt.color:C.border}`,
                    borderRadius:8,background:"#fff",transition:"all .15s"}}>
                    <input type="radio" checked={sohailAct===opt.val} onChange={()=>setSohailAct(opt.val)} style={{accentColor:opt.color}}/>
                    <span style={{fontSize:13,fontWeight:600,color:sohailAct===opt.val?opt.color:C.text}}>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Remarks</div>
                <textarea value={sohailRmk} onChange={e=>setSohailRmk(e.target.value)} rows={3}
                  placeholder="Add review notes..." style={{...iS(),resize:"none"}}
                  onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end"}}>
              <Btn onClick={handleSohailReview} variant={sohailAct==="ok"?"success":"secondary"}
                icon={sohailAct==="ok"?"✅":"🔄"} disabled={saving}>
                {saving?<Spinner size={14}/>:null} {sohailAct==="ok"?"Submit Approval":"Send Back"}
              </Btn>
            </div>
          </div>
        )}

        {/* Status Update */}
        {wo.sohail_action==="ok"&&!isComplete&&!isSentBack&&isPrivileged&&(
          <div style={{background:"#f8f9fa",border:`1px solid ${C.border}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>⚙️ Update Work Order Status</div>
            {awaitingFunds&&!userCanSetFunds&&<Alert type="warning">⏳ Waiting for <strong>Ahsan</strong> to set <strong>Funds Required</strong>. You cannot advance until this is done.</Alert>}
            {awaitingFunds&&userCanSetFunds&&<Alert type="info">As Procurement Officer, you must set status to <strong>Funds Required</strong> before production can begin.</Alert>}
            {(!awaitingFunds||userCanSetFunds)&&allowedNext.length>0&&(
              <>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:awaitingFunds?12:0}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Next Status</div>
                    <select value={statusVal} onChange={e=>setStatusVal(e.target.value)}
                      style={{...iS(),cursor:"pointer"}}
                      onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}>
                      <option value="">— Select next status —</option>
                      {allowedNext.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{fontSize:11,color:C.textLight,marginTop:4}}>⚠ Strict order — no skipping.</div>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.textMid,marginBottom:5}}>Remarks</div>
                    <textarea value={remarksVal} onChange={e=>setRemarksVal(e.target.value)} rows={3}
                      placeholder="Add update notes..." style={{...iS(),resize:"none"}}
                      onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
                  </div>
                </div>
                {statusVal==="Complete"&&<div style={{marginTop:10}}><Alert type="danger">⚠ Marking as <strong>Complete</strong> is <strong>permanent and irreversible</strong>.</Alert></div>}
                <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
                  <Btn onClick={handleStatusUpdate} disabled={!statusVal||saving}
                    variant={statusVal==="Complete"?"success":"primary"} icon={statusVal==="Complete"?"🏁":"💾"}>
                    {saving?<Spinner size={14}/>:null} {statusVal==="Complete"?"Mark Complete (Final)":"Save Status Update"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* Rollback */}
        {!isComplete&&isPrivileged&&canRollback(statusHistory)&&wo.sohail_action==="ok"&&(
          <div style={{background:"#fff8f0",border:`1px solid #fbd7b0`,borderRadius:10,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.warning,marginBottom:8}}>↩ Roll Back Status</div>
            <div style={{fontSize:12,color:C.textMid,marginBottom:10}}>
              Roll back to: <strong>{statusHistory[statusHistory.length-2]?.status}</strong>
              <span style={{marginLeft:8,fontSize:11,color:C.textLight}}>(logged in history)</span>
            </div>
            {!confirmRB
              ? <Btn variant="warning" icon="↩" onClick={()=>setConfirmRB(true)}>Roll Back</Btn>
              : <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:13,color:C.danger,fontWeight:600}}>Are you sure?</span>
                  <Btn variant="danger" onClick={handleRollback} disabled={saving}>{saving?<Spinner size={14}/>:null} Yes, Roll Back</Btn>
                  <Btn variant="secondary" onClick={()=>setConfirmRB(false)}>Cancel</Btn>
                </div>
            }
          </div>
        )}

      </div>

      {showEdit&&(
        <WOFormModal currentUser={currentUser} existing={{
          ...wo,
          itemName:wo.item_name, qty:wo.qty, unit:wo.unit,
          requirementDate:wo.requirement_date, description:wo.description,
          priority:wo.priority, notes:wo.notes,
          files: (()=>{try{return typeof wo.files==="string"?JSON.parse(wo.files):(wo.files||[]);}catch(e){return[];}})(),
          request_date:wo.request_date,
        }}
          onClose={()=>setShowEdit(false)}
          onSave={handleAdminEdit}
          allUsers={users}
        />
      )}
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER CARD
// ════════════════════════════════════════════════════════════════════════════
const WOCard = ({ wo, currentUser, onClick }) => {
  const pColors = {Normal:"#6c757d",High:"#e07b39",Urgent:"#dc3545"};
  const needsReview = wo.status==="Pending Review" && currentUser.is_sohail;
  const sentBack    = wo.status==="Sent Back to Requester" && wo.requested_by===currentUser.username;
  const hl = needsReview||sentBack;
  const files = (()=>{try{return typeof wo.files==="string"?JSON.parse(wo.files):(wo.files||[]);}catch(e){return[];}})();

  return (
    <div onClick={onClick}
      style={{background:C.surface,
        border:`1px solid ${hl?C.primary+"55":C.border}`,
        borderLeft:`4px solid ${STATUS_CONFIG[wo.status]?.dot||C.textLight}`,
        borderRadius:10,padding:"15px 18px",cursor:"pointer",
        boxShadow:hl?"0 2px 10px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)",
        transition:"all .15s",animation:"slideIn .3s ease"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-1px)";}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow=hl?"0 2px 10px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)";e.currentTarget.style.transform="translateY(0)";}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontFamily:"monospace",fontSize:11,color:C.primary,fontWeight:700}}>{wo.wo_id}</span>
          {needsReview&&<span style={{fontSize:10,background:C.primary,color:"#fff",borderRadius:10,padding:"1px 7px",fontWeight:600}}>NEEDS REVIEW</span>}
          {sentBack&&<span style={{fontSize:10,background:C.warning,color:"#fff",borderRadius:10,padding:"1px 7px",fontWeight:600}}>ACTION REQUIRED</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {wo.is_complete&&<span>🏁</span>}
          <Badge label={wo.status}/>
        </div>
      </div>
      <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>{wo.item_name}</div>
      <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:pColors[wo.priority],fontWeight:600}}>⚡ {wo.priority}</span>
        <span style={{fontSize:12,color:C.textMid}}>Qty: <strong>{wo.qty} {wo.unit}</strong></span>
        <span style={{fontSize:12,color:C.textMid}}>By: <strong>{wo.requested_by_name}</strong></span>
        <span style={{fontSize:12,color:C.textMid}}>Required: <strong>{fmtDt(wo.requirement_date)}</strong></span>
        <span style={{fontSize:12,color:C.textMid}}>Submitted: {wo.requested_at}</span>
        {files.length>0&&<span style={{fontSize:12,color:C.primary}}>📎 {files.length} file{files.length>1?"s":""}</span>}
      </div>
      {wo.description&&<div style={{fontSize:12,color:C.textMid,marginTop:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{wo.description}</div>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SETUP SCREEN — shown when Supabase not yet configured
// ════════════════════════════════════════════════════════════════════════════
const SetupScreen = () => (
  <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#f0edf5,#e8e4f0)",
    display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{maxWidth:600,width:"100%"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:48,marginBottom:12}}>⚙️</div>
        <div style={{fontSize:24,fontWeight:800,color:C.primary}}>Setup Required</div>
        <div style={{fontSize:14,color:C.textMid,marginTop:6}}>Connect your Supabase database to get started</div>
      </div>
      <div style={{background:"#fff",borderRadius:12,padding:28,boxShadow:"0 4px 24px rgba(0,0,0,.08)",
        border:`1px solid ${C.border}`}}>
        <Alert type="warning">
          The app needs a Supabase database URL and API key. Open <strong>App.jsx</strong> and replace
          <code style={{background:"#f0f0f0",padding:"1px 5px",borderRadius:3,margin:"0 4px"}}>YOUR_SUPABASE_URL</code>
          and <code style={{background:"#f0f0f0",padding:"1px 5px",borderRadius:3,margin:"0 4px"}}>YOUR_SUPABASE_ANON_KEY</code>
          at the top of the file with your real values. Follow the setup guide provided.
        </Alert>
        <div style={{marginTop:16,fontSize:13,color:C.textMid,lineHeight:1.8}}>
          <strong>Steps:</strong><br/>
          1. Go to <strong>supabase.com</strong> → create a free account<br/>
          2. Create a new project<br/>
          3. Run the SQL provided in the setup guide to create the tables<br/>
          4. Copy your Project URL and anon key<br/>
          5. Paste them into App.jsx at the top<br/>
          6. Push to GitHub → Vercel redeploys automatically
        </div>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [users,       setUsers]       = useState([]);
  const [workOrders,  setWorkOrders]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [dbError,     setDbError]     = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showChangePw,setShowChangePw]= useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [showUsers,   setShowUsers]   = useState(false);
  const [selectedWO,  setSelectedWO]  = useState(null);
  const [fStatus,     setFStatus]     = useState("all");
  const [fPriority,   setFPriority]   = useState("all");
  const [fDate,       setFDate]       = useState("all");
  const [fMine,       setFMine]       = useState(false);
  const [search,      setSearch]      = useState("");

  // Show setup screen if keys not configured
  if (SUPABASE_URL === "YOUR_SUPABASE_URL") return <><GlobalStyles/><SetupScreen/></>;

  const loadData = useCallback(async () => {
    try {
      const [u, w] = await Promise.all([db.getUsers(), db.getWorkOrders()]);
      setUsers(u||[]);
      setWorkOrders(w||[]);
      setDbError(null);
    } catch(e) {
      setDbError("Cannot connect to database. Check your Supabase URL and key.");
    }
    setLoading(false);
  }, []);

  // Initial load + seed users if empty
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let u = await db.getUsers();
        if (!u || u.length === 0) {
          // Seed default users
          for (const user of SEED_USERS) {
            await db.createUser(user);
          }
          u = await db.getUsers();
        }
        const w = await db.getWorkOrders();
        setUsers(u||[]);
        setWorkOrders(w||[]);
      } catch(e) {
        setDbError("Cannot connect to database: "+e.message);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Poll for updates every 15 seconds so all users see live data
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [currentUser, loadData]);

  if (loading) return (
    <>
      <GlobalStyles/>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
        background:"linear-gradient(135deg,#f0edf5,#e8e4f0)",flexDirection:"column",gap:16}}>
        <Spinner size={40}/>
        <div style={{fontSize:14,color:C.textMid}}>Connecting to database...</div>
        {dbError&&<Alert type="danger">{dbError}</Alert>}
      </div>
    </>
  );

  if (dbError) return (
    <>
      <GlobalStyles/>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
        background:"linear-gradient(135deg,#f0edf5,#e8e4f0)",padding:24}}>
        <div style={{maxWidth:500}}>
          <Alert type="danger">{dbError}</Alert>
          <button onClick={()=>{setLoading(true);setDbError(null);loadData();}}
            style={{marginTop:12,padding:"8px 16px",background:C.primary,color:"#fff",
              border:"none",borderRadius:6,cursor:"pointer",fontSize:13}}>
            Retry Connection
          </button>
        </div>
      </div>
    </>
  );

  if (!currentUser) return <><GlobalStyles/><LoginPage users={users} onLogin={setCurrentUser}/></>;

  const isPrivileged = currentUser.is_admin || PRIVILEGED_USERNAMES.includes(currentUser.username);

  const visibleWOs = isPrivileged
    ? workOrders
    : workOrders.filter(w => w.requested_by === currentUser.username);

  const withinDate = wo => {
    if (fDate==="all") return true;
    const d=new Date(wo.request_date), now=new Date();
    if (fDate==="today") return d.toDateString()===now.toDateString();
    if (fDate==="week")  { const w=new Date(now); w.setDate(now.getDate()-7); return d>=w; }
    if (fDate==="month") { const m=new Date(now); m.setMonth(now.getMonth()-1); return d>=m; }
    return true;
  };

  const filtered = visibleWOs
    .filter(w => fStatus==="all"   || w.status===fStatus)
    .filter(w => fPriority==="all" || w.priority===fPriority)
    .filter(w => withinDate(w))
    .filter(w => !fMine || w.requested_by===currentUser.username)
    .filter(w => !search ||
      (w.item_name||"").toLowerCase().includes(search.toLowerCase()) ||
      (w.wo_id||"").toLowerCase().includes(search.toLowerCase()) ||
      (w.requested_by_name||"").toLowerCase().includes(search.toLowerCase())
    );

  const myWOs        = workOrders.filter(w=>w.requested_by===currentUser.username);
  const pendingWOs   = visibleWOs.filter(w=>w.status==="Pending Review");
  const completeWOs  = visibleWOs.filter(w=>w.is_complete);
  const needsReview  = currentUser.is_sohail ? pendingWOs.length : 0;
  const actionNeeded = myWOs.filter(w=>w.status==="Sent Back to Requester").length;

  const liveWO     = selectedWO ? workOrders.find(w=>w.id===selectedWO.id) : null;
  const hasFilters = fStatus!=="all"||fPriority!=="all"||fDate!=="all"||fMine||search;
  const clearAll   = () => { setFStatus("all");setFPriority("all");setFDate("all");setFMine(false);setSearch(""); };

  const handleCreateWO = async (_, data) => {
    await db.createWorkOrder(data);
    await loadData();
  };

  const handleChangePw = async (userId, newPw) => {
    await db.updateUser(userId, { password: newPw });
    // Update local user state
    const updated = users.map(u => u.id===userId ? {...u,password:newPw} : u);
    setUsers(updated);
    const updatedCurrent = updated.find(u=>u.id===currentUser.id);
    if (updatedCurrent) setCurrentUser(updatedCurrent);
  };

  return (
    <>
      <GlobalStyles/>
      <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:C.bg}}>

        {/* TOPBAR */}
        <div style={{background:C.primary,color:"#fff",padding:"0 24px",
          display:"flex",alignItems:"center",height:56,gap:14,flexShrink:0,
          boxShadow:"0 2px 8px rgba(113,75,103,.3)"}}>
          <span style={{fontSize:20}}>🔧</span>
          <div style={{fontSize:16,fontWeight:800,letterSpacing:".02em"}}>Work Order System</div>
          <div style={{flex:1}}/>
          {needsReview>0&&(
            <div style={{background:"#dc3545",color:"#fff",borderRadius:20,
              padding:"4px 12px",fontSize:12,fontWeight:700,animation:"pulse 2s infinite"}}>
              ⚠ {needsReview} Pending Review
            </div>
          )}
          {actionNeeded>0&&(
            <div style={{background:C.warning,color:"#fff",borderRadius:20,
              padding:"4px 12px",fontSize:12,fontWeight:700,animation:"pulse 2s infinite"}}>
              ✏️ {actionNeeded} Action Required
            </div>
          )}
          <button onClick={loadData}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
              color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
            🔄 Refresh
          </button>
          {currentUser.is_admin&&(
            <button onClick={()=>setShowUsers(true)}
              style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
                color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
              👥 Users
            </button>
          )}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:currentUser.color,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:"#fff",fontSize:12,fontWeight:700}}>{currentUser.avatar}</div>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{currentUser.name}</div>
              <div style={{fontSize:10,opacity:.75}}>{currentUser.role}</div>
            </div>
            <button onClick={()=>setShowChangePw(true)}
              style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
                color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",marginLeft:4}}>
              🔒 Password
            </button>
            <button onClick={()=>setCurrentUser(null)}
              style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
                color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
              Logout
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{flex:1,maxWidth:1200,width:"100%",margin:"0 auto",padding:24,boxSizing:"border-box"}}>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
            {[
              {label:"Total Work Orders",value:visibleWOs.length,  icon:"📋",color:C.primary},
              {label:"My Requests",      value:myWOs.length,       icon:"👤",color:"#0066cc"},
              {label:"Pending Review",   value:pendingWOs.length,  icon:"⏳",color:C.warning},
              {label:"Completed",        value:completeWOs.length, icon:"✅",color:C.success},
            ].map(k=>(
              <div key={k.label} style={{background:C.surface,border:`1px solid ${C.border}`,
                borderRadius:10,padding:"16px 20px",display:"flex",gap:14,alignItems:"center",
                boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                <div style={{width:42,height:42,borderRadius:10,background:`${k.color}18`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{k.icon}</div>
                <div>
                  <div style={{fontSize:22,fontWeight:800,color:k.color,lineHeight:1}}>{k.value}</div>
                  <div style={{fontSize:11,color:C.textMid,marginTop:3,fontWeight:500}}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
            padding:16,marginBottom:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
              <Btn icon="+" size="lg" onClick={()=>setShowCreate(true)}>New Work Order</Btn>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="🔍  Search by item name, WO ID or requester..."
                style={{...iS({flex:"1 1 220px",minWidth:200})}}
                onFocus={e=>e.target.style.borderColor=C.primary}
                onBlur={e=>e.target.style.borderColor=C.border}/>
              {hasFilters&&(
                <button onClick={clearAll}
                  style={{fontSize:12,color:C.danger,background:"none",border:`1px solid ${C.danger}`,
                    borderRadius:6,padding:"7px 13px",cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
                  ✕ Clear Filters
                </button>
              )}
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)}
                style={{...iS({width:"auto",minWidth:185}),cursor:"pointer"}}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}>
                <option value="all">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select value={fPriority} onChange={e=>setFPriority(e.target.value)}
                style={{...iS({width:"auto",minWidth:145}),cursor:"pointer"}}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}>
                <option value="all">All Priorities</option>
                <option>Normal</option><option>High</option><option>Urgent</option>
              </select>
              <select value={fDate} onChange={e=>setFDate(e.target.value)}
                style={{...iS({width:"auto",minWidth:150}),cursor:"pointer"}}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}>
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13,color:C.textMid,userSelect:"none"}}>
                <input type="checkbox" checked={fMine} onChange={e=>setFMine(e.target.checked)} style={{accentColor:C.primary,width:15,height:15}}/>
                My requests only
              </label>
              <span style={{fontSize:12,color:C.textLight,marginLeft:"auto"}}>{filtered.length} of {visibleWOs.length} shown</span>
            </div>
          </div>

          {/* WO List */}
          {filtered.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:48,marginBottom:12}}>📋</div>
              <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:6}}>
                {visibleWOs.length===0?"No work orders yet":"No results match your filters"}
              </div>
              <div style={{fontSize:13,color:C.textMid,marginBottom:18}}>
                {visibleWOs.length===0?"Click 'New Work Order' to submit your first request.":"Try adjusting or clearing your filters."}
              </div>
              {visibleWOs.length===0
                ?<Btn icon="+" onClick={()=>setShowCreate(true)}>Create First Work Order</Btn>
                :<Btn variant="secondary" onClick={clearAll}>Clear All Filters</Btn>}
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filtered.map(wo=>(
                <WOCard key={wo.id} wo={wo} currentUser={currentUser} onClick={()=>setSelectedWO(wo)}/>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{background:C.surface,borderTop:`1px solid ${C.border}`,
          padding:"10px 24px",fontSize:11,color:C.textLight,textAlign:"center"}}>
          Work Order System · Manufacturing Operations · Data synced to cloud database
        </div>
      </div>

      {/* MODALS */}
      {showChangePw&&(
        <ChangePwModal user={currentUser} onSave={handleChangePw} onClose={()=>setShowChangePw(false)}/>
      )}
      {showCreate&&(
        <WOFormModal currentUser={currentUser} onClose={()=>setShowCreate(false)} onSave={handleCreateWO} allUsers={users}/>
      )}
      {liveWO&&(
        <WODetailModal wo={liveWO} currentUser={currentUser}
          onClose={()=>setSelectedWO(null)} onRefresh={loadData} users={users}/>
      )}
      {showUsers&&currentUser.is_admin&&(
        <UserManagementModal users={users} onClose={()=>setShowUsers(false)} onRefresh={async()=>{const u=await db.getUsers();setUsers(u||[]);}}/>
      )}
    </>
  );
}

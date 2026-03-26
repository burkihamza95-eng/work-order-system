import { useState, useReducer, useEffect, useRef } from "react";

// ─── GLOBAL STYLES ──────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; background: #f5f5f5; font-family: 'Inter', sans-serif; color: #212529; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f0f0f0; }
    ::-webkit-scrollbar-thumb { background: #c8c8c8; border-radius: 3px; }
    input, select, textarea, button { font-family: 'Inter', sans-serif; }
    @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes pop     { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
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

// Strict order — no skipping. Step 5 allows Under Production OR Outsource Services
const STATUS_SEQUENCE = [
  "Pending Review",
  "Request Review Done",
  "Material Required",
  "Material PR Shared",
  "Funds Required",
  "Under Production",
  "Complete",
];

// Returns which statuses can come next from current (no skipping)
const getNextAllowed = (currentStatus) => {
  const idx = STATUS_SEQUENCE.indexOf(currentStatus);
  if (idx < 0 || idx >= STATUS_SEQUENCE.length - 1) return [];
  const next = STATUS_SEQUENCE[idx + 1];
  if (next === "Under Production") return ["Under Production", "Outsource Services"];
  return [next];
};

// Can roll back if last status is not Complete and history has > 1 entry
const canRollback = (history) => {
  if (!history || history.length < 2) return false;
  const last = history[history.length - 1];
  return last.status !== "Complete" && last.status !== "Pending Review";
};

// ─── USERS ───────────────────────────────────────────────────────────────────
const PRIVILEGED_IDS = ["admin","sohail","abdullah","hassan","ahsan","fahadzeb"];

const DEFAULT_USERS = [
  { id:"admin",    name:"Admin",     role:"Admin",                avatar:"AD", color:"#714b67", isAdmin:true,  isSohail:false, isAhsan:false, password:"Admin@123"    },
  { id:"sohail",   name:"Sohail",    role:"Head of Manufacturing",avatar:"SO", color:"#0066cc", isAdmin:false, isSohail:true,  isAhsan:false, password:"Sohail@123"   },
  { id:"abdullah", name:"Abdullah",  role:"Operations",           avatar:"AB", color:"#017e84", isAdmin:false, isSohail:false, isAhsan:false, password:"Abdullah@123" },
  { id:"hassan",   name:"Hassan",    role:"Operations",           avatar:"HS", color:"#28a745", isAdmin:false, isSohail:false, isAhsan:false, password:"Hassan@123"   },
  { id:"ahsan",    name:"Ahsan",     role:"Procurement Officer",  avatar:"AH", color:"#e07b39", isAdmin:false, isSohail:false, isAhsan:true,  password:"Ahsan@123"    },
  { id:"fahadzeb", name:"Fahad Zeb", role:"Operations",           avatar:"FZ", color:"#8a4ac1", isAdmin:false, isSohail:false, isAhsan:false, password:"Fahad@123"    },
];

// ─── REDUCER ─────────────────────────────────────────────────────────────────
const SEED = { workOrders: [] };

function reducer(state, { type, payload }) {
  switch (type) {
    case "ADD_WO":    return { ...state, workOrders: [payload, ...state.workOrders] };
    case "UPDATE_WO": return { ...state, workOrders: state.workOrders.map(w => w.id === payload.id ? { ...w, ...payload } : w) };
    default:          return state;
  }
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
const genId    = () => "WO-" + String(Math.floor(Math.random() * 90000) + 10000);
const fmtDt    = d => d ? new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const todayStr = () => new Date().toISOString().split("T")[0];
const nowTs    = () => new Date().toLocaleString("en-GB", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" });

// ─── PRIMITIVE UI ─────────────────────────────────────────────────────────────

const Badge = ({ label, size = "sm" }) => {
  const s = STATUS_CONFIG[label] || { bg:"#f0f0f0", color:"#6c757d", dot:"#adb5bd" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:s.bg, color:s.color,
      borderRadius:20, padding:size==="sm"?"3px 10px":"5px 14px",
      fontSize:size==="sm"?11:12, fontWeight:600, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }} />
      {label}
    </span>
  );
};

const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled=false, style={} }) => {
  const V = {
    primary:  { bg:C.primary,    hov:C.primaryHov, text:"#fff",   border:C.primary  },
    secondary:{ bg:"#fff",       hov:"#f8f9fa",    text:C.text,   border:C.border   },
    danger:   { bg:"#fff",       hov:C.dangerBg,   text:C.danger, border:C.danger   },
    success:  { bg:C.success,    hov:"#218838",    text:"#fff",   border:C.success  },
    warning:  { bg:C.warning,    hov:"#cc6a2f",    text:"#fff",   border:C.warning  },
    ghost:    { bg:"transparent",hov:"#f5f5f5",    text:C.textMid,border:"transparent" },
  }[variant] || {};
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:6,
        background:hov&&!disabled?V.hov:V.bg, color:V.text, border:`1px solid ${V.border}`,
        borderRadius:6, padding:size==="sm"?"4px 11px":size==="lg"?"11px 22px":"7px 16px",
        fontSize:size==="sm"?12:13, fontWeight:500,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .15s", whiteSpace:"nowrap", ...style }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {icon && <span style={{ fontSize:13 }}>{icon}</span>}
      {children}
    </button>
  );
};

const inpStyle = (extra={}) => ({
  width:"100%", border:`1px solid ${C.border}`, borderRadius:6,
  padding:"8px 11px", fontSize:13, color:C.text, background:"#fff",
  outline:"none", boxSizing:"border-box", transition:"border .15s", ...extra
});

const TI = ({ label, required, hint, ...p }) => {
  const [f, setF] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:C.textMid, display:"flex", gap:4 }}>
        {label}{required && <span style={{ color:C.danger }}>*</span>}
      </label>}
      <input {...p} style={{ ...inpStyle(), borderColor:f?C.primary:C.border, boxShadow:f?`0 0 0 3px ${C.primary}22`:"none", ...p.style }}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)} />
      {hint && <span style={{ fontSize:11, color:C.textLight }}>{hint}</span>}
    </div>
  );
};

const TA = ({ label, required, hint, rows=3, ...p }) => {
  const [f, setF] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:600, color:C.textMid, display:"flex", gap:4 }}>
        {label}{required && <span style={{ color:C.danger }}>*</span>}
      </label>}
      <textarea {...p} rows={rows} style={{ ...inpStyle(), resize:"vertical", borderColor:f?C.primary:C.border, boxShadow:f?`0 0 0 3px ${C.primary}22`:"none", ...p.style }}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)} />
      {hint && <span style={{ fontSize:11, color:C.textLight }}>{hint}</span>}
    </div>
  );
};

const Modal = ({ title, onClose, children, width=580 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000,
    display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background:C.surface, borderRadius:12, width:"100%", maxWidth:width,
      maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.22)", animation:"pop .2s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"18px 24px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
          color:C.textMid, fontSize:22, lineHeight:1, padding:"2px 6px" }}>×</button>
      </div>
      <div style={{ padding:24 }}>{children}</div>
    </div>
  </div>
);

const Alert = ({ type="info", children }) => {
  const s = {
    info:    { bg:C.infoBg,    color:C.info,    icon:"ℹ️" },
    success: { bg:C.successBg, color:C.success, icon:"✅" },
    warning: { bg:C.amberBg,   color:"#856404", icon:"⚠️" },
    danger:  { bg:C.dangerBg,  color:C.danger,  icon:"🚫" },
  }[type] || {};
  return (
    <div style={{ background:s.bg, borderRadius:7, padding:"10px 14px",
      display:"flex", gap:8, alignItems:"flex-start", fontSize:13, color:s.color }}>
      <span>{s.icon}</span><span>{children}</span>
    </div>
  );
};

// ─── PROGRESS STEPPER ─────────────────────────────────────────────────────────
const ProgressStepper = ({ currentStatus }) => {
  const steps = [
    { label:"Submitted",   match:["Pending Review","Sent Back to Requester"] },
    { label:"Reviewed",    match:["Request Review Done"] },
    { label:"Materials",   match:["Material Required","Material PR Shared"] },
    { label:"Procurement", match:["Funds Required"] },
    { label:"Production",  match:["Under Production","Outsource Services"] },
    { label:"Complete",    match:["Complete"] },
  ];
  const cur = steps.findIndex(s => s.match.includes(currentStatus));
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {steps.map((step, i) => {
        const done   = i < cur;
        const active = i === cur;
        return (
          <div key={step.label} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:28, height:28, borderRadius:"50%",
                background:done?C.success:active?C.primary:"#e9ecef",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, color:(done||active)?"#fff":C.textLight,
                border:active?`2px solid ${C.primary}`:"none", transition:"all .3s" }}>
                {done ? "✓" : i+1}
              </div>
              <span style={{ fontSize:9, fontWeight:500, textAlign:"center", maxWidth:52, lineHeight:1.2,
                color:active?C.primary:done?C.success:C.textLight }}>{step.label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, background:done?C.success:"#e9ecef", margin:"0 2px", marginBottom:16 }}/>
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
const LoginPage = ({ users, onLogin, getPassword }) => {
  const [sel,  setSel]  = useState(null);
  const [pw,   setPw]   = useState("");
  const [show, setShow] = useState(false);
  const [err,  setErr]  = useState("");
  const ref = useRef();

  const pick = u => { setSel(u); setPw(""); setErr(""); setTimeout(() => ref.current?.focus(), 100); };
  const login = () => {
    if (!sel) { setErr("Please select a user."); return; }
    if (!pw)  { setErr("Please enter your password."); return; }
    if (pw !== getPassword(sel.id)) { setErr("Incorrect password."); setPw(""); return; }
    onLogin(sel);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0edf5,#e8e4f0,#f5f0f8)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:500 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:60, height:60, background:C.primary, borderRadius:14,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 14px", boxShadow:`0 10px 30px ${C.primary}55` }}>
            <span style={{ fontSize:28, color:"#fff" }}>🔧</span>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:C.primary }}>Work Order System</div>
          <div style={{ fontSize:13, color:C.textMid, marginTop:4 }}>Manufacturing Request &amp; Tracking</div>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
          padding:24, boxShadow:"0 8px 32px rgba(113,75,103,.12)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12,
            textTransform:"uppercase", letterSpacing:".06em" }}>Select Your Profile</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => pick(u)}
                style={{ padding:"11px 12px", border:`2px solid ${sel?.id===u.id?u.color:C.border}`,
                  borderRadius:10, background:sel?.id===u.id?`${u.color}12`:"#fff",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left", transition:"all .15s" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:u.color,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:12, fontWeight:700, flexShrink:0 }}>{u.avatar}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{u.name}</div>
                  <div style={{ fontSize:10, color:C.textMid }}>{u.role}</div>
                </div>
                {sel?.id===u.id && <span style={{ marginLeft:"auto", color:u.color, fontSize:16 }}>✓</span>}
              </button>
            ))}
          </div>
          {sel && (
            <div style={{ animation:"slideIn .2s ease", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8,
                textTransform:"uppercase", letterSpacing:".06em" }}>Password for {sel.name}</div>
              <div style={{ position:"relative" }}>
                <input ref={ref} type={show?"text":"password"} value={pw}
                  onChange={e => { setPw(e.target.value); setErr(""); }}
                  onKeyDown={e => e.key==="Enter" && login()}
                  placeholder="Enter password..."
                  style={{ ...inpStyle(), paddingRight:40 }}
                  onFocus={e => { e.target.style.borderColor=C.primary; e.target.style.boxShadow=`0 0 0 3px ${C.primary}22`; }}
                  onBlur={e => { e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
                <button onClick={() => setShow(v => !v)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textMid }}>
                  {show?"🙈":"👁️"}
                </button>
              </div>
            </div>
          )}
          {err && <div style={{ background:C.dangerBg, border:`1px solid #f5c6cb`, borderRadius:6,
            padding:"8px 12px", fontSize:12, color:C.danger, marginBottom:12 }}>⚠ {err}</div>}
          <button onClick={login} disabled={!sel||!pw}
            style={{ width:"100%", padding:"12px",
              background:sel&&pw?C.primary:"#e5e7eb", color:sel&&pw?"#fff":"#9ca3af",
              border:"none", borderRadius:8, fontSize:15, fontWeight:700,
              cursor:sel&&pw?"pointer":"not-allowed", transition:"all .2s",
              boxShadow:sel&&pw?`0 4px 14px ${C.primary}44`:"none" }}>
            {sel&&pw?`Sign in as ${sel.name} →`:"Select a profile & enter password"}
          </button>
        </div>
        <div style={{ textAlign:"center", fontSize:11, color:C.textLight, marginTop:14 }}>
          Work Order System · Manufacturing Operations
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// CHANGE PASSWORD MODAL
// ════════════════════════════════════════════════════════════════════════════
const ChangePwModal = ({ user, getPassword, savePassword, onClose }) => {
  const [old, setOld] = useState("");
  const [nw,  setNw]  = useState("");
  const [cnf, setCnf] = useState("");
  const [msg, setMsg] = useState(null);
  const [sO,  setSO]  = useState(false);
  const [sN,  setSN]  = useState(false);

  const handle = () => {
    if (old !== getPassword(user.id)) { setMsg({ t:"danger",  m:"Current password is incorrect." }); return; }
    if (nw.length < 6)               { setMsg({ t:"danger",  m:"New password must be at least 6 characters." }); return; }
    if (nw !== cnf)                  { setMsg({ t:"danger",  m:"Passwords do not match." }); return; }
    savePassword(user.id, nw);
    setMsg({ t:"success", m:"Password changed successfully!" });
    setOld(""); setNw(""); setCnf("");
  };

  const PwRow = ({ label, val, set, show, setShow }) => (
    <div>
      <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>{label}</div>
      <div style={{ position:"relative" }}>
        <input type={show?"text":"password"} value={val} onChange={e => set(e.target.value)}
          style={{ ...inpStyle(), paddingRight:36 }}
          onFocus={e => e.target.style.borderColor=C.primary}
          onBlur={e => e.target.style.borderColor=C.border} />
        <button onClick={() => setShow(v => !v)}
          style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
            background:"none", border:"none", cursor:"pointer", fontSize:14, color:C.textMid }}>
          {show?"🙈":"👁️"}
        </button>
      </div>
    </div>
  );

  return (
    <Modal title="🔒 Change Password" onClose={onClose} width={420}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <PwRow label="Current Password"          val={old} set={setOld} show={sO} setShow={setSO} />
        <PwRow label="New Password (min 6 chars)" val={nw}  set={setNw}  show={sN} setShow={setSN} />
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Confirm New Password</div>
          <input type="password" value={cnf} onChange={e => setCnf(e.target.value)} style={inpStyle()}
            onFocus={e => e.target.style.borderColor=C.primary}
            onBlur={e => e.target.style.borderColor=C.border} />
        </div>
        {msg && <Alert type={msg.t}>{msg.m}</Alert>}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handle} disabled={!old||!nw||!cnf}>Update Password</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER FORM — create + edit/resubmit
// ════════════════════════════════════════════════════════════════════════════
const WOFormModal = ({ currentUser, existing, onClose, onSave }) => {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    itemName:        existing?.itemName        || "",
    qty:             existing?.qty             || "",
    unit:            existing?.unit            || "",
    requirementDate: existing?.requirementDate || "",
    description:     existing?.description     || "",
    priority:        existing?.priority        || "Normal",
    notes:           existing?.notes           || "",
    files:           existing?.files           || [],
  });
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.itemName.trim())                     e.itemName = "Item name is required.";
    if (!form.qty || isNaN(form.qty) || +form.qty<=0) e.qty = "Valid quantity is required.";
    if (!form.requirementDate)                     e.requirementDate = "Requirement date is required.";
    if (!form.description.trim())                  e.description = "Description is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFiles = e => {
    const raw = Array.from(e.target.files || []);
    raw.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => {
        setForm(prev => {
          const already = prev.files.find(x => x.name===f.name && x.size===f.size);
          if (already) return prev;
          return { ...prev, files:[...prev.files, { name:f.name, size:f.size, type:f.type, dataUrl:ev.target.result }] };
        });
      };
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeFile = idx => setForm(p => ({ ...p, files:p.files.filter((_,i) => i!==idx) }));

  const handleSave = () => {
    if (!validate()) return;
    if (isEdit) {
      onSave({
        ...existing,
        itemName:        form.itemName.trim(),
        qty:             form.qty,
        unit:            form.unit.trim() || "pcs",
        requirementDate: form.requirementDate,
        description:     form.description.trim(),
        priority:        form.priority,
        notes:           form.notes.trim(),
        files:           form.files,
        status:          "Pending Review",
        sohailAction:    null,
        sohailRemark:    "",
        statusHistory:   [...existing.statusHistory, {
          status:"Pending Review", by:currentUser.name, at:nowTs(),
          remarks:"Form revised and resubmitted after being sent back.",
        }],
      });
    } else {
      onSave({
        id:              genId(),
        itemName:        form.itemName.trim(),
        qty:             form.qty,
        unit:            form.unit.trim() || "pcs",
        requirementDate: form.requirementDate,
        requestDate:     todayStr(),
        requestedAt:     nowTs(),
        description:     form.description.trim(),
        priority:        form.priority,
        notes:           form.notes.trim(),
        files:           form.files,
        requestedBy:     currentUser.id,
        requestedByName: currentUser.name,
        status:          "Pending Review",
        statusHistory:   [{ status:"Pending Review", by:currentUser.name, at:nowTs(), remarks:"Work order created." }],
        sohailAction:    null,
        sohailRemark:    "",
        isComplete:      false,
      });
    }
    onClose();
  };

  const Err = ({ msg }) => msg ? <div style={{ fontSize:11, color:C.danger, marginTop:2 }}>{msg}</div> : null;

  return (
    <Modal title={isEdit?"✏️ Edit & Resubmit Work Order":"📝 New Work Order Request"} onClose={onClose} width={660}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        {isEdit && (
          <Alert type="warning">
            You are editing a work order that was sent back. After saving it will return to <strong>Pending Review</strong>.
          </Alert>
        )}
        {/* Item / Qty / Unit */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 80px", gap:12 }}>
          <div>
            <TI label="Item Name" required value={form.itemName} onChange={set("itemName")} placeholder="e.g. Bracket Assembly Type-A" />
            <Err msg={errors.itemName} />
          </div>
          <div>
            <TI label="Quantity" required type="number" min="1" value={form.qty} onChange={set("qty")} placeholder="10" />
            <Err msg={errors.qty} />
          </div>
          <TI label="Unit" value={form.unit} onChange={set("unit")} placeholder="pcs" />
        </div>
        {/* Dates + Priority */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Request Date</div>
            <div style={{ ...inpStyle(), background:"#f9fafb", color:C.textMid, display:"flex", alignItems:"center", gap:6 }}>
              📅 {fmtDt(existing?.requestDate || todayStr())}
            </div>
          </div>
          <div>
            <TI label="Requirement Date" required type="date" value={form.requirementDate} onChange={set("requirementDate")} />
            <Err msg={errors.requirementDate} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Priority</div>
            <select value={form.priority} onChange={set("priority")}
              style={{ ...inpStyle(), cursor:"pointer" }}
              onFocus={e => e.target.style.borderColor=C.primary}
              onBlur={e => e.target.style.borderColor=C.border}>
              <option>Normal</option><option>High</option><option>Urgent</option>
            </select>
          </div>
        </div>
        {/* Description */}
        <div>
          <TA label="Work Order Description" required rows={4} value={form.description} onChange={set("description")}
            placeholder="Describe what needs to be manufactured — specifications, material, finish, dimensions, etc." />
          <Err msg={errors.description} />
        </div>
        {/* Notes */}
        <TA label="Additional Notes / Instructions" rows={2} value={form.notes} onChange={set("notes")}
          placeholder="Any extra information, references, or special handling instructions..." />
        {/* File upload */}
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:6 }}>
            Attachments / Drawings
            <span style={{ fontSize:11, fontWeight:400, color:C.textLight, marginLeft:6 }}>(optional — all files are downloadable)</span>
          </div>
          <div style={{ border:`2px dashed ${C.border}`, borderRadius:8, padding:"14px 16px",
            display:"flex", flexDirection:"column", gap:10, background:"#fafafa" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input ref={fileRef} type="file" multiple
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.xlsx,.docx,.sldprt,.SLDPRT,.step,.STEP,.iges"
                onChange={handleFiles} style={{ display:"none" }} />
              <Btn variant="secondary" icon="📎" onClick={() => fileRef.current?.click()}>Choose Files</Btn>
              <span style={{ fontSize:11, color:C.textLight }}>PDF, PNG, JPG, DWG, DXF, SLDPRT, STEP, Excel, Word</span>
            </div>
            {form.files.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {form.files.map((f, i) => (
                  <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:6,
                    padding:"4px 10px", fontSize:11, display:"flex", alignItems:"center", gap:6 }}>
                    📄
                    <span style={{ maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                    <button onClick={() => removeFile(i)} style={{ background:"none", border:"none",
                      cursor:"pointer", color:C.danger, fontSize:14, lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4, borderTop:`1px solid ${C.border}` }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn icon={isEdit?"🔄":"📤"} onClick={handleSave}>
            {isEdit?"Resubmit Work Order":"Submit Work Order"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER DETAIL MODAL
// ════════════════════════════════════════════════════════════════════════════
const WODetailModal = ({ wo, currentUser, dispatch, onClose }) => {
  const [statusVal,       setStatusVal]       = useState("");
  const [remarksVal,      setRemarksVal]       = useState("");
  const [sohailAct,       setSohailAct]       = useState("ok");
  const [sohailRmk,       setSohailRmk]       = useState("");
  const [showEdit,        setShowEdit]        = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const isRequester  = wo.requestedBy === currentUser.id;
  const isPrivileged = PRIVILEGED_IDS.includes(currentUser.id);
  const isSentBack   = wo.status === "Sent Back to Requester";
  const isComplete   = wo.isComplete;
  const needsSohail  = wo.sohailAction === null && wo.status === "Pending Review";

  const nextAllowed = getNextAllowed(wo.status);
  // Funds Required: only Ahsan or Admin can set; others see it disabled
  const allowedNext = nextAllowed.filter(s => {
    if (s === "Funds Required") return currentUser.isAhsan || currentUser.isAdmin;
    return true;
  });

  // Gate: once Material PR Shared, MUST wait for Ahsan to set Funds Required
  const awaitingFunds = wo.status === "Material PR Shared";
  const userCanSetFunds = currentUser.isAhsan || currentUser.isAdmin;

  const handleSohailReview = () => {
    const ns = sohailAct === "ok" ? "Request Review Done" : "Sent Back to Requester";
    dispatch({ type:"UPDATE_WO", payload:{
      id: wo.id, sohailAction: sohailAct, sohailRemark: sohailRmk.trim(), status: ns,
      statusHistory: [...wo.statusHistory, {
        status: ns, by: currentUser.name, at: nowTs(),
        remarks: sohailRmk.trim() || (sohailAct==="ok" ? "Reviewed and approved." : "Sent back for revision."),
      }],
    }});
    setSohailRmk("");
  };

  const handleStatusUpdate = () => {
    if (!statusVal) return;
    const done = statusVal === "Complete";
    dispatch({ type:"UPDATE_WO", payload:{
      id: wo.id, status: statusVal, isComplete: done,
      statusHistory: [...wo.statusHistory, {
        status: statusVal, by: currentUser.name, at: nowTs(),
        remarks: remarksVal.trim() || `Status updated to ${statusVal}.`,
      }],
    }});
    setStatusVal(""); setRemarksVal("");
  };

  const handleRollback = () => {
    const prev = wo.statusHistory[wo.statusHistory.length - 2];
    dispatch({ type:"UPDATE_WO", payload:{
      id: wo.id, status: prev.status, isComplete: false,
      sohailAction: ["Pending Review","Sent Back to Requester"].includes(prev.status) ? null : wo.sohailAction,
      statusHistory: [...wo.statusHistory, {
        status: prev.status, by: currentUser.name, at: nowTs(),
        remarks: `Rolled back to: ${prev.status}`,
      }],
    }});
    setConfirmRollback(false);
  };

  const downloadFile = f => {
    if (f.dataUrl) {
      const a = document.createElement("a");
      a.href = f.dataUrl; a.download = f.name; a.click();
    } else {
      alert("File data is not available for download. This file was attached before download support was added.");
    }
  };

  const pColors = { Normal:"#6c757d", High:"#e07b39", Urgent:"#dc3545" };

  return (
    <Modal title={`Work Order — ${wo.id}`} onClose={onClose} width={780}>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

        {/* Header strip */}
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center",
          padding:"12px 16px", background:"#f9fafb", borderRadius:8 }}>
          <Badge label={wo.status} size="md" />
          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
            background:pColors[wo.priority]+"20", color:pColors[wo.priority] }}>⚡ {wo.priority} Priority</span>
          <span style={{ fontSize:12, color:C.textMid }}>By: <strong>{wo.requestedByName}</strong></span>
          <span style={{ fontSize:12, color:C.textMid, marginLeft:"auto" }}>{wo.requestedAt}</span>
        </div>

        {/* Notifications */}
        {isComplete && isRequester && <Alert type="success">🎉 Your work order <strong>{wo.id}</strong> has been <strong>Completed</strong>!</Alert>}
        {isComplete && !isRequester && <Alert type="success">✅ This work order is <strong>Complete</strong> and locked.</Alert>}
        {isSentBack && isRequester && <Alert type="warning">🔄 Your work order was sent back. Click <strong>Edit &amp; Resubmit</strong> below to make changes and resubmit for approval.</Alert>}
        {awaitingFunds && !userCanSetFunds && isPrivileged && <Alert type="info">⏳ Waiting for <strong>Ahsan (Procurement Officer)</strong> to set <strong>Funds Required</strong> before this can proceed to production.</Alert>}

        {/* Stepper */}
        <ProgressStepper currentStatus={wo.status} />

        {/* Details grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          {[
            ["Item Name",        wo.itemName],
            ["Quantity",         `${wo.qty} ${wo.unit}`],
            ["Request Date",     fmtDt(wo.requestDate)],
            ["Requirement Date", fmtDt(wo.requirementDate)],
            ["Priority",         wo.priority],
            ["Requested By",     wo.requestedByName],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ background:"#fafafa", borderRadius:7, padding:"10px 14px", border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.textMid, fontWeight:500, marginBottom:3 }}>{lbl}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6 }}>DESCRIPTION</div>
          <div style={{ background:"#fafafa", border:`1px solid ${C.border}`, borderRadius:7,
            padding:"12px 14px", fontSize:13, lineHeight:1.6 }}>{wo.description}</div>
        </div>

        {/* Notes */}
        {wo.notes && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6 }}>ADDITIONAL NOTES</div>
            <div style={{ background:"#fffbeb", border:`1px solid #fde68a`, borderRadius:7,
              padding:"10px 14px", fontSize:13, color:"#92400e" }}>{wo.notes}</div>
          </div>
        )}

        {/* Files — downloadable */}
        {wo.files?.length > 0 && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8 }}>
              ATTACHMENTS <span style={{ fontSize:11, fontWeight:400, color:C.textLight }}>(click to download)</span>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {wo.files.map((f, i) => (
                <button key={i} onClick={() => downloadFile(f)}
                  style={{ background:"#f0edf5", border:`1px solid ${C.primary}44`, borderRadius:6,
                    padding:"6px 13px", fontSize:11, display:"flex", gap:6, alignItems:"center",
                    cursor:"pointer", color:C.primary, fontWeight:600, transition:"all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background=C.primaryLight}
                  onMouseLeave={e => e.currentTarget.style.background="#f0edf5"}>
                  📥 {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>STATUS HISTORY</div>
          <div style={{ display:"flex", flexDirection:"column" }}>
            {wo.statusHistory.map((entry, i) => (
              <div key={i} style={{ display:"flex", gap:12 }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%",
                    background:i===wo.statusHistory.length-1?C.primary:C.success,
                    border:"2px solid #fff", boxShadow:"0 0 0 2px #e0e0e0",
                    flexShrink:0, marginTop:4 }} />
                  {i < wo.statusHistory.length-1 && (
                    <div style={{ width:2, flex:1, background:"#e0e0e0", minHeight:20 }} />
                  )}
                </div>
                <div style={{ paddingBottom:14, flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:3 }}>
                    <Badge label={entry.status} />
                    <span style={{ fontSize:11, color:C.textMid }}>by <strong>{entry.by}</strong> · {entry.at}</span>
                  </div>
                  {entry.remarks && (
                    <div style={{ fontSize:12, color:C.text, background:"#f9fafb",
                      border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 10px", marginTop:4 }}>
                      💬 {entry.remarks}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTION PANELS ── */}

        {/* 1. Edit & Resubmit */}
        {isSentBack && isRequester && !isComplete && (
          <div style={{ background:"#fffbeb", border:`1px solid #fde68a`, borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#92400e", marginBottom:10 }}>
              ✏️ This work order needs your revision before it can proceed.
            </div>
            <Btn variant="warning" icon="✏️" onClick={() => setShowEdit(true)}>Edit &amp; Resubmit</Btn>
          </div>
        )}

        {/* 2. Sohail Review */}
        {needsSohail && currentUser.isSohail && !isComplete && (
          <div style={{ background:"#f3eef1", border:`1px solid ${C.primary}33`, borderRadius:10, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:14 }}>🔍 Manufacturing Head Review</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[
                  { val:"ok",       label:"✅ Approve / OK",           color:C.success },
                  { val:"sendback", label:"🔄 Send Back to Requester", color:C.warning },
                ].map(opt => (
                  <label key={opt.val} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                    padding:"10px 14px", border:`2px solid ${sohailAct===opt.val?opt.color:C.border}`,
                    borderRadius:8, background:"#fff", transition:"all .15s" }}>
                    <input type="radio" checked={sohailAct===opt.val} onChange={() => setSohailAct(opt.val)}
                      style={{ accentColor:opt.color }} />
                    <span style={{ fontSize:13, fontWeight:600, color:sohailAct===opt.val?opt.color:C.text }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Remarks</div>
                <textarea value={sohailRmk} onChange={e => setSohailRmk(e.target.value)} rows={3}
                  placeholder="Add review notes..." style={{ ...inpStyle(), resize:"none" }}
                  onFocus={e => e.target.style.borderColor=C.primary}
                  onBlur={e => e.target.style.borderColor=C.border} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <Btn onClick={handleSohailReview}
                variant={sohailAct==="ok"?"success":"secondary"}
                icon={sohailAct==="ok"?"✅":"🔄"}>
                {sohailAct==="ok"?"Submit Approval":"Send Back"}
              </Btn>
            </div>
          </div>
        )}

        {/* 3. Status Update — strict sequence + funds gate */}
        {wo.sohailAction==="ok" && !isComplete && !isSentBack && isPrivileged && (
          <div style={{ background:"#f8f9fa", border:`1px solid ${C.border}`, borderRadius:10, padding:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>⚙️ Update Work Order Status</div>

            {/* Funds gate: only Ahsan can move from Material PR Shared → Funds Required */}
            {awaitingFunds && !userCanSetFunds && (
              <Alert type="warning">
                ⏳ This step requires <strong>Ahsan (Procurement Officer)</strong> to set <strong>Funds Required</strong>. You cannot advance this work order until that is done.
              </Alert>
            )}

            {awaitingFunds && userCanSetFunds && (
              <Alert type="info">
                As Procurement Officer, you must set the status to <strong>Funds Required</strong>. This step cannot be skipped or done by anyone else.
              </Alert>
            )}

            {(!awaitingFunds || userCanSetFunds) && allowedNext.length > 0 && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:awaitingFunds?12:0 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Next Status</div>
                    <select value={statusVal} onChange={e => setStatusVal(e.target.value)}
                      style={{ ...inpStyle(), cursor:"pointer" }}
                      onFocus={e => e.target.style.borderColor=C.primary}
                      onBlur={e => e.target.style.borderColor=C.border}>
                      <option value="">— Select next status —</option>
                      {allowedNext.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div style={{ fontSize:11, color:C.textLight, marginTop:4 }}>
                      ⚠ Statuses must follow the strict order — no skipping allowed.
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Remarks</div>
                    <textarea value={remarksVal} onChange={e => setRemarksVal(e.target.value)} rows={3}
                      placeholder="Add update notes..."
                      style={{ ...inpStyle(), resize:"none" }}
                      onFocus={e => e.target.style.borderColor=C.primary}
                      onBlur={e => e.target.style.borderColor=C.border} />
                  </div>
                </div>
                {statusVal === "Complete" && (
                  <div style={{ marginTop:10 }}>
                    <Alert type="danger">⚠ Marking as <strong>Complete</strong> is <strong>permanent and cannot be reversed</strong>.</Alert>
                  </div>
                )}
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
                  <Btn onClick={handleStatusUpdate} disabled={!statusVal}
                    variant={statusVal==="Complete"?"success":"primary"}
                    icon={statusVal==="Complete"?"🏁":"💾"}>
                    {statusVal==="Complete"?"Mark Complete (Final)":"Save Status Update"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. Rollback Panel */}
        {!isComplete && isPrivileged && canRollback(wo.statusHistory) && wo.sohailAction==="ok" && (
          <div style={{ background:"#fff8f0", border:`1px solid #fbd7b0`, borderRadius:10, padding:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.warning, marginBottom:8 }}>↩ Roll Back Status</div>
            <div style={{ fontSize:12, color:C.textMid, marginBottom:10 }}>
              This will roll back to: <strong>{wo.statusHistory[wo.statusHistory.length-2]?.status}</strong>
              <span style={{ marginLeft:8, fontSize:11, color:C.textLight }}>(A rollback entry will be added to the history log)</span>
            </div>
            {!confirmRollback ? (
              <Btn variant="warning" icon="↩" onClick={() => setConfirmRollback(true)}>Roll Back to Previous Status</Btn>
            ) : (
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <span style={{ fontSize:13, color:C.danger, fontWeight:600 }}>Are you sure?</span>
                <Btn variant="danger" onClick={handleRollback}>Yes, Roll Back</Btn>
                <Btn variant="secondary" onClick={() => setConfirmRollback(false)}>Cancel</Btn>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Nested edit modal */}
      {showEdit && (
        <WOFormModal
          currentUser={currentUser}
          existing={wo}
          onClose={() => setShowEdit(false)}
          onSave={updated => {
            dispatch({ type:"UPDATE_WO", payload:updated });
            setShowEdit(false);
            onClose();
          }}
        />
      )}
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER CARD
// ════════════════════════════════════════════════════════════════════════════
const WOCard = ({ wo, currentUser, onClick }) => {
  const pColors    = { Normal:"#6c757d", High:"#e07b39", Urgent:"#dc3545" };
  const needsReview = wo.status==="Pending Review" && currentUser.isSohail;
  const sentBack    = wo.status==="Sent Back to Requester" && wo.requestedBy===currentUser.id;
  const hl          = needsReview || sentBack;

  return (
    <div onClick={onClick}
      style={{ background:C.surface,
        border:`1px solid ${hl?C.primary+"55":C.border}`,
        borderLeft:`4px solid ${STATUS_CONFIG[wo.status]?.dot || C.textLight}`,
        borderRadius:10, padding:"15px 18px", cursor:"pointer",
        boxShadow:hl?"0 2px 10px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)",
        transition:"all .15s", animation:"slideIn .3s ease" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow=hl?"0 2px 10px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)"; e.currentTarget.style.transform="translateY(0)"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontFamily:"monospace", fontSize:11, color:C.primary, fontWeight:700 }}>{wo.id}</span>
          {needsReview && <span style={{ fontSize:10, background:C.primary, color:"#fff", borderRadius:10, padding:"1px 7px", fontWeight:600 }}>NEEDS REVIEW</span>}
          {sentBack    && <span style={{ fontSize:10, background:C.warning,  color:"#fff", borderRadius:10, padding:"1px 7px", fontWeight:600 }}>ACTION REQUIRED</span>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {wo.isComplete && <span>🏁</span>}
          <Badge label={wo.status} />
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>{wo.itemName}</div>
      <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:pColors[wo.priority], fontWeight:600 }}>⚡ {wo.priority}</span>
        <span style={{ fontSize:12, color:C.textMid }}>Qty: <strong>{wo.qty} {wo.unit}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>By: <strong>{wo.requestedByName}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>Required: <strong>{fmtDt(wo.requirementDate)}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>Submitted: {wo.requestedAt}</span>
        {wo.files?.length > 0 && <span style={{ fontSize:12, color:C.primary }}>📎 {wo.files.length} file{wo.files.length>1?"s":""}</span>}
      </div>
      {wo.description && (
        <div style={{ fontSize:12, color:C.textMid, marginTop:6,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {wo.description}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {

  // ── Passwords — stored with versioned key, never cleared automatically ──
  const loadPw = () => {
    try { const p = localStorage.getItem("wos_pw_v2"); return p ? JSON.parse(p) : {}; }
    catch(e) { return {}; }
  };
  const [passwords, setPasswords] = useState(loadPw);
  const getPassword  = id => passwords[id] || DEFAULT_USERS.find(u => u.id===id)?.password || "";
  const savePassword = (id, pw) => {
    const u = { ...passwords, [id]: pw };
    setPasswords(u);
    try { localStorage.setItem("wos_pw_v2", JSON.stringify(u)); } catch(e) {}
  };

  // ── Work order state — versioned key so upgrades never wipe data ─────────
  const loadState = () => {
    try {
      // Try new versioned key first
      const v2 = localStorage.getItem("wos_data_v2");
      if (v2) return JSON.parse(v2);
      // Migrate from old key if present
      const old = localStorage.getItem("wo_state") || localStorage.getItem("wo_state_v2");
      if (old) {
        const parsed = JSON.parse(old);
        // Save under new key so future loads use it
        localStorage.setItem("wos_data_v2", old);
        return parsed;
      }
    } catch(e) {}
    return SEED;
  };

  const [S, dispatch] = useReducer(reducer, undefined, loadState);

  // Persist on every change — data is NEVER auto-cleared on login/refresh
  useEffect(() => {
    try { localStorage.setItem("wos_data_v2", JSON.stringify(S)); } catch(e) {}
  }, [S]);

  // ── Auth — session only (login/logout), does NOT touch data ─────────────
  const [currentUser,  setCurrentUser]  = useState(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [selectedWO,   setSelectedWO]   = useState(null);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [fStatus,   setFStatus]   = useState("all");
  const [fPriority, setFPriority] = useState("all");
  const [fDate,     setFDate]     = useState("all");
  const [fMine,     setFMine]     = useState(false);
  const [search,    setSearch]    = useState("");

  if (!currentUser) return (
    <>
      <GlobalStyles />
      <LoginPage users={DEFAULT_USERS} onLogin={setCurrentUser} getPassword={getPassword} />
    </>
  );

  const isPrivileged = PRIVILEGED_IDS.includes(currentUser.id);

  // Privileged users see ALL work orders; others see only their own
  const visibleWOs = isPrivileged
    ? S.workOrders
    : S.workOrders.filter(w => w.requestedBy === currentUser.id);

  const withinDate = wo => {
    if (fDate === "all") return true;
    const d   = new Date(wo.requestDate);
    const now = new Date();
    if (fDate === "today") return d.toDateString() === now.toDateString();
    if (fDate === "week")  { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (fDate === "month") { const m = new Date(now); m.setMonth(now.getMonth()-1); return d >= m; }
    return true;
  };

  const filtered = visibleWOs
    .filter(w => fStatus==="all"   || w.status===fStatus)
    .filter(w => fPriority==="all" || w.priority===fPriority)
    .filter(w => withinDate(w))
    .filter(w => !fMine || w.requestedBy===currentUser.id)
    .filter(w => !search ||
      w.itemName.toLowerCase().includes(search.toLowerCase()) ||
      w.id.toLowerCase().includes(search.toLowerCase()) ||
      w.requestedByName.toLowerCase().includes(search.toLowerCase())
    );

  const myWOs       = S.workOrders.filter(w => w.requestedBy===currentUser.id);
  const pendingWOs  = visibleWOs.filter(w => w.status==="Pending Review");
  const completeWOs = visibleWOs.filter(w => w.isComplete);
  const actionNeeded = myWOs.filter(w => w.status==="Sent Back to Requester").length;
  const needsReview  = currentUser.isSohail ? pendingWOs.length : 0;

  const liveWO     = selectedWO ? S.workOrders.find(w => w.id===selectedWO.id) : null;
  const hasFilters = fStatus!=="all"||fPriority!=="all"||fDate!=="all"||fMine||search;
  const clearAll   = () => { setFStatus("all"); setFPriority("all"); setFDate("all"); setFMine(false); setSearch(""); };

  return (
    <>
      <GlobalStyles />
      <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:C.bg }}>

        {/* TOPBAR */}
        <div style={{ background:C.primary, color:"#fff", padding:"0 24px",
          display:"flex", alignItems:"center", height:56, gap:14, flexShrink:0,
          boxShadow:"0 2px 8px rgba(113,75,103,.3)" }}>
          <span style={{ fontSize:20 }}>🔧</span>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:".02em" }}>Work Order System</div>
          <div style={{ flex:1 }} />
          {needsReview > 0 && (
            <div style={{ background:"#dc3545", color:"#fff", borderRadius:20,
              padding:"4px 12px", fontSize:12, fontWeight:700, animation:"pulse 2s infinite" }}>
              ⚠ {needsReview} Pending Review
            </div>
          )}
          {actionNeeded > 0 && (
            <div style={{ background:C.warning, color:"#fff", borderRadius:20,
              padding:"4px 12px", fontSize:12, fontWeight:700, animation:"pulse 2s infinite" }}>
              ✏️ {actionNeeded} Action Required
            </div>
          )}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:currentUser.color,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontSize:12, fontWeight:700 }}>{currentUser.avatar}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>{currentUser.name}</div>
              <div style={{ fontSize:10, opacity:.75 }}>{currentUser.role}</div>
            </div>
            <button onClick={() => setShowChangePw(true)}
              style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
                color:"#fff", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", marginLeft:4 }}>
              🔒 Password
            </button>
            <button onClick={() => setCurrentUser(null)}
              style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
                color:"#fff", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>
              Logout
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ flex:1, maxWidth:1200, width:"100%", margin:"0 auto", padding:24, boxSizing:"border-box" }}>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Total Work Orders", value:visibleWOs.length,  icon:"📋", color:C.primary  },
              { label:"My Requests",       value:myWOs.length,       icon:"👤", color:"#0066cc"  },
              { label:"Pending Review",    value:pendingWOs.length,  icon:"⏳", color:C.warning  },
              { label:"Completed",         value:completeWOs.length, icon:"✅", color:C.success  },
            ].map(k => (
              <div key={k.label} style={{ background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:10, padding:"16px 20px", display:"flex", gap:14, alignItems:"center",
                boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
                <div style={{ width:42, height:42, borderRadius:10, background:`${k.color}18`,
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize:22, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:11, color:C.textMid, marginTop:3, fontWeight:500 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter toolbar */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
            padding:16, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:12 }}>
              <Btn icon="+" size="lg" onClick={() => setShowCreate(true)}>New Work Order</Btn>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍  Search by item name, WO ID or requester..."
                style={{ ...inpStyle({ flex:"1 1 220px", minWidth:200 }) }}
                onFocus={e => e.target.style.borderColor=C.primary}
                onBlur={e => e.target.style.borderColor=C.border} />
              {hasFilters && (
                <button onClick={clearAll}
                  style={{ fontSize:12, color:C.danger, background:"none", border:`1px solid ${C.danger}`,
                    borderRadius:6, padding:"7px 13px", cursor:"pointer", fontWeight:500, whiteSpace:"nowrap" }}>
                  ✕ Clear Filters
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              {/* Status */}
              <select value={fStatus} onChange={e => setFStatus(e.target.value)}
                style={{ ...inpStyle({ width:"auto", minWidth:185 }), cursor:"pointer" }}
                onFocus={e => e.target.style.borderColor=C.primary}
                onBlur={e => e.target.style.borderColor=C.border}>
                <option value="all">All Statuses</option>
                {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {/* Priority */}
              <select value={fPriority} onChange={e => setFPriority(e.target.value)}
                style={{ ...inpStyle({ width:"auto", minWidth:145 }), cursor:"pointer" }}
                onFocus={e => e.target.style.borderColor=C.primary}
                onBlur={e => e.target.style.borderColor=C.border}>
                <option value="all">All Priorities</option>
                <option>Normal</option><option>High</option><option>Urgent</option>
              </select>
              {/* Date */}
              <select value={fDate} onChange={e => setFDate(e.target.value)}
                style={{ ...inpStyle({ width:"auto", minWidth:150 }), cursor:"pointer" }}
                onFocus={e => e.target.style.borderColor=C.primary}
                onBlur={e => e.target.style.borderColor=C.border}>
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
              {/* Mine only */}
              <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer",
                fontSize:13, color:C.textMid, userSelect:"none" }}>
                <input type="checkbox" checked={fMine} onChange={e => setFMine(e.target.checked)}
                  style={{ accentColor:C.primary, width:15, height:15 }} />
                My requests only
              </label>
              <span style={{ fontSize:12, color:C.textLight, marginLeft:"auto" }}>
                {filtered.length} of {visibleWOs.length} shown
              </span>
            </div>
          </div>

          {/* WO list */}
          {filtered.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px", background:C.surface,
              borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:6 }}>
                {visibleWOs.length===0 ? "No work orders yet" : "No results match your filters"}
              </div>
              <div style={{ fontSize:13, color:C.textMid, marginBottom:18 }}>
                {visibleWOs.length===0
                  ? "Click 'New Work Order' to submit your first manufacturing request."
                  : "Try adjusting or clearing your filters."}
              </div>
              {visibleWOs.length===0
                ? <Btn icon="+" onClick={() => setShowCreate(true)}>Create First Work Order</Btn>
                : <Btn variant="secondary" onClick={clearAll}>Clear All Filters</Btn>
              }
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(wo => (
                <WOCard key={wo.id} wo={wo} currentUser={currentUser} onClick={() => setSelectedWO(wo)} />
              ))}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`,
          padding:"10px 24px", fontSize:11, color:C.textLight, textAlign:"center" }}>
          Work Order System · Manufacturing Operations ·{" "}
          {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
        </div>
      </div>

      {/* MODALS */}
      {showChangePw && (
        <ChangePwModal user={currentUser} getPassword={getPassword}
          savePassword={savePassword} onClose={() => setShowChangePw(false)} />
      )}
      {showCreate && (
        <WOFormModal currentUser={currentUser} onClose={() => setShowCreate(false)}
          onSave={wo => dispatch({ type:"ADD_WO", payload:wo })} />
      )}
      {liveWO && (
        <WODetailModal wo={liveWO} currentUser={currentUser}
          dispatch={dispatch} onClose={() => setSelectedWO(null)} />
      )}
    </>
  );
}

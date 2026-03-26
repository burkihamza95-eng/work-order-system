import { useState, useReducer, useEffect, useRef } from "react";

// ─── GLOBAL STYLES ─────────────────────────────────────────────────────────
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
    @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes spin    { to{transform:rotate(360deg)} }
    @keyframes pop     { 0%{transform:scale(.92);opacity:0} 100%{transform:scale(1);opacity:1} }
  `}</style>
);

// ─── THEME ─────────────────────────────────────────────────────────────────
const C = {
  bg:           "#f5f5f5",
  surface:      "#ffffff",
  border:       "#e0e0e0",
  text:         "#212529",
  textMid:      "#6c757d",
  textLight:    "#adb5bd",
  primary:      "#714b67",
  primaryHov:   "#5c3d55",
  primaryLight: "#f3eef1",
  success:      "#28a745",
  successBg:    "#d4edda",
  warning:      "#e07b39",
  warningBg:    "#fdebd0",
  danger:       "#dc3545",
  dangerBg:     "#f8d7da",
  info:         "#17a2b8",
  infoBg:       "#d1ecf1",
  amber:        "#ffc107",
  amberBg:      "#fff3cd",
};

// ─── STATUS CONFIG ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  "Pending Review":       { color:"#6c757d", bg:"#f0f0f0",      dot:"#adb5bd",   step:0 },
  "Request Review Done":  { color:"#0c5460", bg:"#d1ecf1",      dot:"#17a2b8",   step:1 },
  "Sent Back to Requester":{ color:"#856404",bg:"#fff3cd",      dot:"#ffc107",   step:1 },
  "Material Required":    { color:"#7d3c00", bg:"#fdebd0",      dot:"#e07b39",   step:2 },
  "Material PR Shared":   { color:"#004085", bg:"#cce5ff",      dot:"#007bff",   step:3 },
  "Funds Required":       { color:"#721c24", bg:"#f8d7da",      dot:"#dc3545",   step:4 },
  "Under Production":     { color:"#004085", bg:"#cce5ff",      dot:"#007bff",   step:5 },
  "Outsource Services":   { color:"#5c2d91", bg:"#e8d5f5",      dot:"#8a4ac1",   step:5 },
  "Complete":             { color:"#155724", bg:"#d4edda",      dot:"#28a745",   step:6 },
};

const STATUS_OPTIONS = [
  "Request Review Done",
  "Material Required",
  "Material PR Shared",
  "Funds Required",
  "Under Production",
  "Outsource Services",
  "Complete",
];

// ─── USERS ─────────────────────────────────────────────────────────────────
const DEFAULT_USERS = [
  { id:"admin",   name:"Admin",      role:"Admin",                avatar:"AD", color:"#714b67",
    canUpdateFunds:false, isSohail:false, isAdmin:true,  password:"Admin@123" },
  { id:"sohail",  name:"Sohail",     role:"Head of Manufacturing",avatar:"SO", color:"#0066cc",
    canUpdateFunds:false, isSohail:true,  isAdmin:false, password:"Sohail@123" },
  { id:"abdullah",name:"Abdullah",   role:"Operations",           avatar:"AB", color:"#017e84",
    canUpdateFunds:false, isSohail:false, isAdmin:false, password:"Abdullah@123" },
  { id:"hassan",  name:"Hassan",     role:"Operations",           avatar:"HS", color:"#28a745",
    canUpdateFunds:false, isSohail:false, isAdmin:false, password:"Hassan@123" },
  { id:"ahsan",   name:"Ahsan",      role:"Procurement Officer",  avatar:"AH", color:"#e07b39",
    canUpdateFunds:true,  isSohail:false, isAdmin:false, password:"Ahsan@123" },
  { id:"fahadzeb",name:"Fahad Zeb",  role:"Operations",           avatar:"FZ", color:"#8a4ac1",
    canUpdateFunds:false, isSohail:false, isAdmin:false, password:"Fahad@123" },
];

// ─── SEED STATE ────────────────────────────────────────────────────────────
const SEED = {
  workOrders: [],
};

// ─── REDUCER ───────────────────────────────────────────────────────────────
function reducer(state, { type, payload }) {
  switch(type) {
    case "ADD_WO":
      return { ...state, workOrders: [payload, ...state.workOrders] };
    case "UPDATE_WO":
      return { ...state, workOrders: state.workOrders.map(w => w.id===payload.id ? {...w,...payload} : w) };
    default:
      return state;
  }
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────
const genId = () => "WO-" + String(Math.floor(Math.random()*90000)+10000);
const fmtDt = d => d ? new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const today = () => new Date().toISOString().split("T")[0];
const nowTs  = () => new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

// ─── PRIMITIVE UI ───────────────────────────────────────────────────────────

const Badge = ({ label, size="sm" }) => {
  const s = STATUS_CONFIG[label] || { bg:"#f0f0f0", color:"#6c757d", dot:"#adb5bd" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5,
      background:s.bg, color:s.color, borderRadius:20,
      padding: size==="sm" ? "3px 10px" : "5px 13px",
      fontSize: size==="sm" ? 11 : 12, fontWeight:600, whiteSpace:"nowrap" }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, flexShrink:0 }}/>
      {label}
    </span>
  );
};

const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled=false, style={} }) => {
  const v = {
    primary:  { bg:C.primary,   hov:C.primaryHov, text:"#fff",    border:C.primary  },
    secondary:{ bg:"#fff",      hov:"#f8f9fa",    text:C.text,    border:C.border   },
    danger:   { bg:"#fff",      hov:C.dangerBg,   text:C.danger,  border:C.danger   },
    success:  { bg:C.success,   hov:"#218838",    text:"#fff",    border:C.success  },
    ghost:    { bg:"transparent",hov:"#f5f5f5",   text:C.textMid, border:"transparent"},
  }[variant] || {};
  const pad = size==="sm"?"4px 11px":size==="lg"?"11px 22px":"7px 16px";
  const fs  = size==="sm"?12:13;
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display:"inline-flex", alignItems:"center", gap:6,
        background: hov&&!disabled ? v.hov : v.bg,
        color:v.text, border:`1px solid ${v.border}`,
        borderRadius:6, padding:pad, fontSize:fs, fontWeight:500,
        cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .15s", whiteSpace:"nowrap", ...style }}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {icon && <span style={{fontSize:13}}>{icon}</span>}
      {children}
    </button>
  );
};

const Field = ({ label, required, children, hint }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
    <label style={{ fontSize:12, fontWeight:600, color:C.textMid, display:"flex", gap:4 }}>
      {label}
      {required && <span style={{color:C.danger}}>*</span>}
    </label>
    {children}
    {hint && <span style={{fontSize:11,color:C.textLight}}>{hint}</span>}
  </div>
);

const inp = (extra={}) => ({
  width:"100%", border:`1px solid ${C.border}`, borderRadius:6,
  padding:"8px 11px", fontSize:13, color:C.text, background:"#fff",
  outline:"none", boxSizing:"border-box", transition:"border .15s", ...extra
});

const TextInput = ({ label, required, hint, ...p }) => {
  const [foc, setFoc] = useState(false);
  return (
    <Field label={label} required={required} hint={hint}>
      <input {...p} style={{ ...inp(), borderColor: foc ? C.primary : C.border,
        boxShadow: foc ? `0 0 0 3px ${C.primary}22` : "none", ...p.style }}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} />
    </Field>
  );
};

const TextArea = ({ label, required, hint, rows=3, ...p }) => {
  const [foc, setFoc] = useState(false);
  return (
    <Field label={label} required={required} hint={hint}>
      <textarea {...p} rows={rows} style={{ ...inp(), borderColor: foc ? C.primary : C.border,
        boxShadow: foc ? `0 0 0 3px ${C.primary}22` : "none", resize:"vertical", ...p.style }}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} />
    </Field>
  );
};

const Select = ({ label, required, hint, children, ...p }) => {
  const [foc, setFoc] = useState(false);
  return (
    <Field label={label} required={required} hint={hint}>
      <select {...p} style={{ ...inp(), cursor:"pointer", borderColor: foc ? C.primary : C.border,
        boxShadow: foc ? `0 0 0 3px ${C.primary}22` : "none", ...p.style }}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}>
        {children}
      </select>
    </Field>
  );
};

const Card = ({ children, style={} }) => (
  <div style={{ background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:10, boxShadow:"0 1px 4px rgba(0,0,0,.06)", padding:24, ...style }}>
    {children}
  </div>
);

const Modal = ({ title, onClose, children, width=560 }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:1000,
    display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
    onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
    <div style={{ background:C.surface, borderRadius:12, width:"100%", maxWidth:width,
      maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 64px rgba(0,0,0,.22)",
      animation:"pop .2s ease" }}>
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
  }[type]||{};
  return (
    <div style={{ background:s.bg, borderRadius:7, padding:"10px 14px",
      display:"flex", gap:8, alignItems:"flex-start", fontSize:13, color:s.color }}>
      <span>{s.icon}</span><span>{children}</span>
    </div>
  );
};

// ─── PROGRESS STEPPER ──────────────────────────────────────────────────────
const ProgressStepper = ({ currentStatus }) => {
  const steps = [
    { label:"Submitted",   statuses:["Pending Review"] },
    { label:"Reviewed",    statuses:["Request Review Done","Sent Back to Requester"] },
    { label:"Materials",   statuses:["Material Required","Material PR Shared"] },
    { label:"Procurement", statuses:["Funds Required"] },
    { label:"Production",  statuses:["Under Production","Outsource Services"] },
    { label:"Complete",    statuses:["Complete"] },
  ];
  const currentStep = steps.findIndex(s=>s.statuses.includes(currentStatus));
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:4 }}>
      {steps.map((step,i)=>{
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={step.label} style={{ display:"flex", alignItems:"center", flex:1 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ width:28, height:28, borderRadius:"50%",
                background: done?C.success : active?C.primary : "#e9ecef",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700,
                color: (done||active)?"#fff":C.textLight,
                border: active?`2px solid ${C.primary}`:"none",
                transition:"all .3s" }}>
                {done ? "✓" : i+1}
              </div>
              <span style={{ fontSize:9, fontWeight:500, color:active?C.primary:done?C.success:C.textLight,
                textAlign:"center", maxWidth:52, lineHeight:1.2 }}>{step.label}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{ flex:1, height:2, background:done?C.success:"#e9ecef",
                margin:"0 2px", marginBottom:16, transition:"background .3s" }}/>
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
  const [selUser, setSelUser] = useState(null);
  const [pw, setPw]           = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [err, setErr]         = useState("");
  const pwRef = useRef();

  const handleSelect = u => { setSelUser(u); setPw(""); setErr(""); setTimeout(()=>pwRef.current?.focus(),100); };

  const handleLogin = () => {
    if (!selUser) { setErr("Please select a user."); return; }
    if (!pw) { setErr("Please enter your password."); return; }
    if (pw !== getPassword(selUser.id)) { setErr("Incorrect password. Please try again."); setPw(""); return; }
    onLogin(selUser);
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0edf5 0%,#e8e4f0 50%,#f5f0f8 100%)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:480 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:60, height:60, background:C.primary, borderRadius:14,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 14px", boxShadow:`0 10px 30px ${C.primary}55` }}>
            <span style={{ fontSize:28, color:"#fff" }}>🔧</span>
          </div>
          <div style={{ fontSize:26, fontWeight:800, color:C.primary }}>Work Order System</div>
          <div style={{ fontSize:13, color:C.textMid, marginTop:4 }}>Manufacturing Request & Tracking</div>
        </div>

        <Card style={{ borderRadius:14, boxShadow:"0 8px 32px rgba(113,75,103,.12)" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:12,
            textTransform:"uppercase", letterSpacing:".06em" }}>Select Your Profile</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
            {users.map(u=>(
              <button key={u.id} onClick={()=>handleSelect(u)}
                style={{ padding:"11px 12px", border:`2px solid ${selUser?.id===u.id?u.color:C.border}`,
                  borderRadius:10, background:selUser?.id===u.id?`${u.color}12`:"#fff",
                  cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left",
                  transition:"all .15s" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:u.color,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:12, fontWeight:700, flexShrink:0 }}>{u.avatar}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{u.name}</div>
                  <div style={{ fontSize:10, color:C.textMid }}>{u.role}</div>
                </div>
                {selUser?.id===u.id && <span style={{marginLeft:"auto",color:u.color,fontSize:16}}>✓</span>}
              </button>
            ))}
          </div>

          {selUser && (
            <div style={{ animation:"slideIn .2s ease", marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8,
                textTransform:"uppercase", letterSpacing:".06em" }}>Password for {selUser.name}</div>
              <div style={{ position:"relative" }}>
                <input ref={pwRef} type={showPw?"text":"password"} value={pw}
                  onChange={e=>{ setPw(e.target.value); setErr(""); }}
                  onKeyDown={e=>e.key==="Enter"&&handleLogin()}
                  placeholder="Enter password..."
                  style={{ ...inp(), paddingRight:40 }}
                  onFocus={e=>{ e.target.style.borderColor=C.primary; e.target.style.boxShadow=`0 0 0 3px ${C.primary}22`; }}
                  onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }} />
                <button onClick={()=>setShowPw(v=>!v)}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                    background:"none", border:"none", cursor:"pointer", fontSize:16, color:C.textMid }}>
                  {showPw?"🙈":"👁️"}
                </button>
              </div>
            </div>
          )}

          {err && (
            <div style={{ background:C.dangerBg, border:`1px solid #f5c6cb`, borderRadius:6,
              padding:"8px 12px", fontSize:12, color:C.danger, marginBottom:12 }}>
              ⚠ {err}
            </div>
          )}

          <button onClick={handleLogin} disabled={!selUser||!pw}
            style={{ width:"100%", padding:"12px", background:selUser&&pw?C.primary:"#e5e7eb",
              color:selUser&&pw?"#fff":"#9ca3af", border:"none", borderRadius:8,
              fontSize:15, fontWeight:700, cursor:selUser&&pw?"pointer":"not-allowed",
              transition:"all .2s", boxShadow:selUser&&pw?`0 4px 14px ${C.primary}44`:"none" }}>
            {selUser&&pw ? `Sign in as ${selUser.name} →` : "Select a profile & enter password"}
          </button>
        </Card>

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
  const [old, setOld]     = useState("");
  const [nw,  setNw]      = useState("");
  const [cnf, setCnf]     = useState("");
  const [msg, setMsg]     = useState(null);
  const [showOld, setShowOld] = useState(false);
  const [showNw,  setShowNw]  = useState(false);

  const handle = () => {
    if (old !== getPassword(user.id)) { setMsg({t:"danger",m:"Current password is incorrect."}); return; }
    if (nw.length < 6)                { setMsg({t:"danger",m:"New password must be at least 6 characters."}); return; }
    if (nw !== cnf)                   { setMsg({t:"danger",m:"Passwords do not match."}); return; }
    savePassword(user.id, nw);
    setMsg({t:"success",m:"Password changed successfully!"});
    setOld(""); setNw(""); setCnf("");
  };

  return (
    <Modal title="🔒 Change Password" onClose={onClose} width={420}>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Current Password</div>
          <div style={{ position:"relative" }}>
            <input type={showOld?"text":"password"} value={old} onChange={e=>setOld(e.target.value)}
              style={inp()} placeholder="Enter current password"
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            <button onClick={()=>setShowOld(v=>!v)} style={{position:"absolute",right:10,top:"50%",
              transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textMid}}>
              {showOld?"🙈":"👁️"}
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>New Password</div>
          <div style={{ position:"relative" }}>
            <input type={showNw?"text":"password"} value={nw} onChange={e=>setNw(e.target.value)}
              style={inp()} placeholder="Min 6 characters"
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            <button onClick={()=>setShowNw(v=>!v)} style={{position:"absolute",right:10,top:"50%",
              transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textMid}}>
              {showNw?"🙈":"👁️"}
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Confirm New Password</div>
          <input type="password" value={cnf} onChange={e=>setCnf(e.target.value)}
            style={inp()} placeholder="Repeat new password"
            onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
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
// CREATE WORK ORDER FORM
// ════════════════════════════════════════════════════════════════════════════
const CreateWOModal = ({ currentUser, onClose, onSave }) => {
  const [form, setForm] = useState({
    itemName:"", qty:"", unit:"", requirementDate:"",
    description:"", priority:"Normal", notes:"",
    files:[]
  });
  const [errors, setErrors] = useState({});
  const fileRef = useRef();

  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const validate = () => {
    const e = {};
    if (!form.itemName.trim())     e.itemName = "Item name is required.";
    if (!form.qty||isNaN(form.qty)||+form.qty<=0) e.qty = "Valid quantity is required.";
    if (!form.requirementDate)     e.requirementDate = "Requirement date is required.";
    if (!form.description.trim())  e.description = "Description is required.";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleFiles = e => {
    const picked = Array.from(e.target.files||[]).map(f=>({ name:f.name, size:f.size, type:f.type }));
    setForm(p=>({...p, files:[...p.files, ...picked]}));
  };

  const removeFile = idx => setForm(p=>({...p, files:p.files.filter((_,i)=>i!==idx)}));

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      id: genId(),
      itemName:      form.itemName.trim(),
      qty:           form.qty,
      unit:          form.unit.trim()||"pcs",
      requirementDate: form.requirementDate,
      requestDate:   today(),
      requestedAt:   nowTs(),
      description:   form.description.trim(),
      priority:      form.priority,
      notes:         form.notes.trim(),
      files:         form.files,
      requestedBy:   currentUser.id,
      requestedByName: currentUser.name,
      status:        "Pending Review",
      statusHistory: [{ status:"Pending Review", by:currentUser.name, at:nowTs(), remarks:"Work order created." }],
      sohailAction:  null, // "ok" | "sendback"
      sohailRemark:  "",
      isComplete:    false,
    });
    onClose();
  };

  const errStyle = { fontSize:11, color:C.danger, marginTop:2 };

  return (
    <Modal title="📝 New Work Order Request" onClose={onClose} width={620}>
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

        {/* Row 1: Item Name + Qty */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 90px", gap:12 }}>
          <div>
            <TextInput label="Item Name" required value={form.itemName}
              onChange={set("itemName")} placeholder="e.g. Bracket Assembly Type-A" />
            {errors.itemName && <div style={errStyle}>{errors.itemName}</div>}
          </div>
          <div>
            <TextInput label="Quantity" required type="number" min="1"
              value={form.qty} onChange={set("qty")} placeholder="e.g. 10" />
            {errors.qty && <div style={errStyle}>{errors.qty}</div>}
          </div>
          <TextInput label="Unit" value={form.unit} onChange={set("unit")} placeholder="pcs" />
        </div>

        {/* Row 2: Dates + Priority */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Request Date</div>
            <div style={{ ...inp(), background:"#f9fafb", color:C.textMid, display:"flex", alignItems:"center" }}>
              📅 {fmtDt(today())}
            </div>
          </div>
          <div>
            <TextInput label="Requirement Date" required type="date"
              value={form.requirementDate} onChange={set("requirementDate")} />
            {errors.requirementDate && <div style={errStyle}>{errors.requirementDate}</div>}
          </div>
          <Select label="Priority" value={form.priority} onChange={set("priority")}>
            <option>Normal</option>
            <option>High</option>
            <option>Urgent</option>
          </Select>
        </div>

        {/* Description */}
        <div>
          <TextArea label="Work Order Description" required rows={4}
            value={form.description} onChange={set("description")}
            placeholder="Describe what needs to be manufactured — specifications, material, finish, dimensions, etc." />
          {errors.description && <div style={errStyle}>{errors.description}</div>}
        </div>

        {/* Notes */}
        <TextArea label="Additional Notes / Instructions" rows={2}
          value={form.notes} onChange={set("notes")}
          placeholder="Any extra information, references, or special handling instructions..." />

        {/* File upload */}
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:6 }}>
            Attachments / Drawings
            <span style={{ fontSize:11, fontWeight:400, color:C.textLight, marginLeft:6 }}>(optional)</span>
          </div>
          <div style={{ border:`2px dashed ${C.border}`, borderRadius:8, padding:"14px 16px",
            display:"flex", flexDirection:"column", gap:10, background:"#fafafa" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input ref={fileRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf,.xlsx,.docx"
                onChange={handleFiles} style={{ display:"none" }} />
              <Btn variant="secondary" icon="📎" onClick={()=>fileRef.current?.click()}>Choose Files</Btn>
              <span style={{ fontSize:11, color:C.textLight }}>PDF, PNG, JPG, DWG, DXF, Excel, Word</span>
            </div>
            {form.files.length>0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {form.files.map((f,i)=>(
                  <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:6,
                    padding:"4px 10px", fontSize:11, display:"flex", alignItems:"center", gap:6 }}>
                    <span>📄</span>
                    <span style={{ maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                    <button onClick={()=>removeFile(i)} style={{ background:"none", border:"none",
                      cursor:"pointer", color:C.danger, fontSize:14, lineHeight:1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", paddingTop:4, borderTop:`1px solid ${C.border}` }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn icon="📤" onClick={handleSave}>Submit Work Order</Btn>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SOHAIL REVIEW PANEL (inside WO detail)
// ════════════════════════════════════════════════════════════════════════════
const SohailReviewPanel = ({ wo, currentUser, dispatch }) => {
  const [remark, setRemark] = useState("");
  const [action, setAction] = useState("ok");

  if (wo.sohailAction !== null) return null;
  if (!currentUser.isSohail && !currentUser.isAdmin) return null;
  if (!currentUser.isSohail) return null;

  const handle = () => {
    const newStatus = action==="ok" ? "Request Review Done" : "Sent Back to Requester";
    const entry = {
      status: newStatus,
      by: currentUser.name,
      at: nowTs(),
      remarks: remark.trim() || (action==="ok" ? "Reviewed and approved." : "Sent back for revision."),
    };
    dispatch({ type:"UPDATE_WO", payload:{
      id: wo.id,
      sohailAction: action,
      sohailRemark: remark.trim(),
      status: newStatus,
      statusHistory: [...wo.statusHistory, entry],
    }});
    setRemark("");
  };

  return (
    <div style={{ background:"#f3eef1", border:`1px solid ${C.primary}33`, borderRadius:10,
      padding:18, marginTop:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.primary, marginBottom:12 }}>
        🔍 Manufacturing Head Review
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 14px",
            border:`2px solid ${action==="ok"?C.success:C.border}`, borderRadius:8, background:"#fff",
            transition:"all .15s" }}>
            <input type="radio" checked={action==="ok"} onChange={()=>setAction("ok")} style={{accentColor:C.success}}/>
            <span style={{ fontSize:13, fontWeight:600, color:action==="ok"?C.success:C.text }}>
              ✅ Approve / OK
            </span>
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", padding:"10px 14px",
            border:`2px solid ${action==="sendback"?C.warning:C.border}`, borderRadius:8, background:"#fff",
            transition:"all .15s" }}>
            <input type="radio" checked={action==="sendback"} onChange={()=>setAction("sendback")} style={{accentColor:C.warning}}/>
            <span style={{ fontSize:13, fontWeight:600, color:action==="sendback"?C.warning:C.text }}>
              🔄 Send Back to Requester
            </span>
          </label>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Remarks</div>
          <textarea value={remark} onChange={e=>setRemark(e.target.value)} rows={3}
            placeholder="Add review notes..."
            style={{ ...inp(), resize:"none" }}
            onFocus={e=>{ e.target.style.borderColor=C.primary; e.target.style.boxShadow=`0 0 0 3px ${C.primary}22`; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; e.target.style.boxShadow="none"; }}/>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Btn onClick={handle} variant={action==="ok"?"success":"secondary"} icon={action==="ok"?"✅":"🔄"}>
          {action==="ok" ? "Submit Approval" : "Send Back"}
        </Btn>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS UPDATE PANEL (cascading, inside WO detail)
// ════════════════════════════════════════════════════════════════════════════
const StatusUpdatePanel = ({ wo, currentUser, dispatch }) => {
  const [nextStatus, setNextStatus] = useState("");
  const [remarks, setRemarks]       = useState("");

  // Only show if Sohail has approved
  if (wo.sohailAction !== "ok") return null;
  if (wo.isComplete) return null;

  // Filter options based on user role
  const allowed = STATUS_OPTIONS.filter(s => {
    if (s === "Funds Required") return currentUser.canUpdateFunds || currentUser.isAdmin;
    return true;
  }).filter(s => s !== "Request Review Done"); // already set by Sohail

  const handleUpdate = () => {
    if (!nextStatus) return;
    const isComplete = nextStatus === "Complete";
    const entry = {
      status: nextStatus,
      by: currentUser.name,
      at: nowTs(),
      remarks: remarks.trim() || `Status updated to ${nextStatus}.`,
    };
    dispatch({ type:"UPDATE_WO", payload:{
      id: wo.id,
      status: nextStatus,
      isComplete,
      statusHistory: [...wo.statusHistory, entry],
    }});
    setNextStatus(""); setRemarks("");
  };

  // Check if "Funds Required" is being attempted by non-Ahsan
  const fundsWarning = nextStatus==="Funds Required" && !currentUser.canUpdateFunds && !currentUser.isAdmin;

  return (
    <div style={{ background:"#f8f9fa", border:`1px solid ${C.border}`, borderRadius:10,
      padding:18, marginTop:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:14 }}>
        ⚙️ Update Work Order Status
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>
            Next Status
            {nextStatus==="Funds Required" && !currentUser.canUpdateFunds && !currentUser.isAdmin && (
              <span style={{ color:C.danger, marginLeft:6, fontSize:11 }}>⚠ Procurement only</span>
            )}
          </div>
          <select value={nextStatus} onChange={e=>setNextStatus(e.target.value)}
            style={{ ...inp(), cursor:"pointer" }}
            onFocus={e=>{ e.target.style.borderColor=C.primary; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }}>
            <option value="">— Select status —</option>
            {allowed.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:C.textMid, marginBottom:5 }}>Remarks</div>
          <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={2}
            placeholder="Add update notes..."
            style={{ ...inp(), resize:"none" }}
            onFocus={e=>{ e.target.style.borderColor=C.primary; }}
            onBlur={e=>{ e.target.style.borderColor=C.border; }}/>
        </div>
      </div>
      {fundsWarning && (
        <div style={{ marginTop:10 }}>
          <Alert type="danger">Only Ahsan (Procurement Officer) can set status to "Funds Required".</Alert>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"flex-end", marginTop:12 }}>
        <Btn onClick={handleUpdate}
          disabled={!nextStatus || fundsWarning}
          variant={nextStatus==="Complete"?"success":"primary"}
          icon={nextStatus==="Complete"?"🏁":"💾"}>
          {nextStatus==="Complete" ? "Mark as Complete (Final)" : "Save Status Update"}
        </Btn>
      </div>
      {nextStatus==="Complete" && (
        <div style={{ marginTop:10 }}>
          <Alert type="warning">
            ⚠ Marking as Complete is irreversible. The work order will be locked after this action.
          </Alert>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER DETAIL MODAL
// ════════════════════════════════════════════════════════════════════════════
const WODetailModal = ({ wo, currentUser, dispatch, onClose }) => {
  const priorityColors = { Normal:"#6c757d", High:"#e07b39", Urgent:"#dc3545" };
  const isRequester = wo.requestedBy === currentUser.id;
  const isComplete  = wo.isComplete;

  return (
    <Modal title={`Work Order — ${wo.id}`} onClose={onClose} width={740}>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

        {/* Header info strip */}
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center",
          padding:"12px 16px", background:"#f9fafb", borderRadius:8 }}>
          <Badge label={wo.status} size="md" />
          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600,
            background:priorityColors[wo.priority]+"20", color:priorityColors[wo.priority] }}>
            ⚡ {wo.priority} Priority
          </span>
          <span style={{ fontSize:12, color:C.textMid }}>Requested by: <strong>{wo.requestedByName}</strong></span>
          <span style={{ fontSize:12, color:C.textMid, marginLeft:"auto" }}>{wo.requestedAt}</span>
        </div>

        {/* Completion notification */}
        {isComplete && isRequester && (
          <Alert type="success">
            🎉 Your work order <strong>{wo.id}</strong> has been completed! Thank you for your patience.
          </Alert>
        )}
        {isComplete && !isRequester && (
          <Alert type="success">
            ✅ This work order has been marked <strong>Complete</strong> and is now locked.
          </Alert>
        )}

        {/* Progress stepper */}
        <ProgressStepper currentStatus={wo.status} />

        {/* Details grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          {[
            ["Item Name",         wo.itemName],
            ["Quantity",          `${wo.qty} ${wo.unit}`],
            ["Request Date",      fmtDt(wo.requestDate)],
            ["Requirement Date",  fmtDt(wo.requirementDate)],
            ["Priority",          wo.priority],
            ["Requested By",      wo.requestedByName],
          ].map(([label,value])=>(
            <div key={label} style={{ background:"#fafafa", borderRadius:7, padding:"10px 14px",
              border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.textMid, fontWeight:500, marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6 }}>DESCRIPTION</div>
          <div style={{ background:"#fafafa", border:`1px solid ${C.border}`, borderRadius:7,
            padding:"12px 14px", fontSize:13, color:C.text, lineHeight:1.6 }}>
            {wo.description}
          </div>
        </div>

        {/* Notes */}
        {wo.notes && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6 }}>ADDITIONAL NOTES</div>
            <div style={{ background:"#fffbeb", border:`1px solid #fde68a`, borderRadius:7,
              padding:"10px 14px", fontSize:13, color:"#92400e" }}>
              {wo.notes}
            </div>
          </div>
        )}

        {/* Files */}
        {wo.files?.length>0 && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:8 }}>ATTACHMENTS</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {wo.files.map((f,i)=>(
                <div key={i} style={{ background:"#f0edf5", border:`1px solid ${C.primary}33`,
                  borderRadius:6, padding:"5px 11px", fontSize:11, display:"flex", gap:6, alignItems:"center" }}>
                  📄 {f.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:10 }}>STATUS HISTORY</div>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {wo.statusHistory.map((entry, i)=>(
              <div key={i} style={{ display:"flex", gap:12, position:"relative" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ width:12, height:12, borderRadius:"50%",
                    background: i===wo.statusHistory.length-1 ? C.primary : C.success,
                    border:`2px solid #fff`, boxShadow:"0 0 0 2px #e0e0e0",
                    flexShrink:0, marginTop:4 }}/>
                  {i < wo.statusHistory.length-1 && (
                    <div style={{ width:2, flex:1, background:"#e0e0e0", minHeight:20 }}/>
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

        {/* Action panels */}
        {!isComplete && (
          <>
            <SohailReviewPanel wo={wo} currentUser={currentUser} dispatch={dispatch} />
            <StatusUpdatePanel wo={wo} currentUser={currentUser} dispatch={dispatch} />
          </>
        )}
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// WORK ORDER CARD (list item)
// ════════════════════════════════════════════════════════════════════════════
const WOCard = ({ wo, currentUser, onClick }) => {
  const priorityColors = { Normal:"#6c757d", High:"#e07b39", Urgent:"#dc3545" };
  const isNew = wo.status==="Pending Review" && wo.requestedBy!==currentUser.id;
  return (
    <div onClick={onClick}
      style={{ background:C.surface, border:`1px solid ${isNew?C.primary+"44":C.border}`,
        borderLeft:`4px solid ${STATUS_CONFIG[wo.status]?.dot||C.textLight}`,
        borderRadius:10, padding:"16px 18px", cursor:"pointer",
        boxShadow: isNew?"0 2px 8px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)",
        transition:"all .15s", animation:"slideIn .3s ease" }}
      onMouseEnter={e=>{ e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"; e.currentTarget.style.transform="translateY(-1px)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.boxShadow=isNew?"0 2px 8px rgba(113,75,103,.1)":"0 1px 3px rgba(0,0,0,.05)"; e.currentTarget.style.transform="translateY(0)"; }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div>
          <span style={{ fontFamily:"monospace", fontSize:11, color:C.primary, fontWeight:700 }}>{wo.id}</span>
          {isNew && wo.requestedBy!==currentUser.id && currentUser.isSohail && (
            <span style={{ marginLeft:8, fontSize:10, background:C.primary, color:"#fff",
              borderRadius:10, padding:"1px 7px", fontWeight:600 }}>NEEDS REVIEW</span>
          )}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {wo.isComplete && <span style={{ fontSize:13 }}>🏁</span>}
          <Badge label={wo.status} />
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:6 }}>{wo.itemName}</div>
      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:C.textMid }}>
          <span style={{ fontWeight:600, color:priorityColors[wo.priority] }}>⚡{wo.priority}</span>
        </span>
        <span style={{ fontSize:12, color:C.textMid }}>Qty: <strong>{wo.qty} {wo.unit}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>By: <strong>{wo.requestedByName}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>Required: <strong>{fmtDt(wo.requirementDate)}</strong></span>
        <span style={{ fontSize:12, color:C.textMid }}>Submitted: {wo.requestedAt}</span>
      </div>
      {wo.description && (
        <div style={{ fontSize:12, color:C.textMid, marginTop:8,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>
          {wo.description}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP SHELL
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Passwords ──────────────────────────────────────────────────────────
  const loadPasswords = () => {
    try { const p = localStorage.getItem("wo_passwords"); return p ? JSON.parse(p) : {}; }
    catch(e) { return {}; }
  };
  const [passwords, setPasswords] = useState(loadPasswords);

  const getPassword = id => passwords[id] || DEFAULT_USERS.find(u=>u.id===id)?.password || "";
  const savePassword = (id, pw) => {
    const updated = { ...passwords, [id]: pw };
    setPasswords(updated);
    try { localStorage.setItem("wo_passwords", JSON.stringify(updated)); } catch(e) {}
  };

  // ── State ──────────────────────────────────────────────────────────────
  const loadState = () => {
    try { const s = localStorage.getItem("wo_state"); return s ? JSON.parse(s) : SEED; }
    catch(e) { return SEED; }
  };
  const [S, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(()=>{
    try { localStorage.setItem("wo_state", JSON.stringify(S)); } catch(e) {}
  }, [S]);

  // ── Auth ───────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showCreateWO, setShowCreateWO] = useState(false);
  const [selectedWO,   setSelectedWO]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMine,   setFilterMine]   = useState(false);
  const [search,       setSearch]       = useState("");

  // Visible users list (users who can see the system — all DEFAULT_USERS)
  const users = DEFAULT_USERS;

  if (!currentUser) return (
    <>
      <GlobalStyles />
      <LoginPage users={users} onLogin={setCurrentUser} getPassword={getPassword} />
    </>
  );

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = S.workOrders
    .filter(w => filterStatus==="all" || w.status===filterStatus)
    .filter(w => !filterMine || w.requestedBy===currentUser.id)
    .filter(w => !search || w.itemName.toLowerCase().includes(search.toLowerCase()) ||
                 w.id.toLowerCase().includes(search.toLowerCase()) ||
                 w.requestedByName.toLowerCase().includes(search.toLowerCase()));

  // Stats
  const myWOs     = S.workOrders.filter(w=>w.requestedBy===currentUser.id);
  const pending   = S.workOrders.filter(w=>w.status==="Pending Review");
  const complete  = S.workOrders.filter(w=>w.isComplete);
  const needsReview = currentUser.isSohail ? pending.length : 0;

  const handleSaveWO = (wo) => {
    dispatch({ type:"ADD_WO", payload:wo });
  };

  const allStatuses = ["all", ...Object.keys(STATUS_CONFIG)];

  // Sync selectedWO with latest state
  const liveWO = selectedWO ? S.workOrders.find(w=>w.id===selectedWO.id) : null;

  return (
    <>
      <GlobalStyles />
      <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:C.bg }}>

        {/* ── TOPBAR ── */}
        <div style={{ background:C.primary, color:"#fff", padding:"0 24px",
          display:"flex", alignItems:"center", height:56, gap:16, flexShrink:0,
          boxShadow:"0 2px 8px rgba(113,75,103,.3)" }}>
          <span style={{ fontSize:20 }}>🔧</span>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:".02em" }}>Work Order System</div>
          <div style={{ flex:1 }}/>
          {needsReview > 0 && (
            <div style={{ background:"#dc3545", color:"#fff", borderRadius:20,
              padding:"4px 12px", fontSize:12, fontWeight:700,
              animation:"pulse 2s infinite" }}>
              ⚠ {needsReview} Pending Review
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
            <button onClick={()=>setShowChangePw(true)}
              style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
                color:"#fff", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer",
                marginLeft:4 }}>
              🔒 Password
            </button>
            <button onClick={()=>setCurrentUser(null)}
              style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
                color:"#fff", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>
              Logout
            </button>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div style={{ flex:1, maxWidth:1200, width:"100%", margin:"0 auto", padding:24, boxSizing:"border-box" }}>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            {[
              { label:"Total Work Orders", value:S.workOrders.length,    icon:"📋", color:C.primary },
              { label:"My Requests",       value:myWOs.length,           icon:"👤", color:"#0066cc" },
              { label:"Pending Review",    value:pending.length,         icon:"⏳", color:C.warning },
              { label:"Completed",         value:complete.length,        icon:"✅", color:C.success },
            ].map(k=>(
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

          {/* Toolbar */}
          <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
            <Btn icon="+" size="lg" onClick={()=>setShowCreateWO(true)}>
              New Work Order
            </Btn>
            <div style={{ position:"relative", flex:"1 1 200px", minWidth:180 }}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="🔍  Search by item, ID or requester..."
                style={{ ...inp(), paddingLeft:12, width:"100%" }}
                onFocus={e=>{ e.target.style.borderColor=C.primary; }}
                onBlur={e=>{ e.target.style.borderColor=C.border; }} />
            </div>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ ...inp({ width:"auto", minWidth:170 }), cursor:"pointer" }}>
              <option value="all">All Statuses</option>
              {Object.keys(STATUS_CONFIG).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer",
              fontSize:13, color:C.textMid, userSelect:"none" }}>
              <input type="checkbox" checked={filterMine} onChange={e=>setFilterMine(e.target.checked)}
                style={{ accentColor:C.primary, width:15, height:15 }} />
              My requests only
            </label>
          </div>

          {/* WO list */}
          {filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"60px 20px", background:C.surface,
              borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:6 }}>
                {S.workOrders.length===0 ? "No work orders yet" : "No results found"}
              </div>
              <div style={{ fontSize:13, color:C.textMid, marginBottom:18 }}>
                {S.workOrders.length===0
                  ? "Click 'New Work Order' to submit your first manufacturing request."
                  : "Try adjusting your filters or search term."}
              </div>
              {S.workOrders.length===0 && <Btn icon="+" onClick={()=>setShowCreateWO(true)}>Create First Work Order</Btn>}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:12, color:C.textMid, marginBottom:2 }}>
                Showing {filtered.length} of {S.workOrders.length} work orders
              </div>
              {filtered.map(wo=>(
                <WOCard key={wo.id} wo={wo} currentUser={currentUser}
                  onClick={()=>setSelectedWO(wo)} />
              ))}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ background:C.surface, borderTop:`1px solid ${C.border}`,
          padding:"10px 24px", fontSize:11, color:C.textLight, textAlign:"center" }}>
          Work Order System · Manufacturing Operations ·{" "}
          {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
        </div>
      </div>

      {/* ── MODALS ── */}
      {showChangePw && (
        <ChangePwModal user={currentUser} getPassword={getPassword}
          savePassword={savePassword} onClose={()=>setShowChangePw(false)} />
      )}

      {showCreateWO && (
        <CreateWOModal currentUser={currentUser} onClose={()=>setShowCreateWO(false)}
          onSave={handleSaveWO} />
      )}

      {liveWO && (
        <WODetailModal wo={liveWO} currentUser={currentUser}
          dispatch={dispatch} onClose={()=>setSelectedWO(null)} />
      )}
    </>
  );
}

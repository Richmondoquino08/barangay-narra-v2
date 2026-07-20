import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, resolveAssetUrl } from '../contexts/ThemeContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2,
         Sun, Moon, Fingerprint } from 'lucide-react';

const ROLES = [
  { r:'Admin',     e:'admin@barangay.gov.ph',     p:'Admin@2024',     c:'#a78bfa' },
  { r:'Secretary', e:'secretary@barangay.gov.ph', p:'Secretary@2024', c:'#60a5fa' },
  { r:'Captain',   e:'captain@barangay.gov.ph',   p:'Captain@2024',   c:'#5eead4' },
  { r:'Treasurer', e:'treasurer@barangay.gov.ph', p:'Treasurer@2024', c:'#fcd34d' },
];

export default function Login() {
  const [form, setForm]   = useState({ email:'', password:'' });
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dark, setDark]   = useState(() => localStorage.getItem('darkMode') !== 'false'); // default dark
  const { login }         = useAuth();
  const { logo, loginBg, barangayName, systemName } = useTheme();
  const navigate          = useNavigate();
  const logoSrc = resolveAssetUrl(logo);
  const bgSrc   = resolveAssetUrl(loginBg);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  function toggleDark() {
    const n = !dark; setDark(n);
    localStorage.setItem('darkMode', String(n));
    document.documentElement.classList.toggle('dark', n);
  }

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const r = await login(form.email, form.password);
      if (r.success) { setOk(true); setTimeout(()=>navigate('/dashboard'), 750); }
      else setError(r.error || r.message || 'Incorrect email or password.');
    } catch (err) { setError(err?.response?.data?.message || 'Cannot connect to server.'); }
    finally { setLoading(false); }
  }

  const D = dark;
  // theme palette
  const pageBg   = D ? '#070912' : '#f4f5fb';
  const cardBg   = D ? 'rgba(20,23,38,0.72)' : 'rgba(255,255,255,0.85)';
  const cardBdr  = D ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)';
  const txt1     = D ? '#f0f3ff' : '#0b1020';
  const txt2     = D ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.55)';
  const txt3     = D ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.40)';
  const inpBg    = D ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)';
  const inpBdr   = D ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
  const inpClr   = D ? '#f0f3ff' : '#0b1020';
  const inpPh    = D ? 'rgba(255,255,255,0.30)' : 'rgba(15,23,42,0.35)';
  const accent   = '#7c6cff'; // signature violet
  const accent2  = '#22d3ee'; // signature cyan

  return (
    <div style={{ minHeight:'100vh', position:'relative', overflow:'hidden',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px',
      background: pageBg, fontFamily:"'Inter',system-ui,sans-serif", transition:'background 0.4s ease' }}>

      {/* ── BACKGROUND ── */}
      {bgSrc ? (
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${bgSrc})`, backgroundSize:'cover', backgroundPosition:'center' }}>
          <div style={{ position:'absolute', inset:0, background: D?'rgba(7,9,18,0.80)':'rgba(244,245,251,0.78)' }}/>
        </div>
      ) : (
        <>
          {/* Aurora gradient orbs */}
          <div style={{ position:'absolute', top:'-25%', left:'-10%', width:'55vw', height:'55vw', borderRadius:'50%',
            background:`radial-gradient(circle, ${accent}${D?'55':'40'} 0%, transparent 60%)`, filter:'blur(80px)',
            animation:'drift1 20s ease-in-out infinite' }}/>
          <div style={{ position:'absolute', bottom:'-30%', right:'-15%', width:'60vw', height:'60vw', borderRadius:'50%',
            background:`radial-gradient(circle, ${accent2}${D?'40':'30'} 0%, transparent 60%)`, filter:'blur(90px)',
            animation:'drift2 26s ease-in-out infinite' }}/>
          <div style={{ position:'absolute', top:'30%', right:'10%', width:'30vw', height:'30vw', borderRadius:'50%',
            background:`radial-gradient(circle, #ec489955 0%, transparent 60%)`, filter:'blur(70px)',
            animation:'drift1 16s ease-in-out infinite 3s' }}/>
          {/* Fine noise grid */}
          <div style={{ position:'absolute', inset:0, opacity: D?0.5:0.4,
            backgroundImage:`linear-gradient(${D?'rgba(255,255,255,0.025)':'rgba(15,23,42,0.03)'} 1px,transparent 1px),linear-gradient(90deg,${D?'rgba(255,255,255,0.025)':'rgba(15,23,42,0.03)'} 1px,transparent 1px)`,
            backgroundSize:'52px 52px', maskImage:'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 75%)' }}/>
        </>
      )}

      {/* ── Theme toggle (floating top-right) ── */}
      <button onClick={toggleDark}
        style={{ position:'absolute', top:'24px', right:'24px', zIndex:20,
          width:'44px', height:'44px', borderRadius:'14px', cursor:'pointer',
          border:`1px solid ${cardBdr}`, background:cardBg, backdropFilter:'blur(16px)',
          display:'flex', alignItems:'center', justifyContent:'center', color:txt1,
          transition:'all 0.2s ease' }}
        onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px) scale(1.05)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform=''; }}>
        {D ? <Sun size={18}/> : <Moon size={18}/>}
      </button>

      {/* ── MAIN CARD ── */}
      <div style={{ position:'relative', zIndex:10, width:'100%', maxWidth:'440px',
        opacity: mounted?1:0, transform: mounted?'translateY(0) scale(1)':'translateY(24px) scale(0.96)',
        transition:'all 0.6s cubic-bezier(0.16,1,0.3,1)' }}>

        {/* Glow ring behind card */}
        <div style={{ position:'absolute', inset:'-1px', borderRadius:'30px', padding:'1px',
          background:`linear-gradient(135deg, ${accent}, transparent 40%, transparent 60%, ${accent2})`,
          opacity: D?0.6:0.4, pointerEvents:'none' }}/>

        <div style={{
          position:'relative',
          background: cardBg,
          backdropFilter:'blur(32px) saturate(1.5)',
          WebkitBackdropFilter:'blur(32px) saturate(1.5)',
          border:`1px solid ${cardBdr}`,
          borderRadius:'28px',
          padding:'44px 40px 36px',
          boxShadow: D
            ? '0 32px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 32px 80px rgba(80,80,160,0.16), inset 0 1px 0 rgba(255,255,255,0.80)',
        }}>

          {/* ── Brand mark ── */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:'30px' }}>
            <div style={{ position:'relative', marginBottom:'18px' }}>
              {/* Animated glow halo */}
              <div style={{ position:'absolute', inset:'-8px', borderRadius:'22px',
                background:`linear-gradient(135deg,${accent},${accent2})`, opacity:0.35, filter:'blur(14px)',
                animation:'pulse 3s ease-in-out infinite' }}/>
              {logoSrc ? (
                <img src={logoSrc} alt={barangayName} style={{ position:'relative', width:'66px', height:'66px',
                  borderRadius:'20px', objectFit:'contain', background: D?'rgba(255,255,255,0.08)':'#fff',
                  padding:'8px', border:`1px solid ${cardBdr}` }}
                  onError={e=>{ e.currentTarget.style.display='none'; }}/>
              ) : (
                <div style={{ position:'relative', width:'66px', height:'66px', borderRadius:'20px',
                  background:`linear-gradient(135deg,${accent},${accent2})`, display:'flex',
                  alignItems:'center', justifyContent:'center', boxShadow:`0 10px 30px ${accent}66` }}>
                  <Fingerprint size={30} color="white"/>
                </div>
              )}
            </div>
            <h1 style={{ margin:0, fontSize:'15px', fontWeight:700, color:txt1, letterSpacing:'-0.01em' }}>{barangayName}</h1>
            <p style={{ margin:'3px 0 0', fontSize:'11px', fontWeight:600, letterSpacing:'0.16em',
              textTransform:'uppercase', color:txt3 }}>{systemName}</p>
          </div>

          {/* ── Greeting ── */}
          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <h2 style={{ margin:'0 0 6px', fontSize:'27px', fontWeight:800, color:txt1, letterSpacing:'-0.035em', lineHeight:1.1 }}>
              Welcome back
            </h2>
            <p style={{ margin:0, fontSize:'13.5px', color:txt2 }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'12px 14px',
              borderRadius:'14px', background:'rgba(244,63,94,0.12)', border:'1px solid rgba(244,63,94,0.30)',
              marginBottom:'18px' }}>
              <span style={{ color:'#fb7185', fontWeight:800, fontSize:'13px', flexShrink:0 }}>!</span>
              <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#fb7185', lineHeight:1.45 }}>{error}</p>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

            {/* Email */}
            <div style={{ position:'relative' }}>
              <Mail size={16} style={{ position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:inpPh, pointerEvents:'none', zIndex:1 }}/>
              <input type="email" required autoComplete="email" value={form.email} placeholder="Email address"
                onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', padding:'15px 16px 15px 44px',
                  background:inpBg, border:`1.5px solid ${inpBdr}`, borderRadius:'15px',
                  fontSize:'14.5px', color:inpClr, fontFamily:'inherit', outline:'none', transition:'all 0.18s ease' }}
                onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 4px ${accent}22`; }}
                onBlur={e=>{ e.target.style.borderColor=inpBdr; e.target.style.boxShadow='none'; }}/>
            </div>

            {/* Password */}
            <div style={{ position:'relative' }}>
              <Lock size={16} style={{ position:'absolute', left:'15px', top:'50%', transform:'translateY(-50%)', color:inpPh, pointerEvents:'none', zIndex:1 }}/>
              <input type={show?'text':'password'} required autoComplete="current-password" value={form.password} placeholder="Password"
                onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                style={{ width:'100%', boxSizing:'border-box', padding:'15px 46px 15px 44px',
                  background:inpBg, border:`1.5px solid ${inpBdr}`, borderRadius:'15px',
                  fontSize:'14.5px', color:inpClr, fontFamily:'inherit', outline:'none', transition:'all 0.18s ease' }}
                onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 4px ${accent}22`; }}
                onBlur={e=>{ e.target.style.borderColor=inpBdr; e.target.style.boxShadow='none'; }}/>
              <button type="button" tabIndex={-1} onClick={()=>setShow(p=>!p)}
                style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:inpPh, padding:'3px', display:'flex' }}
                onMouseEnter={e=>e.currentTarget.style.color=txt1}
                onMouseLeave={e=>e.currentTarget.style.color=inpPh}>
                {show ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading||ok}
              style={{ marginTop:'6px', width:'100%', padding:'16px', borderRadius:'15px', border:'none',
                cursor: loading||ok?'default':'pointer', fontFamily:'inherit', fontSize:'15px', fontWeight:700,
                color:'#fff', position:'relative', overflow:'hidden',
                background: ok ? 'linear-gradient(135deg,#10b981,#059669)' : `linear-gradient(135deg,${accent} 0%,#6366f1 50%,${accent2} 130%)`,
                boxShadow: ok ? '0 12px 30px rgba(16,185,129,0.40)' : `0 12px 34px ${accent}55`,
                display:'flex', alignItems:'center', justifyContent:'center', gap:'9px',
                transition:'all 0.2s ease', opacity: loading||ok?0.9:1 }}
              onMouseEnter={e=>{ if(!loading&&!ok){ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 18px 44px ${accent}77`; } }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow= ok?'0 12px 30px rgba(16,185,129,0.40)':`0 12px 34px ${accent}55`; }}>
              {!loading&&!ok&&<span style={{ position:'absolute', inset:0, background:'linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.25) 50%,transparent 60%)', animation:'shimmer 2.4s infinite' }}/>}
              {ok ? <><CheckCircle2 size={18}/><span>Welcome!</span></>
                : loading ? <span style={{ width:'19px',height:'19px',border:'2.5px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite',display:'inline-block' }}/>
                : <><span>Sign In</span><ArrowRight size={17}/></>}
            </button>
          </form>

          {/* ── Divider ── */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px', margin:'26px 0 18px' }}>
            <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg,transparent,${inpBdr})` }}/>
            <span style={{ fontSize:'10.5px', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:txt3 }}>Demo Accounts</span>
            <div style={{ flex:1, height:'1px', background:`linear-gradient(90deg,${inpBdr},transparent)` }}/>
          </div>

          {/* ── Role chips ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'9px' }}>
            {ROLES.map(u => (
              <button key={u.r} type="button" onClick={()=>setForm({email:u.e, password:u.p})}
                style={{ display:'flex', alignItems:'center', gap:'9px', padding:'11px 13px', borderRadius:'13px',
                  border:`1px solid ${inpBdr}`, background:inpBg, cursor:'pointer', fontFamily:'inherit',
                  transition:'all 0.16s ease', textAlign:'left' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=`${u.c}66`; e.currentTarget.style.background=`${u.c}14`; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=inpBdr; e.currentTarget.style.background=inpBg; e.currentTarget.style.transform=''; }}>
                <span style={{ width:'9px', height:'9px', borderRadius:'50%', background:u.c, boxShadow:`0 0 8px ${u.c}`, flexShrink:0 }}/>
                <span style={{ fontSize:'12.5px', fontWeight:700, color:txt1 }}>{u.r}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign:'center', margin:'22px 0 0', fontSize:'11.5px', color:txt3, letterSpacing:'0.02em' }}>
          {barangayName} · &copy; {new Date().getFullYear()} · Official Records Portal
        </p>
      </div>

      <style>{`
        @keyframes drift1  { 0%,100%{transform:translate(0,0)} 33%{transform:translate(40px,-30px)} 66%{transform:translate(-25px,25px)} }
        @keyframes drift2  { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-35px,30px)} 66%{transform:translate(30px,-20px)} }
        @keyframes pulse   { 0%,100%{opacity:0.30} 50%{opacity:0.55} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(220%)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}


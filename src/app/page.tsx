'use client';

import { useEffect, useRef, useState } from 'react';
import {
  deriveKey, deriveAuthHash, encryptJSON, decryptJSON, randomSaltB64,
  generatePassword, passwordStrength, encryptBytes, decryptBytes, buf2b64
} from '@/lib/crypto-client';
import { FIELD_DEFS, CATEGORIES, CATEGORY_ICON, emptyItem, FieldDef } from '@/lib/fields';

type VaultData = { items: any[] };

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [strength, setStrength] = useState(0);

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vault, setVault] = useState<VaultData>({ items: [] });
  const [salt, setSalt] = useState<string>('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const [editing, setEditing] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState('');
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }

  useEffect(() => {
    setBooted(true);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  /* ---------------- Auth ---------------- */

  async function handleSignup() {
    setAuthErr('');
    if (pw.length < 8) return setAuthErr('Master password must be at least 8 characters');
    if (pw !== pw2) return setAuthErr('Passwords do not match');
    const newSalt = randomSaltB64();
    const authHash = await deriveAuthHash(pw, newSalt);
    const res = await fetch('/api/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, authHash, salt: newSalt })
    });
    const json = await res.json();
    if (!res.ok) return setAuthErr(json.error || 'Signup failed');

    const key = await deriveKey(pw, newSalt);
    setVaultKey(key);
    setSalt(newSalt);
    setVault({ items: [] });
    setAuthed(true);
    showToast('Vault created');
  }

  async function handleLogin() {
    setAuthErr('');
    const saltRes = await fetch('/api/login?email=' + encodeURIComponent(email));
    if (!saltRes.ok) return setAuthErr('Account not found');
    const { salt: userSalt } = await saltRes.json();

    const authHash = await deriveAuthHash(pw, userSalt);
    const res = await fetch('/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, authHash })
    });
    const json = await res.json();
    if (!res.ok) return setAuthErr(json.error || 'Login failed');

    try {
      const key = await deriveKey(pw, userSalt);
      let data: VaultData = { items: [] };
      if (json.vault) data = await decryptJSON(json.vault, key);
      setVaultKey(key);
      setSalt(userSalt);
      setVault(data);
      setAuthed(true);
    } catch {
      setAuthErr('Incorrect master password.');
    }
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    setAuthed(false);
    setVaultKey(null);
    setVault({ items: [] });
    setPw(''); setPw2('');
  }

  async function persist(newVault: VaultData) {
    if (!vaultKey) return;
    setVault(newVault);
    const enc = await encryptJSON(newVault, vaultKey);
    await fetch('/api/vault', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enc)
    });
  }

  /* ---------------- Item CRUD ---------------- */

  function openNew() {
    setEditing({ ...emptyItem(), id: '' });
    setRevealed({});
  }
  function openEdit(item: any) {
    setEditing({ ...item });
    setRevealed({});
  }
  async function saveItem(item: any) {
    const id = item.id || ('id_' + Math.random().toString(36).slice(2) + Date.now().toString(36));
    const toSave = { ...item, id, updatedAt: Date.now() };
    const items = [...vault.items];
    const idx = items.findIndex(i => i.id === id);
    if (idx >= 0) items[idx] = toSave; else items.push(toSave);
    await persist({ items });
    setEditing(null);
    showToast('Saved');
  }
  async function deleteItem(id: string) {
    if (!confirm('Delete this item permanently?')) return;
    await persist({ items: vault.items.filter(i => i.id !== id) });
    setEditing(null);
    setViewing(null);
    showToast('Deleted');
  }

  /* ---------------- OCR Import ---------------- */

  async function handleOcrFile(file: File) {
    setOcrBusy(true);
    setOcrStatus('Loading OCR engine...');
    try {
      const Tesseract = (await import('tesseract.js')).default;
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m: any) => {
          if (m.status) setOcrStatus(`${m.status}... ${Math.round((m.progress || 0) * 100)}%`);
        }
      });
      const text = result.data.text;
      const parsed = parseOcrText(text);
      setEditing({ ...emptyItem(), ...parsed, ocrRaw: text });
      setRevealed({});
      showToast('OCR complete — review & save');
    } catch (e) {
      showToast('OCR failed');
    } finally {
      setOcrBusy(false);
      setOcrStatus('');
    }
  }

  function parseOcrText(text: string) {
    const out: any = { notes: text.trim() };
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const urlMatch = text.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) out.url = urlMatch[0];

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) { out.email = emailMatch[0]; out.username = emailMatch[0]; }

    const apiKeyMatch = text.match(/(?:api[_\s-]?key|apikey)\s*[:=]?\s*([A-Za-z0-9\-_]{12,})/i);
    if (apiKeyMatch) out.apiKey = apiKeyMatch[1];

    const tokenMatch = text.match(/(?:token|secret)\s*[:=]?\s*([A-Za-z0-9\-_.]{12,})/i);
    if (tokenMatch) out.token = tokenMatch[1];

    const pwMatch = text.match(/(?:password|pass|pwd)\s*[:=]?\s*(\S{4,})/i);
    if (pwMatch) out.password = pwMatch[1];

    const userMatch = text.match(/(?:username|user|login)\s*[:=]?\s*(\S{2,})/i);
    if (userMatch) out.username = userMatch[1];

    const cardMatch = text.match(/\b(?:\d[ -]?){13,19}\b/);
    if (cardMatch) {
      out.category = 'CARD';
      out.cardNumber = cardMatch[0].replace(/[ -]/g, '');
    }

    out.title = lines[0] ? lines[0].slice(0, 60) : 'Imported from OCR';
    return out;
  }

  /* ---------------- Attachment upload (Cloudinary, client-encrypted) ---------------- */

  async function handleAttachment(file: File, item: any, setItem: (i: any) => void) {
    if (!vaultKey) return;
    showToast('Encrypting & uploading attachment...');
    try {
      const bytes = await file.arrayBuffer();
      const encrypted = await encryptBytes(bytes, vaultKey);

      const signRes = await fetch('/api/cloudinary-sign');
      if (!signRes.ok) { showToast('Cloudinary not configured'); return; }
      const sign = await signRes.json();

      const blob = new Blob([encrypted], { type: 'application/octet-stream' });
      const form = new FormData();
      form.append('file', blob, file.name + '.enc');
      form.append('api_key', sign.apiKey);
      form.append('timestamp', String(sign.timestamp));
      form.append('signature', sign.signature);
      form.append('folder', sign.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/raw/upload`, {
        method: 'POST', body: form
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error?.message || 'Upload failed');

      setItem({ ...item, attachmentUrl: uploadJson.secure_url, attachmentName: file.name });
      showToast('Attachment uploaded (encrypted)');
    } catch (e: any) {
      showToast('Upload failed: ' + (e.message || ''));
    }
  }

  /* ---------------- Export ---------------- */

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const cols = FIELD_DEFS.map(f => f.key);
    const rows = vault.items.map(item => {
      const row: any = {};
      for (const f of FIELD_DEFS) {
        row[f.label] = f.type === 'tags' ? (item[f.key] || []).join(', ') : (item[f.key] ?? '');
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vault');
    XLSX.writeFile(wb, 'crdxcube-vault-export.xlsx');
    showToast('Exported XLSX (contains decrypted data — store safely)');
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('CrdxCube Vault Export', 14, 16);
    doc.setFontSize(9);
    doc.text('CONFIDENTIAL — contains decrypted credentials. Store securely.', 14, 22);

    let y = 30;
    for (const item of vault.items) {
      const body: any[] = [];
      for (const f of FIELD_DEFS) {
        const val = item[f.key];
        if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) continue;
        body.push([f.label, Array.isArray(val) ? val.join(', ') : String(val)]);
      }
      if (y > 260) { doc.addPage(); y = 16; }
      doc.setFontSize(11);
      doc.text(`${CATEGORY_ICON[item.category] || ''} ${item.title || 'Untitled'}`, 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Field', 'Value']],
        body,
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        theme: 'grid'
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    doc.save('crdxcube-vault-export.pdf');
    showToast('Exported PDF (contains decrypted data — store safely)');
  }

  /* ---------------- Filtering ---------------- */

  let items = vault.items.slice().sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || (a.title || '').localeCompare(b.title || ''));
  if (filter === 'favorites') items = items.filter(i => i.favorite);
  else if (filter !== 'all') items = items.filter(i => i.category === filter);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.username || '').toLowerCase().includes(q) ||
      (i.url || '').toLowerCase().includes(q) ||
      (i.tags || []).join(',').toLowerCase().includes(q)
    );
  }

  if (!booted) return null;

  /* ================= RENDER ================= */

  if (!authed) {
    return (
      <div className="lock-screen">
        <div className="glass card lock-card">
          <div className="logo">🔐</div>
          <h1>CrdxCube</h1>
          <p className="sub">Zero-knowledge encrypted vault. OCR & camera import, encrypted attachments, XLSX/PDF export — all client-side encrypted before it ever leaves your device.</p>

          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Master password" value={pw}
            onChange={e => { setPw(e.target.value); setStrength(passwordStrength(e.target.value)); }} />
          {authMode === 'signup' && (
            <>
              <input type="password" placeholder="Confirm master password" value={pw2} onChange={e => setPw2(e.target.value)} />
              <div className="strength-bar"><div id="strengthFill" style={{
                width: `${strength / 5 * 100}%`,
                background: ['#ff5c7a', '#ff5c7a', '#ffb86b', '#ffd166', '#9aff8c', '#5cffb1'][strength]
              }}></div></div>
            </>
          )}
          <p className="error">{authErr}</p>
          <button className="btn primary" onClick={authMode === 'signup' ? handleSignup : handleLogin}>
            {authMode === 'signup' ? 'Create Vault' : 'Unlock Vault'}
          </button>
          <button className="link-btn" onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setAuthErr(''); }}>
            {authMode === 'signup' ? 'Already have a vault? Sign in' : "Don't have a vault? Create one"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar glass">
        <div className="brand">🔐 CrdxCube</div>
        <div className="search-wrap">
          <input placeholder="Search credentials..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="icon-btn" title="Lock vault" onClick={handleLogout}>🔒</button>
      </header>

      <nav className="tabbar glass">
        {['all', ...CATEGORIES, 'favorites'].map(c => (
          <button key={c} className={'tab' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>
            {c === 'all' ? 'All' : c === 'favorites' ? '★ Favorites' : (CATEGORY_ICON[c] || '') + ' ' + c.replace('_', ' ')}
          </button>
        ))}
      </nav>

      <div className="toolbar">
        <button className="btn ghost small" onClick={() => fileInputRef.current?.click()}>📄 OCR Import</button>
        <button className="btn ghost small" onClick={() => cameraInputRef.current?.click()}>📷 Camera Scan</button>
        <button className="btn ghost small" onClick={exportXlsx}>📊 Export XLSX</button>
        <button className="btn ghost small" onClick={exportPdf}>📕 Export PDF</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
        onChange={e => e.target.files?.[0] && handleOcrFile(e.target.files[0])} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleOcrFile(e.target.files[0])} />

      {ocrBusy && (
        <div className="ocr-status"><span className="spinner"></span>{ocrStatus}</div>
      )}

      <main className="vault-list">
        {items.length === 0 && <div className="empty-state">No items found.<br />Tap + to add, or use OCR / Camera import.</div>}
        {items.map(item => (
          <div key={item.id} className="item-card glass" onClick={() => { setViewing(item); setRevealed({}); }}>
            <div className="item-icon">{CATEGORY_ICON[item.category] || '📁'}</div>
            <div className="item-meta">
              <div className="title">{item.title || 'Untitled'}</div>
              <p className="sub">{item.username || item.url || (item.tags || []).join(', ') || ''}</p>
            </div>
            {item.favorite && <div className="fav-star">★</div>}
          </div>
        ))}
      </main>

      <button className="fab" onClick={openNew}>+</button>

      {editing && (
        <ItemEditor
          item={editing}
          onChange={setEditing}
          onSave={saveItem}
          onDelete={editing.id ? () => deleteItem(editing.id) : undefined}
          onClose={() => setEditing(null)}
          onAttach={(file: File) => handleAttachment(file, editing, setEditing)}
          revealed={revealed}
          setRevealed={setRevealed}
        />
      )}

      {viewing && (
        <ItemViewer
          item={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing({ ...viewing }); setViewing(null); setRevealed({}); }}
          revealed={revealed}
          setRevealed={setRevealed}
          showToast={showToast}
        />
      )}

      {toast && <div className="toast show">{toast}</div>}
    </div>
  );
}

/* ================= Item Editor ================= */

function ItemEditor({ item, onChange, onSave, onDelete, onClose, onAttach, revealed, setRevealed }: any) {
  const groups: Record<string, FieldDef[]> = {};
  for (const f of FIELD_DEFS) {
    (groups[f.group] ||= []).push(f);
  }
  const attachRef = useRef<HTMLInputElement>(null);

  function set(key: string, value: any) {
    onChange({ ...item, [key]: value });
  }

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="glass card editor-card">
        <div className="editor-header">
          <h2>{item.id ? 'Edit Item' : 'New Item'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(item); }}>
          {Object.entries(groups).map(([group, fields]) => (
            <div key={group}>
              <div className="field-group-title">{group}</div>
              {fields.map(f => (
                <FieldInput key={f.key} field={f} value={item[f.key]} onChange={v => set(f.key, v)}
                  revealed={revealed} setRevealed={setRevealed} />
              ))}
              {group === 'Attachment' && (
                <>
                  <input ref={attachRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && onAttach(e.target.files[0])} />
                  <button type="button" className="btn ghost small" onClick={() => attachRef.current?.click()} style={{ marginBottom: 12 }}>
                    📎 Upload encrypted attachment
                  </button>
                </>
              )}
            </div>
          ))}

          <div className="editor-actions">
            {onDelete && <button type="button" className="btn danger" onClick={onDelete}>Delete</button>}
            <button type="submit" className="btn primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange, revealed, setRevealed }: { field: FieldDef; value: any; onChange: (v: any) => void; revealed: Record<string, boolean>; setRevealed: (r: any) => void }) {
  const isShown = revealed[field.key];

  if (field.type === 'checkbox') {
    return (
      <label className="checkbox-row">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> {field.label}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label>{field.label}
        <select value={value || ''} onChange={e => onChange(e.target.value)}>
          {field.options?.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'tags') {
    return (
      <label>{field.label}
        <input type="text" value={(value || []).join(', ')}
          onChange={e => onChange(e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
          placeholder="comma, separated, tags" />
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label>{field.label}
        <textarea rows={field.key.includes('Key') || field.key === 'certificate' ? 4 : 2}
          value={value || ''} onChange={e => onChange(e.target.value)} />
      </label>
    );
  }
  if (field.type === 'date') {
    return <label>{field.label}<input type="date" value={value || ''} onChange={e => onChange(e.target.value)} /></label>;
  }
  if (field.type === 'password' && field.sensitive) {
    return (
      <label>{field.label}
        <div className="pw-row">
          <input type={isShown ? 'text' : 'password'} value={value || ''} onChange={e => onChange(e.target.value)} />
          <button type="button" className="icon-btn" onClick={() => setRevealed((r: any) => ({ ...r, [field.key]: !r[field.key] }))}>👁</button>
          {field.key === 'password' && (
            <button type="button" className="icon-btn" onClick={() => onChange(generatePassword(20))}>🎲</button>
          )}
        </div>
      </label>
    );
  }
  return <label>{field.label}<input type="text" value={value || ''} onChange={e => onChange(e.target.value)} /></label>;
}

/* ================= Item Viewer ================= */

function ItemViewer({ item, onClose, onEdit, revealed, setRevealed, showToast }: any) {
  function copy(label: string, val: string) {
    navigator.clipboard.writeText(val).then(() => {
      showToast(`${label} copied — clears in 20s`);
      setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 20000);
    });
  }

  const populated = FIELD_DEFS.filter(f => {
    const v = item[f.key];
    if (f.key === 'title' || f.key === 'category') return false;
    return v !== undefined && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div className="modal">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="glass card view-card">
        <div className="editor-header">
          <h2>{CATEGORY_ICON[item.category] || ''} {item.title}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="view-body">
          {populated.map(f => {
            const val = item[f.key];
            const display = Array.isArray(val) ? val.join(', ') : String(val);
            const masked = f.sensitive && !revealed[f.key];
            return (
              <div key={f.key} className="field-row">
                <div className="fv">
                  <div className="fl">{f.label}</div>
                  <div className="fval">{masked ? '•'.repeat(Math.min(display.length, 16)) : display}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {f.sensitive && (
                    <button className="icon-btn" onClick={() => setRevealed((r: any) => ({ ...r, [f.key]: !r[f.key] }))}>👁</button>
                  )}
                  <button className="icon-btn" onClick={() => copy(f.label, display)}>📋</button>
                </div>
              </div>
            );
          })}
          {populated.length === 0 && <div className="empty-state">No additional fields.</div>}
        </div>
        <div className="editor-actions">
          <button className="btn ghost" onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
}

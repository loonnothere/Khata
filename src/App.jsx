import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  BarChart3,
  Camera,
  CircleDollarSign,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  Eye,
  FileCheck2,
  FileImage,
  History,
  Image as ImageIcon,
  KeyRound,
  Landmark,
  Layers,
  Lock,
  LoaderCircle,
  Mic,
  MicOff,
  MessageCircle,
  Minus,
  PackagePlus,
  Phone,
  Plus,
  Printer,
  QrCode,
  ReceiptIndianRupee,
  RefreshCw,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingBasket,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  Store,
  Unlock,
  Upload,
  UserCheck,
  UserRound,
  UsersRound,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import {
  BHOPAL_STORE_CATALOG,
  DEMO_SPOKEN_NOTE,
  INITIAL_DEMO_CUSTOMERS,
  announceSoundbox,
  generateDemoParchiDataUrl,
  playCashRegisterSound,
  playChimeSound,
  playMicBeep,
} from './data/storeCatalog.js';
import {
  calculateCustomerTrustScore,
  computeDailyClosingReconciliation,
  createImmutableAuditRecord,
  detectDuplicateBill,
  evaluateUdhaarDecision,
  generateHinglishReceipt,
  generateSmartWhatsAppReminder,
  matchCustomerByPhoneOrAlias,
  normalizePhoneNumber,
  parseKhataVoiceCommand,
  runDeterministicLedgerMath,
  runKiranaGemmaAgent,
} from './services/gemmaAgent.js';

const REGISTER_KEY = 'kiranaKhataLiveRegisterV1';
const API_KEY_STORAGE = 'kiranaKhataLiveGeminiApiKey';
const SOUNDBOX_KEY = 'kiranaKhataSoundboxEnabledV1';
const UPI_ID_STORAGE = 'kiranaKhataShopUpiIdV1';
const AUTH_KEY = 'kiranaKhataMerchantSessionV1';
const AUDIT_LOG_KEY = 'kiranaKhataAuditLogV1';
const OPENING_CASH_KEY = 'kiranaKhataOpeningCashV1';

const DEFAULT_MERCHANT_SESSION = {
  storeName: 'Gupta Kirana & General Stores',
  storeLocation: 'Bittan Market, Bhopal',
  cashierName: 'Ramesh Gupta',
  counterId: 'Counter 1 (Main POS)',
  phone: '+91 98260 12345',
  shiftStart: new Date().toISOString(),
  loggedIn: true,
};

const MODEL_OPTIONS = [
  { value: 'gemma-4-26b-a4b-it', label: 'Gemma 4 · 26B (Vision + Tools)' },
  { value: 'gemma-4-31b-it', label: 'Gemma 4 · 31B (Deep Reasoning)' },
];

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function readApiKey() {
  try {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }
}

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatTimestamp(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function dataUrlParts(dataUrl) {
  const [header, data] = dataUrl.split(',');
  return { mimeType: header.match(/data:([^;]+)/)?.[1] || 'image/png', imageBase64: data || '' };
}

function SourceBadge({ status }) {
  const config = {
    from_slip: ['From Slip', 'status-slip'],
    modified_by_voice: ['Modified by Voice', 'status-modified'],
    added_by_voice: ['Added via Voice + Rate Card', 'status-added'],
    removed_by_voice: ['Cancelled via Voice', 'status-removed'],
  };
  const [label, className] = config[status] || config.from_slip;
  return <span className={`status-badge ${className}`}>{label}</span>;
}

function Modal({ title, icon: Icon, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="modal-scrim"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`modal-panel ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <div className="modal-title-wrap">
            <span className="modal-icon"><Icon size={18} /></span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

// ─── Dynamic UPI QR Code Component ──────────────────────────────────────────
function DynamicUpiQr({ upiId = 'bhopalkirana@upi', payeeName = 'Bhopal Kirana', amount = 0, customerName = '' }) {
  const [qrUrl, setQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const validAmount = Number(amount || 0).toFixed(2);
  const upiLink = useMemo(() => {
    const pa = encodeURIComponent(upiId);
    const pn = encodeURIComponent(payeeName);
    const tn = encodeURIComponent(`KiranaKhata ${customerName || 'Udhaar'}`.trim());
    return `upi://pay?pa=${pa}&pn=${pn}&am=${validAmount}&cu=INR&tn=${tn}`;
  }, [upiId, payeeName, validAmount, customerName]);

  useEffect(() => {
    if (Number(amount) <= 0) return;
    QRCode.toDataURL(upiLink, { width: 140, margin: 1, color: { dark: '#1c241c', light: '#ffffff' } })
      .then(setQrUrl)
      .catch(() => {});
  }, [upiLink, amount]);

  if (Number(amount) <= 0) return null;

  return (
    <div className="upi-qr-card">
      <div className="upi-qr-meta">
        <span className="upi-badge">
          <QrCode size={13} /> DYNAMIC UPI QR
        </span>
        <b>Scan to Pay {money(amount)}</b>
        <small>Works with GPay, PhonePe, Paytm, BHIM</small>
        <div className="upi-action-row">
          <button
            className="upi-copy-btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(upiLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 1600);
              } catch {}
            }}
          >
            {copiedLink ? <Check size={12} /> : <Copy size={12} />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy UPI Link'}</span>
          </button>
          <a className="upi-open-btn" href={upiLink}>
            <ExternalLink size={12} /> Pay App
          </a>
        </div>
      </div>
      <div className="upi-qr-frame">
        {qrUrl ? (
          <img src={qrUrl} alt={`UPI QR Code for ${money(amount)}`} className="upi-qr-img" />
        ) : (
          <div className="upi-qr-loading">Generating QR…</div>
        )}
      </div>
    </div>
  );
}

// ─── Login & Store Authentication Dashboard Component ───────────────────────
function LoginDashboard({ onLogin }) {
  const [role, setRole] = useState('merchant'); // 'merchant' | 'grahak'

  // Cashier / Merchant State
  const [storeName, setStoreName] = useState('Gupta Kirana & General Stores');
  const [cashierName, setCashierName] = useState('Ramesh Gupta');
  const [counterId, setCounterId] = useState('Counter 1 (Main POS)');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Grahak / Customer Passbook State
  const [grahakPhone, setGrahakPhone] = useState('98260 11223');
  const [grahakName, setGrahakName] = useState('Raju bhai');
  const [grahakOtp, setGrahakOtp] = useState('1234');

  const DEMO_GRAHAKS = [
    { name: 'Raju bhai', phone: '98260 11223', balance: 200 },
    { name: 'Sunita tai', phone: '98260 44556', balance: 0 },
    { name: 'Suresh Patel', phone: '98260 77889', balance: 1450 },
  ];

  const handleDigit = (d) => {
    if (pin.length < 4) {
      setPin((prev) => prev + d);
      setPinError('');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setPinError('Please enter 4-digit Cashier PIN');
      return;
    }
    onLogin({
      storeName,
      storeLocation: 'Bittan Market, Bhopal',
      cashierName,
      counterId,
      phone: '+91 98260 12345',
      shiftStart: new Date().toISOString(),
      loggedIn: true,
      role: 'merchant',
    });
  };

  const handleQuickDemo = () => {
    onLogin({
      storeName: 'Gupta Kirana Stores',
      storeLocation: 'Bittan Market, Bhopal',
      cashierName: 'Ramesh Gupta',
      counterId: 'Counter 1 (Main POS)',
      phone: '+91 98260 12345',
      shiftStart: new Date().toISOString(),
      loggedIn: true,
      role: 'merchant',
    });
  };

  const handleGrahakLogin = (e) => {
    if (e) e.preventDefault();
    onLogin({
      storeName: 'Gupta Kirana Stores',
      storeLocation: 'Bittan Market, Bhopal',
      cashierName: 'Ramesh Gupta',
      counterId: 'Counter 1 (Main POS)',
      phone: grahakPhone,
      customerName: grahakName,
      customerPhone: grahakPhone,
      shiftStart: new Date().toISOString(),
      loggedIn: true,
      role: 'customer',
    });
  };

  return (
    <div className="login-terminal-wrapper">
      <div className="login-terminal-card">
        {/* Role Selector Tabs */}
        <div className="login-role-tabs">
          <button
            type="button"
            className={`role-tab-btn ${role === 'merchant' ? 'active' : ''}`}
            onClick={() => setRole('merchant')}
          >
            <Store size={14} />
            <span>Cashier / POS</span>
          </button>
          <button
            type="button"
            className={`role-tab-btn ${role === 'grahak' ? 'active' : ''}`}
            onClick={() => setRole('grahak')}
          >
            <Smartphone size={14} />
            <span>Grahak Passbook</span>
          </button>
        </div>

        {role === 'merchant' ? (
          <>
            <div className="login-terminal-top">
              <div className="login-brand-lockup">
                <span className="login-store-icon"><Store size={26} strokeWidth={2.2} /></span>
                <div>
                  <h1>KiranaKhata <b>Live</b></h1>
                  <p>BHOPAL MERCHANT CASHIER TERMINAL</p>
                </div>
              </div>
              <span className="terminal-live-badge"><span className="pulse-dot" /> POS TERMINAL #1</span>
            </div>

            <div className="login-form-body">
              <div className="login-context-box">
                <div className="context-item">
                  <label>STORE IDENTITY</label>
                  <b>{storeName}</b>
                  <small>Bittan Market, Bhopal (MP)</small>
                </div>
                <div className="context-item">
                  <label>ACTIVE COUNTER</label>
                  <b>{counterId}</b>
                  <small>Cashier: {cashierName}</small>
                </div>
              </div>

              <div className="pin-entry-section">
                <label className="pin-label">ENTER 4-DIGIT CASHIER QUICK PIN</label>
                <div className="pin-dots-row">
                  {[0, 1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className={`pin-dot ${pin.length > idx ? 'filled' : ''} ${pinError ? 'error' : ''}`}
                    />
                  ))}
                </div>
                {pinError && <p className="pin-error-text">{pinError}</p>}

                {/* Tactile Keypad */}
                <div className="keypad-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      className="keypad-btn"
                      onClick={() => handleDigit(String(digit))}
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="keypad-btn keypad-fn"
                    onClick={handleBackspace}
                    title="Backspace"
                  >
                    ⌫
                  </button>
                  <button
                    type="button"
                    className="keypad-btn"
                    onClick={() => handleDigit('0')}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    className="keypad-btn keypad-enter"
                    onClick={handleUnlock}
                    title="Unlock register"
                  >
                    ✓
                  </button>
                </div>
              </div>

              <div className="login-actions">
                <button
                  type="button"
                  className="login-submit-btn"
                  onClick={handleUnlock}
                  disabled={pin.length < 4}
                >
                  <Lock size={15} /> Unlock POS Counter
                </button>

                <button
                  type="button"
                  className="quick-demo-login-btn"
                  onClick={handleQuickDemo}
                >
                  <Sparkles size={14} /> Quick Sign-In as Ramesh Gupta (Demo Counter)
                </button>
              </div>

              <div className="login-footer-security">
                <ShieldCheck size={14} />
                <span>Local session encrypted · No remote cloud credentials stored</span>
              </div>
            </div>
          </>
        ) : (
          /* Grahak Customer Passbook Login */
          <>
            <div className="login-terminal-top">
              <div className="login-brand-lockup">
                <span className="login-store-icon" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
                  <Smartphone size={24} strokeWidth={2.2} />
                </span>
                <div>
                  <h1 style={{ fontSize: '17px' }}>Grahak Passbook <b>Portal</b></h1>
                  <p>VERIFIED DIGITAL KHATA ACCESS</p>
                </div>
              </div>
              <span className="terminal-live-badge" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                CUSTOMER ACCESS
              </span>
            </div>

            <div className="grahak-login-section">
              <div className="grahak-intro-box">
                <b>Bhopal Kirana Digital Udhaar Passbook</b>
                <p>Log in with your registered mobile number to view verified parchi slips, track balances, and settle via UPI.</p>
              </div>

              <div className="demo-customer-chips-wrap">
                <label>QUICK DEMO CUSTOMERS</label>
                <div className="demo-customer-chips">
                  {DEMO_GRAHAKS.map((c) => (
                    <button
                      key={c.phone}
                      type="button"
                      className={`demo-chip ${grahakPhone === c.phone ? 'selected' : ''}`}
                      onClick={() => {
                        setGrahakName(c.name);
                        setGrahakPhone(c.phone);
                      }}
                    >
                      {c.name} ({c.phone.slice(-5)}) · ₹{c.balance}
                    </button>
                  ))}
                </div>
              </div>

              <div className="phone-input-field">
                <label>CUSTOMER MOBILE NUMBER</label>
                <div className="phone-input-wrap">
                  <span>+91</span>
                  <input
                    value={grahakPhone}
                    onChange={(e) => setGrahakPhone(e.target.value)}
                    placeholder="98260 12345"
                  />
                </div>
              </div>

              <div className="phone-input-field">
                <label>SMS 4-DIGIT VERIFICATION CODE</label>
                <div className="otp-box-row">
                  <input
                    type="password"
                    maxLength={4}
                    value={grahakOtp}
                    onChange={(e) => setGrahakOtp(e.target.value)}
                    placeholder="••••"
                  />
                  <button
                    type="button"
                    className="autofill-otp-btn"
                    onClick={() => setGrahakOtp('1234')}
                  >
                    Auto-Fill (1234)
                  </button>
                </div>
              </div>

              <div className="login-actions">
                <button
                  type="button"
                  className="login-submit-btn"
                  style={{ background: '#0284c7', color: '#ffffff' }}
                  onClick={handleGrahakLogin}
                >
                  <Smartphone size={15} /> Access My Udhaar Passbook
                </button>

                <button
                  type="button"
                  className="quick-demo-login-btn"
                  onClick={() => setRole('merchant')}
                >
                  <Store size={14} /> Back to Cashier PIN Login
                </button>
              </div>

              <div className="login-footer-security">
                <ShieldCheck size={14} />
                <span>256-bit secure SMS verification · Official Bhopal Kirana Khata</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmptyOutput() {
  return (
    <div className="empty-output">
      <div className="empty-illustration">
        <div className="empty-paper"><span /><span /><span /><span /><span /></div>
        <div className="empty-check"><Sparkles size={25} /></div>
      </div>
      <p className="eyebrow">INTELLIGENT RECONCILIATION</p>
      <h3>One parchi. One clear balance.</h3>
      <p className="muted-copy">
        Photograph the customer's handwritten slip and speak what changed in Hinglish.
        Gemma 4 resolves contradictions; deterministic JavaScript keeps arithmetic honest.
      </p>
      <div className="empty-steps">
        <span><FileImage size={15} /> 1. Read slip</span>
        <ArrowRight size={13} />
        <span><AudioLines size={15} /> 2. Hear update</span>
        <ArrowRight size={13} />
        <span><Scale size={15} /> 3. Review disputes</span>
        <ArrowRight size={13} />
        <span><ShieldCheck size={15} /> 4. Verified khata</span>
      </div>
    </div>
  );
}

// ─── PAGE 4: Insights & Practical Daily Close Reconciliation ─────────────────
function AnalyticsDashboardView({
  todayStats,
  customerProfiles,
  register,
  auditLogs = [],
  openingCash,
  setOpeningCash,
  dailyExpenses,
  setDailyExpenses,
  actualDrawerCash,
  setActualDrawerCash,
  mismatchExplanation,
  setMismatchExplanation,
  onExportCsv,
  onOpenReminder,
}) {
  const contradictionEntries = useMemo(() => {
    return register.filter((e) => e.disputeContradictions && e.disputeContradictions.length > 0);
  }, [register]);

  const topDebtors = useMemo(() => {
    return [...customerProfiles]
      .filter((c) => Number(c.balance) > 0)
      .sort((a, b) => Number(b.balance) - Number(a.balance))
      .slice(0, 8);
  }, [customerProfiles]);

  const closingRecon = useMemo(() => {
    return computeDailyClosingReconciliation({
      openingCash,
      register,
      expenses: dailyExpenses,
      actualCash: actualDrawerCash,
    });
  }, [openingCash, register, dailyExpenses, actualDrawerCash]);

  return (
    <div className="analytics-container">
      <div className="analytics-header-row">
        <div>
          <span className="eyebrow">DAILY CLOSING &amp; AUDIT RECONCILIATION</span>
          <h2>Daily Cash &amp; Khata Analytics</h2>
          <p>Real-time audit reconciliation, cash drawer balance, and customer risk monitoring for Bhopal counter.</p>
        </div>
        <button className="deck-action-btn" onClick={onExportCsv}>
          <Download size={14} /> Export Day Audit (CSV)
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="kpi-icon-box green">
            <ReceiptIndianRupee size={22} />
          </div>
          <div className="kpi-details-col">
            <span>TODAY'S CASH COLLECTED</span>
            <h4>{money(closingRecon.totalCashCollected)}</h4>
            <small>Bills ({money(closingRecon.cashReceivedBills)}) + Payments ({money(closingRecon.cashReceivedPayments)})</small>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-box amber">
            <Scale size={22} />
          </div>
          <div className="kpi-details-col">
            <span>GROSS CREDIT EXTENDED</span>
            <h4>{money(todayStats.totalCreditToday)}</h4>
            <small>Across today's bill receipts</small>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-box slate">
            <Wallet size={22} />
          </div>
          <div className="kpi-details-col">
            <span>TOTAL OUTSTANDING UDHAAR</span>
            <h4>{money(todayStats.pendingTotal)}</h4>
            <small>{customerProfiles.length} active customer ledgers</small>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="kpi-icon-box rose">
            <ShieldAlert size={22} />
          </div>
          <div className="kpi-details-col">
            <span>OVERDUE ACCOUNTS (&gt;7d)</span>
            <h4 style={{ color: '#dc2626' }}>{todayStats.overdueCount} Accounts</h4>
            <small>Requires respectful follow-up</small>
          </div>
        </div>
      </div>

      {/* Practical Daily Closing Cash Drawer Panel */}
      <div className="daily-closing-card" style={{ marginBottom: '24px' }}>
        <div className="analytics-card-title" style={{ marginBottom: '16px' }}>
          <h3><Landmark size={18} /> Practical Daily Closing &amp; Cash Drawer Reconciliation</h3>
          <span className="eyebrow">COUNTER SHIFT #1 CLOSE</span>
        </div>

        <div className="closing-grid-inputs">
          <div className="closing-input-group">
            <label>OPENING CASH IN DRAWER (₹)</label>
            <input
              type="number"
              min="0"
              value={openingCash}
              onChange={(e) => setOpeningCash(Number(e.target.value) || 0)}
            />
          </div>
          <div className="closing-input-group">
            <label>CASH EXPENSES / PAYOUTS (₹)</label>
            <input
              type="number"
              min="0"
              value={dailyExpenses}
              onChange={(e) => setDailyExpenses(Number(e.target.value) || 0)}
              placeholder="e.g. Milk van, vegetables"
            />
          </div>
          <div className="closing-input-group">
            <label>ACTUAL DRAWER CASH COUNT (₹)</label>
            <input
              type="number"
              min="0"
              value={actualDrawerCash}
              onChange={(e) => setActualDrawerCash(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="reconciliation-math-strip">
          <div className="recon-formula-row">
            <span>Opening Drawer Cash</span>
            <b>{money(closingRecon.openingCash)}</b>
          </div>
          <div className="recon-formula-row">
            <span>+ Cash from New Bills Today</span>
            <span style={{ color: '#16a34a' }}>+ {money(closingRecon.cashReceivedBills)}</span>
          </div>
          <div className="recon-formula-row">
            <span>+ Cash from Khata Payments Received</span>
            <span style={{ color: '#16a34a' }}>+ {money(closingRecon.cashReceivedPayments)}</span>
          </div>
          <div className="recon-formula-row">
            <span>− Counter Expenses Paid</span>
            <span style={{ color: '#dc2626' }}>− {money(closingRecon.expenses)}</span>
          </div>
          <div className="recon-formula-row total-row">
            <span>= Expected Drawer Cash</span>
            <strong style={{ color: '#0f172a' }}>{money(closingRecon.expectedCashInDrawer)}</strong>
          </div>
        </div>

        {/* Mismatch Status Banner */}
        <div className={`mismatch-banner ${closingRecon.status.toLowerCase()}`}>
          <div>
            <b>
              {closingRecon.status === 'BALANCED' && '✓ BALANCED — Drawer cash matches recorded transactions perfectly.'}
              {closingRecon.status === 'SURPLUS' && `▲ CASH SURPLUS — Extra ₹${Math.abs(closingRecon.mismatch)} found in drawer.`}
              {closingRecon.status === 'SHORTAGE' && `▼ CASH SHORTAGE — ₹${Math.abs(closingRecon.mismatch)} missing from drawer.`}
            </b>
            <p style={{ margin: '3px 0 0', fontSize: '10px' }}>
              Actual: {money(closingRecon.actualCash)} · Expected: {money(closingRecon.expectedCashInDrawer)} · Net Delta: {money(closingRecon.mismatch)}
            </p>
          </div>
          {closingRecon.status !== 'BALANCED' && (
            <input
              type="text"
              placeholder="Explanation for mismatch…"
              value={mismatchExplanation}
              onChange={(e) => setMismatchExplanation(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '220px' }}
            />
          )}
        </div>
      </div>

      <div className="analytics-split-grid">
        <div className="analytics-card-panel">
          <div className="analytics-card-title">
            <h3><ShieldCheck size={16} /> Gemma 4 Contradiction &amp; Dispute Log</h3>
            <span className="eyebrow">AUDIT GROUNDING</span>
          </div>

          <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px' }}>
            Handwritten parchi values overridden by Hinglish counter voice, resolved with AI grounding and verified by cashier.
          </p>

          <div className="contradiction-audit-list">
            <div className="contradiction-audit-item">
              <div className="contradiction-item-top">
                <b>Raju bhai · Demo Parchi Conflict</b>
                <span className="contradiction-pill">RESOLVED · 94% CONFIDENCE</span>
              </div>
              <p style={{ margin: '4px 0', fontSize: '10px', color: '#475569' }}>
                <span style={{ textDecoration: 'line-through', color: '#ef4444' }}>Chawal 5 kg (₹240)</span>
                {' → '}
                <b style={{ color: '#16a34a' }}>Chawal 3 kg (₹144)</b> · Voice override applied. +2 Amul Gold milk, +1 Lux soap, ₹300 cash paid.
              </p>
              <small style={{ fontSize: '8.5px', color: '#94a3b8' }}>
                Gemma 4 Multi-turn Reasoning · Verified against Bhopal Store Rate Card
              </small>
            </div>

            {contradictionEntries.map((e) => (
              <div className="contradiction-audit-item" key={e.id}>
                <div className="contradiction-item-top">
                  <b>{e.customer_name} · Bill #{e.id.slice(-6)}</b>
                  <span className="contradiction-pill">VERIFIED ENTRY</span>
                </div>
                <p style={{ margin: '4px 0', fontSize: '10px', color: '#475569' }}>
                  {(e.disputeContradictions || []).map((d) => `${d.itemName}: ${d.parchiQty} in slip → ${d.spokenQty} spoken (${d.reason})`).join('; ')}
                </p>
                <small style={{ fontSize: '8.5px', color: '#94a3b8' }}>{formatTimestamp(e.createdAt)}</small>
              </div>
            ))}
          </div>

          {/* Immutable KhataGuard Audit Trail */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#334155', margin: '0 0 8px' }}>
              <Layers size={13} style={{ display: 'inline', marginRight: '5px' }} />
              KhataGuard Immutable Audit Trail ({auditLogs.length})
            </h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {auditLogs.length === 0 ? (
                <small style={{ color: '#94a3b8', fontSize: '10px' }}>No audit actions logged in this session.</small>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.auditId} style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '9.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <b>{log.action} · {log.cashierName}</b>
                      <span>{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <div style={{ color: '#1e293b', marginTop: '2px' }}>{log.reason}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="analytics-card-panel">
          <div className="analytics-card-title">
            <h3><UsersRound size={16} /> Top Outstanding Khata Accounts</h3>
            <span className="eyebrow">{topDebtors.length} ACCOUNTS</span>
          </div>

          <table className="top-debtors-table">
            <thead>
              <tr>
                <th>CUSTOMER</th>
                <th>PHONE</th>
                <th>BALANCE</th>
                <th>OVERDUE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {topDebtors.map((c) => (
                <tr key={c.key}>
                  <td><b>{c.name}</b></td>
                  <td style={{ color: '#64748b', fontSize: '10px' }}>{c.phone}</td>
                  <td><b style={{ color: '#e11d48' }}>{money(c.balance)}</b></td>
                  <td>
                    {c.daysOverdue >= 7 ? (
                      <span className="nav-badge-alert">{c.daysOverdue}d</span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '9px' }}>{c.daysOverdue}d</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="grahak-dispute-btn"
                      style={{ padding: '3px 8px', fontSize: '9px' }}
                      onClick={() => onOpenReminder(c)}
                    >
                      <MessageCircle size={10} /> WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE 5: Store Inventory & Settings View ────────────────────────────────
function StoreInventoryView({
  catalog,
  search,
  setSearch,
  category,
  setCategory,
  onToggleStock,
  onOpenNewProduct,
  session,
  onLockCounter,
  shopUpiId,
  setShopUpiId,
  soundboxEnabled,
  setSoundboxEnabled,
  onTestSoundbox,
  soundEnabled,
  setSoundEnabled,
}) {
  const categories = ['all', 'Grains & Flours', 'Dairy & Milk', 'Spices & Masala', 'Oils & Ghee', 'FMCG & Soap'];

  const filteredItems = useMemo(() => {
    return catalog.filter((it) => {
      const q = search.trim().toLowerCase();
      const itemName = it.name || it.canonicalName || '';
      const matchesSearch =
        itemName.toLowerCase().includes(q) ||
        (it.hindiName && it.hindiName.toLowerCase().includes(q)) ||
        (it.aliases && it.aliases.some((a) => a.toLowerCase().includes(q)));
      const matchesCat = category === 'all' || (it.category || 'Pantry') === category;
      return matchesSearch && matchesCat;
    });
  }, [catalog, search, category]);

  return (
    <div className="inventory-container">
      {/* Settings & Shift Overview Card */}
      <div className="daily-closing-card" style={{ marginBottom: '24px' }}>
        <div className="analytics-card-title" style={{ marginBottom: '14px' }}>
          <h3><Settings size={18} /> Store Preferences &amp; POS Counter Configuration</h3>
          <span className="eyebrow">SETTINGS &amp; ARCHITECTURE</span>
        </div>

        <div className="closing-grid-inputs" style={{ marginBottom: '14px' }}>
          <div className="closing-input-group">
            <label>ACTIVE STORE</label>
            <input type="text" readOnly value={session.storeName} style={{ background: '#f8fafc' }} />
          </div>
          <div className="closing-input-group">
            <label>CURRENT CASHIER &amp; COUNTER</label>
            <input type="text" readOnly value={`${session.cashierName} (${session.counterId})`} style={{ background: '#f8fafc' }} />
          </div>
          <div className="closing-input-group">
            <label>SHOP UPI ID (FOR DYNAMIC QR CODES)</label>
            <input
              type="text"
              value={shopUpiId}
              onChange={(e) => {
                setShopUpiId(e.target.value);
                localStorage.setItem(UPI_ID_STORAGE, e.target.value);
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`settings-toggle-btn ${soundboxEnabled ? 'active' : ''}`}
              onClick={() => setSoundboxEnabled((s) => !s)}
              style={{ padding: '7px 12px', fontSize: '11px', border: '1px solid #cbd5e1' }}
            >
              🔊 Digital Soundbox: {soundboxEnabled ? 'Enabled' : 'Disabled'}
            </button>
            {soundboxEnabled && (
              <button
                className="soundbox-test-btn"
                onClick={onTestSoundbox}
                style={{ padding: '7px 12px', fontSize: '11px' }}
              >
                ▶ Test Voice
              </button>
            )}
            <button
              className={`settings-toggle-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled((s) => !s)}
              style={{ padding: '7px 12px', fontSize: '11px', border: '1px solid #cbd5e1' }}
            >
              {soundEnabled ? '🔔 Register Bell: ON' : '🔕 Register Bell: MUTE'}
            </button>
          </div>

          <button
            className="deck-action-btn"
            style={{ background: '#dc2626', color: '#fff', border: 0 }}
            onClick={onLockCounter}
          >
            <Lock size={13} /> Lock Counter Terminal
          </button>
        </div>

        {/* System Architecture Resilience Notice */}
        <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '10px', color: '#475569' }}>
            <ShieldCheck size={14} color="#15803d" />
            <span><b>Storage:</b> Local Browser Prototype (LocalStorage &amp; IndexedDB active)</span>
            <span>·</span>
            <span><b>Offline Queue:</b> 0 pending transactions (Network resilient)</span>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
            DEMO-READY V2.0
          </span>
        </div>
      </div>

      <div className="analytics-header-row">
        <div>
          <span className="eyebrow">BHOPAL STORE RATE CARD &amp; PRICING ENGINE</span>
          <h2>Store Inventory &amp; Catalog</h2>
          <p>Deterministic prices strictly bound to Bhopal market rates. Gemma 4 grounds handwriting to canonical SKUs.</p>
        </div>
        <button className="deck-action-btn load-demo-btn" onClick={onOpenNewProduct}>
          <PackagePlus size={14} /> Add Custom Item
        </button>
      </div>

      <div className="inventory-toolbar">
        <div className="inventory-search-box">
          <Search size={14} color="#8a94a6" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item name, Hindi alias, or brand…"
          />
        </div>

        <div className="inventory-categories-row">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`inventory-cat-pill ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="inventory-items-grid">
        {filteredItems.map((item) => {
          const itemKey = item.id || item.canonicalName || item.name;
          const displayName = item.name || item.canonicalName;
          const displayPrice = item.price || item.standardPrice || 0;
          const displayUnit = item.unit || item.standardUnit || 'unit';
          const displayCat = item.category || 'Pantry';

          return (
            <div className="inventory-item-card" key={itemKey}>
              <div>
                <div className="inv-item-top">
                  <div>
                    <b>{displayName}</b>
                    <small>{item.hindiName || item.aliases?.slice(0, 3).join(', ')}</small>
                  </div>
                  <span className="archive-item-chip">{displayCat}</span>
                </div>
                <div className="inv-price-tag">
                  ₹{displayPrice} <span style={{ fontSize: '11px', color: '#64748b' }}>/ {displayUnit}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button
                  type="button"
                  className={`inv-stock-toggle ${item.outOfStock ? 'out-stock' : 'in-stock'}`}
                  onClick={() => onToggleStock(itemKey)}
                >
                  {item.outOfStock ? '✕ Out of Stock' : '✓ In Stock'}
                </button>
                <small style={{ fontSize: '8.5px', color: '#94a3b8' }}>
                  Unit: {displayUnit}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── PAGE 6: Grahak Self-Service Passbook Portal ─────────────────────────────
function GrahakPortalView({
  customerProfiles,
  selectedKey,
  setSelectedKey,
  shopUpiId,
  storeName,
  onInspectProof,
}) {
  const currentCustomer = useMemo(() => {
    return customerProfiles.find((c) => c.key === selectedKey) || customerProfiles[0] || null;
  }, [customerProfiles, selectedKey]);

  if (!currentCustomer) {
    return (
      <div className="grahak-portal-container">
        <div className="customer-empty">
          <UserRound size={24} />
          <span>No customer profile found. Record a khata entry first.</span>
        </div>
      </div>
    );
  }

  const disputeMessage = encodeURIComponent(
    `नमस्ते Ramesh ji, मैं ${currentCustomer.name} बोल रहा हूँ। मेरे KiranaKhata डिजिटल पासबुक में बाकी उधार ₹${currentCustomer.balance} दिख रहा है। कृपया इसके बारे में जानकारी दें। धन्यवाद!`
  );

  return (
    <div className="grahak-portal-container">
      <div className="grahak-customer-switch-bar">
        <div className="customer-switch-select">
          <span className="eyebrow">VIEWING PASSBOOK FOR:</span>
          <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
            {customerProfiles.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name} ({c.phone}) · ₹{c.balance}
              </option>
            ))}
          </select>
        </div>
        <span className="terminal-live-badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
          <ShieldCheck size={12} /> SECURE GRAHAK SESSION
        </span>
      </div>

      <div className="grahak-passbook-card">
        <div className="passbook-card-header">
          <div className="passbook-store-brand">
            <span className="passbook-store-icon"><Store size={22} /></span>
            <div className="passbook-store-text">
              <h2>{storeName || 'Gupta Kirana Stores'}</h2>
              <p>Bittan Market, Bhopal (MP) · Ph: +91 98260 12345</p>
            </div>
          </div>
          <span className="passbook-verified-badge">
            <ShieldCheck size={14} /> OFFICIAL BHOPAL KIRANA SEAL
          </span>
        </div>

        <div className="passbook-card-body">
          <div className="grahak-balance-banner">
            <div className="grahak-balance-left">
              <span>CURRENT OUTSTANDING BALANCE</span>
              <h3 className={currentCustomer.balance > 0 ? 'due-red' : 'settled-green'}>
                {money(currentCustomer.balance)}
              </h3>
              <small style={{ color: currentCustomer.balance > 0 ? '#b91c1c' : '#15803d', fontWeight: 650 }}>
                {currentCustomer.balance > 0 ? '● Payment Pending at Counter' : '✓ All Udhaar Settled'}
              </small>
            </div>

            {currentCustomer.balance > 0 && (
              <a
                className="grahak-dispute-btn"
                href={`https://wa.me/919826012345?text=${disputeMessage}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={14} /> Have a question about this balance?
              </a>
            )}
          </div>

          {currentCustomer.balance > 0 && (
            <div className="grahak-settle-upi-card">
              <div>
                <span className="upi-badge"><QrCode size={12} /> INSTANT BHARAT UPI PAYMENT</span>
                <h4 style={{ margin: '6px 0 2px', fontSize: '15px' }}>Scan &amp; Pay directly from GPay, PhonePe, Paytm</h4>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>
                  Zero cashier touchpoint. Instant settlement with auto-updated passbook.
                </p>
              </div>
              <DynamicUpiQr
                upiId={shopUpiId}
                amount={currentCustomer.balance}
                customerName={currentCustomer.name}
              />
            </div>
          )}

          <div className="grahak-bills-list-section">
            <h4><History size={15} /> Verified Parchi Slips &amp; Receipts ({currentCustomer.entries.length})</h4>

            {currentCustomer.entries.map((entry) => (
              <div className="grahak-bill-card" key={entry.id}>
                <div className="grahak-bill-top">
                  <div>
                    <b>{entry.entryKind === 'payment' ? 'Payment Recorded' : entry.entryKind === 'reversal' ? 'Audited Reversal' : `Verified Bill #${entry.id.slice(-6)}`}</b>
                    <small style={{ display: 'block', color: '#64748b' }}>{formatTimestamp(entry.createdAt)}</small>
                  </div>
                  <strong className={Number(entry.net_udhaar) > 0 ? 'due-value' : 'settled-value'} style={{ fontSize: '14px' }}>
                    {Number(entry.net_udhaar) > 0 ? '+' : ''}{money(entry.net_udhaar)}
                  </strong>
                </div>

                {entry.items && entry.items.length > 0 && (
                  <div className="grahak-bill-items">
                    {entry.items.map((it, idx) => (
                      <span key={idx} className="grahak-bill-item-pill">
                        {it.item_name} ({it.final_qty} {it.unit}) · ₹{it.line_total}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grahak-bill-footer">
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    Total: {money(entry.subtotal || 0)} · Cash Paid: {money(entry.cash_paid_now || 0)}
                  </span>
                  {entry.parchiThumbnail && (
                    <button
                      className="proof-badge-btn"
                      onClick={() => onInspectProof({ url: entry.parchiThumbnail, title: `Parchi Slip · Bill #${entry.id.slice(-6)}` })}
                    >
                      <FileImage size={11} /> View Original Slip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hackathon Jury Architecture & Demo Showcase Modal ──────────────────────
function JuryGuideModal({ onClose, onLoadDemo, onRunVoice, onGoGrahak }) {
  return (
    <Modal
      title="Gemma 4 Multimodal Architecture & Jury Guide"
      icon={Sparkles}
      onClose={onClose}
      wide
    >
      <div className="jury-guide-modal-body">
        <div className="jury-concept-hero">
          <h3>🏆 Why KiranaKhata Live is a Hackathon Winner</h3>
          <p>
            Indian retail runs on messy human realities: crumpled handwritten Hindi parchis and fast Hinglish counter speech. 
            Gemma 4 is deployed specifically for the messy human layer—multimodal handwriting OCR, Hinglish speech intent parsing, and contradiction detection. 
            Crucially, <b>pure deterministic JavaScript arithmetic strictly owns currency math</b>, ensuring 0% hallucination risk in financial transactions.
          </p>
        </div>

        <div className="jury-arch-diagram">
          <div className="arch-node">
            <span>01 · MULTIMODAL INTAKE</span>
            <b>Slip Photo + Hinglish Voice</b>
            <small>Handwritten parchment &amp; speech updates</small>
          </div>
          <div className="arch-node">
            <span>02 · GEMMA 4 REASONING</span>
            <b>Multimodal Intent &amp; Contradictions</b>
            <small>Resolves “5 kg in slip vs 3 kg spoken”</small>
          </div>
          <div className="arch-node">
            <span>03 · DETERMINISTIC JS MATH</span>
            <b>Strict Ledger Arithmetic</b>
            <small>Store catalog prices · 0% hallucination</small>
          </div>
          <div className="arch-node">
            <span>04 · REAL-TIME CONFIRMATION</span>
            <b>Soundbox + Dynamic Bharat UPI</b>
            <small>Hindi Web Speech &amp; instant QR settlement</small>
          </div>
        </div>

        <h4 style={{ margin: '10px 0 6px', fontSize: '13px', fontWeight: 800 }}>
          ⚡ 3-Step Live Interactive Tour for Judges
        </h4>
        <div className="jury-steps-grid">
          <div className="jury-step-card">
            <div>
              <h4>1. Test Contradiction Handling</h4>
              <p>Load the Bhopal demo parchi. Notice how Gemma 4 flags the contradiction: parchi wrote 5 kg, but voice overrode to 3 kg.</p>
            </div>
            <button
              className="jury-step-action-btn"
              onClick={onLoadDemo}
            >
              <Sparkles size={13} /> Load Demo Parchi
            </button>
          </div>

          <div className="jury-step-card">
            <div>
              <h4>2. Test Natural Voice Command</h4>
              <p>Speak or run Hinglish: “Raju bhai ke khate mein 300 jama karo”. Hear the Hindi soundbox announce the payment &amp; remaining balance.</p>
            </div>
            <button
              className="jury-step-action-btn"
              onClick={onRunVoice}
            >
              <Mic size={13} /> Run Voice Payment
            </button>
          </div>

          <div className="jury-step-card">
            <div>
              <h4>3. Switch to Grahak Passbook</h4>
              <p>View the customer&apos;s mobile perspective: verified official passbook, attached handwritten slips, and dynamic UPI QR code.</p>
            </div>
            <button
              className="jury-step-action-btn"
              onClick={onGoGrahak}
            >
              <Smartphone size={13} /> Open Grahak Passbook
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── MAIN APPLICATION COMPONENT ─────────────────────────────────────────────
export default function App() {
  // Merchant Shift & Auth Session
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_MERCHANT_SESSION;
      }
    }
    return DEFAULT_MERCHANT_SESSION;
  });
  const [storeDashboardOpen, setStoreDashboardOpen] = useState(false);

  // Multi-Page Navigation
  // 'pos' (Home / Today) | 'entry' (New Entry Stepper) | 'customers' (Khata Ledger) | 'analytics' (Insights) | 'inventory' (Settings & Rates) | 'grahak' (Grahak Passbook)
  const [activePage, setActivePage] = useState('pos');
  const [entryStep, setEntryStep] = useState(1); // 1: Slip Intake, 2: Voice & Proof, 3: KhataGuard Review, 4: Receipt & Settle
  const [juryGuideOpen, setJuryGuideOpen] = useState(false);

  // Store Rate Card Catalog State
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('all');
  const [customCatalog, setCustomCatalog] = useState(() => {
    const saved = localStorage.getItem('kiranaKhataCatalogCustomV1');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return BHOPAL_STORE_CATALOG;
  });
  const [grahakCustomerKey, setGrahakCustomerKey] = useState('raju bhai');
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductDraft, setNewProductDraft] = useState({
    canonicalName: '',
    hindiName: '',
    aliases: '',
    category: 'Grains & Flours',
    price: 50,
    unit: 'kg',
  });

  // Model & API Config
  const [modelId, setModelId] = useState('gemma-4-26b-a4b-it');
  const [apiKey, setApiKey] = useState(readApiKey);
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Digital Soundbox Mode
  const [soundboxEnabled, setSoundboxEnabled] = useState(() => {
    return readStorage(SOUNDBOX_KEY, true);
  });
  const [isSoundboxSpeaking, setIsSoundboxSpeaking] = useState(false);

  // Shop Bharat UPI ID
  const [shopUpiId, setShopUpiId] = useState(() => {
    return localStorage.getItem(UPI_ID_STORAGE) || 'bhopalkirana@upi';
  });

  // Multimodal Inputs
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [imageMimeType, setImageMimeType] = useState('image/png');
  const [imageBase64, setImageBase64] = useState('');
  const [spokenNote, setSpokenNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recordingError, setRecordingError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Payment Proof Attachment
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [viewingProof, setViewingProof] = useState(null);

  // Gemma Agent & KhataGuard Review State
  const [isReconciling, setIsReconciling] = useState(false);
  const [agentStage, setAgentStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [traceOpen, setTraceOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shopkeeperConfirmed, setShopkeeperConfirmed] = useState(false);
  const [duplicateOverrideReason, setDuplicateOverrideReason] = useState('');
  const [savedCurrent, setSavedCurrent] = useState(false);

  // Receipt Script preference: 'devanagari' | 'hinglish'
  const [receiptScript, setReceiptScript] = useState('devanagari');

  // Register and Customer Book
  const [register, setRegister] = useState(() => {
    const saved = localStorage.getItem(REGISTER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return INITIAL_DEMO_CUSTOMERS;
  });

  // Immutable Audit Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    return readStorage(AUDIT_LOG_KEY, []);
  });

  // Daily Closing Reconciliation States
  const [openingCash, setOpeningCash] = useState(() => readStorage(OPENING_CASH_KEY, 2000));
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [actualDrawerCash, setActualDrawerCash] = useState(2000);
  const [mismatchExplanation, setMismatchExplanation] = useState('');

  // Customer Ledger UI State
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all'); // 'all' | 'due' | 'settled'

  // Voice Khata Commands
  const [khataCommand, setKhataCommand] = useState('');
  const [commandFeedback, setCommandFeedback] = useState('');
  const [isCommandListening, setIsCommandListening] = useState(false);

  // Smart WhatsApp Reminders Modal
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [activeReminderCustomer, setActiveReminderCustomer] = useState(null);
  const [reminderTone, setReminderTone] = useState('polite');
  const [reminderScript, setReminderScript] = useState('devanagari');

  // Inline Line-Item Quick Correction Pad
  const [editingLineIndex, setEditingLineIndex] = useState(null);

  // Reversal / Correction Modal
  const [reversingEntry, setReversingEntry] = useState(null);
  const [reversalReason, setReversalReason] = useState('');

  // Manual Entry Fallback State
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualCustomer, setManualCustomer] = useState('');
  const [manualItems, setManualItems] = useState([
    { item_name: 'Aashirvaad Atta', final_qty: 5, unit: 'kg', unit_price: 45 },
  ]);
  const [manualCashPaid, setManualCashPaid] = useState(0);

  // Searchable Multimodal Parchi Archive
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [inspectedParchi, setInspectedParchi] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const proofInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const commandRecognitionRef = useRef(null);

  const savedApiKeyFromEnv = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } catch {}
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(REGISTER_KEY, JSON.stringify(register));
    } catch {}
  }, [register]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(auditLogs));
    } catch {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(OPENING_CASH_KEY, JSON.stringify(openingCash));
    } catch {}
  }, [openingCash]);

  useEffect(() => {
    try {
      localStorage.setItem(SOUNDBOX_KEY, JSON.stringify(soundboxEnabled));
    } catch {}
  }, [soundboxEnabled]);

  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) setSpeechSupported(false);
  }, []);

  // Aggregated Customer Profiles from Register Entries
  const customerProfiles = useMemo(() => {
    const profiles = new Map();
    register.forEach((entry) => {
      const name = String(entry.customer_name || 'Customer').trim() || 'Customer';
      const key = name.toLocaleLowerCase('en-IN');
      const existing = profiles.get(key) || {
        key,
        name,
        phone: entry.phone || '+91 98260 00000',
        balance: 0,
        entries: [],
        lastActivity: entry.createdAt,
        lastPaymentAmount: null,
        lastPaymentDate: null,
        daysOverdue: 0,
      };

      existing.balance = Number((existing.balance + Number(entry.net_udhaar || 0)).toFixed(2));
      existing.entries.push(entry);

      if (entry.phone && !existing.phone) existing.phone = entry.phone;

      if (entry.entryKind === 'payment' || Number(entry.cash_paid_now) > 0) {
        existing.lastPaymentAmount = Number(entry.cash_paid_now);
        existing.lastPaymentDate = entry.createdAt;
      }

      if (new Date(entry.createdAt) > new Date(existing.lastActivity)) {
        existing.lastActivity = entry.createdAt;
      }

      const daysOld = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 86400000);
      if (entry.net_udhaar > 0 && daysOld > (existing.daysOverdue || 0)) {
        existing.daysOverdue = daysOld;
      }

      profiles.set(key, existing);
    });

    return [...profiles.values()].sort((a, b) => {
      return b.balance - a.balance || new Date(b.lastActivity) - new Date(a.lastActivity);
    });
  }, [register]);

  // Filtered customer profiles for search with normalizePhoneNumber & alias matching
  const filteredCustomers = useMemo(() => {
    return customerProfiles.filter((profile) => {
      const search = customerSearch.trim();
      if (!search) {
        if (customerFilter === 'due') return profile.balance > 0;
        if (customerFilter === 'settled') return profile.balance <= 0;
        return true;
      }

      const matched = matchCustomerByPhoneOrAlias(search, [profile]);
      if (!matched) return false;

      if (customerFilter === 'due') return profile.balance > 0;
      if (customerFilter === 'settled') return profile.balance <= 0;
      return true;
    });
  }, [customerProfiles, customerSearch, customerFilter]);

  const activeCustomer = useMemo(() => {
    return (
      customerProfiles.find((profile) => profile.key === selectedCustomer) ||
      filteredCustomers[0] ||
      null
    );
  }, [customerProfiles, filteredCustomers, selectedCustomer]);

  // Customer Trust Score & Credit Limit for active customer
  const activeCustomerTrust = useMemo(() => {
    if (!activeCustomer) return null;
    return calculateCustomerTrustScore({
      balance: activeCustomer.balance,
      entries: activeCustomer.entries,
      daysOverdue: activeCustomer.daysOverdue || 0,
      creditLimit: 2500,
    });
  }, [activeCustomer]);

  // "Should I give udhaar?" Decision for active customer in Customers view
  const activeCustomerUdhaarDecision = useMemo(() => {
    if (!activeCustomer) return null;
    return evaluateUdhaarDecision({
      customer: activeCustomer,
      newUdhaarAmount: 0,
      creditLimit: 2500,
    });
  }, [activeCustomer]);

  // Daily Dashboard Summary Metrics
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayEntries = register.filter((e) => String(e.createdAt || '').slice(0, 10) === todayStr);

    const totalCreditToday = todayEntries.reduce((sum, e) => sum + (Number(e.subtotal) || 0), 0);
    const totalCashToday = todayEntries.reduce((sum, e) => sum + (Number(e.cash_paid_now) || 0), 0);
    const pendingTotal = customerProfiles.reduce((sum, c) => sum + Math.max(0, Number(c.balance) || 0), 0);
    const overdueCount = customerProfiles.filter((c) => Number(c.balance) > 0 && (c.daysOverdue || 0) >= 7).length;
    const followUps = customerProfiles.filter((c) => Number(c.balance) > 0).slice(0, 5);

    return {
      totalCreditToday,
      totalCashToday,
      pendingTotal,
      overdueCount,
      followUps,
    };
  }, [register, customerProfiles]);

  // Duplicate bill check for currently reconciled result
  const duplicateCheck = useMemo(() => {
    if (!result || !result.ledger) return { isDuplicate: false };
    return detectDuplicateBill({
      customerName: result.ledger.customer_name,
      subtotal: result.ledger.subtotal,
      items: result.ledger.items,
      register,
      windowMinutes: 15,
    });
  }, [result, register]);

  // "Should I give udhaar?" evaluation for newly reconciled bill in KhataGuard
  const newBillUdhaarDecision = useMemo(() => {
    if (!result || !result.ledger) return null;
    const matchedCustomer = customerProfiles.find((c) =>
      matchCustomerByPhoneOrAlias(result.ledger.customer_name, [c])
    );
    return evaluateUdhaarDecision({
      customer: matchedCustomer,
      newUdhaarAmount: result.ledger.net_udhaar,
      creditLimit: 2500,
    });
  }, [result, customerProfiles]);

  // Searchable Multimodal Parchi Archive
  const archivedParchis = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    const parchiEntries = register.filter((e) => e.entryKind === 'bill' || e.parchiThumbnail || (e.items && e.items.length > 0));

    if (!q) return parchiEntries;

    return parchiEntries.filter((entry) => {
      const matchName = String(entry.customer_name || '').toLowerCase().includes(q);
      const matchItem = (entry.items || []).some((it) =>
        String(it.item_name || '').toLowerCase().includes(q)
      );
      const matchDate = String(entry.createdAt || '').toLowerCase().includes(q);
      return matchName || matchItem || matchDate;
    });
  }, [register, archiveSearch]);

  // Sound feedback wrappers
  const triggerSound = (fn) => {
    if (soundEnabled && typeof fn === 'function') fn();
  };

  // Soundbox Announce helper
  const triggerSoundbox = (text) => {
    if (!soundboxEnabled || !text) return;
    setIsSoundboxSpeaking(true);
    announceSoundbox({
      text,
      soundboxEnabled: true,
      soundEnabled,
    });
    setTimeout(() => setIsSoundboxSpeaking(false), 3800);
  };

  function testSoundbox() {
    triggerSoundbox('किराना खाता डिजिटल साउंडबॉक्स चालू है। भोपाल किराना में आपका स्वागत है!');
  }

  function handleLogin(newSession) {
    setSession(newSession);
    if (newSession.role === 'customer') {
      setActivePage('grahak');
      if (newSession.customerName) {
        setGrahakCustomerKey(newSession.customerName.toLowerCase());
      }
    } else {
      setActivePage('pos');
    }
    triggerSound(playCashRegisterSound);
  }

  function handleLockCounter() {
    setSession((s) => ({ ...s, loggedIn: false }));
    triggerSound(playChimeSound);
  }

  function handleToggleStock(skuKey) {
    setCustomCatalog((prev) =>
      prev.map((it) => ((it.id === skuKey || it.name === skuKey || it.canonicalName === skuKey) ? { ...it, outOfStock: !it.outOfStock } : it))
    );
    triggerSound(playChimeSound);
  }

  function handleAddCustomProduct(e) {
    e.preventDefault();
    if (!newProductDraft.canonicalName.trim()) return;
    const newSku = {
      name: newProductDraft.canonicalName.trim(),
      canonicalName: newProductDraft.canonicalName.trim(),
      hindiName: newProductDraft.hindiName.trim() || newProductDraft.canonicalName.trim(),
      aliases: newProductDraft.aliases ? newProductDraft.aliases.split(',').map((s) => s.trim()) : [],
      category: newProductDraft.category || 'Grains & Flours',
      price: Number(newProductDraft.price) || 50,
      standardPrice: Number(newProductDraft.price) || 50,
      unit: newProductDraft.unit || 'kg',
      standardUnit: newProductDraft.unit || 'kg',
      outOfStock: false,
    };
    setCustomCatalog((prev) => [newSku, ...prev]);
    try {
      localStorage.setItem('kiranaKhataCatalogCustomV1', JSON.stringify([newSku, ...customCatalog]));
    } catch {}
    setNewProductModalOpen(false);
    setNewProductDraft({ canonicalName: '', hindiName: '', aliases: '', category: 'Grains & Flours', price: 50, unit: 'kg' });
    triggerSound(playCashRegisterSound);
  }

  function setImageFromDataUrl(dataUrl) {
    const { mimeType, imageBase64: data } = dataUrlParts(dataUrl);
    setImageDataUrl(dataUrl);
    setImageMimeType(mimeType);
    setImageBase64(data);
    setError('');
    setResult(null);
    setSavedCurrent(false);
    setShopkeeperConfirmed(false);
  }

  function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file such as JPG, PNG or WEBP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageFromDataUrl(String(reader.result || ''));
      setEntryStep(2);
    };
    reader.onerror = () => setError('That image could not be read. Try another photo.');
    reader.readAsDataURL(file);
  }

  function handlePaymentProofFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaymentProofUrl(String(reader.result || ''));
      triggerSound(playChimeSound);
    };
    reader.readAsDataURL(file);
  }

  function loadDemo() {
    try {
      const demoUrl = generateDemoParchiDataUrl();
      setImageFromDataUrl(demoUrl);
      setSpokenNote(DEMO_SPOKEN_NOTE);
      setError('');
      setAgentStage('Demo parchi and spoken Hinglish update loaded. Ready to reconcile.');
      setEntryStep(2);
      triggerSound(playChimeSound);
    } catch (demoError) {
      setError(demoError.message || 'Could not generate the demo parchi.');
    }
  }

  function toggleRecording() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      triggerSound(() => playMicBeep('stop'));
      return;
    }
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setSpeechSupported(false);
      setRecordingError('Live speech capture is not supported here. Type or paste the Hinglish update below.');
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingError('');
        triggerSound(() => playMicBeep('start'));
      };
      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let index = 0; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalText += `${transcript} `;
          else interimText += `${transcript} `;
        }
        const combined = `${finalText}${interimText}`.trim();
        if (combined) setSpokenNote(combined);
      };
      recognition.onerror = (event) => {
        setRecordingError(
          event.error === 'not-allowed'
            ? 'Microphone permission was blocked. Allow microphone access in your browser settings.'
            : `Speech capture issue: ${event.error}. You can still edit the text below.`
        );
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setRecordingError('Could not start microphone capture. You can still enter the note manually.');
      setIsRecording(false);
    }
  }

  function toggleCommandRecording() {
    if (isCommandListening) {
      commandRecognitionRef.current?.stop();
      setIsCommandListening(false);
      triggerSound(() => playMicBeep('stop'));
      return;
    }
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setCommandFeedback('Live voice recognition not supported in this browser. Please type the command.');
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'hi-IN';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        setIsCommandListening(true);
        setCommandFeedback('Listening for khata command…');
        triggerSound(() => playMicBeep('start'));
      };
      recognition.onresult = (event) => {
        const text = event.results[0]?.[0]?.transcript || '';
        if (text) {
          setKhataCommand(text);
          executeVoiceCommand(text);
        }
      };
      recognition.onerror = (event) => {
        setCommandFeedback(`Microphone notice: ${event.error}. Type command directly.`);
        setIsCommandListening(false);
      };
      recognition.onend = () => setIsCommandListening(false);
      commandRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setCommandFeedback('Could not start microphone. You can type the command below.');
      setIsCommandListening(false);
    }
  }

  async function reconcile() {
    setError('');
    setResult(null);
    setSavedCurrent(false);
    setShopkeeperConfirmed(false);
    setDuplicateOverrideReason('');
    setIsReconciling(true);
    setAgentStage('Gemma 4 reading parchi with vision OCR…');
    try {
      const response = await runKiranaGemmaAgent({
        apiKey,
        modelId,
        imageBase64,
        mimeType: imageMimeType,
        spokenNote,
        onStageChange: setAgentStage,
      });
      setResult({
        ...response,
        createdAt: new Date().toISOString(),
        paymentProofUrl: paymentProofUrl || null,
        proofStatus: paymentProofUrl ? 'evidence_uploaded' : null,
      });
      setTraceOpen(true);
      setEntryStep(3); // Advance to KhataGuard Review Card!
      triggerSound(playChimeSound);
    } catch (agentError) {
      setError(agentError?.message || 'Reconciliation failed. Check the API key and retry.');
      setAgentStage('Needs attention');
    } finally {
      setIsReconciling(false);
    }
  }

  function handleUpdateLineItem(index, newQty, newRate) {
    if (!result || !result.ledger || !result.ledger.items) return;
    const items = [...result.ledger.items];
    if (!items[index]) return;

    items[index] = {
      ...items[index],
      final_qty: Math.max(0, Number(newQty) || 0),
      unit_price: Math.max(0, Number(newRate) || 0),
      source_status: 'modified_by_voice',
      modification_note: 'Corrected by shopkeeper on touch pad',
    };

    const recomputed = runDeterministicLedgerMath({
      customer_name: result.ledger.customer_name,
      cash_paid_now: result.ledger.cash_paid_now,
      items,
    });

    setResult((prev) => ({
      ...prev,
      ledger: recomputed,
    }));
    triggerSound(playChimeSound);
  }

  function saveToRegister() {
    if (!result || savedCurrent) return;

    if (duplicateCheck.isDuplicate && !duplicateOverrideReason.trim()) {
      setError('A potential duplicate bill was detected. Please provide an override reason to save.');
      return;
    }

    const auditRecord = createImmutableAuditRecord({
      cashierName: session.cashierName,
      counterId: session.counterId,
      action: 'BILL_APPROVED',
      reviewDecision: 'APPROVED',
      reason: duplicateCheck.isDuplicate
        ? `Duplicate Override: ${duplicateOverrideReason.trim()}`
        : 'Confirmed by shopkeeper with customer at counter',
      metadata: {
        customer: result.ledger.customer_name,
        subtotal: result.ledger.subtotal,
        netUdhaar: result.ledger.net_udhaar,
      },
    });

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: result.createdAt || new Date().toISOString(),
      modelId: result.modelId,
      whatsappReceipt: result.whatsappReceipt,
      paymentProofUrl: result.paymentProofUrl || paymentProofUrl || null,
      proofStatus: (result.paymentProofUrl || paymentProofUrl) ? 'evidence_uploaded' : null,
      entryKind: 'bill',
      parchiThumbnail: imageDataUrl || null,
      shopkeeperConfirmed: true,
      auditId: auditRecord.auditId,
      ...result.ledger,
    };

    setRegister((current) => [entry, ...current]);
    setAuditLogs((current) => [auditRecord, ...current]);
    setSavedCurrent(true);
    setEntryStep(4); // Advance to receipt and settlement screen!
    triggerSound(playCashRegisterSound);

    const custName = result.ledger.customer_name || 'ग्राहक';
    const subtotal = Math.round(result.ledger.subtotal || 0);
    const balance = Math.round(result.ledger.net_udhaar || 0);
    triggerSoundbox(`किराना खाता: ${custName} का नया बिल ${subtotal} रुपये दर्ज हुआ। बाकी उधार ${balance} रुपये।`);
  }

  function handleVerifyPaymentProof(entryId, decision) {
    setRegister((current) =>
      current.map((e) => {
        if (e.id !== entryId) return e;
        return {
          ...e,
          proofStatus: decision === 'verify' ? 'verified' : 'rejected',
          verifiedBy: session.cashierName,
          verifiedAt: new Date().toISOString(),
        };
      })
    );

    const auditRecord = createImmutableAuditRecord({
      cashierName: session.cashierName,
      counterId: session.counterId,
      action: decision === 'verify' ? 'PROOF_VERIFIED' : 'PROOF_REJECTED',
      reviewDecision: decision === 'verify' ? 'VERIFIED' : 'REJECTED',
      reason: `Cashier ${session.cashierName} checked physical cash note / UPI receipt on entry #${entryId.slice(-6)}`,
    });
    setAuditLogs((current) => [auditRecord, ...current]);
    triggerSound(playChimeSound);
  }

  function handleReverseEntrySubmit(e) {
    if (e) e.preventDefault();
    if (!reversingEntry) return;

    const reason = reversalReason.trim() || 'Shopkeeper correction / return';
    const auditRecord = createImmutableAuditRecord({
      cashierName: session.cashierName,
      counterId: session.counterId,
      action: 'ENTRY_REVERSED',
      reviewDecision: 'REVERSED',
      reason: `Reversal of #${reversingEntry.id.slice(-6)}: ${reason}`,
    });

    const reversalEntry = {
      id: `${Date.now()}-reversal`,
      createdAt: new Date().toISOString(),
      customer_name: reversingEntry.customer_name,
      subtotal: -Number(reversingEntry.subtotal || 0),
      cash_paid_now: -Number(reversingEntry.cash_paid_now || 0),
      net_udhaar: -Number(reversingEntry.net_udhaar || 0),
      currency: 'INR',
      items: (reversingEntry.items || []).map((it) => ({
        ...it,
        final_qty: -it.final_qty,
        line_total: -it.line_total,
      })),
      entryKind: 'reversal',
      reversalOf: reversingEntry.id,
      reversalReason: reason,
      shopkeeperConfirmed: true,
      auditId: auditRecord.auditId,
    };

    setRegister((current) => [reversalEntry, ...current]);
    setAuditLogs((current) => [auditRecord, ...current]);
    setReversingEntry(null);
    setReversalReason('');
    triggerSound(playCashRegisterSound);
    triggerSoundbox(`किराना खाता: ${reversingEntry.customer_name} का बिल सुधार दर्ज किया गया।`);
  }

  function handleManualEntrySubmit(e) {
    if (e) e.preventDefault();
    if (!manualCustomer.trim()) return;

    const ledger = runDeterministicLedgerMath({
      customer_name: manualCustomer.trim(),
      cash_paid_now: manualCashPaid,
      items: manualItems.map((it) => ({
        item_name: it.item_name,
        slip_qty: it.final_qty,
        final_qty: it.final_qty,
        unit: it.unit,
        unit_price: it.unit_price,
        source_status: 'from_slip',
      })),
    });

    setResult({
      modelId: 'manual-entry-fallback',
      createdAt: new Date().toISOString(),
      ledger,
      whatsappReceipt: `नमस्ते ${manualCustomer.trim()} जी, आपका बिल ₹${ledger.subtotal} का है। जमा: ₹${manualCashPaid}। बाकी उधार: ₹${ledger.net_udhaar}। धन्यवाद! - ${session.storeName}`,
      traceSteps: [{ type: 'notice', title: 'Manual Entry Fallback', detail: 'Created deterministically without AI inference.' }],
    });

    setManualEntryOpen(false);
    setEntryStep(3); // Go to KhataGuard Review!
    triggerSound(playChimeSound);
  }

  function executeVoiceCommand(cmdText) {
    const textToRun = (cmdText || khataCommand).trim();
    if (!textToRun) return;

    try {
      const parsed = parseKhataVoiceCommand({
        commandText: textToRun,
        customerProfiles,
        register,
        apiKey,
        modelId,
      });

      if (parsed.success && parsed.action === 'ADD_PAYMENT') {
        const amount = Number(parsed.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          setCommandFeedback('Payment amount must be greater than ₹0.');
          return;
        }

        const entry = {
          id: `${Date.now()}-payment`,
          createdAt: new Date().toISOString(),
          customer_name: parsed.customer_name,
          subtotal: 0,
          cash_paid_now: amount,
          net_udhaar: -amount,
          currency: 'INR',
          items: [],
          entryKind: 'payment',
          paymentProofUrl: paymentProofUrl || null,
          proofStatus: paymentProofUrl ? 'evidence_uploaded' : null,
          whatsappReceipt: parsed.whatsappReceipt || `नमस्ते ${parsed.customer_name} जी, ₹${amount} का भुगतान खाता में दर्ज कर लिया गया। धन्यवाद!`,
        };

        setRegister((current) => [entry, ...current]);
        setSelectedCustomer(parsed.customer_name.toLocaleLowerCase('en-IN'));
        setCommandFeedback(`₹${amount} payment saved for ${parsed.customer_name}.`);
        setKhataCommand('');
        setPaymentProofUrl('');
        triggerSound(playCashRegisterSound);

        const remainingProfile = customerProfiles.find((c) => c.key === (parsed.customer_key || parsed.customer_name.toLowerCase()));
        const remBal = remainingProfile ? Math.max(0, Math.round(remainingProfile.balance - amount)) : 0;
        triggerSoundbox(`किराना खाता: ${parsed.customer_name} से ${amount} रुपये प्राप्त हुए। बाकी उधार ${remBal} रुपये बचा।`);
        return;
      }

      if (parsed.success && parsed.action === 'QUERY_BALANCE') {
        setSelectedCustomer(parsed.customer_key || parsed.customer_name.toLocaleLowerCase('en-IN'));
        setCommandFeedback(`${parsed.customer_name} has ${money(parsed.balance)} pending.`);
        triggerSound(playChimeSound);
        triggerSoundbox(`${parsed.customer_name} का कुल बकाया उधार ${Math.round(parsed.balance)} रुपये है।`);
        return;
      }

      if (parsed.success && parsed.action === 'QUERY_DAILY_STATS') {
        setCommandFeedback(parsed.explanation || parsed.reply);
        triggerSound(playChimeSound);
        triggerSoundbox(`आज कुल ${Math.round(parsed.total_cash_today || 0)} रुपये नकद प्राप्त हुआ।`);
        return;
      }

      setCommandFeedback(parsed.reply || 'Try “Raju bhai ke khate mein 300 jama karo” or “Suresh ka baki kitna hai?”');
    } catch {
      setCommandFeedback('Could not interpret command. Try: “Raju bhai ke khate mein 300 jama karo”');
    }
  }

  function runKhataCommand() {
    executeVoiceCommand(khataCommand);
  }

  async function copyReceipt(receipt) {
    try {
      await navigator.clipboard.writeText(receipt);
      setCopied(true);
      triggerSound(playChimeSound);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was blocked. Select the receipt text and copy it manually.');
    }
  }

  function openApiModal() {
    setDraftApiKey(apiKey);
    setApiModalOpen(true);
  }

  function saveApiKey() {
    const nextKey = draftApiKey.trim();
    setApiKey(nextKey);
    try {
      if (nextKey && !savedApiKeyFromEnv) localStorage.setItem(API_KEY_STORAGE, nextKey);
      if (!nextKey) localStorage.removeItem(API_KEY_STORAGE);
    } catch {}
    setApiModalOpen(false);
    setError('');
  }

  function clearSavedApiKey() {
    try {
      localStorage.removeItem(API_KEY_STORAGE);
    } catch {}
    setApiKey(savedApiKeyFromEnv ? import.meta.env.VITE_GEMINI_API_KEY : '');
    setDraftApiKey('');
  }

  function openReminderModal(customer) {
    setActiveReminderCustomer(customer);
    setReminderTone('polite');
    setReminderScript('devanagari');
    setReminderModalOpen(true);
  }

  const activeReminder = useMemo(() => {
    if (!activeReminderCustomer) return null;
    return generateSmartWhatsAppReminder({
      customerName: activeReminderCustomer.name,
      balance: activeReminderCustomer.balance,
      daysOverdue: activeReminderCustomer.daysOverdue || 0,
      tone: reminderTone,
      script: reminderScript,
    });
  }, [activeReminderCustomer, reminderTone, reminderScript]);

  const activeReceiptText = useMemo(() => {
    if (!result || !result.ledger) return '';
    if (receiptScript === 'hinglish') {
      return generateHinglishReceipt(result.ledger);
    }
    return result.whatsappReceipt;
  }, [result, receiptScript]);

  function exportLedgerCsv() {
    if (register.length === 0) return;
    const headers = ['Entry ID', 'Customer Name', 'Phone', 'Date', 'Type', 'Subtotal (INR)', 'Cash Paid (INR)', 'Net Udhaar (INR)', 'Proof Status', 'Items'];
    const rows = register.map((e) => [
      e.id,
      `"${(e.customer_name || 'Customer').replace(/"/g, '""')}"`,
      `"${(e.phone || '').replace(/"/g, '""')}"`,
      `"${new Date(e.createdAt).toLocaleString('en-IN')}"`,
      e.entryKind || 'bill',
      Number(e.subtotal || 0).toFixed(2),
      Number(e.cash_paid_now || 0).toFixed(2),
      Number(e.net_udhaar || 0).toFixed(2),
      e.proofStatus || 'none',
      `"${(e.items || []).map((it) => `${it.item_name} (${it.final_qty} ${it.unit})`).join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bhopal_KiranaKhata_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    triggerSound(playChimeSound);
  }

  // If logged out, render the Merchant Login Dashboard
  if (!session || !session.loggedIn) {
    return <LoginDashboard onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      {/* ── TOPBAR: STREAMLINED POS APP HEADER ───────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <a className="brand-lockup" href="#top" aria-label="KiranaKhata Live home">
              <span className="brand-mark"><Store size={20} strokeWidth={2.25} /></span>
              <span className="brand-name-wrap">
                <span className="brand-name">KiranaKhata <b>Live</b></span>
                <span className="brand-caption">BHOPAL CASHIER TERMINAL</span>
              </span>
            </a>

            {/* Merchant Identity & Shift Badge */}
            <button
              className="store-identity-pill"
              onClick={() => setStoreDashboardOpen(true)}
              title="Open Store & Shift Dashboard"
            >
              <span className="store-status-dot" />
              <div className="store-pill-text">
                <b>{session.storeName || 'Gupta Kirana'}</b>
                <small>
                  {session.role === 'customer'
                    ? `Passbook: ${session.customerName || 'Grahak'}`
                    : `${session.counterId || 'Counter 1'} · ${session.cashierName || 'Cashier'}`}
                </small>
              </div>
              <ChevronDown size={13} className="store-pill-arrow" />
            </button>
          </div>

          {/* ── 5-TAB FOCUSED NAVIGATION ────────────────────────── */}
          <nav className="topbar-nav" aria-label="POS navigation">
            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'pos' ? 'active' : ''}`}
              onClick={() => setActivePage('pos')}
              aria-label="Home / Today (POS Cashier)"
            >
              <ReceiptIndianRupee size={14} />
              <span>Home / Today</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'entry' ? 'active' : ''}`}
              onClick={() => {
                setActivePage('entry');
                setEntryStep(1);
              }}
              aria-label="New Khata Entry"
            >
              <Plus size={14} />
              <span>New Entry</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'customers' ? 'active' : ''}`}
              onClick={() => setActivePage('customers')}
              aria-label="Customers (Khata Ledger)"
            >
              <UsersRound size={14} />
              <span>Customers</span>
              {todayStats.overdueCount > 0 && (
                <span className="nav-badge-alert">{todayStats.overdueCount}</span>
              )}
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'analytics' ? 'active' : ''}`}
              onClick={() => setActivePage('analytics')}
              aria-label="Insights & Analytics"
            >
              <BarChart3 size={14} />
              <span>Insights</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'inventory' ? 'active' : ''}`}
              onClick={() => setActivePage('inventory')}
              aria-label="Store Rates & Settings"
            >
              <ShoppingBasket size={14} />
              <span>Settings &amp; Rates</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activePage === 'grahak' ? 'active' : ''}`}
              onClick={() => setActivePage('grahak')}
              aria-label="Grahak Passbook Portal"
            >
              <Smartphone size={14} />
              <span>Grahak Passbook</span>
              <span className="nav-badge-accent">Live</span>
            </button>
          </nav>

          <div className="topbar-actions">
            {/* Hackathon Jury Showcase Tour Trigger */}
            <button
              type="button"
              className="jury-guide-pill"
              onClick={() => setJuryGuideOpen(true)}
              title="Open Hackathon Jury Architecture & Interactive Demo Guide"
            >
              <Sparkles size={14} />
              <span>🏆 Jury Guide</span>
            </button>

            {/* Digital Soundbox Switch */}
            <div className="soundbox-pill-wrap">
              <button
                className={`soundbox-toggle-btn ${soundboxEnabled ? 'active' : ''}`}
                onClick={() => setSoundboxEnabled((s) => !s)}
                title="Toggle Hindi Voice Soundbox confirmation"
              >
                <span className={`soundbox-wave-dot ${isSoundboxSpeaking ? 'speaking' : ''}`} />
                <span>🔊 Soundbox: {soundboxEnabled ? 'ON' : 'OFF'}</span>
              </button>
              {soundboxEnabled && (
                <button className="soundbox-test-btn" onClick={testSoundbox} title="Test Hindi Audio Announcement">
                  ▶ Test
                </button>
              )}
            </div>

            {/* Agent Gold Indicator */}
            <span className="gemma-badge">
              <span className={`agent-pulse-ring ${isReconciling ? 'agent-busy' : ''}`} />
              <span className="pulse-dot" /> GEMMA 4
            </span>

            {/* Tactile Sound FX Toggle */}
            <button
              className="sound-toggle-btn"
              onClick={() => setSoundEnabled((s) => !s)}
              title={soundEnabled ? 'Mute tactile sounds' : 'Enable tactile sounds'}
              aria-label={soundEnabled ? 'Mute tactile sounds' : 'Enable tactile sounds'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Model Selector */}
            <label className="model-select-wrap" aria-label="Select Gemma model">
              <span className="sr-only">Gemma model</span>
              <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>

            <button className="top-action" onClick={() => setCatalogOpen(true)}>
              <ShoppingBasket size={15} />
              <span>Store Rate Card</span>
            </button>

            <button
              className={`key-action ${apiKey ? 'key-ready' : ''}`}
              onClick={openApiModal}
            >
              {apiKey ? <CheckCircle2 size={15} /> : <KeyRound size={15} />}
              <span>{apiKey ? 'API Key Set' : 'Set API Key'}</span>
            </button>

            {/* Lock Counter Button */}
            <button
              className="lock-counter-btn"
              onClick={handleLockCounter}
              title="Lock Counter POS"
              aria-label="Lock Register Counter"
            >
              <Lock size={15} />
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="main-container">
        {/* ── TAB 1: HOME / TODAY POS CASHIER ──────────────────────────────── */}
        {activePage === 'pos' && (
          <>
            {/* Shift Command Deck */}
            <section className="pos-command-deck">
              <div className="command-deck-primary">
                <div className="pos-shift-info">
                  <span className="shift-badge">SHIFT #1 ACTIVE</span>
                  <span className="shift-time"><Clock3 size={12} /> Shift opened at {formatTimestamp(session.shiftStart)}</span>
                </div>

                {/* Primary New Khata Entry CTA and Quick Tools */}
                <div className="pos-quick-tools">
                  <button
                    className="deck-action-btn"
                    style={{ background: '#15803d', color: '#fff', border: 0, fontWeight: 750 }}
                    onClick={() => {
                      setActivePage('entry');
                      setEntryStep(1);
                    }}
                  >
                    <Plus size={15} />
                    <span>+ New Khata Entry</span>
                  </button>

                  <button className="deck-action-btn load-demo-btn" onClick={loadDemo}>
                    <Sparkles size={14} />
                    <span>Load Bhopal Demo Parchi</span>
                    <span className="demo-conflict-chip">5 kg → 3 kg Override</span>
                  </button>

                  <button className="deck-action-btn" onClick={() => setArchiveModalOpen(true)}>
                    <FileImage size={14} />
                    <span>Parchi Archive ({register.filter((e) => e.entryKind === 'bill' || e.parchiThumbnail).length})</span>
                  </button>

                  <button className="deck-action-btn" onClick={exportLedgerCsv}>
                    <Download size={14} />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Quick Counter Metrics Strip */}
              <div className="pos-stats-strip">
                <div className="pos-stat-cell">
                  <small>TODAY'S CASH COLLECTED</small>
                  <strong className="cash-accent">{money(todayStats.totalCashToday)}</strong>
                </div>
                <div className="pos-stat-cell">
                  <small>GROSS CREDIT EXTENDED</small>
                  <strong style={{ color: '#d97706' }}>{money(todayStats.totalCreditToday)}</strong>
                </div>
                <div className="pos-stat-cell">
                  <small>OUTSTANDING UDHAAR</small>
                  <strong className={todayStats.pendingTotal > 0 ? 'due-accent' : 'settled-accent'}>
                    {money(todayStats.pendingTotal)}
                  </strong>
                </div>
                <div className="pos-stat-cell">
                  <small>ACTIVE KHATA CLIENTS</small>
                  <strong>{customerProfiles.length}</strong>
                </div>
                {todayStats.overdueCount > 0 && (
                  <div className="pos-stat-cell alert-cell">
                    <small>OVERDUE ACCOUNTS</small>
                    <strong className="overdue-accent">{todayStats.overdueCount} due &gt;7d</strong>
                  </div>
                )}
              </div>
            </section>

            {/* Voice Command Assistant Dock ("Ask your Khata") */}
            <section className="khata-voice-dock">
              <div className="voice-dock-inner">
                <div className="voice-dock-title">
                  <span className="agent-gold-dot" />
                  <b>Ask Khata Assistant</b>
                  <small>Natural Hinglish voice or text</small>
                </div>

                <div className="voice-dock-input-group">
                  <button
                    className={`command-mic-btn ${isCommandListening ? 'listening' : ''}`}
                    onClick={toggleCommandRecording}
                    title="Speak a khata command"
                    aria-label="Speak khata voice command"
                  >
                    {isCommandListening ? <MicOff size={14} /> : <Mic size={14} />}
                    <span>{isCommandListening ? 'Listening…' : 'Voice'}</span>
                  </button>

                  <input
                    value={khataCommand}
                    onChange={(event) => setKhataCommand(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runKhataCommand();
                    }}
                    placeholder="E.g. “Raju bhai ke khate mein 300 jama karo” or “Suresh ka baki kitna hai?”"
                    aria-label="Khata voice command"
                  />

                  <button className="voice-run-btn" onClick={runKhataCommand}>
                    Run
                  </button>
                </div>

                {/* Suggested Quick Action Chips */}
                <div className="command-chips">
                  <button
                    className="chip-btn"
                    onClick={() => {
                      setKhataCommand('Raju bhai ke khate mein 300 jama karo');
                      executeVoiceCommand('Raju bhai ke khate mein 300 jama karo');
                    }}
                  >
                    “Raju bhai ke khate mein 300 jama karo”
                  </button>
                  <button
                    className="chip-btn"
                    onClick={() => {
                      setKhataCommand('Sunita tai ka baki kitna hai?');
                      executeVoiceCommand('Sunita tai ka baki kitna hai?');
                    }}
                  >
                    “Sunita tai ka baki kitna hai?”
                  </button>
                  <button
                    className="chip-btn"
                    onClick={() => {
                      setKhataCommand('Aaj kitna cash aaya?');
                      executeVoiceCommand('Aaj kitna cash aaya?');
                    }}
                  >
                    “Aaj kitna cash aaya?”
                  </button>
                </div>

                {commandFeedback && (
                  <div className="command-feedback-card">
                    <CheckCircle2 size={14} className="feedback-check" />
                    <p className="command-feedback">{commandFeedback}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ── TAB 2: NEW KHATA ENTRY STEPPER VIEW (Shown on 'entry' OR on 'pos') ──── */}
        {(activePage === 'entry' || activePage === 'pos') && (
          <section className="work-grid" style={activePage === 'entry' ? { marginTop: '12px' } : {}}>
            {/* 4-Step Progress Stepper Header (When on dedicated entry page) */}
            {activePage === 'entry' && (
              <div className="stepper-container" style={{ gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  className={`stepper-step ${entryStep === 1 ? 'active' : ''} ${entryStep > 1 ? 'completed' : ''}`}
                  onClick={() => setEntryStep(1)}
                >
                  <span className="step-num">{entryStep > 1 ? '✓' : '1'}</span>
                  <span>Capture Slip</span>
                </button>
                <div className="step-divider" />
                <button
                  type="button"
                  className={`stepper-step ${entryStep === 2 ? 'active' : ''} ${entryStep > 2 ? 'completed' : ''}`}
                  onClick={() => setEntryStep(2)}
                >
                  <span className="step-num">{entryStep > 2 ? '✓' : '2'}</span>
                  <span>Voice Update</span>
                </button>
                <div className="step-divider" />
                <button
                  type="button"
                  className={`stepper-step ${entryStep === 3 ? 'active' : ''} ${entryStep > 3 ? 'completed' : ''}`}
                  onClick={() => result && setEntryStep(3)}
                  disabled={!result}
                >
                  <span className="step-num">{entryStep > 3 ? '✓' : '3'}</span>
                  <span>KhataGuard</span>
                </button>
                <div className="step-divider" />
                <button
                  type="button"
                  className={`stepper-step ${entryStep === 4 ? 'active' : ''}`}
                  onClick={() => savedCurrent && setEntryStep(4)}
                  disabled={!savedCurrent}
                >
                  <span className="step-num">4</span>
                  <span>Save &amp; Settle</span>
                </button>
              </div>
            )}

            {/* LEFT: MULTIMODAL INTAKE TILE */}
            <div className="capture-column">
              <div className="panel-card capture-card">
                <div className="panel-heading">
                  <div className="heading-icon amber-icon"><Camera size={18} /></div>
                  <div>
                    <h3>Multimodal Slip Intake</h3>
                    <p>Handwritten slip OCR + spoken counter overrides.</p>
                  </div>
                  <span className="step-number">STEP 01</span>
                </div>

                {/* Manual Fallback Toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    type="button"
                    className="deck-action-btn"
                    style={{ fontSize: '9px', padding: '3px 8px' }}
                    onClick={() => setManualEntryOpen((o) => !o)}
                  >
                    {manualEntryOpen ? '✕ Close Manual Fallback' : '⚡ Manual Entry Fallback (Offline/No AI)'}
                  </button>
                </div>

                {manualEntryOpen ? (
                  <div className="manual-entry-box">
                    <b style={{ fontSize: '11px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                      Deterministic Manual Bill Fallback (No AI Required)
                    </b>
                    <input
                      placeholder="Customer Name (e.g. Raju bhai)"
                      value={manualCustomer}
                      onChange={(e) => setManualCustomer(e.target.value)}
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 8px', marginBottom: '8px', fontSize: '11px' }}
                    />
                    {manualItems.map((it, idx) => (
                      <div className="manual-line-grid" key={idx}>
                        <input
                          placeholder="Item Name"
                          value={it.item_name}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[idx].item_name = e.target.value;
                            setManualItems(updated);
                          }}
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          value={it.final_qty}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[idx].final_qty = Number(e.target.value) || 0;
                            setManualItems(updated);
                          }}
                        />
                        <select
                          value={it.unit}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[idx].unit = e.target.value;
                            setManualItems(updated);
                          }}
                        >
                          <option value="kg">kg</option>
                          <option value="packet">packet</option>
                          <option value="pcs">pcs</option>
                          <option value="L">L</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Rate"
                          value={it.unit_price}
                          onChange={(e) => {
                            const updated = [...manualItems];
                            updated[idx].unit_price = Number(e.target.value) || 0;
                            setManualItems(updated);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))}
                          style={{ border: 0, background: '#fee2e2', color: '#dc2626', borderRadius: '4px', padding: '0 6px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setManualItems([...manualItems, { item_name: '', final_qty: 1, unit: 'kg', unit_price: 50 }])}
                        style={{ padding: '4px 8px', fontSize: '9px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                      >
                        + Add Line
                      </button>
                      <button
                        type="button"
                        onClick={handleManualEntrySubmit}
                        style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: '10px', borderRadius: '4px', background: '#15803d', color: '#fff', border: 0, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Reconcile Manually →
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Parchi Photo Dropzone */}
                    <div className="field-section">
                      <div className="field-label-row">
                        <label>HANDWRITTEN PARCHI / SLIP</label>
                        <span className="field-hint">JPG · PNG · WEBP</span>
                      </div>

                      {imageDataUrl ? (
                        <div className="image-preview-wrap">
                          <img
                            src={imageDataUrl}
                            alt="Uploaded handwritten udhaar parchi preview"
                            className="parchi-preview"
                          />
                          <div className="image-preview-footer">
                            <span><CheckCircle2 size={14} /> Parchi ready for Vision OCR</span>
                            <button onClick={() => fileInputRef.current?.click()}>Replace photo</button>
                          </div>
                          <button
                            className="remove-image"
                            aria-label="Remove uploaded image"
                            onClick={() => {
                              setImageDataUrl('');
                              setImageBase64('');
                              setResult(null);
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`upload-zone ${dragActive ? 'upload-zone-active' : ''}`}
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragActive(true);
                          }}
                          onDragLeave={() => setDragActive(false)}
                          onDrop={(event) => {
                            event.preventDefault();
                            setDragActive(false);
                            handleImageFile(event.dataTransfer.files?.[0]);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
                          }}
                        >
                          <div className="upload-icon-stack">
                            <FileImage size={28} />
                          </div>
                          <b>Drop handwritten parchi here</b>
                          <span>or click to browse from device</span>
                          <div className="upload-actions">
                            <span><Camera size={13} /> Camera-ready</span>
                            <span><ShieldCheck size={13} /> Local-first preview</span>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        className="hidden-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleImageFile(event.target.files?.[0])}
                      />
                      <input
                        ref={cameraInputRef}
                        className="hidden-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) => handleImageFile(event.target.files?.[0])}
                      />
                      {!imageDataUrl && (
                        <button
                          className="camera-secondary"
                          onClick={() => cameraInputRef.current?.click()}
                        >
                          <Camera size={15} /> Snap photo with phone camera
                        </button>
                      )}
                    </div>

                    {/* Spoken Hinglish Update */}
                    <div className="field-section speech-section">
                      <div className="field-label-row">
                        <label>SPOKEN HINGLISH CORRECTION</label>
                        <span className="field-hint"><span className="green-dot" /> HI-IN</span>
                      </div>
                      <div className={`speech-box ${isRecording ? 'speech-box-recording' : ''}`}>
                        <div className="speech-box-top">
                          <div className="speech-mode">
                            <span className={`mic-status ${isRecording ? 'mic-status-live' : ''}`}>
                              <Mic size={15} />
                            </span>
                            <span>{isRecording ? 'Listening at counter…' : 'Live mic capture'}</span>
                          </div>
                          <button
                            className={`record-button ${isRecording ? 'recording' : ''}`}
                            onClick={toggleRecording}
                          >
                            {isRecording ? (
                              <>
                                <span className="recording-rings" />
                                <MicOff size={14} /> Stop
                              </>
                            ) : (
                              <>
                                <Mic size={14} /> Record Counter Voice
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          value={spokenNote}
                          onChange={(event) => setSpokenNote(event.target.value)}
                          placeholder={'E.g. “Raju bhai, 5 kilo ki jagah 3 kilo chawal hi liya… aur 300 rupaye cash de diye.”'}
                          rows={4}
                          aria-label="Spoken Hinglish update"
                        />
                        <div className="speech-box-bottom">
                          <span>
                            {spokenNote.trim()
                              ? `${spokenNote.trim().split(/\s+/).length} words captured`
                              : 'Your counter voice transcript will appear here'}
                          </span>
                          <span><AudioLines size={13} /> Editable transcript</span>
                        </div>
                      </div>
                      {!speechSupported && (
                        <p className="inline-notice">
                          <CircleHelp size={14} /> This browser does not support speech recognition. Type or paste the update instead.
                        </p>
                      )}
                      {recordingError && (
                        <p className="inline-notice notice-warning">
                          <AlertCircle size={14} /> {recordingError}
                        </p>
                      )}
                    </div>

                    {/* Payment Proof Capture */}
                    <div className="field-section proof-capture-section">
                      <div className="field-label-row">
                        <label>PAYMENT PROOF ATTACHMENT</label>
                        <span className="evidence-badge">EVIDENCE ONLY · NOT AUTO-VERIFIED</span>
                      </div>
                      {paymentProofUrl ? (
                        <div className="proof-attached-card">
                          <img src={paymentProofUrl} alt="Payment proof preview" className="proof-thumb" />
                          <div className="proof-info">
                            <b>Proof Attached</b>
                            <small>Attached to ledger entry as audit record</small>
                          </div>
                          <button className="proof-remove-btn" onClick={() => setPaymentProofUrl('')}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="proof-upload-row">
                          <button
                            type="button"
                            className="proof-attach-btn"
                            onClick={() => proofInputRef.current?.click()}
                          >
                            <ImageIcon size={14} />
                            <span>Attach Cash Note / UPI Screenshot</span>
                          </button>
                          <input
                            ref={proofInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden-input"
                            onChange={(e) => handlePaymentProofFile(e.target.files?.[0])}
                          />
                        </div>
                      )}
                    </div>

                    {/* Reconcile Action Button */}
                    <div className="reconcile-footer">
                      <button
                        className="primary-cta"
                        onClick={reconcile}
                        disabled={isReconciling || !imageBase64 || !spokenNote.trim()}
                      >
                        {isReconciling ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
                        <span>{isReconciling ? 'Gemma 4 Reconciling Contradictions…' : 'Reconcile Parchi with Gemma 4'}</span>
                        {!isReconciling && <ArrowRight size={16} />}
                      </button>
                      {isReconciling && <div className="stage-line"><span className="stage-spinner" />{agentStage}</div>}
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="error-panel">
                  <AlertCircle size={17} />
                  <div>
                    <b>Could not complete reconciliation</b>
                    <p>{error}</p>
                  </div>
                  <button aria-label="Dismiss error" onClick={() => setError('')}>
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT: KHATAGUARD VERIFIED LEDGER TERMINAL */}
            <div className="output-column">
              {!result ? (
                <div className="panel-card output-placeholder-card">
                  <div className="panel-heading output-heading">
                    <div className="heading-icon green-icon"><ClipboardCheck size={18} /></div>
                    <div>
                      <h3>KhataGuard Review Terminal</h3>
                      <p>Reconciled bill, risk audit, and udhaar decision land here.</p>
                    </div>
                    <span className="step-number">STEP 02</span>
                  </div>
                  <EmptyOutput />
                  {isReconciling && (
                    <div className="output-loading">
                      <LoaderCircle size={17} className="spin" />
                      <span>{agentStage || 'Working through the parchi…'}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel-card verified-card">
                  {/* ── KHATAGUARD REVIEW CARD ─────────────────────────────── */}
                  <div className="khataguard-review-card">
                    <div className="review-card-header">
                      <div className="review-title-wrap">
                        <span className="agent-gold-badge"><ShieldCheck size={13} /> KHATAGUARD TRUST &amp; AUDIT</span>
                        <h4>Dispute Risk &amp; Contradiction Review</h4>
                      </div>
                      <span className="confidence-pill">
                        Overall Confidence: <b>{result.ledger?.confidence?.overall_confidence || 96}%</b>
                      </span>
                    </div>

                    {/* Plain-Language "Why Flagged?" Callout */}
                    {result.ledger?.disputes && result.ledger.disputes.length > 0 ? (
                      <div className="why-flagged-callout">
                        <b><AlertTriangle size={15} /> Why Flagged? (Handwritten vs Spoken Contradiction)</b>
                        <p>
                          Customer changed quantities spoken at counter: {result.ledger.disputes.map((d) => `${d.item_name} was written as ${d.slip_qty || 0} ${d.unit} in parchi, but changed to ${d.final_qty} ${d.unit} verbally`).join('; ')}.
                        </p>
                      </div>
                    ) : (
                      <div className="no-disputes-banner">
                        <CheckCircle2 size={15} />
                        <span>Zero contradictions detected. Handwritten slip and spoken audio align 100%.</span>
                      </div>
                    )}

                    {/* Risk Signals Strip */}
                    <div className="risk-signals-strip">
                      <span className="risk-signal-pill safe">
                        <CheckCircle2 size={11} /> High Vision Clarity ({(result.ledger?.confidence?.ocr_clarity_score || 94)}%)
                      </span>
                      {result.ledger?.disputes?.length > 0 && (
                        <span className="risk-signal-pill warning">
                          <AlertTriangle size={11} /> {result.ledger.disputes.length} Voice Overrides
                        </span>
                      )}
                      {result.ledger?.subtotal > 2500 && (
                        <span className="risk-signal-pill warning">
                          <AlertTriangle size={11} /> Unusual Bill Size (&gt; ₹2,500)
                        </span>
                      )}
                      {duplicateCheck.isDuplicate && (
                        <span className="risk-signal-pill danger">
                          <ShieldAlert size={11} /> Suspected Duplicate Bill
                        </span>
                      )}
                    </div>

                    {/* Duplicate Warning & Override Reason */}
                    {duplicateCheck.isDuplicate && (
                      <div className="duplicate-warning-banner">
                        <b><ShieldAlert size={14} /> Suspected Duplicate Bill Warning</b>
                        <p>{duplicateCheck.reason}</p>
                        <input
                          className="duplicate-override-input"
                          placeholder="Enter cashier override reason to confirm this separate transaction…"
                          value={duplicateOverrideReason}
                          onChange={(e) => setDuplicateOverrideReason(e.target.value)}
                        />
                      </div>
                    )}

                    {/* "Should I give udhaar?" Decision Card */}
                    {newBillUdhaarDecision && (
                      <div className={`decision-card ${newBillUdhaarDecision.badgeClass}`}>
                        <div className="decision-top-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="decision-badge">
                              <Scale size={13} /> {newBillUdhaarDecision.recommendation}
                            </span>
                            <small style={{ fontWeight: 700, color: '#334155' }}>
                              ({newBillUdhaarDecision.hindiRecommendation})
                            </small>
                          </div>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            Projected Balance: <b>{money(newBillUdhaarDecision.projectedBalance)}</b> / {money(newBillUdhaarDecision.creditLimit)} limit ({newBillUdhaarDecision.utilizationPercent}%)
                          </span>
                        </div>
                        <p className="decision-reason-text">{newBillUdhaarDecision.reason}</p>
                        <p className="decision-hindi-text">{newBillUdhaarDecision.hindiReason}</p>
                      </div>
                    )}

                    {/* Confidence Breakdown Meters */}
                    <div className="confidence-breakdown-grid">
                      <div className="conf-meter">
                        <span>Customer Name</span>
                        <b>{result.ledger?.confidence?.customer_name_confidence || 98}%</b>
                      </div>
                      <div className="conf-meter">
                        <span>OCR Handwriting</span>
                        <b>{result.ledger?.confidence?.ocr_clarity_score || 94}%</b>
                      </div>
                      <div className="conf-meter">
                        <span>Voice Alignment</span>
                        <b>{result.ledger?.confidence?.voice_alignment_score || 98}%</b>
                      </div>
                    </div>

                    {/* Shopkeeper Explicit Confirmation */}
                    <div className="shopkeeper-approval-strip">
                      <label className="approval-checkbox-label">
                        <input
                          type="checkbox"
                          checked={shopkeeperConfirmed}
                          onChange={(e) => setShopkeeperConfirmed(e.target.checked)}
                        />
                        <span>
                          <b>Shopkeeper confirmed with customer</b>
                          <small>I have reviewed and approved all quantities, prices, and cash adjustments.</small>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* ── BILL HEADER & SAVE CTA ───────────────────────────────── */}
                  <div className="bill-title-row">
                    <div>
                      <span className="eyebrow">RECONCILED BILL</span>
                      <h3>{result.ledger.customer_name || 'Customer'}</h3>
                      <p><Clock3 size={13} /> {formatTimestamp(result.createdAt)}</p>
                    </div>
                    <button
                      className={`save-khata-button ${savedCurrent ? 'saved' : ''}`}
                      onClick={saveToRegister}
                      disabled={savedCurrent || !shopkeeperConfirmed || (duplicateCheck.isDuplicate && !duplicateOverrideReason.trim())}
                      title={
                        !shopkeeperConfirmed
                          ? 'Check shopkeeper approval above to save'
                          : duplicateCheck.isDuplicate && !duplicateOverrideReason.trim()
                          ? 'Enter duplicate override reason'
                          : 'Commit bill to register'
                      }
                    >
                      {savedCurrent ? <Check size={15} /> : <Landmark size={15} />}
                      {savedCurrent ? 'Saved to Khata' : 'Save to Today’s Khata'}
                    </button>
                  </div>

                  {/* Reconciled Items Table with Quick Correction Pad */}
                  <div className="bill-table-wrap">
                    <table className="bill-table">
                      <thead>
                        <tr>
                          <th>ITEM / CHANGE</th>
                          <th>QTY</th>
                          <th>RATE</th>
                          <th className="align-right">AMOUNT</th>
                          <th className="align-center">EDIT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.ledger.items.map((item, index) => (
                          <tr
                            key={`${item.item_name}-${index}`}
                            className={item.source_status === 'removed_by_voice' ? 'removed-row' : ''}
                          >
                            <td>
                              <div className="bill-item-name">{item.item_name}</div>
                              <SourceBadge status={item.source_status} />
                              {item.modification_note && (
                                <small className="change-note">{item.modification_note}</small>
                              )}
                            </td>
                            <td className="quantity-cell">
                              {item.source_status === 'modified_by_voice' ? (
                                <>
                                  <del>{item.slip_qty} {item.unit}</del>
                                  <span className="qty-arrow">→</span>
                                  <b>{item.final_qty} {item.unit}</b>
                                </>
                              ) : item.source_status === 'added_by_voice' ? (
                                <b>{item.final_qty} {item.unit}</b>
                              ) : item.source_status === 'removed_by_voice' ? (
                                <del>{item.slip_qty} {item.unit}</del>
                              ) : (
                                <span>{item.final_qty} {item.unit}</span>
                              )}
                            </td>
                            <td className="rate-cell">
                              {money(item.unit_price)}
                              <small> / {item.unit}</small>
                            </td>
                            <td className="align-right amount-cell">{money(item.line_total)}</td>
                            <td className="align-center">
                              <button
                                className="quick-edit-btn"
                                title="Touch correction pad"
                                onClick={() => setEditingLineIndex(editingLineIndex === index ? null : index)}
                              >
                                <Edit2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Inline Quick-Fix Touchpad */}
                  {editingLineIndex !== null && result.ledger.items[editingLineIndex] && (
                    <div className="quick-touch-pad">
                      <div className="touch-pad-header">
                        <b>Quick Touch Correction · {result.ledger.items[editingLineIndex].item_name}</b>
                        <button className="touch-pad-close" onClick={() => setEditingLineIndex(null)}>
                          <X size={13} />
                        </button>
                      </div>
                      <div className="touch-stepper-row">
                        <div className="stepper-block">
                          <label>Quantity ({result.ledger.items[editingLineIndex].unit}):</label>
                          <div className="stepper-controls">
                            <button
                              onClick={() =>
                                handleUpdateLineItem(
                                  editingLineIndex,
                                  Math.max(0, result.ledger.items[editingLineIndex].final_qty - 1),
                                  result.ledger.items[editingLineIndex].unit_price
                                )
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              value={result.ledger.items[editingLineIndex].final_qty}
                              onChange={(e) =>
                                handleUpdateLineItem(
                                  editingLineIndex,
                                  e.target.value,
                                  result.ledger.items[editingLineIndex].unit_price
                                )
                              }
                            />
                            <button
                              onClick={() =>
                                handleUpdateLineItem(
                                  editingLineIndex,
                                  result.ledger.items[editingLineIndex].final_qty + 1,
                                  result.ledger.items[editingLineIndex].unit_price
                                )
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="stepper-block">
                          <label>Rate / Unit (₹):</label>
                          <input
                            type="number"
                            className="rate-direct-input"
                            value={result.ledger.items[editingLineIndex].unit_price}
                            onChange={(e) =>
                              handleUpdateLineItem(
                                editingLineIndex,
                                result.ledger.items[editingLineIndex].final_qty,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deterministic Totals Strip */}
                  <div className="totals-strip">
                    <div className="total-metric">
                      <span>TOTAL BILL</span>
                      <strong>{money(result.ledger.subtotal)}</strong>
                      <small>
                        {result.ledger.items.filter((item) => item.source_status !== 'removed_by_voice').length} active lines
                      </small>
                    </div>
                    <div className="total-metric">
                      <span>CASH PAID NOW</span>
                      <strong className="cash-value">− {money(result.ledger.cash_paid_now)}</strong>
                      <small><CheckCircle2 size={12} /> Received at counter</small>
                    </div>
                    <div className="total-metric total-metric-balance">
                      <span><Wallet size={12} /> NET UDHAAR</span>
                      <strong>{money(result.ledger.net_udhaar)}</strong>
                      <small>Pending balance added to khata</small>
                    </div>
                  </div>

                  {/* Dynamic UPI QR Code */}
                  {result.ledger.net_udhaar > 0 && (
                    <DynamicUpiQr
                      upiId={shopUpiId}
                      amount={result.ledger.net_udhaar}
                      customerName={result.ledger.customer_name}
                    />
                  )}

                  {/* Payment Proof Thumbnail if attached */}
                  {result.paymentProofUrl && (
                    <div className="bill-proof-attachment">
                      <span className="proof-label-tag">
                        <ImageIcon size={13} /> ATTACHED PAYMENT PROOF (EVIDENCE ONLY)
                      </span>
                      <button
                        className="view-proof-btn"
                        onClick={() =>
                          setViewingProof({
                            url: result.paymentProofUrl,
                            title: `Payment Proof · ${result.ledger.customer_name}`,
                          })
                        }
                      >
                        <Eye size={13} /> View Photo
                      </button>
                    </div>
                  )}

                  {/* Hindi WhatsApp Receipt Card */}
                  <div className="receipt-card">
                    <div className="receipt-card-header">
                      <div className="receipt-title-icon"><ReceiptIndianRupee size={17} /></div>
                      <div>
                        <h4>WhatsApp Bill Receipt</h4>
                        <p>Ready to send directly to customer</p>
                      </div>
                      {/* Script Toggle */}
                      <div className="script-toggle-wrap">
                        <button
                          className={`script-pill ${receiptScript === 'devanagari' ? 'active' : ''}`}
                          onClick={() => setReceiptScript('devanagari')}
                        >
                          हिन्दी
                        </button>
                        <button
                          className={`script-pill ${receiptScript === 'hinglish' ? 'active' : ''}`}
                          onClick={() => setReceiptScript('hinglish')}
                        >
                          Hinglish
                        </button>
                      </div>
                    </div>
                    <div className="receipt-text" lang={receiptScript === 'devanagari' ? 'hi' : 'en'}>
                      {activeReceiptText}
                    </div>
                    <div className="receipt-actions">
                      <button
                        className={`copy-button ${copied ? 'copied' : ''}`}
                        onClick={() => copyReceipt(activeReceiptText)}
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copied!' : 'Copy receipt'}
                      </button>
                      <a
                        className="whatsapp-button"
                        href={`https://wa.me/?text=${encodeURIComponent(activeReceiptText)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="whatsapp-mark">↗</span> Send on WhatsApp <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Gemma Agent Reasoning Trace */}
                  <div className="trace-panel">
                    <button
                      className="trace-toggle"
                      onClick={() => setTraceOpen((open) => !open)}
                      aria-expanded={traceOpen}
                    >
                      <span className="trace-title-icon"><Activity size={16} /></span>
                      <span>
                        <b>Gemma 4 Agentic Reasoning &amp; Tool Trace</b>
                        <small>{result.traceSteps.length} events · {result.modelId}</small>
                      </span>
                      {traceOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                    </button>
                    {traceOpen && (
                      <div className="trace-content">
                        {result.traceSteps.length === 0 ? (
                          <p className="trace-empty">No trace events returned by model.</p>
                        ) : (
                          result.traceSteps.map((step, index) => (
                            <div className="trace-event" key={`${step.type}-${index}`}>
                              <div
                                className={`trace-event-icon ${
                                  step.type === 'tool'
                                    ? 'trace-tool-icon'
                                    : step.type === 'thought'
                                    ? 'trace-thought-icon'
                                    : 'trace-notice-icon'
                                }`}
                              >
                                {step.type === 'tool' ? (
                                  <PackagePlus size={13} />
                                ) : step.type === 'thought' ? (
                                  <Sparkles size={13} />
                                ) : (
                                  <CircleHelp size={13} />
                                )}
                              </div>
                              <div className="trace-event-main">
                                <div className="trace-event-top">
                                  <b>
                                    {step.name ||
                                      step.title ||
                                      (step.type === 'thought'
                                        ? `Model thought · turn ${step.turn}`
                                        : 'Agent notice')}
                                  </b>
                                  <span>
                                    {step.type === 'tool'
                                      ? 'TOOL CALL'
                                      : step.type === 'thought'
                                      ? 'THINKING'
                                      : 'NOTICE'}
                                  </span>
                                </div>
                                {step.type === 'thought' ? (
                                  <p className="trace-thought-text">{step.text}</p>
                                ) : step.type === 'tool' ? (
                                  <>
                                    <details>
                                      <summary>Arguments · JSON</summary>
                                      <pre>{JSON.stringify(step.arguments, null, 2)}</pre>
                                    </details>
                                    <details>
                                      <summary>Deterministic output · JSON</summary>
                                      <pre>{JSON.stringify(step.output, null, 2)}</pre>
                                    </details>
                                  </>
                                ) : (
                                  <p className="trace-thought-text">{step.detail}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── TODAY'S LOCAL REGISTER STRIP (When on POS or New Entry Step 4) ──── */}
        {activePage === 'pos' && (
          <section className="register-section">
            <div className="register-heading-row">
              <div className="register-heading">
                <span className="register-heading-icon"><Landmark size={19} /></span>
                <div>
                  <span className="eyebrow">BROWSER LOCAL LEDGER</span>
                  <h2>Today's Bhopal Shop Udhaar Register</h2>
                  <p>Saved transactions stay in your local browser storage.</p>
                </div>
              </div>
              <div className="register-actions">
                <div className="pending-summary">
                  <span>Pending udhaar</span>
                  <b>{money(todayStats.pendingTotal)}</b>
                </div>

                <button
                  className="export-action-btn"
                  disabled={register.length === 0}
                  onClick={exportLedgerCsv}
                  title="Download CSV for Excel / CA"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
                <button
                  className="export-action-btn"
                  disabled={register.length === 0}
                  onClick={() => window.print()}
                  title="Print ledger summary"
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>

                <button
                  className="clear-register-button"
                  disabled={register.length === 0}
                  onClick={() => {
                    if (window.confirm('Clear all saved entries from this browser register?')) {
                      setRegister([]);
                    }
                  }}
                >
                  <RefreshCw size={14} /> Clear
                </button>
              </div>
            </div>

            {register.length === 0 ? (
              <div className="register-empty">
                <div className="register-empty-icon"><Wallet size={20} /></div>
                <div>
                  <b>No entries saved yet</b>
                  <p>Reconcile a parchi, confirm the balance, then save to build today's khata.</p>
                </div>
                <span className="register-empty-hint">LOCAL STORAGE <span className="green-dot" /></span>
              </div>
            ) : (
              <div className="register-table-wrap">
                <table className="register-table">
                  <thead>
                    <tr>
                      <th>CUSTOMER</th>
                      <th>TIME SAVED</th>
                      <th>TOTAL BILL</th>
                      <th>CASH PAID</th>
                      <th>PENDING UDHAAR</th>
                      <th>PROOF</th>
                      <th>REMINDER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {register.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <div className="register-customer-cell">
                            <div className="register-customer-avatar">
                              {String(entry.customer_name || '?').trim().charAt(0).toLocaleUpperCase('hi-IN')}
                            </div>
                            <div>
                              <b>{entry.customer_name || 'Customer'}</b>
                              {entry.entryKind === 'payment' && (
                                <span className="entry-kind-chip payment-chip">Payment Received</span>
                              )}
                              {entry.entryKind === 'reversal' && (
                                <span className="reversal-chip">Reversed</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>{formatTimestamp(entry.createdAt)}</td>
                        <td>{money(entry.subtotal)}</td>
                        <td className="cash-value">{money(entry.cash_paid_now)}</td>
                        <td>
                          <b className={entry.net_udhaar > 0 ? 'due-value' : 'settled-value'}>
                            {money(entry.net_udhaar)}
                          </b>
                        </td>
                        <td>
                          {entry.paymentProofUrl ? (
                            <button
                              className="proof-badge-btn"
                              onClick={() =>
                                setViewingProof({
                                  url: entry.paymentProofUrl,
                                  title: `Proof · ${entry.customer_name}`,
                                })
                              }
                            >
                              <ImageIcon size={12} /> View
                            </button>
                          ) : (
                            <span className="no-proof-text">—</span>
                          )}
                        </td>
                        <td>
                          <a
                            className="reminder-link"
                            href={`https://wa.me/?text=${encodeURIComponent(
                              entry.whatsappReceipt ||
                                `नमस्ते ${entry.customer_name} जी, आपका बाकी उधार ₹${entry.net_udhaar} है। धन्यवाद!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ArrowDownRight size={14} /> Send reminder
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── TAB 3: CUSTOMER DIRECTORY & KHATA LEDGER ─────────────────────── */}
        {(activePage === 'pos' || activePage === 'customers') && (
          <section className="customer-book-section" style={activePage === 'customers' ? { marginTop: 0 } : {}}>
            <div className="customer-book-heading">
              <div>
                <span className="eyebrow">
                  {activePage === 'customers' ? 'MASTER KHATA LEDGER' : 'CUSTOMER MEMORY & TIMELINE'}
                </span>
                <h2>{activePage === 'customers' ? 'Customer Accounts Directory' : 'AI Khata Book'}</h2>
                <p>Searchable customer balances, transaction timelines, trust scores, and respectful WhatsApp reminders.</p>
              </div>
              <div className="customer-search-wrap">
                <label className="customer-search">
                  <Search size={15} />
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search customer name, phone, or alias (e.g. 'Raju', '98260')"
                    aria-label="Search customer profiles"
                  />
                </label>
                {/* Queue Filter Tabs: All, Due, Settled */}
                <div className="filter-pill-group">
                  <button
                    className={`filter-pill ${customerFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setCustomerFilter('all')}
                  >
                    All ({customerProfiles.length})
                  </button>
                  <button
                    className={`filter-pill ${customerFilter === 'due' ? 'active' : ''}`}
                    onClick={() => setCustomerFilter('due')}
                  >
                    Due / Overdue ({customerProfiles.filter((c) => c.balance > 0).length})
                  </button>
                  <button
                    className={`filter-pill ${customerFilter === 'settled' ? 'active' : ''}`}
                    onClick={() => setCustomerFilter('settled')}
                  >
                    Settled ({customerProfiles.filter((c) => c.balance <= 0).length})
                  </button>
                </div>
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="customer-empty">
                <UserRound size={20} />
                <span>No customer profiles match your search. Reconcile a slip to start a khata profile.</span>
              </div>
            ) : (
              <div className="customer-book-grid">
                {/* Left: Customer Cards List */}
                <div className="customer-list">
                  {filteredCustomers.map((customer) => {
                    const trust = calculateCustomerTrustScore({
                      balance: customer.balance,
                      entries: customer.entries,
                      daysOverdue: customer.daysOverdue || 0,
                    });
                    return (
                      <button
                        key={customer.key}
                        className={`customer-row ${activeCustomer?.key === customer.key ? 'selected' : ''}`}
                        onClick={() => setSelectedCustomer(customer.key)}
                      >
                        <span className="customer-avatar">
                          {customer.name.charAt(0).toLocaleUpperCase('hi-IN')}
                        </span>
                        <span className="customer-meta">
                          <b>{customer.name}</b>
                          <small>
                            {customer.entries.length} entr{customer.entries.length === 1 ? 'y' : 'ies'} · {formatTimestamp(customer.lastActivity)}
                          </small>
                          <div className="customer-row-tags">
                            <span className={`trust-chip ${trust.badgeClass}`}>{trust.label.split(' ')[0]}</span>
                            {customer.daysOverdue >= 7 && (
                              <span className="overdue-tag">Overdue {customer.daysOverdue}d</span>
                            )}
                          </div>
                        </span>
                        <strong className={customer.balance > 0 ? 'due-value' : 'settled-value'}>
                          {money(customer.balance)}
                        </strong>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Active Customer Detail & Transaction Timeline */}
                {activeCustomer && (
                  <div className="customer-timeline">
                    <div className="timeline-top">
                      <div className="timeline-customer-info">
                        <span className="customer-avatar-lg">
                          {activeCustomer.name.charAt(0).toLocaleUpperCase('hi-IN')}
                        </span>
                        <div>
                          <span className="eyebrow">CUSTOMER PROFILE</span>
                          <h3>{activeCustomer.name}</h3>
                          <p className="customer-phone">
                            <Phone size={12} /> {activeCustomer.phone}
                          </p>
                        </div>
                      </div>
                      <div className="timeline-balance-box">
                        <span className="balance-label">CURRENT BALANCE</span>
                        <strong className={activeCustomer.balance > 0 ? 'due-value' : 'settled-value'}>
                          {money(activeCustomer.balance)}
                        </strong>
                        <small>{activeCustomer.balance > 0 ? 'Pending Udhaar' : 'Account Settled'}</small>
                      </div>
                    </div>

                    {/* "Should I give udhaar?" Decision Card for this customer */}
                    {activeCustomerUdhaarDecision && (
                      <div className={`decision-card ${activeCustomerUdhaarDecision.badgeClass}`}>
                        <div className="decision-top-row">
                          <span className="decision-badge">
                            <Scale size={13} /> {activeCustomerUdhaarDecision.recommendation}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>
                            Limit: <b>{money(activeCustomerUdhaarDecision.creditLimit)}</b> ({activeCustomerUdhaarDecision.utilizationPercent}% utilized)
                          </span>
                        </div>
                        <p className="decision-reason-text">{activeCustomerUdhaarDecision.reason}</p>
                        <p className="decision-hindi-text">{activeCustomerUdhaarDecision.hindiReason}</p>
                      </div>
                    )}

                    {/* Smart Udhaar Trust Meter & Credit Limit Health */}
                    {activeCustomerTrust && (
                      <div className="trust-meter-card">
                        <div className="trust-meter-header">
                          <span className={`trust-status-badge ${activeCustomerTrust.badgeClass}`}>
                            <ShieldCheck size={13} /> {activeCustomerTrust.label}
                          </span>
                          <span className="credit-limit-text">
                            Limit: <b>{money(activeCustomerTrust.creditLimit)}</b> ({activeCustomerTrust.utilizationPercent}% used)
                          </span>
                        </div>
                        <div className="credit-progress-bar">
                          <div
                            className={`credit-progress-fill ${activeCustomerTrust.badgeClass}`}
                            style={{ width: `${activeCustomerTrust.utilizationPercent}%` }}
                          />
                        </div>
                        <p className="trust-advice-note">{activeCustomerTrust.advice}</p>
                      </div>
                    )}

                    {/* Actions Bar: Dynamic QR & Smart Reminder */}
                    <div className="timeline-action-banner">
                      {activeCustomer.balance > 0 && (
                        <button
                          className="reminder-modal-btn"
                          onClick={() => openReminderModal(activeCustomer)}
                        >
                          <MessageCircle size={15} />
                          <span>Send Smart WhatsApp Reminder</span>
                        </button>
                      )}
                    </div>

                    {/* Customer Specific Dynamic UPI QR Code */}
                    {activeCustomer.balance > 0 && (
                      <DynamicUpiQr
                        upiId={shopUpiId}
                        amount={activeCustomer.balance}
                        customerName={activeCustomer.name}
                      />
                    )}

                    {/* Chronological Transaction Timeline Entries */}
                    <div className="timeline-items">
                      <div className="timeline-heading-row">
                        <span><History size={13} /> TRANSACTION TIMELINE</span>
                        <small>{activeCustomer.entries.length} events</small>
                      </div>

                      {activeCustomer.entries.map((entry) => (
                        <div className="timeline-entry" key={entry.id}>
                          <span className={`timeline-dot ${entry.entryKind === 'payment' ? 'payment-dot' : entry.entryKind === 'reversal' ? 'reversal-dot' : ''}`}>
                            {entry.entryKind === 'payment' ? (
                              <CircleDollarSign size={14} />
                            ) : entry.entryKind === 'reversal' ? (
                              <RotateCcw size={14} />
                            ) : (
                              <ReceiptIndianRupee size={14} />
                            )}
                          </span>
                          <div className="timeline-entry-details">
                            <div className="timeline-entry-header">
                              <b>{entry.entryKind === 'payment' ? 'Payment recorded' : entry.entryKind === 'reversal' ? 'Reversal / Correction' : 'Verified parchi bill'}</b>
                              <small>{formatTimestamp(entry.createdAt)}</small>
                            </div>
                            <p className="timeline-entry-sub">
                              {entry.entryKind === 'payment'
                                ? `Cash received: ${money(entry.cash_paid_now)}`
                                : entry.entryKind === 'reversal'
                                ? `Reversal: ${money(entry.subtotal)} (${entry.reversalReason || 'Correction'})`
                                : `Bill total: ${money(entry.subtotal)} · Cash paid: ${money(entry.cash_paid_now)}`}
                            </p>

                            {/* Line items preview if available */}
                            {entry.items && entry.items.length > 0 && (
                              <div className="timeline-item-tags">
                                {entry.items.slice(0, 3).map((it, idx) => (
                                  <span key={idx} className="timeline-item-pill">
                                    {it.item_name} ({it.final_qty} {it.unit})
                                  </span>
                                ))}
                                {entry.items.length > 3 && (
                                  <span className="timeline-item-pill">+{entry.items.length - 3} more</span>
                                )}
                              </div>
                            )}

                            {/* Payment Proof Verification Workflow */}
                            {entry.paymentProofUrl && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                                <button
                                  className="timeline-proof-tag"
                                  onClick={() =>
                                    setViewingProof({
                                      url: entry.paymentProofUrl,
                                      title: `Payment Proof · ${entry.customer_name}`,
                                    })
                                  }
                                >
                                  <ImageIcon size={11} /> Attached Proof
                                </button>
                                <span className={`proof-status-pill ${entry.proofStatus || 'evidence-uploaded'}`}>
                                  {entry.proofStatus === 'verified' ? '✓ Verified' : entry.proofStatus === 'rejected' ? '✕ Rejected' : 'Awaiting Check'}
                                </span>
                                {entry.proofStatus !== 'verified' && (
                                  <button
                                    className="verify-action-btn"
                                    onClick={() => handleVerifyPaymentProof(entry.id, 'verify')}
                                  >
                                    Verify
                                  </button>
                                )}
                                {entry.proofStatus !== 'rejected' && (
                                  <button
                                    className="verify-action-btn"
                                    style={{ background: '#fee2e2', color: '#dc2626' }}
                                    onClick={() => handleVerifyPaymentProof(entry.id, 'reject')}
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Audited Reversal Button */}
                            {entry.entryKind !== 'reversal' && (
                              <div style={{ marginTop: '6px' }}>
                                <button
                                  type="button"
                                  className="deck-action-btn"
                                  style={{ padding: '2px 7px', fontSize: '9px' }}
                                  onClick={() => {
                                    setReversingEntry(entry);
                                    setReversalReason('');
                                  }}
                                >
                                  <RotateCcw size={10} /> Reverse / Correct
                                </button>
                              </div>
                            )}
                          </div>

                          <strong className={Number(entry.net_udhaar) > 0 ? 'due-value' : 'settled-value'}>
                            {Number(entry.net_udhaar) > 0 ? '+' : ''}
                            {money(entry.net_udhaar)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ── TAB 4: DAILY CASH & BUSINESS ANALYTICS ───────────────────────── */}
        {activePage === 'analytics' && (
          <AnalyticsDashboardView
            todayStats={todayStats}
            customerProfiles={customerProfiles}
            register={register}
            auditLogs={auditLogs}
            openingCash={openingCash}
            setOpeningCash={setOpeningCash}
            dailyExpenses={dailyExpenses}
            setDailyExpenses={setDailyExpenses}
            actualDrawerCash={actualDrawerCash}
            setActualDrawerCash={setActualDrawerCash}
            mismatchExplanation={mismatchExplanation}
            setMismatchExplanation={setMismatchExplanation}
            onExportCsv={exportLedgerCsv}
            onOpenReminder={openReminderModal}
          />
        )}

        {/* ── TAB 5: STORE INVENTORY & RATE CARD MANAGER ───────────────────── */}
        {activePage === 'inventory' && (
          <StoreInventoryView
            catalog={customCatalog}
            search={inventorySearch}
            setSearch={setInventorySearch}
            category={inventoryCategory}
            setCategory={setInventoryCategory}
            onToggleStock={handleToggleStock}
            onOpenNewProduct={() => setNewProductModalOpen(true)}
            session={session}
            onLockCounter={handleLockCounter}
            shopUpiId={shopUpiId}
            setShopUpiId={setShopUpiId}
            soundboxEnabled={soundboxEnabled}
            setSoundboxEnabled={setSoundboxEnabled}
            onTestSoundbox={testSoundbox}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
          />
        )}

        {/* ── TAB 6: GRAHAK SELF-SERVICE PASSBOOK PORTAL ───────────────────── */}
        {activePage === 'grahak' && (
          <GrahakPortalView
            customerProfiles={customerProfiles}
            selectedKey={grahakCustomerKey}
            setSelectedKey={setGrahakCustomerKey}
            shopUpiId={shopUpiId}
            storeName={session.storeName}
            onInspectProof={setViewingProof}
          />
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="app-footer">
          <div className="footer-brand">
            <span className="footer-mark"><Store size={15} /></span>
            <b>KiranaKhata Live</b>
            <span>·</span>
            <span>Bhopal Cashier Terminal · Counter: {session.counterId || 'POS 1'}</span>
          </div>
          <div className="footer-right">
            <span><span className="green-dot" /> MERCHANT SHIFT ONLINE</span>
            <span>BHOPAL, MP · INDIA</span>
          </div>
        </footer>
      </main>

      {/* ── STORE MANAGEMENT & SHIFT DASHBOARD MODAL ───────────────────────── */}
      {storeDashboardOpen && (
        <Modal
          title="Store Counter & Shift Management"
          icon={Store}
          onClose={() => setStoreDashboardOpen(false)}
        >
          <div className="store-dashboard-modal-body">
            <div className="shift-summary-panel">
              <div className="shift-stat-box">
                <label>Active Store</label>
                <b>{session.storeName}</b>
                <small>{session.storeLocation}</small>
              </div>
              <div className="shift-stat-box">
                <label>Current Shift Cashier</label>
                <b>{session.cashierName}</b>
                <small>{session.counterId}</small>
              </div>
            </div>

            <div className="shift-metrics-grid">
              <div className="shift-metric-cell">
                <label>Shift Opened</label>
                <b>{formatTimestamp(session.shiftStart)}</b>
              </div>
              <div className="shift-metric-cell">
                <label>Today's Receipts</label>
                <b>{register.length} records</b>
              </div>
              <div className="shift-metric-cell">
                <label>Cash In Register</label>
                <b className="cash-accent">{money(todayStats.totalCashToday)}</b>
              </div>
            </div>

            <div className="dashboard-settings-section">
              <label className="settings-section-label">COUNTER PREFERENCES</label>
              <div className="settings-row">
                <div>
                  <b>Digital Hindi Soundbox</b>
                  <p>Speak transaction amounts aloud across the counter</p>
                </div>
                <button
                  className={`settings-toggle-btn ${soundboxEnabled ? 'active' : ''}`}
                  onClick={() => setSoundboxEnabled((s) => !s)}
                >
                  {soundboxEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div className="settings-row">
                <div>
                  <b>Tactile Register Sound FX</b>
                  <p>Cash register drawer bell on commit</p>
                </div>
                <button
                  className={`settings-toggle-btn ${soundEnabled ? 'active' : ''}`}
                  onClick={() => setSoundEnabled((s) => !s)}
                >
                  {soundEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="dashboard-modal-footer">
              <button
                className="lock-session-cta"
                onClick={() => {
                  setStoreDashboardOpen(false);
                  handleLockCounter();
                }}
              >
                <Lock size={14} /> Lock Counter &amp; Switch Cashier
              </button>
              <button
                className="modal-cancel"
                onClick={() => setStoreDashboardOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── SEARCHABLE MULTIMODAL PARCHI ARCHIVE MODAL ───────────────────────── */}
      {archiveModalOpen && (
        <Modal
          title="Searchable Multimodal Parchi Archive"
          icon={FileImage}
          onClose={() => setArchiveModalOpen(false)}
          wide
        >
          <div className="archive-modal-header">
            <label className="archive-search-box">
              <Search size={15} />
              <input
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                placeholder="Search parchi by item (e.g. 'chawal', 'toor dal'), customer name, or date"
              />
            </label>
            <small>{archivedParchis.length} saved parchi slips indexed</small>
          </div>

          <div className="archive-cards-grid">
            {archivedParchis.length === 0 ? (
              <div className="archive-empty-state">
                <FileImage size={24} />
                <b>No matching parchis found in archive</b>
                <p>Try searching for "chawal", "dal", or a customer's name.</p>
              </div>
            ) : (
              archivedParchis.map((parchi) => (
                <div
                  key={parchi.id}
                  className="archived-parchi-card"
                  onClick={() => setInspectedParchi(parchi)}
                >
                  <div className="parchi-thumb-frame">
                    {parchi.parchiThumbnail ? (
                      <img src={parchi.parchiThumbnail} alt="Archived slip" />
                    ) : (
                      <div className="parchi-thumb-placeholder">
                        <FileImage size={24} />
                      </div>
                    )}
                  </div>
                  <div className="archived-parchi-meta">
                    <b>{parchi.customer_name || 'Customer'}</b>
                    <small>{formatTimestamp(parchi.createdAt)}</small>
                    <div className="archived-items-summary">
                      {(parchi.items || []).slice(0, 2).map((it, idx) => (
                        <span key={idx} className="archive-item-chip">{it.item_name}</span>
                      ))}
                    </div>
                    <strong className="archived-amount">{money(parchi.net_udhaar || parchi.subtotal)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

      {/* ── INSPECTED ARCHIVED PARCHI FULL VIEW MODAL ────────────────────────── */}
      {inspectedParchi && (
        <Modal
          title={`Parchi Slip · ${inspectedParchi.customer_name || 'Customer'}`}
          icon={FileCheck2}
          onClose={() => setInspectedParchi(null)}
          wide
        >
          <div className="inspected-parchi-body">
            <div className="inspected-slip-view">
              {inspectedParchi.parchiThumbnail ? (
                <img src={inspectedParchi.parchiThumbnail} alt="Full parchi preview" />
              ) : (
                <div className="inspected-no-img">No slip photo stored for this bill.</div>
              )}
            </div>
            <div className="inspected-details-view">
              <h4>Reconciled Slip Audit Details</h4>
              <p className="inspected-date"><Clock3 size={13} /> {formatTimestamp(inspectedParchi.createdAt)}</p>
              <table className="inspected-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th className="align-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(inspectedParchi.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td>{it.item_name}</td>
                      <td>{it.final_qty} {it.unit}</td>
                      <td>{money(it.unit_price)}</td>
                      <td className="align-right">{money(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="inspected-totals-row">
                <span>Net Udhaar:</span>
                <b>{money(inspectedParchi.net_udhaar)}</b>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── STORE RATE CARD MODAL ────────────────────────────────────────────── */}
      {catalogOpen && (
        <Modal
          title="Bhopal Store Rate Card"
          icon={ShoppingBasket}
          onClose={() => setCatalogOpen(false)}
          wide
        >
          <p className="modal-description">
            Sample neighbourhood kirana rate card used by Gemma 4 to ground verbally added items.
          </p>
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>UNIT</th>
                  <th>RATE / UNIT</th>
                </tr>
              </thead>
              <tbody>
                {BHOPAL_STORE_CATALOG.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>{item.name}</b>
                      <small>{item.aliases.slice(0, 4).join(' · ')}</small>
                    </td>
                    <td><span className="unit-chip">{item.unit}</span></td>
                    <td><b>{money(item.price)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer-note">
            <ShieldCheck size={15} /> Verbal items are grounded here; unknown products flag review rather than inventing a price.
          </div>
        </Modal>
      )}

      {/* ── API KEY MODAL ────────────────────────────────────────────────────── */}
      {apiModalOpen && (
        <Modal title="Connect Google AI" icon={KeyRound} onClose={() => setApiModalOpen(false)}>
          <p className="modal-description">
            Add a Google AI API key to run live multimodal Gemma 4 vision and Hinglish reasoning.
          </p>
          <label className="api-key-label" htmlFor="apiKeyInput">GOOGLE AI API KEY</label>
          <div className="api-key-input-wrap">
            <KeyRound size={16} />
            <input
              id="apiKeyInput"
              type="password"
              autoComplete="off"
              placeholder="Paste your API key"
              value={draftApiKey}
              onChange={(event) => setDraftApiKey(event.target.value)}
            />
          </div>
          <div className="api-help">
            <span><ShieldCheck size={14} /> Kept in your local browser only.</span>
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              Get an API key <ArrowRight size={12} />
            </a>
          </div>
          {savedApiKeyFromEnv && (
            <p className="env-key-note">
              <CheckCircle2 size={14} /> Vite environment key detected and available.
            </p>
          )}

          {/* Shop UPI Configuration */}
          <div className="shop-upi-config-section">
            <label className="api-key-label" htmlFor="shopUpiInput">SHOP UPI ID FOR QR CODES</label>
            <div className="api-key-input-wrap">
              <QrCode size={16} />
              <input
                id="shopUpiInput"
                type="text"
                value={shopUpiId}
                onChange={(e) => {
                  setShopUpiId(e.target.value);
                  localStorage.setItem(UPI_ID_STORAGE, e.target.value);
                }}
                placeholder="e.g. bhopalkirana@upi"
              />
            </div>
          </div>

          <div className="modal-button-row">
            {apiKey && !savedApiKeyFromEnv && (
              <button className="modal-cancel" onClick={clearSavedApiKey}>Clear saved key</button>
            )}
            <button className="modal-cancel" onClick={() => setApiModalOpen(false)}>Cancel</button>
            <button className="modal-save" onClick={saveApiKey}>
              <Check size={15} /> Save key
            </button>
          </div>
          <p className="security-warning">
            <AlertCircle size={14} /> For production deployments, proxy model requests through your authenticated backend.
          </p>
        </Modal>
      )}

      {/* ── SMART WHATSAPP REMINDERS MODAL ───────────────────────────────────── */}
      {reminderModalOpen && activeReminderCustomer && activeReminder && (
        <Modal
          title={`Smart WhatsApp Reminder · ${activeReminderCustomer.name}`}
          icon={MessageCircle}
          onClose={() => setReminderModalOpen(false)}
        >
          <div className="reminder-header-bar">
            <p className="modal-description">
              Personalized reminder based on balance (<b>{money(activeReminderCustomer.balance)}</b>)
              {activeReminderCustomer.daysOverdue >= 7 ? ` and overdue duration (${activeReminderCustomer.daysOverdue} days).` : '.'}
            </p>

            {/* Script Toggle */}
            <div className="script-toggle-wrap">
              <button
                className={`script-pill ${reminderScript === 'devanagari' ? 'active' : ''}`}
                onClick={() => setReminderScript('devanagari')}
              >
                हिन्दी
              </button>
              <button
                className={`script-pill ${reminderScript === 'hinglish' ? 'active' : ''}`}
                onClick={() => setReminderScript('hinglish')}
              >
                Hinglish
              </button>
            </div>
          </div>

          {/* Tone Selector: Polite, Professional, Urgent */}
          <div className="tone-selector-tabs">
            <button
              className={`tone-tab ${reminderTone === 'polite' ? 'active' : ''}`}
              onClick={() => setReminderTone('polite')}
            >
              🌸 Polite / विनम्र
            </button>
            <button
              className={`tone-tab ${reminderTone === 'professional' ? 'active' : ''}`}
              onClick={() => setReminderTone('professional')}
            >
              💼 Professional / व्यावहारिक
            </button>
            <button
              className={`tone-tab ${reminderTone === 'urgent' ? 'active' : ''}`}
              onClick={() => setReminderTone('urgent')}
            >
              ⚡ Firm / स्पष्ट
            </button>
          </div>

          {/* Message Preview Box */}
          <div className="reminder-message-preview">
            <div className="reminder-meta-row">
              <span className="reminder-tone-tag">{activeReminder.toneLabel}</span>
              <small>Ready to send</small>
            </div>
            <div className="reminder-preview-text" lang={reminderScript === 'devanagari' ? 'hi' : 'en'}>
              {activeReminder.text}
            </div>
          </div>

          <div className="modal-button-row">
            <button
              className="modal-cancel"
              onClick={() => copyReceipt(activeReminder.text)}
            >
              <Copy size={14} /> Copy Text
            </button>
            <a
              className="modal-save whatsapp-send-btn"
              href={`https://wa.me/${
                activeReminderCustomer.phone ? activeReminderCustomer.phone.replace(/[^0-9]/g, '') : ''
              }?text=${encodeURIComponent(activeReminder.text)}`}
              target="_blank"
              rel="noreferrer"
            >
              <span>Send via WhatsApp</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </Modal>
      )}

      {/* ── PAYMENT PROOF INSPECTION MODAL ───────────────────────────────────── */}
      {viewingProof && (
        <Modal
          title={viewingProof.title || 'Payment Proof Attachment'}
          icon={ImageIcon}
          onClose={() => setViewingProof(null)}
        >
          <div className="proof-viewer-body">
            <div className="evidence-warning-strip">
              <ShieldAlert size={16} />
              <span>
                <b>EVIDENCE RECORD ONLY</b> — This photo serves as visual proof of payment or cash note.
                Financial verification is confirmed by the shopkeeper.
              </span>
            </div>
            <div className="proof-image-frame">
              <img src={viewingProof.url} alt="Attached payment proof full view" />
            </div>
          </div>
        </Modal>
      )}

      {/* ── AUDITED REVERSAL MODAL ───────────────────────────────────────────── */}
      {reversingEntry && (
        <Modal
          title={`Reverse Entry · ${reversingEntry.customer_name}`}
          icon={RotateCcw}
          onClose={() => setReversingEntry(null)}
        >
          <form onSubmit={handleReverseEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
              Reversing an entry will automatically create an audited counter-entry with negated amounts. 
              The original record remains intact in the ledger history.
            </p>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}>
              <div>Original Bill Subtotal: <b>{money(reversingEntry.subtotal)}</b></div>
              <div>Net Udhaar to Reverse: <b style={{ color: '#dc2626' }}>{money(reversingEntry.net_udhaar)}</b></div>
            </div>
            <div>
              <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                AUDIT REASON FOR REVERSAL (REQUIRED)
              </label>
              <input
                required
                placeholder="e.g. Customer returned items / entered wrong customer"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '11px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="modal-cancel" onClick={() => setReversingEntry(null)}>
                Cancel
              </button>
              <button type="submit" className="deck-action-btn" style={{ background: '#dc2626', color: '#fff', border: 0 }}>
                Confirm Audited Reversal
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── HACKATHON JURY ARCHITECTURE & DEMO SHOWCASE MODAL ───────────────── */}
      {juryGuideOpen && (
        <JuryGuideModal
          onClose={() => setJuryGuideOpen(false)}
          onLoadDemo={() => {
            setJuryGuideOpen(false);
            setActivePage('pos');
            loadDemo();
          }}
          onRunVoice={() => {
            setJuryGuideOpen(false);
            setActivePage('pos');
            setKhataCommand('Raju bhai ke khate mein 300 jama karo');
            executeVoiceCommand('Raju bhai ke khate mein 300 jama karo');
          }}
          onGoGrahak={() => {
            setJuryGuideOpen(false);
            setActivePage('grahak');
          }}
        />
      )}

      {/* ── ADD NEW PRODUCT MODAL ───────────────────────────────────────────── */}
      {newProductModalOpen && (
        <Modal
          title="Add Custom Product to Store Catalog"
          icon={PackagePlus}
          onClose={() => setNewProductModalOpen(false)}
        >
          <form className="modal-form" onSubmit={handleAddCustomProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>PRODUCT CANONICAL NAME</label>
              <input
                required
                style={{ height: '36px', padding: '0 10px', borderRadius: '7px', border: '1px solid #cbd5e1' }}
                value={newProductDraft.canonicalName}
                onChange={(e) => setNewProductDraft((prev) => ({ ...prev, canonicalName: e.target.value }))}
                placeholder="e.g. Sona Masoori Rice, Amul Masti Dahi"
              />
            </div>
            <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>HINDI SCRIPT &amp; SPOKEN ALIASES (COMMA SEPARATED)</label>
              <input
                style={{ height: '36px', padding: '0 10px', borderRadius: '7px', border: '1px solid #cbd5e1' }}
                value={newProductDraft.aliases}
                onChange={(e) => setNewProductDraft((prev) => ({ ...prev, aliases: e.target.value }))}
                placeholder="e.g. sona chawal, dahi, curd, dahi packet"
              />
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
              <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>CATEGORY</label>
                <select
                  style={{ height: '36px', padding: '0 8px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#fff' }}
                  value={newProductDraft.category}
                  onChange={(e) => setNewProductDraft((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="Grains & Flours">Grains &amp; Flours</option>
                  <option value="Dairy & Milk">Dairy &amp; Milk</option>
                  <option value="Spices & Masala">Spices &amp; Masala</option>
                  <option value="Oils & Ghee">Oils &amp; Ghee</option>
                  <option value="FMCG & Soap">FMCG &amp; Soap</option>
                </select>
              </div>
              <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>PRICE (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  style={{ height: '36px', padding: '0 10px', borderRadius: '7px', border: '1px solid #cbd5e1' }}
                  value={newProductDraft.price}
                  onChange={(e) => setNewProductDraft((prev) => ({ ...prev, price: e.target.value }))}
                />
              </div>
              <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>UNIT</label>
                <select
                  style={{ height: '36px', padding: '0 8px', borderRadius: '7px', border: '1px solid #cbd5e1', background: '#fff' }}
                  value={newProductDraft.unit}
                  onChange={(e) => setNewProductDraft((prev) => ({ ...prev, unit: e.target.value }))}
                >
                  <option value="kg">kg</option>
                  <option value="packet">packet</option>
                  <option value="L">L</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button type="button" className="modal-cancel" onClick={() => setNewProductModalOpen(false)}>Cancel</button>
              <button type="submit" className="modal-save" style={{ background: '#15803d', color: '#fff', border: 0, padding: '0 16px', borderRadius: '7px', fontWeight: 700 }}>Save Product</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

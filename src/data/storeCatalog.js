export const BHOPAL_STORE_CATALOG = [
  {
    id: 'amul-gold-milk',
    aliases: ['amul gold', 'amul doodh', 'doodh', 'milk'],
    name: 'Amul Gold Milk (500ml)',
    unit: 'pkt',
    price: 34,
  },
  {
    id: 'amul-taaza-milk',
    aliases: ['amul taaza', 'taaza doodh', 'amul taaza milk', 'taaza'],
    name: 'Amul Taaza Milk (500ml)',
    unit: 'pkt',
    price: 28,
  },
  {
    id: 'lux-soap',
    aliases: ['lux', 'sabun', 'soap', 'lux sabun'],
    name: 'Lux Bath Soap (100g)',
    unit: 'pcs',
    price: 20,
  },
  {
    id: 'rin-bar',
    aliases: ['rin', 'rin bar', 'detergent bar', 'kapde dhone ka sabun'],
    name: 'Rin Detergent Bar',
    unit: 'pcs',
    price: 15,
  },
  {
    id: 'mp-sharbati-aata',
    aliases: ['aata', 'atta', 'gehun ka aata', 'sharbati aata', 'chakki aata'],
    name: 'MP Sharbati Chakki Aata',
    unit: 'kg',
    price: 42,
  },
  {
    id: 'indori-poha',
    aliases: ['poha', 'indori poha', 'thick poha', 'chivda poha'],
    name: 'Indori Thick Poha',
    unit: 'kg',
    price: 55,
  },
  {
    id: 'sugar',
    aliases: ['shakkar', 'chini', 'sugar', 'cheeni'],
    name: 'Refined Sugar / Shakkar',
    unit: 'kg',
    price: 44,
  },
  {
    id: 'red-label-tea',
    aliases: ['red label', 'chai patti', 'tea', 'brooke bond', 'red label chai'],
    name: 'Brooke Bond Red Label Tea (250g)',
    unit: 'pkt',
    price: 140,
  },
  {
    id: 'maggi',
    aliases: ['maggi', 'noodles', 'maggi noodles'],
    name: 'Maggi Masala Noodles',
    unit: 'pkt',
    price: 14,
  },
  {
    id: 'parle-g',
    aliases: ['parle g', 'parle-g', 'biscuit', 'biscuits', 'parle biscuit'],
    name: 'Parle-G Biscuit',
    unit: 'pkt',
    price: 10,
  },
  {
    id: 'toor-dal',
    aliases: ['toor dal', 'arhar dal', 'tuvar dal', 'dal'],
    name: 'Toor Dal',
    unit: 'kg',
    price: 140,
  },
  {
    id: 'soyabean-oil',
    aliases: ['soyabean tel', 'soybean tel', 'soyabean oil', 'soybean oil', 'cooking oil', 'tel'],
    name: 'Soyabean Cooking Oil',
    unit: 'L',
    price: 130,
  },
];

const normalize = (value = '') => String(value)
  .toLocaleLowerCase('en-IN')
  .normalize('NFKD')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

function editDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function tokenScore(query, candidate) {
  const q = normalize(query);
  const c = normalize(candidate);
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 82;
  const qWords = new Set(q.split(/\s+/).filter(Boolean));
  const cWords = new Set(c.split(/\s+/).filter(Boolean));
  const overlap = [...qWords].filter((word) => cWords.has(word)).length;
  const fuzzyMatches = [...qWords].filter((word) => [...cWords].some((candidateWord) => {
    const permittedDistance = word.length >= 6 ? 2 : 1;
    return word.length >= 4 && Math.abs(word.length - candidateWord.length) <= permittedDistance
      && editDistance(word, candidateWord) <= permittedDistance;
  })).length;
  if (!overlap && !fuzzyMatches) return 0;
  return Math.round(((overlap + fuzzyMatches) / Math.max(qWords.size, cWords.size)) * 75);
}

export function searchStoreCatalog(queries = []) {
  return queries.map((query) => {
    let bestItem = null;
    let bestScore = 0;
    for (const item of BHOPAL_STORE_CATALOG) {
      for (const candidate of [item.name, ...item.aliases]) {
        const score = tokenScore(query, candidate);
        if (score > bestScore) {
          bestItem = item;
          bestScore = score;
        }
      }
    }

    const found = Boolean(bestItem && bestScore >= 45);
    return {
      searched_term: String(query),
      found,
      canonical_name: found ? bestItem.name : null,
      unit: found ? bestItem.unit : null,
      unit_price_inr: found ? bestItem.price : null,
    };
  });
}

export function generateDemoParchiDataUrl() {
  if (typeof document === 'undefined') {
    throw new Error('Demo parchi generation requires a browser canvas.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not initialize the demo canvas.');

  ctx.fillStyle = '#f6e4a6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A subtle paper grain keeps the demo from looking like a flat digital card.
  let seed = 240126;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(120,91,35,0.035)' : 'rgba(255,255,255,0.11)';
    ctx.fillRect(random() * canvas.width, random() * canvas.height, 1 + random() * 2, 1 + random() * 2);
  }

  ctx.strokeStyle = 'rgba(81,137,180,0.32)';
  ctx.lineWidth = 1;
  for (let y = 58; y < canvas.height; y += 39) {
    ctx.beginPath();
    ctx.moveTo(26, y);
    ctx.lineTo(canvas.width - 22, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(181,48,42,0.78)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(82, 20);
  ctx.lineTo(82, canvas.height - 24);
  ctx.stroke();

  // Slightly uneven blue ink and handwritten type mimic a shopkeeper's hurried parchi.
  ctx.fillStyle = '#173d72';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(0.4, -0.3);
  ctx.font = 'italic 27px "Segoe Print", "Bradley Hand", cursive';
  ctx.fillText('Raju Bhai (Bittan Market)', 108, 28);
  ctx.font = 'italic 19px "Segoe Print", "Bradley Hand", cursive';
  ctx.fillText('Date: 24/10/26 | Udhaar Parchi', 108, 68);
  ctx.font = 'italic 22px "Segoe Print", "Bradley Hand", cursive';
  ctx.fillText('1. Basmati Chawal - 5 kg @ 60/kg', 108, 145);
  ctx.fillText('2. Toor Dal       - 2 kg @ 140/kg', 108, 204);
  ctx.fillText('3. Soyabean Tel   - 1 L  @ 130/L', 108, 263);
  ctx.fillText('4. Shakkar        - 2 kg @ 44/kg', 108, 322);
  ctx.font = 'italic 21px "Segoe Print", "Bradley Hand", cursive';
  ctx.fillText('Baaki khata mein likhna...', 108, 422);
  ctx.restore();

  // Small crease and soft edge shading add photographic texture.
  const edge = ctx.createLinearGradient(0, 0, canvas.width, 0);
  edge.addColorStop(0, 'rgba(74,52,20,0.09)');
  edge.addColorStop(0.08, 'rgba(255,255,255,0)');
  edge.addColorStop(0.92, 'rgba(255,255,255,0)');
  edge.addColorStop(1, 'rgba(74,52,20,0.08)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

export const DEMO_SPOKEN_NOTE = 'Raju bhai ne chawal 5 kilo ki jagah 3 kilo hi liya, 2 packet Amul Gold doodh aur ek Lux sabun aur jodo, aur 300 rupaye abhi cash de diye.';

/**
 * Pre-seeded realistic customer accounts for Bhopal demo khata book.
 * Populates customer profiles, past timeline entries, and phone contacts.
 */
export const INITIAL_DEMO_CUSTOMERS = [
  {
    id: 'seed-bill-sunita',
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    customer_name: 'Sunita Tai (Arera Colony)',
    phone: '+91 94250 88123',
    subtotal: 540,
    cash_paid_now: 0,
    net_udhaar: 540,
    currency: 'INR',
    entryKind: 'bill',
    status: 'overdue',
    items: [
      { item_name: 'MP Sharbati Chakki Aata', slip_qty: 10, final_qty: 10, unit: 'kg', unit_price: 42, line_total: 420, source_status: 'from_slip' },
      { item_name: 'Brooke Bond Red Label Tea (250g)', slip_qty: 1, final_qty: 1, unit: 'pkt', unit_price: 140, line_total: 140, source_status: 'from_slip' },
    ],
    whatsappReceipt: 'नमस्ते सुनीता ताई जी, आपका कुल किराना बिल ₹540 है। बाकी उधार ₹540 है। धन्यवाद!',
  },
  {
    id: 'seed-payment-mohan',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    customer_name: 'Mohan Ji (New Market)',
    phone: '+91 97550 33901',
    subtotal: 0,
    cash_paid_now: 450,
    net_udhaar: -450,
    currency: 'INR',
    entryKind: 'payment',
    status: 'settled',
    items: [],
    whatsappReceipt: 'नमस्ते मोहन जी, ₹450 का भुगतान प्राप्त हुआ। खाता चुकता हुआ। धन्यवाद!',
  },
  {
    id: 'seed-bill-mohan',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    customer_name: 'Mohan Ji (New Market)',
    phone: '+91 97550 33901',
    subtotal: 450,
    cash_paid_now: 0,
    net_udhaar: 450,
    currency: 'INR',
    entryKind: 'bill',
    status: 'settled',
    items: [
      { item_name: 'Toor Dal', slip_qty: 2, final_qty: 2, unit: 'kg', unit_price: 140, line_total: 280, source_status: 'from_slip' },
      { item_name: 'Soyabean Cooking Oil', slip_qty: 1, final_qty: 1, unit: 'L', unit_price: 130, line_total: 130, source_status: 'from_slip' },
      { item_name: 'Parle-G Biscuit', slip_qty: 4, final_qty: 4, unit: 'pkt', unit_price: 10, line_total: 40, source_status: 'from_slip' },
    ],
    whatsappReceipt: 'नमस्ते मोहन जी, आपका कुल बिल ₹450 है। बाकी उधार ₹450 है। धन्यवाद!',
  },
];

/**
 * Lightweight Web Audio tactile sound effects inspired by Twodo.
 * Zero external audio assets, works purely in browser with oscillators.
 */
export function playCashRegisterSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now);
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.32);
  } catch { /* audio optional */ }
}

export function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch { /* audio optional */ }
}

export function playMicBeep(type = 'start') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(type === 'start' ? 440 : 330, now);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch { /* audio optional */ }
}

/**
 * Digital Soundbox for Indian counter audio announcements.
 * Emulates Paytm / PhonePe hardware soundbox using native SpeechSynthesis in Hindi (hi-IN).
 */
export function speakSoundbox(text, enabled = true) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices() || [];
    const hiVoice = voices.find((v) => (v.lang && v.lang.includes('hi')) || (v.name && v.name.includes('Hindi')));
    if (hiVoice) utterance.voice = hiVoice;

    window.speechSynthesis.speak(utterance);
  } catch { /* speech synthesis optional */ }
}

export function announceSoundbox({ text, soundboxEnabled = true, soundEnabled = true }) {
  if (!soundboxEnabled || !text) return;
  if (soundEnabled) {
    playCashRegisterSound();
  }
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      speakSoundbox(text, soundboxEnabled);
    }, 220);
  }
}

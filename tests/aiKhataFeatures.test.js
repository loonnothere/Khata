import { describe, expect, it } from 'vitest';
import {
  calculateCustomerTrustScore,
  generateHinglishReceipt,
  generateSmartWhatsAppReminder,
  parseKhataVoiceCommand,
  runDeterministicLedgerMath,
} from '../src/services/gemmaAgent.js';

describe('AI Khata Book Intelligent Features', () => {
  it('detects dispute-risk overrides between handwritten slip and spoken voice', () => {
    const result = runDeterministicLedgerMath({
      customer_name: 'Raju Bhai (Bittan Market)',
      cash_paid_now: 300,
      items: [
        {
          item_name: 'Basmati Chawal',
          slip_qty: 5,
          final_qty: 3,
          unit: 'kg',
          unit_price: 60,
          source_status: 'modified_by_voice',
          modification_note: '5 kg reduced to 3 kg verbally',
        },
        {
          item_name: 'Amul Gold Milk (500ml)',
          slip_qty: 0,
          final_qty: 2,
          unit: 'pkt',
          unit_price: 34,
          source_status: 'added_by_voice',
          modification_note: 'Added via voice note',
        },
        {
          item_name: 'Rin Detergent Bar',
          slip_qty: 1,
          final_qty: 1,
          unit: 'pcs',
          unit_price: 15,
          source_status: 'removed_by_voice',
          modification_note: 'Removed by customer',
        },
      ],
    });

    expect(result.disputes.length).toBe(3);

    // 1. Quantity modification dispute
    const qtyDispute = result.disputes.find((d) => d.type === 'quantity_changed');
    expect(qtyDispute).toBeDefined();
    expect(qtyDispute.slip_qty).toBe(5);
    expect(qtyDispute.final_qty).toBe(3);
    expect(qtyDispute.diff).toBe(-2);

    // 2. Cancellation dispute
    const cancelDispute = result.disputes.find((d) => d.type === 'item_cancelled');
    expect(cancelDispute).toBeDefined();
    expect(cancelDispute.final_qty).toBe(0);

    // 3. Voice addition dispute
    const addDispute = result.disputes.find((d) => d.type === 'voice_addition');
    expect(addDispute).toBeDefined();
    expect(addDispute.final_qty).toBe(2);

    // Confidence scores
    expect(result.confidence.customer_name_confidence).toBeGreaterThanOrEqual(95);
    expect(result.confidence.needs_shopkeeper_review).toBe(true);
  });

  it('parses voice-first payment commands into structured khata ledger actions', () => {
    const profiles = [
      { key: 'raju bhai', name: 'Raju Bhai', balance: 500 },
      { key: 'sunita tai', name: 'Sunita Tai', balance: 540 },
    ];

    const parsed = parseKhataVoiceCommand({
      commandText: 'Raju bhai ke khate mein 300 jama karo',
      customerProfiles: profiles,
      register: [],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe('ADD_PAYMENT');
    expect(parsed.customer_name).toBe('Raju Bhai');
    expect(parsed.amount).toBe(300);
    expect(parsed.reply).toContain('₹300 payment saved for Raju Bhai.');
    expect(parsed.whatsappReceipt).toContain('₹300 का भुगतान');
  });

  it('parses voice balance queries and grounds the response in customer memory', () => {
    const profiles = [
      { key: 'suresh', name: 'Suresh Kumar', balance: 420 },
      { key: 'bittan market wale raju', name: 'Raju Bhai (Bittan Market)', balance: 268 },
    ];

    const parsed = parseKhataVoiceCommand({
      commandText: 'Suresh ka baki kitna hai?',
      customerProfiles: profiles,
      register: [],
    });

    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe('QUERY_BALANCE');
    expect(parsed.customer_name).toBe('Suresh Kumar');
    expect(parsed.balance).toBe(420);
    expect(parsed.reply).toContain('₹420.00 pending');
  });

  it('parses daily cash queries grounded in saved register entries', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const register = [
      { createdAt: `${todayStr}T10:00:00.000Z`, subtotal: 600, cash_paid_now: 300, net_udhaar: 300 },
      { createdAt: `${todayStr}T11:00:00.000Z`, subtotal: 0, cash_paid_now: 200, net_udhaar: -200 },
    ];
    const profiles = [
      { key: 'cust1', name: 'Cust 1', balance: 300 },
    ];

    const parsed = parseKhataVoiceCommand({
      commandText: 'Aaj kitna cash aaya?',
      customerProfiles: profiles,
      register,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe('QUERY_DAILY_STATS');
    expect(parsed.total_cash_today).toBe(500); // 300 + 200
    expect(parsed.pending_total).toBe(300);
    expect(parsed.reply).toContain('₹500');
  });

  it('generates respectful WhatsApp reminders in 3 customer relationship tones and scripts', () => {
    const polite = generateSmartWhatsAppReminder({
      customerName: 'Sunita Tai',
      balance: 540,
      daysOverdue: 8,
      tone: 'polite',
      script: 'devanagari',
    });
    expect(polite.text).toContain('Sunita Tai');
    expect(polite.text).toContain('₹540');
    expect(polite.text).toContain('आशा है आप सकुशल हैं');

    const hinglish = generateSmartWhatsAppReminder({
      customerName: 'Raju Bhai',
      balance: 268,
      daysOverdue: 2,
      tone: 'polite',
      script: 'hinglish',
    });
    expect(hinglish.text).toContain('Namaste Raju Bhai');
    expect(hinglish.text).toContain('Rs 268');
    expect(hinglish.text).toContain('Dhanyawad!');

    const urgent = generateSmartWhatsAppReminder({
      customerName: 'Sunita Tai',
      balance: 540,
      daysOverdue: 8,
      tone: 'urgent',
      script: 'devanagari',
    });
    expect(urgent.text).toContain('8 दिनों से');
    expect(urgent.text).toContain('लंबित');
  });

  it('calculates customer trust score, risk rating, and credit limit utilization', () => {
    // 1. Good customer
    const trusted = calculateCustomerTrustScore({
      balance: 450,
      entries: [
        { entryKind: 'bill', net_udhaar: 450 },
        { entryKind: 'payment', cash_paid_now: 450 },
      ],
      daysOverdue: 2,
      creditLimit: 2500,
    });
    expect(trusted.status).toBe('trusted');
    expect(trusted.badgeClass).toBe('trust-badge-good');
    expect(trusted.utilizationPercent).toBe(18); // 450 / 2500

    // 2. Limit exceeded customer
    const risky = calculateCustomerTrustScore({
      balance: 3200,
      entries: [{ entryKind: 'bill', net_udhaar: 3200 }],
      daysOverdue: 15,
      creditLimit: 2500,
    });
    expect(risky.status).toBe('limit_exceeded');
    expect(risky.badgeClass).toBe('trust-badge-risk');
    expect(risky.utilizationPercent).toBe(100);
  });

  it('generates Roman Hinglish receipts correctly', () => {
    const receipt = generateHinglishReceipt({
      customer_name: 'Ramesh Bhai',
      subtotal: 500,
      cash_paid_now: 100,
      net_udhaar: 400,
    });
    expect(receipt).toContain('Namaste Ramesh Bhai');
    expect(receipt).toContain('Kul Bill: Rs 500');
    expect(receipt).toContain('Cash Prapt: Rs 100');
    expect(receipt).toContain('Net Baki Udhaar: Rs 400');
  });
});

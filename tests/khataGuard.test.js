import { describe, expect, it } from 'vitest';
import {
  computeDailyClosingReconciliation,
  createImmutableAuditRecord,
  detectDuplicateBill,
  evaluateUdhaarDecision,
  matchCustomerByPhoneOrAlias,
  normalizePhoneNumber,
} from '../src/services/gemmaAgent.js';

describe('KhataGuard Trust & Deterministic Safety Engine', () => {
  it('normalizes Indian mobile numbers correctly', () => {
    expect(normalizePhoneNumber('+91 98260 12345')).toBe('9826012345');
    expect(normalizePhoneNumber('91-98260-12345')).toBe('9826012345');
    expect(normalizePhoneNumber('09826012345')).toBe('9826012345');
    expect(normalizePhoneNumber('9826012345')).toBe('9826012345');
    expect(normalizePhoneNumber('12345')).toBe('');
    expect(normalizePhoneNumber(null)).toBe('');
  });

  it('matches customers by normalized phone and alias variations', () => {
    const customers = [
      { key: 'raju bhai', name: 'Raju Bhai (Bittan Market)', phone: '+91 98260 11223' },
      { key: 'sunita tai', name: 'Sunita Tai', phone: '098260 44556' },
      { key: 'suresh', name: 'Suresh Kumar', phone: '98260 77889' },
    ];

    // Phone match
    expect(matchCustomerByPhoneOrAlias('9826011223', customers)?.name).toContain('Raju Bhai');
    expect(matchCustomerByPhoneOrAlias('+91-98260-44556', customers)?.name).toBe('Sunita Tai');

    // Alias & honorific match
    expect(matchCustomerByPhoneOrAlias('Raju', customers)?.name).toContain('Raju');
    expect(matchCustomerByPhoneOrAlias('Suresh seth', customers)?.name).toContain('Suresh');
  });

  it('detects duplicate bills created within 15 minutes for the same customer', () => {
    const now = Date.now();
    const register = [
      {
        id: 'bill-1',
        createdAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 mins ago
        customer_name: 'Raju Bhai',
        phone: '98260 11223',
        subtotal: 540,
        net_udhaar: 540,
        entryKind: 'bill',
      },
    ];

    // 1. Suspected duplicate
    const check1 = detectDuplicateBill({
      customerName: 'Raju Bhai',
      phone: '+91 98260 11223',
      subtotal: 540,
      register,
      referenceTime: now,
    });
    expect(check1.isDuplicate).toBe(true);
    expect(check1.reason).toContain('Likely duplicate');

    // 2. Different amount -> Not duplicate
    const check2 = detectDuplicateBill({
      customerName: 'Raju Bhai',
      phone: '98260 11223',
      subtotal: 120,
      register,
      referenceTime: now,
    });
    expect(check2.isDuplicate).toBe(false);

    // 3. Different customer -> Not duplicate
    const check3 = detectDuplicateBill({
      customerName: 'Sunita Tai',
      phone: '98260 44556',
      subtotal: 540,
      register,
      referenceTime: now,
    });
    expect(check3.isDuplicate).toBe(false);
  });

  it('evaluates "Should I give udhaar?" decisions deterministically', () => {
    // 1. Critical overdue (>14d) -> Collect first
    const decision1 = evaluateUdhaarDecision({
      customer: { name: 'Mohan Lal', balance: 1400, daysOverdue: 16 },
      newUdhaarAmount: 300,
      creditLimit: 2500,
    });
    expect(decision1.decision).toBe('COLLECT_FIRST');
    expect(decision1.recommendation).toBe('Collect payment first');
    expect(decision1.hindiRecommendation).toBe('पहले पिछला उधार वसूलें');
    expect(decision1.badgeClass).toBe('decision-collect-first');

    // 2. Limit breach -> Collect first
    const decision2 = evaluateUdhaarDecision({
      customer: { name: 'Raju', balance: 2400, daysOverdue: 3 },
      newUdhaarAmount: 250,
      creditLimit: 2500,
    });
    expect(decision2.decision).toBe('COLLECT_FIRST');
    expect(decision2.projectedBalance).toBe(2650);

    // 3. Moderate overdue (>=7d) -> Confirm with customer
    const decision3 = evaluateUdhaarDecision({
      customer: { name: 'Sunita Tai', balance: 800, daysOverdue: 9 },
      newUdhaarAmount: 200,
      creditLimit: 2500,
    });
    expect(decision3.decision).toBe('ALLOW_WITH_CONFIRMATION');
    expect(decision3.recommendation).toBe('Allow with confirmation');

    // 4. Safe customer -> Allow
    const decision4 = evaluateUdhaarDecision({
      customer: { name: 'Ramesh', balance: 200, daysOverdue: 1 },
      newUdhaarAmount: 150,
      creditLimit: 2500,
    });
    expect(decision4.decision).toBe('ALLOW');
    expect(decision4.recommendation).toBe('Allow udhaar');
  });

  it('computes daily closing reconciliation for cash drawer balances and discrepancies', () => {
    const today = new Date().toISOString().slice(0, 10);
    const register = [
      {
        createdAt: `${today}T10:00:00.000Z`,
        entryKind: 'bill',
        subtotal: 500,
        cash_paid_now: 300, // Cash in
        net_udhaar: 200,
      },
      {
        createdAt: `${today}T12:00:00.000Z`,
        entryKind: 'payment',
        cash_paid_now: 200, // Cash payment collected
        net_udhaar: -200,
      },
      {
        createdAt: `${today}T14:00:00.000Z`,
        entryKind: 'bill',
        subtotal: 400,
        cash_paid_now: 400,
        paymentMethod: 'upi', // UPI received (not in drawer cash)
        net_udhaar: 0,
      },
    ];

    // Opening 1000, Total Cash in Hand = 300 + 200 = 500, Expenses = 100
    // Expected drawer cash = 1000 + 500 - 100 = 1400
    const recon1 = computeDailyClosingReconciliation({
      openingCash: 1000,
      register,
      expenses: 100,
      actualCash: 1400,
      dateStr: today,
    });

    expect(recon1.expectedCashInDrawer).toBe(1400);
    expect(recon1.totalCashCollected).toBe(500);
    expect(recon1.upiReceived).toBe(400);
    expect(recon1.mismatch).toBe(0);
    expect(recon1.status).toBe('BALANCED');

    // Shortage test: Actual cash is 1350 (-50 shortage)
    const recon2 = computeDailyClosingReconciliation({
      openingCash: 1000,
      register,
      expenses: 100,
      actualCash: 1350,
      dateStr: today,
    });
    expect(recon2.mismatch).toBe(-50);
    expect(recon2.status).toBe('SHORTAGE');
  });

  it('generates immutable audit records with unique IDs and timestamps', () => {
    const audit = createImmutableAuditRecord({
      cashierName: 'Ramesh Gupta',
      counterId: 'Counter 1',
      action: 'ENTRY_APPROVED',
      reviewDecision: 'APPROVED',
      reason: 'Shopkeeper confirmed line items match slip',
      metadata: { billId: 'bill-101', subtotal: 340 },
    });

    expect(audit.auditId).toMatch(/^AUD-\d+-[A-Z0-9]+$/);
    expect(audit.timestamp).toBeDefined();
    expect(audit.cashierName).toBe('Ramesh Gupta');
    expect(audit.reviewDecision).toBe('APPROVED');
  });
});

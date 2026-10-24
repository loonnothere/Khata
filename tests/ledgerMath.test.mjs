import { test } from 'vitest';
import assert from 'node:assert/strict';
import { runDeterministicLedgerMath } from '../src/services/gemmaAgent.js';

test('ledger totals are calculated deterministically from reconciled quantities and trusted rates', () => {
  const ledger = runDeterministicLedgerMath({
    customer_name: 'Raju Bhai',
    cash_paid_now: 300,
    items: [
      { item_name: 'Basmati Chawal', slip_qty: 5, final_qty: 3, unit: 'kg', unit_price: 60, source_status: 'modified_by_voice', modification_note: '5 kg reduced to 3 kg' },
      { item_name: 'Amul Gold Milk (500ml)', slip_qty: 0, final_qty: 2, unit: 'pkt', unit_price: 34, source_status: 'added_by_voice', modification_note: 'Added by voice' },
      { item_name: 'Lux Bath Soap (100g)', slip_qty: 0, final_qty: 1, unit: 'pcs', unit_price: 20, source_status: 'added_by_voice', modification_note: 'Added by voice' },
    ],
  });
  assert.deepEqual(ledger.items.map((item) => item.line_total), [180, 68, 20]);
  assert.equal(ledger.subtotal, 268);
  assert.equal(ledger.cash_paid_now, 300);
  assert.equal(ledger.net_udhaar, -32);
  assert.equal(ledger.arithmetic_source, 'deterministic_javascript');
});

test('line totals round currency to two decimal places', () => {
  const ledger = runDeterministicLedgerMath({ cash_paid_now: 0, items: [
    { item_name: 'Test item', slip_qty: 1, final_qty: 0.333, unit: 'kg', unit_price: 10, source_status: 'from_slip', modification_note: '' },
  ] });
  assert.equal(ledger.items[0].line_total, 3.33);
  assert.equal(ledger.subtotal, 3.33);
});

test('voice-removed items retain their slip quantity for the diff but contribute zero to the bill', () => {
  const ledger = runDeterministicLedgerMath({ cash_paid_now: 0, items: [
    { item_name: 'Rin Detergent Bar', slip_qty: 2, final_qty: 2, unit: 'pcs', unit_price: 15, source_status: 'removed_by_voice', modification_note: 'Removed by customer' },
  ] });
  assert.equal(ledger.items[0].slip_qty, 2);
  assert.equal(ledger.items[0].final_qty, 0);
  assert.equal(ledger.items[0].line_total, 0);
  assert.equal(ledger.subtotal, 0);
});

test('zero values, missing prices, invalid quantities, and overpayment remain explicit and finite', () => {
  const ledger = runDeterministicLedgerMath({ cash_paid_now: 100, items: [
    { item_name: 'Unknown', slip_qty: 1, final_qty: 1, unit: 'pcs', source_status: 'added_by_voice' },
    { item_name: 'Broken quantity', slip_qty: 1, final_qty: 'not-a-number', unit: 'pcs', unit_price: 12, source_status: 'modified_by_voice' },
  ] });
  assert.equal(ledger.subtotal, 0);
  assert.equal(ledger.cash_paid_now, 100);
  assert.equal(ledger.net_udhaar, -100);
  assert.equal(ledger.items[0].line_total, 0);
  assert.deepEqual(ledger.issues.map((issue) => issue.code), ['missing_price', 'invalid_quantity']);
});

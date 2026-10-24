import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BHOPAL_STORE_CATALOG, DEMO_SPOKEN_NOTE, searchStoreCatalog } from '../src/data/storeCatalog.js';

test('Bhopal rate card contains the 12 required products', () => {
  assert.equal(BHOPAL_STORE_CATALOG.length, 12);
  assert.deepEqual(BHOPAL_STORE_CATALOG.map(({ name, unit, price }) => [name, unit, price]), [
    ['Amul Gold Milk (500ml)', 'pkt', 34], ['Amul Taaza Milk (500ml)', 'pkt', 28], ['Lux Bath Soap (100g)', 'pcs', 20], ['Rin Detergent Bar', 'pcs', 15],
    ['MP Sharbati Chakki Aata', 'kg', 42], ['Indori Thick Poha', 'kg', 55], ['Refined Sugar / Shakkar', 'kg', 44], ['Brooke Bond Red Label Tea (250g)', 'pkt', 140],
    ['Maggi Masala Noodles', 'pkt', 14], ['Parle-G Biscuit', 'pkt', 10], ['Toor Dal', 'kg', 140], ['Soyabean Cooking Oil', 'L', 130],
  ]);
  assert.deepEqual(BHOPAL_STORE_CATALOG[0].aliases, ['amul gold', 'amul doodh', 'doodh', 'milk']);
});

test('catalog lookup is case-insensitive and handles conservative Hinglish typos', () => {
  const [milk, gold, lux, soap, sugar, noodles] = searchStoreCatalog(['DOODH', 'AmUl GoLd', 'LUX', 'sabun', 'shakar', 'maggi noodls']);
  assert.deepEqual([milk.unit_price_inr, gold.unit_price_inr, lux.unit_price_inr, soap.unit_price_inr, sugar.unit_price_inr, noodles.unit_price_inr], [34, 34, 20, 20, 44, 14]);
});

test('catalog lookup resolves Hinglish aliases and returns unknown items without an invented price', () => {
  const results = searchStoreCatalog(['Amul Gold doodh', 'Lux sabun', 'an unknown item']);
  assert.deepEqual(results.map((item) => item.found), [true, true, false]);
  assert.equal(results[0].unit_price_inr, 34);
  assert.equal(results[1].unit_price_inr, 20);
  assert.equal(results[2].unit_price_inr, null);
});

test('demo spoken update matches the requested rush-hour scenario', () => {
  assert.match(DEMO_SPOKEN_NOTE, /5 kilo ki jagah 3 kilo/);
  assert.match(DEMO_SPOKEN_NOTE, /2 packet Amul Gold doodh/);
  assert.match(DEMO_SPOKEN_NOTE, /300 rupaye abhi cash de diye/);
});

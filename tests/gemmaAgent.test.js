import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();
const constructorArgs = [];

vi.mock('@google/genai', () => ({
  GoogleGenAI: class GoogleGenAI {
    constructor(args) { constructorArgs.push(args); this.models = { generateContent }; }
  },
  Type: { STRING: 'string', NUMBER: 'number', ARRAY: 'array', OBJECT: 'object' },
  ThinkingLevel: { HIGH: 'high' },
}));

const { runKiranaGemmaAgent } = await import('../src/services/gemmaAgent.js');

const calculatorArgs = {
  customer_name: 'Raju Bhai', cash_paid_now: 300,
  items: [{ item_name: 'Amul Gold Milk (500ml)', slip_qty: 0, final_qty: 2, unit: 'pkt', unit_price: 34, source_status: 'added_by_voice', modification_note: 'Voice addition' }],
};

describe('runKiranaGemmaAgent (mocked provider)', () => {
  beforeEach(() => {
    generateContent.mockReset();
    constructorArgs.length = 0;
  });

  it('keeps image-before-text ordering, preserves model content, and runs rate lookup before deterministic math', async () => {
    const originalToolTurn = { role: 'model', parts: [{ thought: true, text: 'Need a verified milk rate.' }, { functionCall: { id: 'rate-1', name: 'lookup_store_rate', args: { item_names: ['amul gold doodh'] } } }] };
    generateContent
      .mockResolvedValueOnce({ candidates: [{ content: originalToolTurn }] })
      .mockResolvedValueOnce({ candidates: [{ content: { role: 'model', parts: [{ functionCall: { id: 'math-1', name: 'calculate_ledger_balance', args: calculatorArgs } }] } }] })
      .mockResolvedValueOnce({ candidates: [{ content: { role: 'model', parts: [{ text: 'नमस्ते राजू जी, आपका कुल बिल ₹68 है।' }] } }], text: 'नमस्ते राजू जी, आपका कुल बिल ₹68 है।' });

    const result = await runKiranaGemmaAgent({ apiKey: 'not-logged', modelId: 'gemma-4-31b-it', imageBase64: 'abc123', mimeType: 'image/jpeg', spokenNote: '2 doodh aur jodo' });
    expect(constructorArgs).toEqual([{ apiKey: 'not-logged' }]);
    expect(generateContent.mock.calls[0][0].model).toBe('gemma-4-31b-it');
    expect(generateContent.mock.calls[0][0].contents[0].parts[0]).toEqual({ inlineData: { mimeType: 'image/jpeg', data: 'abc123' } });
    expect(generateContent.mock.calls[0][0].contents[0].parts[1].text).toContain('2 doodh aur jodo');
    expect(generateContent.mock.calls[0][0].config.tools[0].functionDeclarations.map((tool) => tool.name)).toEqual(['lookup_store_rate', 'calculate_ledger_balance']);
    expect(generateContent.mock.calls[1][0].contents[1]).toBe(originalToolTurn);
    expect(result.traceSteps.filter((step) => step.type === 'tool').map((step) => step.name)).toEqual(['lookup_store_rate', 'calculate_ledger_balance']);
    expect(result.ledger.subtotal).toBe(68);
    expect(result.whatsappReceipt).toContain('₹68');
    expect(JSON.stringify(result)).not.toContain('not-logged');
  });

  it('rejects a provider that never calls the deterministic calculator', async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { role: 'model', parts: [{ text: 'No tool call' }] } }], text: 'No tool call' });
    await expect(runKiranaGemmaAgent({ apiKey: 'private', imageBase64: 'x', spokenNote: 'update' })).rejects.toThrow(/deterministic ledger calculator/i);
  });
});

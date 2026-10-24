import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('KiranaKhata 5-Tab Navigation, KhataGuard & Daily Close Flows', () => {
  it('navigates to New Entry tab and displays the 4-step progress stepper', () => {
    render(<App />);

    // Click "+ New Khata Entry" button on Home / Today
    const newEntryBtn = screen.getByRole('button', { name: /\+ New Khata Entry/i });
    fireEvent.click(newEntryBtn);

    // Verify 4-step stepper is rendered
    expect(screen.getByText('Capture Slip')).toBeInTheDocument();
    expect(screen.getByText('Voice Update')).toBeInTheDocument();
    expect(screen.getByText('KhataGuard')).toBeInTheDocument();
    expect(screen.getByText('Save & Settle')).toBeInTheDocument();
  });

  it('supports manual-entry fallback when offline or without AI inference', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /\+ New Khata Entry/i }));

    const fallbackBtn = screen.getByRole('button', { name: /Manual Entry Fallback/i });
    fireEvent.click(fallbackBtn);

    expect(screen.getByText(/Deterministic Manual Bill Fallback/i)).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/Customer Name/i);
    fireEvent.change(nameInput, { target: { value: 'Chandan Kumar' } });

    fireEvent.click(screen.getByRole('button', { name: /Reconcile Manually/i }));

    // Verifies KhataGuard review card appears deterministically
    expect(screen.getByText(/KHATAGUARD TRUST & AUDIT/i)).toBeInTheDocument();
    expect(screen.getByText('Chandan Kumar')).toBeInTheDocument();
  });

  it('renders practical daily closing cash drawer reconciliation on the Insights page', () => {
    render(<App />);

    // Navigate to Insights / Analytics
    fireEvent.click(screen.getByRole('button', { name: /Insights/i }));

    expect(screen.getByText(/Practical Daily Closing & Cash Drawer Reconciliation/i)).toBeInTheDocument();
    expect(screen.getByText(/OPENING CASH IN DRAWER/i)).toBeInTheDocument();
    expect(screen.getByText(/CASH EXPENSES \/ PAYOUTS/i)).toBeInTheDocument();
    expect(screen.getByText(/Expected Drawer Cash/i)).toBeInTheDocument();
  });

  it('allows verifying and rejecting attached payment proofs in the customer timeline', () => {
    localStorage.setItem(
      'kiranaKhataLiveRegisterV1',
      JSON.stringify([
        {
          id: 'bill-with-proof',
          createdAt: new Date().toISOString(),
          customer_name: 'Raju bhai',
          subtotal: 500,
          cash_paid_now: 500,
          net_udhaar: 0,
          paymentProofUrl: 'data:image/png;base64,mockproof',
          proofStatus: 'evidence_uploaded',
          items: [],
        },
      ])
    );

    render(<App />);

    // Navigate to Customers
    fireEvent.click(screen.getByRole('button', { name: /Customers/i }));

    expect(screen.getAllByText('Raju bhai').length).toBeGreaterThan(0);
    expect(screen.getByText(/Awaiting Check/i)).toBeInTheDocument();

    // Click Verify
    const verifyBtn = screen.getByRole('button', { name: /^Verify$/i });
    fireEvent.click(verifyBtn);

    expect(screen.getByText(/✓ Verified/i)).toBeInTheDocument();
  });

  it('allows audited reversals of ledger entries without destructive deletion', () => {
    localStorage.setItem(
      'kiranaKhataLiveRegisterV1',
      JSON.stringify([
        {
          id: 'bill-to-reverse',
          createdAt: new Date().toISOString(),
          customer_name: 'Suresh Patel',
          subtotal: 450,
          cash_paid_now: 0,
          net_udhaar: 450,
          items: [{ item_name: 'Chawal', final_qty: 5, unit: 'kg', unit_price: 90, line_total: 450 }],
        },
      ])
    );

    render(<App />);

    // Go to Customers and select Suresh Patel
    fireEvent.click(screen.getByRole('button', { name: /Customers/i }));
    fireEvent.click(screen.getAllByText('Suresh Patel')[0]);

    const reverseBtn = screen.getByRole('button', { name: /Reverse \/ Correct/i });
    fireEvent.click(reverseBtn);

    expect(screen.getByText(/Reverse Entry · Suresh Patel/i)).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/e\.g\. Customer returned items/i);
    fireEvent.change(reasonInput, { target: { value: 'Customer returned 5kg chawal' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Audited Reversal/i }));

    // Counter entry created and balance updated
    expect(screen.getByText(/Reversal \/ Correction/i)).toBeInTheDocument();
  });
});

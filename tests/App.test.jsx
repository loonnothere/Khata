import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App.jsx';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('KiranaKhata Live UI', () => {
  it('mounts, changes the selected model, and loads a visible demo parchi', () => {
    render(<App />);
    const selector = screen.getByRole('combobox');
    fireEvent.change(selector, { target: { value: 'gemma-4-31b-it' } });
    expect(selector).toHaveValue('gemma-4-31b-it');

    fireEvent.click(screen.getByRole('button', { name: /Load Bhopal Demo Parchi/i }));
    expect(screen.getByAltText('Uploaded handwritten udhaar parchi preview')).toHaveAttribute('src', 'data:image/png;base64,demoparchi');
    expect(screen.getByLabelText('Spoken Hinglish update')).toHaveValue('Raju bhai ne chawal 5 kilo ki jagah 3 kilo hi liya, 2 packet Amul Gold doodh aur ek Lux sabun aur jodo, aur 300 rupaye abhi cash de diye.');
  });

  it('opens and closes the rate-card dialog with Escape', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Store Rate Card/i }));
    expect(screen.getByRole('dialog', { name: 'Bhopal Store Rate Card' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Bhopal Store Rate Card' })).not.toBeInTheDocument();
  });

  it('saves and clears a locally entered API key without exposing it in the page', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Set API Key/i }));
    fireEvent.change(screen.getByLabelText('GOOGLE AI API KEY'), { target: { value: 'test-key-only' } });
    fireEvent.click(screen.getByRole('button', { name: /Save key/i }));
    expect(localStorage.getItem('kiranaKhataLiveGeminiApiKey')).toBe('test-key-only');
    expect(screen.queryByText('test-key-only')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /API Key Set/i }));
    fireEvent.click(screen.getByRole('button', { name: /Clear saved key/i }));
    expect(localStorage.getItem('kiranaKhataLiveGeminiApiKey')).toBeNull();
  });

  it('shows the supported manual-entry speech fallback', () => {
    render(<App />);
    expect(screen.getByText(/does not support speech recognition/i)).toBeInTheDocument();
  });

  it('records a Hinglish payment command and updates the customer khata timeline', () => {
    localStorage.setItem('kiranaKhataLiveRegisterV1', JSON.stringify([{
      id: 'bill-1', createdAt: '2026-10-24T10:00:00.000Z', customer_name: 'Raju bhai', subtotal: 500,
      cash_paid_now: 0, net_udhaar: 500, items: [], whatsappReceipt: 'receipt',
    }]));
    render(<App />);
    fireEvent.change(screen.getByLabelText('Khata voice command'), { target: { value: 'Raju bhai ke khate mein 300 jama karo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run' }));
    expect(screen.getByText('₹300 payment saved for Raju bhai.')).toBeInTheDocument();
    expect(screen.getByText('Payment recorded')).toBeInTheDocument();
    expect(screen.getAllByText('₹200.00').length).toBeGreaterThan(0);
  });

  it('locks the POS counter to the Cashier Login Dashboard and unlocks via PIN keypad or demo sign-in', () => {
    render(<App />);
    const lockBtn = screen.getByRole('button', { name: /Lock Register Counter/i });
    fireEvent.click(lockBtn);

    expect(screen.getByText('BHOPAL MERCHANT CASHIER TERMINAL')).toBeInTheDocument();
    expect(screen.getByText(/ENTER 4-DIGIT CASHIER QUICK PIN/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    fireEvent.click(screen.getByRole('button', { name: /Unlock POS Counter/i }));

    expect(screen.getByText('SHIFT #1 ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load Bhopal Demo Parchi/i })).toBeInTheDocument();
  });

  it('navigates seamlessly across multiple pages: POS Cashier, Khata Ledger, Analytics, Store Rates, and Grahak Passbook', () => {
    render(<App />);
    
    // The current destination is announced accessibly, not only through colour.
    expect(screen.getByRole('button', { name: /Home \/ Today \(POS Cashier\)/i })).toHaveAttribute('aria-current', 'page');

    // 1. Analytics Page
    fireEvent.click(screen.getByRole('button', { name: /Analytics/i }));
    expect(screen.getByRole('button', { name: /Analytics/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Daily Cash & Khata Analytics')).toBeInTheDocument();
    expect(screen.getByText('GROSS CREDIT EXTENDED')).toBeInTheDocument();

    // 2. Store Inventory / Rates Page
    fireEvent.click(screen.getByRole('button', { name: /Store Rates/i }));
    expect(screen.getByText('Store Inventory & Catalog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Custom Item/i })).toBeInTheDocument();

    // 3. Grahak Passbook Page
    fireEvent.click(screen.getByRole('button', { name: /Grahak Passbook/i }));
    expect(screen.getByText(/OFFICIAL BHOPAL KIRANA SEAL/i)).toBeInTheDocument();
    expect(screen.getByText(/CURRENT OUTSTANDING BALANCE/i)).toBeInTheDocument();

    // 4. Return to POS Cashier
    fireEvent.click(screen.getByRole('button', { name: /POS Cashier/i }));
    expect(screen.getByText('SHIFT #1 ACTIVE')).toBeInTheDocument();
  });

  it('supports customer passbook phone login and opens Hackathon Jury Guide', () => {
    render(<App />);

    // 1. Open Jury Guide
    fireEvent.click(screen.getByRole('button', { name: /Jury Guide/i }));
    expect(screen.getByText(/Why KiranaKhata Live is a Hackathon Winner/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Why KiranaKhata Live is a Hackathon Winner/i)).not.toBeInTheDocument();

    // 2. Lock to login terminal & switch to Grahak mode
    fireEvent.click(screen.getByRole('button', { name: /Lock Register Counter/i }));
    fireEvent.click(screen.getByRole('button', { name: /Grahak Passbook/i }));
    expect(screen.getByText('VERIFIED DIGITAL KHATA ACCESS')).toBeInTheDocument();

    // 3. Login as Grahak
    fireEvent.click(screen.getByRole('button', { name: /Access My Udhaar Passbook/i }));
    expect(screen.getByText(/OFFICIAL BHOPAL KIRANA SEAL/i)).toBeInTheDocument();
  });
});

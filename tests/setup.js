import '@testing-library/jest-dom/vitest';

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => ({
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, save() {}, restore() {}, translate() {},
    createLinearGradient: () => ({ addColorStop() {} }),
  }),
});
Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  configurable: true,
  value: () => 'data:image/png;base64,demoparchi',
});

if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: () => {},
    cancel: () => {},
    pause: () => {},
    resume: () => {},
    getVoices: () => [],
  };
  global.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; }
  };
}

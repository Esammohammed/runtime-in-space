/**
 * NASA Flight Computer Text-To-Speech (TTS) Service
 * Sourced directly via Web Speech API (window.speechSynthesis)
 * Supports Bilingual Flight Operations: English and Arabic (العربية).
 * 100% Offline, Zero Latency, Spacecraft Flight Simulation Ready.
 */

function cleanSpeechText(markdownText) {
  if (!markdownText) return '';
  return markdownText
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove list markers
    .replace(/^[\s*•-]+\s+/gm, '')
    // Remove code blocks and inline code
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove citation badges like [Hypoxia.pdf (p.56)]
    .replace(/\[\s*📄?[^\]]+\]/g, '')
    // Replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    .trim();
}

let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

let activeUtterance = null;
let currentOnEnd = null;

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (currentOnEnd) {
    try {
      currentOnEnd();
    } catch {
      // Ignore cleanup error
    }
    currentOnEnd = null;
  }
  activeUtterance = null;
}

export function isSpeaking() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
}

export function speak(text, { onStart, onEnd, onError, rate = 1.02, pitch = 1.0 } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    onError?.(new Error('SpeechSynthesis not supported'));
    return;
  }

  // Cancel any prior speech
  stopSpeaking();

  const clean = cleanSpeechText(text);
  if (!clean) return;

  const isArabicText = /[\u0600-\u06FF]/.test(clean);
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.pitch = pitch;

  // Retrieve current available voices (with cache fallback)
  const voices =
    cachedVoices && cachedVoices.length > 0
      ? cachedVoices
      : window.speechSynthesis.getVoices();

  let selectedVoice = null;

  if (isArabicText) {
    utterance.lang = 'ar-EG';
    utterance.rate = 0.95; // Smooth, natural pacing for Arabic pronunciation
    selectedVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('ar') &&
          (v.name.includes('Natural') ||
            v.name.includes('Shakir') ||
            v.name.includes('Salma') ||
            v.name.includes('Hamed') ||
            v.name.includes('Zariyah') ||
            v.name.includes('Google') ||
            v.name.includes('Maged') ||
            v.name.includes('Hoda') ||
            v.name.includes('Naayf'))
      ) ||
      voices.find((v) => v.lang.startsWith('ar')) ||
      null;
  } else {
    utterance.lang = 'en-US';
    utterance.rate = rate; // 1.02: Natural, calm astronaut flight audio pace
    selectedVoice =
      voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Jenny') ||
            v.name.includes('Aria') ||
            v.name.includes('Google US English') ||
            v.name.includes('Samantha') ||
            v.name.includes('Zira') ||
            v.name.includes('David'))
      ) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] ||
      null;
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  currentOnEnd = onEnd;

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    currentOnEnd = null;
    activeUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    currentOnEnd = null;
    activeUtterance = null;
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      onError?.(e);
    } else {
      onEnd?.();
    }
  };

  activeUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

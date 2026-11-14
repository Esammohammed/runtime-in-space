/**
 * Service to manage active clinical findings (from Computer Vision, Emergency, or Chatbot)
 * mapped directly onto spatial body coordinates for the 3D Holographic Mannequin.
 */

export const CLINICAL_LOCATIONS = {
  right_hand: { id: 'right_hand', label: 'Right Hand / Forearm', pos: { x: 0.62, y: 0.22, z: 0.15 } },
  left_hand:  { id: 'left_hand',  label: 'Left Hand / Forearm',  pos: { x: -0.62, y: 0.22, z: 0.15 } },
  head:       { id: 'head',       label: 'Head & Face',          pos: { x: 0, y: 1.85, z: 0.32 } },
  torso:      { id: 'torso',      label: 'Chest & Torso',        pos: { x: 0, y: 1.12, z: 0.28 } },
  right_leg:  { id: 'right_leg',  label: 'Right Leg',            pos: { x: 0.22, y: -0.9, z: 0.2 } },
  left_leg:   { id: 'left_leg',   label: 'Left Leg',             pos: { x: -0.22, y: -0.9, z: 0.2 } },
};

const STORAGE_KEY_PREFIX = 'astro_clinical_findings_';
const EVENT_NAME = 'astro_clinical_findings_updated';

function getStorageKey(crewId) {
  return `${STORAGE_KEY_PREFIX}${crewId ?? 'default'}`;
}

/**
 * Get all active findings for a crew member.
 */
export function getFindings(crewId) {
  try {
    const raw = localStorage.getItem(getStorageKey(crewId));
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to read clinical findings:', err);
    return [];
  }
}

/**
 * Add or update a clinical finding.
 */
export function addFinding(crewId, finding) {
  try {
    const findings = getFindings(crewId);
    const existingIndex = findings.findIndex((f) => f.id === finding.id);
    const updatedFinding = {
      id: finding.id || `cf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      crewId: crewId ?? 'default',
      location: finding.location || 'right_hand',
      locationLabel: CLINICAL_LOCATIONS[finding.location]?.label || 'Right Hand / Forearm',
      title: finding.title || 'Clinical Finding',
      description: finding.description || '',
      next_step: finding.next_step || '',
      urgency: finding.urgency || 'show_officer',
      source: finding.source || 'Photo Check (Vision AI)',
      timestamp: finding.timestamp || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      findings[existingIndex] = updatedFinding;
    } else {
      // Put latest finding first
      findings.unshift(updatedFinding);
    }

    localStorage.setItem(getStorageKey(crewId), JSON.stringify(findings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { crewId, findings } }));
    return updatedFinding;
  } catch (err) {
    console.error('Failed to save clinical finding:', err);
    return null;
  }
}

/**
 * Remove a specific clinical finding.
 */
export function removeFinding(crewId, findingId) {
  try {
    const findings = getFindings(crewId).filter((f) => f.id !== findingId);
    localStorage.setItem(getStorageKey(crewId), JSON.stringify(findings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { crewId, findings } }));
    return findings;
  } catch (err) {
    console.error('Failed to remove clinical finding:', err);
    return [];
  }
}

/**
 * Clear all findings for a crew member.
 */
export function clearFindings(crewId) {
  try {
    localStorage.removeItem(getStorageKey(crewId));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { crewId, findings: [] } }));
  } catch (err) {
    console.error('Failed to clear clinical findings:', err);
  }
}

/**
 * Hook or helper to subscribe to finding changes.
 */
export function subscribeFindings(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

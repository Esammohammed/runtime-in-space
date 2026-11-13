import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProtocolRunner from '@/components/emergency/ProtocolRunner.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { useCrew } from '@/context/CrewContext.jsx';
import { PROTOCOLS } from '@/data/protocols.js';
import { createReport } from '@/services/crewService.js';
import { logEvent } from '@/services/eventsService.js';

function groupByCategory(protocols) {
  const groups = new Map();
  for (const protocol of protocols) {
    const category = protocol.category ?? 'General Emergencies';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(protocol);
  }
  return groups;
}

const IDLE_REPORT = { busy: false, report: null, error: null };

export default function EmergencyPage() {
  const { selectedId } = useCrew();
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [reportStatus, setReportStatus] = useState(IDLE_REPORT);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProtocols = useMemo(() => {
    if (!searchQuery.trim()) return PROTOCOLS;
    const q = searchQuery.toLowerCase();
    return PROTOCOLS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const categories = useMemo(() => groupByCategory(filteredProtocols), [filteredProtocols]);

  const start = (chosen) => {
    setActiveProtocol(chosen);
    setReportStatus(IDLE_REPORT);
    try {
      logEvent(selectedId, `Emergency protocol started: ${chosen.title}`, { protocol: chosen.id });
    } catch {
      // Offline fallback: never block emergency protocols
    }
  };

  const onStep = (step) => {
    try {
      logEvent(selectedId, `${step.text} → ${step.answer}`, step);
    } catch {
      // Never block steps
    }
  };

  const onGenerateReport = async () => {
    setReportStatus({ busy: true, report: null, error: null });
    try {
      const report = await createReport(selectedId);
      setReportStatus({ busy: false, report, error: null });
    } catch (error) {
      setReportStatus({ busy: false, report: null, error });
    }
  };

  return (
    <div className="emergency-page-container">
      {/* Top back navigation */}
      <div className="emergency-top-nav">
        <Link to="/" className="back-link">
          <Icon name="arrow-left" size={16} />
          <span>Exit Emergency Mode / Back to Dashboard</span>
        </Link>
      </div>

      {/* Emergency Header - High Visibility */}
      <header className="emergency-page-header">
        <div className="emergency-header-badge">
          <Icon name="emergency" size={32} color="#FFFFFF" />
        </div>
        <div className="emergency-header-text">
          <div className="emergency-badge-tag">OFFLINE AUTONOMOUS RESUSCITATION</div>
          <h1 className="emergency-title">Emergency Medical Protocols</h1>
          <p className="emergency-subtitle">
            Stand-alone clinical action trees designed for zero-g microgravity stabilization. Fully operational offline without Mission Control uplink.
          </p>
        </div>
      </header>

      {/* ACTIVE PROTOCOL SECTION (IF SELECTED) */}
      {activeProtocol && (
        <section className="active-protocol-section" aria-label="Active emergency protocol">
          <ProtocolRunner
            key={activeProtocol.id}
            protocol={activeProtocol}
            onStep={onStep}
            onExit={() => setActiveProtocol(null)}
            onGenerateReport={onGenerateReport}
            reportStatus={reportStatus}
          />
        </section>
      )}

      {/* ALL PROTOCOLS DIRECT GRID - ALWAYS VISIBLE, NEVER HIDDEN */}
      <section className="emergency-selection-zone">
        <div className="emergency-section-header-bar">
          <div className="emergency-alert-banner">
            <span className="emergency-pulse-dot" />
            <span className="emergency-banner-title">
              {activeProtocol
                ? 'Other Medical Emergency Protocols:'
                : 'Select Emergency Protocol to Begin Guidance:'}
            </span>
          </div>

          {/* Search bar */}
          <div className="emergency-search-bar">
            <Icon name="shield" size={16} color="var(--coral)" />
            <input
              type="text"
              placeholder="Search protocol (e.g. chest pain, bleeding, burn, consciousness)…"
              className="emergency-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn muted small"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Categories list */}
        <div className="protocol-categories-stack">
          {[...categories.entries()].map(([category, items]) => (
            <div key={category} className="protocol-category-block">
              <h2 className="protocol-category-title">{category}</h2>
              <div className="protocol-buttons-grid">
                {items.map((item) => {
                  const isCurrent = activeProtocol?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`protocol-trigger-btn ${isCurrent ? 'is-active-btn' : ''}`}
                      onClick={() => start(item)}
                    >
                      <span className="protocol-btn-icon">
                        <Icon name="emergency" size={20} color={isCurrent ? '#FFFFFF' : 'var(--coral)'} />
                      </span>
                      <div className="protocol-btn-info">
                        <strong className="protocol-btn-title">{item.title}</strong>
                        <span className="protocol-btn-action-text muted small">
                          {isCurrent ? 'Active Protocol' : 'Tap to start →'}
                        </span>
                      </div>
                      <Icon name="chevron-right" size={18} color="var(--coral)" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredProtocols.length === 0 && (
          <div className="no-protocols-card">
            <p className="muted">No protocols match your search.</p>
            <button
              type="button"
              className="button ghost mt-2"
              onClick={() => setSearchQuery('')}
            >
              Show all protocols
            </button>
          </div>
        )}

        <p className="emergency-offline-disclaimer muted small mt-4">
          All algorithms are compiled locally in the spacecraft core. No internet or ground telemetry connection is required.
        </p>
      </section>
    </div>
  );
}

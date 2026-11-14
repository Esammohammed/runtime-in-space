import React from 'react';

function parseBoldNodes(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="report-strong-highlight">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function FormattedReport({ text, isStreaming = false }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="report-bullet-list">
          {currentList.map((item, idx) => (
            <li
              key={idx}
              className={`report-bullet-item ${item.isSub ? 'report-bullet-subitem' : ''}`}
            >
              {parseBoldNodes(item.text)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    // Check if line is a header like **Section Title** or # Title
    const boldHeader = line.match(/^\*\*([^*]+)\*\*$/);
    const hashHeader = line.match(/^#{1,4}\s+(.+)$/);
    if (boldHeader || hashHeader) {
      flushList();
      const title = (boldHeader ? boldHeader[1] : hashHeader[1]).trim();
      const isDocTitle = /report\s+for\s+flight\s+surgeons|claim\s+report|status\s+report/i.test(title);
      if (isDocTitle) {
        elements.push(
          <div key={`h-${idx}`} className="report-doc-banner">
            <span className="report-doc-badge">CLINICAL PACKET</span>
            <h4 className="report-doc-title">{title}</h4>
          </div>
        );
      } else {
        elements.push(
          <div key={`h-${idx}`} className="report-section-header">
            <span className="report-section-bar" />
            <h4 className="report-section-title">{title}</h4>
          </div>
        );
      }
      return;
    }

    // Check bullet list items (- or * or •) with potential indentation
    const bulletMatch = rawLine.match(/^(\s*)[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const isSub = bulletMatch[1].length >= 2;
      currentList.push({ text: bulletMatch[2], isSub });
      return;
    }

    // Check numbered items (e.g. 1. Question...)
    const numMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num-${idx}`} className="report-question-item">
          <span className="report-question-badge">{numMatch[1]}</span>
          <p className="report-question-text">{parseBoldNodes(numMatch[2])}</p>
        </div>
      );
      return;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="report-paragraph">
        {parseBoldNodes(line)}
      </p>
    );
  });

  flushList();

  return (
    <div className="report-formatted-body">
      {elements}
      {isStreaming && <span className="typing-cursor">▊</span>}
    </div>
  );
}

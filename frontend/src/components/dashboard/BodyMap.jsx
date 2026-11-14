import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import Card from '@/components/common/Card.jsx';
import StatusBadge from '@/components/common/StatusBadge.jsx';
import { Icon } from '@/components/common/Icons.jsx';
import { BODY_AREAS, statusOf } from '@/constants/status.js';

// Status color palette for 3D markers
const STATUS_COLORS = {
  green: 0x48b486,
  yellow: 0xd69e4e,
  red: 0xcf5c68,
  none: 0x7b93a9,
  // Clinical Urgency Palette
  watch: 0x4eaab9,
  show_officer: 0xd69e4e,
  alert_ground: 0xcf5c68,
};

// 3D coordinates for hotspots on the mannequin model
const ANATOMICAL_POSITIONS = {
  // Core Systemic Vitals
  head: { x: 0, y: 1.84, z: 0.30, type: 'vital', label: 'Head and mind' },
  heart: { x: -0.09, y: 1.15, z: 0.28, type: 'vital', label: 'Heart and vessels' },
  lungs: { x: 0.09, y: 1.25, z: 0.26, type: 'vital', label: 'Lungs' },
  metabolism: { x: 0, y: 0.65, z: 0.28, type: 'vital', label: 'Metabolism' },
  body: { x: 0, y: 0.08, z: 0.25, type: 'vital', label: 'Whole body' },
  // Clinical / Extremities (Dynamic AI Vision Hotspots)
  right_hand: { x: 0.60, y: 0.22, z: 0.18, type: 'clinical', label: 'Right Hand / Forearm' },
  left_hand: { x: -0.60, y: 0.22, z: 0.18, type: 'clinical', label: 'Left Hand / Forearm' },
  right_leg: { x: 0.22, y: -0.85, z: 0.22, type: 'clinical', label: 'Right Leg' },
  left_leg: { x: -0.22, y: -0.85, z: 0.22, type: 'clinical', label: 'Left Leg' },
};

/**
 * BodyMap — Real 3D interactive holographic astronaut body scanner using Three.js.
 * Auto-rotates 360°, draggable, with 3D status hotspot markers and AI Vision finding pins.
 */
export default function BodyMap({
  areas = {},
  selected,
  onSelect,
  heroMode = false,
  findings = [],
  onDismissFinding,
  onClearAllFindings,
}) {
  const mountRef = useRef(null);
  const areasRef = useRef(areas);
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const findingsRef = useRef(findings);
  const [activeFinding, setActiveFinding] = useState(null);
  const [activeTab, setActiveTab] = useState(findings.length > 0 ? 'findings' : 'vitals');

  useEffect(() => {
    if (findings.length > 0) {
      setActiveTab('findings');
    } else {
      setActiveTab('vitals');
    }
  }, [findings.length]);

  // Keep refs in sync for the Three.js render loop without recreating the scene
  useEffect(() => {
    areasRef.current = areas;
  }, [areas]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    findingsRef.current = findings;
  }, [findings]);

  const names = Object.keys(BODY_AREAS);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 450;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.15, 6.3);
    camera.lookAt(0, 0.10, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x18283d, 1.8);
    scene.add(ambientLight);

    // Key light (cool cyan-blue)
    const keyLight = new THREE.DirectionalLight(0x78d4e4, 2.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    // Fill light (deep blue)
    const fillLight = new THREE.DirectionalLight(0x285580, 1.8);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);

    // Rim light (behind silhouette edges)
    const rimLight = new THREE.DirectionalLight(0x4eaab9, 3.2);
    rimLight.position.set(0, 2, -4);
    scene.add(rimLight);

    // 4. Mannequin Master Group (rotates on Y)
    const mannequinGroup = new THREE.Group();
    mannequinGroup.position.set(0, -0.20, 0);
    scene.add(mannequinGroup);

    // High-tech sci-fi materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x122133,
      emissive: 0x081320,
      roughness: 0.35,
      metalness: 0.7,
      transparent: true,
      opacity: 0.92,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x4eaab9,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x243e5c,
      emissive: 0x0e1b29,
      roughness: 0.2,
      metalness: 0.85,
    });

    const helperAddMesh = (geometry, material, pos = [0, 0, 0], scale = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(scale[0], scale[1], scale[2]);
      mannequinGroup.add(mesh);

      // Wireframe overlay for hologram look
      const wire = new THREE.Mesh(geometry, wireMat);
      wire.position.copy(mesh.position);
      wire.scale.copy(mesh.scale);
      mannequinGroup.add(wire);
      return mesh;
    };

    // --- Build Anatomic Mannequin ---
    // Head (Sculpted oval)
    helperAddMesh(new THREE.SphereGeometry(0.32, 24, 20), skinMat, [0, 1.85, 0], [0.95, 1.15, 1.0]);

    // Astronaut Helmet Visor
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x4eaab9,
      emissive: 0x143c48,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.88,
    });
    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 18, 0, Math.PI, 0, Math.PI * 0.55),
      visorMat
    );
    visor.position.set(0, 1.84, 0.16);
    visor.rotation.x = Math.PI * 0.08;
    mannequinGroup.add(visor);

    // Neck
    helperAddMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.25, 18), jointMat, [0, 1.48, 0]);

    // Torso - Chest
    helperAddMesh(new THREE.CylinderGeometry(0.44, 0.36, 0.65, 20), skinMat, [0, 1.12, 0], [1.05, 1.0, 0.65]);
    // Torso - Abdomen
    helperAddMesh(new THREE.CylinderGeometry(0.36, 0.32, 0.42, 20), skinMat, [0, 0.62, 0], [0.95, 1.0, 0.65]);
    // Pelvis
    helperAddMesh(new THREE.CylinderGeometry(0.32, 0.38, 0.35, 20), skinMat, [0, 0.25, 0], [1.0, 1.0, 0.65]);

    // Shoulders
    helperAddMesh(new THREE.SphereGeometry(0.14, 16, 16), jointMat, [-0.56, 1.34, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.14, 16, 16), jointMat, [0.56, 1.34, 0]);

    // Arms
    // Left Upper Arm & Forearm
    helperAddMesh(new THREE.CylinderGeometry(0.11, 0.09, 0.52, 16), skinMat, [-0.6, 1.0, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.09, 14, 14), jointMat, [-0.6, 0.7, 0]);
    helperAddMesh(new THREE.CylinderGeometry(0.09, 0.075, 0.48, 16), skinMat, [-0.6, 0.42, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.08, 12, 12), jointMat, [-0.6, 0.12, 0], [0.8, 1.3, 0.6]);

    // Right Upper Arm & Forearm
    helperAddMesh(new THREE.CylinderGeometry(0.11, 0.09, 0.52, 16), skinMat, [0.6, 1.0, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.09, 14, 14), jointMat, [0.6, 0.7, 0]);
    helperAddMesh(new THREE.CylinderGeometry(0.09, 0.075, 0.48, 16), skinMat, [0.6, 0.42, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.08, 12, 12), jointMat, [0.6, 0.12, 0], [0.8, 1.3, 0.6]);

    // Legs
    // Left Thigh, Knee, Calf, Foot
    helperAddMesh(new THREE.CylinderGeometry(0.16, 0.12, 0.72, 18), skinMat, [-0.22, -0.28, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.11, 16, 16), jointMat, [-0.22, -0.68, 0]);
    helperAddMesh(new THREE.CylinderGeometry(0.12, 0.09, 0.72, 18), skinMat, [-0.22, -1.1, 0]);
    helperAddMesh(new THREE.BoxGeometry(0.14, 0.09, 0.28), jointMat, [-0.22, -1.52, 0.08]);

    // Right Thigh, Knee, Calf, Foot
    helperAddMesh(new THREE.CylinderGeometry(0.16, 0.12, 0.72, 18), skinMat, [0.22, -0.28, 0]);
    helperAddMesh(new THREE.SphereGeometry(0.11, 16, 16), jointMat, [0.22, -0.68, 0]);
    helperAddMesh(new THREE.CylinderGeometry(0.12, 0.09, 0.72, 18), skinMat, [0.22, -1.1, 0]);
    helperAddMesh(new THREE.BoxGeometry(0.14, 0.09, 0.28), jointMat, [0.22, -1.52, 0.08]);

    // Holographic Base Rings
    const baseGroup = new THREE.Group();
    baseGroup.position.set(0, -1.62, 0);
    mannequinGroup.add(baseGroup);

    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x4eaab9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.88, 48), ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    baseGroup.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x244260,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.08, 48), ringMat2);
    ring2.rotation.x = -Math.PI / 2;
    baseGroup.add(ring2);

    // Laser scan ring that bobs vertically
    const scanRingMat = new THREE.MeshBasicMaterial({
      color: 0x4eaab9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const scanRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.58, 36), scanRingMat);
    scanRing.rotation.x = -Math.PI / 2;
    mannequinGroup.add(scanRing);

    // 5. Interactive 3D Hotspot Markers
    const markerMeshes = {};
    const raycastTargets = [];

    Object.entries(ANATOMICAL_POSITIONS).forEach(([areaKey, pos]) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(pos.x, pos.y, pos.z);
      markerGroup.userData = { area: areaKey, type: pos.type };

      // Core sphere
      const sphereMat = new THREE.MeshStandardMaterial({
        color: STATUS_COLORS.none,
        emissive: STATUS_COLORS.none,
        emissiveIntensity: 0.65,
        roughness: 0.2,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 16), sphereMat);
      markerGroup.add(sphere);

      // Glowing outer ring (billboarded to camera)
      const ringMat = new THREE.MeshBasicMaterial({
        color: STATUS_COLORS.none,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.115, 32), ringMat);
      markerGroup.add(ring);

      mannequinGroup.add(markerGroup);
      markerMeshes[areaKey] = {
        group: markerGroup,
        sphereMat,
        ringMat,
        sphere,
        ring,
        type: pos.type,
      };
      raycastTargets.push(sphere);
    });

    // Raycaster for mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    let pointerDown = false;
    let prevX = 0;
    let dragDistance = 0;

    const onPointerDown = (e) => {
      pointerDown = true;
      dragDistance = 0;
      prevX = e.clientX || (e.touches && e.touches[0].clientX);
    };

    const onPointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      if (pointerDown && clientX !== undefined) {
        const deltaX = clientX - prevX;
        dragDistance += Math.abs(deltaX);
        mannequinGroup.rotation.y += deltaX * 0.012;
        prevX = clientX;
      }

      // Check hover
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY || (e.touches && e.touches[0].clientY)) - rect.top) / rect.height) * 2 + 1;
      mouse.set(x, y);
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets.filter((t) => t.parent.visible));
      renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : (pointerDown ? 'grabbing' : 'grab');
    };

    const onPointerUp = (e) => {
      if (pointerDown) {
        pointerDown = false;

        // If it was a clean click (not a drag)
        if (dragDistance < 6) {
          const rect = renderer.domElement.getBoundingClientRect();
          const clientX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
          const clientY = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
          if (clientX !== undefined && clientY !== undefined) {
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(raycastTargets.filter((t) => t.parent.visible));
            if (intersects.length > 0) {
              const clickedMesh = intersects[0].object;
              const areaKey = clickedMesh.parent?.userData?.area;
              if (areaKey) {
                // If there's an active finding at this area, open its HUD
                const finding = (findingsRef.current || []).find((f) => f.location === areaKey);
                if (finding) {
                  setActiveFinding(finding);
                } else if (onSelectRef.current) {
                  onSelectRef.current(selectedRef.current === areaKey ? null : areaKey);
                }
              }
            }
          }
        }
      }
    };

    const dom = renderer.domElement;
    dom.style.cursor = 'grab';
    dom.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    // Responsive resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 320;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // 6. Animation Loop
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Scanner ring up and down motion
      scanRing.position.y = Math.sin(elapsedTime * 1.5) * 1.5 + 0.1;

      // Invert mannequinGroup quaternion so child billboard rings always face camera
      const parentInvQuat = mannequinGroup.quaternion.clone().invert();

      // Markers update
      Object.entries(markerMeshes).forEach(([areaKey, m]) => {
        const currentAreas = areasRef.current || {};
        const currentSelected = selectedRef.current;
        const currentFindings = findingsRef.current || [];
        const finding = currentFindings.find((f) => f.location === areaKey);

        // Keep billboard ring facing camera accurately
        m.ring.quaternion.copy(parentInvQuat).multiply(camera.quaternion);

        if (finding) {
          // Active clinical finding — clean, calm, neatly proportional
          m.group.visible = true;
          const urgencyKey = finding.urgency;
          const hexColor = STATUS_COLORS[urgencyKey] || STATUS_COLORS.alert_ground;
          const isSel = currentSelected === areaKey || activeFinding?.id === finding.id;

          m.sphereMat.color.setHex(hexColor);
          m.sphereMat.emissive.setHex(hexColor);
          m.sphereMat.emissiveIntensity = 0.65;
          m.ringMat.color.setHex(hexColor);

          // Subtle, calm pulse
          const pulse = 1 + Math.sin(elapsedTime * 3.2 + (areaKey.charCodeAt(0) % 5)) * (isSel ? 0.22 : 0.08);
          const baseScale = isSel ? 1.3 : 1.05;
          m.group.scale.setScalar(baseScale * pulse);
          m.ringMat.opacity = isSel ? 0.95 : 0.75;
        } else if (m.type === 'clinical') {
          // Hide clinical extremity marker when there's no active finding on it
          m.group.visible = false;
        } else {
          // Standard telemetry area marker
          m.group.visible = true;
          const statusKey = currentAreas[areaKey];
          const hexColor = STATUS_COLORS[statusKey] ?? STATUS_COLORS.none;
          const isSel = currentSelected === areaKey;

          m.sphereMat.color.setHex(hexColor);
          m.sphereMat.emissive.setHex(hexColor);
          m.sphereMat.emissiveIntensity = 0.55;
          m.ringMat.color.setHex(hexColor);

          const pulse = 1 + Math.sin(elapsedTime * 3.0 + (areaKey.charCodeAt(0) % 5)) * (isSel ? 0.22 : 0.06);
          const baseScale = isSel ? 1.3 : 1.0;
          m.group.scale.setScalar(baseScale * pulse);
          m.ringMat.opacity = isSel ? 0.9 : 0.65;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      dom.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
      if (dom.parentNode) dom.parentNode.removeChild(dom);
      renderer.dispose();
    };
  }, [activeFinding?.id]);

  const content = (
    <div className={heroMode ? 'body-hero-layout' : 'body-map-layout'}>
      {/* 3D WebGL Canvas Container */}
      <div className="body-hero-canvas-wrap">
        <div className="three-body-container" ref={mountRef} />
        <div className="three-body-controls-bar">
          <span className="three-rotate-hint muted small">
            <Icon name="activity" size={13} color="var(--cyan)" />
            <span>3D Scanner · Drag to rotate · Tap hotspot to inspect</span>
          </span>
          {selected && (
            <button
              type="button"
              className="three-clear-btn"
              onClick={() => onSelect(null)}
              title="Clear area filter"
            >
              Reset view
            </button>
          )}
        </div>
      </div>

      {/* Floating Holographic Clinical HUD (When an injury hotspot is tapped) */}
      {activeFinding && (
        <div className="three-finding-hud" role="dialog" aria-label="Clinical Finding Details">
          <div className="finding-hud-header">
            <div className="finding-hud-tags-row">
              <span className="finding-hud-tag">AI VISION FINDING</span>
              <span className={`finding-hud-urgency-badge status-${activeFinding.urgency}`}>
                {activeFinding.urgency === 'alert_ground'
                  ? '▲ Alert Flight Surgeon'
                  : activeFinding.urgency === 'show_officer'
                  ? '◆ Show Medical Officer'
                  : '● Keep Watching'}
              </span>
            </div>
            <button
              type="button"
              className="finding-hud-close-btn"
              onClick={() => setActiveFinding(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <h4 className="finding-hud-title">
            📍 {activeFinding.locationLabel || 'Right Hand'}: {activeFinding.title}
          </h4>

          <p className="finding-hud-desc">{activeFinding.description}</p>

          {activeFinding.next_step && (
            <div className="finding-hud-step-box">
              <span className="finding-hud-step-label">Recommended Action:</span>
              <p className="finding-hud-step-text">{activeFinding.next_step}</p>
            </div>
          )}

          <div className="finding-hud-actions-row">
            <Link to="/photo-check" className="finding-hud-action-primary">
              <span>View in Photo Check</span>
              <Icon name="arrow-right" size={13} />
            </Link>
            {onDismissFinding && (
              <button
                type="button"
                className="finding-hud-action-dismiss"
                onClick={() => {
                  onDismissFinding(activeFinding.id);
                  setActiveFinding(null);
                }}
              >
                Clear Pin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Area Filter Buttons List with generous width */}
      <div className="body-hero-areas">
        {/* Tab switcher if findings exist */}
        {findings.length > 0 && (
          <div className="body-areas-tab-bar">
            <button
              type="button"
              className={`body-tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
              onClick={() => {
                setActiveFinding(null);
                setActiveTab('vitals');
              }}
            >
              <Icon name="activity" size={13} />
              <span>Vitals ({names.length})</span>
            </button>
            <button
              type="button"
              className={`body-tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
              onClick={() => {
                onSelect(null);
                setActiveTab('findings');
              }}
            >
              <span className="tab-alert-dot" />
              <span>Findings ({findings.length})</span>
            </button>
          </div>
        )}

        {/* Systemic Vitals List */}
        {(!findings.length || activeTab === 'vitals') && (
          <div className="systemic-vitals-stack">
            <div className="vitals-section-header">
              <span className="body-hero-label muted small">Systemic Telemetry Hotspots</span>
              {selected && (
                <button
                  type="button"
                  className="reset-filter-link muted small"
                  onClick={() => onSelect(null)}
                >
                  Reset
                </button>
              )}
            </div>
            {names.map((area) => (
              <button
                key={area}
                type="button"
                aria-pressed={selected === area}
                className={`body-area-pill ${selected === area ? 'active' : ''}`}
                onClick={() => {
                  setActiveFinding(null);
                  onSelect(selected === area ? null : area);
                }}
              >
                <span className="area-label-name">{BODY_AREAS[area]}</span>
                <StatusBadge status={areas[area]} />
              </button>
            ))}
          </div>
        )}

        {/* Active Clinical Findings List */}
        {findings.length > 0 && activeTab === 'findings' && (
          <div className="body-hero-findings-section">
            <div className="findings-section-header">
              <span className="findings-section-title">Clinical Findings ({findings.length})</span>
              {onClearAllFindings && (
                <button
                  type="button"
                  className="clear-all-findings-btn"
                  onClick={onClearAllFindings}
                  title="Clear all resolved clinical findings"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="findings-pills-stack">
              {findings.map((f) => {
                const isActive = activeFinding?.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`body-area-pill finding-pill ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelect(null);
                      setActiveFinding(isActive ? null : f);
                    }}
                  >
                    <div className="finding-pill-content">
                      <span className="area-label-name">📍 {f.locationLabel}</span>
                      <span className="finding-pill-summary muted small">{f.title}</span>
                    </div>
                    <span className={`status-badge ${f.urgency === 'alert_ground' ? 'status-red' : 'status-yellow'}`}>
                      {f.urgency === 'alert_ground' ? '▲ Critical' : '◆ Watch'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selected && (!findings.length || activeTab === 'vitals') && (
          <button
            type="button"
            className="clear-area-filter-btn muted small mt-2"
            onClick={() => onSelect(null)}
          >
            Show all areas
          </button>
        )}
      </div>
    </div>
  );

  if (heroMode) return content;

  return (
    <Card
      title="Body Map"
      icon={<Icon name="user" size={18} color="var(--muted)" />}
      aside="3D Hologram"
      className="body-map-card"
    >
      {content}
    </Card>
  );
}

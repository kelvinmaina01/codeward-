import React, { useEffect, useRef, useState } from 'react';
import { 
  SourceCodeSquareIcon, 
  Settings01Icon, 
  Database01Icon, 
  ServerStack01Icon, 
  SourceCodeIcon, 
  Node01Icon, 
  CheckmarkBadge01Icon,
  Grid02Icon,
  ArrowDataTransferVerticalIcon
} from 'hugeicons-react';
import styles from './ArchitectureFlow.module.css';

export function ArchitectureFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState({
    leftToCenter: '',
    centerToTopLeft: '',
    centerToTopRight: '',
    centerToBottomLeft: '',
    centerToBottomRight: '',
    g2ToR1: '',
    g2ToR2: '',
    g4ToR2: '',
    g4ToR3: ''
  });

  // SVG lines calculation
  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const getCenter = (id: string) => {
        const el = document.getElementById(id);
        if (!el) return { x: 0, y: 0, right: 0, left: 0 };
        const rect = el.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
          right: rect.right - containerRect.left,
          left: rect.left - containerRect.left,
        };
      };

      const leftCard = getCenter('flow-agent');
      const center = getCenter('flow-center');
      const g1 = getCenter('flow-grid-1'); // LLM
      const g2 = getCenter('flow-grid-2'); // Vector DB
      const g3 = getCenter('flow-grid-3'); // Memory
      const g4 = getCenter('flow-grid-4'); // Execution

      const r1 = getCenter('flow-res-1');
      const r2 = getCenter('flow-res-2');
      const r3 = getCenter('flow-res-3');

      const createPath = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = Math.abs(x2 - x1) * 0.5;
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      };

      if (leftCard.x === 0 || center.x === 0) return;

      setPaths({
        leftToCenter: createPath(leftCard.right, leftCard.y, center.left, center.y),
        centerToTopLeft: createPath(center.right, center.y, g1.left, g1.y),
        centerToTopRight: createPath(center.right, center.y, g2.left, g2.y),
        centerToBottomLeft: createPath(center.right, center.y, g3.left, g3.y),
        centerToBottomRight: createPath(center.right, center.y, g4.left, g4.y),
        g2ToR1: createPath(g2.right, g2.y, r1.left, r1.y),
        g2ToR2: createPath(g2.right, g2.y, r2.left, r2.y),
        g4ToR2: createPath(g4.right, g4.y, r2.left, r2.y),
        g4ToR3: createPath(g4.right, g4.y, r3.left, r3.y),
      });
    };

    calculateLines();
    window.addEventListener('resize', calculateLines);
    return () => window.removeEventListener('resize', calculateLines);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Deploy <span className={styles.highlight}>autonomous agents</span> to eliminate your technical debt
        </h2>
        <p className={styles.subtitle}>
          Automate code reviews, crush legacy technical debt, and run live sandboxed tests with specialized AI agents securely integrated into your pipeline.
        </p>
      </div>

      <div className={styles.flowWrapper} ref={containerRef}>
        
        {/* SVG Lines Overlay */}
        <svg className={styles.svgOverlay}>
          <path d={paths.leftToCenter} className={styles.line} />
          <path d={paths.centerToTopLeft} className={styles.line} />
          <path d={paths.centerToTopRight} className={styles.line} />
          <path d={paths.centerToBottomLeft} className={styles.line} />
          <path d={paths.centerToBottomRight} className={styles.line} />
          <path d={paths.g2ToR1} className={styles.line} />
          <path d={paths.g2ToR2} className={styles.line} />
          <path d={paths.g4ToR2} className={styles.line} />
          <path d={paths.g4ToR3} className={styles.line} />
        </svg>

        {/* Column 1: Left */}
        <div className={styles.col1}>
          <div className={`${styles.card} ${styles.agentCard}`} id="flow-agent">
            <div className={styles.agentAvatar} style={{ background: '#8B5CF6' }}>
              <SourceCodeSquareIcon size={32} color="#ffffff" />
            </div>
            <div className={styles.agentId}>Trigger ID 00113</div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', marginBottom: '8px' }}>Code Push & Trigger</h3>
            <p style={{ fontSize: '13px', color: '#555', marginBottom: '16px', lineHeight: 1.5 }}>
              The pipeline triggers when code is pushed or a PR is opened. Codeward intercepts:
            </p>
            <ul style={{ fontSize: '12px', color: '#8B5CF6', fontWeight: 600, paddingLeft: '16px', marginBottom: '16px', listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Source code changes</li>
              <li>PR comments & context</li>
              <li>Branch policies</li>
              <li>Affected dependencies</li>
            </ul>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '6px 10px', borderRadius: '4px' }}>
              Status: Analyzing
            </div>
          </div>
        </div>

        {/* Center Node */}
        <div className={styles.centerNode} id="flow-center">
          <Settings01Icon size={24} color="#ffffff" />
        </div>

        {/* Column 2: Middle Grid */}
        <div className={styles.col2}>
          
          <div className={`${styles.card} ${styles.gridCard}`} id="flow-grid-1" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
            <div className={styles.iconCircle} style={{ color: '#EF4444', backgroundColor: '#FEE2E2', marginBottom: '12px' }}>
               <Settings01Icon size={24} />
            </div>
            <div className={styles.gridCardTitle} style={{ marginBottom: '6px' }}>Security Agent</div>
            <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
              Scans for zero-day vulnerabilities, hardcoded secrets, and compliance violations before execution.
            </p>
          </div>

          <div className={`${styles.card} ${styles.gridCard}`} id="flow-grid-2" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
            <div className={styles.iconCircle} style={{ color: '#10B981', backgroundColor: '#D1FAE5', marginBottom: '12px' }}>
               <Database01Icon size={24} />
            </div>
            <div className={styles.gridCardTitle} style={{ marginBottom: '6px' }}>Debt Agent</div>
            <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
              Identifies legacy patterns and flags overly complex modules for modern refactoring.
            </p>
          </div>

          <div className={`${styles.card} ${styles.gridCard}`} id="flow-grid-3" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
            <div className={styles.iconCircle} style={{ color: '#8B5CF6', backgroundColor: '#EDE9FE', marginBottom: '12px' }}>
               <ServerStack01Icon size={24} />
            </div>
            <div className={styles.gridCardTitle} style={{ marginBottom: '6px' }}>Test Agent</div>
            <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
              Spins up ephemeral live sandboxes to execute the entire test suite against the new changes.
            </p>
          </div>

          <div className={`${styles.card} ${styles.gridCard}`} id="flow-grid-4" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
            <div className={styles.iconCircle} style={{ color: '#10B981', backgroundColor: '#D1FAE5', marginBottom: '12px' }}>
               <SourceCodeIcon size={24} />
            </div>
            <div className={styles.gridCardTitle} style={{ marginBottom: '6px' }}>Refactor Agent</div>
            <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.5 }}>
              Restructures directories and writes optimized logic without breaking the underlying architecture.
            </p>
          </div>

        </div>

        {/* Column 3: Results */}
        <div className={styles.col3}>
          <div className={`${styles.card} ${styles.resultCard}`} id="flow-res-1">
            <div className={styles.resultIcon}><CheckmarkBadge01Icon size={20} color="#EF4444" /></div>
            <div className={styles.resultTitle}>Automated PR Reviews</div>
            <div className={styles.resultDesc}>Actionable, inline comments left directly on your pull requests in seconds.</div>
          </div>
          <div className={`${styles.card} ${styles.resultCard}`} id="flow-res-2">
            <div className={styles.resultIcon}><Grid02Icon size={20} color="#8B5CF6" /></div>
            <div className={styles.resultTitle}>Self-healing Patches</div>
            <div className={styles.resultDesc}>Autonomous code commits that instantly fix vulnerabilities or failing tests.</div>
          </div>
          <div className={`${styles.card} ${styles.resultCard}`} id="flow-res-3">
            <div className={styles.resultIcon}><ArrowDataTransferVerticalIcon size={20} color="#10B981" /></div>
            <div className={styles.resultTitle}>Zero-Debt Production</div>
            <div className={styles.resultDesc}>A pristine, secure, and fully optimized architecture deployed flawlessly.</div>
          </div>
        </div>

      </div>

      <div style={{ marginTop: '50px', zIndex: 2 }}>
        <button 
          style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: 'white',
            padding: '16px 40px',
            borderRadius: '50px',
            fontSize: '18px',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(16, 185, 129, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4)';
          }}
        >
          Secure your repo now
        </button>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface CallOverlayPortalProps {
  children: React.ReactNode;
}

const PORTAL_ID = 'call-overlay-root';

export const CallOverlayPortal: React.FC<CallOverlayPortalProps> = ({ children }) => {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find or create the portal root
    let root = document.getElementById(PORTAL_ID);
    
    if (!root) {
      root = document.createElement('div');
      root.id = PORTAL_ID;
      root.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;';
      document.body.appendChild(root);
    }
    
    setPortalRoot(root);
    
    return () => {
      // Don't remove the root on unmount - other calls might need it
    };
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <div style={{ pointerEvents: 'auto' }}>
      {children}
    </div>,
    portalRoot
  );
};

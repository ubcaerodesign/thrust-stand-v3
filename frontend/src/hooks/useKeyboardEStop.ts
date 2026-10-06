import { useEffect, useCallback } from 'react';

export function useKeyboardEStop() {
  const triggerEStop = useCallback(async () => {
    try {
      console.warn("EMERGENCY STOP TRIGGERED VIA KEYBOARD");
      await fetch('http://127.0.0.1:8000/api/control/estop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Failed to transmit E-Stop to backend:", error);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Allow Escape key to always trigger E-Stop, even if typing
      const isEscape = event.code === 'Escape';
      const isSpace = event.code === 'Space';

      if (!isEscape && !isSpace) return;

      // Prevent triggering if the user is typing in a form field
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isSpace && isTyping) return;

      // Prevent default browser scrolling if spacebar is hit
      event.preventDefault();
      triggerEStop();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerEStop]);

  return { triggerEStop };
}
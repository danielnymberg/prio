/**
 * VoicePushToTalkButton - Robust push-to-talk implementation
 *
 * Inspirerad av WhatsApp röstmeddelanden. Håll in knapp → prata → släpp = skicka.
 *
 * CRITICAL FEATURES:
 * - Mouse support (desktop)
 * - Touch support (mobil)
 * - Keyboard support (Space key)
 * - Edge cases: mouse leave, touch cancel, context menu
 * - SyncFusion Fluent2 styling (INGEN custom CSS!)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioFeedback } from '@/services/audio/AudioFeedback';

export interface VoicePushToTalkButtonProps {
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  partialTranscript?: string;
}

export function VoicePushToTalkButton({
  onRecordingStart,
  onRecordingStop,
  disabled = false,
  isProcessing = false,
  partialTranscript = ''
}: VoicePushToTalkButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const audioFeedback = useRef(new AudioFeedback());

  // Cleanup på unmount
  useEffect(() => {
    return () => {
      audioFeedback.current.dispose();
    };
  }, []);

  // Keyboard support: Space key = push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore om user skriver i input-fält
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !isRecording && !disabled && !isProcessing) {
        e.preventDefault();
        handleStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        handleStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isRecording, disabled, isProcessing]);

  /**
   * Start recording - anropas från mouse/touch/keyboard
   */
  const handleStart = useCallback(() => {
    if (disabled || isProcessing || isRecording) return;

    console.log('🎤 Start recording');
    setIsRecording(true);

    // Audio feedback
    audioFeedback.current.playStart();

    // Haptic feedback (Android)
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Anropa callback
    onRecordingStart();
  }, [disabled, isProcessing, isRecording, onRecordingStart]);

  /**
   * Stop recording - anropas från mouse/touch/keyboard
   */
  const handleStop = useCallback(() => {
    if (!isRecording) return;

    console.log('🛑 Stop recording');
    setIsRecording(false);

    // Audio feedback
    audioFeedback.current.playStop();

    // Haptic feedback (Android) - dubbel puls för "mottaget"
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }

    // Anropa callback
    onRecordingStop();
  }, [isRecording, onRecordingStop]);

  /**
   * Mouse handlers - Desktop
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('🖱️ MOUSE DOWN event', { button: e.button, target: e.target });
    e.preventDefault(); // Förhindra text selection
    e.stopPropagation(); // Förhindra bubbling
    handleStart();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    console.log('🖱️ MOUSE UP event', { button: e.button, target: e.target });
    e.preventDefault();
    e.stopPropagation();
    handleStop();
  };

  /**
   * KRITISKT: Om musen lämnar knappen under inspelning → STOPPA
   * Detta förhindrar att inspelning fortsätter efter att användaren släppt
   */
  const handleMouseLeave = () => {
    if (isRecording) {
      console.warn('⚠️ Mouse left button during recording - stopping');
      handleStop();
    }
  };

  /**
   * Touch handlers - Mobil
   * KRITISKT FIX: preventDefault() + stopPropagation() för att förhindra avbrott
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('👆 TOUCH START event', { touches: e.touches.length, target: e.target });
    e.preventDefault(); // Förhindra scroll/zoom under touch
    e.stopPropagation(); // Förhindra event bubbling
    handleStart();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    console.log('👆 TOUCH END event', { changedTouches: e.changedTouches.length, target: e.target });
    e.preventDefault(); // Förhindra "ghost clicks"
    e.stopPropagation(); // Förhindra event bubbling
    handleStop();
  };

  /**
   * KRITISKT: Om touch avbryts (swipe bort, annan app, etc) → STOPPA
   */
  const handleTouchCancel = () => {
    console.warn('⚠️ Touch cancelled during recording - stopping');
    handleStop();
  };

  /**
   * KRITISKT: Förhindra context menu (högerklick) under inspelning
   */
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      handleStop();
    }
  };

  // Button visual state
  const buttonContent = isProcessing
    ? 'Tänker...'
    : isRecording
    ? 'Släpp för att skicka'
    : 'Håll för att prata';

  const iconClass = isProcessing
    ? 'e-spinner'
    : isRecording
    ? 'e-stop'
    : 'e-microphone';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      width: '100%'
    }}>
      {/*
        KRITISKT: ButtonComponent + nested button blockerar events!
        Lösning: En enda <div> med SF-klasser + role="button" för tillgänglighet.
      */}
      <div
        className={`e-btn ${isRecording ? 'e-primary e-active' : 'e-outline e-primary'} e-large`}
        role="button"
        aria-label="Push to talk"
        tabIndex={disabled || isProcessing ? -1 : 0}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
          opacity: disabled || isProcessing ? 0.5 : 1,
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        {/* Icon */}
        <span
          className={`e-icons ${iconClass}`}
          style={{
            fontSize: '40px',
            animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
            pointerEvents: 'none' // Förhindra icon från att blockera events
          }}
        />

        {/* Text */}
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          textAlign: 'center',
          pointerEvents: 'none' // Förhindra text från att blockera events
        }}>
          {buttonContent}
        </span>
      </div>

      {/* Live transcript display */}
      {isRecording && partialTranscript && (
        <div style={{
          background: 'var(--e-surface)',
          padding: '12px 16px',
          borderRadius: '8px',
          maxWidth: '300px',
          textAlign: 'center',
          border: '1px solid var(--e-border)',
          animation: 'fadeIn 0.2s ease-in'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'var(--e-text-secondary)',
            marginBottom: '4px'
          }}>
            Du säger:
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--e-text)',
            fontStyle: 'italic'
          }}>
            "{partialTranscript}"
            <span style={{ marginLeft: '4px', fontWeight: 'bold' }}>▊</span>
          </div>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: 'var(--primary-600)',
          fontWeight: 600
        }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--primary-600)',
              animation: 'blink 1s ease-in-out infinite'
            }}
          />
          Spelar in...
        </div>
      )}
    </div>
  );
}

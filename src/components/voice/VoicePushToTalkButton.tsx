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
    e.preventDefault(); // Förhindra text selection
    handleStart();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
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
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Förhindra scroll/zoom
    handleStart();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
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
        KRITISKT: SyncFusion ButtonComponent stödjer INTE onMouseDown/onTouchStart!
        Lösning: Wrap i div som fångar events, använd native button inuti med SF styling.
        Detta är enda sättet att få push-to-talk att fungera med SF Fluent2.
      */}
      <div
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          display: 'inline-block',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        }}
      >
        <button
          className={`e-btn ${isRecording ? 'e-primary e-active' : 'e-outline e-primary'} e-large`}
          disabled={disabled || isProcessing}
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
            touchAction: 'none' // Förhindra scroll/zoom på mobil
          }}
        >
          {/* Icon */}
          <span
            className={`e-icons ${iconClass}`}
            style={{
              fontSize: '40px',
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none'
            }}
          />

          {/* Text */}
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            {buttonContent}
          </span>
        </button>
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

      {/* Instructions */}
      {!isRecording && !isProcessing && (
        <div style={{
          fontSize: '11px',
          color: 'var(--e-text-secondary)',
          textAlign: 'center'
        }}>
          Håll knappen eller Space-tangenten
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

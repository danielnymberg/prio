/**
 * VoicePushToTalkButton - Robust push-to-talk implementation
 *
 * Inspirerad av WhatsApp röstmeddelanden. Håll in knapp → prata → släpp = skicka.
 *
 * CRITICAL FEATURES:
 * - Mouse support (desktop)
 * - Touch support (mobil) - native addEventListener för Android compatibility
 * - Keyboard support (Space key)
 * - Edge cases: mouse leave, touch cancel, context menu
 * - SyncFusion Fluent2 styling (INGEN custom CSS!)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioFeedback } from '@/services/audio/AudioFeedback';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

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
  const buttonRef = useRef<ButtonComponent>(null);

  // Cleanup på unmount
  useEffect(() => {
    return () => {
      audioFeedback.current.dispose();
    };
  }, []);

  // Setup native touch listeners för Android (passive: false)
  useEffect(() => {
    if (!buttonRef.current) return;

    const btnElement = buttonRef.current.element;
    if (!btnElement) return;

    // Native listeners med {passive: false} för Android Chrome
    const touchStartHandler = (e: TouchEvent) => {
      console.log('👆 TOUCH START event (native)', { touches: e.touches.length });
      e.preventDefault();
      e.stopPropagation();
      if (!disabled && !isProcessing && !isRecording) {
        handleStart();
      }
    };

    const touchEndHandler = (e: TouchEvent) => {
      console.log('👆 TOUCH END event (native)', { changedTouches: e.changedTouches.length });
      e.preventDefault();
      e.stopPropagation();
      if (isRecording) {
        handleStop();
      }
    };

    const touchCancelHandler = () => {
      console.warn('⚠️ Touch cancelled during recording - stopping');
      if (isRecording) {
        handleStop();
      }
    };

    btnElement.addEventListener('touchstart', touchStartHandler, { passive: false });
    btnElement.addEventListener('touchend', touchEndHandler, { passive: false });
    btnElement.addEventListener('touchcancel', touchCancelHandler, { passive: false });

    return () => {
      btnElement.removeEventListener('touchstart', touchStartHandler);
      btnElement.removeEventListener('touchend', touchEndHandler);
      btnElement.removeEventListener('touchcancel', touchCancelHandler);
    };
  }, [disabled, isProcessing, isRecording]);

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
        KRITISKT: Touch events MÅSTE vara native addEventListener (passive: false) för Android!
        Lösning: ButtonComponent med ref + native event listeners i useEffect
      */}
      <ButtonComponent
        ref={buttonRef}
        cssClass={`${isRecording ? 'e-primary e-active' : 'e-outline e-primary'} e-large`}
        disabled={disabled || isProcessing}
        style={{
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none'
        } as any}
      >
        <div
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onContextMenu={handleContextMenu}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            pointerEvents: 'auto'
          }}
        >
          {/* Icon */}
          <span
            className={`e-icons ${iconClass}`}
            style={{
              fontSize: '40px',
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
              pointerEvents: 'none'
            }}
          />

          {/* Text */}
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            {buttonContent}
          </span>
        </div>
      </ButtonComponent>

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

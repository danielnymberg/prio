import { useState, CSSProperties } from 'react';
import { Mic, MicOff, MessageSquare } from 'lucide-react';
import { SyncButton as Button } from './SyncButton';
import { startSpeechRecognition, speak, parseVoiceCommand } from '@/lib/voiceControl';
import { toast } from 'react-hot-toast';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'md' | 'lg';
  mode?: 'simple' | 'smart'; // simple = direct transcription, smart = command parsing
  onCommand?: (action: string, params: any) => void;
  placeholder?: string;
}

export function VoiceButton({ onTranscript, size = 'sm', mode = 'simple', onCommand, placeholder }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [stopRecording, setStopRecording] = useState<(() => void) | null>(null);

  const handleVoiceInput = () => {
    if (isListening) {
      stopRecording?.();
      setIsListening(false);
      setStopRecording(null);
      return;
    }

    setIsListening(true);

    const promptMessage = mode === 'smart'
      ? (placeholder || 'Säg vad du vill göra')
      : 'Lyssnar nu';
    speak(promptMessage);

    const stop = startSpeechRecognition(
      (text) => {
        console.log('Transkription:', text);

        if (mode === 'smart' && onCommand) {
          const command = parseVoiceCommand(text);
          if (command.action !== 'unknown') {
            onCommand(command.action, command.params);
            setIsListening(false);
            setStopRecording(null);
            speak(`Utförde: ${text}`);
            toast.success(`Kommando: "${text}"`);
            return;
          }
        }

        onTranscript(text);
        setIsListening(false);
        setStopRecording(null);
        speak('Klar!');
        toast.success(`Hörde: "${text}"`);
      },
      (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setStopRecording(null);
        toast.error(`Röstfel: ${error}`);
      }
    );

    setStopRecording(() => stop);
  };

  const buttonTitle = isListening
    ? 'Sluta lyssna'
    : mode === 'smart'
      ? 'Röstkommando'
      : 'Röstinmatning';

  const ButtonIcon = mode === 'smart' && !isListening ? MessageSquare : isListening ? MicOff : Mic;

  const iconStyle: CSSProperties = {
    height: '16px',
    width: '16px',
  };

  const buttonStyle: CSSProperties = isListening ? {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  } : {};

  return (
    <Button
      variant={isListening ? 'primary' : 'ghost'}
      size={size}
      onClick={handleVoiceInput}
      title={buttonTitle}
      style={buttonStyle}
    >
      <ButtonIcon style={iconStyle} />
    </Button>
  );
}

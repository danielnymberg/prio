import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from './Button';
import { startSpeechRecognition, speak } from '@/lib/voiceControl';
import { toast } from 'react-hot-toast';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceButton({ onTranscript, size = 'sm' }: VoiceButtonProps) {
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
    speak('Lyssnar nu');

    const stop = startSpeechRecognition(
      (text) => {
        console.log('Transkription:', text);
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

  return (
    <Button
      variant={isListening ? 'primary' : 'ghost'}
      size={size}
      onClick={handleVoiceInput}
      title={isListening ? 'Sluta lyssna' : 'Röstinmatning'}
      className={isListening ? 'animate-pulse' : ''}
    >
      {isListening ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}

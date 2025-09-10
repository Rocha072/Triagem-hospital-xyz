import { Mic, MicOff, Loader2 } from 'lucide-react';
import { VoiceState } from '../types';
import { cn } from '../lib/utils';

interface VoiceButtonProps {
  voiceState: VoiceState;
  onToggleRecording: () => void;
  disabled?: boolean;
}

export const VoiceButton = ({ 
  voiceState, 
  onToggleRecording, 
  disabled = false 
}: VoiceButtonProps) => {
  const { isRecording, isProcessing, isSpeaking } = voiceState;

  const getButtonState = () => {
    if (isProcessing) return 'processing';
    if (isSpeaking) return 'speaking';
    if (isRecording) return 'recording';
    return 'idle';
  };

  const getButtonContent = () => {
    switch (getButtonState()) {
      case 'processing':
        return <Loader2 className="w-8 h-8 animate-spin" />;
      case 'speaking':
        return <Mic className="w-8 h-8" />;
      case 'recording':
        return <MicOff className="w-8 h-8" />;
      default:
        return <Mic className="w-8 h-8" />;
    }
  };

  const getButtonClasses = () => {
    const baseClasses = "w-20 h-20 rounded-full medical-button flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (getButtonState()) {
      case 'processing':
        return cn(baseClasses, "bg-medical-status-processing pulse-processing");
      case 'speaking':
        return cn(baseClasses, "bg-medical-status-speaking");
      case 'recording':
        return cn(baseClasses, "bg-medical-status-recording pulse-recording");
      default:
        return cn(baseClasses, "bg-primary hover:bg-primary-glow");
    }
  };

  const isButtonDisabled = disabled || isProcessing || isSpeaking;

  return (
    <div className="flex flex-col items-center space-y-3">
      <button
        onClick={onToggleRecording}
        disabled={isButtonDisabled}
        className={getButtonClasses()}
        aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
      >
        {getButtonContent()}
      </button>
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {getButtonState() === 'processing' && 'Processando...'}
          {getButtonState() === 'speaking' && 'Falando...'}
          {getButtonState() === 'recording' && 'Gravando - Clique para parar'}
          {getButtonState() === 'idle' && 'Clique para falar'}
        </p>
      </div>
    </div>
  );
};
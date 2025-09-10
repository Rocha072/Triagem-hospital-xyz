import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { VoiceState } from '../types';
import { cn } from '../lib/utils';

interface StatusIndicatorProps {
  voiceState: VoiceState;
  isSupported: boolean;
}

export const StatusIndicator = ({ voiceState, isSupported }: StatusIndicatorProps) => {
  const { error } = voiceState;

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
        <WifiOff className="w-4 h-4 text-destructive" />
        <span className="text-sm text-destructive">
          Reconhecimento de voz não suportado
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-sm text-destructive">
          {error}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 px-3 py-2 bg-accent/50 border border-border rounded-lg">
      <Wifi className="w-4 h-4 text-primary" />
      <span className="text-sm text-muted-foreground">
        Sistema de voz ativo
      </span>
    </div>
  );
};
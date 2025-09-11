export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface VoiceState {
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  error: string | null;
}

export interface TriagemRequest {
  message: string;
  sessionId: string;
}

export interface TriagemResponse {
  output?: string;
  response?: string;
  message?: string;
  status?: string;
  sessionId: string;
}

export interface StructuredResponse {
  message: string;
  status: 'normal' | 'alerta_emergencia' | 'triagem_concluida' | 'ajuda_humana';
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}
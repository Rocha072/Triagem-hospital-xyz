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
  response: string;
  sessionId: string;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId: string;
}
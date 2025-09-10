import { useState, useEffect, useCallback } from 'react';
import { VoiceState } from '../types';

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  
  start(): void;
  stop(): void;
  abort(): void;

  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export const useSpeechRecognition = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    error: null,
  });

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [inactivityTimer, setInactivityTimer] = useState<number | null>(null);

  // Inicializar Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Reconhecimento de voz não é suportado neste navegador'
      }));
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = 'pt-BR';

    // Event listeners
    recognitionInstance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isRecording: true, error: null }));
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Clear any existing inactivity timer
      if (inactivityTimer) {
        window.clearTimeout(inactivityTimer);
        setInactivityTimer(null);
      }

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result[0]) {
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
        // Set 5-second inactivity timer for auto-stop
        const timer: number = window.setTimeout(() => {
          if (recognitionInstance && voiceState.isRecording) {
            recognitionInstance.stop();
          }
        }, 5000);
        setInactivityTimer(timer);
      } else if (interimTranscript) {
        setTranscript(interimTranscript.trim());
        // Set 5-second inactivity timer for interim results too
        const timer: number = window.setTimeout(() => {
          if (recognitionInstance && voiceState.isRecording) {
            recognitionInstance.stop();
          }
        }, 5000);
        setInactivityTimer(timer);
      }
    };

    recognitionInstance.onend = () => {
      setVoiceState(prev => ({ ...prev, isRecording: false }));
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState(prev => ({
        ...prev,
        isRecording: false,
        error: 'Erro no reconhecimento de voz. Tente novamente.'
      }));
    };

    setRecognition(recognitionInstance);

    return () => {
      if (inactivityTimer) {
        window.clearTimeout(inactivityTimer);
      }
      recognitionInstance.abort();
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!recognition) {
      setVoiceState(prev => ({
        ...prev,
        error: 'Reconhecimento de voz não disponível'
      }));
      return;
    }

    try {
      setTranscript('');
      setVoiceState(prev => ({ ...prev, error: null }));
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        error: 'Erro ao iniciar gravação'
      }));
    }
  }, [recognition]);

  const stopRecording = useCallback(() => {
    if (!recognition) return;

    // Clear inactivity timer when manually stopping
    if (inactivityTimer) {
      window.clearTimeout(inactivityTimer);
      setInactivityTimer(null);
    }

    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, [recognition, inactivityTimer]);

  const setProcessing = useCallback((processing: boolean) => {
    setVoiceState(prev => ({ ...prev, isProcessing: processing }));
  }, []);

  const setSpeaking = useCallback((speaking: boolean) => {
    setVoiceState(prev => ({ ...prev, isSpeaking: speaking }));
  }, []);

  const clearError = useCallback(() => {
    setVoiceState(prev => ({ ...prev, error: null }));
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    voiceState,
    transcript,
    startRecording,
    stopRecording,
    setProcessing,
    setSpeaking,
    clearError,
    resetTranscript,
    isSupported: !!recognition,
  };
};
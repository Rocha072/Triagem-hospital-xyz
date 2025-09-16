import { ElevenLabsConfig } from '../types';

const ELEVENLABS_CONFIG: ElevenLabsConfig = {
  apiKey: '', // Will be set from environment
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Adam voice
  modelId: 'eleven_multilingual_v2'
};

export class ElevenLabsService {
  private static instance: ElevenLabsService;
  private audioContext: AudioContext | null = null;

  static getInstance(): ElevenLabsService {
    if (!ElevenLabsService.instance) {
      ElevenLabsService.instance = new ElevenLabsService();
    }
    return ElevenLabsService.instance;
  }

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async textToSpeech(text: string): Promise<HTMLAudioElement | null> {
    try {
      await this.initAudioContext();
      
      // Call our Supabase Edge Function instead of ElevenLabs directly
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`TTS API error: ${response.status} - ${errorData.error}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return await this.playAudio(audioBuffer);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback para Web Speech API
      this.fallbackTTS(text);
      return null;
    }
  }

  private async playAudio(audioBuffer: ArrayBuffer): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      try {
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        // Resolve immediately with the audio element so it can be controlled
        resolve(audio);
        
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private fallbackTTS(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    } else {
      console.error('Speech synthesis not supported');
    }
  }
}
import { ElevenLabsConfig } from '../types';

const ELEVENLABS_CONFIG: ElevenLabsConfig = {
  apiKey: 'sk_d1152d748597f7dea957c2b4867b458d4fe24ee215a9beee',
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

  async textToSpeech(text: string): Promise<void> {
    try {
      await this.initAudioContext();
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_CONFIG.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_CONFIG.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_CONFIG.modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      await this.playAudio(audioBuffer);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      // Fallback para Web Speech API
      this.fallbackTTS(text);
    }
  }

  private async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        
        audio.play();
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
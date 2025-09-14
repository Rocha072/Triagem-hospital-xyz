import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { WebhookService } from '../services/webhookService';
import { ElevenLabsService } from '../services/elevenLabsService';
import { ChatMessage } from './ChatMessage';
import { VoiceButton } from './VoiceButton';
import { StatusIndicator } from './StatusIndicator';
import { WelcomeScreen } from './WelcomeScreen';
import { useToast } from '../hooks/use-toast';

export const TriagemApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => uuidv4());
  const [atendimentoIniciado, setAtendimentoIniciado] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<'normal' | 'alerta_emergencia' | 'triagem_concluida' | 'ajuda_humana'>('normal');
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const [finalizationTimer, setFinalizationTimer] = useState<NodeJS.Timeout | null>(null);
  const [returnCountdown, setReturnCountdown] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const {
    voiceState,
    transcript,
    startRecording,
    stopRecording,
    setProcessing,
    setSpeaking,
    clearError,
    resetTranscript,
    isSupported,
  } = useSpeechRecognition();

  const elevenLabsService = ElevenLabsService.getInstance();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup function to stop all speech when component unmounts
  useEffect(() => {
    return () => {
      // Stop browser speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Stop current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize conversation when user starts triage
  useEffect(() => {
    if (atendimentoIniciado && !isInitializing) {
      handleInitialMessage();
    }
  }, [atendimentoIniciado]);

  // Handle transcript changes
  useEffect(() => {
    if (!voiceState.isRecording && transcript && transcript.length > 0) {
      handleUserMessage(transcript);
      resetTranscript();
    }
  }, [voiceState.isRecording, transcript]);

  const handleInitialMessage = async () => {
    setIsInitializing(true);
    
    try {
      // Send initial message to start the conversation
      const response = await WebhookService.sendMessage({
        message: "iniciar",
        sessionId,
      });

      // Handle structured response
      const structuredResponse = parseStructuredResponse(response);
      
      // Add AI response to chat
      const aiMessage: Message = {
        id: uuidv4(),
        text: structuredResponse.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([aiMessage]);
      
      // Handle status logic
      handleStatusChange(structuredResponse.status);

      // Convert response to speech
      console.log('Starting text to speech', { message: structuredResponse.message });
      setSpeaking(true);
      try {
        const audioElement = await elevenLabsService.textToSpeech(structuredResponse.message);
        console.log('Text to speech result:', audioElement);
        currentAudioRef.current = audioElement;
        
        // Add event listener to stop speaking when audio ends
        if (audioElement) {
          audioElement.onended = () => {
            console.log('Audio ended, setting speaking to false');
            setSpeaking(false);
          };
        } else {
          // If no audio element was created, reset speaking state
          console.log('No audio element created, setting speaking to false');
          setSpeaking(false);
        }
      } catch (error) {
        console.error('Error with text to speech:', error);
        setSpeaking(false);
      }

    } catch (error) {
      console.error('Error initializing conversation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
      
      const errorResponse: Message = {
        id: uuidv4(),
        text: `Desculpe, ocorreu um erro ao iniciar a conversa: ${errorMessage}. Tente novamente.`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages([errorResponse]);

      toast({
        title: "Erro ao iniciar conversa",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleUserMessage = async (userText: string) => {
    const userMessage: Message = {
      id: uuidv4(),
      text: userText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setProcessing(true);

    try {
      // Send to n8n webhook
      const response = await WebhookService.sendMessage({
        message: userText,
        sessionId,
      });

      // Handle structured response
      const structuredResponse = parseStructuredResponse(response);

      // Add AI response to chat
      const aiMessage: Message = {
        id: uuidv4(),
        text: structuredResponse.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Handle status logic
      handleStatusChange(structuredResponse.status);

      // Convert response to speech
      console.log('Starting text to speech', { message: structuredResponse.message });
      setSpeaking(true);
      try {
        const audioElement = await elevenLabsService.textToSpeech(structuredResponse.message);
        console.log('Text to speech result:', audioElement);
        currentAudioRef.current = audioElement;
        
        // Add event listener to stop speaking when audio ends
        if (audioElement) {
          audioElement.onended = () => {
            console.log('Audio ended, setting speaking to false');
            setSpeaking(false);
          };
        } else {
          // If no audio element was created, reset speaking state
          console.log('No audio element created, setting speaking to false');
          setSpeaking(false);
        }
      } catch (error) {
        console.error('Error with text to speech:', error);
        setSpeaking(false);
      }

    } catch (error) {
      console.error('Error handling user message:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
      
      const errorResponse: Message = {
        id: uuidv4(),
        text: `Desculpe, ocorreu um erro: ${errorMessage}. Tente novamente em alguns instantes.`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorResponse]);

      toast({
        title: "Erro de comunicação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  // Parse structured response from backend
  const parseStructuredResponse = (response: any) => {
    try {
      // First try to get the structured response
      const rawData = response.output || response.response || response.message;
      
      if (typeof rawData === 'string') {
        // Check if it's wrapped in markdown code blocks
        let cleanedData = rawData;
        if (rawData.includes('```json') && rawData.includes('```')) {
          // Extract JSON from markdown code blocks
          const jsonMatch = rawData.match(/```json\n(.*?)\n```/s);
          if (jsonMatch && jsonMatch[1]) {
            cleanedData = jsonMatch[1];
          }
        }
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(cleanedData);
          if (parsed.message && parsed.status) {
            return {
              message: parsed.message,
              status: parsed.status as 'normal' | 'alerta_emergencia' | 'triagem_concluida' | 'ajuda_humana'
            };
          }
        } catch {
          // If JSON parsing fails, treat as normal message
          return {
            message: cleanedData,
            status: 'normal' as const
          };
        }
      }
      
      // If it's already an object with message and status
      if (rawData && typeof rawData === 'object' && rawData.message && rawData.status) {
        return {
          message: rawData.message,
          status: rawData.status as 'normal' | 'alerta_emergencia' | 'triagem_concluida' | 'ajuda_humana'
        };
      }
      
      // Fallback
      return {
        message: rawData || 'Resposta não encontrada',
        status: 'normal' as const
      };
    } catch {
      return {
        message: 'Resposta não encontrada',
        status: 'normal' as const
      };
    }
  };

  // Handle status changes
  const handleStatusChange = (status: 'normal' | 'alerta_emergencia' | 'triagem_concluida' | 'ajuda_humana') => {
    setConversationStatus(status);
    
    if (status === 'alerta_emergencia' || status === 'triagem_concluida' || status === 'ajuda_humana') {
      // Start countdown at 30 seconds
      setReturnCountdown(30);
      
      // Create interval to update countdown every second
      const countdownInterval = setInterval(() => {
        setReturnCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            handleReturnToWelcome();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Store the interval ID so we can clear it later
      setFinalizationTimer(countdownInterval);
      
      if (status === 'alerta_emergencia') {
        setShowEmergencyAlert(true);
      }
    }
  };

  // Return to welcome screen
  const handleReturnToWelcome = () => {
    // Stop any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    if (finalizationTimer) {
      window.clearInterval(finalizationTimer);
      setFinalizationTimer(null);
    }
    
    setSpeaking(false);
    setAtendimentoIniciado(false);
    setMessages([]);
    setConversationStatus('normal');
    setShowEmergencyAlert(false);
    setReturnCountdown(null);
  };

  // Handle finalize button click
  const handleFinalize = () => {
    // Stop any ongoing speech immediately
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    setSpeaking(false);
    handleReturnToWelcome();
  };

  const handleToggleRecording = () => {
    console.log('handleToggleRecording called', { 
      isRecording: voiceState.isRecording, 
      isProcessing: voiceState.isProcessing, 
      isSpeaking: voiceState.isSpeaking 
    });
    
    clearError();
    
    if (voiceState.isRecording) {
      stopRecording();
    } else {
      // Stop any ongoing speech before starting recording
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      }
      
      setSpeaking(false);
      startRecording();
    }
  };

  // Emergency reset function to unlock the button
  const handleEmergencyReset = () => {
    console.log('Emergency reset triggered');
    
    // Stop all speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    
    // Reset all voice states
    setSpeaking(false);
    setProcessing(false);
    clearError();
    resetTranscript();
    
    // Stop recording if active
    if (voiceState.isRecording) {
      stopRecording();
    }
  };

  const handleStartTriage = () => {
    setAtendimentoIniciado(true);
  };

  // Show welcome screen if triage hasn't started
  if (!atendimentoIniciado) {
    return <WelcomeScreen onStartTriage={handleStartTriage} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">
                Hospital XYZ
              </h1>
              <p className="text-sm text-muted-foreground">
                Triagem Virtual por Voz
              </p>
            </div>
            <StatusIndicator voiceState={voiceState} isSupported={isSupported} />
          </div>
        </div>
      </header>

      {/* Emergency Alert */}
      {showEmergencyAlert && (
        <div className="bg-yellow-400 text-black px-4 py-3 text-center font-semibold animate-pulse border-2 border-yellow-500">
          ATENÇÃO: SITUAÇÃO DE URGÊNCIA DETECTADA. A EQUIPE FOI ACIONADA.
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          
          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 bg-card medical-card rounded-xl p-6 mb-6 overflow-y-auto max-h-[60vh] space-y-4"
          >
            {isInitializing ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  </div>
                  <span>Conectando com a assistente...</span>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Iniciando conversa...</p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))
            )}

            {/* Processing indicator */}
            {voiceState.isProcessing && (
              <div className="flex justify-start">
                <div className="bg-medical-chat-ai text-medical-chat-ai-foreground px-4 py-3 rounded-2xl rounded-bl-md chat-message">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-sm">Processando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Return Countdown */}
          {returnCountdown !== null && (
            <div className="text-center mb-4 p-4 bg-accent/30 border border-border rounded-lg">
              <p className="text-lg font-semibold text-foreground">
                Retornando à tela principal em: <span className="text-primary">{returnCountdown} segundos</span>
              </p>
            </div>
          )}

          {/* Voice Control or Finalize Button */}
          <div className="flex flex-col items-center space-y-3">
            {conversationStatus === 'triagem_concluida' || conversationStatus === 'ajuda_humana' ? (
              <button
                onClick={handleFinalize}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                Finalizar Atendimento
              </button>
            ) : (
              <>
                <VoiceButton
                  voiceState={voiceState}
                  onToggleRecording={handleToggleRecording}
                  disabled={!isSupported || isInitializing || conversationStatus === 'alerta_emergencia'}
                />
                
                {/* Emergency reset button (hidden but accessible via double click) */}
                {(voiceState.isSpeaking || voiceState.isProcessing) && (
                  <button
                    onClick={handleEmergencyReset}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Destravar botão
                  </button>
                )}
              </>
            )}
          </div>

          {/* Current transcript preview */}
          {transcript && voiceState.isRecording && (
            <div className="mt-4 p-3 bg-accent/30 border border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Transcrevendo:
              </p>
              <p className="text-foreground font-medium">
                {transcript}
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card/50 border-t border-border py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Sistema de triagem virtual - Hospital XYZ © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};
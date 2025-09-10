import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { WebhookService } from '../services/webhookService';
import { ElevenLabsService } from '../services/elevenLabsService';
import { ChatMessage } from './ChatMessage';
import { VoiceButton } from './VoiceButton';
import { StatusIndicator } from './StatusIndicator';
import { useToast } from '../hooks/use-toast';

export const TriagemApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId] = useState(() => uuidv4());
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

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: uuidv4(),
      text: "Olá! Bem-vindo ao Hospital XYZ. Sou sua assistente virtual de triagem. Clique no microfone abaixo para iniciar nossa conversa e me conte como posso ajudá-lo hoje.",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Handle transcript changes
  useEffect(() => {
    if (!voiceState.isRecording && transcript && transcript.length > 0) {
      handleUserMessage(transcript);
      resetTranscript();
    }
  }, [voiceState.isRecording, transcript]);

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

      // Add AI response to chat
      const aiMessage: Message = {
        id: uuidv4(),
        text: response.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Convert response to speech
      setSpeaking(true);
      await elevenLabsService.textToSpeech(response.response);
      setSpeaking(false);

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

  const handleToggleRecording = () => {
    clearError();
    
    if (voiceState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

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

      {/* Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
          
          {/* Messages Container */}
          <div 
            ref={chatContainerRef}
            className="flex-1 bg-card medical-card rounded-xl p-6 mb-6 overflow-y-auto max-h-[60vh] space-y-4"
          >
            {messages.length === 0 ? (
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

          {/* Voice Control */}
          <div className="flex justify-center">
            <VoiceButton
              voiceState={voiceState}
              onToggleRecording={handleToggleRecording}
              disabled={!isSupported}
            />
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
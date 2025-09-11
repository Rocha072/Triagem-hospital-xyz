import { Button } from './ui/button';

interface WelcomeScreenProps {
  onStartTriage: () => void;
}

export const WelcomeScreen = ({ onStartTriage }: WelcomeScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex flex-col items-center justify-center">
      <div className="text-center space-y-8 max-w-md mx-auto px-4">
        {/* Hospital Logo/Icon */}
        <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <svg 
            className="w-10 h-10 text-primary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6V2m0 0h8m-8 0H4"
            />
          </svg>
        </div>

        {/* Title and Subtitle */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-primary">
            Hospital XYZ
          </h1>
          <p className="text-xl text-muted-foreground">
            Assistente de Triagem Virtual
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Nossa assistente virtual irá ajudá-lo com a triagem inicial. 
            Clique no botão abaixo para começar o atendimento por voz.
          </p>
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <Button 
            onClick={onStartTriage}
            size="lg"
            className="px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Iniciar Atendimento
          </Button>
        </div>

        {/* Additional Info */}
        <div className="pt-6 space-y-2 text-xs text-muted-foreground">
          <p>✓ Atendimento totalmente por voz</p>
          <p>✓ Privacidade e segurança garantidas</p>
          <p>✓ Disponível 24 horas por dia</p>
        </div>
      </div>
    </div>
  );
};
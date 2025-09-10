import axios from 'axios';
import { TriagemRequest, TriagemResponse } from '../types';

const WEBHOOK_URL = 'http://localhost:5678/webhook/TriagemHospitalXYZ';

export class WebhookService {
  static async sendMessage(request: TriagemRequest): Promise<TriagemResponse> {
    try {
      const response = await axios.post<TriagemResponse>(WEBHOOK_URL, request, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 segundos timeout
      });

      return response.data;
    } catch (error) {
      console.error('Webhook service error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Timeout: O servidor demorou muito para responder');
        }
        if (error.response?.status === 500) {
          throw new Error('Erro interno do servidor');
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Não foi possível conectar ao servidor');
        }
      }
      
      throw new Error('Erro de comunicação com o servidor');
    }
  }
}
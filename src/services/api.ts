import { Player } from '../utils/game';

interface AIMoveRequest {
  board: Player[];
  level: number;
  temperature: number;
}

export interface AIMoveResponse {
  move: number;
  message: string;
}

export const fetchAIMove = async (request: AIMoveRequest): Promise<AIMoveResponse> => {
  const response = await fetch('/api/ai-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('API Error');
  }

  const data = await response.json();
  
  if (typeof data.move !== 'number' || request.board[data.move] !== null) {
    throw new Error('Invalid move returned from API');
  }

  return {
    move: data.move,
    message: data.message || ''
  };
};

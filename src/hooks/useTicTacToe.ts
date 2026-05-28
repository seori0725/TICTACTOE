import { useState, useEffect, useCallback } from 'react';
import { Player, WinningLine, calculateWinner, getCellLabel } from '../utils/game';
import { fetchAIMove, AIMoveResponse } from '../services/api';

const SCORES_KEY = 'tictactoe-scores';
const LEVEL_KEY = 'tictactoe-level';

export interface MoveRecord {
  id: number;
  player: 'X' | 'O';
  index: number;
  label: string;
}

export interface ToastMessage {
  message: string;
  id: number;
}

export function useTicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [winningLine, setWinningLine] = useState<WinningLine | null>(null);
  const [status, setStatus] = useState<string>("X'S TURN");
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [aiMessage, setAiMessage] = useState<string>("");
  const [userPlaysAs, setUserPlaysAs] = useState<'X' | 'O'>('X');
  
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem(SCORES_KEY);
    return saved ? JSON.parse(saved) : { X: 0, O: 0, draws: 0 };
  });
  
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem(LEVEL_KEY);
    return saved ? parseInt(saved, 10) : 1;
  });
  
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem(LEVEL_KEY, level.toString());
  }, [level]);

  const showToast = useCallback((message: string) => {
    setToast({ message, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleAIMove = useCallback(async (currentBoard: Player[]): Promise<AIMoveResponse | null> => {
    const availableMoves = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    if (availableMoves.length === 0) return null;

    try {
      const temperature = level <= 2 ? 0.8 : level <= 4 ? 0.3 : 0.0;
      const res = await fetchAIMove({ board: currentBoard, level, temperature });
      return res;
    } catch (err) {
      console.error('AI API failed, falling back to random:', err);
      showToast("네트워크 오류: AI가 무작위로 수를 둡니다.");
      const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
      return { move: randomMove, message: "(시스템 오류... 무작위로 두겠습니다.)" };
    }
  }, [level, showToast]);

  const aiPlayer = userPlaysAs === 'X' ? 'O' : 'X';
  const isUserTurn = isXNext ? userPlaysAs === 'X' : userPlaysAs === 'O';

  const handleClick = useCallback((i: number) => {
    if (board[i] || winningLine || isThinking || !isUserTurn) return;

    const newBoard = [...board];
    newBoard[i] = userPlaysAs;
    setBoard(newBoard);
    setHistory(prev => [{ id: Date.now(), player: userPlaysAs, index: i, label: getCellLabel(i) }, ...prev]);
    setIsXNext(!isXNext);
  }, [board, winningLine, isThinking, isUserTurn, userPlaysAs, isXNext]);

  useEffect(() => {
    const winner = calculateWinner(board);
    if (winner) {
      setWinningLine(winner);
      const isUserWinner = winner.player === userPlaysAs;
      setStatus(isUserWinner ? 'MATCH WON BY YOU' : 'NEURAL AI VICTORY');
      setScores((prev: any) => ({ ...prev, [winner.player as 'X' | 'O']: prev[winner.player as 'X' | 'O'] + 1 }));
      
      if (isUserWinner) {
        setConsecutiveWins((prev) => {
          const next = prev + 1;
          if (next >= 2 && level < 5) {
            setLevel((curr: number) => {
              const newLevel = curr + 1;
              showToast(`2연승 달성! 난이도 Lv.${newLevel}(으)로 상승`);
              return newLevel;
            });
            return 0;
          }
          return next;
        });
      } else {
        setConsecutiveWins(0);
      }
      return;
    }

    if (board.every(sq => sq !== null)) {
      setStatus('STALEMATE DETECTED');
      setScores((prev: any) => ({ ...prev, draws: prev.draws + 1 }));
      setConsecutiveWins(0);
      return;
    }

    if (!isUserTurn) {
      setStatus('AI CALCULATING...');
      setIsThinking(true);
      
      const processAIMove = async () => {
        const res = await handleAIMove(board);
        if (res && res.move !== -1) {
          const newBoard = [...board];
          newBoard[res.move] = aiPlayer;
          setBoard(newBoard);
          setHistory(prev => [{ id: Date.now(), player: aiPlayer, index: res.move, label: getCellLabel(res.move) }, ...prev]);
          setAiMessage(res.message);
          setIsXNext(aiPlayer === 'O'); // If AI is O, next is X (true). If AI is X, next is O (false).
          setIsThinking(false);
        }
      };

      processAIMove();
    } else {
      setStatus(`${isXNext ? 'X' : 'O'}'S TURN`);
    }
  }, [board, isXNext, level, handleAIMove, showToast, isUserTurn, userPlaysAs, aiPlayer]);

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsXNext(true); // X always goes first in a new game
    setIsThinking(false);
    setWinningLine(null);
    setHistory([]);
    setAiMessage("");
    setStatus("X'S TURN");
  }, []);

  const resetScores = useCallback(() => {
    const initialScores = { X: 0, O: 0, draws: 0 };
    setScores(initialScores);
    setLevel(1);
    setConsecutiveWins(0);
    localStorage.removeItem(SCORES_KEY);
    localStorage.removeItem(LEVEL_KEY);
    showToast("점수 및 레벨이 초기화되었습니다.");
  }, [showToast]);

  return {
    board,
    isXNext,
    isThinking,
    winningLine,
    status,
    scores,
    level,
    setLevel,
    toast,
    aiMessage,
    userPlaysAs,
    setUserPlaysAs,
    handleClick,
    resetGame,
    resetScores
  };
}

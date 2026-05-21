/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Circle, RotateCcw, Cpu, User } from 'lucide-react';

type Player = 'X' | 'O' | null;
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface WinningLine {
  indices: number[];
  player: Player;
}

interface SquareProps {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
  index: number;
  key?: React.Key;
}

interface MoveRecord {
  id: number;
  player: 'X' | 'O';
  index: number;
  label: string;
}

const WIN_SEQUENCES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

const getCellLabel = (i: number) => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return `[${row},${col}]`;
};

export default function App() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [winningLine, setWinningLine] = useState<WinningLine | null>(null);
  const [status, setStatus] = useState<string>("X'S TURN");
  const [history, setHistory] = useState<MoveRecord[]>([]);
  const [scores, setScores] = useState(() => {
    const saved = localStorage.getItem('tictactoe-scores');
    return saved ? JSON.parse(saved) : { X: 0, O: 0, draws: 0 };
  });
  const [level, setLevel] = useState(() => {
    const saved = localStorage.getItem('tictactoe-level');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [consecutiveWins, setConsecutiveWins] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('HARD');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  useEffect(() => {
    localStorage.setItem('tictactoe-scores', JSON.stringify(scores));
  }, [scores]);

  useEffect(() => {
    localStorage.setItem('tictactoe-level', level.toString());
  }, [level]);

  const showToast = (message: string) => {
    setToast({ message, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateWinner = (squares: Player[]): WinningLine | null => {
    for (const [a, b, c] of WIN_SEQUENCES) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { indices: [a, b, c], player: squares[a] };
      }
    }
    return null;
  };

  const getAIMove = useCallback(async (squares: Player[]): Promise<number> => {
    const availableMoves = squares.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    
    if (availableMoves.length === 0) return -1;

    // Use Gemini for HARD difficulty
    if (difficulty === 'HARD') {
      try {
        const temperature = level <= 2 ? 0.8 : level <= 4 ? 0.3 : 0.0;
        const response = await fetch('/api/ai-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ board: squares, level, temperature }),
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        if (typeof data.move === 'number' && squares[data.move] === null) {
          return data.move;
        }
      } catch (err) {
        console.error('AI API failed, falling back to random:', err);
      }
    }

    // EASY/MEDIUM or Fallback: Random move
    if (difficulty === 'EASY' || Math.random() < 0.5 || difficulty === 'HARD') {
       return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // Default Medium: check for immediate win/block then random
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }, [difficulty]);

  const handleClick = (i: number) => {
    if (board[i] || winningLine || isThinking || !isXNext) return;

    const newBoard = [...board];
    newBoard[i] = 'X';
    setBoard(newBoard);
    setHistory(prev => [{ id: Date.now(), player: 'X', index: i, label: getCellLabel(i) }, ...prev]);
    setIsXNext(false);
  };

  useEffect(() => {
    const winner = calculateWinner(board);
    if (winner) {
      setWinningLine(winner);
      setStatus(winner.player === 'X' ? 'MATCH WON BY YOU' : 'NEURAL AI VICTORY');
      setScores(prev => ({ ...prev, [winner.player as 'X' | 'O']: prev[winner.player as 'X' | 'O'] + 1 }));
      
      if (winner.player === 'X') {
        setConsecutiveWins(prev => {
          const next = prev + 1;
          if (next >= 2 && level < 5) {
            setLevel(curr => {
              const newLevel = curr + 1;
              showToast(`레벨 업! 난이도 Lv.${newLevel}`);
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
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      setConsecutiveWins(0);
      return;
    }

    if (!isXNext) {
      setStatus('AI CALCULATING...');
      setIsThinking(true);
      
      const processAIMove = async () => {
        const bestMove = await getAIMove(board);
        if (bestMove !== -1) {
          const newBoard = [...board];
          newBoard[bestMove] = 'O';
          setBoard(newBoard);
          setHistory(prev => [{ id: Date.now(), player: 'O', index: bestMove, label: getCellLabel(bestMove) }, ...prev]);
          setIsXNext(true);
          setIsThinking(false);
        }
      };

      processAIMove();
      return;
    } else {
      setStatus("X'S TURN");
    }
  }, [board, isXNext, getAIMove]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setIsThinking(false);
    setWinningLine(null);
    setHistory([]);
    setStatus("X'S TURN");
  };

  const resetScores = () => {
    const initialScores = { X: 0, O: 0, draws: 0 };
    setScores(initialScores);
    setLevel(1);
    setConsecutiveWins(0);
    localStorage.removeItem('tictactoe-scores');
    localStorage.removeItem('tictactoe-level');
    showToast("점수 및 레벨 초기화됨");
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-100 overflow-hidden relative">
      {/* Level Up Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 30, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-[0_0_30px_rgba(79,70,229,0.4)] flex items-center gap-3 border border-indigo-400"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Header Section */}
        <header className="flex justify-between items-center px-2">
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase text-white leading-none">Tic-Tac-Toe</h1>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-1">LV.{level} ADAPTIVE ENGINE</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-zinc-500 uppercase">Records</span>
            <div className="flex gap-3 text-xs font-bold font-mono">
              <span className="text-blue-400">X:{scores.X}</span>
              <span className="text-rose-400">O:{scores.O}</span>
              <span className="text-zinc-400">D:{scores.draws}</span>
            </div>
          </div>
        </header>

        {/* Main Board Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <div className="grid grid-cols-3 gap-3 relative z-10 aspect-square">
            {board.map((value, i) => (
              <Square
                key={i}
                index={i}
                value={value}
                onClick={() => handleClick(i)}
                isWinning={winningLine?.indices.includes(i) || false}
                disabled={!!value || !!winningLine || isThinking}
              />
            ))}
          </div>

          {/* AI Thinking Overlay */}
          <AnimatePresence>
            {isThinking && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 backdrop-blur-[2px] bg-zinc-950/40 flex items-center justify-center rounded-[2rem]"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">Calculating</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 px-2">
          <div className="flex justify-between items-center">
            <div className={`px-4 py-2 rounded-xl border transition-all ${isXNext ? 'bg-blue-500/5 border-blue-500/20' : 'border-transparent opacity-40'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Player X</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={resetScores}
                className="p-2 text-zinc-500 hover:text-rose-500 transition-colors"
                title="Reset All"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            <div className={`px-4 py-2 rounded-xl border transition-all ${!isXNext ? 'bg-rose-500/5 border-rose-500/20' : 'border-transparent opacity-40'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">AI O</span>
              </div>
            </div>
          </div>
        </div>

        {/* Result Modal */}
        <AnimatePresence>
          {(winningLine || board.every(sq => sq !== null)) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 w-full max-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center"
              >
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-lg ${
                  winningLine?.player === 'X' ? 'bg-blue-500 shadow-blue-500/20' : 
                  winningLine?.player === 'O' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-zinc-700'
                }`}>
                  {winningLine?.player === 'X' ? <X size={32} strokeWidth={3} /> : 
                   winningLine?.player === 'O' ? <Circle size={32} strokeWidth={3} /> : <RotateCcw size={32} />}
                </div>

                <h2 className="text-2xl font-black italic tracking-tighter mb-2 uppercase text-white">
                  {status}
                </h2>
                
                <div className="w-full flex justify-between gap-2 mt-6 mb-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <div className="flex-1 bg-zinc-800/50 p-3 rounded-2xl">
                    <p className="mb-1">You</p>
                    <p className="text-lg text-white tabular-nums">{scores.X}</p>
                  </div>
                  <div className="flex-1 bg-zinc-800/50 p-3 rounded-2xl">
                    <p className="mb-1">AI</p>
                    <p className="text-lg text-white tabular-nums">{scores.O}</p>
                  </div>
                  <div className="flex-1 bg-zinc-800/50 p-3 rounded-2xl">
                    <p className="mb-1">Draw</p>
                    <p className="text-lg text-white tabular-nums">{scores.draws}</p>
                  </div>
                </div>

                <button 
                  onClick={resetGame}
                  className="w-full bg-white text-zinc-950 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transform transition-all active:scale-95 hover:bg-zinc-200"
                >
                  New Match
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @keyframes pulse-winner {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-pulse-winner {
          animation: pulse-winner 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

function Square({ value, onClick, isWinning, disabled, index }: SquareProps) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02, backgroundColor: '#27272a' } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`relative aspect-square flex items-center justify-center rounded-3xl transition-all duration-300 border-2
        ${isWinning 
          ? (value === 'X' ? 'bg-blue-500 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)] animate-pulse-winner' : 'bg-rose-500 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse-winner') 
          : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'
        }
        ${!value && !disabled ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <AnimatePresence>
        {value === 'X' && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`font-black text-4xl italic leading-none ${isWinning ? 'text-white' : 'text-blue-400'}`}
          >
            X
          </motion.div>
        )}
        {value === 'O' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`font-black text-4xl italic leading-none ${isWinning ? 'text-white' : 'text-rose-400'}`}
          >
            O
          </motion.div>
        )}
      </AnimatePresence>
      {!value && !disabled && (
        <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
          {getCellLabel(index)}
        </span>
      )}
    </motion.button>
  );
}


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Circle, RotateCcw, AlertTriangle, Settings2, MessageSquareText } from 'lucide-react';
import { useTicTacToe } from './hooks/useTicTacToe';
import { Player } from './utils/game';

interface SquareProps {
  value: Player;
  onClick: () => void;
  isWinning: boolean;
  disabled: boolean;
}

export default function App() {
  const {
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
  } = useTicTacToe();

  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const aiPlayer = userPlaysAs === 'X' ? 'O' : 'X';
  const isUserTurn = isXNext ? userPlaysAs === 'X' : userPlaysAs === 'O';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans text-zinc-100 overflow-hidden relative">
      {/* Toast */}
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
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest mt-1">AI ENGINE MODE</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-zinc-500 uppercase cursor-help" title="Win 2 times in a row to level up automatically!">Records (Hover for tip)</span>
            <div className="flex gap-3 text-xs font-bold font-mono">
              <span className="text-blue-400">X:{scores.X}</span>
              <span className="text-rose-400">O:{scores.O}</span>
              <span className="text-zinc-400">D:{scores.draws}</span>
            </div>
          </div>
        </header>

        {/* AI Message Box (Trash Talk) */}
        <AnimatePresence mode="wait">
          {aiMessage ? (
            <motion.div
              key="message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-zinc-900 border border-indigo-500/30 rounded-2xl p-4 flex gap-3 shadow-[0_0_15px_rgba(79,70,229,0.15)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <MessageSquareText size={20} className="text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-indigo-100 italic">"{aiMessage}"</p>
            </motion.div>
          ) : (
            <div className="h-[58px]" /> /* Placeholder to prevent jump */
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={14} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Game Settings</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Level (1-5)</label>
              <select 
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
              >
                {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>Level {l}</option>)}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">You Play As</label>
              <select 
                value={userPlaysAs}
                onChange={(e) => {
                  setUserPlaysAs(e.target.value as 'X' | 'O');
                  resetGame();
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-indigo-500"
              >
                <option value="X">X (First)</option>
                <option value="O">O (Second)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Board Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-5 pointer-events-none"
               style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <div className="grid grid-cols-3 gap-3 relative z-10 aspect-square">
            {board.map((value, i) => (
              <Square
                key={i}
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
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] animate-pulse">AI is thinking...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4 px-2">
          <div className="flex justify-between items-center">
            {/* User Indicator */}
            <div className={`px-4 py-2 rounded-xl border transition-all ${isUserTurn ? (userPlaysAs === 'X' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-rose-500/10 border-rose-500/30') : 'border-transparent opacity-40'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${userPlaysAs === 'X' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${userPlaysAs === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>You ({userPlaysAs})</span>
              </div>
            </div>

            {/* Reset Stats Button with Confirm */}
            <div className="relative">
              {!showConfirmReset ? (
                <button 
                  onClick={() => setShowConfirmReset(true)}
                  className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex items-center gap-1"
                  title="Reset Scores and Level"
                >
                  <RotateCcw size={14} />
                  <span>Reset Stats</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-1">
                  <span className="text-[10px] text-red-400 font-bold px-2 flex items-center gap-1"><AlertTriangle size={12}/> Sure?</span>
                  <button onClick={() => { resetScores(); setShowConfirmReset(false); }} className="text-[10px] bg-red-500 text-white px-2 py-1 rounded">Yes</button>
                  <button onClick={() => setShowConfirmReset(false)} className="text-[10px] bg-zinc-700 text-white px-2 py-1 rounded">No</button>
                </div>
              )}
            </div>

            {/* AI Indicator */}
            <div className={`px-4 py-2 rounded-xl border transition-all ${!isUserTurn ? (aiPlayer === 'X' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-rose-500/10 border-rose-500/30') : 'border-transparent opacity-40'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${aiPlayer === 'X' ? 'bg-blue-500' : 'bg-rose-500'}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${aiPlayer === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>AI ({aiPlayer})</span>
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
                    <p className="text-lg text-white tabular-nums">{scores[userPlaysAs]}</p>
                  </div>
                  <div className="flex-1 bg-zinc-800/50 p-3 rounded-2xl">
                    <p className="mb-1">AI</p>
                    <p className="text-lg text-white tabular-nums">{scores[aiPlayer]}</p>
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

function Square({ value, onClick, isWinning, disabled }: SquareProps) {
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
    </motion.button>
  );
}

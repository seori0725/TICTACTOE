export type Player = 'X' | 'O' | null;

export interface WinningLine {
  indices: number[];
  player: Player;
}

export const WIN_SEQUENCES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const getCellLabel = (i: number): string => {
  const row = Math.floor(i / 3);
  const col = i % 3;
  return `[${row},${col}]`;
};

export const calculateWinner = (squares: Player[]): WinningLine | null => {
  for (const [a, b, c] of WIN_SEQUENCES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { indices: [a, b, c], player: squares[a] };
    }
  }
  return null;
};

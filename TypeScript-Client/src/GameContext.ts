import GameCanvas from './GameCanvas';

let _canvas: GameCanvas | null = null;
export function setGameCanvas(c: GameCanvas) { _canvas = c; }
export function getGameCanvas(): GameCanvas | null { return _canvas; }

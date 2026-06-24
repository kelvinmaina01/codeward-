declare module 'react-confetti' {
  import { Component } from 'react';

  interface ConfettiProps {
    width?: number;
    height?: number;
    numberOfPieces?: number;
    friction?: number;
    wind?: number;
    gravity?: number;
    colors?: string[];
    opacity?: number;
    recycle?: boolean;
    run?: boolean;
    initialVelocityX?: number;
    initialVelocityY?: number;
    drawShape?: (ctx: CanvasRenderingContext2D) => void;
    onConfettiComplete?: (confetti?: any) => void;
  }

  export default class Confetti extends Component<ConfettiProps> {}
}

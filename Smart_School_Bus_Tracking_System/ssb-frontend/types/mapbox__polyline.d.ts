declare module '@mapbox/polyline' {
  export function decode(encoded: string): Array<[number, number]>;
  export function encode(coordinates: Array<[number, number]>): string;
}


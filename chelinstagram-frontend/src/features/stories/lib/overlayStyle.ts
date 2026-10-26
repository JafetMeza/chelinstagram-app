import { TextOverlay, getFontFamily } from './types';

// Editor, vista previa y visor pintan el texto con ESTAS mismas reglas dentro de un lienzo
// cuadrado con container queries (cqw): así el resultado publicado es idéntico a lo editado.
// w-max + max-w-[85%]: el ancho de corte no depende de dónde esté el texto en el lienzo.
export const OVERLAY_TEXT_CLASS = 'whitespace-pre-wrap break-words w-max max-w-[85%] leading-[1.2]';

export const getOverlayTextStyle = (o: TextOverlay): React.CSSProperties => ({
    color: o.color,
    fontSize: `${o.fontSize}cqw`,
    fontFamily: getFontFamily(o.font),
    fontWeight: o.bold ? 700 : 400,
    fontStyle: o.italic ? 'italic' : 'normal',
    textDecoration: o.underline ? 'underline' : 'none',
    textDecorationThickness: '0.08em',
    textUnderlineOffset: '0.12em',
    textAlign: o.align,
    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
});

export const getOverlayPositionStyle = (o: Pick<TextOverlay, 'x' | 'y'>): React.CSSProperties => ({
    left: `${o.x}%`,
    top: `${o.y}%`,
    transform: 'translate(-50%, -50%)',
});

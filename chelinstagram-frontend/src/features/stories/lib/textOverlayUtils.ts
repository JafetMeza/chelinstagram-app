import { TextOverlay } from './types';

export async function bakeTextOverlaysOntoImage(file: File, overlays: TextOverlay[]): Promise<File> {
    const visible = overlays.filter((o) => o.text.trim());
    if (visible.length === 0) return file;

    const imgUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = imgUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        visible.forEach((o) => {
            const fontPx = (o.fontSize / 100) * canvas.width;
            ctx.font = `700 ${fontPx}px system-ui, -apple-system, sans-serif`;
            ctx.fillStyle = o.color;
            ctx.textAlign = o.align;
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = fontPx * 0.08;
            ctx.shadowOffsetY = fontPx * 0.03;

            // 🟢 LÓGICA DE LA CAJITA (Word Wrap)
            // Simulamos el max-w-[85%] de Tailwind
            const maxLineWidth = canvas.width * 0.85;
            const paragraphs = o.text.split('\n'); // Separamos por saltos de línea explícitos (Enter)
            const wrappedLines: string[] = [];

            paragraphs.forEach(paragraph => {
                const words = paragraph.split(' ');
                let currentLine = words[0] || '';

                for (let i = 1; i < words.length; i++) {
                    const word = words[i];
                    // Medimos cuánto mediría la línea si le agregamos la siguiente palabra
                    const testLine = currentLine + (currentLine ? ' ' : '') + word;
                    const metrics = ctx.measureText(testLine);

                    if (metrics.width > maxLineWidth) {
                        // Se pasó del límite, guardamos la línea actual y empezamos una nueva
                        wrappedLines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Todavía cabe, actualizamos la línea actual
                        currentLine = testLine;
                    }
                }
                wrappedLines.push(currentLine);
            });

            // 🟢 DIBUJAMOS LAS LÍNEAS CALCULADAS
            const lineHeight = fontPx * 1.2;
            const x = (o.x / 100) * canvas.width;

            // Calculamos el inicio en Y para que todo el bloque quede centrado verticalmente
            const startY = (o.y / 100) * canvas.height - ((wrappedLines.length - 1) * lineHeight) / 2;

            wrappedLines.forEach((line, i) => {
                ctx.fillText(line, x, startY + i * lineHeight);
            });
        });

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        if (!blob) throw new Error('Failed to render image');

        return new File([blob], file.name, { type: 'image/jpeg' });
    } finally {
        URL.revokeObjectURL(imgUrl);
    }
}
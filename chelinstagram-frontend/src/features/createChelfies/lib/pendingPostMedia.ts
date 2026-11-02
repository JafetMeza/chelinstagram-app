// Archivo capturado desde la cámara rápida que espera a la pantalla de crear chelfie.
// Vive en memoria: se consume una sola vez al montar la pantalla.
let pendingFile: File | null = null;

export const setPendingPostMedia = (file: File) => {
    pendingFile = file;
};

export const takePendingPostMedia = (): File | null => {
    const file = pendingFile;
    pendingFile = null;
    return file;
};

export const formatChatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'Hoy';
    if (isYesterday) return 'Ayer';

    // Devuelve formato como "1 de septiembre"
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};
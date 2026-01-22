export const processToSquare = (file: File, isDarkMode: boolean = true): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // Define our target square size
                const targetSize = 1080;
                canvas.width = targetSize;
                canvas.height = targetSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('Canvas context failed');

                // 1. Fill the background based on the current theme
                ctx.fillStyle = isDarkMode ? "#000000" : "#FFFFFF";
                ctx.fillRect(0, 0, targetSize, targetSize);

                // 2. Calculate scale to fit (contain) the image within 1080x1080
                const scale = Math.min(targetSize / img.width, targetSize / img.height);

                // 3. Calculate centered coordinates
                const x = (targetSize - img.width * scale) / 2;
                const y = (targetSize - img.height * scale) / 2;

                // 4. Draw the scaled image
                ctx.drawImage(
                    img,
                    0, 0, img.width, img.height, // Source rectangle
                    x, y, img.width * scale, img.height * scale // Destination rectangle
                );

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                }, 'image/jpeg', 0.9);
            };
        };
        reader.onerror = reject;
    });
};
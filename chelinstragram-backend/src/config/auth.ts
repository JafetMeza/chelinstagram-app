// Configuración central de secretos JWT.
// Se leen en tiempo de llamada porque dotenv se carga en config/database.ts.

export const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not defined");
    }
    return secret;
};

let warnedRefreshFallback = false;

export const getRefreshSecret = (): string => {
    if (process.env.REFRESH_SECRET) return process.env.REFRESH_SECRET;

    // Sin REFRESH_SECRET derivamos uno del JWT_SECRET en vez de usar un valor hardcodeado.
    if (!warnedRefreshFallback) {
        console.warn("⚠️ REFRESH_SECRET is not defined, deriving it from JWT_SECRET");
        warnedRefreshFallback = true;
    }
    return `${getJwtSecret()}:refresh`;
};

// Falla al arrancar si la configuración mínima no existe.
export const assertAuthConfig = () => {
    getJwtSecret();
    getRefreshSecret();
};

/// <reference types="vite/client" />

declare module "*.css" {
    const content: { [className: string]: string; };
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_WEATHER_API_KEY: string;
    readonly VITE_API_URL: string;
    // more env variables...
}
// Skeletons del chat. motion-safe: sin pulse si el usuario pidió reducir movimiento.

// Una fila de la lista de conversaciones
const ChatSkeleton = () => (
    <div className="flex items-center gap-3 p-3 motion-safe:animate-pulse" aria-hidden>
        <div className="w-14 h-14 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                <div className="h-2 w-8 bg-zinc-100 dark:bg-zinc-900 rounded" />
            </div>
            <div className="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
    </div>
);

export const ChatListSkeleton = ({ rows = 7 }: { rows?: number; }) => (
    <div className="mt-2" role="status" aria-label="Cargando conversaciones">
        {Array.from({ length: rows }, (_, i) => <ChatSkeleton key={i} />)}
    </div>
);

// Burbujas de una conversación: lados y anchos fijos para que parezca un chat real
const BUBBLES: { mine: boolean; width: string; tall?: boolean; }[] = [
    { mine: false, width: 'w-40' },
    { mine: false, width: 'w-56', tall: true },
    { mine: true, width: 'w-32' },
    { mine: false, width: 'w-24' },
    { mine: true, width: 'w-52', tall: true },
    { mine: true, width: 'w-20' },
    { mine: false, width: 'w-48' },
    { mine: true, width: 'w-36' },
];

const BubbleSkeleton = ({ mine, width, tall }: { mine: boolean; width: string; tall?: boolean; }) => (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
            className={`${width} max-w-[75%] ${tall ? 'h-14' : 'h-9'} rounded-2xl ${mine
                ? 'rounded-br-md bg-blue-200/70 dark:bg-blue-900/40'
                : 'rounded-bl-md bg-zinc-200 dark:bg-zinc-800'}`}
        />
    </div>
);

// count: cuántas burbujas (todas para la carga inicial, 2 para "cargando mensajes viejos")
export const MessagesSkeleton = ({ count = BUBBLES.length }: { count?: number; }) => (
    <div className="space-y-4 motion-safe:animate-pulse" role="status" aria-label="Cargando mensajes">
        {BUBBLES.slice(0, count).map((bubble, i) => <BubbleSkeleton key={i} {...bubble} />)}
    </div>
);

// Avatar + nombre del header mientras no sabemos quién es la otra persona
export const ChatHeaderSkeleton = () => (
    <div className="flex items-center gap-2 motion-safe:animate-pulse" aria-hidden>
        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex flex-col gap-1.5">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-2 w-14 bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
    </div>
);

export default ChatSkeleton;

const ChatSkeleton = () => (
    <div className="flex items-center gap-3 p-3 animate-pulse">
        <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded" />
        </div>
    </div>
);

export default ChatSkeleton;
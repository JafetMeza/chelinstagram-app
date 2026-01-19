const PostSkeleton = () => (
    <div className="w-full pb-4 mb-4 animate-pulse">
        <div className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-800" />
            <div className="w-24 h-3 bg-gray-200 dark:bg-zinc-800 rounded" />
        </div>
        <div className="w-full aspect-square bg-gray-200 dark:bg-zinc-900 rounded-sm" />
        <div className="px-1 py-3 flex gap-4">
            <div className="w-6 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="w-6 h-6 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        </div>
    </div>
);

export default PostSkeleton;
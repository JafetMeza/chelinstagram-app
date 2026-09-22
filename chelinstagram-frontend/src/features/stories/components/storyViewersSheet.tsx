import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye } from '@fortawesome/free-solid-svg-icons';
import { getAvatarSrc } from "@/helpers/imageUtils";
import type { StoryViewer } from "@/types/schema";

interface StoryViewersSheetProps {
    viewers: StoryViewer[];
    loading: boolean;
    onClose: () => void;
}

const StoryViewersSheet = ({ viewers, loading, onClose }: StoryViewersSheetProps) => {
    return (
        <div className="absolute inset-0 z-10 flex flex-col justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-t-2xl max-h-[60%] flex flex-col animate-in slide-in-from-bottom duration-250">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2 text-black dark:text-white font-semibold text-sm">
                        <FontAwesomeIcon icon={faEye} />
                        <span>Viewers {viewers.length > 0 && `(${viewers.length})`}</span>
                    </div>
                    <button type="button" onClick={onClose}>
                        <FontAwesomeIcon icon={faXmark} className="text-lg text-black dark:text-white" />
                    </button>
                </div>

                <div className="w-10 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto -mt-1 mb-2 lg:hidden" />

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-400" />
                        </div>
                    ) : viewers.length === 0 ? (
                        <p className="text-center text-sm text-gray-500 py-8">No views yet</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {viewers.map((v) => (
                                <div key={v.username} className="flex items-center gap-3">
                                    <img
                                        src={getAvatarSrc(v.avatarUrl)}
                                        alt={v.username}
                                        className="w-9 h-9 rounded-full object-cover"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-black dark:text-white truncate">
                                            {v.displayName || v.username}
                                        </span>
                                        <span className="text-[11px] text-zinc-500">@{v.username}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoryViewersSheet;
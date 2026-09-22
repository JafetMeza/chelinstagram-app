import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faEye } from '@fortawesome/free-solid-svg-icons';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetStoryViewersApi, ViewStoryApi } from "@/service/api.service";
import { Url } from "@/service/helpers/urlConstants";
import type { StoryGroup, StoryViewer } from "@/types/schema";
import StoryViewersSheet from './storyViewersSheet';

interface StoryViewerProps {
    group: StoryGroup;
    isOwnStory: boolean;
    onClose: () => void;
}

const StoryViewer = ({ group, isOwnStory, onClose }: StoryViewerProps) => {
    const dispatch = useAppDispatch();
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);

    const stories = group.stories ?? [];
    const [index, setIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [showViewers, setShowViewers] = useState(false);
    const [viewers, setViewers] = useState<StoryViewer[]>([]);
    const [loadingViewers, setLoadingViewers] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const rafRef = useRef<number | null>(null);
    const startRef = useRef<number>(0);
    const elapsedMsRef = useRef<number>(0); // 🟢 how far into the current story's timer we already are
    const viewedRef = useRef<Set<string>>(new Set());

    const current = stories[index];
    const paused = showViewers; // 🟢 single source of truth: sheet open => paused

    const goNext = () => {
        if (index < stories.length - 1) setIndex(i => i + 1);
        else onClose();
    };

    const goPrev = () => {
        if (index > 0) setIndex(i => i - 1);
    };

    // Mark as viewed once per story per session
    useEffect(() => {
        if (!current?.id || isOwnStory) return;
        if (viewedRef.current.has(current.id)) return;
        viewedRef.current.add(current.id);
        dispatch(PostApi([current.id], ViewStoryApi));
    }, [current?.id, isOwnStory, dispatch]);

    // Reset timer state whenever the story itself changes
    useEffect(() => {
        const resetProgress = () => {
            setProgress(0);
            elapsedMsRef.current = 0;
            setShowViewers(false); // closing the sheet on story change avoids a stale-viewers sheet on the next story
        };
        resetProgress();
    }, [index]);

    // Progress driver: runs only while not paused; images use rAF, video drives itself via onTimeUpdate
    useEffect(() => {
        if (current?.mediaType === 'VIDEO') {
            if (paused) videoRef.current?.pause();
            else videoRef.current?.play().catch(() => { });
            return;
        }

        if (paused) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            return;
        }

        const durationMs = (current?.duration ?? 5) * 1000;
        startRef.current = performance.now() - elapsedMsRef.current; // resume from where we left off

        const tick = (now: number) => {
            const elapsed = now - startRef.current;
            elapsedMsRef.current = elapsed;
            const pct = Math.min(100, (elapsed / durationMs) * 100);
            setProgress(pct);
            if (pct >= 100) goNext();
            else rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, paused]);

    const handleVideoTimeUpdate = () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        setProgress((video.currentTime / video.duration) * 100);
    };

    useEffect(() => {
        if (ok && apiMethod === GetStoryViewersApi.name && data) {
            const onSetViewers = () => {
                setViewers(data as StoryViewer[]);
                setLoadingViewers(false);
            };
            onSetViewers();
        }
    }, [ok, data, apiMethod]);

    const handleOpenViewers = () => {
        if (!current?.id) return;
        setLoadingViewers(true);
        setViewers([]);
        setShowViewers(true);
        dispatch(GetApi([current.id], GetStoryViewersApi));
    };

    if (!current) return null;

    const mediaUrl = current.mediaUrl?.startsWith('http') ? current.mediaUrl : `${Url}${current.mediaUrl}`;

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex gap-1 p-2 pt-3">
                {stories.map((s, i) => (
                    <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white"
                            style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }}
                        />
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between px-3 pb-2 text-white">
                <span className="font-semibold text-sm">{group.author?.username}</span>
                <button type="button" onClick={onClose}>
                    <FontAwesomeIcon icon={faXmark} className="text-xl" />
                </button>
            </div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {current.mediaType === 'VIDEO' ? (
                    <video
                        ref={videoRef}
                        src={mediaUrl}
                        className="max-w-full max-h-full"
                        autoPlay
                        playsInline
                        onTimeUpdate={handleVideoTimeUpdate}
                        onEnded={goNext}
                    />
                ) : (
                    <img src={mediaUrl} className="max-w-full max-h-full" alt="" />
                )}

                {!showViewers && (
                    <>
                        <button type="button" className="absolute inset-y-0 left-0 w-1/3" onClick={goPrev} aria-label="Previous story" />
                        <button type="button" className="absolute inset-y-0 right-0 w-1/3" onClick={goNext} aria-label="Next story" />
                    </>
                )}

                {isOwnStory && (
                    <button
                        type="button"
                        onClick={handleOpenViewers}
                        className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center gap-2 text-white/80 text-sm bg-linear-to-t from-black/60 to-transparent"
                    >
                        <FontAwesomeIcon icon={faEye} />
                        <span>Tap to see who viewed this story</span>
                    </button>
                )}

                {showViewers && (
                    <StoryViewersSheet
                        viewers={viewers}
                        loading={loadingViewers}
                        onClose={() => setShowViewers(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default StoryViewer;
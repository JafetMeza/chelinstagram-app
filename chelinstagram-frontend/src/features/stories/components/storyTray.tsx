import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faCircleDot, faImage, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { ROUTES } from '@/routes';
import ActionSheet from '@/components/ui/actionSheet';
import { MEDIA_SOURCE_OPTIONS, useMediaPicker } from '@/components/ui/useMediaPicker';
import { setPendingPostMedia } from '@/features/createChelfies/lib/pendingPostMedia';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { CreateStoryApi, GetStoriesApi } from "@/service/api.service";
import { getAvatarSrc, compressAndUpload } from "@/helpers/imageUtils";
import { processToSquare } from "@/features/createChelfies/lib/imageProcessing";
import VideoEditor, { CropData } from '@/components/ui/videoEditor';
import StoryLifetimePicker from './storyLifetimePicker';
import StoryTextEditor from './storyTextEditor';
import StoryViewer from './storyViewer';
import { TextOverlay } from '../lib/types';
import type { StoryGroup } from "@/types/schema";

type CreateStep = 'idle' | 'trimming' | 'texting' | 'lifetime';

interface VideoMeta {
    startTime: number;
    endTime: number;
    isMuted: boolean;
    crop: CropData;
}

const StoryTray = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector(state => state.authData);
    const { ok, data, apiMethod } = useAppSelector(state => state.apiData);
    const theme = useAppSelector(state => state.theme);

    const [groups, setGroups] = useState<StoryGroup[]>([]);
    const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);
    const navigate = useNavigate();
    const [storySourceOpen, setStorySourceOpen] = useState(false);
    // Foto de la cámara rápida: espera a que el usuario elija story o post
    const [quickCapture, setQuickCapture] = useState<File | null>(null);

    const [createStep, setCreateStep] = useState<CreateStep>('idle');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState<string | null>(null);
    const [pendingType, setPendingType] = useState<'image' | 'video' | null>(null);
    const [videoMeta, setVideoMeta] = useState<VideoMeta | null>(null);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        dispatch(GetApi([], GetStoriesApi));
    }, [dispatch]);

    useEffect(() => {
        if (ok && apiMethod === GetStoriesApi.name && data) {
            const onSetGroups = () => {
                setGroups(data as StoryGroup[]);
            };
            onSetGroups();
        }
    }, [ok, data, apiMethod]);

    const resetCreationState = () => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        setCreateStep('idle');
        setPendingFile(null);
        setPendingPreview(null);
        setPendingType(null);
        setVideoMeta(null);
        setTextOverlays([]);
        setUploading(false);
    };

    useEffect(() => {
        if (ok && apiMethod === CreateStoryApi.name) {
            const onRefreshStories = () => {
                resetCreationState();
                dispatch(GetApi([], GetStoriesApi)); // refreshes your own group so the new story appears immediately
            };
            onRefreshStories();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ok, apiMethod, dispatch]);

    const ownGroup = groups.find(g => g.author?.username === user?.username);
    const otherGroups = groups.filter(g => g.author?.username !== user?.username);

    const processSelectedFile = async (file: File) => {
        const isVideo = file.type.startsWith('video/');
        setPendingType(isVideo ? 'video' : 'image');
        setTextOverlays([]);

        if (isVideo) {
            setPendingFile(file);
            setPendingPreview(URL.createObjectURL(file));
            setCreateStep('trimming');
            return;
        }

        try {
            const isDarkMode = theme === 'dark';
            const squaredBlob = await processToSquare(file, isDarkMode);
            const squaredFile = new File([squaredBlob], file.name, { type: 'image/jpeg' });
            const finalFile = await compressAndUpload(squaredFile);

            setPendingFile(finalFile);
            setPendingPreview(URL.createObjectURL(finalFile));
            setCreateStep('texting'); // 🟢 go pick text before duration
        } catch (err) {
            console.error('Error processing story photo', err);
            alert('Something went wrong preparing your story.');
        }
    };

    const { pick, input: fileInput } = useMediaPicker(processSelectedFile);
    const { pick: pickQuick, input: quickInput } = useMediaPicker(setQuickCapture);

    const handleQuickPublishAsStory = () => {
        const file = quickCapture;
        setQuickCapture(null);
        if (file) void processSelectedFile(file);
    };

    const handleQuickPublishAsPost = () => {
        if (!quickCapture) return;
        setPendingPostMedia(quickCapture);
        setQuickCapture(null);
        navigate(ROUTES.CREATE);
    };

    const handleVideoTrimmed = (startTime: number, endTime: number, isMuted: boolean, crop: CropData) => {
        setVideoMeta({ startTime, endTime, isMuted, crop });
        setCreateStep('texting'); // 🟢 go pick text before duration
    };

    // 🟢 NEW: text step confirmed, move on to picking the story lifetime
    const handleTextConfirm = (overlays: TextOverlay[]) => {
        setTextOverlays(overlays);
        setCreateStep('lifetime');
    };

    const handleLifetimeConfirm = async (lifetimeMinutes: number) => {
        if (!pendingFile) return;

        setUploading(true);

        const formData = new FormData();
        formData.append('media', pendingFile);
        formData.append('lifetimeMinutes', lifetimeMinutes.toString());

        if (pendingType === 'video' && videoMeta) {
            formData.append('startTime', videoMeta.startTime.toString());
            formData.append('endTime', videoMeta.endTime.toString());
            formData.append('isMuted', videoMeta.isMuted.toString());
            formData.append('cropX', videoMeta.crop.x.toString());
            formData.append('cropY', videoMeta.crop.y.toString());
            formData.append('cropSize', videoMeta.crop.size.toString());
        }

        // El texto ya no se "quema" en la imagen: se guarda como datos y el visor lo pinta
        // con el mismo componente que el editor (imagen y video), así queda idéntico.
        if (textOverlays.length > 0) {
            formData.append('textOverlays', JSON.stringify(textOverlays));
        }

        dispatch(PostApi([formData], CreateStoryApi));
    };

    return (
        <>
            <div className="flex gap-4 overflow-x-auto pb-3 px-3 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {/* Cámara rápida: foto y destino (story o post) */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => pickQuick('photo')}
                        className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center hover:scale-105 transition-transform"
                        aria-label="Cámara rápida"
                    >
                        <FontAwesomeIcon icon={faCamera} className="text-xl text-gray-600 dark:text-zinc-300" />
                    </button>
                    <span className="text-[11px] text-black dark:text-white max-w-16 truncate">Cámara</span>
                </div>

                <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="relative w-16 h-16">
                        <button
                            type="button"
                            onClick={() => ownGroup && setViewingGroup(ownGroup)}
                            disabled={!ownGroup}
                            className="w-full h-full block"
                        >
                            <div className={`w-full h-full rounded-full p-0.5 ${ownGroup?.hasUnseen
                                ? 'bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600'
                                : 'bg-gray-200 dark:bg-zinc-700'
                                }`}>
                                <img
                                    src={getAvatarSrc(user?.avatarUrl)}
                                    alt="Your story"
                                    className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
                                />
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStorySourceOpen(true)}
                            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 border-2 border-white dark:border-black flex items-center justify-center hover:scale-110 transition-transform"
                            aria-label="Add story"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-[9px] text-white" />
                        </button>
                    </div>
                    <span className="text-[11px] text-black dark:text-white max-w-16 truncate">
                        {ownGroup ? 'Your story' : 'Add story'}
                    </span>
                </div>

                {otherGroups.map((group) => (
                    <button
                        key={group.author?.username}
                        type="button"
                        onClick={() => setViewingGroup(group)}
                        className="flex flex-col items-center gap-1 shrink-0"
                    >
                        <div className={`w-16 h-16 rounded-full p-0.5 ${group.hasUnseen
                            ? 'bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600'
                            : 'bg-gray-200 dark:bg-zinc-700'
                            }`}>
                            <img
                                src={getAvatarSrc(group.author?.avatarUrl)}
                                alt={group.author?.username}
                                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-black"
                            />
                        </div>
                        <span className="text-[11px] text-black dark:text-white max-w-16 truncate">
                            {group.author?.username}
                        </span>
                    </button>
                ))}
            </div>

            {fileInput}
            {quickInput}

            {storySourceOpen && (
                <ActionSheet
                    title="Nuevo estado"
                    options={MEDIA_SOURCE_OPTIONS}
                    onSelect={(source) => {
                        setStorySourceOpen(false);
                        pick(source);
                    }}
                    onClose={() => setStorySourceOpen(false)}
                />
            )}

            {quickCapture && (
                <ActionSheet
                    title="¿Publicar como story o como post?"
                    options={[
                        { value: 'story', label: 'Story', icon: faCircleDot },
                        { value: 'post', label: 'Post (Chelfie)', icon: faImage },
                    ]}
                    onSelect={(destination) => destination === 'story' ? handleQuickPublishAsStory() : handleQuickPublishAsPost()}
                    onClose={() => setQuickCapture(null)}
                />
            )}

            {createStep === 'trimming' && pendingPreview && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex items-center p-4 border-b border-zinc-800 text-white">
                        <button onClick={resetCreationState}>
                            <FontAwesomeIcon icon={faXmark} className="text-xl" />
                        </button>
                        <h1 className="flex-1 text-center font-bold">Trim Video</h1>
                        <div className="w-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <VideoEditor videoSrc={pendingPreview} onTrim={handleVideoTrimmed} />
                    </div>
                </div>
            )}

            {createStep === 'texting' && pendingPreview && pendingType && (
                <StoryTextEditor
                    previewUrl={pendingPreview}
                    mediaType={pendingType}
                    crop={videoMeta?.crop}
                    initialOverlays={textOverlays}
                    onConfirm={handleTextConfirm}
                    onCancel={resetCreationState}
                />
            )}

            {createStep === 'lifetime' && pendingPreview && pendingType && (
                <StoryLifetimePicker
                    previewUrl={pendingPreview}
                    mediaType={pendingType}
                    uploading={uploading}
                    crop={videoMeta?.crop}
                    textOverlays={textOverlays}
                    onEditText={() => setCreateStep('texting')}
                    onConfirm={handleLifetimeConfirm}
                    onCancel={resetCreationState}
                />
            )}

            {viewingGroup && (
                <StoryViewer
                    group={viewingGroup}
                    isOwnStory={viewingGroup.author?.username === user?.username}
                    onClose={() => setViewingGroup(null)}
                />
            )}
        </>
    );
};

export default StoryTray;
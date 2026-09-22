import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { PostApi } from "@/redux/middleware/httpMethod.mid";
import { CreatePostApi } from "@/service/api.service";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faChevronLeft, faMapMarkerAlt, faCircleNotch, faVideo, faVolumeMute, faVolumeUp, faCut } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from "@/routes";
import { processToSquare } from "../lib/imageProcessing";
import { compressAndUpload, getAvatarSrc } from "@/helpers/imageUtils";
import VideoEditor, { CropData } from '@/components/ui/videoEditor';

const CreateChelfie = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, apiMethod, ok } = useAppSelector(state => state.apiData);
    const { user } = useAppSelector(state => state.authData);
    const theme = useAppSelector(state => state.theme);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isVideo, setIsVideo] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);
    const [caption, setCaption] = useState("");
    const [location, setLocation] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 🟢 NUEVO: Referencia para controlar el video del preview
    const previewVideoRef = useRef<HTMLVideoElement>(null);

    const [isEditingVideo, setIsEditingVideo] = useState<boolean>(false);
    const [trimStart, setTrimStart] = useState<number | null>(null);
    const [trimEnd, setTrimEnd] = useState<number | null>(null);
    const [cropData, setCropData] = useState<CropData | null>(null);

    useEffect(() => {
        if (ok && apiMethod === CreatePostApi.name) {
            navigate(ROUTES.HOME);
        }
    }, [ok, apiMethod, navigate]);

    // 🟢 NUEVO: Efecto para que al volver del editor, el video empiece donde cortaste
    useEffect(() => {
        if (!isEditingVideo && isVideo && previewVideoRef.current && trimStart !== null) {
            previewVideoRef.current.currentTime = trimStart;
            previewVideoRef.current.play().catch(console.error);
        }
    }, [isEditingVideo, isVideo, trimStart]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        try {
            if (preview) {
                URL.revokeObjectURL(preview);
            }

            const fileIsVideo = selectedFile.type.startsWith('video/');
            setIsVideo(fileIsVideo);

            if (fileIsVideo) {
                if (selectedFile.size > 100 * 1024 * 1024) {
                    alert("Por favor selecciona un video que pese menos de 100MB.");
                    return;
                }
                setFile(selectedFile);
                setPreview(URL.createObjectURL(selectedFile));
                setIsMuted(true);
                setIsEditingVideo(true);
                setTrimStart(null);
                setTrimEnd(null);
            } else {
                const isDarkMode = theme === "dark";
                const squaredBlob = await processToSquare(selectedFile, isDarkMode);
                const squaredFile = new File([squaredBlob], selectedFile.name, { type: 'image/jpeg' });
                const finalCompressedFile = await compressAndUpload(squaredFile);

                setFile(finalCompressedFile);
                setPreview(URL.createObjectURL(finalCompressedFile));
            }

        } catch (error) {
            console.error("Error processing media", error);
            alert("Oops! Something went wrong while preparing your media.");
        }
    };

    const handleVideoTrimmed = (start: number, end: number, mutedState: boolean, crop: CropData) => {
        setTrimStart(start);
        setTrimEnd(end);
        setIsMuted(mutedState);
        setCropData(crop);
        setIsEditingVideo(false);
    };

    const handleShare = () => {
        if (!file) return;
        const formData = new FormData();
        formData.append("media", file);
        formData.append("caption", caption);
        formData.append("location", location);

        if (isVideo && trimStart !== null && trimEnd !== null) {
            formData.append("startTime", trimStart.toString());
            formData.append("endTime", trimEnd.toString());
            formData.append("isMuted", isMuted.toString());
            if (cropData) {
                formData.append("cropX", cropData.x.toString());
                formData.append("cropY", cropData.y.toString());
                formData.append("cropSize", cropData.size.toString());
            }
        }

        dispatch(PostApi([formData], CreatePostApi));
    };

    // 🟢 NUEVO: Función para mantener el video atrapado en el recorte
    const handlePreviewTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
        if (trimStart !== null && trimEnd !== null) {
            const video = e.currentTarget;
            if (video.currentTime >= trimEnd) {
                video.currentTime = trimStart; // Lo regresamos al inicio del recorte
            } else if (video.currentTime < trimStart) {
                video.currentTime = trimStart; // Previene que empiece antes del recorte
            }
        }
    };

    if (isEditingVideo && preview) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="flex items-center p-4 border-b border-zinc-800 text-white">
                    <button onClick={() => { setIsEditingVideo(false); setPreview(null); setFile(null); }}>
                        <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                    </button>
                    <h1 className="flex-1 text-center font-bold">Trim Video</h1>
                </div>
                <div className="flex-1 overflow-hidden">
                    <VideoEditor videoSrc={preview} onTrim={handleVideoTrimmed} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-full bg-white dark:bg-black text-black dark:text-white overflow-hidden">

            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <FontAwesomeIcon icon={faCircleNotch} className="text-4xl text-blue-500 animate-spin mb-4" />
                    <p className="font-semibold text-sm">Sharing your Chelfie...</p>
                </div>
            )}

            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
                <button onClick={() => preview ? setPreview(null) : navigate(-1)} disabled={loading}>
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <h1 className="font-bold text-lg">New Chelfie</h1>
                <button
                    onClick={handleShare}
                    disabled={!file || loading}
                    className="text-blue-500 font-bold text-lg disabled:opacity-50"
                >
                    Share
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {!preview ? (
                    <div className="flex flex-col items-center justify-center h-64 mt-20">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                        >
                            <FontAwesomeIcon icon={faImage} className="text-3xl text-gray-500" />
                        </div>
                        <p className="mt-4 font-semibold text-center">Pick a beautiful moment <br /> (Photo or Video)</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg font-bold"
                        >
                            Select from Gallery
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-right duration-300">
                        <div className="w-full aspect-square bg-black flex items-center justify-center relative group">
                            {isVideo ? (
                                <>
                                    <video
                                        ref={previewVideoRef} // 🟢 Asignamos la referencia
                                        src={preview}
                                        className="w-full h-full object-contain"
                                        autoPlay
                                        muted={isMuted}
                                        loop
                                        playsInline
                                        onTimeUpdate={handlePreviewTimeUpdate} // 🟢 Aplicamos la regla del recorte
                                    />
                                    <div className="absolute top-3 right-3 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2">
                                        <FontAwesomeIcon icon={faVideo} className="text-white text-xs" />
                                        {trimStart !== null && trimEnd !== null && (
                                            <span className="text-white text-xs font-bold">{(trimEnd - trimStart).toFixed(1)}s</span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="absolute bottom-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white w-8 h-8 flex items-center justify-center rounded-full transition-all z-20"
                                    >
                                        <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} className="text-xs" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingVideo(true)}
                                        className="absolute bottom-3 left-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white w-8 h-8 flex items-center justify-center rounded-full transition-all z-20"
                                    >
                                        <FontAwesomeIcon icon={faCut} className="text-xs" />
                                    </button>
                                </>
                            ) : (
                                <img
                                    src={preview}
                                    className="w-full h-full object-contain"
                                    alt="Preview"
                                />
                            )}
                        </div>

                        <div className="p-4 flex flex-col gap-4 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex gap-4">
                                <img
                                    src={getAvatarSrc(user?.avatarUrl)}
                                    className="w-10 h-10 rounded-full object-cover"
                                    alt="User"
                                />
                                <textarea
                                    placeholder="Write a caption..."
                                    className="flex-1 bg-transparent outline-none py-2 resize-none text-sm"
                                    rows={3}
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="flex items-center gap-3 border-t border-gray-50 dark:border-zinc-900 pt-4 pb-2">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Add location"
                                    className="flex-1 bg-transparent outline-none text-sm text-black dark:text-white"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/mp4,video/quicktime,video/webm"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default CreateChelfie;
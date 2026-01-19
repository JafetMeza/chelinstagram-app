import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { PostApi } from "@/redux/middleware/httpMethod.mid";
import { CreatePostApi } from "@/service/api.service";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faImage, faChevronLeft, faMapMarkerAlt, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from "@/routes";

const CreateChelfie = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading, apiMethod, ok } = useAppSelector(state => state.apiData);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [location, setLocation] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ok && apiMethod === CreatePostApi.name) {
            navigate(ROUTES.HOME);
        }
    }, [ok, apiMethod, navigate]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleShare = () => {
        if (!file) return;
        const formData = new FormData();
        formData.append("image", file);
        formData.append("caption", caption);
        formData.append("location", location);

        dispatch(PostApi([formData], CreatePostApi));
    };

    return (
        <div className="relative flex flex-col h-full bg-white dark:bg-black text-black dark:text-white overflow-hidden">

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <FontAwesomeIcon icon={faCircleNotch} className="text-4xl text-blue-500 animate-spin mb-4" />
                    <p className="font-semibold text-sm">Sharing your Chelfie...</p>
                </div>
            )}

            {/* Header Navigation */}
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
                    /* Step 1: Selection */
                    <div className="flex flex-col items-center justify-center h-64 mt-20">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-24 h-24 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                        >
                            <FontAwesomeIcon icon={faImage} className="text-3xl text-gray-500" />
                        </div>
                        <p className="mt-4 font-semibold">Pick a beautiful moment</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-6 bg-blue-500 text-white px-6 py-2 rounded-lg font-bold"
                        >
                            Select from Gallery
                        </button>
                    </div>
                ) : (
                    /* Step 2: Caption & Preview */
                    <div className="animate-in fade-in slide-in-from-right duration-300">
                        <div className="w-full aspect-square bg-gray-100 dark:bg-zinc-900">
                            <img src={preview} className="w-full h-full object-cover" alt="Preview" />
                        </div>

                        <div className="p-4 flex flex-col gap-4 border-b border-gray-100 dark:border-zinc-800">
                            <div className="flex gap-4">
                                <img
                                    src="/default-avatar.png"
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
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default CreateChelfie;
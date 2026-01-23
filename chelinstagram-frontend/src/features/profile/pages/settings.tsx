import { useState, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi, PostApi } from "@/redux/middleware/httpMethod.mid";
import { GetMyProfileApi, UpdateProfileApi } from "@/service/api.service";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faCamera, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from "@/types/schema";
import { compressAndUpload, getAvatarSrc } from "@/helpers/imageUtils";

const Settings = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { data, loading, ok, apiMethod } = useAppSelector(state => state.apiData);

    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 1. Fetch current profile data on mount
    useEffect(() => {
        dispatch(GetApi([], GetMyProfileApi));
    }, [dispatch]);

    // 2. Populate fields when data arrives
    useEffect(() => {
        if (ok && apiMethod === GetMyProfileApi.name && data) {
            const profile = data as UserProfile;
            console.log(profile);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDisplayName(profile.displayName || "");
            setBio(profile.bio || "");
            if (profile.avatarUrl) setPreview(getAvatarSrc(profile.avatarUrl));
        }

        if (ok && apiMethod === UpdateProfileApi.name) {
            navigate(-1); // Go back to profile after success
        }
    }, [ok, data, apiMethod, navigate]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];

        if (selectedFile) {
            // 1. If there's an existing preview, revoke it to save memory
            if (preview) {
                URL.revokeObjectURL(preview);
            }

            // 2. Compress the file using your utility
            const compressedFile = await compressAndUpload(selectedFile);

            // 3. Update state with the small file
            setFile(compressedFile);

            // 4. Create a new preview URL
            setPreview(URL.createObjectURL(compressedFile));
        }
    };

    const handleSave = () => {
        const formData = new FormData();
        formData.append("displayName", displayName);
        formData.append("bio", bio);
        if (file) formData.append("avatar", file);

        dispatch(PostApi([formData], UpdateProfileApi));
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-black text-black dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b dark:border-zinc-800 sticky top-0 bg-white dark:bg-black z-10">
                <button onClick={() => navigate(-1)} className="p-1">
                    <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
                </button>
                <h1 className="font-bold">Edit Profile</h1>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="text-blue-500 font-bold disabled:opacity-50"
                >
                    {loading ? <FontAwesomeIcon icon={faCircleNotch} className="animate-spin" /> : "Done"}
                </button>
            </div>

            <div className="p-6 flex flex-col items-center gap-8">
                {/* Avatar Edit */}
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 dark:border-zinc-800 bg-zinc-100">
                        <img
                            src={preview || '/default-avatar.png'}
                            className="w-full h-full object-cover"
                            alt="Profile"
                        />
                    </div>
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-full">
                        <FontAwesomeIcon icon={faCamera} className="text-white text-xl" />
                    </div>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-500 text-sm font-bold -mt-4"
                >
                    Change profile photo
                </button>

                {/* Form Fields */}
                <div className="w-full space-y-6">
                    <div className="flex flex-col gap-1 border-b dark:border-zinc-800 pb-2">
                        <label className="text-xs text-zinc-500 font-bold uppercase">Name</label>
                        <input
                            type="text"
                            className="bg-transparent outline-none text-sm w-full"
                            placeholder="Your display name"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1 border-b dark:border-zinc-800 pb-2">
                        <label className="text-xs text-zinc-500 font-bold uppercase">Bio</label>
                        <textarea
                            className="bg-transparent outline-none text-sm w-full resize-none"
                            placeholder="Tell Chela something nice..."
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
};

export default Settings;
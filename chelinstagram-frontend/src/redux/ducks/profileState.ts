import { Post } from "@/types/schema";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

interface ProfileState {
    posts: Post[];
    currentPage: number;
    hasMore: boolean;
    scrollPosition: number;
    currentUsername: string | null; // Crucial para saber si los datos son del usuario correcto
}

const initialState: ProfileState = {
    posts: [],
    currentPage: 1,
    hasMore: true,
    scrollPosition: 0,
    currentUsername: null,
};

const profileSlice = createSlice({
    name: "profile", // Corregido de "theme" a "profile"
    initialState,
    reducers: {
        // Almacena un batch de posts (una página completa)
        setProfilePosts(state, action: PayloadAction<{ posts: Post[]; username: string; page: number; hasMore: boolean; }>) {
            const { posts, username, page, hasMore } = action.payload;

            // Si cambiamos de usuario, reseteamos el array
            if (state.currentUsername !== username) {
                state.posts = posts;
                state.currentUsername = username;
            } else {
                // Si es el mismo usuario, combinamos evitando duplicados por ID
                const existingIds = new Set(state.posts.map(p => p.id));
                const uniqueNewPosts = posts.filter(p => !existingIds.has(p.id));
                state.posts = [...state.posts, ...uniqueNewPosts];
            }

            state.currentPage = page;
            state.hasMore = hasMore;
        },

        // Actualiza un post específico (Like, Edit, Pin)
        updatePostInState(state, action: PayloadAction<Partial<Post> & { id: string; }>) {
            const index = state.posts.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.posts[index] = { ...state.posts[index], ...action.payload };
            }
        },

        // Elimina un post (Delete)
        removePostFromState(state, action: PayloadAction<string>) {
            state.posts = state.posts.filter(p => p.id !== action.payload);
        },

        setScrollPosition(state, action: PayloadAction<number>) {
            state.scrollPosition = action.payload;
        },

        // Limpia todo (útil para cuando sales del perfil)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        clearProfileState(_) {
            return initialState;
        }
    },
});

export const {
    setProfilePosts,
    updatePostInState,
    removePostFromState,
    setScrollPosition,
    clearProfileState
} = profileSlice.actions;

export default profileSlice.reducer;
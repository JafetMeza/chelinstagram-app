/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { GetApi } from "@/redux/middleware/httpMethod.mid";
import { Post, PostsUserDetailData } from "@/types/schema";
import { ApiMethodType } from "@/redux/middleware/httpMethod.mid";

interface UseInfiniteScrollProps<T, Params extends any[]> {
    apiService: ApiMethodType<T, Params>;
    extraParams?: string[];
    limit?: number;
    initialPage?: number;
    initialPosts?: Post[];
    initialHasMore?: boolean;
}

export const useInfiniteScroll = <T, Params extends any[]>({
    apiService,
    extraParams = [],
    limit = 10,
    initialPage = 1,
    initialPosts = [],
    initialHasMore = true
}: UseInfiniteScrollProps<T, Params>) => {
    const dispatch = useAppDispatch();
    const { ok, data, loading, apiMethod } = useAppSelector(state => state.apiData);

    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [page, setPage] = useState(initialPage);
    const [hasMore, setHasMore] = useState(initialHasMore);

    const isFetching = useRef(false);
    // Usamos un ref para rastrear cuál fue la última página que pedimos exitosamente
    const lastFetchedPage = useRef(initialPosts.length > 0 ? initialPage : 0);

    const currentContext = JSON.stringify(extraParams);

    // 1. LÓGICA DE RESETEO (Solo si cambia el contexto/usuario)
    useEffect(() => {
        // Si el contexto cambia, reseteamos todo al estado inicial real
        const reset = () => {
            setPosts(initialPosts);
            setPage(initialPage);
            setHasMore(initialHasMore);
        };
        reset();
        lastFetchedPage.current = initialPosts.length > 0 ? initialPage : 0;
        isFetching.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentContext]);

    // 2. DISPARADOR DE API
    useEffect(() => {
        // 🟢 CLAVE: Solo disparamos si la página actual NO ha sido pedida aún
        if (page > lastFetchedPage.current && hasMore && !isFetching.current) {
            isFetching.current = true;
            const queryParams = [`page=${page}&limit=${limit}`, ...extraParams];
            dispatch(GetApi(queryParams, apiService as any));
        }
    }, [page, currentContext, limit, hasMore, apiService, dispatch, extraParams]);

    // 3. SINCRONIZACIÓN DE DATA
    useEffect(() => {
        if (!ok || apiMethod !== apiService.name) return;

        const response = data as PostsUserDetailData;

        if (response && !Array.isArray(response)) {
            const newPosts = response.data || [];
            const meta = response.meta;

            // Verificamos que la data que llegó sea la que pedimos
            if (meta?.page === page) {
                const syncronizePost = () => {
                    setPosts(prev => {
                        if (page === 1) return newPosts;
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNew = newPosts.filter(p => !existingIds.has(p.id));
                        return [...prev, ...uniqueNew];
                    });
                    setHasMore(meta?.hasNextPage ?? false);
                };
                syncronizePost();
                lastFetchedPage.current = page; // Marcamos página como completada
            }
        }
        isFetching.current = false;
    }, [ok, data, apiMethod, apiService.name, page]);

    // 4. INTERSECTION OBSERVER
    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLElement | null) => {
        if (loading || isFetching.current) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isFetching.current) {
                // Incrementamos página: esto disparará el useEffect de la API
                setPage(prev => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const updateLocalPost = (postId: string, newData: Partial<Post>) => {
        setPosts(current => current.map(p => p.id === postId ? { ...p, ...newData } : p));
    };

    return {
        posts,
        loading,
        hasMore,
        lastElementRef,
        updateLocalPost,
        page,
        setPage,
        setPosts
    };
};
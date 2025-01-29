/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDefaultReaderSettings } from '@/modules/reader/services/ReaderSettingsMetadata.ts';
import { useNavBarContext } from '@/modules/navigation-bar/contexts/NavbarContext.tsx';
import { ReaderOverlay } from '@/modules/reader/components/overlay/ReaderOverlay.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GetChaptersReaderQuery, GetMangaReaderQuery } from '@/lib/graphql/generated/graphql.ts';
import { GET_MANGA_READER } from '@/lib/graphql/queries/MangaQuery.ts';
import { LoadingPlaceholder } from '@/modules/core/components/placeholder/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/modules/core/components/placeholder/EmptyViewAbsoluteCentered.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { userReaderStatePagesContext } from '@/modules/reader/contexts/state/ReaderStatePagesContext.tsx';
import { GET_CHAPTERS_READER } from '@/lib/graphql/queries/ChapterQuery.ts';
import { TapZoneLayout } from '@/modules/reader/components/TapZoneLayout.tsx';
import { useReaderOverlayContext } from '@/modules/reader/contexts/ReaderOverlayContext.tsx';
import { ReaderRGBAFilter } from '@/modules/reader/components/ReaderRGBAFilter.tsx';
import { useReaderStateSettingsContext } from '@/modules/reader/contexts/state/ReaderStateSettingsContext.tsx';
import { useReaderStateMangaContext } from '@/modules/reader/contexts/state/ReaderStateMangaContext.tsx';
import { ReaderViewer } from '@/modules/reader/components/viewer/ReaderViewer.tsx';
import { ReaderService } from '@/modules/reader/services/ReaderService.ts';
import { READER_BACKGROUND_TO_COLOR } from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import { ReaderHotkeys } from '@/modules/reader/components/ReaderHotkeys.tsx';
import {
    IReaderSettings,
    IReaderSettingsWithDefaultFlag,
    ReaderStateChapters,
    TReaderAutoScrollContext,
    TReaderStateMangaContext,
    TReaderStateSettingsContext,
} from '@/modules/reader/types/Reader.types.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { NavbarContextType } from '@/modules/navigation-bar/NavigationBar.types.ts';
import { TReaderOverlayContext } from '@/modules/reader/types/ReaderOverlay.types.ts';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { withPropsFrom } from '@/modules/core/hoc/withPropsFrom.tsx';
import { useReaderStateChaptersContext } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';
import { useReaderAutoScrollContext } from '@/modules/reader/contexts/ReaderAutoScrollContext.tsx';
import { TReaderTapZoneContext } from '@/modules/reader/types/TapZoneLayout.types.ts';
import { useReaderTapZoneContext } from '@/modules/reader/contexts/ReaderTapZoneContext.tsx';
import { useReaderResetStates } from '@/modules/reader/hooks/useReaderResetStates.ts';
import { useReaderSetSettingsState } from '@/modules/reader/hooks/useReaderSetSettingsState.ts';
import { useReaderShowSettingPreviewOnChange } from '@/modules/reader/hooks/useReaderShowSettingPreviewOnChange.ts';
import { useReaderSetChaptersState } from '@/modules/reader/hooks/useReaderSetChaptersState.ts';

const BaseReader = ({
    setTitle,
    setOverride,
    readerNavBarWidth,
    isVisible: isOverlayVisible,
    setIsVisible: setIsOverlayVisible,
    manga,
    setManga,
    shouldSkipDupChapters,
    backgroundColor,
    readingMode,
    tapZoneLayout,
    tapZoneInvertMode,
    shouldShowReadingModePreview,
    shouldShowTapZoneLayoutPreview,
    setSettings,
    initialChapter,
    currentChapter,
    setReaderStateChapters,
    firstPageUrl,
    totalPages,
    setTotalPages,
    setCurrentPageIndex,
    setPageToScrollToIndex,
    setPages,
    setPageUrls,
    setPageLoadStates,
    setTransitionPageMode,
    cancelAutoScroll,
    setShowPreview,
}: Pick<NavbarContextType, 'setTitle' | 'setOverride' | 'readerNavBarWidth'> &
    Pick<TReaderOverlayContext, 'isVisible' | 'setIsVisible'> &
    Pick<TReaderStateMangaContext, 'manga' | 'setManga'> &
    Pick<TReaderStateSettingsContext, 'setSettings'> &
    Pick<
        IReaderSettings,
        'shouldSkipDupChapters' | 'backgroundColor' | 'shouldShowReadingModePreview' | 'shouldShowTapZoneLayoutPreview'
    > &
    Pick<IReaderSettingsWithDefaultFlag, 'readingMode' | 'tapZoneLayout' | 'tapZoneInvertMode'> &
    Pick<ReaderStateChapters, 'initialChapter' | 'currentChapter' | 'setReaderStateChapters'> &
    Pick<
        ReaderStatePages,
        | 'totalPages'
        | 'setTotalPages'
        | 'setCurrentPageIndex'
        | 'setPageToScrollToIndex'
        | 'setPages'
        | 'setPageUrls'
        | 'setPageLoadStates'
        | 'setTransitionPageMode'
    > &
    Pick<TReaderTapZoneContext, 'setShowPreview'> & {
        firstPageUrl?: string;
        cancelAutoScroll: TReaderAutoScrollContext['cancel'];
    }) => {
    const { t } = useTranslation();

    const scrollElementRef = useRef<HTMLDivElement | null>(null);

    const [areSettingsSet, setAreSettingsSet] = useState(false);

    const { chapterSourceOrder: paramChapterSourceOrder, mangaId: paramMangaId } = useParams<{
        chapterSourceOrder: string;
        mangaId: string;
    }>();
    const chapterSourceOrder = Number(paramChapterSourceOrder);
    const mangaId = Number(paramMangaId);

    const mangaResponse = requestManager.useGetManga<GetMangaReaderQuery>(GET_MANGA_READER, mangaId);
    const chaptersResponse = requestManager.useGetMangaChapters<GetChaptersReaderQuery>(GET_CHAPTERS_READER, mangaId);

    const {
        metadata: defaultSettingsMetadata,
        settings: defaultSettings,
        request: defaultSettingsResponse,
    } = useDefaultReaderSettings();

    const isLoading =
        currentChapter === undefined ||
        !areSettingsSet ||
        mangaResponse.loading ||
        chaptersResponse.loading ||
        defaultSettingsResponse.loading;
    const error = mangaResponse.error ?? chaptersResponse.error ?? defaultSettingsResponse.error;

    useLayoutEffect(() => {
        if (!manga || !currentChapter) {
            setTitle(t('reader.title', { mangaId, chapterIndex: chapterSourceOrder }));
            return;
        }

        setTitle(`${manga.title}: ${currentChapter.name}`);
    }, [t, mangaId, chapterSourceOrder, manga, currentChapter]);

    useEffect(() => {
        setManga(mangaResponse.data?.manga);
    }, [mangaResponse.data?.manga]);

    useReaderResetStates(
        setManga,
        setReaderStateChapters,
        setCurrentPageIndex,
        setPageToScrollToIndex,
        setTotalPages,
        setPages,
        setPageUrls,
        setPageLoadStates,
        setTransitionPageMode,
        setIsOverlayVisible,
        setSettings,
        cancelAutoScroll,
    );
    useReaderSetSettingsState(
        mangaResponse,
        defaultSettingsResponse,
        defaultSettings,
        defaultSettingsMetadata,
        setSettings,
        setAreSettingsSet,
    );
    useReaderShowSettingPreviewOnChange(
        isLoading,
        error,
        areSettingsSet,
        readingMode,
        tapZoneLayout,
        tapZoneInvertMode,
        shouldShowReadingModePreview,
        shouldShowTapZoneLayoutPreview,
        setShowPreview,
    );
    useReaderSetChaptersState(
        chaptersResponse,
        chapterSourceOrder,
        initialChapter,
        setReaderStateChapters,
        shouldSkipDupChapters,
    );

    useLayoutEffect(() => {
        setOverride({
            status: true,
            value: (
                <Box sx={{ position: 'absolute' }}>
                    <ReaderHotkeys scrollElementRef={scrollElementRef} />
                    <ReaderOverlay isVisible={isOverlayVisible} />
                    {!scrollElementRef.current && (
                        <Box
                            onClick={() => setIsOverlayVisible(!isOverlayVisible)}
                            sx={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                background: 'transparent',
                            }}
                        />
                    )}
                </Box>
            ),
        });

        return () => setOverride({ status: false, value: null });
    }, [isOverlayVisible, setIsOverlayVisible, scrollElementRef.current]);

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t('global.error.label.failed_to_load_data')}
                messageExtra={getErrorMessage(error)}
                retry={() => {
                    if (mangaResponse.error) {
                        mangaResponse.refetch().catch(defaultPromiseErrorHandler('Reader::refetchManga'));
                    }

                    if (defaultSettingsResponse.error) {
                        defaultSettingsResponse
                            .refetch()
                            .catch(defaultPromiseErrorHandler('Reader::refetchDefaultSettings'));
                    }

                    if (chaptersResponse.error) {
                        chaptersResponse.refetch().catch(defaultPromiseErrorHandler('Reader::refetchChapters'));
                    }
                }}
            />
        );
    }

    if (isLoading) {
        return (
            <Box
                sx={{
                    height: '100vh',
                    width: '100vw',
                    display: 'grid',
                    placeItems: 'center',
                }}
            >
                <LoadingPlaceholder />
            </Box>
        );
    }

    if (currentChapter === null) {
        return <EmptyViewAbsoluteCentered message={t('reader.error.label.chapter_not_found')} />;
    }

    if (!manga || !currentChapter) {
        return null;
    }

    const isPlaceholderPageState = totalPages === 1 && firstPageUrl === requestManager.getBaseUrl();
    if (isPlaceholderPageState) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                width: `calc(100vw - ${readerNavBarWidth}px)`,
                height: `100vh`,
                marginLeft: `${readerNavBarWidth}px`,
                transition: (theme) =>
                    `width 0.${theme.transitions.duration.shortest}s, margin-left 0.${theme.transitions.duration.shortest}s`,
                overflow: 'auto',
                backgroundColor: READER_BACKGROUND_TO_COLOR[backgroundColor],
            }}
        >
            <ReaderViewer ref={scrollElementRef} />
            <TapZoneLayout />
            <ReaderRGBAFilter />
        </Box>
    );
};

export const Reader = withPropsFrom(
    memo(BaseReader),
    [
        useNavBarContext,
        useReaderOverlayContext,
        useReaderStateMangaContext,
        useReaderStateChaptersContext,
        useReaderStateSettingsContext,
        () => {
            const {
                shouldSkipDupChapters,
                backgroundColor,
                shouldShowReadingModePreview,
                shouldShowTapZoneLayoutPreview,
            } = ReaderService.useSettingsWithoutDefaultFlag();
            return {
                shouldSkipDupChapters,
                backgroundColor,
                shouldShowReadingModePreview,
                shouldShowTapZoneLayoutPreview,
            };
        },
        () => {
            const { readingMode, tapZoneLayout, tapZoneInvertMode } = ReaderService.useSettings();
            return { readingMode, tapZoneLayout, tapZoneInvertMode };
        },
        userReaderStatePagesContext,
        () => ({
            firstPageUrl: userReaderStatePagesContext().pages[0].primary.url,
        }),
        () => ({ cancelAutoScroll: useReaderAutoScrollContext().cancel }),
        useReaderTapZoneContext,
    ],
    [
        'setTitle',
        'setOverride',
        'readerNavBarWidth',
        'isVisible',
        'setIsVisible',
        'manga',
        'setManga',
        'shouldSkipDupChapters',
        'backgroundColor',
        'readingMode',
        'tapZoneLayout',
        'tapZoneInvertMode',
        'shouldShowReadingModePreview',
        'shouldShowTapZoneLayoutPreview',
        'setSettings',
        'initialChapter',
        'currentChapter',
        'setReaderStateChapters',
        'firstPageUrl',
        'totalPages',
        'setTotalPages',
        'setCurrentPageIndex',
        'setPageToScrollToIndex',
        'setPages',
        'setPageUrls',
        'setPageLoadStates',
        'setTransitionPageMode',
        'cancelAutoScroll',
        'setShowPreview',
    ],
);

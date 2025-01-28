/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react';
import { createPageData } from '@/modules/reader/utils/ReaderPager.utils.tsx';
import {
    ReaderStateChapters,
    ReaderTransitionPageMode,
    TReaderAutoScrollContext,
    TReaderStateMangaContext,
    TReaderStateSettingsContext,
} from '@/modules/reader/types/Reader.types.ts';
import { DEFAULT_READER_SETTINGS_WITH_DEFAULT_FLAG } from '@/modules/reader/services/ReaderSettingsMetadata.ts';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { TReaderOverlayContext } from '@/modules/reader/types/ReaderOverlay.types.ts';
import { READER_STATE_CHAPTERS_DEFAULTS } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';

export const useReaderResetStates = (
    setManga: TReaderStateMangaContext['setManga'],
    setReaderStateChapters: ReaderStateChapters['setReaderStateChapters'],
    setCurrentPageIndex: ReaderStatePages['setCurrentPageIndex'],
    setPageToScrollToIndex: ReaderStatePages['setPageToScrollToIndex'],
    setTotalPages: ReaderStatePages['setTotalPages'],
    setPages: ReaderStatePages['setPages'],
    setPageUrls: ReaderStatePages['setPageUrls'],
    setPageLoadStates: ReaderStatePages['setPageLoadStates'],
    setTransitionPageMode: ReaderStatePages['setTransitionPageMode'],
    setIsOverlayVisible: TReaderOverlayContext['setIsVisible'],
    setSettings: TReaderStateSettingsContext['setSettings'],
    cancelAutoScroll: TReaderAutoScrollContext['cancel'],
) => {
    useEffect(
        () => () => {
            setManga(undefined);
            setReaderStateChapters(READER_STATE_CHAPTERS_DEFAULTS);

            setCurrentPageIndex(0);
            setPageToScrollToIndex(null);
            setTotalPages(0);
            setPages([createPageData('', 0)]);
            setPageUrls([]);
            setPageLoadStates([{ url: '', loaded: false }]);
            setTransitionPageMode(ReaderTransitionPageMode.NONE);

            setIsOverlayVisible(false);

            setSettings(DEFAULT_READER_SETTINGS_WITH_DEFAULT_FLAG);

            cancelAutoScroll();
        },
        [],
    );
};

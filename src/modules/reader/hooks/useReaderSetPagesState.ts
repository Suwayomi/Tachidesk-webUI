/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLayoutEffect, useRef } from 'react';
import { getInitialReaderPageIndex } from '@/modules/reader/utils/Reader.utils.ts';
import { createPagesData } from '@/modules/reader/utils/ReaderPager.utils.tsx';
import {
    ReaderPageSpreadState,
    ReaderResumeMode,
    ReaderTransitionPageMode,
} from '@/modules/reader/types/Reader.types.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { TChapterReader } from '@/modules/chapter/Chapter.types.ts';

export const useReaderSetPagesState = (
    isCurrentChapter: boolean,
    pagesResponse: ReturnType<typeof requestManager.useGetChapterPagesFetch>[1],
    resumeMode: ReaderResumeMode,
    lastPageRead: TChapterReader['lastPageRead'] | undefined,
    pages: ReaderStatePages['pages'],
    pageLoadStates: ReaderStatePages['pageLoadStates'],
    pagesToSpreadState: ReaderPageSpreadState[],
    setArePagesFetched: (fetched: boolean) => void,
    setTotalPages: ReaderStatePages['setTotalPages'],
    setPages: ReaderStatePages['setPages'],
    setPageUrls: ReaderStatePages['setPageUrls'],
    setPageLoadStates: ReaderStatePages['setPageLoadStates'],
    setPagesToSpreadState: (state: ReaderPageSpreadState[]) => void,
    setCurrentPageIndex: ReaderStatePages['setCurrentPageIndex'],
    setPageToScrollToIndex: ReaderStatePages['setPageToScrollToIndex'],
    setTransitionPageMode: ReaderStatePages['setTransitionPageMode'],
) => {
    const previousPageData = useRef<string[]>();

    useLayoutEffect(() => {
        const pagesPayload = pagesResponse.data?.fetchChapterPages;
        if (!pagesPayload) {
            return;
        }

        const { pages: newPages } = pagesPayload;
        const initialReaderPageIndex = getInitialReaderPageIndex(resumeMode, lastPageRead ?? 0, newPages.length - 1);

        const didPagesChange = previousPageData.current !== pagesPayload?.pages;
        if (didPagesChange) {
            previousPageData.current = pagesPayload.pages;
            const newPageData = createPagesData(newPages);

            setArePagesFetched(true);
            setPages(newPageData);
            setPageUrls(newPages);
            setPageLoadStates(newPageData.map(({ primary: { url } }) => ({ url, loaded: false })));
            setPagesToSpreadState(newPageData.map(({ primary: { url } }) => ({ url, isSpread: false })));
            setCurrentPageIndex(initialReaderPageIndex);
            setPageToScrollToIndex(initialReaderPageIndex);
        } else {
            setPages(pages);
            setPageLoadStates(pageLoadStates);
            setPagesToSpreadState(pagesToSpreadState);
        }

        setTotalPages(pagesPayload.pages.length);
        setPageUrls(newPages);
        setCurrentPageIndex(initialReaderPageIndex);
        setPageToScrollToIndex(initialReaderPageIndex);

        setTransitionPageMode(ReaderTransitionPageMode.NONE);
    }, [pagesResponse.data?.fetchChapterPages?.pages, isCurrentChapter]);
};

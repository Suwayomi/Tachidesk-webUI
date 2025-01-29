/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import {
    ReaderPageSpreadState,
    ReaderResumeMode,
    ReaderStateChapters,
    ReadingMode,
} from '@/modules/reader/types/Reader.types.ts';
import { UpdateChapterPatchInput } from '@/lib/graphql/generated/graphql.ts';
import { TChapterReader } from '@/modules/chapter/Chapter.types.ts';
import { ChapterIdInfo, Chapters } from '@/modules/chapter/services/Chapters.ts';
import { CHAPTER_READER_FIELDS } from '@/lib/graphql/fragments/ChapterFragments.ts';
import { isPageOfOutdatedPageLoadStates, isSpreadPage } from '@/modules/reader/utils/ReaderPager.utils.tsx';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { coerceIn } from '@/lib/HelperFunctions.ts';

export const getInitialReaderPageIndex = (
    resumeMode: ReaderResumeMode,
    lastReadPageIndex: number,
    lastPageIndex: number,
): number => {
    if (resumeMode === ReaderResumeMode.START) {
        return 0;
    }

    if (resumeMode === ReaderResumeMode.END) {
        return lastPageIndex;
    }

    return coerceIn(lastReadPageIndex, 0, lastPageIndex);
};

export const getReaderChapterFromCache = (id: ChapterIdInfo['id']): TChapterReader | null =>
    Chapters.getFromCache<TChapterReader>(id, CHAPTER_READER_FIELDS, 'CHAPTER_READER_FIELDS')!;

export const getChapterIdsToDeleteForChapterUpdate = (
    chapter: TChapterReader,
    chapters: TChapterReader[],
    previousChapters: TChapterReader[],
    patch: UpdateChapterPatchInput,
    deleteChaptersWhileReading: number,
    deleteChaptersWithBookmark: boolean,
    shouldSkipDupChapters: boolean,
): TChapterReader['id'][] => {
    const isAutoDeletionEnabled = !!patch.isRead && !!deleteChaptersWhileReading;
    if (!isAutoDeletionEnabled) {
        return [];
    }

    const chapterToDelete = [chapter, ...previousChapters][deleteChaptersWhileReading - 1];
    if (!chapterToDelete) {
        return [];
    }

    const chapterToDeleteUpToDateData = getReaderChapterFromCache(chapterToDelete.id);
    if (!chapterToDeleteUpToDateData) {
        return [];
    }

    const shouldDeleteChapter =
        patch.isRead && Chapters.isDeletable(chapterToDeleteUpToDateData, deleteChaptersWithBookmark);
    if (!shouldDeleteChapter) {
        return [];
    }

    if (!shouldSkipDupChapters) {
        return Chapters.getIds([chapterToDelete]);
    }

    return Chapters.getIds(Chapters.addDuplicates([chapterToDelete], chapters));
};

export const getChapterIdsForDownloadAhead = (
    chapter: TChapterReader,
    nextChapter: TChapterReader | undefined,
    nextChapters: TChapterReader[],
    currentPageIndex: number,
    downloadAheadLimit: number,
): TChapterReader['id'][] => {
    const chapterUpToDateData = getReaderChapterFromCache(chapter.id);
    if (!chapterUpToDateData || !nextChapter) {
        return [];
    }

    const isDownloadAheadEnabled = !!downloadAheadLimit;
    const inDownloadRange = (currentPageIndex + 1) / chapterUpToDateData.pageCount > 0.25;
    const shouldCheckDownloadAhead = isDownloadAheadEnabled && chapterUpToDateData.isDownloaded && inDownloadRange;
    if (!shouldCheckDownloadAhead) {
        return [];
    }

    const nextChapterUpToDateData = getReaderChapterFromCache(nextChapter.id);

    if (!nextChapterUpToDateData?.isDownloaded) {
        return [];
    }

    const unreadNextChaptersUpToDateData = Chapters.getNonRead(nextChapters)
        .map((unreadNextChapter) => getReaderChapterFromCache(unreadNextChapter.id))
        .filter((unreadNextChapterUpToDateData) => !!unreadNextChapterUpToDateData);

    return unreadNextChaptersUpToDateData
        .slice(-downloadAheadLimit)
        .filter((unreadNextChapter) => !unreadNextChapter.isDownloaded)
        .map((unreadUnDownloadedNextChapter) => unreadUnDownloadedNextChapter.id)
        .filter((id) => !Chapters.isDownloading(id));
};

export const createUpdateReaderPageLoadState =
    (
        actualPages: ReaderStatePages['pages'],
        pagesToSpreadState: ReaderPageSpreadState[],
        setPagesToSpreadState: React.Dispatch<React.SetStateAction<ReaderPageSpreadState[]>>,
        pageLoadStates: ReaderStatePages['pageLoadStates'],
        setPageLoadStates: ReaderStatePages['setPageLoadStates'],
        readingMode: ReadingMode,
    ) =>
    (pagesIndex: number, url: string, isPrimary: boolean = true) => {
        if (pagesIndex > actualPages.length - 1) {
            return;
        }

        const page = actualPages[pagesIndex];
        const { index } = isPrimary ? page.primary : page.secondary!;

        if (readingMode === ReadingMode.DOUBLE_PAGE) {
            const img = new Image();
            img.onload = () => {
                const isSpreadPageFlag = isSpreadPage(img);
                if (!isSpreadPageFlag) {
                    return;
                }

                setPagesToSpreadState((prevState) => {
                    const pageSpreadState = prevState[index];

                    const isOfOutdatedSpreadState = pageSpreadState === undefined || pageSpreadState.url !== url;
                    if (isOfOutdatedSpreadState) {
                        return prevState;
                    }

                    if (pageSpreadState.isSpread === isSpreadPageFlag) {
                        return prevState;
                    }

                    return prevState.toSpliced(index, 1, { url, isSpread: isSpreadPageFlag });
                });
            };
            img.crossOrigin = 'anonymous';
            img.src = url;
        }

        setPageLoadStates((statePageLoadStates) => {
            const pageLoadState = statePageLoadStates[index];

            if (isPageOfOutdatedPageLoadStates(url, pageLoadState)) {
                return statePageLoadStates;
            }

            if (pageLoadState.loaded) {
                return statePageLoadStates;
            }

            return statePageLoadStates.toSpliced(index, 1, { url: pageLoadState.url, loaded: true });
        });
    };

export const createHandleReaderPageLoadError =
    (setPageLoadStates: ReaderStatePages['setPageLoadStates']) => (pageIndex: number, url: string) => {
        setPageLoadStates((statePageLoadStates) => {
            const pageLoadState = statePageLoadStates[pageIndex];

            if (isPageOfOutdatedPageLoadStates(url, pageLoadState)) {
                return statePageLoadStates;
            }

            return statePageLoadStates.toSpliced(pageIndex, 1, {
                ...pageLoadState,
                loaded: false,
                error: true,
            });
        });
    };

export const updateReaderStateVisibleChapters = (
    isPreviousChapter: boolean,
    state: Omit<ReaderStateChapters, 'setReaderStateChapters'>,
    chapterToOpenSourceOrder: TChapterReader['sourceOrder'],
    scrollIntoView: boolean,
): Omit<ReaderStateChapters, 'setReaderStateChapters'> => {
    const { leading, trailing, lastLeadingChapterSourceOrder, lastTrailingChapterSourceOrder } = state.visibleChapters;

    const isNewLeadingChapter = isPreviousChapter && chapterToOpenSourceOrder < lastLeadingChapterSourceOrder;
    const isNewTrailingChapter = !isPreviousChapter && chapterToOpenSourceOrder > lastTrailingChapterSourceOrder;

    return {
        ...state,
        visibleChapters: {
            ...state.visibleChapters,
            leading: leading + Number(isNewLeadingChapter),
            trailing: trailing + Number(isNewTrailingChapter),
            lastLeadingChapterSourceOrder: isNewLeadingChapter
                ? chapterToOpenSourceOrder
                : lastLeadingChapterSourceOrder,
            lastTrailingChapterSourceOrder: isNewTrailingChapter
                ? chapterToOpenSourceOrder
                : lastTrailingChapterSourceOrder,
            scrollIntoView,
            resumeMode: isPreviousChapter ? ReaderResumeMode.END : ReaderResumeMode.START,
        },
    };
};

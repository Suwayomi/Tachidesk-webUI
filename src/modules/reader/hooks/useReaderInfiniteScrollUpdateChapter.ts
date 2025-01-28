/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLayoutEffect } from 'react';
import { ReaderControls } from '@/modules/reader/services/ReaderControls.ts';
import { ReadingDirection, ReadingMode } from '@/modules/reader/types/Reader.types.ts';
import {
    isContinuousReadingMode,
    isContinuousVerticalReadingMode,
} from '@/modules/reader/utils/ReaderSettings.utils.tsx';
import { READING_DIRECTION_TO_THEME_DIRECTION } from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import { getOptionForDirection } from '@/modules/theme/services/ThemeCreator.ts';

const OPEN_CHAPTER_INTERSECTION_RATIO = 0.1;

const getScrollingDirection = (
    readingMode: ReadingMode,
    readingDirection: ReadingDirection,
    { bottom, left, right }: DOMRect,
): 'backward' | 'forward' => {
    if (isContinuousVerticalReadingMode(readingMode)) {
        const isScrollingBackward = bottom >= window.innerHeight;
        if (isScrollingBackward) {
            return 'backward';
        }

        return 'forward';
    }

    const themeDirectionOfReadingDirection = READING_DIRECTION_TO_THEME_DIRECTION[readingDirection];
    const endOfElement = getOptionForDirection(right, left, themeDirectionOfReadingDirection);

    const isScrollingBackward =
        endOfElement >= getOptionForDirection(window.innerWidth, 0, themeDirectionOfReadingDirection);
    if (isScrollingBackward) {
        return 'backward';
    }

    return 'forward';
};

export const useReaderInfiniteScrollUpdateChapter = (
    pageType: 'first' | 'last',
    chapterId: number,
    chapterToOpenId: number | undefined,
    isCurrentChapter: boolean,
    isChapterToOpenVisible: boolean,
    readingMode: ReadingMode,
    readingDirection: ReadingDirection,
    openChapter: ReturnType<typeof ReaderControls.useOpenChapter>,
    image: HTMLElement | null,
) => {
    useLayoutEffect(() => {
        if (!image || !isContinuousReadingMode(readingMode) || chapterToOpenId === undefined) {
            return () => {};
        }

        // gets immediately observed once on initial render
        let isInitialObserve = true;
        let wasNextChapterOpened = false;
        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                if (isInitialObserve) {
                    isInitialObserve = false;
                    return;
                }

                if (wasNextChapterOpened) {
                    return;
                }

                const entry = entries[entries.length - 1];

                const wasPageScrolledOutOfView = entry.intersectionRatio < OPEN_CHAPTER_INTERSECTION_RATIO;
                const isScrollingBackward =
                    getScrollingDirection(readingMode, readingDirection, entry.target.getBoundingClientRect()) ===
                    'backward';
                const isScrollingForward = !isScrollingBackward;

                // the first page only opens the previous chapter in case it hasn't been loaded yet, otherwise, the last
                // page handles setting the correct chapter
                const initialOpenPreviousChapter =
                    pageType === 'first' && isScrollingBackward && !isChapterToOpenVisible;
                const openPreviousChapter = pageType === 'last' && !isCurrentChapter && isScrollingForward;
                const openNextChapter = pageType === 'last' && isScrollingForward && wasPageScrolledOutOfView;

                const openChapterToOpen = initialOpenPreviousChapter || openNextChapter;
                if (openChapterToOpen) {
                    openChapter(chapterToOpenId, !isChapterToOpenVisible, false);
                    wasNextChapterOpened = true;
                    return;
                }

                if (openPreviousChapter) {
                    openChapter(chapterId, false, false);
                    wasNextChapterOpened = true;
                }
            },
            { threshold: [OPEN_CHAPTER_INTERSECTION_RATIO] },
        );
        intersectionObserver.observe(image);

        return () => intersectionObserver.unobserve(image);
    }, [
        pageType,
        chapterId,
        chapterToOpenId,
        isCurrentChapter,
        isChapterToOpenVisible,
        readingMode,
        readingDirection,
        openChapter,
        image,
    ]);
};

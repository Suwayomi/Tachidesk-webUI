/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { memo } from 'react';
import { withPropsFrom } from '@/modules/core/hoc/withPropsFrom.tsx';
import { useReaderInfiniteScrollUpdateChapter } from '@/modules/reader/hooks/useReaderInfiniteScrollUpdateChapter.ts';
import { ReadingDirection, ReadingMode } from '@/modules/reader/types/Reader.types.ts';
import { ReaderControls } from '@/modules/reader/services/ReaderControls.ts';
import { ChapterIdInfo } from '@/modules/chapter/services/Chapters.ts';

const BaseReaderInfiniteScrollUpdateChapter = ({
    readingMode,
    readingDirection,
    chapterId,
    previousChapterId,
    nextChapterId,
    isPreviousChapterVisible,
    isCurrentChapter,
    isNextChapterVisible,
    firstImage,
    lastImage,
    openChapter,
}: {
    readingMode: ReadingMode;
    readingDirection: ReadingDirection;
    chapterId: ChapterIdInfo['id'];
    previousChapterId?: ChapterIdInfo['id'];
    nextChapterId?: ChapterIdInfo['id'];
    isPreviousChapterVisible: boolean;
    isCurrentChapter: boolean;
    isNextChapterVisible: boolean;
    firstImage: HTMLElement | null;
    lastImage: HTMLElement | null;
    openChapter: ReturnType<typeof ReaderControls.useOpenChapter>;
}) => {
    useReaderInfiniteScrollUpdateChapter(
        'first',
        chapterId,
        previousChapterId,
        isCurrentChapter,
        isPreviousChapterVisible,
        readingMode,
        readingDirection,
        openChapter,
        firstImage,
    );
    useReaderInfiniteScrollUpdateChapter(
        'last',
        chapterId,
        nextChapterId,
        isCurrentChapter,
        isNextChapterVisible,
        readingMode,
        readingDirection,
        openChapter,
        lastImage,
    );

    return null;
};

export const ReaderInfiniteScrollUpdateChapter = withPropsFrom(
    memo(BaseReaderInfiniteScrollUpdateChapter),
    [() => ({ openChapter: ReaderControls.useOpenChapter() })],
    ['openChapter'],
);

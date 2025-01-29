/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react';
import { Chapters } from '@/modules/chapter/services/Chapters.ts';
import { DirectionOffset } from '@/Base.types.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GetChaptersReaderQuery } from '@/lib/graphql/generated/graphql.ts';
import { IReaderSettings, ReaderStateChapters } from '@/modules/reader/types/Reader.types.ts';
import { READER_STATE_CHAPTERS_DEFAULTS } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';

export const useReaderSetChaptersState = (
    chaptersResponse: ReturnType<typeof requestManager.useGetMangaChapters<GetChaptersReaderQuery>>,
    chapterSourceOrder: number,
    initialChapter: ReaderStateChapters['initialChapter'],
    setReaderStateChapters: ReaderStateChapters['setReaderStateChapters'],
    shouldSkipDupChapters: IReaderSettings['shouldSkipDupChapters'],
) => {
    useEffect(() => {
        const newMangaChapters = chaptersResponse.data?.chapters.nodes;
        const newCurrentChapter = newMangaChapters
            ? (newMangaChapters[newMangaChapters.length - chapterSourceOrder] ?? null)
            : undefined;
        const newInitialChapter = initialChapter ?? newCurrentChapter;

        const nextChapter =
            newMangaChapters &&
            newCurrentChapter &&
            Chapters.getNextChapter(newCurrentChapter, newMangaChapters, {
                offset: DirectionOffset.NEXT,
                skipDupe: shouldSkipDupChapters,
                skipDupeChapter: newInitialChapter,
            });
        const previousChapter =
            newMangaChapters &&
            newCurrentChapter &&
            Chapters.getNextChapter(newCurrentChapter, newMangaChapters, {
                offset: DirectionOffset.PREVIOUS,
                skipDupe: shouldSkipDupChapters,
                skipDupeChapter: newInitialChapter,
            });

        setReaderStateChapters((prevState) => {
            const hasInitialChapterChanged =
                newInitialChapter != null && newInitialChapter.id !== prevState.initialChapter?.id;

            return {
                ...prevState,
                mangaChapters: newMangaChapters ?? [],
                chapters:
                    newInitialChapter && newMangaChapters
                        ? Chapters.removeDuplicates(newInitialChapter, newMangaChapters)
                        : [],
                initialChapter: newInitialChapter,
                currentChapter: newCurrentChapter,
                nextChapter,
                previousChapter,
                visibleChapters: hasInitialChapterChanged
                    ? READER_STATE_CHAPTERS_DEFAULTS.visibleChapters
                    : prevState.visibleChapters,
            };
        });
    }, [chaptersResponse.data?.chapters.nodes, chapterSourceOrder, shouldSkipDupChapters]);
};

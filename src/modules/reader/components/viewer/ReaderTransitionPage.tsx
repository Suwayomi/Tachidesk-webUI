/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { ComponentProps, memo, useMemo } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { useReaderScrollbarContext } from '@/modules/reader/contexts/ReaderScrollbarContext.tsx';
import { useReaderStateChaptersContext } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';
import { ChapterIdInfo } from '@/modules/chapter/services/Chapters.ts';
import {
    IReaderSettings,
    ReaderPageScaleMode,
    ReaderTransitionPageMode,
    ReadingMode,
    TReaderScrollbarContext,
    TReaderStateMangaContext,
} from '@/modules/reader/types/Reader.types.ts';
import { isTransitionPageVisible } from '@/modules/reader/utils/ReaderPager.utils.tsx';
import { useBackButton } from '@/modules/core/hooks/useBackButton.ts';
import { applyStyles } from '@/modules/core/utils/ApplyStyles.ts';
import {
    isContinuousReadingMode,
    isContinuousVerticalReadingMode,
} from '@/modules/reader/utils/ReaderSettings.utils.tsx';
import { useNavBarContext } from '@/modules/navigation-bar/contexts/NavbarContext.tsx';
import { AppRoutes } from '@/modules/core/AppRoute.constants.ts';
import { NavbarContextType } from '@/modules/navigation-bar/NavigationBar.types.ts';
import { withPropsFrom } from '@/modules/core/hoc/withPropsFrom.tsx';
import { useReaderStateMangaContext } from '@/modules/reader/contexts/state/ReaderStateMangaContext.tsx';
import { getValueFromObject, noOp } from '@/lib/HelperFunctions.ts';
import { READER_BACKGROUND_TO_COLOR } from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import { ReaderService } from '@/modules/reader/services/ReaderService.ts';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { userReaderStatePagesContext } from '@/modules/reader/contexts/state/ReaderStatePagesContext.tsx';
import { ChapterType } from '@/lib/graphql/generated/graphql.ts';

const ChapterInfo = ({
    title,
    name,
    scanlator,
    backgroundColor,
}: {
    title: string;
    name?: ChapterType['name'];
    scanlator?: ChapterType['scanlator'];
    backgroundColor: IReaderSettings['backgroundColor'];
}) => {
    const theme = useTheme();

    const contrastText = theme.palette.getContrastText(
        getValueFromObject(theme.palette, READER_BACKGROUND_TO_COLOR[backgroundColor]),
    );
    const disabledText = alpha(contrastText, 0.5);

    if (!name) {
        return null;
    }

    return (
        <Stack>
            <Typography color={contrastText}>{title}</Typography>
            <Typography color={contrastText} variant="h6" component="h1">
                {name}
            </Typography>
            {scanlator && (
                <Typography variant="body2" color={disabledText}>
                    {scanlator}
                </Typography>
            )}
        </Stack>
    );
};

const BaseReaderTransitionPage = ({
    type,
    transitionPageMode,
    readingMode,
    pageScaleMode,
    backgroundColor,
    manga,
    currentChapterName,
    currentChapterScanlator,
    previousChapterName,
    previousChapterScanlator,
    nextChapterName,
    nextChapterScanlator,
    scrollbarXSize,
    scrollbarYSize,
    readerNavBarWidth,
    handleBack,
}: Pick<IReaderSettings, 'readingMode' | 'pageScaleMode' | 'backgroundColor'> &
    Pick<TReaderStateMangaContext, 'manga'> &
    Pick<TReaderScrollbarContext, 'scrollbarXSize' | 'scrollbarYSize'> &
    Pick<ReaderStatePages, 'transitionPageMode'> &
    Pick<NavbarContextType, 'readerNavBarWidth'> & {
        // gets used in the "source props creators" of the "withPropsFrom" call
        // eslint-disable-next-line react/no-unused-prop-types
        chapterId: ChapterIdInfo['id'];
        currentChapterName?: ChapterType['name'];
        currentChapterScanlator?: ChapterType['scanlator'];
        previousChapterName?: ChapterType['name'];
        previousChapterScanlator?: ChapterType['scanlator'];
        nextChapterName?: ChapterType['name'];
        nextChapterScanlator?: ChapterType['scanlator'];
        type: Exclude<ReaderTransitionPageMode, ReaderTransitionPageMode.NONE | ReaderTransitionPageMode.BOTH>;
        handleBack: () => void;
    }) => {
    const { t } = useTranslation();

    const isPreviousType = type === ReaderTransitionPageMode.PREVIOUS;
    const isNextType = type === ReaderTransitionPageMode.NEXT;

    const isFirstChapter = !!currentChapterName && !previousChapterName;
    const isLastChapter = !!currentChapterName && !nextChapterName;
    const isFitWidthPageScaleMode = [ReaderPageScaleMode.SCREEN, ReaderPageScaleMode.WIDTH].includes(pageScaleMode);

    if (!isTransitionPageVisible(type, transitionPageMode, readingMode)) {
        return null;
    }

    return (
        <Stack
            sx={{
                justifyContent: 'center',
                alignItems: 'center',
                ...applyStyles(!isContinuousReadingMode(readingMode), {
                    width: '100%',
                    height: '100%',
                }),
                ...applyStyles(isContinuousReadingMode(readingMode), {
                    position: 'relative',
                    transform: 'scale(1)',
                    ...applyStyles(isContinuousVerticalReadingMode(readingMode), {
                        minHeight: `calc(100vh - ${scrollbarXSize}px)`,
                        maxWidth: '100%',
                        width: '100%',
                        ...applyStyles(!isFitWidthPageScaleMode, { alignItems: 'baseline' }),
                    }),
                    ...applyStyles(readingMode === ReadingMode.CONTINUOUS_HORIZONTAL, {
                        minWidth: `calc(100vw - ${scrollbarYSize}px - ${readerNavBarWidth}px)`,
                        maxHeight: '100%',
                        height: '100%',
                        justifyContent: 'unset',
                    }),
                }),
            }}
        >
            <Stack
                sx={{
                    gap: 2,
                    maxWidth: `calc(100vw - ${scrollbarYSize}px)`,
                    maxHeight: `calc(100vh - ${scrollbarXSize}px)`,
                    width: 'max-content',
                    p: 1,
                    ...applyStyles(isContinuousReadingMode(readingMode), {
                        position: 'sticky',
                        ...applyStyles(
                            // on small screens with "fit to with" enabled, "left 50%" does not center the element in the
                            // viewport which then causes "translate" to move the element mostly outside the viewport with
                            // only a small part of it being visible
                            !isFitWidthPageScaleMode && isContinuousVerticalReadingMode(readingMode),
                            {
                                left: '50%',
                                transform: 'translateX(-50%)',
                            },
                        ),
                        ...applyStyles(readingMode === ReadingMode.CONTINUOUS_HORIZONTAL, {
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }),
                    }),
                }}
            >
                {isPreviousType && isFirstChapter && (
                    <Typography variant="h6">{t('reader.transition_page.first_chapter')}</Typography>
                )}
                <Stack sx={{ gap: 5 }}>
                    {isPreviousType && !isFirstChapter && (
                        <ChapterInfo
                            title={t('reader.transition_page.previous')}
                            name={previousChapterName}
                            scanlator={previousChapterScanlator}
                            backgroundColor={backgroundColor}
                        />
                    )}
                    {!!currentChapterName && (
                        <ChapterInfo
                            title={t(
                                isPreviousType ? 'reader.transition_page.current' : 'reader.transition_page.finished',
                            )}
                            name={currentChapterName}
                            scanlator={currentChapterScanlator}
                            backgroundColor={backgroundColor}
                        />
                    )}
                    {isNextType && !isLastChapter && (
                        <ChapterInfo
                            title={t('reader.transition_page.next')}
                            name={nextChapterName}
                            scanlator={nextChapterScanlator}
                            backgroundColor={backgroundColor}
                        />
                    )}
                </Stack>
                {isNextType && isLastChapter && (
                    <Typography variant="h6">{t('reader.transition_page.last_chapter')}</Typography>
                )}
                {((isPreviousType && isFirstChapter) || (isNextType && isLastChapter)) && (
                    <Stack sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                            sx={{ flexGrow: 1 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleBack();
                            }}
                            variant="contained"
                        >
                            {t('reader.transition_page.exit.previous_page')}
                        </Button>
                        <Button
                            sx={{ flexGrow: 1 }}
                            component={Link}
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                            variant="contained"
                            to={AppRoutes.manga.path(manga?.id ?? -1)}
                        >
                            {t('reader.transition_page.exit.manga_page')}
                        </Button>
                    </Stack>
                )}
            </Stack>
        </Stack>
    );
};

export const ReaderTransitionPage = withPropsFrom(
    memo(BaseReaderTransitionPage) as typeof BaseReaderTransitionPage,
    [
        useReaderStateMangaContext,
        ({ chapterId }: Pick<ComponentProps<typeof BaseReaderTransitionPage>, 'chapterId'>) => {
            const { chapters } = useReaderStateChaptersContext();

            const currentChapterIndex = useMemo(
                () => chapters.findIndex((chapter) => chapter.id === chapterId),
                [chapterId, chapters],
            );
            const currentChapter = chapters[currentChapterIndex];
            // chapters are sorted from latest to oldest
            const previousChapter = useMemo(() => chapters[currentChapterIndex + 1], [currentChapterIndex, chapters]);
            const nextChapter = useMemo(() => chapters[currentChapterIndex - 1], [currentChapterIndex, chapters]);

            return {
                currentChapterName: currentChapter?.name,
                currentChapterScanlator: currentChapter?.scanlator,
                previousChapterName: previousChapter?.name,
                previousChapterScanlator: previousChapter?.name,
                nextChapterName: nextChapter?.name,
                nextChapterScanlator: nextChapter?.scanlator,
            };
        },
        useReaderScrollbarContext,
        useNavBarContext,
        userReaderStatePagesContext,
        ReaderService.useSettingsWithoutDefaultFlag,
        ({ chapterId, type }: Pick<ComponentProps<typeof BaseReaderTransitionPage>, 'chapterId' | 'type'>) => {
            const handleBack = useBackButton();
            const { chapters } = useReaderStateChaptersContext();

            const currentChapterIndex = useMemo(
                () => chapters.findIndex((chapter) => chapter.id === chapterId),
                [chapterId, chapters],
            );

            // chapters are sorted from latest to oldest
            const isLastChapter = currentChapterIndex === 0;
            const isFirstChapter = currentChapterIndex === chapters.length - 1;

            const handleBackFirstChapter = type === ReaderTransitionPageMode.PREVIOUS && isFirstChapter;
            const handleBackLastChapter = type === ReaderTransitionPageMode.NEXT && isLastChapter;

            const needsToHandleBack = handleBackFirstChapter || handleBackLastChapter;

            return {
                handleBack: needsToHandleBack ? handleBack : noOp,
            };
        },
    ],
    [
        'manga',
        'currentChapterName',
        'currentChapterScanlator',
        'previousChapterName',
        'previousChapterScanlator',
        'nextChapterName',
        'nextChapterScanlator',
        'scrollbarXSize',
        'scrollbarYSize',
        'readerNavBarWidth',
        'backgroundColor',
        'transitionPageMode',
        'readingMode',
        'pageScaleMode',
        'handleBack',
    ],
);

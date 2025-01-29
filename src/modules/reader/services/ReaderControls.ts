/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MutableRefObject, RefObject, useCallback, useEffect, useMemo } from 'react';
import { Direction, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { userReaderStatePagesContext } from '@/modules/reader/contexts/state/ReaderStatePagesContext.tsx';
import {
    getNextIndexFromPage,
    getNextPageIndex,
    getPage,
    getPageForMousePos,
    getProgressBarPositionInfo,
} from '@/modules/reader/utils/ReaderProgressBar.utils.tsx';
import { getOptionForDirection } from '@/modules/theme/services/ThemeCreator.ts';
import { ReaderService } from '@/modules/reader/services/ReaderService.ts';
import { useReaderStateChaptersContext } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';
import {
    PageInViewportType,
    ProgressBarPosition,
    ReaderResumeMode,
    ReaderTransitionPageMode,
    ReadingDirection,
    ReadingMode,
} from '@/modules/reader/types/Reader.types.ts';
import { ScrollDirection, ScrollOffset } from '@/modules/core/Core.types.ts';
import {
    ReaderScrollAmount,
    READING_DIRECTION_TO_THEME_DIRECTION,
} from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import {
    isATransitionPageVisible,
    isEndOfPageInViewport,
    isPageInViewport,
} from '@/modules/reader/utils/ReaderPager.utils.tsx';
import { useReaderOverlayContext } from '@/modules/reader/contexts/ReaderOverlayContext.tsx';
import { useReaderTapZoneContext } from '@/modules/reader/contexts/ReaderTapZoneContext.tsx';
import { TapZoneRegionType, TReaderTapZoneContext } from '@/modules/reader/types/TapZoneLayout.types.ts';
import { ReaderTapZoneService } from '@/modules/reader/services/ReaderTapZoneService.ts';
import { isContinuousReadingMode } from '@/modules/reader/utils/ReaderSettings.utils.tsx';
import { getReaderChapterFromCache, updateReaderStateVisibleChapters } from '@/modules/reader/utils/Reader.utils.ts';
import { ChapterIdInfo, Chapters } from '@/modules/chapter/services/Chapters.ts';
import { DirectionOffset, TranslationKey } from '@/Base.types.ts';
import { useMetadataServerSettings } from '@/modules/settings/services/ServerSettingsMetadata.ts';
import { TChapterReader } from '@/modules/chapter/Chapter.types.ts';
import { awaitConfirmation } from '@/modules/core/utils/AwaitableDialog.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { TReaderOverlayContext } from '@/modules/reader/types/ReaderOverlay.types.ts';
import { ReaderProgressBarProps, TReaderProgressCurrentPage } from '@/modules/reader/types/ReaderProgressBar.types.ts';

const getScrollDirectionInvert = (
    scrollDirection: ScrollDirection,
    scrollOffset: ScrollOffset,
    themeDirection: Direction,
): 1 | -1 => {
    if (scrollDirection === ScrollDirection.X) {
        if (scrollOffset === ScrollOffset.BACKWARD) {
            if (themeDirection === 'ltr') {
                return -1;
            }

            return 1;
        }

        if (scrollOffset === ScrollOffset.FORWARD) {
            if (themeDirection === 'ltr') {
                return 1;
            }

            return -1;
        }
    }

    // handle ScrollDirection.XY the same as ScrollDirection.Y
    if (scrollOffset === ScrollOffset.BACKWARD) {
        return -1;
    }

    return 1;
};

export class ReaderControls {
    private static updateCurrentPageTimeout: NodeJS.Timeout;

    static scroll(
        offset: ScrollOffset,
        direction: ScrollDirection,
        readingMode: ReadingMode,
        readingDirection: ReadingDirection,
        themeDirection: Direction,
        element: HTMLElement,
        openChapter: ReturnType<(typeof ReaderControls)['useOpenChapter']>,
        setIsOverlayVisible: TReaderOverlayContext['setIsVisible'],
        setShowPreview: TReaderTapZoneContext['setShowPreview'],
        scrollAmountPercentage: number = ReaderScrollAmount.LARGE,
    ): void {
        if (!element) {
            return;
        }

        const themeDirectionOfReadingDirection = READING_DIRECTION_TO_THEME_DIRECTION[readingDirection];
        const areReadingDirectionsEqual = themeDirection === themeDirectionOfReadingDirection;
        const isContinuousReadingModeActive = isContinuousReadingMode(readingMode);

        const isAtStartY = Math.abs(element.scrollTop) <= 1;
        const isAtEndY =
            Math.floor(element.scrollTop) === element.scrollHeight - element.clientHeight ||
            Math.ceil(element.scrollTop) === element.scrollHeight - element.clientHeight;
        const isAtStartX = Math.abs(element.scrollLeft) <= 1;
        const isAtEndX =
            element.scrollWidth - element.clientWidth - Math.floor(Math.abs(element.scrollLeft)) <= 1 ||
            element.scrollWidth - element.clientWidth - Math.ceil(Math.abs(element.scrollLeft)) <= 1;
        const isAtStartXForDirection = areReadingDirectionsEqual ? isAtStartX : isAtEndX;
        const isAtEndXForDirection = areReadingDirectionsEqual ? isAtEndX : isAtStartX;

        const scrollAmount = scrollAmountPercentage / 100;
        const scrollDirection = getScrollDirectionInvert(direction, offset, themeDirectionOfReadingDirection);

        const getNewScrollPosition = (currentPos: number, elementSize: number) =>
            currentPos + elementSize * scrollAmount * scrollDirection;

        setIsOverlayVisible(false);
        setShowPreview(false);

        switch (direction) {
            case ScrollDirection.X:
                if (isAtStartXForDirection && offset === ScrollOffset.BACKWARD && isContinuousReadingModeActive) {
                    openChapter('previous');
                    return;
                }

                if (isAtEndXForDirection && offset === ScrollOffset.FORWARD && isContinuousReadingModeActive) {
                    openChapter('next');
                    return;
                }

                element.scroll({
                    left: getNewScrollPosition(element.scrollLeft, element.clientWidth),
                    behavior: 'smooth',
                });
                break;
            case ScrollDirection.Y:
                if (isAtStartY && offset === ScrollOffset.BACKWARD && isContinuousReadingModeActive) {
                    openChapter('previous');
                    return;
                }

                if (isAtEndY && offset === ScrollOffset.FORWARD && isContinuousReadingModeActive) {
                    openChapter('next');
                    return;
                }

                element.scroll({
                    top: getNewScrollPosition(element.scrollTop, element.clientHeight),
                    behavior: 'smooth',
                });
                break;
            default:
                throw new Error(`Unexpected "ScrollDirection" (${direction})`);
        }
    }

    static useOpenChapter(): (
        offset: 'previous' | 'next' | ChapterIdInfo['id'],
        doTransitionCheck?: boolean,
        scrollIntoView?: boolean,
    ) => void {
        const { t } = useTranslation();
        const { readingMode, shouldInformAboutMissingChapter, shouldInformAboutScanlatorChange } =
            ReaderService.useSettings();
        const { currentChapter, previousChapter, nextChapter, chapters, setReaderStateChapters } =
            useReaderStateChaptersContext();

        const openChapter = ReaderService.useNavigateToChapter();

        return useCallback(
            (offset, doTransitionCheck = true, scrollIntoView = true) => {
                if (!currentChapter) {
                    return;
                }

                const isSpecificChapterMode = typeof offset === 'number';
                const isPreviousOffset = offset === 'previous';

                const doesPreviousChapterExist = isPreviousOffset && !!previousChapter;
                const doesNextChapterExist = !isPreviousOffset && !!nextChapter;

                const canOpenNextChapter = isSpecificChapterMode || doesPreviousChapterExist || doesNextChapterExist;
                if (!canOpenNextChapter) {
                    return;
                }

                const doOpenChapter = async () => {
                    const chapterToOpen = (() => {
                        if (isSpecificChapterMode) {
                            return chapters.find((chapter) => chapter.id === offset);
                        }

                        if (isPreviousOffset) {
                            return previousChapter;
                        }

                        return nextChapter;
                    })();

                    if (!chapterToOpen) {
                        return;
                    }

                    const isPreviousChapter = chapterToOpen.sourceOrder < currentChapter.sourceOrder;

                    try {
                        if (doTransitionCheck) {
                            await ReaderControls.checkNextChapterConsistency(
                                t,
                                isPreviousChapter ? 'previous' : 'next',
                                currentChapter,
                                chapterToOpen,
                                shouldInformAboutMissingChapter,
                                shouldInformAboutScanlatorChange,
                            );
                        }

                        setReaderStateChapters((prevState) =>
                            updateReaderStateVisibleChapters(
                                isPreviousChapter,
                                prevState,
                                chapterToOpen.sourceOrder,
                                scrollIntoView,
                            ),
                        );

                        openChapter(chapterToOpen, isPreviousChapter ? ReaderResumeMode.END : ReaderResumeMode.START);
                    } catch (error) {
                        defaultPromiseErrorHandler('ReaderControls#useOpenChapter#doOpenChapter: ');
                    }
                };

                doOpenChapter().catch(defaultPromiseErrorHandler('ReaderControls#useOpenChapter'));
            },
            [
                t,
                currentChapter?.id,
                openChapter,
                readingMode.value,
                shouldInformAboutMissingChapter,
                shouldInformAboutScanlatorChange,
            ],
        );
    }

    private static async checkNextChapterConsistency(
        t: TFunction,
        offset: 'previous' | 'next',
        currentChapter: TChapterReader | null | undefined,
        chapterToOpen: TChapterReader | null | undefined,
        shouldInformAboutMissingChapter: boolean,
        shouldInformAboutScanlatorChange: boolean,
    ): Promise<void> {
        if (!currentChapter || !chapterToOpen) {
            return;
        }

        const missingChapters = Math.max(
            0,
            Math.trunc(currentChapter.chapterNumber) - Math.trunc(chapterToOpen.chapterNumber) - 1,
        );
        const isSameScanlator =
            !shouldInformAboutScanlatorChange || currentChapter.scanlator === chapterToOpen.scanlator;
        const isContinuousChapter = !shouldInformAboutMissingChapter || !missingChapters;

        const showWarning = !isSameScanlator || !isContinuousChapter;
        if (!showWarning) {
            return;
        }

        const offsetToTranslationKeys: Record<typeof offset, Record<'scanlator' | 'chapter_number', TranslationKey>> = {
            previous: {
                scanlator: 'reader.chapter_transition.warning.previous.scanlator',
                chapter_number: 'reader.chapter_transition.warning.previous.chapter_number',
            },
            next: {
                scanlator: 'reader.chapter_transition.warning.next.scanlator',
                chapter_number: 'reader.chapter_transition.warning.next.chapter_number',
            },
        };

        const sameScanlator = isSameScanlator
            ? ''
            : t(offsetToTranslationKeys[offset].scanlator, {
                  nextScanlator: chapterToOpen.scanlator,
                  currentScanlator: currentChapter.scanlator,
              });
        const continuousChapter = isContinuousChapter
            ? ''
            : t(offsetToTranslationKeys[offset].chapter_number, {
                  count: missingChapters,
                  nextChapter: `#${chapterToOpen.chapterNumber} ${chapterToOpen.name}`,
                  currentChapter: `#${currentChapter.chapterNumber} ${currentChapter.name}`,
              });
        const warningLineBreak = !isSameScanlator && !isContinuousChapter ? '\n\n' : '';
        const warning = `${sameScanlator}${warningLineBreak}${continuousChapter}`;

        await awaitConfirmation({
            title: t('reader.chapter_transition.warning.title'),
            message: warning,
            actions: {
                confirm: {
                    title: t('global.button.open'),
                },
            },
        });
    }

    static useOpenPage(): (
        page: number | 'previous' | 'next',
        forceDirection?: Direction,
        hideOverlay?: boolean,
    ) => void {
        const { currentPageIndex, setPageToScrollToIndex, pages, transitionPageMode, setTransitionPageMode } =
            userReaderStatePagesContext();
        const { previousChapter, nextChapter } = useReaderStateChaptersContext();
        const { setIsVisible: setIsOverlayVisible } = useReaderOverlayContext();
        const { setShowPreview } = useReaderTapZoneContext();
        const { readingDirection, readingMode } = ReaderService.useSettings();
        const openChapter = ReaderControls.useOpenChapter();

        const currentPage = useMemo(() => getPage(currentPageIndex, pages), [currentPageIndex, pages]);
        const previousPageIndex = useMemo(
            () => getNextPageIndex('previous', currentPage.pagesIndex, pages),
            [currentPage, pages],
        );
        const nextPageIndex = useMemo(
            () => getNextPageIndex('next', currentPage.pagesIndex, pages),
            [currentPage, pages],
        );
        const indexOfFirstPage = getNextIndexFromPage(pages[0]);
        const indexOfLastPage = getNextIndexFromPage(pages[pages.length - 1]);
        const direction = READING_DIRECTION_TO_THEME_DIRECTION[readingDirection.value];

        const isFirstPage = currentPage.primary.index === 0;
        const isLastPage = currentPageIndex === indexOfLastPage;
        const isATransitionPageVisibleFlag = isATransitionPageVisible(transitionPageMode, readingMode.value);
        const isContinuousReadingModeActive = isContinuousReadingMode(readingMode.value);

        return useCallback(
            (page, forceDirection = direction, hideOverlay: boolean = true) => {
                const convertedPage = getOptionForDirection(
                    page,
                    page === 'previous' ? 'next' : 'previous',
                    forceDirection,
                );

                if (hideOverlay) {
                    setIsOverlayVisible(false);
                    setShowPreview(false);
                }

                const hideTransitionPage = () => setTransitionPageMode(ReaderTransitionPageMode.NONE);

                if (typeof page === 'number') {
                    setPageToScrollToIndex(page);
                    hideTransitionPage();
                    return;
                }

                const shouldOpenPreviousChapter =
                    isFirstPage && isATransitionPageVisibleFlag && convertedPage === 'previous' && !!previousChapter;
                if (shouldOpenPreviousChapter) {
                    openChapter('previous');
                    return;
                }

                const shouldOpenNextChapter =
                    isLastPage && isATransitionPageVisibleFlag && convertedPage === 'next' && !!nextChapter;
                if (shouldOpenNextChapter) {
                    openChapter('next');
                    return;
                }

                const needToHideTransitionPage = isATransitionPageVisibleFlag && !isContinuousReadingModeActive;
                switch (convertedPage) {
                    case 'previous':
                        if (isFirstPage) {
                            setTransitionPageMode(ReaderTransitionPageMode.PREVIOUS);
                            return;
                        }

                        if (needToHideTransitionPage) {
                            hideTransitionPage();
                            setPageToScrollToIndex(indexOfLastPage);
                            return;
                        }

                        setPageToScrollToIndex(previousPageIndex);
                        break;
                    case 'next':
                        if (isLastPage) {
                            setTransitionPageMode(ReaderTransitionPageMode.NEXT);
                            return;
                        }

                        if (needToHideTransitionPage) {
                            hideTransitionPage();
                            setPageToScrollToIndex(indexOfFirstPage);
                            return;
                        }

                        setPageToScrollToIndex(nextPageIndex);
                        break;
                    default:
                        throw new Error(`Unexpected "offset" (${page})`);
                }
            },
            [
                direction,
                indexOfFirstPage,
                indexOfLastPage,
                previousPageIndex,
                nextPageIndex,
                indexOfLastPage,
                isATransitionPageVisibleFlag,
                isContinuousReadingModeActive,
                isFirstPage,
                isLastPage,
                openChapter,
                !!previousChapter,
                !!nextChapter,
            ],
        );
    }

    static useUpdateCurrentPageIndex(): (
        pageIndex: number,
        debounceChapterUpdate?: boolean,
        endReached?: boolean,
    ) => void {
        const { currentPageIndex, setCurrentPageIndex } = userReaderStatePagesContext();
        const { initialChapter, currentChapter, nextChapter, mangaChapters } = useReaderStateChaptersContext();
        const updateChapter = ReaderService.useUpdateChapter();
        const { shouldSkipDupChapters } = ReaderService.useSettings();
        const {
            settings: { downloadAheadLimit },
        } = useMetadataServerSettings();

        const nextChapters = useMemo(() => {
            if (!initialChapter || !currentChapter) {
                return [];
            }

            return Chapters.getNextChapters(currentChapter, mangaChapters, {
                offset: DirectionOffset.NEXT,
                skipDupe: shouldSkipDupChapters,
                skipDupeChapter: initialChapter,
            });
        }, [initialChapter?.id, currentChapter?.id, mangaChapters, shouldSkipDupChapters]);

        return useCallback(
            (pageIndex, debounceChapterUpdate = true, endReached = false) => {
                setCurrentPageIndex(pageIndex);

                if (!currentChapter) {
                    return;
                }

                ReaderService.downloadAhead(currentChapter, nextChapter, nextChapters, pageIndex, downloadAheadLimit);

                const handleCurrentPageIndexChange = () => {
                    const currentChapterUpToDate = getReaderChapterFromCache(currentChapter.id);
                    if (!currentChapterUpToDate) {
                        return;
                    }

                    const actualPageIndex = endReached ? currentChapterUpToDate.pageCount - 1 : pageIndex;
                    const isLastPage = actualPageIndex === currentChapterUpToDate.pageCount - 1;

                    updateChapter({
                        lastPageRead: actualPageIndex,
                        isRead: isLastPage ? true : undefined,
                    });
                };

                clearTimeout(ReaderControls.updateCurrentPageTimeout);
                if (debounceChapterUpdate) {
                    ReaderControls.updateCurrentPageTimeout = setTimeout(handleCurrentPageIndexChange, 1000);
                    return;
                }

                handleCurrentPageIndexChange();
            },
            [currentChapter?.id, nextChapter?.id, nextChapters, currentPageIndex, downloadAheadLimit],
        );
    }

    static updateCurrentPageOnScroll(
        imageRefs: MutableRefObject<(HTMLElement | null)[]>,
        lastPageIndex: number,
        updateCurrentPageIndex: ReturnType<typeof ReaderControls.useUpdateCurrentPageIndex>,
        type: PageInViewportType,
        readingDirection: ReadingDirection,
    ) {
        const themeDirectionForReadingDirection = READING_DIRECTION_TO_THEME_DIRECTION[readingDirection];

        const firstVisibleImageIndex = imageRefs.current.findIndex(
            (image) =>
                image &&
                isPageInViewport(
                    image,
                    type,
                    // the pages aren't always properly scrolled to the top which results in the leading page to still be slightly
                    // visible (e.g. 0.0123px) breaking the "first visible image" detection
                    {
                        bottom: 1,
                        left: getOptionForDirection(0, window.innerWidth + 1, themeDirectionForReadingDirection),
                        right: getOptionForDirection(1, 0, themeDirectionForReadingDirection),
                    },
                ),
        );
        const lastPage = imageRefs.current?.[imageRefs.current.length - 1];
        const isEndReached = lastPage && isEndOfPageInViewport(lastPage, type, readingDirection);

        if (firstVisibleImageIndex === -1) {
            return;
        }

        // handle cases where the last page is too small to ever be the "firstVisibleImageIndex"
        if (isEndReached) {
            updateCurrentPageIndex(firstVisibleImageIndex, false, true);
            return;
        }

        updateCurrentPageIndex(firstVisibleImageIndex, firstVisibleImageIndex !== lastPageIndex);
    }

    static useHandleClick(
        scrollElement: HTMLElement | null,
    ): (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void {
        const { direction: themeDirection } = useTheme();
        const { setIsVisible: setIsOverlayVisible } = useReaderOverlayContext();
        const { currentPageIndex, pages } = userReaderStatePagesContext();
        const { setShowPreview } = useReaderTapZoneContext();
        const { readingMode, readingDirection, isStaticNav } = ReaderService.useSettings();
        const openPage = ReaderControls.useOpenPage();
        const openChapter = ReaderControls.useOpenChapter();

        return useCallback(
            (e) => {
                if (!scrollElement) {
                    return;
                }

                const rect = e.currentTarget.getBoundingClientRect();
                const rectRelativeX = e.clientX - rect.left;
                const rectRelativeY = e.clientY - rect.top;
                const action = ReaderTapZoneService.getAction(rectRelativeX, rectRelativeY);

                setShowPreview(false);

                const isContinuousReadingModeActive = isContinuousReadingMode(readingMode.value);
                const scrollDirection =
                    readingMode.value === ReadingMode.CONTINUOUS_HORIZONTAL ? ScrollDirection.X : ScrollDirection.Y;

                switch (action) {
                    case TapZoneRegionType.MENU:
                        setIsOverlayVisible((isVisible) => isStaticNav || !isVisible);
                        break;
                    case TapZoneRegionType.PREVIOUS:
                        if (isContinuousReadingModeActive) {
                            ReaderControls.scroll(
                                ScrollOffset.BACKWARD,
                                scrollDirection,
                                readingMode.value,
                                readingDirection.value,
                                themeDirection,
                                scrollElement,
                                openChapter,
                                setIsOverlayVisible,
                                setShowPreview,
                            );
                        } else {
                            openPage('previous', 'ltr');
                        }
                        break;
                    case TapZoneRegionType.NEXT:
                        if (isContinuousReadingModeActive) {
                            ReaderControls.scroll(
                                ScrollOffset.FORWARD,
                                scrollDirection,
                                readingMode.value,
                                readingDirection.value,
                                themeDirection,
                                scrollElement,
                                openChapter,
                                setIsOverlayVisible,
                                setShowPreview,
                            );
                        } else {
                            openPage('next', 'ltr');
                        }
                        break;
                    default:
                        throw new Error(`Unexpected "TapZoneRegionType" (${action})`);
                }
            },
            [
                scrollElement,
                currentPageIndex,
                pages,
                readingMode.value,
                openPage,
                readingDirection.value,
                openChapter,
                themeDirection,
                isStaticNav,
            ],
        );
    }

    static useHandleProgressDragging(
        openPage: ReturnType<(typeof ReaderControls)['useOpenPage']>,
        progressBarRef: RefObject<HTMLDivElement | null>,
        isDragging: boolean,
        currentPage: TReaderProgressCurrentPage,
        pages: ReaderProgressBarProps['pages'],
        progressBarPosition: ProgressBarPosition,
        getOptionForDirectionFn: typeof getOptionForDirection,
        fullSegmentClicks: boolean,
    ): void {
        useEffect(() => {
            if (!isDragging) {
                return () => undefined;
            }

            const { isHorizontal } = getProgressBarPositionInfo(progressBarPosition);

            const handleMove = (coordinates: { clientX: number; clientY: number }) => {
                if (!progressBarRef.current) {
                    return;
                }

                const newPageIndex = getNextIndexFromPage(
                    getPageForMousePos(
                        coordinates,
                        progressBarRef.current,
                        pages,
                        isHorizontal,
                        fullSegmentClicks,
                        getOptionForDirectionFn,
                    ),
                );

                const hasCurrentPageIndexChanged = getNextIndexFromPage(currentPage) !== newPageIndex;
                if (!hasCurrentPageIndexChanged) {
                    return;
                }

                openPage(newPageIndex, undefined, false);
            };

            const handleMouseMove = (e: MouseEvent) => {
                handleMove(e);
            };

            const handleTouchMove = (e: TouchEvent) => {
                if (e.touches.length > 0) {
                    handleMove(e.touches[0]);
                }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('touchmove', handleTouchMove);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('touchmove', handleTouchMove);
            };
        }, [openPage, isDragging, currentPage, pages, progressBarPosition]);
    }
}

/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { MutableRefObject } from 'react';
import { TapZoneInvertMode, TapZoneLayouts } from '@/modules/reader/types/TapZoneLayout.types.ts';
import { TChapterReader } from '@/modules/chapter/Chapter.types.ts';
import { ReaderService } from '@/modules/reader/services/ReaderService.ts';
import { ReaderStatePages } from '@/modules/reader/types/ReaderProgressBar.types.ts';
import { TMangaReader } from '@/modules/manga/Manga.types.ts';
import { useAutomaticScrolling } from '@/modules/core/hooks/useAutomaticScrolling.ts';

export enum ProgressBarType {
    HIDDEN,
    STANDARD,
}

export enum ProgressBarPosition {
    AUTO,
    BOTTOM,
    LEFT,
    RIGHT,
}

type TProgressBarPositionAutoVertical = Exclude<
    ProgressBarPosition,
    ProgressBarPosition.BOTTOM | ProgressBarPosition.AUTO
>;
export const ProgressBarPositionAutoVertical = {
    [ProgressBarPosition.LEFT]: ProgressBarPosition.LEFT,
    [ProgressBarPosition.RIGHT]: ProgressBarPosition.RIGHT,
} satisfies Record<TProgressBarPositionAutoVertical, TProgressBarPositionAutoVertical>;

export enum ReadingDirection {
    LTR,
    RTL,
}

export enum ReadingMode {
    SINGLE_PAGE,
    DOUBLE_PAGE,
    CONTINUOUS_VERTICAL,
    CONTINUOUS_HORIZONTAL,
    WEBTOON,
}

export enum ReaderPageScaleMode {
    WIDTH,
    HEIGHT,
    SCREEN,
    ORIGINAL,
}

export enum ReaderOverlayMode {
    AUTO,
    DESKTOP,
    MOBILE,
}

export enum ReaderExitMode {
    PREVIOUS,
    MANGA,
}

export enum ReaderBackgroundColor {
    THEME,
    BLACK,
    GRAY,
    WHITE,
}

export interface ReaderFilterRGBA {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

export interface ReaderCustomFilter {
    brightness: {
        /**
         * percentage
         */
        value: number;
        enabled: boolean;
    };
    contrast: {
        /**
         * percentage
         */
        value: number;
        enabled: boolean;
    };
    saturate: {
        /**
         * percentage
         */
        value: number;
        enabled: boolean;
    };
    hue: {
        /**
         * degree
         */
        value: number;
        enabled: boolean;
    };
    rgba: {
        value: ReaderFilterRGBA;
        enabled: boolean;
    };
    sepia: boolean;
    grayscale: boolean;
    invert: boolean;
}

export interface IReaderSettingsGlobal {
    overlayMode: ReaderOverlayMode;
    exitMode: ReaderExitMode;
    customFilter: ReaderCustomFilter;
    shouldSkipDupChapters: boolean;
    progressBarType: ProgressBarType;
    /**
     * pixel
     */
    progressBarSize: number;
    progressBarPosition: ProgressBarPosition;
    progressBarPositionAutoVertical: TProgressBarPositionAutoVertical;
    shouldShowPageNumber: boolean;
    isStaticNav: boolean;
    backgroundColor: ReaderBackgroundColor;
    hotkeys: Record<ReaderHotkey, string[]>;
    imagePreLoadAmount: number;
    shouldUseAutoWebtoonMode: boolean;
    autoScroll: {
        /**
         * interval in seconds
         */
        value: number;
        smooth: boolean;
    };
    shouldShowReadingModePreview: boolean;
    shouldShowTapZoneLayoutPreview: boolean;
    shouldInformAboutMissingChapter: boolean;
    shouldInformAboutScanlatorChange: boolean;
}

export interface IReaderSettingsManga {
    tapZoneLayout: TapZoneLayouts;
    tapZoneInvertMode: TapZoneInvertMode;
    pageScaleMode: ReaderPageScaleMode;
    shouldStretchPage: boolean;
    shouldOffsetDoubleSpreads: boolean;
    readingDirection: ReadingDirection;
    readingMode: ReadingMode;
    /**
     * pixel
     */
    pageGap: number;
    readerWidth: {
        /**
         * percentage
         */
        value: number;
        enabled: boolean;
    };
}

export interface IReaderSettings extends IReaderSettingsGlobal, IReaderSettingsManga {}

export interface IReaderSettingsWithDefaultFlag
    extends IReaderSettingsGlobal,
        TransformRecordToWithDefaultFlag<IReaderSettingsManga> {}

export interface ReaderStateChapters {
    /**
     * all chapters of the manga
     */
    mangaChapters: TChapterReader[];
    /**
     * actual chapters that have been filtered
     *
     * optional filters:
     *  - removed duplicate chapters
     */
    chapters: TChapterReader[];
    initialChapter?: TChapterReader | null;
    currentChapter?: TChapterReader | null;
    nextChapter?: TChapterReader;
    previousChapter?: TChapterReader;
    /**
     * Based from the initial chapter index
     */
    visibleChapters: {
        leading: number;
        trailing: number;
        lastLeadingChapterSourceOrder: number;
        lastTrailingChapterSourceOrder: number;
        scrollIntoView: boolean;
        resumeMode?: ReaderResumeMode;
    };
    setReaderStateChapters: React.Dispatch<React.SetStateAction<Omit<ReaderStateChapters, 'setReaderStateChapters'>>>;
}

interface ReaderSettingsTypeBaseProps {
    settings: IReaderSettingsWithDefaultFlag;
    updateSetting: (
        ...args: OmitFirst<Parameters<typeof ReaderService.updateSetting>>
    ) => ReturnType<typeof ReaderService.updateSetting>;
}

export interface ReaderSettingsDefaultableProps {
    isDefaultable: boolean;
    onDefault: (setting: keyof IReaderSettings) => void;
}

interface ReaderSettingsTypeDefaultableProps extends ReaderSettingsTypeBaseProps, ReaderSettingsDefaultableProps {
    isDefaultable: true;
}

interface ReaderSettingsTypeNonDefaultableProps extends ReaderSettingsTypeBaseProps {}

export type ReaderSettingsTypeProps =
    | ReaderSettingsTypeDefaultableProps
    | (PropertiesNever<Omit<ReaderSettingsTypeDefaultableProps, keyof ReaderSettingsTypeBaseProps>> &
          ReaderSettingsTypeNonDefaultableProps);

export enum ReaderHotkey {
    PREVIOUS_PAGE,
    NEXT_PAGE,
    SCROLL_BACKWARD,
    SCROLL_FORWARD,
    PREVIOUS_CHAPTER,
    NEXT_CHAPTER,
    TOGGLE_MENU,
    CYCLE_SCALE_TYPE,
    STRETCH_IMAGE,
    OFFSET_SPREAD_PAGES,
    CYCLE_READING_MODE,
    CYCLE_READING_DIRECTION,
    TOGGLE_AUTO_SCROLL,
    AUTO_SCROLL_SPEED_INCREASE,
    AUTO_SCROLL_SPEED_DECREASE,
}

export interface ReaderPagerProps
    extends Pick<
        ReaderStatePages,
        | 'currentPageIndex'
        | 'pages'
        | 'totalPages'
        | 'transitionPageMode'
        | 'pageLoadStates'
        | 'retryFailedPagesKeyPrefix'
    > {
    onLoad?: (pagesIndex: number, url: string, isPrimary?: boolean) => void;
    onError?: (pageIndex: number, url: string) => void;
    imageRefs: MutableRefObject<(HTMLElement | null)[]>;
}

export enum PageInViewportType {
    X,
    Y,
}

export enum ReaderTransitionPageMode {
    NONE,
    PREVIOUS,
    NEXT,
    BOTH,
}

export enum ReaderResumeMode {
    START,
    END,
    LAST_READ,
}

export type TReaderScrollbarContext = {
    scrollbarXSize: number;
    setScrollbarXSize: (size: number) => void;
    scrollbarYSize: number;
    setScrollbarYSize: (size: number) => void;
};

export type TReaderStateMangaContext = {
    manga: TMangaReader | undefined;
    setManga: (manga: TMangaReader | undefined) => void;
};

export type TReaderStateSettingsContext = {
    settings: IReaderSettingsWithDefaultFlag;
    setSettings: (settings: IReaderSettingsWithDefaultFlag) => void;
};

export type TReaderAutoScrollContext = ReturnType<typeof useAutomaticScrolling> & {
    isActive: boolean;
    scrollRef?: MutableRefObject<HTMLElement | null> | (() => void);
    setScrollRef: (scrollRef?: MutableRefObject<HTMLElement | null>) => void;
};

export type ReaderPageSpreadState = { url: string; isSpread: boolean };

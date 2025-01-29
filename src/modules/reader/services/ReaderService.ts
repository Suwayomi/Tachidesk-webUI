/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Direction, useTheme } from '@mui/material/styles';
import { t as translate } from 'i18next';
import { TChapterReader } from '@/modules/chapter/Chapter.types.ts';
import { ChapterIdInfo, Chapters } from '@/modules/chapter/services/Chapters.ts';
import {
    IReaderSettings,
    IReaderSettingsWithDefaultFlag,
    ReaderExitMode,
    ReaderOverlayMode,
    ReaderResumeMode,
    ReadingDirection,
    ReadingMode,
} from '@/modules/reader/types/Reader.types.ts';
import { useReaderStateMangaContext } from '@/modules/reader/contexts/state/ReaderStateMangaContext.tsx';
import {
    convertFromReaderSettingsWithDefaultFlag,
    updateReaderSettings,
} from '@/modules/reader/services/ReaderSettingsMetadata.ts';
import { MangaIdInfo } from '@/modules/manga/Manga.types.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { MANGA_META_FIELDS } from '@/lib/graphql/fragments/MangaFragments.ts';
import { makeToast } from '@/modules/core/utils/Toast.ts';
import { MediaQuery } from '@/modules/core/utils/MediaQuery.tsx';
import { GLOBAL_METADATA } from '@/lib/graphql/fragments/Fragments.ts';
import { updateMetadataList } from '@/modules/metadata/services/MetadataApolloCacheHandler.ts';
import { useBackButton } from '@/modules/core/hooks/useBackButton.ts';
import { GLOBAL_READER_SETTING_KEYS } from '@/modules/reader/constants/ReaderSettings.constants.tsx';
import { useReaderStateSettingsContext } from '@/modules/reader/contexts/state/ReaderStateSettingsContext.tsx';
import { UpdateChapterPatchInput } from '@/lib/graphql/generated/graphql.ts';
import { useReaderStateChaptersContext } from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';
import { useMetadataServerSettings } from '@/modules/settings/services/ServerSettingsMetadata.ts';
import { DirectionOffset } from '@/Base.types.ts';
import {
    getChapterIdsForDownloadAhead,
    getChapterIdsToDeleteForChapterUpdate,
    getReaderChapterFromCache,
} from '@/modules/reader/utils/Reader.utils.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { Queue } from '@/lib/Queue.ts';
import { AppRoutes } from '@/modules/core/AppRoute.constants.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { FALLBACK_MANGA } from '@/modules/manga/Manga.constants.ts';
import { getMetadataKey } from '@/modules/metadata/Metadata.utils.ts';

const DIRECTION_TO_INVERTED: Record<Direction, Direction> = {
    ltr: 'rtl',
    rtl: 'ltr',
};

const DIRECTION_TO_READING_DIRECTION: Record<Direction, ReadingDirection> = {
    ltr: ReadingDirection.LTR,
    rtl: ReadingDirection.RTL,
};

export class ReaderService {
    private static downloadAheadQueue: Queue = new Queue(1);

    private static chapterUpdateQueues: Map<ChapterIdInfo['id'], Queue> = new Map();

    private static getOrCreateChapterUpdateQueue(id: ChapterIdInfo['id']): Queue {
        if (!ReaderService.chapterUpdateQueues.has(id)) {
            ReaderService.chapterUpdateQueues.set(id, new Queue(1));
        }

        return ReaderService.chapterUpdateQueues.get(id)!;
    }

    static useNavigateToChapter(): (chapter: TChapterReader, resumeMode?: ReaderResumeMode) => void {
        const navigate = useNavigate();

        return useCallback((chapter, resumeMode) => {
            navigate(Chapters.getReaderUrl(chapter), {
                replace: true,
                state: {
                    resumeMode,
                },
            });
        }, []);
    }

    static downloadAhead(
        currentChapter: TChapterReader,
        nextChapter: TChapterReader | undefined,
        nextChapters: TChapterReader[],
        pageIndex: number,
        downloadAheadLimit: number,
    ): void {
        const key = `${currentChapter.id}_${nextChapter?.id}_${pageIndex}_${downloadAheadLimit}`;

        ReaderService.downloadAheadQueue.enqueue(key, async () => {
            const chapterIdsForDownloadAhead = getChapterIdsForDownloadAhead(
                currentChapter,
                nextChapter,
                nextChapters,
                pageIndex,
                downloadAheadLimit,
            );

            if (!chapterIdsForDownloadAhead.length) {
                return;
            }

            try {
                await Chapters.download(chapterIdsForDownloadAhead);
            } catch (e) {
                defaultPromiseErrorHandler('ReaderService::useUpdateCurrentPageIndex: download ahead');
            }
        });
    }

    static useUpdateChapter(): (patch: UpdateChapterPatchInput) => void {
        const { manga } = useReaderStateMangaContext();
        const { initialChapter, currentChapter, mangaChapters } = useReaderStateChaptersContext();
        const { shouldSkipDupChapters } = ReaderService.useSettings();
        const {
            settings: { deleteChaptersWhileReading, deleteChaptersWithBookmark, updateProgressAfterReading },
        } = useMetadataServerSettings();

        const previousChapters = useMemo(() => {
            if (!initialChapter || !currentChapter) {
                return [];
            }

            return Chapters.getNextChapters(currentChapter, mangaChapters, {
                offset: DirectionOffset.PREVIOUS,
                skipDupe: shouldSkipDupChapters,
                skipDupeChapter: initialChapter,
            });
        }, [initialChapter?.id, currentChapter?.id, mangaChapters, shouldSkipDupChapters]);

        return useCallback(
            (patch) => {
                if (!manga || !currentChapter) {
                    return;
                }

                const update = async () => {
                    const chapterIdsToUpdate = Chapters.getIds(
                        shouldSkipDupChapters
                            ? Chapters.addDuplicates([currentChapter], mangaChapters)
                            : [currentChapter],
                    );

                    const chapterIdsToDelete = getChapterIdsToDeleteForChapterUpdate(
                        currentChapter,
                        mangaChapters,
                        previousChapters,
                        patch,
                        deleteChaptersWhileReading,
                        deleteChaptersWithBookmark,
                        shouldSkipDupChapters,
                    );

                    const isUpdateRequired =
                        !!chapterIdsToDelete.length ||
                        chapterIdsToUpdate.some((id) => {
                            const chapterUpToDateData = getReaderChapterFromCache(id);
                            if (!chapterUpToDateData) {
                                return false;
                            }

                            return (
                                (patch.isRead !== undefined && patch.isRead !== chapterUpToDateData.isRead) ||
                                (patch.lastPageRead !== undefined &&
                                    patch.lastPageRead !== chapterUpToDateData.lastPageRead) ||
                                (patch.isBookmarked !== undefined &&
                                    patch.isBookmarked !== chapterUpToDateData.isBookmarked)
                            );
                        });
                    if (!isUpdateRequired) {
                        return;
                    }

                    await requestManager
                        .updateChapters(
                            chapterIdsToUpdate,
                            {
                                ...patch,
                                chapterIdsToDelete,
                                trackProgressMangaId:
                                    updateProgressAfterReading && patch.isRead && manga.trackRecords.totalCount
                                        ? manga.id
                                        : undefined,
                            },
                            { errorPolicy: 'all' },
                        )
                        .response.catch(defaultPromiseErrorHandler('ReaderService::useUpdateChapter'));
                };

                ReaderService.getOrCreateChapterUpdateQueue(currentChapter.id).enqueue(`${currentChapter.id}`, update);
            },
            [
                manga?.id,
                currentChapter?.id,
                mangaChapters,
                previousChapters,
                shouldSkipDupChapters,
                deleteChaptersWhileReading,
                deleteChaptersWithBookmark,
                updateProgressAfterReading,
            ],
        );
    }

    static useSettings(): IReaderSettingsWithDefaultFlag {
        return useReaderStateSettingsContext().settings;
    }

    static useSettingsWithoutDefaultFlag(): IReaderSettings {
        return convertFromReaderSettingsWithDefaultFlag(ReaderService.useSettings());
    }

    static useGetThemeDirection(): Direction {
        const { direction } = useTheme();
        const { readingDirection } = ReaderService.useSettings();

        return DIRECTION_TO_READING_DIRECTION[direction] === readingDirection.value
            ? direction
            : DIRECTION_TO_INVERTED[direction];
    }

    /**
     * Writes the change immediately to the cache and sends a mutation in case "commit" is true.
     */
    static updateSetting<Setting extends keyof IReaderSettings>(
        manga: MangaIdInfo,
        setting: Setting,
        value: IReaderSettings[Setting],
        commit: boolean = true,
        isGlobal: boolean = false,
        profile?: ReadingMode,
    ): void {
        if (!manga || manga.id === FALLBACK_MANGA.id) {
            return;
        }
        const key = getMetadataKey(setting, profile !== undefined ? [profile?.toString()] : undefined);

        const { cache } = requestManager.graphQLClient.client;

        const isGlobalSetting = isGlobal || GLOBAL_READER_SETTING_KEYS.includes(setting);
        if (isGlobalSetting) {
            const reference = cache.writeFragment({
                fragment: GLOBAL_METADATA,
                data: {
                    __typename: 'GlobalMetaType',
                    key,
                    value: JSON.stringify(value),
                },
            });
            cache.modify({
                fields: {
                    metas(existingMetas, { readField }) {
                        return {
                            ...existingMetas,
                            nodes: updateMetadataList(key, existingMetas?.nodes, readField, () => reference),
                        };
                    },
                },
            });
        } else {
            const reference = cache.writeFragment({
                fragment: MANGA_META_FIELDS,
                data: {
                    __typename: 'MangaMetaType',
                    mangaId: manga.id,
                    key,
                    value: JSON.stringify(value),
                },
            });
            cache.modify({
                id: cache.identify({ __typename: 'MangaType', id: manga.id }),
                fields: {
                    meta(existingMetas, { readField }) {
                        return updateMetadataList(key, existingMetas, readField, () => reference);
                    },
                },
            });
        }

        if (commit) {
            updateReaderSettings(manga, setting, value, isGlobal, profile).catch((e) =>
                makeToast(
                    translate('reader.settings.error.label.failed_to_save_settings'),
                    'error',
                    getErrorMessage(e),
                ),
            );
        }
    }

    static deleteSetting<Setting extends keyof IReaderSettings>(
        manga: MangaIdInfo,
        setting: Setting,
        isGlobal: boolean = false,
        profile?: string,
    ): void {
        if (!manga || manga.id === FALLBACK_MANGA.id) {
            return;
        }

        const key = getMetadataKey(setting, profile !== undefined ? [profile] : undefined);

        const { cache } = requestManager.graphQLClient.client;

        const isGlobalSetting = isGlobal || GLOBAL_READER_SETTING_KEYS.includes(setting);
        if (isGlobalSetting) {
            cache.evict({ id: cache.identify({ __typename: 'GlobalMetaType', key }) });
        } else {
            cache.evict({ id: cache.identify({ __typename: 'MangaMetaType', mangaId: manga.id, key }) });
        }

        const deleteSetting = isGlobalSetting
            ? () => requestManager.deleteGlobalMeta(key).response
            : () => requestManager.deleteMangaMeta(manga.id, key).response;
        deleteSetting().catch((e) =>
            makeToast(translate('reader.settings.error.label.failed_to_save_settings'), 'error', getErrorMessage(e)),
        );
    }

    static useCreateUpdateSetting<Setting extends keyof IReaderSettings>(
        manga: MangaIdInfo,
        profile?: ReadingMode,
    ): (
        ...args: OmitFirst<Parameters<typeof ReaderService.updateSetting<Setting>>>
    ) => ReturnType<typeof ReaderService.updateSetting<Setting>> {
        return useCallback(
            (setting, value, commit, isGlobal) =>
                ReaderService.updateSetting<Setting>(manga, setting, value, commit, isGlobal, profile),
            [manga, profile],
        );
    }

    static useCreateDeleteSetting<Setting extends keyof IReaderSettings>(
        manga: MangaIdInfo,
        profile?: ReadingMode,
    ): (
        ...args: OmitFirst<Parameters<typeof ReaderService.deleteSetting<Setting>>>
    ) => ReturnType<typeof ReaderService.deleteSetting<Setting>> {
        return useCallback(
            (setting, isGlobal) => ReaderService.deleteSetting<Setting>(manga, setting, isGlobal, profile?.toString()),
            [manga, profile],
        );
    }

    static useOverlayMode(): { mode: ReaderOverlayMode; isDesktop: boolean; isMobile: boolean } {
        const isTouchDevice = MediaQuery.useIsTouchDevice();
        const { overlayMode } = ReaderService.useSettings();

        const isAutoModeSelected = overlayMode === ReaderOverlayMode.AUTO;
        const isDesktopModeSelected = overlayMode === ReaderOverlayMode.DESKTOP;
        const isMobileModeSelected = overlayMode === ReaderOverlayMode.MOBILE;

        const isDesktop = isDesktopModeSelected || (isAutoModeSelected && !isTouchDevice);
        const isMobile = isMobileModeSelected || (isAutoModeSelected && isTouchDevice);

        return {
            mode: isDesktop ? ReaderOverlayMode.DESKTOP : ReaderOverlayMode.MOBILE,
            isDesktop,
            isMobile,
        };
    }

    static useExit(): () => void {
        const { manga } = useReaderStateMangaContext();
        const { exitMode } = ReaderService.useSettings();
        const handleBack = useBackButton();
        const navigate = useNavigate();

        const openMangaPage = useCallback(() => {
            if (!manga) {
                return () => {};
            }

            return navigate(AppRoutes.manga.path(manga.id));
        }, [manga]);

        switch (exitMode) {
            case ReaderExitMode.PREVIOUS:
                return handleBack;
            case ReaderExitMode.MANGA:
                return openMangaPage;
            default:
                throw new Error(`Unexpected "exitMode" (${exitMode})`);
        }
    }
}

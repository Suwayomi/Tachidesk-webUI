/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { t as translate } from 'i18next';
import { TChapter, TranslationKey } from '@/typings.ts';
import { makeToast } from '@/components/util/Toast.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { getMetadataServerSettings } from '@/util/metadataServerSettings.ts';

export type ChapterAction = 'download' | 'delete' | 'bookmark' | 'unbookmark' | 'mark_as_read' | 'mark_as_unread';

export const actionToTranslationKey: {
    [key in ChapterAction]: {
        action: {
            selected: TranslationKey;
        };
        success: TranslationKey;
        error: TranslationKey;
    };
} = {
    download: {
        action: {
            selected: 'chapter.action.download.add.button.selected',
        },
        success: 'chapter.action.download.add.label.success',
        error: 'chapter.action.download.add.label.error',
    },
    delete: {
        action: {
            selected: 'chapter.action.download.delete.button.selected',
        },
        success: 'chapter.action.download.delete.label.success',
        error: 'chapter.action.download.delete.label.error',
    },
    bookmark: {
        action: {
            selected: 'chapter.action.bookmark.add.button.selected',
        },
        success: 'chapter.action.bookmark.add.label.success',
        error: 'chapter.action.bookmark.add.label.error',
    },
    unbookmark: {
        action: {
            selected: 'chapter.action.bookmark.remove.button.selected',
        },
        success: 'chapter.action.bookmark.remove.label.success',
        error: 'chapter.action.bookmark.remove.label.error',
    },
    mark_as_read: {
        action: {
            selected: 'chapter.action.mark_as_read.add.button.selected',
        },
        success: 'chapter.action.mark_as_read.add.label.success',
        error: 'chapter.action.mark_as_read.add.label.error',
    },
    mark_as_unread: {
        action: {
            selected: 'chapter.action.mark_as_read.remove.button.selected',
        },
        success: 'chapter.action.mark_as_read.remove.label.success',
        error: 'chapter.action.mark_as_read.remove.label.error',
    },
};

export type ChapterIdInfo = Pick<TChapter, 'id'>;
export type ChapterDownloadInfo = ChapterIdInfo & Pick<TChapter, 'isDownloaded'>;
export type ChapterBookmarkInfo = ChapterIdInfo & Pick<TChapter, 'isBookmarked'>;
export type ChapterReadInfo = ChapterIdInfo & Pick<TChapter, 'isRead'>;

export class Chapters {
    static getIds(chapters: { id: number }[]): number[] {
        return chapters.map((chapter) => chapter.id);
    }

    static isDownloaded({ isDownloaded }: ChapterDownloadInfo): boolean {
        return isDownloaded;
    }

    static getDownloaded<Chapter extends ChapterDownloadInfo>(chapters: Chapter[]): Chapter[] {
        return chapters.filter(Chapters.isDownloaded);
    }

    static isAutoDeletable(
        { isBookmarked, ...chapter }: ChapterDownloadInfo & ChapterBookmarkInfo,
        canDeleteBookmarked: boolean = false,
    ): boolean {
        return Chapters.isDownloaded(chapter) && (!isBookmarked || canDeleteBookmarked);
    }

    static getAutoDeletable<Chapters extends ChapterDownloadInfo & ChapterBookmarkInfo>(
        chapters: Chapters[],
        canDeleteBookmarked?: boolean,
    ): Chapters[] {
        return chapters.filter((chapter) => Chapters.isAutoDeletable(chapter, canDeleteBookmarked));
    }

    static isBookmarked({ isBookmarked }: ChapterBookmarkInfo): boolean {
        return isBookmarked;
    }

    static getBookmarked<Chapter extends ChapterBookmarkInfo>(chapters: Chapter[]): Chapter[] {
        return chapters.filter(Chapters.isBookmarked);
    }

    static getNonBookmarked<Chapter extends ChapterBookmarkInfo>(chapters: Chapter[]): Chapter[] {
        return chapters.filter((chapter) => !Chapters.isBookmarked(chapter));
    }

    static isRead({ isRead }: ChapterReadInfo): boolean {
        return isRead;
    }

    static getRead<Chapter extends ChapterReadInfo>(chapters: Chapter[]): Chapter[] {
        return chapters.filter(Chapters.isRead);
    }

    static getNonRead<Chapter extends ChapterReadInfo>(chapters: Chapter[]): Chapter[] {
        return chapters.filter((chapter) => !Chapters.isRead(chapter));
    }

    static async download(chapterIds: number[]): Promise<void> {
        return Chapters.executeAction(
            'download',
            chapterIds.length,
            () => requestManager.addChaptersToDownloadQueue(chapterIds).response,
        );
    }

    static async delete(chapterIds: number[]): Promise<void> {
        return Chapters.executeAction(
            'delete',
            chapterIds.length,
            () => requestManager.deleteDownloadedChapters(chapterIds).response,
        );
    }

    static async markAsRead(
        chapters: (ChapterDownloadInfo & ChapterBookmarkInfo)[],
        deleteChapters: boolean = false,
    ): Promise<void> {
        const { deleteChaptersWithBookmark } = await getMetadataServerSettings();
        const chapterIdsToDelete = deleteChapters
            ? Chapters.getIds(Chapters.getAutoDeletable(chapters, deleteChaptersWithBookmark))
            : [];
        return Chapters.executeAction(
            'mark_as_read',
            chapters.length,
            () =>
                requestManager.updateChapters(Chapters.getIds(chapters), {
                    isRead: true,
                    lastPageRead: 0,
                    chapterIdsToDelete,
                }).response,
        );
    }

    static async markAsUnread(chapterIds: number[]): Promise<void> {
        return Chapters.executeAction(
            'mark_as_unread',
            chapterIds.length,
            () => requestManager.updateChapters(chapterIds, { isRead: false }).response,
        );
    }

    static async bookmark(chapterIds: number[]): Promise<void> {
        return Chapters.executeAction(
            'bookmark',
            chapterIds.length,
            () => requestManager.updateChapters(chapterIds, { isBookmarked: true }).response,
        );
    }

    static async unBookmark(chapterIds: number[]): Promise<void> {
        return Chapters.executeAction(
            'unbookmark',
            chapterIds.length,
            () => requestManager.updateChapters(chapterIds, { isBookmarked: false }).response,
        );
    }

    private static async executeAction(
        action: ChapterAction,
        itemCount: number,
        fnToExecute: () => Promise<unknown>,
    ): Promise<void> {
        try {
            await fnToExecute();
            makeToast(translate(actionToTranslationKey[action].success, { count: itemCount }), 'success');
        } catch (e) {
            makeToast(translate(actionToTranslationKey[action].error, { count: itemCount }), 'error');
            throw e;
        }
    }

    static async performAction<Action extends ChapterAction>(
        action: Action,
        chapterIds: number[],
        {
            autoDeleteChapters,
            chapters,
        }: Action extends 'mark_as_read'
            ? { autoDeleteChapters: boolean; chapters?: never }
            : Action extends 'change_categories'
              ? {
                    autoDeleteChapters?: never;
                    chapters: (ChapterDownloadInfo & ChapterBookmarkInfo & ChapterReadInfo)[];
                }
              : {
                    autoDeleteChapters?: boolean;
                    chapters?: (ChapterDownloadInfo & ChapterBookmarkInfo & ChapterReadInfo)[];
                },
    ): Promise<void> {
        switch (action) {
            case 'download':
                return Chapters.download(chapterIds);
            case 'delete':
                return Chapters.delete(chapterIds);
            case 'mark_as_read':
                return Chapters.markAsRead(chapters!, autoDeleteChapters!);
            case 'mark_as_unread':
                return Chapters.markAsUnread(chapterIds);
            case 'bookmark':
                return Chapters.bookmark(chapterIds);
            case 'unbookmark':
                return Chapters.unBookmark(chapterIds);
            default:
                throw new Error(`Chapters::performAction: unknown action "${action}"`);
        }
    }
}
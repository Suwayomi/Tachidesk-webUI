/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import {
    Button, CircularProgress, Stack,
} from '@mui/material';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/system';
import useSubscription from 'components/library/useSubscription';
import ChapterCard from 'components/manga/ChapterCard';
import ResumeFab from 'components/manga/ResumeFAB';
import { filterAndSortChapters, useChapterOptions } from 'components/manga/util';
import EmptyView from 'components/util/EmptyView';
import { pluralize } from 'components/util/helpers';
import makeToast from 'components/util/Toast';
import React, {
    useEffect, useMemo, useRef, useState,
} from 'react';
import { Virtuoso } from 'react-virtuoso';
import client, { useQuery } from 'util/client';
import ChaptersToolbarMenu from './ChaptersToolbarMenu';
import SelectionFAB from './SelectionFAB';

const StyledVirtuoso = styled(Virtuoso)(({ theme }) => ({
    listStyle: 'none',
    padding: 0,
    minHeight: '200px',
    [theme.breakpoints.up('md')]: {
        width: '50vw',
        // 64px for the Appbar, 48px for the ChapterCount Header
        height: 'calc(100vh - 64px - 48px)',
        margin: 0,
    },
}));

interface IProps {
    mangaId: string
}

const ChapterList: React.FC<IProps> = ({ mangaId }) => {
    const [selection, setSelection] = useState<number[] | null>(null);
    const prevQueueRef = useRef<IDownloadChapter[]>();
    const queue = useSubscription<IQueue>('/api/v1/downloads').data?.queue;

    const [options, dispatch] = useChapterOptions(mangaId);
    const {
        data: chaptersData,
        mutate,
        loading,
    } = useQuery<IChapter[]>(`/api/v1/manga/${mangaId}/chapters?onlineFetch=false`);
    const chapters = useMemo(() => chaptersData ?? [], [chaptersData]);

    useEffect(() => {
        if (prevQueueRef.current && queue) {
            const prevQueue = prevQueueRef.current;
            const changedDownloads = queue.filter((cd) => {
                const prevChapterDownload = prevQueue
                    .find((pcd) => cd.chapterIndex === pcd.chapterIndex
                        && cd.mangaId === pcd.mangaId);
                if (!prevChapterDownload) return true;
                return cd.state !== prevChapterDownload.state;
            });

            if (changedDownloads.length > 0) {
                mutate();
            }
        }

        prevQueueRef.current = queue;
    }, [queue]);

    const visibleChapters = useMemo(() => filterAndSortChapters(chapters, options), //
        [chapters, options]);

    const firstUnreadChapter = useMemo(() => visibleChapters.slice()
        .reverse()
        .find((c) => c.read === false),
    [visibleChapters]);

    const selectedChapters = useMemo(() => {
        if (selection === null) return null;
        return visibleChapters.filter((chap) => selection.includes(chap.id));
    }, [visibleChapters, selection]);

    const handleSelection = (index: number) => {
        const chapter = visibleChapters[index];
        if (!chapter) return;

        if (selection === null) {
            setSelection([chapter.id]);
        } else if (selection.includes(chapter.id)) {
            const newSelection = selection.filter((cid) => cid !== chapter.id);
            setSelection(newSelection.length > 0 ? newSelection : null);
        } else {
            setSelection([...selection, chapter.id]);
        }
    };

    const handleSelectAll = () => {
        if (selection === null) return;
        setSelection(visibleChapters.map((c) => c.id));
    };

    const handleClear = () => {
        if (selection === null) return;
        setSelection(null);
    };

    const handleFabAction = (action: 'download') => {
        if (!selectedChapters || selectedChapters.length === 0) return;
        const chapterIds = selectedChapters.map((c) => c.id);

        if (action === 'download') {
            client.post('/api/v1/download/batch', { chapterIds })
                .then(() => makeToast(`${chapterIds.length} ${pluralize(chapterIds.length, 'download')} added`, 'success'))
                .then(() => mutate())
                .catch(() => makeToast('Error adding downloads', 'error'));
        }
    };

    if (loading) {
        return (
            <div style={{
                margin: '10px auto',
                display: 'flex',
                justifyContent: 'center',
            }}
            >
                <CircularProgress thickness={5} />
            </div>
        );
    }

    const noChaptersFound = chapters.length === 0;
    const noChaptersMatchingFilter = !noChaptersFound && visibleChapters.length === 0;

    const scrollCache = visibleChapters.map((chapter) => {
        const downloadChapter = queue?.find(
            (cd) => cd.chapterIndex === chapter.index
                && cd.mangaId === chapter.mangaId,
        );
        const selected = selection?.includes(chapter.id) ?? null;
        return {
            chapter,
            downloadChapter,
            selected,
        };
    });

    return (
        <>
            <Stack direction="column" sx={{ position: 'relative' }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                        m: 1, mb: 0, mr: 2, minHeight: 40,
                    }}
                >
                    <Typography variant="h5">
                        {`${visibleChapters.length} Chapter${visibleChapters.length === 1 ? '' : 's'}`}
                    </Typography>

                    {selection === null ? (
                        <ChaptersToolbarMenu options={options} optionsDispatch={dispatch} />
                    ) : (
                        <Stack direction="row">
                            <Button size="small" onClick={handleSelectAll}>Select all</Button>
                            <Button size="small" onClick={handleClear}>Clear</Button>
                        </Stack>
                    )}
                </Stack>

                {noChaptersFound && (
                    <EmptyView message="No chapters found" />
                )}
                {noChaptersMatchingFilter && (
                    <EmptyView message="No chapters matching filter" />
                )}

                <StyledVirtuoso
                    style={{ // override Virtuoso default values and set them with class
                        height: 'undefined',
                        // 900 is the md breakpoint in MUI
                        overflowY: window.innerWidth < 900 ? 'visible' : 'auto',
                    }}
                    totalCount={visibleChapters.length}
                    itemContent={(index:number) => (
                        <ChapterCard
                            // eslint-disable-next-line react/jsx-props-no-spreading
                            {...scrollCache[index]}
                            showChapterNumber={options.showChapterNumber}
                            triggerChaptersUpdate={() => mutate()}
                            onSelect={() => handleSelection(index)}
                        />
                    )}
                    useWindowScroll={window.innerWidth < 900}
                    overscan={window.innerHeight * 0.5}
                />
            </Stack>
            {selectedChapters !== null ? (
                <SelectionFAB
                    selectedChapters={selectedChapters}
                    onAction={handleFabAction}
                />
            ) : (
                firstUnreadChapter && <ResumeFab chapter={firstUnreadChapter} mangaId={mangaId} />
            )}
        </>
    );
};

export default ChapterList;

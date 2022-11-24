/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/system';
import Page from '../Page';

export default function HorizontalPager(props: IReaderProps) {
    const {
        pages, curPage, settings, setCurPage, prevChapter, nextChapter,
    } = props;

    const selfRef = useRef<HTMLDivElement>(null);
    const pagesRef = useRef<HTMLDivElement[]>([]);

    function nextPage() {
        if (curPage < pages.length - 1) {
            pagesRef.current[curPage + 1]?.scrollIntoView({ inline: 'center' });
            setCurPage((page) => page + 1);
        } else if (settings.loadNextonEnding) {
            nextChapter();
        }
    }

    function prevPage() {
        if (curPage > 0) {
            pagesRef.current[curPage - 1]?.scrollIntoView({ inline: 'center' });
            setCurPage(curPage - 1);
        } else if (curPage === 0) {
            prevChapter();
        }
    }

    function goLeft() {
        if (settings.readerType === 'ContinuesHorizontalLTR') {
            prevPage();
        } else {
            nextPage();
        }
    }

    function goRight() {
        if (settings.readerType === 'ContinuesHorizontalLTR') {
            nextPage();
        } else {
            prevPage();
        }
    }

    const mouseXPos = useRef<number>(0);

    function dragScreen(e: MouseEvent) {
        window.scrollBy(mouseXPos.current - e.pageX, 0);
    }

    function dragControl(e:MouseEvent) {
        mouseXPos.current = e.pageX;
        selfRef.current?.addEventListener('mousemove', dragScreen);
    }

    function removeDragControl() {
        selfRef.current?.removeEventListener('mousemove', dragScreen);
    }

    function clickControl(e:MouseEvent) {
        if (e.clientX >= window.innerWidth * 0.85) {
            goRight();
        } else if (e.clientX <= window.innerWidth * 0.15) {
            goLeft();
        }
    }

    const handleLoadNextonEnding = () => {
        if (settings.readerType === 'ContinuesHorizontalLTR') {
            if (window.scrollX + window.innerWidth >= document.body.scrollWidth) {
                nextChapter();
            }
        } else if (settings.readerType === 'ContinuesHorizontalRTL') {
            if (window.scrollX <= window.innerWidth) {
                nextChapter();
            }
        }
    };

    useEffect(() => {
        // scroll last read page into view after first mount
        pagesRef.current[curPage]?.scrollIntoView({ inline: 'center' });
    }, [pagesRef.current.length]);

    useEffect(() => {
        selfRef.current?.addEventListener('mousedown', dragControl);
        selfRef.current?.addEventListener('mouseup', removeDragControl);

        return () => {
            selfRef.current?.removeEventListener('mousedown', dragControl);
            selfRef.current?.removeEventListener('mouseup', removeDragControl);
        };
    }, [selfRef]);

    useEffect(() => {
        if (settings.loadNextonEnding) {
            document.addEventListener('scroll', handleLoadNextonEnding);
        }
        selfRef.current?.addEventListener('mousedown', clickControl);

        return () => {
            document.removeEventListener('scroll', handleLoadNextonEnding);
            selfRef.current?.removeEventListener('mousedown', clickControl);
        };
    }, [selfRef, curPage]);

    return (
        <Box
            ref={selfRef}
            sx={{
                display: 'flex',
                flexDirection: (settings.readerType === 'ContinuesHorizontalLTR') ? 'row' : 'row-reverse',
                justifyContent: (settings.readerType === 'ContinuesHorizontalLTR') ? 'flex-start' : 'flex-end',
                margin: '0 auto',
                width: 'auto',
                height: 'auto',
                overflowX: 'visible',
                userSelect: 'none',
            }}
        >
            {
                pages.map((page) => (
                    <Page
                        key={page.index}
                        index={page.index}
                        src={page.src}
                        onImageLoad={() => {}}
                        settings={settings}
                        ref={(e:HTMLDivElement) => { pagesRef.current[page.index] = e; }}
                    />
                ))
            }
        </Box>
    );
}

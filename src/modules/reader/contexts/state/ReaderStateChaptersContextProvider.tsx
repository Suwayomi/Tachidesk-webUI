/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ReactNode, useMemo, useState } from 'react';
import {
    READER_STATE_CHAPTERS_DEFAULTS,
    ReaderStateChaptersContext,
} from '@/modules/reader/contexts/state/ReaderStateChaptersContext.tsx';
import { ReaderStateChapters } from '@/modules/reader/types/Reader.types.ts';

export const ReaderStateChaptersContextProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] =
        useState<Omit<ReaderStateChapters, 'setReaderStateChapters'>>(READER_STATE_CHAPTERS_DEFAULTS);

    const value = useMemo(
        () => ({
            ...state,
            setReaderStateChapters: setState,
        }),
        [state],
    );

    return <ReaderStateChaptersContext.Provider value={value}>{children}</ReaderStateChaptersContext.Provider>;
};

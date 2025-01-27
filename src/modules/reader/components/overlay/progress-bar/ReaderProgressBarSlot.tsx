/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { memo, ReactNode } from 'react';
import { ReaderProgressBarSlotProps } from '@/modules/reader/types/ReaderProgressBar.types.ts';

import { READER_PROGRESS_BAR_POSITION_TO_PLACEMENT } from '@/modules/reader/constants/ReaderSettings.constants.tsx';

export const ReaderProgressBarSlot = memo(
    ({ pageName, progressBarPosition, slotProps, children }: ReaderProgressBarSlotProps & { children?: ReactNode }) => (
        <Tooltip
            {...slotProps?.tooltip}
            title={pageName}
            placement={READER_PROGRESS_BAR_POSITION_TO_PLACEMENT[progressBarPosition]}
        >
            <Box {...slotProps?.box} sx={{ width: '100%', height: '100%', ...slotProps?.box?.sx }}>
                {children}
            </Box>
        </Tooltip>
    ),
);

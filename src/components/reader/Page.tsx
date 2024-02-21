/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { forwardRef, useRef } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { IReaderSettings, ReaderType } from '@/typings';
import { SpinnerImage } from '@/components/util/SpinnerImage';

export const isHorizontalReaderType = (readerType: ReaderType): boolean =>
    ['ContinuesHorizontalLTR', 'ContinuesHorizontalRTL'].includes(readerType);

export function imageStyle(settings: IReaderSettings): any {
    const isHorizontal = isHorizontalReaderType(settings.readerType);
    if (settings.fitPageToWindow || isHorizontal) {
        return {
            marginLeft: isHorizontal ? '7px' : 0,
            marginRight: isHorizontal ? '7px' : 0,
            marginBottom: settings.readerType === 'ContinuesVertical' ? '15px' : 0,
            width: 'auto',
            maxWidth: settings.fitPageToWindow && !isHorizontal ? 'calc(100vw - (100vw - 100%))' : undefined,
            height: 'auto',
            minHeight: isHorizontal ? '100vh' : undefined,
            maxHeight: '100vh',
            objectFit: 'contain',
        };
    }

    return {
        marginBottom: settings.readerType === 'ContinuesVertical' ? '15px' : 0,
        minWidth: '10vw',
        width: `${settings.readerWidth}%`,
        maxWidth: '100%',
        objectFit: 'contain',
    };
}

interface IProps {
    src: string;
    index: number;
    onImageLoad: () => void;
    settings: IReaderSettings;
}

export const Page = forwardRef((props: IProps, ref: any) => {
    const { src, index, onImageLoad, settings } = props;

    const theme = useTheme();
    const isMobileWidth = useMediaQuery(theme.breakpoints.down('md'));

    const imgRef = useRef<HTMLImageElement>(null);

    const imgStyle = imageStyle(settings);
    const isDoublePageReader = ['DoubleRTL', 'DoubleLTR'].includes(settings.readerType);

    return (
        <Box
            ref={ref}
            sx={{ display: 'flex', justifyContent: 'center', minWidth: isDoublePageReader ? '100%' : undefined }}
        >
            <SpinnerImage
                src={src}
                onImageLoad={onImageLoad}
                alt={`Page #${index}`}
                imgRef={imgRef}
                spinnerStyle={{
                    ...imgStyle,
                    height: '100vh',
                    width: isMobileWidth ? '100vw' : 'calc(100% * 0.5)',
                    backgroundColor: '#525252',
                }}
                imgStyle={imgStyle}
            />
        </Box>
    );
});

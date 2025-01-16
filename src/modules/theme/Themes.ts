/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { CssVarsThemeOptions } from '@mui/material/styles';
import { t as translate } from 'i18next';

export type TBaseTheme = {
    isCustom: boolean;
    getName: () => string;
    muiTheme: Omit<CssVarsThemeOptions, 'activeMode'>;
};

export const themes = {
    default: {
        isCustom: false,
        getName: () => translate('global.label.default'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#5b74ef',
                        },
                        secondary: {
                            main: '#efd65b',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#5b74ef',
                        },
                        secondary: {
                            main: '#efd65b',
                        },
                    },
                },
            },
        },
    },
    lavender: {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.lavender'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#5c58dc',
                        },
                        secondary: {
                            main: '#d8dc58',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#5c58dc',
                        },
                        secondary: {
                            main: '#d8dc58',
                        },
                    },
                },
            },
        },
    },
    dune: {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.dune'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#897869',
                        },
                        secondary: {
                            main: '#697a89',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#897869',
                        },
                        secondary: {
                            main: '#697a89',
                        },
                    },
                },
            },
        },
    },
    rosegold: {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.rosegold'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#E9A7A1',
                        },
                        secondary: {
                            main: '#A1E3E9',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#E9A7A1',
                        },
                        secondary: {
                            main: '#A1E3E9',
                        },
                    },
                },
            },
        },
    },
    'forest dew': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.forest_dew'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#53a584',
                        },
                        secondary: {
                            main: '#a55374',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#53a584',
                        },
                        secondary: {
                            main: '#a55374',
                        },
                    },
                },
            },
        },
    },
    'montain sunset': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.mountain_sunset'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#c55a77',
                        },
                        secondary: {
                            main: '#5ac5a8',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#c55a77',
                        },
                        secondary: {
                            main: '#5ac5a8',
                        },
                    },
                },
            },
        },
    },
    crimson: {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.crimson'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#DC143C',
                        },
                        secondary: {
                            main: '#14DCB4',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#DC143C',
                        },
                        secondary: {
                            main: '#14DCB4',
                        },
                    },
                },
            },
        },
    },
    'minty miracles': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.minty_miracles'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#5CE6A1',
                        },
                        secondary: {
                            main: '#E65CA1',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#5CE6A1',
                        },
                        secondary: {
                            main: '#E65CA1',
                        },
                    },
                },
            },
        },
    },
    'orange juice': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.orange_juice'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#ffb546',
                        },
                        secondary: {
                            main: '#4690ff',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#ffb546',
                        },
                        secondary: {
                            main: '#4690ff',
                        },
                    },
                },
            },
        },
    },
    'bright pink': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.bright_pink'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#FF007F',
                        },
                        secondary: {
                            main: '#00FF80',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#FF007F',
                        },
                        secondary: {
                            main: '#00FF80',
                        },
                    },
                },
            },
        },
    },
    veronica: {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.veronica'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#A020F0',
                        },
                        secondary: {
                            main: '#70F020',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#A020F0',
                        },
                        secondary: {
                            main: '#70F020',
                        },
                    },
                },
            },
        },
    },
    'tree frog green': {
        isCustom: false,
        getName: () => translate('settings.appearance.theme.themes.tree_frog_green'),
        muiTheme: {
            colorSchemes: {
                light: {
                    palette: {
                        primary: {
                            main: '#8ace31',
                        },
                        secondary: {
                            main: '#7531CE',
                        },
                    },
                },
                dark: {
                    palette: {
                        primary: {
                            main: '#8ace31',
                        },
                        secondary: {
                            main: '#7531CE',
                        },
                    },
                },
            },
        },
    },
} as const satisfies Record<string, TBaseTheme>;

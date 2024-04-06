/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState, Dispatch, SetStateAction, useReducer, Reducer, useCallback } from 'react';
import { appStorage, Storage } from '@/util/AppStorage.ts';

const useStorage = <T,>(
    storage: Storage,
    key: string,
    defaultValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] => {
    const initialState = defaultValue instanceof Function ? defaultValue() : defaultValue;
    const [storedValue, setStoredValue] = useState<T>(storage.getItem(key, initialState));

    const setValue = useCallback<React.Dispatch<React.SetStateAction<T>>>(
        (value) => {
            setStoredValue((prevValue) => {
                // Allow value to be a function so we have same API as useState
                const valueToStore = value instanceof Function ? value(prevValue) : value;
                storage.setItem(key, valueToStore);
                return valueToStore;
            });
        },
        [key],
    );

    return [storedValue, setValue];
};
const useReducerStorage = <S, A>(
    storage: Storage,
    reducer: Reducer<S, A>,
    key: string,
    defaultState: S | (() => S),
) => {
    const [storedValue, setValue] = useStorage(storage, key, defaultState);
    return useReducer((state: S, action: A): S => {
        const newState = reducer(state, action);
        setValue(newState);
        return newState;
    }, storedValue);
};

export function useLocalStorage<T>(key: string, defaultValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
    return useStorage(appStorage.local, key, defaultValue);
}

export function useReducerLocalStorage<S, A>(reducer: Reducer<S, A>, key: string, defaultState: S | (() => S)) {
    return useReducerStorage(appStorage.local, reducer, key, defaultState);
}

export function useSessionStorage<T>(key: string, defaultValue: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
    return useStorage(appStorage.session, key, defaultValue);
}

export function useReducerSessionStorage<S, A>(reducer: Reducer<S, A>, key: string, defaultState: S | (() => S)) {
    return useReducerStorage(appStorage.session, reducer, key, defaultState);
}

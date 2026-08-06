import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cv-optimizer-theme';

export type Theme = 'light' | 'dark';

function readInitialTheme(): Theme {
    if (typeof document === 'undefined') {
        return 'dark';
    }

    // The inline script in app.blade.php already applied the class before
    // mount (to avoid a flash of the wrong theme) - read it back rather than
    // re-deriving from localStorage, so the two never disagree.
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(readInitialTheme);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setThemeState((current) => (current === 'dark' ? 'light' : 'dark'));
    };

    return { theme, toggleTheme };
}

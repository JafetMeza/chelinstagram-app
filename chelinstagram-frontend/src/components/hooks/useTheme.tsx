import { useAppSelector } from "@/redux/hooks";
import { useEffect, useState } from "react";

export default function useTheme() {
    const theme = useAppSelector(state => state.theme);
    const [isDark, setIsDark] = useState(theme === 'dark');

    useEffect(() => {
        if (theme) {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setIsDark(true);
            } else {
                document.documentElement.classList.remove('dark');
                setIsDark(false);
            }
        }
    }, [theme]);

    return isDark;
}
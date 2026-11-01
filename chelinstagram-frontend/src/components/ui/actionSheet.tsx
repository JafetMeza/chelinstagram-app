import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

export interface ActionSheetOption<T extends string> {
    value: T;
    label: string;
    icon: IconDefinition;
    destructive?: boolean;
}

interface ActionSheetProps<T extends string> {
    title: string;
    options: ActionSheetOption<T>[];
    onSelect: (value: T) => void;
    onClose: () => void;
}

// Hoja inferior con opciones y "Cancelar". Tocar el fondo también cierra.
const ActionSheet = <T extends string>({ title, options, onSelect, onClose }: ActionSheetProps<T>) => {
    return (
        <div
            className="fixed inset-0 z-100 flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm m-3 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border dark:border-zinc-800 text-black dark:text-white animate-in slide-in-from-bottom-4 duration-200"
                onClick={e => e.stopPropagation()}
            >
                <p className="px-4 py-3 text-sm font-bold text-center text-zinc-500">{title}</p>

                {options.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-sm border-t dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${option.destructive ? 'text-red-500 font-bold' : ''}`}
                    >
                        {option.label}
                        <FontAwesomeIcon icon={option.icon} className="text-zinc-400" />
                    </button>
                ))}

                <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-4 py-3 text-sm font-bold text-blue-500 border-t dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
};

export default ActionSheet;

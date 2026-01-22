import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faRotateLeft, faUnlock, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

interface LoginPuzzleProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginPuzzle = ({ isOpen, onClose }: LoginPuzzleProps) => {
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({ date: '', food: '', country: '' });
    const [isWrong, setIsWrong] = useState(false);

    const correctAnswers = { date: '05-17', food: 'ramen', country: 'Belgium' };

    const handleAnswer = (key: string, value: string) => {
        const newAnswers = { ...answers, [key]: value };
        setAnswers(newAnswers);

        if (key === 'country') {
            if (newAnswers.date === correctAnswers.date &&
                newAnswers.food === correctAnswers.food &&
                value === correctAnswers.country) {
                setIsWrong(false);
            } else {
                setIsWrong(true);
            }
        }

        if (step < 3) setStep(step + 1);
    };

    const resetPuzzle = () => {
        setStep(1);
        setAnswers({ date: '', food: '', country: '' });
        setIsWrong(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-4xl p-6 shadow-2xl relative border border-zinc-200 dark:border-zinc-800 flex flex-col min-h-105">

                {/* Header: Progress + Controls */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                            {isWrong || (step === 3 && answers.country !== '') ? 'Result' : `Step ${step} of 3`}
                        </span>
                        <h2 className="text-black dark:text-white font-bold text-lg">The Combination</h2>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={resetPuzzle} className="text-zinc-400 hover:text-blue-500 transition-colors">
                            <FontAwesomeIcon icon={faRotateLeft} />
                        </button>
                        <button onClick={onClose} className="text-zinc-400 hover:text-red-500 transition-colors">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                </div>

                {/* Question/Result Content */}
                <div className="flex-1 flex flex-col justify-center">
                    {!isWrong && step === 1 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <p className="text-sm font-medium dark:text-zinc-300 mb-6 text-center">When was the first date I sent you a message?</p>
                            <div className="grid grid-cols-2 gap-3">
                                {['05-16', '05-17', '05-18', '05-19'].map(opt => (
                                    <button key={opt} onClick={() => handleAnswer('date', opt)} className="py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white font-bold text-sm border border-zinc-100 dark:border-zinc-700 hover:border-blue-500 transition-all">{opt}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isWrong && step === 2 && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <p className="text-sm font-medium dark:text-zinc-300 mb-6 text-center">What is our absolute favorite food?</p>
                            <div className="grid grid-cols-1 gap-2">
                                {['pizza', 'queso_fundido', 'ramen', 'jalapeño_poppers'].map(opt => (
                                    <button key={opt} onClick={() => handleAnswer('food', opt)} className="py-4 px-6 text-left rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white font-bold text-sm border border-zinc-100 dark:border-zinc-700 hover:border-blue-500 transition-all capitalize">{opt.replace('_', ' ')}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!isWrong && step === 3 && answers.country === '' && (
                        <div className="animate-in slide-in-from-right duration-300">
                            <p className="text-sm font-medium dark:text-zinc-300 mb-6 text-center">Which country was the first one we visited together?</p>
                            <div className="grid grid-cols-1 gap-2">
                                {['Netherlands', 'Germany', 'Guatemala', 'Belgium'].map(opt => (
                                    <button key={opt} onClick={() => handleAnswer('country', opt)} className="py-4 px-6 text-left rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white font-bold text-sm border border-zinc-100 dark:border-zinc-700 hover:border-blue-500 transition-all">{opt}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* FAILED STATE */}
                    {isWrong && (
                        <div className="animate-in zoom-in duration-300 text-center">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-3xl mb-4" />
                            <h3 className="font-bold text-black dark:text-white mb-2">Wrong Sequence</h3>
                            <p className="text-xs text-zinc-500 mb-6 px-4">That combination didn't unlock the vault. Try thinking about our history again!</p>
                            <button onClick={resetPuzzle} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold text-sm">Restart Attempt</button>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {step === 3 && !isWrong && answers.country !== '' && (
                        <div className="animate-in zoom-in duration-300 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mb-4">
                                <FontAwesomeIcon icon={faUnlock} className="text-2xl" />
                            </div>

                            <h3 className="font-bold text-xl text-black dark:text-white mb-2">
                                Mission Accomplished!
                            </h3>

                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 px-2">
                                You've unlocked the vault combination. <br />
                                <strong>Copy it below</strong> and use it to log in.
                            </p>

                            {/* INTERACTIVE PASSWORD BOX */}
                            <div className="w-full group relative mb-6">
                                <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 font-mono text-blue-600 dark:text-blue-400 font-bold text-lg tracking-wider">
                                    {answers.date}{answers.food}{answers.country}
                                </div>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${answers.date}${answers.food}${answers.country}`);
                                        alert("Password copied to clipboard! 🏎️💨");
                                    }}
                                    className="mt-3 text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                                >
                                    Click here to copy password
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                            >
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>

                {/* Progress Indicators */}
                {!isWrong && (step < 3 || answers.country === '') && (
                    <div className="mt-8 flex justify-center gap-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${step >= i ? 'w-8 bg-blue-500' : 'w-4 bg-zinc-200 dark:bg-zinc-800'}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPuzzle;
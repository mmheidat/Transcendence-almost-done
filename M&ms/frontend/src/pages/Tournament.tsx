import React, { useState } from 'react';
import GameCanvas from '../components/game/GameCanvas';
import { Trophy, Play, Crown, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Tournament: React.FC = () => {
    const [players, setPlayers] = useState<string[]>(['', '', '', '']);
    const [active, setActive] = useState(false);
    const [currentMatch, setCurrentMatch] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Winners tracking
    const [semi1Winner, setSemi1Winner] = useState<string | null>(null);
    const [semi2Winner, setSemi2Winner] = useState<string | null>(null);
    const [champion, setChampion] = useState<string | null>(null);

    const handleStart = () => {
        // Fill empty names with defaults
        const newPlayers = players.map((p, i) => p.trim() || `Player ${i + 1}`);
        setPlayers(newPlayers);
        setActive(true);
        setCurrentMatch(0);
        setSemi1Winner(null);
        setSemi2Winner(null);
        setChampion(null);
    };

    const handlePlayerChange = (index: number, value: string) => {
        const newPlayers = [...players];
        newPlayers[index] = value;
        setPlayers(newPlayers);
    };

    const getMatchDetails = () => {
        switch (currentMatch) {
            case 0: return { p1: players[0], p2: players[1], label: 'Semi-Final 1' };
            case 1: return { p1: players[2], p2: players[3], label: 'Semi-Final 2' };
            case 2: return { p1: semi1Winner!, p2: semi2Winner!, label: 'Grand Final' };
            default: return null;
        }
    };

    const handleMatchEnd = (winner: { side: 'left' | 'right'; name: string }) => {
        setIsPlaying(false);
        const match = getMatchDetails();
        if (!match) return;

        // Determine winner name based on side
        // In GameCanvas/PongEngine:
        // Left is usually Player 1 (or the first passed player in this context?)
        // Currently GameCanvas doesn't accept player names props to pass to engine for display
        // The engine uses defaults 'Player 1' / 'Player 2'.
        // So we need to map 'left'/'right' to our actual player names.

        const winnerName = winner.side === 'left' ? match.p1 : match.p2;

        if (currentMatch === 0) {
            setSemi1Winner(winnerName);
            setCurrentMatch(1);
        } else if (currentMatch === 1) {
            setSemi2Winner(winnerName);
            setCurrentMatch(2);
        } else if (currentMatch === 2) {
            setChampion(winnerName);
            setCurrentMatch(3); // Finished
        }
    };

    const startMatch = () => {
        setIsPlaying(true);
    };

    const exitTournament = () => {
        if (window.confirm("Exit tournament? All progress will be lost.")) {
            setActive(false);
            setIsPlaying(false);
            setPlayers(['', '', '', '']);
        }
    };

    if (!active) {
        return (
            <div className="min-h-screen py-10 flex flex-col items-center">
                <div className="max-w-md w-full bg-gray-800 p-8 rounded-lg shadow-2xl border border-rose-500/30">
                    <div className="flex items-center justify-center mb-6">
                        <Trophy className="w-10 h-10 text-yellow-400 mr-3" />
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-500">
                            Tournament Setup
                        </h1>
                    </div>

                    <div className="space-y-4 mb-8">
                        {players.map((p, i) => (
                            <div key={i} className="flex items-center">
                                <span className="w-8 text-gray-500 font-mono">#{i + 1}</span>
                                <input
                                    type="text"
                                    placeholder={`Player ${i + 1} Name`}
                                    value={p}
                                    onChange={(e) => handlePlayerChange(i, e.target.value)}
                                    className="flex-1 bg-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-rose-500"
                                />
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-lg flex items-center justify-center transition"
                    >
                        <Play className="w-5 h-5 mr-2" /> Start Tournament
                    </button>

                    <Link to="/play" className="block text-center mt-4 text-gray-400 hover:text-white">
                        Cancel
                    </Link>
                </div>
            </div>
        );
    }

    if (isPlaying) {
        return (
            <div className="min-h-screen py-4 flex flex-col items-center">
                <div className="mb-4 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">{getMatchDetails()?.label}</h2>
                    <p className="text-xl text-rose-400">{getMatchDetails()?.p1} vs {getMatchDetails()?.p2}</p>
                </div>

                {/* 
                   Note: GameCanvas/PongEngine currently doesn't accept dynamic player names to display on scoreboard.
                   It defaults to "Player 1" / "Player 2" or "AI". 
                   For a polished tournament, we might want to update PongEngine to accept names,
                   but for now we rely on the external UI to show who is playing.
                */}
                <GameCanvas mode="tournament" onGameEnd={handleMatchEnd} />

                <button
                    onClick={() => setIsPlaying(false)}
                    className="mt-6 text-gray-500 hover:text-white underline"
                >
                    Force End Match (Debug)
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 flex flex-col items-center">
            <div className="w-full max-w-4xl px-4">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={exitTournament} className="flex items-center text-gray-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Exit Tournament
                    </button>
                    <h1 className="text-4xl font-bold text-white">Tournament Bracket</h1>
                    <div className="w-24"></div> {/* Spacer */}
                </div>

                {champion && (
                    <div className="bg-yellow-500/20 border border-yellow-500/50 p-6 rounded-lg text-center mb-12 animate-bounce">
                        <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                        <h2 className="text-2xl font-bold text-yellow-300">Champion</h2>
                        <p className="text-4xl font-bold text-white uppercase tracking-widest">{champion}</p>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-8 items-center justify-items-center relative">
                    {/* Semi Finals Column */}
                    <div className="space-y-12 w-full">
                        <div className={`bg-gray-800 p-4 rounded border ${currentMatch === 0 ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-gray-700'}`}>
                            <div className="text-xs text-gray-500 mb-1">Semi-Final 1</div>
                            <div className="font-bold text-white">{players[0]}</div>
                            <div className="text-gray-500 text-xs my-1">vs</div>
                            <div className="font-bold text-white">{players[1]}</div>
                            {semi1Winner && <div className="mt-2 text-green-400 text-sm font-bold">Winner: {semi1Winner}</div>}
                        </div>

                        <div className={`bg-gray-800 p-4 rounded border ${currentMatch === 1 ? 'border-rose-500 ring-2 ring-rose-500/50' : 'border-gray-700'}`}>
                            <div className="text-xs text-gray-500 mb-1">Semi-Final 2</div>
                            <div className="font-bold text-white">{players[2]}</div>
                            <div className="text-gray-500 text-xs my-1">vs</div>
                            <div className="font-bold text-white">{players[3]}</div>
                            {semi2Winner && <div className="mt-2 text-green-400 text-sm font-bold">Winner: {semi2Winner}</div>}
                        </div>
                    </div>

                    {/* Final Column */}
                    <div className="w-full flex flex-col justify-center h-full">
                        {/* Connector Lines (Visual only, simple implementation) */}
                        <div className={`bg-gray-800 p-6 rounded-xl border ${currentMatch === 2 ? 'border-rose-500 ring-4 ring-rose-500/30' : 'border-gray-600'} text-center`}>
                            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Grand Final</div>
                            <div className={`text-xl font-bold mb-1 ${semi1Winner ? 'text-white' : 'text-gray-600'}`}>{semi1Winner || 'TBD'}</div>
                            <div className="text-rose-500 font-bold text-sm">VS</div>
                            <div className={`text-xl font-bold mt-1 ${semi2Winner ? 'text-white' : 'text-gray-600'}`}>{semi2Winner || 'TBD'}</div>
                        </div>
                    </div>

                    {/* Winner Column */}
                    <div className="w-full flex items-center justify-center">
                        <div className={`p-6 rounded-full border-4 ${champion ? 'border-yellow-400 bg-yellow-400/10' : 'border-gray-700 bg-gray-800'}`}>
                            <Trophy className={`w-12 h-12 ${champion ? 'text-yellow-400' : 'text-gray-700'}`} />
                        </div>
                    </div>
                </div>

                {!champion && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={startMatch}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg shadow-rose-600/30 hover:scale-105 transition transform"
                        >
                            Play {getMatchDetails()?.label}
                        </button>
                        <p className="mt-4 text-gray-400">
                            Up Next: <span className="text-white">{getMatchDetails()?.p1}</span> vs <span className="text-white">{getMatchDetails()?.p2}</span>
                        </p>
                    </div>
                )}

                {champion && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={exitTournament}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg"
                        >
                            Start New Tournament
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Tournament;

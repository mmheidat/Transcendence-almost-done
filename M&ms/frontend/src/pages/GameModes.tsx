import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const GameModes: React.FC = () => {
    const [showAIDifficulty, setShowAIDifficulty] = useState(false);
    const navigate = useNavigate();

    return (
        <div className="max-w-5xl mx-auto py-8">
            <h2 className="cyber-heading text-3xl mb-10 text-center">Choose Game Mode</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* VS AI Card */}
                <div
                    className="cyber-card cyber-card-red cursor-pointer group"
                    onClick={() => setShowAIDifficulty(!showAIDifficulty)}
                >
                    <div className="text-center mb-6">
                        <div className="cyber-icon">
                            <div className="cyber-eye"></div>
                        </div>
                        <h3 className="cyber-card-title text-white">VS AI</h3>
                        <p className="cyber-card-desc">Play against computer opponent</p>
                    </div>

                    {!showAIDifficulty ? (
                        <button className="w-full cyber-btn cyber-btn-red text-white pointer-events-none">
                            Select Difficulty
                        </button>
                    ) : (
                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/game?mode=ai&difficulty=easy'); }}
                                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all font-semibold"
                            >
                                🟢 Easy
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/game?mode=ai&difficulty=medium'); }}
                                className="w-full py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-all font-semibold"
                            >
                                🟡 Medium
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/game?mode=ai&difficulty=hard'); }}
                                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-semibold"
                            >
                                🔴 Hard
                            </button>
                        </div>
                    )}
                </div>

                {/* 1v1 Local Card */}
                <Link to="/game?mode=1v1" className="cyber-card cyber-card-blue cursor-pointer group no-underline">
                    <div className="text-center mb-6">
                        <div className="cyber-icon">
                            <div className="cyber-paddles">
                                <div className="cyber-paddles-spark"></div>
                            </div>
                        </div>
                        <h3 className="cyber-card-title text-white">1v1 Local</h3>
                        <p className="cyber-card-desc">Two players, same keyboard</p>
                        <p className="cyber-card-hint">P1: W/S | P2: ↑/↓</p>
                    </div>
                    <button className="w-full cyber-btn cyber-btn-blue text-white pointer-events-none">
                        Select
                    </button>
                </Link>

                {/* 2v2 Teams Card */}
                <Link to="/game?mode=2v2" className="cyber-card cyber-card-green cursor-pointer group no-underline">
                    <div className="text-center mb-6">
                        <div className="cyber-icon">
                            <div className="cyber-x">
                                <div className="cyber-x-center"></div>
                            </div>
                        </div>
                        <h3 className="cyber-card-title text-white">2v2 Teams</h3>
                        <p className="cyber-card-desc">4 players, 2 paddles per side</p>
                        <p className="cyber-card-hint">Faster ball, more chaos!</p>
                    </div>
                    <button className="w-full cyber-btn cyber-btn-green text-black pointer-events-none">
                        Select
                    </button>
                </Link>

                {/* Tournament Card */}
                <Link to="/tournament" className="cyber-card cyber-card-yellow cursor-pointer group no-underline">
                    <div className="text-center mb-6">
                        <div className="cyber-icon">
                            <div className="cyber-trophy">
                                <div className="cyber-trophy-glow"></div>
                                <div className="cyber-trophy-cup"></div>
                                <div className="cyber-trophy-stem"></div>
                                <div className="cyber-trophy-base"></div>
                            </div>
                        </div>
                        <h3 className="cyber-card-title text-white">Tournament</h3>
                        <p className="cyber-card-desc">4-player elimination bracket</p>
                        <p className="cyber-card-hint">Semi-finals → Final</p>
                    </div>
                    <button className="w-full cyber-btn cyber-btn-yellow text-black pointer-events-none">
                        Select
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default GameModes;

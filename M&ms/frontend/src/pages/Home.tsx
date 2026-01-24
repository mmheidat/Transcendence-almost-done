import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
    const { user } = useAuth();
    const playerName = user?.display_name || user?.username || "Player";

    return (
        <div className="text-center py-12">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-gray-700/50 max-w-2xl mx-auto">
                <h2 className="text-5xl font-bold bg-gradient-to-r from-rose-400 via-blue-500 to-rose-600 bg-clip-text text-transparent mb-6">
                    {playerName}
                </h2>
                <p className="text-gray-300 text-xl mb-4">Welcome to M&ms Pong Game</p>
                <p className="text-gray-400 text-lg">Select an option from the menu above to get started</p>

                <div className="mt-8 flex justify-center space-x-2">
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                    <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse delay-200"></div>
                </div>

                <div className="mt-10">
                    <Link to="/play" className="cyber-btn cyber-btn-red text-white inline-block">
                        Start Playing
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Home;

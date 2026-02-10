import React, { useEffect, useState } from 'react';
import { userService } from '../services/user.service';
import { Crown, Trophy, Medal, Award, Star, Zap } from 'lucide-react';

interface LeaderboardEntry {
    rank: number;
    id: number;
    username: string;
    wins: number;
    avatar?: string;
}

const Leaderboard: React.FC = () => {
    const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await userService.fetchLeaderboard(50);
                setPlayers(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getPlayer = (index: number) => players[index];

    // Helper to check if avatar URL is valid (not a placeholder)
    const isValidAvatarUrl = (url?: string): boolean => {
        if (!url) return false;
        // Filter out placeholder/example URLs
        const invalidPatterns = ['example.com', 'placeholder', 'test.com', 'localhost'];
        return !invalidPatterns.some(pattern => url.toLowerCase().includes(pattern));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                    <span className="text-white/70 font-medium tracking-wider">Loading Champions...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Floating geometric shapes */}
                <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute top-40 right-20 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-32 left-1/4 w-24 h-24 bg-gradient-to-br from-red-500/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-gradient-to-br from-purple-500/8 to-transparent rotate-45 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                {/* Subtle grid overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}></div>
            </div>

            {/* Header */}
            <div className="relative z-10 text-center mb-12 pt-8">
                <div className="inline-flex items-center justify-center space-x-4 mb-4">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-yellow-500/50 to-yellow-500"></div>
                    <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent via-yellow-500/50 to-yellow-500"></div>
                </div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 tracking-tight uppercase">
                    Champions Arena
                </h2>
                <p className="text-white/50 mt-2 tracking-widest text-sm uppercase">Season Leaderboard</p>
            </div>

            {/* Podium Section */}
            {players.length > 0 && (
                <div className="relative z-10 flex justify-center items-center gap-6 md:gap-10 mb-16 px-4">

                    {/* 2nd Place - Silver */}
                    {getPlayer(1) && (
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                {/* Card with Rim Light */}
                                <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-6 w-44 md:w-52 border border-white/20 shadow-2xl transform hover:scale-105 transition-all duration-500">
                                    {/* Rim light - top edge highlight */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300/80 to-transparent"></div>
                                    {/* Outer glow on hover */}
                                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-gray-300/20 to-gray-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                                    {/* Vertically Centered Content */}
                                    <div className="flex flex-col items-center text-center">
                                        {/* 1. Medal Icon */}
                                        <div className="mb-4">
                                            <Medal className="w-10 h-10 text-gray-300 drop-shadow-[0_0_12px_rgba(192,192,192,0.6)]" />
                                        </div>

                                        {/* 2. Circular Avatar with Glow Frame */}
                                        <div className="relative mb-4">
                                            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-gray-300/60 via-gray-400/40 to-gray-500/60 blur-sm"></div>
                                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.15)]">
                                                {isValidAvatarUrl(getPlayer(1).avatar) ? (
                                                    <img src={getPlayer(1).avatar} className="w-full h-full object-cover" alt={getPlayer(1).username} referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700/90 to-gray-900/90 backdrop-blur-sm">
                                                        <span className="text-3xl text-gray-200 font-bold drop-shadow-lg">{getPlayer(1).username.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Player Name */}
                                        <h3 className="text-white font-bold text-lg truncate max-w-full mb-2">{getPlayer(1).username}</h3>

                                        {/* 4. Victory Count with Neon Lightning */}
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Zap className="w-4 h-4 text-gray-400 drop-shadow-[0_0_4px_rgba(156,163,175,0.8)]" />
                                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">{getPlayer(1).wins}</span>
                                        </div>
                                        <span className="text-gray-500 text-xs uppercase tracking-widest mt-1">Victories</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 1st Place - Gold Champion (Larger with Radial Glow) */}
                    {getPlayer(0) && (
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                {/* Golden Radial Glow Behind Card */}
                                <div className="absolute -inset-8 bg-gradient-radial from-yellow-500/30 via-amber-500/15 to-transparent rounded-full blur-2xl opacity-80 animate-pulse" style={{ animationDuration: '3s' }}></div>

                                {/* Card with Rim Light - Larger Scale */}
                                <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/15 to-white/5 rounded-2xl p-8 w-52 md:w-64 border border-yellow-400/40 shadow-2xl transform scale-105 hover:scale-110 transition-all duration-500">
                                    {/* Rim light - golden top edge */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/90 to-transparent"></div>
                                    {/* Secondary rim light */}
                                    <div className="absolute inset-x-4 top-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-300/50 to-transparent blur-sm"></div>
                                    {/* Outer golden glow */}
                                    <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-yellow-400/30 via-amber-500/20 to-yellow-600/30 blur-xl opacity-90 group-hover:opacity-100 -z-10"></div>

                                    {/* Vertically Centered Content */}
                                    <div className="flex flex-col items-center text-center">
                                        {/* 1. Crown/Trophy Icon */}
                                        <div className="mb-5 relative">
                                            <Crown className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
                                            <Star className="absolute -top-1 -right-2 w-5 h-5 text-yellow-300 animate-pulse" />
                                        </div>

                                        {/* 2. Large Circular Avatar with Golden Glow */}
                                        <div className="relative mb-5">
                                            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-yellow-400/70 via-amber-500/50 to-yellow-600/70 blur-md animate-pulse" style={{ animationDuration: '2s' }}></div>
                                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-yellow-400/70 shadow-[inset_0_2px_15px_rgba(255,255,255,0.2),0_0_30px_rgba(234,179,8,0.4)]">
                                                {isValidAvatarUrl(getPlayer(0).avatar) ? (
                                                    <img src={getPlayer(0).avatar} className="w-full h-full object-cover" alt={getPlayer(0).username} referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-yellow-900/80 to-amber-950/80 backdrop-blur-sm">
                                                        <span className="text-4xl text-yellow-400 font-bold drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">{getPlayer(0).username.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Player Name */}
                                        <h3 className="text-white font-black text-xl truncate max-w-full mb-2 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{getPlayer(0).username}</h3>

                                        {/* 4. Victory Count with Neon Lightning */}
                                        <div className="flex items-center justify-center gap-2">
                                            <Zap className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,1)]" />
                                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400">{getPlayer(0).wins}</span>
                                        </div>
                                        <span className="text-yellow-500/80 text-xs uppercase tracking-widest mt-1 font-semibold">Victories</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place - Bronze */}
                    {getPlayer(2) && (
                        <div className="flex flex-col items-center group">
                            <div className="relative">
                                {/* Card with Rim Light */}
                                <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/10 to-white/5 rounded-2xl p-6 w-44 md:w-52 border border-white/20 shadow-2xl transform hover:scale-105 transition-all duration-500">
                                    {/* Rim light - bronze top edge */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/80 to-transparent"></div>
                                    {/* Outer glow on hover */}
                                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>

                                    {/* Vertically Centered Content */}
                                    <div className="flex flex-col items-center text-center">
                                        {/* 1. Medal Icon */}
                                        <div className="mb-4">
                                            <Award className="w-10 h-10 text-amber-500 drop-shadow-[0_0_12px_rgba(217,119,6,0.6)]" />
                                        </div>

                                        {/* 2. Circular Avatar with Glow Frame */}
                                        <div className="relative mb-4">
                                            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-amber-500/60 via-orange-500/40 to-amber-600/60 blur-sm"></div>
                                            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.15)]">
                                                {isValidAvatarUrl(getPlayer(2).avatar) ? (
                                                    <img src={getPlayer(2).avatar} className="w-full h-full object-cover" alt={getPlayer(2).username} referrerPolicy="no-referrer" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-800/90 to-orange-950/90 backdrop-blur-sm">
                                                        <span className="text-3xl text-amber-400 font-bold drop-shadow-lg">{getPlayer(2).username.charAt(0).toUpperCase()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Player Name */}
                                        <h3 className="text-white font-bold text-lg truncate max-w-full mb-2">{getPlayer(2).username}</h3>

                                        {/* 4. Victory Count with Neon Lightning */}
                                        <div className="flex items-center justify-center gap-1.5">
                                            <Zap className="w-4 h-4 text-amber-500 drop-shadow-[0_0_4px_rgba(217,119,6,0.8)]" />
                                            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{getPlayer(2).wins}</span>
                                        </div>
                                        <span className="text-amber-600/80 text-xs uppercase tracking-widest mt-1">Victories</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Other Rankings Section */}
            <div className="relative z-10 max-w-3xl mx-auto px-4 pb-12">
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Section Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-white/5 to-transparent border-b border-white/10">
                        <h3 className="text-lg font-bold text-white/90 uppercase tracking-wider flex items-center space-x-2">
                            <Star className="w-5 h-5 text-blue-400" />
                            <span>Contenders</span>
                        </h3>
                    </div>

                    {/* Rankings List */}
                    <div className="divide-y divide-white/5">
                        {players.slice(3).map((player, index) => (
                            <div
                                key={player.rank}
                                className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-all duration-300 group cursor-pointer"
                            >
                                <div className="flex items-center space-x-4">
                                    {/* Rank Badge */}
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700/80 to-gray-800/80 flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-300">
                                        <span className="text-sm font-bold text-gray-300 group-hover:text-blue-400 transition-colors">#{player.rank}</span>
                                    </div>

                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-blue-500/50 to-purple-500/50 opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>
                                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700 border border-white/10">
                                            {isValidAvatarUrl(player.avatar) ? (
                                                <img src={player.avatar} className="w-full h-full object-cover" alt={player.username} referrerPolicy="no-referrer" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
                                                    <span className="text-lg text-gray-400 font-semibold">{player.username.charAt(0).toUpperCase()}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Username */}
                                    <span className="font-semibold text-white/90 group-hover:text-white transition-colors">{player.username}</span>
                                </div>

                                {/* Wins */}
                                <div className="flex items-center space-x-2">
                                    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-500 group-hover:from-blue-400 group-hover:to-purple-500 transition-all duration-300">{player.wins}</span>
                                    <span className="text-xs text-gray-500 uppercase tracking-wider">wins</span>
                                </div>
                            </div>
                        ))}

                        {players.length <= 3 && players.length > 0 && (
                            <div className="px-6 py-8 text-center">
                                <p className="text-gray-500">No other contenders yet. Be the next champion!</p>
                            </div>
                        )}

                        {players.length === 0 && (
                            <div className="px-6 py-8 text-center">
                                <p className="text-gray-500">No players found. Start playing to join the leaderboard!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;

import React, { useEffect, useState, useRef } from 'react';
import { UserPlus, MessageSquare, Send, MoreVertical, Search, Gamepad2 } from 'lucide-react';

import { wsClient } from '../services/socket.service';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { socialService, Friend } from '../services/social.service';


interface UIMessage {
    id: number;
    sender: string;
    text: string;
    time: string;
    isMe: boolean;
}

const Chat: React.FC = () => {
    const { user } = useAuth();
    const { unreadCounts, markAsRead, refreshNotifications } = useNotification();
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messageInput, setMessageInput] = useState('');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [searchResults, setSearchResults] = useState<Friend[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [messages, setMessages] = useState<UIMessage[]>([]);
    const [sendingRequestTo, setSendingRequestTo] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load messages and mark as read when friend selected
    useEffect(() => {
        if (!selectedFriend) return;

        // Clear notification locally
        markAsRead(selectedFriend.id);

        socialService.getMessages(selectedFriend.id).then(msgs => {
            const formatted: UIMessage[] = msgs.map(m => ({
                id: m.id,
                sender: m.is_mine ? 'Me' : (selectedFriend.display_name || selectedFriend.username),
                text: m.content,
                time: new Date(m.sent_at).toLocaleTimeString(),
                isMe: m.is_mine
            }));
            // Sort by time just in case
            setMessages(formatted.sort((a, b) => a.id - b.id));
        }).catch(err => console.error(err));
    }, [selectedFriend, markAsRead]); // Added markAsRead dependency

    const loadFriends = async () => {
        try {
            const data = await socialService.getFriends();
            setFriends(data);
            refreshNotifications(); // Sync latest unread counts
        } catch (e) {
            console.error('Failed to load friends', e);
        }
    };

    // WebSocket connection - only depends on user, not selectedFriend
    useEffect(() => {
        if (!user) return;

        wsClient.connect();
        loadFriends();

        const handleConnected = () => {
            console.log('Chat connected to WS');
        };

        // @ts-ignore
        wsClient.on('connected', handleConnected);

        return () => {
            // @ts-ignore
            wsClient.off('connected', handleConnected);
        };
    }, [user]);

    // Chat message listener - depends on selectedFriend
    useEffect(() => {
        if (!selectedFriend) return;

        const handleMessage = (payload: any) => {
            if (payload.senderId && payload.content) {
                const newMsg: UIMessage = {
                    id: Date.now(),
                    sender: payload.senderName || 'Unknown',
                    text: payload.content,
                    time: new Date().toLocaleTimeString(),
                    isMe: false
                };

                if (payload.senderId === selectedFriend.id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            } else if (payload.message && payload.sender_id) {
                const newMsg: UIMessage = {
                    id: payload.message.id || Date.now(),
                    sender: 'Unknown',
                    text: payload.message.content,
                    time: new Date(payload.message.sent_at).toLocaleTimeString(),
                    isMe: false
                };
                if (payload.sender_id === selectedFriend.id) {
                    setMessages(prev => [...prev, newMsg]);
                }
            }
        };

        // @ts-ignore
        wsClient.on('chat_message', handleMessage);

        return () => {
            // @ts-ignore
            wsClient.off('chat_message', handleMessage);
        };
    }, [selectedFriend]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        try {
            const results = await socialService.searchUsers(searchQuery);
            setSearchResults(results);
        } catch (e) {
            console.error(e);
        }
    };

    const sendFriendRequest = async (userId: number) => {
        if (sendingRequestTo === userId) return; // Prevent double-clicks
        setSendingRequestTo(userId);
        try {
            await socialService.sendFriendRequest(userId);
            alert('Friend request sent!');
            setSearchResults(prev => prev.filter(u => u.id !== userId));
        } catch (e: any) {
            alert(e.message || 'Failed to send request');
        } finally {
            setSendingRequestTo(null);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedFriend) return;

        const text = messageInput;

        try {
            // Send via HTTP (persistence)
            await socialService.sendMessage(selectedFriend.id, text);

            // Optimistic update
            setMessages(prev => [...prev, {
                id: Date.now(),
                sender: 'Me',
                text: text,
                time: new Date().toLocaleTimeString(),
                isMe: true
            }]);

            setMessageInput('');

            // WS might echo this back, so we might get a duplicate if we handle 'own' messages in WS listener. 
            // Usually WS listener filters out own messages or we should check ID.
        } catch (e) {
            console.error('Failed to send message', e);
            alert('Failed to send message');
        }
    };

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white mb-6">Chat & Friends</h2>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    {/* Friends List Sidebar */}
                    <div className="lg:col-span-1 flex flex-col space-y-6 h-full">

                        {/* Search Bar */}
                        <div className="bg-gray-800 rounded-lg p-4 shadow-xl">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Find users..."
                                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowSearch(!showSearch)}
                                    className={`p-2 rounded-lg ${showSearch ? 'bg-rose-600' : 'bg-gray-700'} text-white hover:bg-rose-700 transition`}
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                            </form>
                        </div>

                        {/* List Area */}
                        <div className="bg-gray-800 rounded-lg shadow-xl p-4 flex-1 overflow-hidden flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                {showSearch ? <UserPlus className="w-5 h-5 mr-2 text-rose-400" /> : <MessageSquare className="w-5 h-5 mr-2 text-rose-400" />}
                                {showSearch ? 'Search Results' : `Friends (${friends.length})`}
                            </h3>

                            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                {showSearch ? (
                                    <>
                                        {searchResults.length === 0 && <p className="text-gray-400 text-center py-4">No users found</p>}
                                        {searchResults.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center mr-3 overflow-hidden">
                                                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : (user.display_name || user.username).substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className="text-white font-medium">{user.display_name || user.username}</span>
                                                </div>
                                                <button
                                                    onClick={() => sendFriendRequest(user.id)}
                                                    disabled={sendingRequestTo === user.id}
                                                    className="p-2 bg-rose-600 hover:bg-rose-700 rounded-full text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Add Friend"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            onClick={() => {
                                                setSelectedFriend(friend);
                                                setMessages([]);
                                            }}
                                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${selectedFriend?.id === friend.id ? 'bg-rose-600/20 border border-rose-500/50' : 'hover:bg-gray-700 bg-gray-700/30'}`}
                                        >
                                            <div className="bg-gradient-to-br from-gray-600 to-gray-700 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mr-3 relative overflow-visible">
                                                {friend.avatar_url ? <img src={friend.avatar_url} className="w-full h-full object-cover rounded-full" /> : (friend.display_name || friend.username).substring(0, 2).toUpperCase()}
                                                {/* Online Status */}
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-800 ${friend.is_online ? 'bg-green-500' : 'bg-gray-400'}`}></div>

                                                {/* Unread Badge */}
                                                {unreadCounts.has(friend.id) && unreadCounts.get(friend.id)! > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-sm animate-bounce">
                                                        <span className="text-[10px] font-bold text-white">
                                                            {unreadCounts.get(friend.id)! > 9 ? '9+' : unreadCounts.get(friend.id)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-white text-sm">{friend.display_name || friend.username}</h4>
                                                <p className={`text-xs ${friend.is_online ? 'text-green-400' : 'text-gray-400'}`}>{friend.is_online ? 'Online' : 'Offline'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="lg:col-span-2 bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col h-full border border-gray-700/50">
                        {selectedFriend ? (
                            <>
                                {/* Chat Header */}
                                <div className="bg-gray-700/50 p-4 flex items-center justify-between border-b border-gray-600 backdrop-blur-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className="bg-rose-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold overflow-hidden">
                                            {selectedFriend.avatar_url ? <img src={selectedFriend.avatar_url} className="w-full h-full object-cover" /> : (selectedFriend.display_name || selectedFriend.username).substring(0, 2)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold">{selectedFriend.display_name || selectedFriend.username}</h3>
                                            <p className="text-green-400 text-sm">Online</p>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => {
                                                if (selectedFriend && !sendingRequestTo) {
                                                    setSendingRequestTo(selectedFriend.id);
                                                    wsClient.sendGameInvite(selectedFriend.id);
                                                    alert(`Game invite sent to ${selectedFriend.display_name || selectedFriend.username}`);
                                                    // Reset after a delay to allow sending again if needed, but prevents rapid double-clicks
                                                    setTimeout(() => setSendingRequestTo(null), 2000);
                                                }
                                            }}
                                            disabled={sendingRequestTo === selectedFriend.id}
                                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm font-bold shadow-lg transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Invite to Game"
                                        >
                                            <Gamepad2 className="w-4 h-4 mr-1" />
                                            Challenge
                                        </button>
                                        <button className="text-gray-400 hover:text-white p-2 transition">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Chat Messages */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-900/30">
                                    {messages.map(msg => (
                                        <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.isMe ? 'bg-rose-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-200 rounded-tl-none'}`}>
                                                <p>{msg.text}</p>
                                                <p className={`text-xs mt-1 text-right ${msg.isMe ? 'text-rose-200' : 'text-gray-400'}`}>{msg.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-gray-800 border-t border-gray-700">
                                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            placeholder="Type a message..."
                                            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 border border-gray-600 placeholder-gray-400"
                                        />
                                        <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-full transition duration-300 shadow-lg shadow-rose-500/20">
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg">Select a user to start chatting</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;

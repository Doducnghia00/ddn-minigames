import React, { useState, useEffect } from 'react';

/**
 * NetworkMonitor - Real-time network statistics overlay
 * 
 * Displays:
 * - RTT (Round-Trip Time) / Ping
 * - Message rate (sent/received per second)
 * - Bandwidth usage (estimated)
 * - Packet loss (if detectable)
 * - Connection quality indicator
 * 
 * Usage:
 *   <NetworkMonitor room={colyseusRoom} />
 */
export const NetworkMonitor = ({ room, enabled = true }) => {
    const [stats, setStats] = useState({
        rtt: 0,
        messagesSent: 0,
        messagesReceived: 0,
        sendRate: 0,
        receiveRate: 0,
        estimatedBandwidth: 0,
        quality: 'unknown'
    });

    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (!enabled || !room) return;

        let messagesSent = 0;
        let messagesReceived = 0;
        let lastUpdate = Date.now();

        // Track messages sent
        const originalSend = room.send.bind(room);
        room.send = function(...args) {
            messagesSent++;
            return originalSend(...args);
        };

        // Track messages received
        const messageHandler = () => {
            messagesReceived++;
        };

        // Listen to all message types for tracking
        if (room.onMessage) {
            const originalOnMessage = room.onMessage.bind(room);
            room.onMessage = function(type, callback) {
                return originalOnMessage(type, (...args) => {
                    messagesReceived++;
                    return callback(...args);
                });
            };
        }

        // Update stats every second
        const interval = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastUpdate) / 1000;

            // Calculate rates
            const sendRate = Math.round(messagesSent / deltaTime);
            const receiveRate = Math.round(messagesReceived / deltaTime);

            // Estimate bandwidth (rough approximation)
            // Average message size ~100 bytes for input, ~200 bytes for state
            const estimatedSent = messagesSent * 100;
            const estimatedReceived = messagesReceived * 200;
            const totalBytes = estimatedSent + estimatedReceived;
            const bandwidthKBps = (totalBytes / 1024 / deltaTime).toFixed(2);

            // Get RTT from Colyseus (if available)
            const rtt = room._pingInterval ? Math.round(room._pingSent ? Date.now() - room._pingSent : 0) : 0;

            // Determine connection quality
            let quality = 'excellent';
            if (rtt > 150 || sendRate > 40) quality = 'good';
            if (rtt > 200 || sendRate > 60) quality = 'fair';
            if (rtt > 300 || sendRate > 80) quality = 'poor';

            setStats({
                rtt,
                messagesSent,
                messagesReceived,
                sendRate,
                receiveRate,
                estimatedBandwidth: bandwidthKBps,
                quality
            });

            // Reset counters
            messagesSent = 0;
            messagesReceived = 0;
            lastUpdate = now;
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [room, enabled]);

    if (!enabled) return null;

    const qualityColors = {
        excellent: '#00ff88',
        good: '#88ff00',
        fair: '#ffaa00',
        poor: '#ff4444',
        unknown: '#888888'
    };

    const qualityColor = qualityColors[stats.quality];

    if (isMinimized) {
        return (
            <div 
                className="fixed top-4 right-4 z-50 cursor-pointer"
                onClick={() => setIsMinimized(false)}
            >
                <div className="bg-black/90 text-white px-3 py-2 rounded-lg border-2 border-gray-700 hover:border-gray-500 transition-colors">
                    <div className="flex items-center gap-2">
                        <div 
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: qualityColor }}
                        ></div>
                        <span className="text-xs font-mono">
                            {stats.rtt}ms
                        </span>
                        <span className="text-xs text-gray-500">▼</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed top-4 right-4 z-50">
            <div className="bg-black/90 text-white px-4 py-3 rounded-lg border-2 border-gray-700 shadow-lg min-w-[280px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <div 
                            className="w-3 h-3 rounded-full animate-pulse"
                            style={{ backgroundColor: qualityColor }}
                        ></div>
                        <h3 className="text-sm font-bold text-gray-300">NETWORK STATS</h3>
                    </div>
                    <button
                        onClick={() => setIsMinimized(true)}
                        className="text-gray-500 hover:text-white text-xs transition-colors"
                    >
                        ▲
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="space-y-2 font-mono text-xs">
                    {/* Connection Quality */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Quality:</span>
                        <span 
                            className="font-bold uppercase"
                            style={{ color: qualityColor }}
                        >
                            {stats.quality}
                        </span>
                    </div>

                    {/* RTT / Ping */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Ping (RTT):</span>
                        <span className={stats.rtt > 200 ? 'text-red-400' : 'text-green-400'}>
                            {stats.rtt}ms
                        </span>
                    </div>

                    {/* Message Rates */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Send Rate:</span>
                        <span className={stats.sendRate > 30 ? 'text-yellow-400' : 'text-white'}>
                            {stats.sendRate} msg/s
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Receive Rate:</span>
                        <span className="text-white">
                            {stats.receiveRate} msg/s
                        </span>
                    </div>

                    {/* Bandwidth */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Bandwidth:</span>
                        <span className="text-cyan-400">
                            ~{stats.estimatedBandwidth} KB/s
                        </span>
                    </div>

                    {/* Total Messages */}
                    <div className="pt-2 mt-2 border-t border-gray-700">
                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                            <span>Sent: {stats.messagesSent}</span>
                            <span>Recv: {stats.messagesReceived}</span>
                        </div>
                    </div>
                </div>

                {/* Optimization Indicator */}
                {stats.sendRate < 25 && stats.estimatedBandwidth < 20 && (
                    <div className="mt-3 pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-2 text-[10px] text-green-400">
                            <span>✓</span>
                            <span>Network optimizations active</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NetworkMonitor;


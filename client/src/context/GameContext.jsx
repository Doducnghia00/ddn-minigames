import React, { createContext, useContext, useState, useCallback } from 'react';

const GameContext = createContext(null);

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within GameProvider');
    }
    return context;
};

export const GameProvider = ({ children }) => {
    const [currentRoom, setCurrentRoom] = useState(null);
    const [roomData, setRoomData] = useState(null);

    const joinRoom = (room, data) => {
        setCurrentRoom(room);
        setRoomData(data);
    };

    const leaveRoom = useCallback((options = {}) => {
        if (currentRoom && !options.skipRemote) {
            currentRoom.leave();
        }
        setCurrentRoom(null);
        setRoomData(null);
    }, [currentRoom]);

    const value = {
        currentRoom,
        roomData,
        joinRoom,
        leaveRoom
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

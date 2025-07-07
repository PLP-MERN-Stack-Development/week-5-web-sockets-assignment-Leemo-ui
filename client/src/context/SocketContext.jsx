import { createContext } from 'react';
import socket from '../socket/socket';

export const SocketContext = createContext(socket);
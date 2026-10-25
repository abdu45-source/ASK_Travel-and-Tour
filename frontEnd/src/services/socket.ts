import { io, Socket } from 'socket.io-client';
import { getAccessToken, API_BASE_URL } from './api';

let socket: Socket | null = null;

export const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        const token = getAccessToken();
        cb(token ? { token } : {});
      },
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

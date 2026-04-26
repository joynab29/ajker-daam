import { io } from 'socket.io-client'
import { getToken } from './api.js'

export const socket = io('http://localhost:4000', {
  autoConnect: false,
  auth: (cb) => cb({ token: getToken() }),
})

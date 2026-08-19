/**
 * uWebSockets.js v20.69.0 made WebSocket generic (WebSocket<UserData>) and
 * removed the implicit any-property behavior of the v20.10.0 typings that
 * soketi relies on (ws.app, ws.id, ws.sendJson, ...). Restore it via module
 * augmentation so the existing per-socket property style keeps compiling.
 */
import 'uWebSockets.js';

declare module 'uWebSockets.js' {
    interface WebSocket<UserData> {
        [key: string]: any;
    }
}

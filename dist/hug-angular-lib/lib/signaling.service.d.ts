import { LogService } from './log.service';
import { Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
/**
 * Error produced when a socket request has a timeout.
 */
export declare class SocketTimeoutError extends Error {
    constructor(message: any);
}
export declare class SignalingService {
    private logger;
    peerId: string;
    roomId: string;
    _signalingSocket: Socket;
    _signalingBaseUrl: string;
    _signalingUrl: string;
    _closed: boolean;
    onDisconnected: Subject<any>;
    onReconnecting: Subject<any>;
    onReconnected: Subject<any>;
    onNewConsumer: Subject<any>;
    onNotification: Subject<any>;
    constructor(logger: LogService);
    init(roomId: any, peerId: any): void;
    close(): void;
    timeoutCallback(callback: any): (...args: any[]) => void;
    _sendRequest(method: any, data: any): Promise<unknown>;
    sendRequest(method: any, data?: any): Promise<any>;
    static ɵfac: i0.ɵɵFactoryDef<SignalingService, never>;
    static ɵprov: i0.ɵɵInjectableDef<SignalingService>;
}

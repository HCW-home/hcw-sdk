import { __awaiter } from "tslib";
import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "./log.service";
const requestTimeout = 20000;
/**
 * Error produced when a socket request has a timeout.
 */
export class SocketTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SocketTimeoutError';
        if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
            // @ts-ignore
            Error.captureStackTrace(this, SocketTimeoutError);
        else
            this.stack = (new Error(message)).stack;
    }
}
export class SignalingService {
    constructor(logger) {
        this.logger = logger;
        this._signalingBaseUrl = 'wss://mediasoup-test.oniabsis.com';
        this._closed = false;
        this.onDisconnected = new Subject();
        this.onReconnecting = new Subject();
        this.onReconnected = new Subject();
        this.onNewConsumer = new Subject();
        this.onNotification = new Subject();
    }
    init(token) {
        this._closed = false;
        this._signalingUrl =
            `${this._signalingBaseUrl}/?token=${token}`;
        this._signalingSocket = io(this._signalingUrl);
        this.logger.debug("Initialize socket ", this._signalingUrl);
        this._signalingSocket.on('connect', () => {
            this.logger.debug('signaling Peer "connect" event');
        });
        this._signalingSocket.on('disconnect', (reason) => {
            this.logger.warn('signaling Peer "disconnect" event [reason:"%s"]', reason);
            if (this._closed)
                return;
            if (reason === 'io server disconnect') {
                this.onDisconnected.next();
                this.close();
            }
            this.onReconnecting.next;
        });
        this._signalingSocket.on('reconnect_failed', () => {
            this.logger.warn('signaling Peer "reconnect_failed" event');
            this.onDisconnected.next();
            this.close();
        });
        this._signalingSocket.on('reconnect', (attemptNumber) => {
            this.logger.debug('signaling Peer "reconnect" event [attempts:"%s"]', attemptNumber);
            this.onReconnected.next(attemptNumber);
            // store.dispatch(roomActions.setRoomState('connected'));
        });
        this._signalingSocket.on('request', (request, cb) => __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('socket "request" event [method:"%s", data:"%o"]', request.method, request.data);
            switch (request.method) {
                case 'newConsumer':
                    {
                        this.onNewConsumer.next(request.data);
                        cb();
                        break;
                    }
                default:
                    {
                        this.logger.error('unknown request.method "%s"', request.method);
                        cb(500, `unknown request.method "${request.method}"`);
                    }
            }
        }));
        this._signalingSocket.on('notification', (notification) => {
            this.logger.debug('socket> "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
            this.onNotification.next(notification);
        });
    }
    close() {
        if (this._closed)
            return;
        this._closed = true;
        this.logger.debug('close()');
        this._signalingSocket.close();
        this._signalingSocket = null;
    }
    timeoutCallback(callback) {
        let called = false;
        const interval = setTimeout(() => {
            if (called)
                return;
            called = true;
            callback(new SocketTimeoutError('Request timed out'));
        }, requestTimeout);
        return (...args) => {
            if (called)
                return;
            called = true;
            clearTimeout(interval);
            callback(...args);
        };
    }
    _sendRequest(method, data) {
        return new Promise((resolve, reject) => {
            if (!this._signalingSocket) {
                reject('No socket connection');
            }
            else {
                this._signalingSocket.emit('request', { method, data }, this.timeoutCallback((err, response) => {
                    if (err)
                        reject(err);
                    else
                        resolve(response);
                }));
            }
        });
    }
    sendRequest(method, data) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);
            const requestRetries = 3;
            for (let tries = 0; tries < requestRetries; tries++) {
                try {
                    return yield this._sendRequest(method, data);
                }
                catch (error) {
                    if (error instanceof SocketTimeoutError &&
                        tries < requestRetries)
                        this.logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
                    else
                        throw error;
                }
            }
        });
    }
}
SignalingService.ɵfac = function SignalingService_Factory(t) { return new (t || SignalingService)(i0.ɵɵinject(i1.LogService)); };
SignalingService.ɵprov = i0.ɵɵdefineInjectable({ token: SignalingService, factory: SignalingService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(SignalingService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.LogService }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUU1QyxZQUFZLE9BQU87UUFFbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUUvQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjO1lBQzNELGFBQWE7WUFDaEIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBS0QsTUFBTSxPQUFPLGdCQUFnQjtJQWMzQixZQUFvQixNQUFrQjtRQUFsQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBVHRDLHNCQUFpQixHQUFHLG1DQUFtQyxDQUFDO1FBRXhELFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFaEIsbUJBQWMsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUM1QyxtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLGtCQUFhLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDM0Msa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1QyxtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFDO0lBRzVDLENBQUM7SUFHRixJQUFJLENBQUMsS0FBSztRQUVSLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhO1lBQ2xCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixXQUFXLEtBQUssRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQTtRQUc3RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFFdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFFbkQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaURBQWlELEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFNUUsSUFBSSxJQUFJLENBQUMsT0FBTztnQkFDZixPQUFPO1lBRVIsSUFBSSxNQUFNLEtBQUssc0JBQXNCLEVBQ3JDO2dCQUNLLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBRTlCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQzthQUNiO1lBRUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUE7UUFFNUIsQ0FBQyxDQUFDLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtZQUVuRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBRXpELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUE7WUFFN0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUM7UUFHTCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLGFBQWEsRUFBRSxFQUFFO1lBRXZELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtEQUFrRCxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRWxGLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBR3pDLHlEQUF5RDtRQUMxRCxDQUFDLENBQUMsQ0FBQztRQUlILElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQU8sT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBRXpELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNoQixpREFBaUQsRUFDakQsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFHL0IsUUFBUSxPQUFPLENBQUMsTUFBTSxFQUN0QjtnQkFDQyxLQUFLLGFBQWE7b0JBQ2xCO3dCQUNRLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEMsRUFBRSxFQUFFLENBQUE7d0JBRVgsTUFBTTtxQkFDTjtnQkFFRDtvQkFDQTt3QkFDQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7d0JBRWpFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsMkJBQTJCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO3FCQUN0RDthQUNEO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDeEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2YsdURBQXVELEVBQ3ZELFlBQVksQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRXhDLENBQUMsQ0FBQyxDQUFDO0lBSUwsQ0FBQztJQUNELEtBQUs7UUFDSCxJQUFJLElBQUksQ0FBQyxPQUFPO1lBQ2QsT0FBTztRQUVULElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBRXBCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO0lBRy9CLENBQUM7SUFDRixlQUFlLENBQUMsUUFBUTtRQUV2QixJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFbkIsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUMxQixHQUFHLEVBQUU7WUFFSixJQUFJLE1BQU07Z0JBQ1QsT0FBTztZQUNSLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDZCxRQUFRLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDdkQsQ0FBQyxFQUNELGNBQWMsQ0FDZCxDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsSUFBSSxFQUFFLEVBQUU7WUFFbEIsSUFBSSxNQUFNO2dCQUNULE9BQU87WUFDUixNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ2QsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZCLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ25CLENBQUMsQ0FBQztJQUNILENBQUM7SUFFRCxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUk7UUFFeEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUV0QyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUMxQjtnQkFDQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQzthQUMvQjtpQkFFRDtnQkFDQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUN6QixTQUFTLEVBQ1QsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQ2hCLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7b0JBRXRDLElBQUksR0FBRzt3QkFDTixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7O3dCQUVaLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQzthQUNGO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSCxDQUFDO0lBR1csV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFLOztZQUVyQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFFMUUsTUFBTSxjQUFjLEdBQUcsQ0FBQyxDQUFBO1lBR3hCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxjQUFjLEVBQUUsS0FBSyxFQUFFLEVBQ25EO2dCQUNDLElBQ0E7b0JBQ0MsT0FBTyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUM3QztnQkFDRCxPQUFPLEtBQUssRUFDWjtvQkFDQyxJQUNDLEtBQUssWUFBWSxrQkFBa0I7d0JBQ25DLEtBQUssR0FBRyxjQUFjO3dCQUV0QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLENBQUMsQ0FBQzs7d0JBRTVFLE1BQU0sS0FBSyxDQUFDO2lCQUNiO2FBQ0Q7UUFDRixDQUFDO0tBQUE7O2dGQXhNVyxnQkFBZ0I7d0RBQWhCLGdCQUFnQixXQUFoQixnQkFBZ0IsbUJBRmYsTUFBTTtrREFFUCxnQkFBZ0I7Y0FINUIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5cbmltcG9ydCB7IGlvLCBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8tY2xpZW50JztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcblxuXG5jb25zdCByZXF1ZXN0VGltZW91dCA9IDIwMDAwXG5cbi8qKlxuICogRXJyb3IgcHJvZHVjZWQgd2hlbiBhIHNvY2tldCByZXF1ZXN0IGhhcyBhIHRpbWVvdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRUaW1lb3V0RXJyb3IgZXh0ZW5kcyBFcnJvclxue1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlKVxuXHR7XG5cdFx0c3VwZXIobWVzc2FnZSk7XG5cblx0XHR0aGlzLm5hbWUgPSAnU29ja2V0VGltZW91dEVycm9yJztcblxuICAgIGlmIChFcnJvci5oYXNPd25Qcm9wZXJ0eSgnY2FwdHVyZVN0YWNrVHJhY2UnKSkgLy8gSnVzdCBpbiBWOC5cbiAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIFNvY2tldFRpbWVvdXRFcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zdGFjayA9IChuZXcgRXJyb3IobWVzc2FnZSkpLnN0YWNrO1xuXHR9XG59XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFNpZ25hbGluZ1NlcnZpY2UgIHtcblxuICBwZWVySWQ6IHN0cmluZztcbiAgcm9vbUlkOiBzdHJpbmc7XG4gIF9zaWduYWxpbmdTb2NrZXQ6IFNvY2tldDtcbiAgX3NpZ25hbGluZ0Jhc2VVcmwgPSAnd3NzOi8vbWVkaWFzb3VwLXRlc3Qub25pYWJzaXMuY29tJztcbiAgX3NpZ25hbGluZ1VybDogc3RyaW5nO1xuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgb25EaXNjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3Rpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3RlZDogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKVxuICBvbk5ld0NvbnN1bWVyOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBvbk5vdGlmaWNhdGlvbjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UgKSB7XG5cbiAgIH1cblxuXG4gIGluaXQodG9rZW4pIHtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3NpZ25hbGluZ1VybCA9XG4gICAgYCR7dGhpcy5fc2lnbmFsaW5nQmFzZVVybH0vP3Rva2VuPSR7dG9rZW59YDtcbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQgPSBpbyh0aGlzLl9zaWduYWxpbmdVcmwpXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXCJJbml0aWFsaXplIHNvY2tldCBcIiwgdGhpcy5fc2lnbmFsaW5nVXJsKVxuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PlxuXHRcdHtcblx0XHQgXHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJjb25uZWN0XCIgZXZlbnQnKTtcbiAgICB9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignZGlzY29ubmVjdCcsIChyZWFzb24pID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJkaXNjb25uZWN0XCIgZXZlbnQgW3JlYXNvbjpcIiVzXCJdJywgcmVhc29uKTtcblxuXHRcdFx0aWYgKHRoaXMuX2Nsb3NlZClcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRpZiAocmVhc29uID09PSAnaW8gc2VydmVyIGRpc2Nvbm5lY3QnKVxuXHRcdFx0e1xuICAgICAgICB0aGlzLm9uRGlzY29ubmVjdGVkLm5leHQoKVxuXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHRcdH1cblxuICAgICAgdGhpcy5vblJlY29ubmVjdGluZy5uZXh0XG5cblx0XHR9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVjb25uZWN0X2ZhaWxlZCcsICgpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RfZmFpbGVkXCIgZXZlbnQnKTtcblxuICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0dGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdCcsIChhdHRlbXB0TnVtYmVyKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdzaWduYWxpbmcgUGVlciBcInJlY29ubmVjdFwiIGV2ZW50IFthdHRlbXB0czpcIiVzXCJdJywgYXR0ZW1wdE51bWJlcik7XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RlZC5uZXh0KGF0dGVtcHROdW1iZXIpXG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cdFx0fSk7XG5cblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZXF1ZXN0JywgYXN5bmMgKHJlcXVlc3QsIGNiKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKFxuXHRcdFx0XHQnc29ja2V0IFwicmVxdWVzdFwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuXHRcdFx0XHRyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC5kYXRhKTtcblxuXG5cdFx0XHRzd2l0Y2ggKHJlcXVlc3QubWV0aG9kKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlICduZXdDb25zdW1lcic6XG5cdFx0XHRcdHtcbiAgICAgICAgICAgIHRoaXMub25OZXdDb25zdW1lci5uZXh0KHJlcXVlc3QuZGF0YSk7XG4gICAgICAgICAgICBjYigpXG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcigndW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiVzXCInLCByZXF1ZXN0Lm1ldGhvZCk7XG5cblx0XHRcdFx0XHRjYig1MDAsIGB1bmtub3duIHJlcXVlc3QubWV0aG9kIFwiJHtyZXF1ZXN0Lm1ldGhvZH1cImApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ25vdGlmaWNhdGlvbicsIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0PiBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRoaXMub25Ob3RpZmljYXRpb24ubmV4dChub3RpZmljYXRpb24pXG5cbiAgICB9KTtcblxuXG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuY2xvc2UoKTtcbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQgPSBudWxsO1xuXG5cbiAgfVxuXHR0aW1lb3V0Q2FsbGJhY2soY2FsbGJhY2spXG5cdHtcblx0XHRsZXQgY2FsbGVkID0gZmFsc2U7XG5cblx0XHRjb25zdCBpbnRlcnZhbCA9IHNldFRpbWVvdXQoXG5cdFx0XHQoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FsbGVkID0gdHJ1ZTtcblx0XHRcdFx0Y2FsbGJhY2sobmV3IFNvY2tldFRpbWVvdXRFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnKSk7XG5cdFx0XHR9LFxuXHRcdFx0cmVxdWVzdFRpbWVvdXRcblx0XHQpO1xuXG5cdFx0cmV0dXJuICguLi5hcmdzKSA9PlxuXHRcdHtcblx0XHRcdGlmIChjYWxsZWQpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRjbGVhclRpbWVvdXQoaW50ZXJ2YWwpO1xuXG5cdFx0XHRjYWxsYmFjayguLi5hcmdzKTtcblx0XHR9O1xuXHR9XG5cblx0X3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSlcblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5fc2lnbmFsaW5nU29ja2V0KVxuXHRcdFx0e1xuXHRcdFx0XHRyZWplY3QoJ05vIHNvY2tldCBjb25uZWN0aW9uJyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5lbWl0KFxuXHRcdFx0XHRcdCdyZXF1ZXN0Jyxcblx0XHRcdFx0XHR7IG1ldGhvZCwgZGF0YSB9LFxuXHRcdFx0XHRcdHRoaXMudGltZW91dENhbGxiYWNrKChlcnIsIHJlc3BvbnNlKSA9PlxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChlcnIpXG5cdFx0XHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuICB9XG5cblxuXHRwdWJsaWMgYXN5bmMgc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhPyk6UHJvbWlzZTxhbnk+XG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2VuZFJlcXVlc3QoKSBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJywgbWV0aG9kLCBkYXRhKTtcblxuXHRcdGNvbnN0IHJlcXVlc3RSZXRyaWVzID0gM1xuXG5cblx0XHRmb3IgKGxldCB0cmllcyA9IDA7IHRyaWVzIDwgcmVxdWVzdFJldHJpZXM7IHRyaWVzKyspXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLl9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0ZXJyb3IgaW5zdGFuY2VvZiBTb2NrZXRUaW1lb3V0RXJyb3IgJiZcblx0XHRcdFx0XHR0cmllcyA8IHJlcXVlc3RSZXRyaWVzXG5cdFx0XHRcdClcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzZW5kUmVxdWVzdCgpIHwgdGltZW91dCwgcmV0cnlpbmcgW2F0dGVtcHQ6XCIlc1wiXScsIHRyaWVzKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59XG4iXX0=
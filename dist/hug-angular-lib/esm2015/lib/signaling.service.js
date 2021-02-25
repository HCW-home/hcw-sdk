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
        this._closed = false;
        this.onDisconnected = new Subject();
        this.onReconnecting = new Subject();
        this.onReconnected = new Subject();
        this.onNewConsumer = new Subject();
        this.onNotification = new Subject();
    }
    init(token) {
        this._closed = false;
        this._signalingUrl;
        this._signalingSocket = io(token);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUU1QyxZQUFZLE9BQU87UUFFbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUUvQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjO1lBQzNELGFBQWE7WUFDaEIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBS0QsTUFBTSxPQUFPLGdCQUFnQjtJQWEzQixZQUFvQixNQUFrQjtRQUFsQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBUHRDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFaEIsbUJBQWMsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUM1QyxtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLGtCQUFhLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDM0Msa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1QyxtQkFBYyxHQUFp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QUFnQixDQUFDLElBQUksQ0FDekIsU0FBUyxFQUNULEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxFQUNoQixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO29CQUV0QyxJQUFJLEdBQUc7d0JBQ04sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzt3QkFFWixPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUM7YUFDRjtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsQ0FBQztJQUdXLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSzs7WUFFckMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBRTFFLE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQTtZQUd4QixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsY0FBYyxFQUFFLEtBQUssRUFBRSxFQUNuRDtnQkFDQyxJQUNBO29CQUNDLE9BQU8sTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztpQkFDN0M7Z0JBQ0QsT0FBTyxLQUFLLEVBQ1o7b0JBQ0MsSUFDQyxLQUFLLFlBQVksa0JBQWtCO3dCQUNuQyxLQUFLLEdBQUcsY0FBYzt3QkFFdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxDQUFDLENBQUM7O3dCQUU1RSxNQUFNLEtBQUssQ0FBQztpQkFDYjthQUNEO1FBQ0YsQ0FBQztLQUFBOztnRkF0TVcsZ0JBQWdCO3dEQUFoQixnQkFBZ0IsV0FBaEIsZ0JBQWdCLG1CQUZmLE1BQU07a0RBRVAsZ0JBQWdCO2NBSDVCLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuXG5pbXBvcnQgeyBpbywgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvLWNsaWVudCc7XG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5cblxuY29uc3QgcmVxdWVzdFRpbWVvdXQgPSAyMDAwMFxuXG4vKipcbiAqIEVycm9yIHByb2R1Y2VkIHdoZW4gYSBzb2NrZXQgcmVxdWVzdCBoYXMgYSB0aW1lb3V0LlxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0VGltZW91dEVycm9yIGV4dGVuZHMgRXJyb3Jcbntcblx0Y29uc3RydWN0b3IobWVzc2FnZSlcblx0e1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXG5cdFx0dGhpcy5uYW1lID0gJ1NvY2tldFRpbWVvdXRFcnJvcic7XG5cbiAgICBpZiAoRXJyb3IuaGFzT3duUHJvcGVydHkoJ2NhcHR1cmVTdGFja1RyYWNlJykpIC8vIEp1c3QgaW4gVjguXG4gICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBTb2NrZXRUaW1lb3V0RXJyb3IpO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKG1lc3NhZ2UpKS5zdGFjaztcblx0fVxufVxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBTaWduYWxpbmdTZXJ2aWNlICB7XG5cbiAgcGVlcklkOiBzdHJpbmc7XG4gIHJvb21JZDogc3RyaW5nO1xuICBfc2lnbmFsaW5nU29ja2V0OiBTb2NrZXQ7XG4gIF9zaWduYWxpbmdVcmw6IHN0cmluZztcbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIG9uRGlzY29ubmVjdGVkOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0aW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25OZXdDb25zdW1lcjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgb25Ob3RpZmljYXRpb246IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlICkge1xuXG4gICB9XG5cblxuICBpbml0KHRva2VuKSB7XG5cbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9zaWduYWxpbmdVcmw7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gaW8odG9rZW4pXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXCJJbml0aWFsaXplIHNvY2tldCBcIiwgdGhpcy5fc2lnbmFsaW5nVXJsKVxuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PlxuXHRcdHtcblx0XHQgXHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJjb25uZWN0XCIgZXZlbnQnKTtcbiAgICB9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignZGlzY29ubmVjdCcsIChyZWFzb24pID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJkaXNjb25uZWN0XCIgZXZlbnQgW3JlYXNvbjpcIiVzXCJdJywgcmVhc29uKTtcblxuXHRcdFx0aWYgKHRoaXMuX2Nsb3NlZClcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRpZiAocmVhc29uID09PSAnaW8gc2VydmVyIGRpc2Nvbm5lY3QnKVxuXHRcdFx0e1xuICAgICAgICB0aGlzLm9uRGlzY29ubmVjdGVkLm5leHQoKVxuXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHRcdH1cblxuICAgICAgdGhpcy5vblJlY29ubmVjdGluZy5uZXh0XG5cblx0XHR9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVjb25uZWN0X2ZhaWxlZCcsICgpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RfZmFpbGVkXCIgZXZlbnQnKTtcblxuICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0dGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdCcsIChhdHRlbXB0TnVtYmVyKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdzaWduYWxpbmcgUGVlciBcInJlY29ubmVjdFwiIGV2ZW50IFthdHRlbXB0czpcIiVzXCJdJywgYXR0ZW1wdE51bWJlcik7XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RlZC5uZXh0KGF0dGVtcHROdW1iZXIpXG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cdFx0fSk7XG5cblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZXF1ZXN0JywgYXN5bmMgKHJlcXVlc3QsIGNiKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKFxuXHRcdFx0XHQnc29ja2V0IFwicmVxdWVzdFwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuXHRcdFx0XHRyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC5kYXRhKTtcblxuXG5cdFx0XHRzd2l0Y2ggKHJlcXVlc3QubWV0aG9kKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlICduZXdDb25zdW1lcic6XG5cdFx0XHRcdHtcbiAgICAgICAgICAgIHRoaXMub25OZXdDb25zdW1lci5uZXh0KHJlcXVlc3QuZGF0YSk7XG4gICAgICAgICAgICBjYigpXG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcigndW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiVzXCInLCByZXF1ZXN0Lm1ldGhvZCk7XG5cblx0XHRcdFx0XHRjYig1MDAsIGB1bmtub3duIHJlcXVlc3QubWV0aG9kIFwiJHtyZXF1ZXN0Lm1ldGhvZH1cImApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ25vdGlmaWNhdGlvbicsIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0PiBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRoaXMub25Ob3RpZmljYXRpb24ubmV4dChub3RpZmljYXRpb24pXG5cbiAgICB9KTtcblxuXG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuY2xvc2UoKTtcbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQgPSBudWxsO1xuXG5cbiAgfVxuXHR0aW1lb3V0Q2FsbGJhY2soY2FsbGJhY2spXG5cdHtcblx0XHRsZXQgY2FsbGVkID0gZmFsc2U7XG5cblx0XHRjb25zdCBpbnRlcnZhbCA9IHNldFRpbWVvdXQoXG5cdFx0XHQoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FsbGVkID0gdHJ1ZTtcblx0XHRcdFx0Y2FsbGJhY2sobmV3IFNvY2tldFRpbWVvdXRFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnKSk7XG5cdFx0XHR9LFxuXHRcdFx0cmVxdWVzdFRpbWVvdXRcblx0XHQpO1xuXG5cdFx0cmV0dXJuICguLi5hcmdzKSA9PlxuXHRcdHtcblx0XHRcdGlmIChjYWxsZWQpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRjbGVhclRpbWVvdXQoaW50ZXJ2YWwpO1xuXG5cdFx0XHRjYWxsYmFjayguLi5hcmdzKTtcblx0XHR9O1xuXHR9XG5cblx0X3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSlcblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5fc2lnbmFsaW5nU29ja2V0KVxuXHRcdFx0e1xuXHRcdFx0XHRyZWplY3QoJ05vIHNvY2tldCBjb25uZWN0aW9uJyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5lbWl0KFxuXHRcdFx0XHRcdCdyZXF1ZXN0Jyxcblx0XHRcdFx0XHR7IG1ldGhvZCwgZGF0YSB9LFxuXHRcdFx0XHRcdHRoaXMudGltZW91dENhbGxiYWNrKChlcnIsIHJlc3BvbnNlKSA9PlxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChlcnIpXG5cdFx0XHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuICB9XG5cblxuXHRwdWJsaWMgYXN5bmMgc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhPyk6UHJvbWlzZTxhbnk+XG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2VuZFJlcXVlc3QoKSBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJywgbWV0aG9kLCBkYXRhKTtcblxuXHRcdGNvbnN0IHJlcXVlc3RSZXRyaWVzID0gM1xuXG5cblx0XHRmb3IgKGxldCB0cmllcyA9IDA7IHRyaWVzIDwgcmVxdWVzdFJldHJpZXM7IHRyaWVzKyspXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLl9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0ZXJyb3IgaW5zdGFuY2VvZiBTb2NrZXRUaW1lb3V0RXJyb3IgJiZcblx0XHRcdFx0XHR0cmllcyA8IHJlcXVlc3RSZXRyaWVzXG5cdFx0XHRcdClcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzZW5kUmVxdWVzdCgpIHwgdGltZW91dCwgcmV0cnlpbmcgW2F0dGVtcHQ6XCIlc1wiXScsIHRyaWVzKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59XG4iXX0=
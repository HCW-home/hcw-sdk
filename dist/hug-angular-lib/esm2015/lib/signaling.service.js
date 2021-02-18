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
    init(roomId, peerId) {
        this._closed = false;
        this._signalingUrl =
            `${this._signalingBaseUrl}/?roomId=${roomId}&peerId=${peerId}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUU1QyxZQUFZLE9BQU87UUFFbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUUvQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjO1lBQzNELGFBQWE7WUFDaEIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBS0QsTUFBTSxPQUFPLGdCQUFnQjtJQWMzQixZQUFvQixNQUFrQjtRQUFsQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBVHRDLHNCQUFpQixHQUFHLG1DQUFtQyxDQUFDO1FBRXhELFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFaEIsbUJBQWMsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUM1QyxtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLGtCQUFhLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDM0Msa0JBQWEsR0FBaUIsSUFBSSxP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VUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5cbmltcG9ydCB7IGlvLCBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8tY2xpZW50JztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcblxuXG5jb25zdCByZXF1ZXN0VGltZW91dCA9IDIwMDAwXG5cbi8qKlxuICogRXJyb3IgcHJvZHVjZWQgd2hlbiBhIHNvY2tldCByZXF1ZXN0IGhhcyBhIHRpbWVvdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRUaW1lb3V0RXJyb3IgZXh0ZW5kcyBFcnJvclxue1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlKVxuXHR7XG5cdFx0c3VwZXIobWVzc2FnZSk7XG5cblx0XHR0aGlzLm5hbWUgPSAnU29ja2V0VGltZW91dEVycm9yJztcblxuICAgIGlmIChFcnJvci5oYXNPd25Qcm9wZXJ0eSgnY2FwdHVyZVN0YWNrVHJhY2UnKSkgLy8gSnVzdCBpbiBWOC5cbiAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIFNvY2tldFRpbWVvdXRFcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zdGFjayA9IChuZXcgRXJyb3IobWVzc2FnZSkpLnN0YWNrO1xuXHR9XG59XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFNpZ25hbGluZ1NlcnZpY2UgIHtcblxuICBwZWVySWQ6IHN0cmluZztcbiAgcm9vbUlkOiBzdHJpbmc7XG4gIF9zaWduYWxpbmdTb2NrZXQ6IFNvY2tldDtcbiAgX3NpZ25hbGluZ0Jhc2VVcmwgPSAnd3NzOi8vbWVkaWFzb3VwLXRlc3Qub25pYWJzaXMuY29tJztcbiAgX3NpZ25hbGluZ1VybDogc3RyaW5nO1xuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgb25EaXNjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3Rpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3RlZDogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKVxuICBvbk5ld0NvbnN1bWVyOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBvbk5vdGlmaWNhdGlvbjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UgKSB7XG5cbiAgIH1cblxuXG4gIGluaXQocm9vbUlkLCBwZWVySWQpIHtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3NpZ25hbGluZ1VybCA9XG4gICAgYCR7dGhpcy5fc2lnbmFsaW5nQmFzZVVybH0vP3Jvb21JZD0ke3Jvb21JZH0mcGVlcklkPSR7cGVlcklkfWA7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gaW8odGhpcy5fc2lnbmFsaW5nVXJsKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFwiSW5pdGlhbGl6ZSBzb2NrZXQgXCIsIHRoaXMuX3NpZ25hbGluZ1VybClcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdjb25uZWN0JywgKCkgPT5cblx0XHR7XG5cdFx0IFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NpZ25hbGluZyBQZWVyIFwiY29ubmVjdFwiIGV2ZW50Jyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAocmVhc29uKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwiZGlzY29ubmVjdFwiIGV2ZW50IFtyZWFzb246XCIlc1wiXScsIHJlYXNvbik7XG5cblx0XHRcdGlmICh0aGlzLl9jbG9zZWQpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKHJlYXNvbiA9PT0gJ2lvIHNlcnZlciBkaXNjb25uZWN0Jylcblx0XHRcdHtcbiAgICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RpbmcubmV4dFxuXG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdF9mYWlsZWQnLCAoKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwicmVjb25uZWN0X2ZhaWxlZFwiIGV2ZW50Jyk7XG5cbiAgICAgIHRoaXMub25EaXNjb25uZWN0ZWQubmV4dCgpXG5cblx0XHRcdHRoaXMuY2xvc2UoKTtcbiAgICB9KTtcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZWNvbm5lY3QnLCAoYXR0ZW1wdE51bWJlcikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RcIiBldmVudCBbYXR0ZW1wdHM6XCIlc1wiXScsIGF0dGVtcHROdW1iZXIpO1xuXG4gICAgICB0aGlzLm9uUmVjb25uZWN0ZWQubmV4dChhdHRlbXB0TnVtYmVyKVxuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGVkJykpO1xuXHRcdH0pO1xuXG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVxdWVzdCcsIGFzeW5jIChyZXF1ZXN0LCBjYikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zyhcblx0XHRcdFx0J3NvY2tldCBcInJlcXVlc3RcIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcblx0XHRcdFx0cmVxdWVzdC5tZXRob2QsIHJlcXVlc3QuZGF0YSk7XG5cblxuXHRcdFx0c3dpdGNoIChyZXF1ZXN0Lm1ldGhvZClcblx0XHRcdHtcblx0XHRcdFx0Y2FzZSAnbmV3Q29uc3VtZXInOlxuXHRcdFx0XHR7XG4gICAgICAgICAgICB0aGlzLm9uTmV3Q29uc3VtZXIubmV4dChyZXF1ZXN0LmRhdGEpO1xuICAgICAgICAgICAgY2IoKVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ3Vua25vd24gcmVxdWVzdC5tZXRob2QgXCIlc1wiJywgcmVxdWVzdC5tZXRob2QpO1xuXG5cdFx0XHRcdFx0Y2IoNTAwLCBgdW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiR7cmVxdWVzdC5tZXRob2R9XCJgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdub3RpZmljYXRpb24nLCAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldD4gXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0aGlzLm9uTm90aWZpY2F0aW9uLm5leHQobm90aWZpY2F0aW9uKVxuXG4gICAgfSk7XG5cblxuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0LmNsb3NlKCk7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gbnVsbDtcblxuXG4gIH1cblx0dGltZW91dENhbGxiYWNrKGNhbGxiYWNrKVxuXHR7XG5cdFx0bGV0IGNhbGxlZCA9IGZhbHNlO1xuXG5cdFx0Y29uc3QgaW50ZXJ2YWwgPSBzZXRUaW1lb3V0KFxuXHRcdFx0KCkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGNhbGxlZClcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrKG5ldyBTb2NrZXRUaW1lb3V0RXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JykpO1xuXHRcdFx0fSxcblx0XHRcdHJlcXVlc3RUaW1lb3V0XG5cdFx0KTtcblxuXHRcdHJldHVybiAoLi4uYXJncykgPT5cblx0XHR7XG5cdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRjYWxsZWQgPSB0cnVlO1xuXHRcdFx0Y2xlYXJUaW1lb3V0KGludGVydmFsKTtcblxuXHRcdFx0Y2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fTtcblx0fVxuXG5cdF9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMuX3NpZ25hbGluZ1NvY2tldClcblx0XHRcdHtcblx0XHRcdFx0cmVqZWN0KCdObyBzb2NrZXQgY29ubmVjdGlvbicpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQuZW1pdChcblx0XHRcdFx0XHQncmVxdWVzdCcsXG5cdFx0XHRcdFx0eyBtZXRob2QsIGRhdGEgfSxcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRDYWxsYmFjaygoZXJyLCByZXNwb25zZSkgPT5cblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9KTtcbiAgfVxuXG5cblx0cHVibGljIGFzeW5jIHNlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YT8pOlByb21pc2U8YW55PlxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NlbmRSZXF1ZXN0KCkgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsIG1ldGhvZCwgZGF0YSk7XG5cblx0XHRjb25zdCByZXF1ZXN0UmV0cmllcyA9IDNcblxuXG5cdFx0Zm9yIChsZXQgdHJpZXMgPSAwOyB0cmllcyA8IHJlcXVlc3RSZXRyaWVzOyB0cmllcysrKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5fc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlcnJvcilcblx0XHRcdHtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVycm9yIGluc3RhbmNlb2YgU29ja2V0VGltZW91dEVycm9yICYmXG5cdFx0XHRcdFx0dHJpZXMgPCByZXF1ZXN0UmV0cmllc1xuXHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2VuZFJlcXVlc3QoKSB8IHRpbWVvdXQsIHJldHJ5aW5nIFthdHRlbXB0OlwiJXNcIl0nLCB0cmllcyk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxufVxuIl19
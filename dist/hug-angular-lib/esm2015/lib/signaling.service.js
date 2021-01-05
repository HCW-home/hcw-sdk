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
        this._signalingBaseUrl = 'wss://localhost';
        this._closed = false;
        this.onDisconnected = new Subject();
        this.onReconnecting = new Subject();
        this.onReconnected = new Subject();
        this.onNewConsumer = new Subject();
        this.onNotification = new Subject();
    }
    init(roomId, peerId) {
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
            this.logger.debug('socket "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
            this.onNotification.next(notification);
        });
    }
    close() {
        if (this._closed)
            return;
        this._closed = true;
        this.logger.debug('close()');
        this._signalingSocket.close();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixNQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsS0FBSztJQUU1QyxZQUFZLE9BQU87UUFFbEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWYsSUFBSSxDQUFDLElBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUUvQixJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxjQUFjO1lBQzNELGFBQWE7WUFDaEIsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDOztZQUVsRCxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDMUMsQ0FBQztDQUNEO0FBS0QsTUFBTSxPQUFPLGdCQUFnQjtJQWMzQixZQUFvQixNQUFrQjtRQUFsQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBVHRDLHNCQUFpQixHQUFHLGlCQUFpQixDQUFDO1FBRXRDLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFaEIsbUJBQWMsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUM1QyxtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLGtCQUFhLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDM0Msa0JBQWEsR0FBaUIsSUFBSSxP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Y2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuXG5pbXBvcnQgeyBpbywgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvLWNsaWVudCc7XG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5cblxuY29uc3QgcmVxdWVzdFRpbWVvdXQgPSAyMDAwMFxuXG4vKipcbiAqIEVycm9yIHByb2R1Y2VkIHdoZW4gYSBzb2NrZXQgcmVxdWVzdCBoYXMgYSB0aW1lb3V0LlxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0VGltZW91dEVycm9yIGV4dGVuZHMgRXJyb3Jcbntcblx0Y29uc3RydWN0b3IobWVzc2FnZSlcblx0e1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXG5cdFx0dGhpcy5uYW1lID0gJ1NvY2tldFRpbWVvdXRFcnJvcic7XG5cbiAgICBpZiAoRXJyb3IuaGFzT3duUHJvcGVydHkoJ2NhcHR1cmVTdGFja1RyYWNlJykpIC8vIEp1c3QgaW4gVjguXG4gICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBTb2NrZXRUaW1lb3V0RXJyb3IpO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKG1lc3NhZ2UpKS5zdGFjaztcblx0fVxufVxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBTaWduYWxpbmdTZXJ2aWNlICB7XG5cbiAgcGVlcklkOiBzdHJpbmc7XG4gIHJvb21JZDogc3RyaW5nO1xuICBfc2lnbmFsaW5nU29ja2V0OiBTb2NrZXQ7XG4gIF9zaWduYWxpbmdCYXNlVXJsID0gJ3dzczovL2xvY2FsaG9zdCc7XG4gIF9zaWduYWxpbmdVcmw6IHN0cmluZztcbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIG9uRGlzY29ubmVjdGVkOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0aW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25OZXdDb25zdW1lcjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgb25Ob3RpZmljYXRpb246IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlICkge1xuXG4gICB9XG5cblxuICBpbml0KHJvb21JZCwgcGVlcklkKSB7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdVcmwgPVxuICAgIGAke3RoaXMuX3NpZ25hbGluZ0Jhc2VVcmx9Lz9yb29tSWQ9JHtyb29tSWR9JnBlZXJJZD0ke3BlZXJJZH1gO1xuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldCA9IGlvKHRoaXMuX3NpZ25hbGluZ1VybClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcIkluaXRpYWxpemUgc29ja2V0IFwiLCB0aGlzLl9zaWduYWxpbmdVcmwpXG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignY29ubmVjdCcsICgpID0+XG5cdFx0e1xuXHRcdCBcdHRoaXMubG9nZ2VyLmRlYnVnKCdzaWduYWxpbmcgUGVlciBcImNvbm5lY3RcIiBldmVudCcpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKHJlYXNvbikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzaWduYWxpbmcgUGVlciBcImRpc2Nvbm5lY3RcIiBldmVudCBbcmVhc29uOlwiJXNcIl0nLCByZWFzb24pO1xuXG5cdFx0XHRpZiAodGhpcy5fY2xvc2VkKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdGlmIChyZWFzb24gPT09ICdpbyBzZXJ2ZXIgZGlzY29ubmVjdCcpXG5cdFx0XHR7XG4gICAgICAgIHRoaXMub25EaXNjb25uZWN0ZWQubmV4dCgpXG5cblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0fVxuXG4gICAgICB0aGlzLm9uUmVjb25uZWN0aW5nLm5leHRcblxuXHRcdH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZWNvbm5lY3RfZmFpbGVkJywgKCkgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzaWduYWxpbmcgUGVlciBcInJlY29ubmVjdF9mYWlsZWRcIiBldmVudCcpO1xuXG4gICAgICB0aGlzLm9uRGlzY29ubmVjdGVkLm5leHQoKVxuXG5cdFx0XHR0aGlzLmNsb3NlKCk7XG4gICAgfSk7XG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVjb25uZWN0JywgKGF0dGVtcHROdW1iZXIpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NpZ25hbGluZyBQZWVyIFwicmVjb25uZWN0XCIgZXZlbnQgW2F0dGVtcHRzOlwiJXNcIl0nLCBhdHRlbXB0TnVtYmVyKTtcblxuICAgICAgdGhpcy5vblJlY29ubmVjdGVkLm5leHQoYXR0ZW1wdE51bWJlcilcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblx0XHR9KTtcblxuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlcXVlc3QnLCBhc3luYyAocmVxdWVzdCwgY2IpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoXG5cdFx0XHRcdCdzb2NrZXQgXCJyZXF1ZXN0XCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG5cdFx0XHRcdHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LmRhdGEpO1xuXG5cblx0XHRcdHN3aXRjaCAocmVxdWVzdC5tZXRob2QpXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgJ25ld0NvbnN1bWVyJzpcblx0XHRcdFx0e1xuICAgICAgICAgICAgdGhpcy5vbk5ld0NvbnN1bWVyLm5leHQocmVxdWVzdC5kYXRhKTtcbiAgICAgICAgICAgIGNiKClcblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCd1bmtub3duIHJlcXVlc3QubWV0aG9kIFwiJXNcIicsIHJlcXVlc3QubWV0aG9kKTtcblxuXHRcdFx0XHRcdGNiKDUwMCwgYHVua25vd24gcmVxdWVzdC5tZXRob2QgXCIke3JlcXVlc3QubWV0aG9kfVwiYCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignbm90aWZpY2F0aW9uJywgKG5vdGlmaWNhdGlvbikgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0aGlzLm9uTm90aWZpY2F0aW9uLm5leHQobm90aWZpY2F0aW9uKVxuXG4gICAgfSk7XG5cblxuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0LmNsb3NlKCk7XG5cblxuICB9XG5cdHRpbWVvdXRDYWxsYmFjayhjYWxsYmFjaylcblx0e1xuXHRcdGxldCBjYWxsZWQgPSBmYWxzZTtcblxuXHRcdGNvbnN0IGludGVydmFsID0gc2V0VGltZW91dChcblx0XHRcdCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChjYWxsZWQpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRjYWxsZWQgPSB0cnVlO1xuXHRcdFx0XHRjYWxsYmFjayhuZXcgU29ja2V0VGltZW91dEVycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcpKTtcblx0XHRcdH0sXG5cdFx0XHRyZXF1ZXN0VGltZW91dFxuXHRcdCk7XG5cblx0XHRyZXR1cm4gKC4uLmFyZ3MpID0+XG5cdFx0e1xuXHRcdFx0aWYgKGNhbGxlZClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Y2FsbGVkID0gdHJ1ZTtcblx0XHRcdGNsZWFyVGltZW91dChpbnRlcnZhbCk7XG5cblx0XHRcdGNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdH07XG5cdH1cblxuXHRfc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLl9zaWduYWxpbmdTb2NrZXQpXG5cdFx0XHR7XG5cdFx0XHRcdHJlamVjdCgnTm8gc29ja2V0IGNvbm5lY3Rpb24nKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0LmVtaXQoXG5cdFx0XHRcdFx0J3JlcXVlc3QnLFxuXHRcdFx0XHRcdHsgbWV0aG9kLCBkYXRhIH0sXG5cdFx0XHRcdFx0dGhpcy50aW1lb3V0Q2FsbGJhY2soKGVyciwgcmVzcG9uc2UpID0+XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKGVycilcblx0XHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSk7XG4gIH1cblxuXG5cdHB1YmxpYyBhc3luYyBzZW5kUmVxdWVzdChtZXRob2QsIGRhdGE/KTpQcm9taXNlPGFueT5cblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdzZW5kUmVxdWVzdCgpIFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLCBtZXRob2QsIGRhdGEpO1xuXG5cdFx0Y29uc3QgcmVxdWVzdFJldHJpZXMgPSAzXG5cblxuXHRcdGZvciAobGV0IHRyaWVzID0gMDsgdHJpZXMgPCByZXF1ZXN0UmV0cmllczsgdHJpZXMrKylcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuX3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHRlcnJvciBpbnN0YW5jZW9mIFNvY2tldFRpbWVvdXRFcnJvciAmJlxuXHRcdFx0XHRcdHRyaWVzIDwgcmVxdWVzdFJldHJpZXNcblx0XHRcdFx0KVxuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NlbmRSZXF1ZXN0KCkgfCB0aW1lb3V0LCByZXRyeWluZyBbYXR0ZW1wdDpcIiVzXCJdJywgdHJpZXMpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cbn1cbiJdfQ==
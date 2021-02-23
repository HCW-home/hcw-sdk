import { __awaiter, __extends, __generator, __read, __spread } from "tslib";
import { Injectable } from '@angular/core';
import { io } from 'socket.io-client';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "./log.service";
var requestTimeout = 20000;
/**
 * Error produced when a socket request has a timeout.
 */
var SocketTimeoutError = /** @class */ (function (_super) {
    __extends(SocketTimeoutError, _super);
    function SocketTimeoutError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'SocketTimeoutError';
        if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
            // @ts-ignore
            Error.captureStackTrace(_this, SocketTimeoutError);
        else
            _this.stack = (new Error(message)).stack;
        return _this;
    }
    return SocketTimeoutError;
}(Error));
export { SocketTimeoutError };
var SignalingService = /** @class */ (function () {
    function SignalingService(logger) {
        this.logger = logger;
        this._signalingBaseUrl = 'wss://mediasoup-test.oniabsis.com';
        this._closed = false;
        this.onDisconnected = new Subject();
        this.onReconnecting = new Subject();
        this.onReconnected = new Subject();
        this.onNewConsumer = new Subject();
        this.onNotification = new Subject();
    }
    SignalingService.prototype.init = function (token) {
        var _this = this;
        this._closed = false;
        this._signalingUrl =
            this._signalingBaseUrl + "/?token=" + token;
        this._signalingSocket = io(this._signalingUrl);
        this.logger.debug("Initialize socket ", this._signalingUrl);
        this._signalingSocket.on('connect', function () {
            _this.logger.debug('signaling Peer "connect" event');
        });
        this._signalingSocket.on('disconnect', function (reason) {
            _this.logger.warn('signaling Peer "disconnect" event [reason:"%s"]', reason);
            if (_this._closed)
                return;
            if (reason === 'io server disconnect') {
                _this.onDisconnected.next();
                _this.close();
            }
            _this.onReconnecting.next;
        });
        this._signalingSocket.on('reconnect_failed', function () {
            _this.logger.warn('signaling Peer "reconnect_failed" event');
            _this.onDisconnected.next();
            _this.close();
        });
        this._signalingSocket.on('reconnect', function (attemptNumber) {
            _this.logger.debug('signaling Peer "reconnect" event [attempts:"%s"]', attemptNumber);
            _this.onReconnected.next(attemptNumber);
            // store.dispatch(roomActions.setRoomState('connected'));
        });
        this._signalingSocket.on('request', function (request, cb) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
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
                            cb(500, "unknown request.method \"" + request.method + "\"");
                        }
                }
                return [2 /*return*/];
            });
        }); });
        this._signalingSocket.on('notification', function (notification) {
            _this.logger.debug('socket> "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
            _this.onNotification.next(notification);
        });
    };
    SignalingService.prototype.close = function () {
        if (this._closed)
            return;
        this._closed = true;
        this.logger.debug('close()');
        this._signalingSocket.close();
        this._signalingSocket = null;
    };
    SignalingService.prototype.timeoutCallback = function (callback) {
        var called = false;
        var interval = setTimeout(function () {
            if (called)
                return;
            called = true;
            callback(new SocketTimeoutError('Request timed out'));
        }, requestTimeout);
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (called)
                return;
            called = true;
            clearTimeout(interval);
            callback.apply(void 0, __spread(args));
        };
    };
    SignalingService.prototype._sendRequest = function (method, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!_this._signalingSocket) {
                reject('No socket connection');
            }
            else {
                _this._signalingSocket.emit('request', { method: method, data: data }, _this.timeoutCallback(function (err, response) {
                    if (err)
                        reject(err);
                    else
                        resolve(response);
                }));
            }
        });
    };
    SignalingService.prototype.sendRequest = function (method, data) {
        return __awaiter(this, void 0, void 0, function () {
            var requestRetries, tries, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);
                        requestRetries = 3;
                        tries = 0;
                        _a.label = 1;
                    case 1:
                        if (!(tries < requestRetries)) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this._sendRequest(method, data)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        error_1 = _a.sent();
                        if (error_1 instanceof SocketTimeoutError &&
                            tries < requestRetries)
                            this.logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
                        else
                            throw error_1;
                        return [3 /*break*/, 5];
                    case 5:
                        tries++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SignalingService.ɵfac = function SignalingService_Factory(t) { return new (t || SignalingService)(i0.ɵɵinject(i1.LogService)); };
    SignalingService.ɵprov = i0.ɵɵdefineInjectable({ token: SignalingService, factory: SignalingService.ɵfac, providedIn: 'root' });
    return SignalingService;
}());
export { SignalingService };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(SignalingService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.LogService }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSDtJQUF3QyxzQ0FBSztJQUU1Qyw0QkFBWSxPQUFPO1FBQW5CLFlBRUMsa0JBQU0sT0FBTyxDQUFDLFNBU2Q7UUFQQSxLQUFJLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDO1FBRS9CLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGNBQWM7WUFDM0QsYUFBYTtZQUNoQixLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7O1lBRWxELEtBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7SUFDMUMsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FBQyxBQWRELENBQXdDLEtBQUssR0FjNUM7O0FBRUQ7SUFpQkUsMEJBQW9CLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFUdEMsc0JBQWlCLEdBQUcsbUNBQW1DLENBQUM7UUFFeEQsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUVoQixtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLG1CQUFjLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDNUMsa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxrQkFBYSxH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ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuXG5pbXBvcnQgeyBpbywgU29ja2V0IH0gZnJvbSAnc29ja2V0LmlvLWNsaWVudCc7XG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5cblxuY29uc3QgcmVxdWVzdFRpbWVvdXQgPSAyMDAwMFxuXG4vKipcbiAqIEVycm9yIHByb2R1Y2VkIHdoZW4gYSBzb2NrZXQgcmVxdWVzdCBoYXMgYSB0aW1lb3V0LlxuICovXG5leHBvcnQgY2xhc3MgU29ja2V0VGltZW91dEVycm9yIGV4dGVuZHMgRXJyb3Jcbntcblx0Y29uc3RydWN0b3IobWVzc2FnZSlcblx0e1xuXHRcdHN1cGVyKG1lc3NhZ2UpO1xuXG5cdFx0dGhpcy5uYW1lID0gJ1NvY2tldFRpbWVvdXRFcnJvcic7XG5cbiAgICBpZiAoRXJyb3IuaGFzT3duUHJvcGVydHkoJ2NhcHR1cmVTdGFja1RyYWNlJykpIC8vIEp1c3QgaW4gVjguXG4gICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBTb2NrZXRUaW1lb3V0RXJyb3IpO1xuXHRcdGVsc2Vcblx0XHRcdHRoaXMuc3RhY2sgPSAobmV3IEVycm9yKG1lc3NhZ2UpKS5zdGFjaztcblx0fVxufVxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBTaWduYWxpbmdTZXJ2aWNlICB7XG5cbiAgcGVlcklkOiBzdHJpbmc7XG4gIHJvb21JZDogc3RyaW5nO1xuICBfc2lnbmFsaW5nU29ja2V0OiBTb2NrZXQ7XG4gIF9zaWduYWxpbmdCYXNlVXJsID0gJ3dzczovL21lZGlhc291cC10ZXN0Lm9uaWFic2lzLmNvbSc7XG4gIF9zaWduYWxpbmdVcmw6IHN0cmluZztcbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIG9uRGlzY29ubmVjdGVkOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0aW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25OZXdDb25zdW1lcjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgb25Ob3RpZmljYXRpb246IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlICkge1xuXG4gICB9XG5cblxuICBpbml0KHRva2VuKSB7XG5cbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9zaWduYWxpbmdVcmwgPVxuICAgIGAke3RoaXMuX3NpZ25hbGluZ0Jhc2VVcmx9Lz90b2tlbj0ke3Rva2VufWA7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gaW8odGhpcy5fc2lnbmFsaW5nVXJsKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFwiSW5pdGlhbGl6ZSBzb2NrZXQgXCIsIHRoaXMuX3NpZ25hbGluZ1VybClcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdjb25uZWN0JywgKCkgPT5cblx0XHR7XG5cdFx0IFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NpZ25hbGluZyBQZWVyIFwiY29ubmVjdFwiIGV2ZW50Jyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAocmVhc29uKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwiZGlzY29ubmVjdFwiIGV2ZW50IFtyZWFzb246XCIlc1wiXScsIHJlYXNvbik7XG5cblx0XHRcdGlmICh0aGlzLl9jbG9zZWQpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKHJlYXNvbiA9PT0gJ2lvIHNlcnZlciBkaXNjb25uZWN0Jylcblx0XHRcdHtcbiAgICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RpbmcubmV4dFxuXG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdF9mYWlsZWQnLCAoKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwicmVjb25uZWN0X2ZhaWxlZFwiIGV2ZW50Jyk7XG5cbiAgICAgIHRoaXMub25EaXNjb25uZWN0ZWQubmV4dCgpXG5cblx0XHRcdHRoaXMuY2xvc2UoKTtcbiAgICB9KTtcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZWNvbm5lY3QnLCAoYXR0ZW1wdE51bWJlcikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RcIiBldmVudCBbYXR0ZW1wdHM6XCIlc1wiXScsIGF0dGVtcHROdW1iZXIpO1xuXG4gICAgICB0aGlzLm9uUmVjb25uZWN0ZWQubmV4dChhdHRlbXB0TnVtYmVyKVxuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGVkJykpO1xuXHRcdH0pO1xuXG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVxdWVzdCcsIGFzeW5jIChyZXF1ZXN0LCBjYikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zyhcblx0XHRcdFx0J3NvY2tldCBcInJlcXVlc3RcIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcblx0XHRcdFx0cmVxdWVzdC5tZXRob2QsIHJlcXVlc3QuZGF0YSk7XG5cblxuXHRcdFx0c3dpdGNoIChyZXF1ZXN0Lm1ldGhvZClcblx0XHRcdHtcblx0XHRcdFx0Y2FzZSAnbmV3Q29uc3VtZXInOlxuXHRcdFx0XHR7XG4gICAgICAgICAgICB0aGlzLm9uTmV3Q29uc3VtZXIubmV4dChyZXF1ZXN0LmRhdGEpO1xuICAgICAgICAgICAgY2IoKVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ3Vua25vd24gcmVxdWVzdC5tZXRob2QgXCIlc1wiJywgcmVxdWVzdC5tZXRob2QpO1xuXG5cdFx0XHRcdFx0Y2IoNTAwLCBgdW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiR7cmVxdWVzdC5tZXRob2R9XCJgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdub3RpZmljYXRpb24nLCAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldD4gXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0aGlzLm9uTm90aWZpY2F0aW9uLm5leHQobm90aWZpY2F0aW9uKVxuXG4gICAgfSk7XG5cblxuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0LmNsb3NlKCk7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gbnVsbDtcblxuXG4gIH1cblx0dGltZW91dENhbGxiYWNrKGNhbGxiYWNrKVxuXHR7XG5cdFx0bGV0IGNhbGxlZCA9IGZhbHNlO1xuXG5cdFx0Y29uc3QgaW50ZXJ2YWwgPSBzZXRUaW1lb3V0KFxuXHRcdFx0KCkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGNhbGxlZClcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrKG5ldyBTb2NrZXRUaW1lb3V0RXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JykpO1xuXHRcdFx0fSxcblx0XHRcdHJlcXVlc3RUaW1lb3V0XG5cdFx0KTtcblxuXHRcdHJldHVybiAoLi4uYXJncykgPT5cblx0XHR7XG5cdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRjYWxsZWQgPSB0cnVlO1xuXHRcdFx0Y2xlYXJUaW1lb3V0KGludGVydmFsKTtcblxuXHRcdFx0Y2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fTtcblx0fVxuXG5cdF9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMuX3NpZ25hbGluZ1NvY2tldClcblx0XHRcdHtcblx0XHRcdFx0cmVqZWN0KCdObyBzb2NrZXQgY29ubmVjdGlvbicpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQuZW1pdChcblx0XHRcdFx0XHQncmVxdWVzdCcsXG5cdFx0XHRcdFx0eyBtZXRob2QsIGRhdGEgfSxcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRDYWxsYmFjaygoZXJyLCByZXNwb25zZSkgPT5cblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9KTtcbiAgfVxuXG5cblx0cHVibGljIGFzeW5jIHNlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YT8pOlByb21pc2U8YW55PlxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NlbmRSZXF1ZXN0KCkgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsIG1ldGhvZCwgZGF0YSk7XG5cblx0XHRjb25zdCByZXF1ZXN0UmV0cmllcyA9IDNcblxuXG5cdFx0Zm9yIChsZXQgdHJpZXMgPSAwOyB0cmllcyA8IHJlcXVlc3RSZXRyaWVzOyB0cmllcysrKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5fc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlcnJvcilcblx0XHRcdHtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVycm9yIGluc3RhbmNlb2YgU29ja2V0VGltZW91dEVycm9yICYmXG5cdFx0XHRcdFx0dHJpZXMgPCByZXF1ZXN0UmV0cmllc1xuXHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2VuZFJlcXVlc3QoKSB8IHRpbWVvdXQsIHJldHJ5aW5nIFthdHRlbXB0OlwiJXNcIl0nLCB0cmllcyk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxufVxuIl19
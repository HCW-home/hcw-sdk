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
        this._signalingBaseUrl = 'wss://localhost';
        this._closed = false;
        this.onDisconnected = new Subject();
        this.onReconnecting = new Subject();
        this.onReconnected = new Subject();
        this.onNewConsumer = new Subject();
        this.onNotification = new Subject();
    }
    SignalingService.prototype.init = function (roomId, peerId) {
        var _this = this;
        this._signalingUrl =
            this._signalingBaseUrl + "/?roomId=" + roomId + "&peerId=" + peerId;
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
            _this.logger.debug('socket "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
            _this.onNotification.next(notification);
        });
    };
    SignalingService.prototype.close = function () {
        if (this._closed)
            return;
        this._closed = true;
        this.logger.debug('close()');
        this._signalingSocket.close();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSDtJQUF3QyxzQ0FBSztJQUU1Qyw0QkFBWSxPQUFPO1FBQW5CLFlBRUMsa0JBQU0sT0FBTyxDQUFDLFNBU2Q7UUFQQSxLQUFJLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDO1FBRS9CLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGNBQWM7WUFDM0QsYUFBYTtZQUNoQixLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7O1lBRWxELEtBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7SUFDMUMsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FBQyxBQWRELENBQXdDLEtBQUssR0FjNUM7O0FBRUQ7SUFpQkUsMEJBQW9CLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFUdEMsc0JBQWlCLEdBQUcsaUJBQWlCLENBQUM7UUFFdEMsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUVoQixtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLG1CQUFjLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDNUMsa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxrQkFBYSxH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aW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5cbmltcG9ydCB7IGlvLCBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8tY2xpZW50JztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcblxuXG5jb25zdCByZXF1ZXN0VGltZW91dCA9IDIwMDAwXG5cbi8qKlxuICogRXJyb3IgcHJvZHVjZWQgd2hlbiBhIHNvY2tldCByZXF1ZXN0IGhhcyBhIHRpbWVvdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRUaW1lb3V0RXJyb3IgZXh0ZW5kcyBFcnJvclxue1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlKVxuXHR7XG5cdFx0c3VwZXIobWVzc2FnZSk7XG5cblx0XHR0aGlzLm5hbWUgPSAnU29ja2V0VGltZW91dEVycm9yJztcblxuICAgIGlmIChFcnJvci5oYXNPd25Qcm9wZXJ0eSgnY2FwdHVyZVN0YWNrVHJhY2UnKSkgLy8gSnVzdCBpbiBWOC5cbiAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIFNvY2tldFRpbWVvdXRFcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zdGFjayA9IChuZXcgRXJyb3IobWVzc2FnZSkpLnN0YWNrO1xuXHR9XG59XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFNpZ25hbGluZ1NlcnZpY2UgIHtcblxuICBwZWVySWQ6IHN0cmluZztcbiAgcm9vbUlkOiBzdHJpbmc7XG4gIF9zaWduYWxpbmdTb2NrZXQ6IFNvY2tldDtcbiAgX3NpZ25hbGluZ0Jhc2VVcmwgPSAnd3NzOi8vbG9jYWxob3N0JztcbiAgX3NpZ25hbGluZ1VybDogc3RyaW5nO1xuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgb25EaXNjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3Rpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25SZWNvbm5lY3RlZDogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKVxuICBvbk5ld0NvbnN1bWVyOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBvbk5vdGlmaWNhdGlvbjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UgKSB7XG5cbiAgIH1cblxuXG4gIGluaXQocm9vbUlkLCBwZWVySWQpIHtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1VybCA9XG4gICAgYCR7dGhpcy5fc2lnbmFsaW5nQmFzZVVybH0vP3Jvb21JZD0ke3Jvb21JZH0mcGVlcklkPSR7cGVlcklkfWA7XG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0ID0gaW8odGhpcy5fc2lnbmFsaW5nVXJsKVxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFwiSW5pdGlhbGl6ZSBzb2NrZXQgXCIsIHRoaXMuX3NpZ25hbGluZ1VybClcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdjb25uZWN0JywgKCkgPT5cblx0XHR7XG5cdFx0IFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NpZ25hbGluZyBQZWVyIFwiY29ubmVjdFwiIGV2ZW50Jyk7XG4gICAgfSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAocmVhc29uKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwiZGlzY29ubmVjdFwiIGV2ZW50IFtyZWFzb246XCIlc1wiXScsIHJlYXNvbik7XG5cblx0XHRcdGlmICh0aGlzLl9jbG9zZWQpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKHJlYXNvbiA9PT0gJ2lvIHNlcnZlciBkaXNjb25uZWN0Jylcblx0XHRcdHtcbiAgICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0XHR0aGlzLmNsb3NlKCk7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RpbmcubmV4dFxuXG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdF9mYWlsZWQnLCAoKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NpZ25hbGluZyBQZWVyIFwicmVjb25uZWN0X2ZhaWxlZFwiIGV2ZW50Jyk7XG5cbiAgICAgIHRoaXMub25EaXNjb25uZWN0ZWQubmV4dCgpXG5cblx0XHRcdHRoaXMuY2xvc2UoKTtcbiAgICB9KTtcblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZWNvbm5lY3QnLCAoYXR0ZW1wdE51bWJlcikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RcIiBldmVudCBbYXR0ZW1wdHM6XCIlc1wiXScsIGF0dGVtcHROdW1iZXIpO1xuXG4gICAgICB0aGlzLm9uUmVjb25uZWN0ZWQubmV4dChhdHRlbXB0TnVtYmVyKVxuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGVkJykpO1xuXHRcdH0pO1xuXG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVxdWVzdCcsIGFzeW5jIChyZXF1ZXN0LCBjYikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1Zyhcblx0XHRcdFx0J3NvY2tldCBcInJlcXVlc3RcIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcblx0XHRcdFx0cmVxdWVzdC5tZXRob2QsIHJlcXVlc3QuZGF0YSk7XG5cblxuXHRcdFx0c3dpdGNoIChyZXF1ZXN0Lm1ldGhvZClcblx0XHRcdHtcblx0XHRcdFx0Y2FzZSAnbmV3Q29uc3VtZXInOlxuXHRcdFx0XHR7XG4gICAgICAgICAgICB0aGlzLm9uTmV3Q29uc3VtZXIubmV4dChyZXF1ZXN0LmRhdGEpO1xuICAgICAgICAgICAgY2IoKVxuXG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ3Vua25vd24gcmVxdWVzdC5tZXRob2QgXCIlc1wiJywgcmVxdWVzdC5tZXRob2QpO1xuXG5cdFx0XHRcdFx0Y2IoNTAwLCBgdW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiR7cmVxdWVzdC5tZXRob2R9XCJgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdub3RpZmljYXRpb24nLCAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRoaXMub25Ob3RpZmljYXRpb24ubmV4dChub3RpZmljYXRpb24pXG5cbiAgICB9KTtcblxuXG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuY2xvc2UoKTtcblxuXG4gIH1cblx0dGltZW91dENhbGxiYWNrKGNhbGxiYWNrKVxuXHR7XG5cdFx0bGV0IGNhbGxlZCA9IGZhbHNlO1xuXG5cdFx0Y29uc3QgaW50ZXJ2YWwgPSBzZXRUaW1lb3V0KFxuXHRcdFx0KCkgPT5cblx0XHRcdHtcblx0XHRcdFx0aWYgKGNhbGxlZClcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrKG5ldyBTb2NrZXRUaW1lb3V0RXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JykpO1xuXHRcdFx0fSxcblx0XHRcdHJlcXVlc3RUaW1lb3V0XG5cdFx0KTtcblxuXHRcdHJldHVybiAoLi4uYXJncykgPT5cblx0XHR7XG5cdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRjYWxsZWQgPSB0cnVlO1xuXHRcdFx0Y2xlYXJUaW1lb3V0KGludGVydmFsKTtcblxuXHRcdFx0Y2FsbGJhY2soLi4uYXJncyk7XG5cdFx0fTtcblx0fVxuXG5cdF9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpXG5cdHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT5cblx0XHR7XG5cdFx0XHRpZiAoIXRoaXMuX3NpZ25hbGluZ1NvY2tldClcblx0XHRcdHtcblx0XHRcdFx0cmVqZWN0KCdObyBzb2NrZXQgY29ubmVjdGlvbicpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQuZW1pdChcblx0XHRcdFx0XHQncmVxdWVzdCcsXG5cdFx0XHRcdFx0eyBtZXRob2QsIGRhdGEgfSxcblx0XHRcdFx0XHR0aGlzLnRpbWVvdXRDYWxsYmFjaygoZXJyLCByZXNwb25zZSkgPT5cblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRcdFx0XHRyZWplY3QoZXJyKTtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0cmVzb2x2ZShyZXNwb25zZSk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0KTtcblx0XHRcdH1cblx0XHR9KTtcbiAgfVxuXG5cblx0cHVibGljIGFzeW5jIHNlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YT8pOlByb21pc2U8YW55PlxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NlbmRSZXF1ZXN0KCkgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsIG1ldGhvZCwgZGF0YSk7XG5cblx0XHRjb25zdCByZXF1ZXN0UmV0cmllcyA9IDNcblxuXG5cdFx0Zm9yIChsZXQgdHJpZXMgPSAwOyB0cmllcyA8IHJlcXVlc3RSZXRyaWVzOyB0cmllcysrKVxuXHRcdHtcblx0XHRcdHRyeVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4gYXdhaXQgdGhpcy5fc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlcnJvcilcblx0XHRcdHtcblx0XHRcdFx0aWYgKFxuXHRcdFx0XHRcdGVycm9yIGluc3RhbmNlb2YgU29ja2V0VGltZW91dEVycm9yICYmXG5cdFx0XHRcdFx0dHJpZXMgPCByZXF1ZXN0UmV0cmllc1xuXHRcdFx0XHQpXG5cdFx0XHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2VuZFJlcXVlc3QoKSB8IHRpbWVvdXQsIHJldHJ5aW5nIFthdHRlbXB0OlwiJXNcIl0nLCB0cmllcyk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aHJvdyBlcnJvcjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxufVxuIl19
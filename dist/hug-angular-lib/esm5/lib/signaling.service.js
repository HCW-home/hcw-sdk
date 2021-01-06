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
        this._signalingBaseUrl = 'wss://conferences.iabsis.com';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSDtJQUF3QyxzQ0FBSztJQUU1Qyw0QkFBWSxPQUFPO1FBQW5CLFlBRUMsa0JBQU0sT0FBTyxDQUFDLFNBU2Q7UUFQQSxLQUFJLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDO1FBRS9CLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGNBQWM7WUFDM0QsYUFBYTtZQUNoQixLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7O1lBRWxELEtBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7SUFDMUMsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FBQyxBQWRELENBQXdDLEtBQUssR0FjNUM7O0FBRUQ7SUFpQkUsMEJBQW9CLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFUdEMsc0JBQWlCLEdBQUcsOEJBQThCLENBQUM7UUFFbkQsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUVoQixtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLG1CQUFjLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDNUMsa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxrQkFBYSxH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aW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5cbmltcG9ydCB7IGlvLCBTb2NrZXQgfSBmcm9tICdzb2NrZXQuaW8tY2xpZW50JztcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcblxuXG5jb25zdCByZXF1ZXN0VGltZW91dCA9IDIwMDAwXG5cbi8qKlxuICogRXJyb3IgcHJvZHVjZWQgd2hlbiBhIHNvY2tldCByZXF1ZXN0IGhhcyBhIHRpbWVvdXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBTb2NrZXRUaW1lb3V0RXJyb3IgZXh0ZW5kcyBFcnJvclxue1xuXHRjb25zdHJ1Y3RvcihtZXNzYWdlKVxuXHR7XG5cdFx0c3VwZXIobWVzc2FnZSk7XG5cblx0XHR0aGlzLm5hbWUgPSAnU29ja2V0VGltZW91dEVycm9yJztcblxuICAgIGlmIChFcnJvci5oYXNPd25Qcm9wZXJ0eSgnY2FwdHVyZVN0YWNrVHJhY2UnKSkgLy8gSnVzdCBpbiBWOC5cbiAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIFNvY2tldFRpbWVvdXRFcnJvcik7XG5cdFx0ZWxzZVxuXHRcdFx0dGhpcy5zdGFjayA9IChuZXcgRXJyb3IobWVzc2FnZSkpLnN0YWNrO1xuXHR9XG59XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFNpZ25hbGluZ1NlcnZpY2UgIHtcblxuICBwZWVySWQ6IHN0cmluZztcbiAgcm9vbUlkOiBzdHJpbmc7XG4gIF9zaWduYWxpbmdTb2NrZXQ6IFNvY2tldDtcbiAgX3NpZ25hbGluZ0Jhc2VVcmwgPSAnd3NzOi8vY29uZmVyZW5jZXMuaWFic2lzLmNvbSc7XG4gIF9zaWduYWxpbmdVcmw6IHN0cmluZztcbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIG9uRGlzY29ubmVjdGVkOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0aW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uUmVjb25uZWN0ZWQ6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcbiAgb25OZXdDb25zdW1lcjogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgb25Ob3RpZmljYXRpb246IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlICkge1xuXG4gICB9XG5cblxuICBpbml0KHJvb21JZCwgcGVlcklkKSB7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdVcmwgPVxuICAgIGAke3RoaXMuX3NpZ25hbGluZ0Jhc2VVcmx9Lz9yb29tSWQ9JHtyb29tSWR9JnBlZXJJZD0ke3BlZXJJZH1gO1xuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldCA9IGlvKHRoaXMuX3NpZ25hbGluZ1VybClcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcIkluaXRpYWxpemUgc29ja2V0IFwiLCB0aGlzLl9zaWduYWxpbmdVcmwpXG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignY29ubmVjdCcsICgpID0+XG5cdFx0e1xuXHRcdCBcdHRoaXMubG9nZ2VyLmRlYnVnKCdzaWduYWxpbmcgUGVlciBcImNvbm5lY3RcIiBldmVudCcpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKHJlYXNvbikgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzaWduYWxpbmcgUGVlciBcImRpc2Nvbm5lY3RcIiBldmVudCBbcmVhc29uOlwiJXNcIl0nLCByZWFzb24pO1xuXG5cdFx0XHRpZiAodGhpcy5fY2xvc2VkKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdGlmIChyZWFzb24gPT09ICdpbyBzZXJ2ZXIgZGlzY29ubmVjdCcpXG5cdFx0XHR7XG4gICAgICAgIHRoaXMub25EaXNjb25uZWN0ZWQubmV4dCgpXG5cblx0XHRcdFx0dGhpcy5jbG9zZSgpO1xuXHRcdFx0fVxuXG4gICAgICB0aGlzLm9uUmVjb25uZWN0aW5nLm5leHRcblxuXHRcdH0pO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZWNvbm5lY3RfZmFpbGVkJywgKCkgPT5cblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzaWduYWxpbmcgUGVlciBcInJlY29ubmVjdF9mYWlsZWRcIiBldmVudCcpO1xuXG4gICAgICB0aGlzLm9uRGlzY29ubmVjdGVkLm5leHQoKVxuXG5cdFx0XHR0aGlzLmNsb3NlKCk7XG4gICAgfSk7XG5cblxuXHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVjb25uZWN0JywgKGF0dGVtcHROdW1iZXIpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ3NpZ25hbGluZyBQZWVyIFwicmVjb25uZWN0XCIgZXZlbnQgW2F0dGVtcHRzOlwiJXNcIl0nLCBhdHRlbXB0TnVtYmVyKTtcblxuICAgICAgdGhpcy5vblJlY29ubmVjdGVkLm5leHQoYXR0ZW1wdE51bWJlcilcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblx0XHR9KTtcblxuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlcXVlc3QnLCBhc3luYyAocmVxdWVzdCwgY2IpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoXG5cdFx0XHRcdCdzb2NrZXQgXCJyZXF1ZXN0XCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG5cdFx0XHRcdHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LmRhdGEpO1xuXG5cblx0XHRcdHN3aXRjaCAocmVxdWVzdC5tZXRob2QpXG5cdFx0XHR7XG5cdFx0XHRcdGNhc2UgJ25ld0NvbnN1bWVyJzpcblx0XHRcdFx0e1xuICAgICAgICAgICAgdGhpcy5vbk5ld0NvbnN1bWVyLm5leHQocmVxdWVzdC5kYXRhKTtcbiAgICAgICAgICAgIGNiKClcblxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCd1bmtub3duIHJlcXVlc3QubWV0aG9kIFwiJXNcIicsIHJlcXVlc3QubWV0aG9kKTtcblxuXHRcdFx0XHRcdGNiKDUwMCwgYHVua25vd24gcmVxdWVzdC5tZXRob2QgXCIke3JlcXVlc3QubWV0aG9kfVwiYCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignbm90aWZpY2F0aW9uJywgKG5vdGlmaWNhdGlvbikgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0aGlzLm9uTm90aWZpY2F0aW9uLm5leHQobm90aWZpY2F0aW9uKVxuXG4gICAgfSk7XG5cblxuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0LmNsb3NlKCk7XG5cblxuICB9XG5cdHRpbWVvdXRDYWxsYmFjayhjYWxsYmFjaylcblx0e1xuXHRcdGxldCBjYWxsZWQgPSBmYWxzZTtcblxuXHRcdGNvbnN0IGludGVydmFsID0gc2V0VGltZW91dChcblx0XHRcdCgpID0+XG5cdFx0XHR7XG5cdFx0XHRcdGlmIChjYWxsZWQpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRjYWxsZWQgPSB0cnVlO1xuXHRcdFx0XHRjYWxsYmFjayhuZXcgU29ja2V0VGltZW91dEVycm9yKCdSZXF1ZXN0IHRpbWVkIG91dCcpKTtcblx0XHRcdH0sXG5cdFx0XHRyZXF1ZXN0VGltZW91dFxuXHRcdCk7XG5cblx0XHRyZXR1cm4gKC4uLmFyZ3MpID0+XG5cdFx0e1xuXHRcdFx0aWYgKGNhbGxlZClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0Y2FsbGVkID0gdHJ1ZTtcblx0XHRcdGNsZWFyVGltZW91dChpbnRlcnZhbCk7XG5cblx0XHRcdGNhbGxiYWNrKC4uLmFyZ3MpO1xuXHRcdH07XG5cdH1cblxuXHRfc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKVxuXHR7XG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+XG5cdFx0e1xuXHRcdFx0aWYgKCF0aGlzLl9zaWduYWxpbmdTb2NrZXQpXG5cdFx0XHR7XG5cdFx0XHRcdHJlamVjdCgnTm8gc29ja2V0IGNvbm5lY3Rpb24nKTtcblx0XHRcdH1cblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0LmVtaXQoXG5cdFx0XHRcdFx0J3JlcXVlc3QnLFxuXHRcdFx0XHRcdHsgbWV0aG9kLCBkYXRhIH0sXG5cdFx0XHRcdFx0dGhpcy50aW1lb3V0Q2FsbGJhY2soKGVyciwgcmVzcG9uc2UpID0+XG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKGVycilcblx0XHRcdFx0XHRcdFx0cmVqZWN0KGVycik7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHJlc29sdmUocmVzcG9uc2UpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSk7XG4gIH1cblxuXG5cdHB1YmxpYyBhc3luYyBzZW5kUmVxdWVzdChtZXRob2QsIGRhdGE/KTpQcm9taXNlPGFueT5cblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdzZW5kUmVxdWVzdCgpIFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLCBtZXRob2QsIGRhdGEpO1xuXG5cdFx0Y29uc3QgcmVxdWVzdFJldHJpZXMgPSAzXG5cblxuXHRcdGZvciAobGV0IHRyaWVzID0gMDsgdHJpZXMgPCByZXF1ZXN0UmV0cmllczsgdHJpZXMrKylcblx0XHR7XG5cdFx0XHR0cnlcblx0XHRcdHtcblx0XHRcdFx0cmV0dXJuIGF3YWl0IHRoaXMuX3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSk7XG5cdFx0XHR9XG5cdFx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChcblx0XHRcdFx0XHRlcnJvciBpbnN0YW5jZW9mIFNvY2tldFRpbWVvdXRFcnJvciAmJlxuXHRcdFx0XHRcdHRyaWVzIDwgcmVxdWVzdFJldHJpZXNcblx0XHRcdFx0KVxuXHRcdFx0XHRcdHRoaXMubG9nZ2VyLndhcm4oJ3NlbmRSZXF1ZXN0KCkgfCB0aW1lb3V0LCByZXRyeWluZyBbYXR0ZW1wdDpcIiVzXCJdJywgdHJpZXMpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cbn1cbiJdfQ==
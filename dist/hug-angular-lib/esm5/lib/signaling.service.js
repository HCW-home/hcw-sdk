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
    SignalingService.prototype.init = function (roomId, peerId) {
        var _this = this;
        this._closed = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbmFsaW5nLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvc2lnbmFsaW5nLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUNBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHM0MsT0FBTyxFQUFFLEVBQUUsRUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUcvQixJQUFNLGNBQWMsR0FBRyxLQUFLLENBQUE7QUFFNUI7O0dBRUc7QUFDSDtJQUF3QyxzQ0FBSztJQUU1Qyw0QkFBWSxPQUFPO1FBQW5CLFlBRUMsa0JBQU0sT0FBTyxDQUFDLFNBU2Q7UUFQQSxLQUFJLENBQUMsSUFBSSxHQUFHLG9CQUFvQixDQUFDO1FBRS9CLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLGNBQWM7WUFDM0QsYUFBYTtZQUNoQixLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7O1lBRWxELEtBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7SUFDMUMsQ0FBQztJQUNGLHlCQUFDO0FBQUQsQ0FBQyxBQWRELENBQXdDLEtBQUssR0FjNUM7O0FBRUQ7SUFpQkUsMEJBQW9CLE1BQWtCO1FBQWxCLFdBQU0sR0FBTixNQUFNLENBQVk7UUFUdEMsc0JBQWlCLEdBQUcsbUNBQW1DLENBQUM7UUFFeEQsWUFBTyxHQUFHLEtBQUssQ0FBQztRQUVoQixtQkFBYyxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBQzVDLG1CQUFjLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUE7UUFDNUMsa0JBQWEsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQTtRQUMzQyxrQkFBYSxH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QWhCLGdCQUFnQjtjQUg1QixVQUFVO2VBQUM7Z0JBQ1YsVUFBVSxFQUFFLE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cblxuaW1wb3J0IHsgaW8sIFNvY2tldCB9IGZyb20gJ3NvY2tldC5pby1jbGllbnQnO1xuaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuXG5cbmNvbnN0IHJlcXVlc3RUaW1lb3V0ID0gMjAwMDBcblxuLyoqXG4gKiBFcnJvciBwcm9kdWNlZCB3aGVuIGEgc29ja2V0IHJlcXVlc3QgaGFzIGEgdGltZW91dC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNvY2tldFRpbWVvdXRFcnJvciBleHRlbmRzIEVycm9yXG57XG5cdGNvbnN0cnVjdG9yKG1lc3NhZ2UpXG5cdHtcblx0XHRzdXBlcihtZXNzYWdlKTtcblxuXHRcdHRoaXMubmFtZSA9ICdTb2NrZXRUaW1lb3V0RXJyb3InO1xuXG4gICAgaWYgKEVycm9yLmhhc093blByb3BlcnR5KCdjYXB0dXJlU3RhY2tUcmFjZScpKSAvLyBKdXN0IGluIFY4LlxuICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0RXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgU29ja2V0VGltZW91dEVycm9yKTtcblx0XHRlbHNlXG5cdFx0XHR0aGlzLnN0YWNrID0gKG5ldyBFcnJvcihtZXNzYWdlKSkuc3RhY2s7XG5cdH1cbn1cblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgY2xhc3MgU2lnbmFsaW5nU2VydmljZSAge1xuXG4gIHBlZXJJZDogc3RyaW5nO1xuICByb29tSWQ6IHN0cmluZztcbiAgX3NpZ25hbGluZ1NvY2tldDogU29ja2V0O1xuICBfc2lnbmFsaW5nQmFzZVVybCA9ICd3c3M6Ly9tZWRpYXNvdXAtdGVzdC5vbmlhYnNpcy5jb20nO1xuICBfc2lnbmFsaW5nVXJsOiBzdHJpbmc7XG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBvbkRpc2Nvbm5lY3RlZDogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKVxuICBvblJlY29ubmVjdGluZzogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKVxuICBvblJlY29ubmVjdGVkOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpXG4gIG9uTmV3Q29uc3VtZXI6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIG9uTm90aWZpY2F0aW9uOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGxvZ2dlcjogTG9nU2VydmljZSApIHtcblxuICAgfVxuXG5cbiAgaW5pdChyb29tSWQsIHBlZXJJZCkge1xuXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgdGhpcy5fc2lnbmFsaW5nVXJsID1cbiAgICBgJHt0aGlzLl9zaWduYWxpbmdCYXNlVXJsfS8/cm9vbUlkPSR7cm9vbUlkfSZwZWVySWQ9JHtwZWVySWR9YDtcbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQgPSBpbyh0aGlzLl9zaWduYWxpbmdVcmwpXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXCJJbml0aWFsaXplIHNvY2tldCBcIiwgdGhpcy5fc2lnbmFsaW5nVXJsKVxuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PlxuXHRcdHtcblx0XHQgXHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2lnbmFsaW5nIFBlZXIgXCJjb25uZWN0XCIgZXZlbnQnKTtcbiAgICB9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbignZGlzY29ubmVjdCcsIChyZWFzb24pID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJkaXNjb25uZWN0XCIgZXZlbnQgW3JlYXNvbjpcIiVzXCJdJywgcmVhc29uKTtcblxuXHRcdFx0aWYgKHRoaXMuX2Nsb3NlZClcblx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRpZiAocmVhc29uID09PSAnaW8gc2VydmVyIGRpc2Nvbm5lY3QnKVxuXHRcdFx0e1xuICAgICAgICB0aGlzLm9uRGlzY29ubmVjdGVkLm5leHQoKVxuXG5cdFx0XHRcdHRoaXMuY2xvc2UoKTtcblx0XHRcdH1cblxuICAgICAgdGhpcy5vblJlY29ubmVjdGluZy5uZXh0XG5cblx0XHR9KTtcblxuICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5vbigncmVjb25uZWN0X2ZhaWxlZCcsICgpID0+XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIud2Fybignc2lnbmFsaW5nIFBlZXIgXCJyZWNvbm5lY3RfZmFpbGVkXCIgZXZlbnQnKTtcblxuICAgICAgdGhpcy5vbkRpc2Nvbm5lY3RlZC5uZXh0KClcblxuXHRcdFx0dGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuXG5cblx0XHR0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ3JlY29ubmVjdCcsIChhdHRlbXB0TnVtYmVyKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdzaWduYWxpbmcgUGVlciBcInJlY29ubmVjdFwiIGV2ZW50IFthdHRlbXB0czpcIiVzXCJdJywgYXR0ZW1wdE51bWJlcik7XG5cbiAgICAgIHRoaXMub25SZWNvbm5lY3RlZC5uZXh0KGF0dGVtcHROdW1iZXIpXG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cdFx0fSk7XG5cblxuXG5cdFx0dGhpcy5fc2lnbmFsaW5nU29ja2V0Lm9uKCdyZXF1ZXN0JywgYXN5bmMgKHJlcXVlc3QsIGNiKSA9PlxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKFxuXHRcdFx0XHQnc29ja2V0IFwicmVxdWVzdFwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuXHRcdFx0XHRyZXF1ZXN0Lm1ldGhvZCwgcmVxdWVzdC5kYXRhKTtcblxuXG5cdFx0XHRzd2l0Y2ggKHJlcXVlc3QubWV0aG9kKVxuXHRcdFx0e1xuXHRcdFx0XHRjYXNlICduZXdDb25zdW1lcic6XG5cdFx0XHRcdHtcbiAgICAgICAgICAgIHRoaXMub25OZXdDb25zdW1lci5uZXh0KHJlcXVlc3QuZGF0YSk7XG4gICAgICAgICAgICBjYigpXG5cblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci5lcnJvcigndW5rbm93biByZXF1ZXN0Lm1ldGhvZCBcIiVzXCInLCByZXF1ZXN0Lm1ldGhvZCk7XG5cblx0XHRcdFx0XHRjYig1MDAsIGB1bmtub3duIHJlcXVlc3QubWV0aG9kIFwiJHtyZXF1ZXN0Lm1ldGhvZH1cImApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQub24oJ25vdGlmaWNhdGlvbicsIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0PiBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRoaXMub25Ob3RpZmljYXRpb24ubmV4dChub3RpZmljYXRpb24pXG5cbiAgICB9KTtcblxuXG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuY2xvc2UoKTtcbiAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQgPSBudWxsO1xuXG5cbiAgfVxuXHR0aW1lb3V0Q2FsbGJhY2soY2FsbGJhY2spXG5cdHtcblx0XHRsZXQgY2FsbGVkID0gZmFsc2U7XG5cblx0XHRjb25zdCBpbnRlcnZhbCA9IHNldFRpbWVvdXQoXG5cdFx0XHQoKSA9PlxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoY2FsbGVkKVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0Y2FsbGVkID0gdHJ1ZTtcblx0XHRcdFx0Y2FsbGJhY2sobmV3IFNvY2tldFRpbWVvdXRFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnKSk7XG5cdFx0XHR9LFxuXHRcdFx0cmVxdWVzdFRpbWVvdXRcblx0XHQpO1xuXG5cdFx0cmV0dXJuICguLi5hcmdzKSA9PlxuXHRcdHtcblx0XHRcdGlmIChjYWxsZWQpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGNhbGxlZCA9IHRydWU7XG5cdFx0XHRjbGVhclRpbWVvdXQoaW50ZXJ2YWwpO1xuXG5cdFx0XHRjYWxsYmFjayguLi5hcmdzKTtcblx0XHR9O1xuXHR9XG5cblx0X3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSlcblx0e1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PlxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5fc2lnbmFsaW5nU29ja2V0KVxuXHRcdFx0e1xuXHRcdFx0XHRyZWplY3QoJ05vIHNvY2tldCBjb25uZWN0aW9uJyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NpZ25hbGluZ1NvY2tldC5lbWl0KFxuXHRcdFx0XHRcdCdyZXF1ZXN0Jyxcblx0XHRcdFx0XHR7IG1ldGhvZCwgZGF0YSB9LFxuXHRcdFx0XHRcdHRoaXMudGltZW91dENhbGxiYWNrKChlcnIsIHJlc3BvbnNlKSA9PlxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGlmIChlcnIpXG5cdFx0XHRcdFx0XHRcdHJlamVjdChlcnIpO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRyZXNvbHZlKHJlc3BvbnNlKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuICB9XG5cblxuXHRwdWJsaWMgYXN5bmMgc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhPyk6UHJvbWlzZTxhbnk+XG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1Zygnc2VuZFJlcXVlc3QoKSBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJywgbWV0aG9kLCBkYXRhKTtcblxuXHRcdGNvbnN0IHJlcXVlc3RSZXRyaWVzID0gM1xuXG5cblx0XHRmb3IgKGxldCB0cmllcyA9IDA7IHRyaWVzIDwgcmVxdWVzdFJldHJpZXM7IHRyaWVzKyspXG5cdFx0e1xuXHRcdFx0dHJ5XG5cdFx0XHR7XG5cdFx0XHRcdHJldHVybiBhd2FpdCB0aGlzLl9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoXG5cdFx0XHRcdFx0ZXJyb3IgaW5zdGFuY2VvZiBTb2NrZXRUaW1lb3V0RXJyb3IgJiZcblx0XHRcdFx0XHR0cmllcyA8IHJlcXVlc3RSZXRyaWVzXG5cdFx0XHRcdClcblx0XHRcdFx0XHR0aGlzLmxvZ2dlci53YXJuKCdzZW5kUmVxdWVzdCgpIHwgdGltZW91dCwgcmV0cnlpbmcgW2F0dGVtcHQ6XCIlc1wiXScsIHRyaWVzKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRocm93IGVycm9yO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG59XG4iXX0=
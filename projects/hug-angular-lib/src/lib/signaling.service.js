"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var events_1 = require("events");
var core_1 = require("@angular/core");
var socket_io_client_1 = require("socket.io-client");
var rxjs_1 = require("rxjs");
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
exports.SocketTimeoutError = SocketTimeoutError;
var SignalingService = /** @class */ (function (_super) {
    __extends(SignalingService, _super);
    function SignalingService(logger) {
        var _this = _super.call(this) || this;
        _this.logger = logger;
        _this._signalingBaseUrl = 'localhost:80';
        _this._closed = false;
        _this.onDisconnected = new rxjs_1.Subject();
        _this.onReconnecting = new rxjs_1.Subject();
        _this.onReconnected = new rxjs_1.Subject();
        _this.onNewConsumer = new rxjs_1.Subject();
        _this.onNotification = new rxjs_1.Subject();
        return _this;
    }
    SignalingService.prototype.init = function (roomId, peerId) {
        var _this = this;
        this.emit('shit');
        this._signalingUrl =
            this._signalingBaseUrl + "/?roomId=" + roomId + "&peerId=" + peerId;
        this._signalingSocket = socket_io_client_1.io(this._signalingUrl);
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
            callback.apply(void 0, args);
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
    SignalingService = __decorate([
        core_1.Injectable({
            providedIn: 'root'
        })
    ], SignalingService);
    return SignalingService;
}(events_1.EventEmitter));
exports.SignalingService = SignalingService;

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('ngx-logger'), require('rxjs'), require('rxjs/operators'), require('bowser'), require('mediasoup-client'), require('hark'), require('socket.io-client')) :
    typeof define === 'function' && define.amd ? define('hug-angular-lib', ['exports', '@angular/core', 'ngx-logger', 'rxjs', 'rxjs/operators', 'bowser', 'mediasoup-client', 'hark', 'socket.io-client'], factory) :
    (global = global || self, factory(global['hug-angular-lib'] = {}, global.ng.core, global.ngxLogger, global.rxjs, global.rxjs.operators, global.bowser, global.mediasoupClient, global.hark, global.socket_ioClient));
}(this, (function (exports, core, ngxLogger, rxjs, operators, bowser, mediasoupClient, hark, socket_ioClient) { 'use strict';

    bowser = bowser && Object.prototype.hasOwnProperty.call(bowser, 'default') ? bowser['default'] : bowser;
    hark = hark && Object.prototype.hasOwnProperty.call(hark, 'default') ? hark['default'] : hark;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    }

    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
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
    }

    var __createBinding = Object.create ? (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
    }) : (function(o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
    });

    function __exportStar(m, o) {
        for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
    }

    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m) return m.call(o);
        if (o && typeof o.length === "number") return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    }

    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }

    function __asyncValues(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    }

    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    var __setModuleDefault = Object.create ? (function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
        o["default"] = v;
    };

    function __importStar(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }

    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }

    function __classPrivateFieldGet(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
    }

    function __classPrivateFieldSet(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
    }

    var HugAngularLibComponent = /** @class */ (function () {
        function HugAngularLibComponent() {
        }
        HugAngularLibComponent.prototype.ngOnInit = function () {
        };
        HugAngularLibComponent.ɵfac = function HugAngularLibComponent_Factory(t) { return new (t || HugAngularLibComponent)(); };
        HugAngularLibComponent.ɵcmp = core.ɵɵdefineComponent({ type: HugAngularLibComponent, selectors: [["lib-hug-angular-lib"]], decls: 2, vars: 0, template: function HugAngularLibComponent_Template(rf, ctx) { if (rf & 1) {
                core.ɵɵelementStart(0, "p");
                core.ɵɵtext(1, " hug-fuck shit address ");
                core.ɵɵelementEnd();
            } }, encapsulation: 2 });
        return HugAngularLibComponent;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibComponent, [{
            type: core.Component,
            args: [{
                    selector: 'lib-hug-angular-lib',
                    template: "\n    <p>\n      hug-fuck shit address\n    </p>\n  ",
                    styles: []
                }]
        }], function () { return []; }, null); })();

    // import { Injectable } from '@angular/core';
    // @Injectable({
    //   providedIn: 'root'
    // })
    // export class LogService extends NGXLogger {
    //   constructor() {
    //     super()
    //   }
    // }

    console.log('NGX logger');
    var HugAngularLibModule = /** @class */ (function () {
        function HugAngularLibModule() {
        }
        HugAngularLibModule.ɵmod = core.ɵɵdefineNgModule({ type: HugAngularLibModule });
        HugAngularLibModule.ɵinj = core.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, providers: [ngxLogger.NGXLogger], imports: [[
                    ngxLogger.LoggerModule.forRoot({ level: ngxLogger.NgxLoggerLevel.DEBUG })
                ]] });
        return HugAngularLibModule;
    }());
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && core.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [ngxLogger.LoggerModule], exports: [HugAngularLibComponent] }); })();
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibModule, [{
            type: core.NgModule,
            args: [{
                    declarations: [HugAngularLibComponent],
                    imports: [
                        ngxLogger.LoggerModule.forRoot({ level: ngxLogger.NgxLoggerLevel.DEBUG })
                    ],
                    providers: [ngxLogger.NGXLogger],
                    exports: [HugAngularLibComponent]
                }]
        }], null, null); })();

    var Stream = /** @class */ (function () {
        function Stream() {
            this.onLayerChange = new rxjs.Subject();
            this.mediaStream = new MediaStream();
        }
        Stream.prototype.setConsumer = function (consumer) {
            this.consumer = consumer;
            this.streamId = consumer.id;
            this.kind = consumer.kind;
            this.mediaStream.addTrack(consumer.track);
        };
        Stream.prototype.consumerLayerChanged = function () {
            this.mediaStream = new MediaStream();
            this.mediaStream.addTrack(this.consumer.track);
            this.onLayerChange.next();
        };
        Stream.prototype.setProducer = function (producer) {
            this.producer = producer;
            this.mediaStream.addTrack(producer.track);
        };
        return Stream;
    }());

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
    var SignalingService = /** @class */ (function () {
        function SignalingService(logger) {
            this.logger = logger;
            this._closed = false;
            this.onDisconnected = new rxjs.Subject();
            this.onReconnecting = new rxjs.Subject();
            this.onReconnected = new rxjs.Subject();
            this.onNewConsumer = new rxjs.Subject();
            this.onNotification = new rxjs.Subject();
        }
        SignalingService.prototype.init = function (token) {
            var _this = this;
            this._closed = false;
            this._signalingUrl;
            this._signalingSocket = socket_ioClient.io(token);
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
        SignalingService.ɵfac = function SignalingService_Factory(t) { return new (t || SignalingService)(core.ɵɵinject(ngxLogger.NGXLogger)); };
        SignalingService.ɵprov = core.ɵɵdefineInjectable({ token: SignalingService, factory: SignalingService.ɵfac, providedIn: 'root' });
        return SignalingService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(SignalingService, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], function () { return [{ type: ngxLogger.NGXLogger }]; }, null); })();

    var Peer = /** @class */ (function () {
        function Peer() {
            this.streams = [];
        }
        return Peer;
    }());

    var RemotePeersService = /** @class */ (function () {
        function RemotePeersService(logger) {
            this.logger = logger;
            this._remotePeers = new rxjs.BehaviorSubject([]);
            this.peers = [];
            this.remotePeers = this._remotePeers.asObservable();
        }
        RemotePeersService.prototype.updatePeers = function () {
            var _this = this;
            setTimeout(function () { return _this._remotePeers.next(_this.peers); }, 0);
        };
        RemotePeersService.prototype.clearPeers = function () {
            this._remotePeers = new rxjs.BehaviorSubject([]);
            this.remotePeers = this._remotePeers.asObservable();
            this.peers = [];
        };
        RemotePeersService.prototype.newPeer = function (id) {
            this.logger.debug('New peer', id);
            var peer = new Peer();
            peer.id = id;
            peer.streams = [];
            this.addPeer(peer);
            this.updatePeers();
            return peer;
        };
        RemotePeersService.prototype.closePeer = function (id) {
            this.logger.debug('room "peerClosed" event [peerId:%o]', id);
            this.peers = this.peers.filter(function (peer) { return peer.id !== id; });
            this.updatePeers();
        };
        RemotePeersService.prototype.addPeer = function (peer) {
            this.peers.push(peer);
        };
        RemotePeersService.prototype.addPeers = function (peers) {
            var e_1, _a;
            this.logger.debug('Add peers ', peers);
            var _loop_1 = function (peer) {
                if (!this_1.peers.find(function (p) { return peer.id === p.id; })) {
                    this_1.logger.debug('adding peer [peerId: "%s"]', peer.id);
                    this_1.peers.push({ id: peer.id, streams: [] });
                }
            };
            var this_1 = this;
            try {
                for (var peers_1 = __values(peers), peers_1_1 = peers_1.next(); !peers_1_1.done; peers_1_1 = peers_1.next()) {
                    var peer = peers_1_1.value;
                    _loop_1(peer);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (peers_1_1 && !peers_1_1.done && (_a = peers_1.return)) _a.call(peers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            this.updatePeers();
        };
        RemotePeersService.prototype.newConsumer = function (consumer, peerId, type, producerPaused) {
            this.logger.debug('remote peers New consumer', consumer, peerId);
            var peer = this.peers.find(function (peer) { return peer.id === peerId; });
            if (!peer) {
                this.logger.warn('Couldn\'t find peer', peerId, this.peers);
                peer = this.newPeer(peerId);
            }
            var existingStream = peer.streams.find(function (stream) { var _a; return ((_a = stream.consumer) === null || _a === void 0 ? void 0 : _a.appData.source) === consumer.appData.source; });
            if (existingStream) {
                existingStream.setConsumer(consumer);
            }
            else {
                var stream = new Stream();
                stream.peer = peer;
                stream.type = type;
                stream.producerPaused = producerPaused;
                stream.setConsumer(consumer);
                this.logger.debug('New stream created ', stream);
                peer.streams.push(stream);
            }
            this.updatePeers();
        };
        RemotePeersService.prototype.onConsumerLayerChanged = function (consumerId) {
            var stream = this.getStreamByConsumerId(consumerId);
            if (stream) {
                stream.consumerLayerChanged();
            }
        };
        RemotePeersService.prototype.getStreamByConsumerId = function (consumerId) {
            var e_2, _a;
            try {
                for (var _b = __values(this.peers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var peer = _c.value;
                    var stream = peer.streams.find(function (s) { return s.consumer.id === consumerId; });
                    if (stream) {
                        return stream;
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            return null;
        };
        RemotePeersService.ɵfac = function RemotePeersService_Factory(t) { return new (t || RemotePeersService)(core.ɵɵinject(ngxLogger.NGXLogger)); };
        RemotePeersService.ɵprov = core.ɵɵdefineInjectable({ token: RemotePeersService, factory: RemotePeersService.ɵfac, providedIn: 'root' });
        return RemotePeersService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(RemotePeersService, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], function () { return [{ type: ngxLogger.NGXLogger }]; }, null); })();

    var saveAs;
    var lastN = 4;
    var mobileLastN = 1;
    var videoAspectRatio = 1.777;
    var simulcast = true;
    var simulcastEncodings = [
        { scaleResolutionDownBy: 4 },
        { scaleResolutionDownBy: 2 },
        { scaleResolutionDownBy: 1 }
    ];
    var VIDEO_CONSTRAINS = {
        'low': {
            width: { ideal: 320 },
            aspectRatio: videoAspectRatio
        },
        'medium': {
            width: { ideal: 640 },
            aspectRatio: videoAspectRatio
        },
        'high': {
            width: { ideal: 1280 },
            aspectRatio: videoAspectRatio
        },
        'veryhigh': {
            width: { ideal: 1920 },
            aspectRatio: videoAspectRatio
        },
        'ultra': {
            width: { ideal: 3840 },
            aspectRatio: videoAspectRatio
        }
    };
    var PC_PROPRIETARY_CONSTRAINTS = {
        optional: [{ googDscp: true }]
    };
    var VIDEO_SIMULCAST_ENCODINGS = [
        { scaleResolutionDownBy: 4, maxBitRate: 100000 },
        { scaleResolutionDownBy: 1, maxBitRate: 1200000 }
    ];
    // Used for VP9 webcam video.
    var VIDEO_KSVC_ENCODINGS = [
        { scalabilityMode: 'S3T3_KEY' }
    ];
    // Used for VP9 desktop sharing.
    var VIDEO_SVC_ENCODINGS = [
        { scalabilityMode: 'S3T3', dtx: true }
    ];
    var RoomService = /** @class */ (function () {
        function RoomService(signalingService, logger, remotePeersService) {
            this.signalingService = signalingService;
            this.logger = logger;
            this.remotePeersService = remotePeersService;
            // Transport for sending.
            this._sendTransport = null;
            // Transport for receiving.
            this._recvTransport = null;
            this._closed = false;
            this._produce = true;
            this._forceTcp = false;
            this.subscriptions = [];
            this.onCamProducing = new rxjs.Subject();
            this.onVolumeChange = new rxjs.Subject();
        }
        RoomService.prototype.init = function (_a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.peerId, peerId = _c === void 0 ? null : _c, _d = _b.produce, produce = _d === void 0 ? true : _d, _e = _b.forceTcp, forceTcp = _e === void 0 ? false : _e, _f = _b.muted, muted = _f === void 0 ? false : _f;
            if (!peerId)
                throw new Error('Missing peerId');
            // logger.debug(
            //   'constructor() [peerId: "%s", device: "%s", produce: "%s", forceTcp: "%s", displayName ""]',
            //   peerId, device.flag, produce, forceTcp);
            this.logger.debug('INIT Room ', peerId);
            this._closed = false;
            // Whether we should produce.
            this._produce = produce;
            // Whether we force TCP
            this._forceTcp = forceTcp;
            // Whether simulcast should be used.
            // this._useSimulcast = false;
            // if ('simulcast' in window.config)
            //   this._useSimulcast = window.config.simulcast;
            this._muted = muted;
            // This device
            this._device = this.deviceInfo();
            // My peer name.
            this._peerId = peerId;
            // Alert sound
            // this._soundAlert = new Audio('/sounds/notify.mp3');
            // The room ID
            this._roomId = null;
            // mediasoup-client Device instance.
            // @type {mediasoupClient.Device}
            this._mediasoupDevice = null;
            // Transport for sending.
            this._sendTransport = null;
            // Transport for receiving.
            this._recvTransport = null;
            // Local mic mediasoup Producer.
            this._micProducer = null;
            // Local mic hark
            this._hark = null;
            // Local MediaStream for hark
            this._harkStream = null;
            // Local webcam mediasoup Producer.
            this._webcamProducer = null;
            // Extra videos being produced
            this._extraVideoProducers = new Map();
            // Map of webcam MediaDeviceInfos indexed by deviceId.
            // @type {Map<String, MediaDeviceInfos>}
            this._webcams = {};
            this._audioDevices = {};
            this._audioOutputDevices = {};
            // mediasoup Consumers.
            // @type {Map<String, mediasoupClient.Consumer>}
            this._consumers = new Map();
            this._useSimulcast = simulcast;
            // this._startKeyListener();
            // this._startDevicesListener();
        };
        RoomService.prototype.close = function () {
            this.logger.debug('close()', this._closed);
            if (this._closed)
                return;
            this._closed = true;
            this.logger.debug('close()');
            this.signalingService.close();
            // Close mediasoup Transports.
            if (this._sendTransport)
                this._sendTransport.close();
            if (this._recvTransport)
                this._recvTransport.close();
            this.subscriptions.forEach(function (subscription) {
                subscription.unsubscribe();
            });
            this.disconnectLocalHark();
            this.remotePeersService.clearPeers();
        };
        // _startKeyListener() {
        //   // Add keydown event listener on document
        //   document.addEventListener('keydown', (event) => {
        //     if (event.repeat) return;
        //     const key = String.fromCharCode(event.which);
        //     const source = event.target;
        //     const exclude = ['input', 'textarea'];
        //     if (exclude.indexOf(source.tagName.toLowerCase()) === -1) {
        //       logger.debug('keyDown() [key:"%s"]', key);
        //       switch (key) {
        //         /*
        //         case String.fromCharCode(37):
        //         {
        //           const newPeerId = this._spotlights.getPrevAsSelected(
        //             store.getState().room.selectedPeerId);
        //           if (newPeerId) this.setSelectedPeer(newPeerId);
        //           break;
        //         }
        //         case String.fromCharCode(39):
        //         {
        //           const newPeerId = this._spotlights.getNextAsSelected(
        //             store.getState().room.selectedPeerId);
        //           if (newPeerId) this.setSelectedPeer(newPeerId);
        //           break;
        //         }
        //         */
        //         case 'M': // Toggle microphone
        //           {
        //             if (this._micProducer) {
        //               if (!this._micProducer.paused) {
        //                 this.muteMic();
        //                 store.dispatch(requestActions.notify(
        //                   {
        //                     text: intl.formatMessage({
        //                       id: 'devices.microphoneMute',
        //                       defaultMessage: 'Muted your microphone'
        //                     })
        //                   }));
        //               }
        //               else {
        //                 this.unmuteMic();
        //                 store.dispatch(requestActions.notify(
        //                   {
        //                     text: intl.formatMessage({
        //                       id: 'devices.microphoneUnMute',
        //                       defaultMessage: 'Unmuted your microphone'
        //                     })
        //                   }));
        //               }
        //             }
        //             else {
        //               this.updateMic({ start: true });
        //               store.dispatch(requestActions.notify(
        //                 {
        //                   text: intl.formatMessage({
        //                     id: 'devices.microphoneEnable',
        //                     defaultMessage: 'Enabled your microphone'
        //                   })
        //                 }));
        //             }
        //             break;
        //           }
        //         case 'V': // Toggle video
        //           {
        //             if (this._webcamProducer)
        //               this.disableWebcam();
        //             else
        //               this.updateWebcam({ start: true });
        //             break;
        //           }
        //         case 'H': // Open help dialog
        //           {
        //             store.dispatch(roomActions.setHelpOpen(true));
        //             break;
        //           }
        //         default:
        //           {
        //             break;
        //           }
        //       }
        //     }
        //   });
        // }
        RoomService.prototype._startDevicesListener = function () {
            var _this = this;
            navigator.mediaDevices.addEventListener('devicechange', function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');
                            return [4 /*yield*/, this._updateAudioDevices()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this._updateWebcams()];
                        case 2:
                            _a.sent();
                            return [4 /*yield*/, this._updateAudioOutputDevices()];
                        case 3:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); });
        };
        RoomService.prototype.muteMic = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('muteMic()');
                            this._micProducer.pause();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('pauseProducer', { producerId: this._micProducer.id })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_1 = _a.sent();
                            this.logger.error('muteMic() [error:"%o"]', error_1);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.unmuteMic = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('unmuteMic()');
                            if (!!this._micProducer) return [3 /*break*/, 1];
                            this.updateMic({ start: true });
                            return [3 /*break*/, 5];
                        case 1:
                            this._micProducer.resume();
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.signalingService.sendRequest('resumeProducer', { producerId: this._micProducer.id })];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_2 = _a.sent();
                            this.logger.error('unmuteMic() [error:"%o"]', error_2);
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.disconnectLocalHark = function () {
            this.logger.debug('disconnectLocalHark()');
            if (this._harkStream != null) {
                var _a = __read(this._harkStream.getAudioTracks(), 1), track = _a[0];
                track.stop();
                track = null;
                this._harkStream = null;
            }
            if (this._hark != null)
                this._hark.stop();
        };
        RoomService.prototype.connectLocalHark = function (track) {
            var _this = this;
            this.logger.debug('connectLocalHark() [track:"%o"]', track);
            this._harkStream = new MediaStream();
            var newTrack = track.clone();
            this._harkStream.addTrack(newTrack);
            newTrack.enabled = true;
            this._hark = hark(this._harkStream, {
                play: false,
                interval: 10,
                threshold: -50,
                history: 100
            });
            this._hark.lastVolume = -100;
            this._hark.on('volume_change', function (volume) {
                // Update only if there is a bigger diff
                if (_this._micProducer && Math.abs(volume - _this._hark.lastVolume) > 0.5) {
                    // Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
                    // This makes decay volume fast if difference to last saved value is big
                    // and slow for small changes. This prevents flickering volume indicator
                    // at low levels
                    if (volume < _this._hark.lastVolume) {
                        volume =
                            _this._hark.lastVolume -
                                Math.pow((volume - _this._hark.lastVolume) /
                                    (100 + _this._hark.lastVolume), 2) * 10;
                    }
                    _this._hark.lastVolume = volume;
                    // console.log('VOLUME CHANGE HARK');
                    // this.onVolumeChange.next({peer:this._peerId, volume})
                    // store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
                }
            });
            // this._hark.on('speaking', () =>
            // {
            // 	store.dispatch(meActions.setIsSpeaking(true));
            // 	if (
            // 		(store.getState().settings.voiceActivatedUnmute ||
            // 		store.getState().me.isAutoMuted) &&
            // 		this._micProducer &&
            // 		this._micProducer.paused
            // 	)
            // 		this._micProducer.resume();
            // 	store.dispatch(meActions.setAutoMuted(false)); // sanity action
            // });
            // this._hark.on('stopped_speaking', () =>
            // {
            // 	store.dispatch(meActions.setIsSpeaking(false));
            // 	if (
            // 		store.getState().settings.voiceActivatedUnmute &&
            // 		this._micProducer &&
            // 		!this._micProducer.paused
            // 	)
            // 	{
            // 		this._micProducer.pause();
            // 		store.dispatch(meActions.setAutoMuted(true));
            // 	}
            // });
        };
        RoomService.prototype.changeAudioOutputDevice = function (deviceId) {
            return __awaiter(this, void 0, void 0, function () {
                var device, error_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            device = this._audioOutputDevices[deviceId];
                            if (!device)
                                throw new Error('Selected audio output device no longer available');
                            // store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
                            return [4 /*yield*/, this._updateAudioOutputDevices()];
                        case 2:
                            // store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_3 = _a.sent();
                            this.logger.error('changeAudioOutputDevice() [error:"%o"]', error_3);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // Only Firefox supports applyConstraints to audio tracks
        // See:
        // https://bugs.chromium.org/p/chromium/issues/detail?id=796964
        RoomService.prototype.updateMic = function (_a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.start, start = _c === void 0 ? false : _c, _d = _b.restart, restart = _d === void 0 ? false || this._device.flag !== 'firefox' : _d, _e = _b.newDeviceId, newDeviceId = _e === void 0 ? null : _e;
            return __awaiter(this, void 0, void 0, function () {
                var track, deviceId, device, autoGainControl, echoCancellation, noiseSuppression, _f, _g, sampleRate, _h, channelCount, _j, volume, _k, sampleSize, _l, opusStereo, _m, opusDtx, _o, opusFec, _p, opusPtime, _q, opusMaxPlaybackRate, stream, trackDeviceId, _r, _s, harkTrack, _t, error_4;
                var _u;
                var _this = this;
                return __generator(this, function (_v) {
                    switch (_v.label) {
                        case 0:
                            this.logger.debug('updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]', start, restart, newDeviceId);
                            _v.label = 1;
                        case 1:
                            _v.trys.push([1, 13, , 14]);
                            if (!this._mediasoupDevice.canProduce('audio'))
                                throw new Error('cannot produce audio');
                            if (newDeviceId && !restart)
                                throw new Error('changing device requires restart');
                            return [4 /*yield*/, this._getAudioDeviceId()];
                        case 2:
                            deviceId = _v.sent();
                            device = this._audioDevices[deviceId];
                            if (!device)
                                throw new Error('no audio devices');
                            autoGainControl = false;
                            echoCancellation = true;
                            noiseSuppression = true;
                            _f = {}, _g = _f.sampleRate, sampleRate = _g === void 0 ? 96000 : _g, _h = _f.channelCount, channelCount = _h === void 0 ? 1 : _h, _j = _f.volume, volume = _j === void 0 ? 1.0 : _j, _k = _f.sampleSize, sampleSize = _k === void 0 ? 16 : _k, _l = _f.opusStereo, opusStereo = _l === void 0 ? false : _l, _m = _f.opusDtx, opusDtx = _m === void 0 ? true : _m, _o = _f.opusFec, opusFec = _o === void 0 ? true : _o, _p = _f.opusPtime, opusPtime = _p === void 0 ? 20 : _p, _q = _f.opusMaxPlaybackRate, opusMaxPlaybackRate = _q === void 0 ? 96000 : _q;
                            if (!((restart && this._micProducer) ||
                                start)) return [3 /*break*/, 7];
                            this.disconnectLocalHark();
                            if (!this._micProducer) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.disableMic()];
                        case 3:
                            _v.sent();
                            _v.label = 4;
                        case 4: return [4 /*yield*/, navigator.mediaDevices.getUserMedia({
                                audio: {
                                    deviceId: { ideal: deviceId },
                                    sampleRate: sampleRate,
                                    channelCount: channelCount,
                                    // @ts-ignore
                                    volume: volume,
                                    autoGainControl: autoGainControl,
                                    echoCancellation: echoCancellation,
                                    noiseSuppression: noiseSuppression,
                                    sampleSize: sampleSize
                                }
                            })];
                        case 5:
                            stream = _v.sent();
                            (_u = __read(stream.getAudioTracks(), 1), track = _u[0]);
                            trackDeviceId = track.getSettings().deviceId;
                            // store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));
                            _r = this;
                            return [4 /*yield*/, this._sendTransport.produce({
                                    track: track,
                                    codecOptions: {
                                        opusStereo: opusStereo,
                                        opusDtx: opusDtx,
                                        opusFec: opusFec,
                                        opusPtime: opusPtime,
                                        opusMaxPlaybackRate: opusMaxPlaybackRate
                                    },
                                    appData: { source: 'mic' }
                                })];
                        case 6:
                            // store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));
                            _r._micProducer = _v.sent();
                            // store.dispatch(producerActions.addProducer(
                            //   {
                            //     id: this._micProducer.id,
                            //     source: 'mic',
                            //     paused: this._micProducer.paused,
                            //     track: this._micProducer.track,
                            //     rtpParameters: this._micProducer.rtpParameters,
                            //     codec: this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                            //   }));
                            this._micProducer.on('transportclose', function () {
                                _this._micProducer = null;
                            });
                            this._micProducer.on('trackended', function () {
                                // store.dispatch(requestActions.notify(
                                //   {
                                //     type: 'error',
                                //     text: intl.formatMessage({
                                //       id: 'devices.microphoneDisconnected',
                                //       defaultMessage: 'Microphone disconnected'
                                //     })
                                //   }));
                                _this.disableMic();
                            });
                            this._micProducer.volume = 0;
                            this.connectLocalHark(track);
                            return [3 /*break*/, 11];
                        case 7:
                            if (!this._micProducer) return [3 /*break*/, 11];
                            (track = this._micProducer.track);
                            return [4 /*yield*/, track.applyConstraints({
                                    sampleRate: sampleRate,
                                    channelCount: channelCount,
                                    volume: volume,
                                    autoGainControl: autoGainControl,
                                    echoCancellation: echoCancellation,
                                    noiseSuppression: noiseSuppression,
                                    sampleSize: sampleSize
                                })];
                        case 8:
                            _v.sent();
                            if (!(this._harkStream != null)) return [3 /*break*/, 11];
                            _s = __read(this._harkStream.getAudioTracks(), 1), harkTrack = _s[0];
                            _t = harkTrack;
                            if (!_t) return [3 /*break*/, 10];
                            return [4 /*yield*/, harkTrack.applyConstraints({
                                    sampleRate: sampleRate,
                                    channelCount: channelCount,
                                    volume: volume,
                                    autoGainControl: autoGainControl,
                                    echoCancellation: echoCancellation,
                                    noiseSuppression: noiseSuppression,
                                    sampleSize: sampleSize
                                })];
                        case 9:
                            _t = (_v.sent());
                            _v.label = 10;
                        case 10:
                            _t;
                            _v.label = 11;
                        case 11: return [4 /*yield*/, this._updateAudioDevices()];
                        case 12:
                            _v.sent();
                            return [3 /*break*/, 14];
                        case 13:
                            error_4 = _v.sent();
                            this.logger.error('updateMic() [error:"%o"]', error_4);
                            // store.dispatch(requestActions.notify(
                            //   {
                            //     type: 'error',
                            //     text: intl.formatMessage({
                            //       id: 'devices.microphoneError',
                            //       defaultMessage: 'An error occurred while accessing your microphone'
                            //     })
                            //   }));
                            if (track)
                                track.stop();
                            return [3 /*break*/, 14];
                        case 14: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.updateWebcam = function (_a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.init, init = _c === void 0 ? false : _c, _d = _b.start, start = _d === void 0 ? false : _d, _e = _b.restart, restart = _e === void 0 ? false : _e, _f = _b.newDeviceId, newDeviceId = _f === void 0 ? null : _f, _g = _b.newResolution, newResolution = _g === void 0 ? null : _g, _h = _b.newFrameRate, newFrameRate = _h === void 0 ? null : _h;
            return __awaiter(this, void 0, void 0, function () {
                var track, videoMuted, deviceId, device, resolution, frameRate, stream, trackDeviceId, firstVideoCodec, encodings, _j, _k, webCamStream, _l, _m, producer, e_1_1, error_5;
                var _o, e_1, _p;
                var _this = this;
                return __generator(this, function (_q) {
                    switch (_q.label) {
                        case 0:
                            this.logger.debug('updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]', start, restart, newDeviceId, newResolution, newFrameRate);
                            _q.label = 1;
                        case 1:
                            _q.trys.push([1, 21, , 22]);
                            if (!this._mediasoupDevice.canProduce('video'))
                                throw new Error('cannot produce video');
                            if (newDeviceId && !restart)
                                throw new Error('changing device requires restart');
                            videoMuted = false;
                            if (init && videoMuted)
                                return [2 /*return*/];
                            return [4 /*yield*/, this._getWebcamDeviceId()];
                        case 2:
                            deviceId = _q.sent();
                            device = this._webcams[deviceId];
                            if (!device)
                                throw new Error('no webcam devices');
                            resolution = 'medium';
                            frameRate = 15;
                            if (!((restart && this._webcamProducer) ||
                                start)) return [3 /*break*/, 10];
                            if (!this._webcamProducer) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.disableWebcam()];
                        case 3:
                            _q.sent();
                            _q.label = 4;
                        case 4: return [4 /*yield*/, navigator.mediaDevices.getUserMedia({
                                video: __assign(__assign({ deviceId: { ideal: deviceId } }, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate })
                            })];
                        case 5:
                            stream = _q.sent();
                            (_o = __read(stream.getVideoTracks(), 1), track = _o[0]);
                            trackDeviceId = track.getSettings().deviceId;
                            if (!this._useSimulcast) return [3 /*break*/, 7];
                            firstVideoCodec = this._mediasoupDevice
                                .rtpCapabilities
                                .codecs
                                .find(function (c) { return c.kind === 'video'; });
                            encodings = void 0;
                            if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
                                encodings = VIDEO_KSVC_ENCODINGS;
                            else if (simulcastEncodings)
                                encodings = simulcastEncodings;
                            else
                                encodings = VIDEO_SIMULCAST_ENCODINGS;
                            _j = this;
                            return [4 /*yield*/, this._sendTransport.produce({
                                    track: track,
                                    encodings: encodings,
                                    codecOptions: {
                                        videoGoogleStartBitrate: 1000
                                    },
                                    appData: {
                                        source: 'webcam'
                                    }
                                })];
                        case 6:
                            _j._webcamProducer = _q.sent();
                            return [3 /*break*/, 9];
                        case 7:
                            _k = this;
                            return [4 /*yield*/, this._sendTransport.produce({
                                    track: track,
                                    appData: {
                                        source: 'webcam'
                                    }
                                })];
                        case 8:
                            _k._webcamProducer = _q.sent();
                            _q.label = 9;
                        case 9:
                            webCamStream = new Stream();
                            webCamStream.setProducer(this._webcamProducer);
                            this.onCamProducing.next(webCamStream);
                            this._webcamProducer.on('transportclose', function () {
                                _this._webcamProducer = null;
                            });
                            this._webcamProducer.on('trackended', function () {
                                // store.dispatch(requestActions.notify(
                                //   {
                                //     type: 'error',
                                //     text: intl.formatMessage({
                                //       id: 'devices.cameraDisconnected',
                                //       defaultMessage: 'Camera disconnected'
                                //     })
                                //   }));
                                _this.disableWebcam();
                            });
                            return [3 /*break*/, 19];
                        case 10:
                            if (!this._webcamProducer) return [3 /*break*/, 19];
                            (track = this._webcamProducer.track);
                            return [4 /*yield*/, track.applyConstraints(__assign(__assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate }))];
                        case 11:
                            _q.sent();
                            _q.label = 12;
                        case 12:
                            _q.trys.push([12, 17, 18, 19]);
                            _l = __values(this._extraVideoProducers.values()), _m = _l.next();
                            _q.label = 13;
                        case 13:
                            if (!!_m.done) return [3 /*break*/, 16];
                            producer = _m.value;
                            (track = producer.track);
                            return [4 /*yield*/, track.applyConstraints(__assign(__assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate }))];
                        case 14:
                            _q.sent();
                            _q.label = 15;
                        case 15:
                            _m = _l.next();
                            return [3 /*break*/, 13];
                        case 16: return [3 /*break*/, 19];
                        case 17:
                            e_1_1 = _q.sent();
                            e_1 = { error: e_1_1 };
                            return [3 /*break*/, 19];
                        case 18:
                            try {
                                if (_m && !_m.done && (_p = _l.return)) _p.call(_l);
                            }
                            finally { if (e_1) throw e_1.error; }
                            return [7 /*endfinally*/];
                        case 19: return [4 /*yield*/, this._updateWebcams()];
                        case 20:
                            _q.sent();
                            return [3 /*break*/, 22];
                        case 21:
                            error_5 = _q.sent();
                            this.logger.error('updateWebcam() [error:"%o"]', error_5);
                            // store.dispatch(requestActions.notify(
                            //   {
                            //     type: 'error',
                            //     text: intl.formatMessage({
                            //       id: 'devices.cameraError',
                            //       defaultMessage: 'An error occurred while accessing your camera'
                            //     })
                            //   }));
                            if (track)
                                track.stop();
                            return [3 /*break*/, 22];
                        case 22: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.closeMeeting = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_6;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('closeMeeting()');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('moderator:closeMeeting')];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_6 = _a.sent();
                            this.logger.error('closeMeeting() [error:"%o"]', error_6);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // // type: mic/webcam/screen
        // // mute: true/false
        RoomService.prototype.modifyPeerConsumer = function (peerId, type, mute) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b, consumer, e_2_1, error_7;
                var e_2, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            this.logger.debug('modifyPeerConsumer() [peerId:"%s", type:"%s"]', peerId, type);
                            _d.label = 1;
                        case 1:
                            _d.trys.push([1, 12, , 13]);
                            _d.label = 2;
                        case 2:
                            _d.trys.push([2, 9, 10, 11]);
                            _a = __values(this._consumers.values()), _b = _a.next();
                            _d.label = 3;
                        case 3:
                            if (!!_b.done) return [3 /*break*/, 8];
                            consumer = _b.value;
                            if (!(consumer.appData.peerId === peerId && consumer.appData.source === type)) return [3 /*break*/, 7];
                            if (!mute) return [3 /*break*/, 5];
                            return [4 /*yield*/, this._pauseConsumer(consumer)];
                        case 4:
                            _d.sent();
                            return [3 /*break*/, 7];
                        case 5: return [4 /*yield*/, this._resumeConsumer(consumer)];
                        case 6:
                            _d.sent();
                            _d.label = 7;
                        case 7:
                            _b = _a.next();
                            return [3 /*break*/, 3];
                        case 8: return [3 /*break*/, 11];
                        case 9:
                            e_2_1 = _d.sent();
                            e_2 = { error: e_2_1 };
                            return [3 /*break*/, 11];
                        case 10:
                            try {
                                if (_b && !_b.done && (_c = _a.return)) _c.call(_a);
                            }
                            finally { if (e_2) throw e_2.error; }
                            return [7 /*endfinally*/];
                        case 11: return [3 /*break*/, 13];
                        case 12:
                            error_7 = _d.sent();
                            this.logger.error('modifyPeerConsumer() [error:"%o"]', error_7);
                            return [3 /*break*/, 13];
                        case 13: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._pauseConsumer = function (consumer) {
            return __awaiter(this, void 0, void 0, function () {
                var error_8;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);
                            if (consumer.paused || consumer.closed)
                                return [2 /*return*/];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('pauseConsumer', { consumerId: consumer.id })];
                        case 2:
                            _a.sent();
                            consumer.pause();
                            return [3 /*break*/, 4];
                        case 3:
                            error_8 = _a.sent();
                            this.logger.error('_pauseConsumer() [error:"%o"]', error_8);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._resumeConsumer = function (consumer) {
            return __awaiter(this, void 0, void 0, function () {
                var error_9;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);
                            if (!consumer.paused || consumer.closed)
                                return [2 /*return*/];
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('resumeConsumer', { consumerId: consumer.id })];
                        case 2:
                            _a.sent();
                            consumer.resume();
                            return [3 /*break*/, 4];
                        case 3:
                            error_9 = _a.sent();
                            this.logger.error('_resumeConsumer() [error:"%o"]', error_9);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        // async setMaxSendingSpatialLayer(spatialLayer) {
        //   logger.debug('setMaxSendingSpatialLayer() [spatialLayer:"%s"]', spatialLayer);
        //   try {
        //     if (this._webcamProducer)
        //       await this._webcamProducer.setMaxSpatialLayer(spatialLayer);
        //     if (this._screenSharingProducer)
        //       await this._screenSharingProducer.setMaxSpatialLayer(spatialLayer);
        //   }
        //   catch (error) {
        //     logger.error('setMaxSendingSpatialLayer() [error:"%o"]', error);
        //   }
        // }
        // async setConsumerPreferredLayers(consumerId, spatialLayer, temporalLayer) {
        //   logger.debug(
        //     'setConsumerPreferredLayers() [consumerId:"%s", spatialLayer:"%s", temporalLayer:"%s"]',
        //     consumerId, spatialLayer, temporalLayer);
        //   try {
        //     await this.sendRequest(
        //       'setConsumerPreferedLayers', { consumerId, spatialLayer, temporalLayer });
        //     store.dispatch(consumerActions.setConsumerPreferredLayers(
        //       consumerId, spatialLayer, temporalLayer));
        //   }
        //   catch (error) {
        //     logger.error('setConsumerPreferredLayers() [error:"%o"]', error);
        //   }
        // }
        // async setConsumerPriority(consumerId, priority) {
        //   logger.debug(
        //     'setConsumerPriority() [consumerId:"%s", priority:%d]',
        //     consumerId, priority);
        //   try {
        //     await this.sendRequest('setConsumerPriority', { consumerId, priority });
        //     store.dispatch(consumerActions.setConsumerPriority(consumerId, priority));
        //   }
        //   catch (error) {
        //     logger.error('setConsumerPriority() [error:"%o"]', error);
        //   }
        // }
        // async requestConsumerKeyFrame(consumerId) {
        //   logger.debug('requestConsumerKeyFrame() [consumerId:"%s"]', consumerId);
        //   try {
        //     await this.sendRequest('requestConsumerKeyFrame', { consumerId });
        //   }
        //   catch (error) {
        //     logger.error('requestConsumerKeyFrame() [error:"%o"]', error);
        //   }
        // }
        RoomService.prototype.join = function (_a) {
            var roomId = _a.roomId, joinVideo = _a.joinVideo, joinAudio = _a.joinAudio, token = _a.token;
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_b) {
                    this._roomId = roomId;
                    // initialize signaling socket
                    // listen to socket events
                    this.signalingService.init(token);
                    this.subscriptions.push(this.signalingService.onDisconnected.subscribe(function () {
                        // close
                        // this.close
                    }));
                    this.subscriptions.push(this.signalingService.onReconnecting.subscribe(function () {
                        // close
                        _this.logger.log('Reconnecting...');
                        if (_this._webcamProducer) {
                            _this._webcamProducer.close();
                            // store.dispatch(
                            // 	producerActions.removeProducer(this._webcamProducer.id));
                            _this._webcamProducer = null;
                        }
                        if (_this._micProducer) {
                            _this._micProducer.close();
                            // store.dispatch(
                            // 	producerActions.removeProducer(this._micProducer.id));
                            _this._micProducer = null;
                        }
                        if (_this._sendTransport) {
                            _this._sendTransport.close();
                            _this._sendTransport = null;
                        }
                        if (_this._recvTransport) {
                            _this._recvTransport.close();
                            _this._recvTransport = null;
                        }
                        _this.remotePeersService.clearPeers();
                        // store.dispatch(roomActions.setRoomState('connecting'));
                    }));
                    this.subscriptions.push(this.signalingService.onNewConsumer.pipe(operators.switchMap(function (data) { return __awaiter(_this, void 0, void 0, function () {
                        var peerId, producerId, id, kind, rtpParameters, type, appData, producerPaused, consumer;
                        var _this = this;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    peerId = data.peerId, producerId = data.producerId, id = data.id, kind = data.kind, rtpParameters = data.rtpParameters, type = data.type, appData = data.appData, producerPaused = data.producerPaused;
                                    return [4 /*yield*/, this._recvTransport.consume({
                                            id: id,
                                            producerId: producerId,
                                            kind: kind,
                                            rtpParameters: rtpParameters,
                                            appData: __assign(__assign({}, appData), { peerId: peerId }) // Trick.
                                        })];
                                case 1:
                                    consumer = _a.sent();
                                    // Store in the map.
                                    this._consumers.set(consumer.id, consumer);
                                    consumer.on('transportclose', function () {
                                        _this._consumers.delete(consumer.id);
                                    });
                                    this.remotePeersService.newConsumer(consumer, peerId, type, producerPaused);
                                    return [2 /*return*/];
                            }
                        });
                    }); })).subscribe());
                    this.subscriptions.push(this.signalingService.onNotification.pipe(operators.switchMap(function (notification) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, _b, producerId, score, _c, id, displayName, picture, roles, peerId, consumerId, consumer, peerId, consumerId, consumer, consumerId, consumer, _d, consumerId, spatialLayer, temporalLayer, consumer, _e, consumerId, score, turnServers, peerId, error_10;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    this.logger.debug('socket "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
                                    _f.label = 1;
                                case 1:
                                    _f.trys.push([1, 17, , 18]);
                                    _a = notification.method;
                                    switch (_a) {
                                        case 'producerScore': return [3 /*break*/, 2];
                                        case 'newPeer': return [3 /*break*/, 3];
                                        case 'peerClosed': return [3 /*break*/, 4];
                                        case 'consumerClosed': return [3 /*break*/, 5];
                                        case 'consumerPaused': return [3 /*break*/, 6];
                                        case 'consumerResumed': return [3 /*break*/, 7];
                                        case 'consumerLayersChanged': return [3 /*break*/, 8];
                                        case 'consumerScore': return [3 /*break*/, 9];
                                        case 'roomBack': return [3 /*break*/, 10];
                                        case 'roomReady': return [3 /*break*/, 12];
                                        case 'activeSpeaker': return [3 /*break*/, 14];
                                    }
                                    return [3 /*break*/, 15];
                                case 2:
                                    {
                                        _b = notification.data, producerId = _b.producerId, score = _b.score;
                                        // store.dispatch(
                                        //   producerActions.setProducerScore(producerId, score));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 3;
                                case 3:
                                    {
                                        _c = notification.data, id = _c.id, displayName = _c.displayName, picture = _c.picture, roles = _c.roles;
                                        // store.dispatch(peerActions.addPeer(
                                        //   { id, displayName, picture, roles, consumers: [] }));
                                        this.remotePeersService.newPeer(id);
                                        // this._soundNotification();
                                        // store.dispatch(requestActions.notify(
                                        //   {
                                        //     text: intl.formatMessage({
                                        //       id: 'room.newPeer',
                                        //       defaultMessage: '{displayName} joined the room'
                                        //     }, {
                                        //       displayName
                                        //     })
                                        //   }));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 4;
                                case 4:
                                    {
                                        peerId = notification.data.peerId;
                                        this.remotePeersService.closePeer(peerId);
                                        // store.dispatch(
                                        //   peerActions.removePeer(peerId));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 5;
                                case 5:
                                    {
                                        consumerId = notification.data.consumerId;
                                        consumer = this._consumers.get(consumerId);
                                        if (!consumer)
                                            return [3 /*break*/, 16];
                                        consumer.close();
                                        if (consumer.hark != null)
                                            consumer.hark.stop();
                                        this._consumers.delete(consumerId);
                                        peerId = consumer.appData.peerId;
                                        // store.dispatch(
                                        //   consumerActions.removeConsumer(consumerId, peerId));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 6;
                                case 6:
                                    {
                                        consumerId = notification.data.consumerId;
                                        consumer = this._consumers.get(consumerId);
                                        if (!consumer)
                                            return [3 /*break*/, 16];
                                        // store.dispatch(
                                        //   consumerActions.setConsumerPaused(consumerId, 'remote'));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 7;
                                case 7:
                                    {
                                        consumerId = notification.data.consumerId;
                                        consumer = this._consumers.get(consumerId);
                                        if (!consumer)
                                            return [3 /*break*/, 16];
                                        // store.dispatch(
                                        //   consumerActions.setConsumerResumed(consumerId, 'remote'));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 8;
                                case 8:
                                    {
                                        _d = notification.data, consumerId = _d.consumerId, spatialLayer = _d.spatialLayer, temporalLayer = _d.temporalLayer;
                                        consumer = this._consumers.get(consumerId);
                                        if (!consumer)
                                            return [3 /*break*/, 16];
                                        this.remotePeersService.onConsumerLayerChanged(consumerId);
                                        // store.dispatch(consumerActions.setConsumerCurrentLayers(
                                        //   consumerId, spatialLayer, temporalLayer));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 9;
                                case 9:
                                    {
                                        _e = notification.data, consumerId = _e.consumerId, score = _e.score;
                                        // store.dispatch(
                                        //   consumerActions.setConsumerScore(consumerId, score));
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 10;
                                case 10: return [4 /*yield*/, this._joinRoom({ joinVideo: joinVideo, joinAudio: joinAudio })];
                                case 11:
                                    _f.sent();
                                    return [3 /*break*/, 16];
                                case 12:
                                    turnServers = notification.data.turnServers;
                                    this._turnServers = turnServers;
                                    // store.dispatch(roomActions.toggleJoined());
                                    // store.dispatch(roomActions.setInLobby(false));
                                    return [4 /*yield*/, this._joinRoom({ joinVideo: joinVideo, joinAudio: joinAudio })];
                                case 13:
                                    // store.dispatch(roomActions.toggleJoined());
                                    // store.dispatch(roomActions.setInLobby(false));
                                    _f.sent();
                                    return [3 /*break*/, 16];
                                case 14:
                                    {
                                        peerId = notification.data.peerId;
                                        if (peerId === this._peerId) {
                                            this.onVolumeChange.next(notification.data);
                                        }
                                        // this._spotlights.handleActiveSpeaker(peerId);
                                        return [3 /*break*/, 16];
                                    }
                                    _f.label = 15;
                                case 15:
                                    {
                                        // this.logger.error(
                                        //   'unknown notification.method "%s"', notification.method);
                                    }
                                    _f.label = 16;
                                case 16: return [3 /*break*/, 18];
                                case 17:
                                    error_10 = _f.sent();
                                    this.logger.error('error on socket "notification" event [error:"%o"]', error_10);
                                    return [3 /*break*/, 18];
                                case 18: return [2 /*return*/];
                            }
                        });
                    }); })).subscribe());
                    return [2 /*return*/];
                });
            });
        };
        RoomService.prototype._updateAudioDevices = function () {
            return __awaiter(this, void 0, void 0, function () {
                var devices, devices_1, devices_1_1, device, error_11;
                var e_3, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.debug('_updateAudioDevices()');
                            // Reset the list.
                            this._audioDevices = {};
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            this.logger.debug('_updateAudioDevices() | calling enumerateDevices()');
                            return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                        case 2:
                            devices = _b.sent();
                            try {
                                for (devices_1 = __values(devices), devices_1_1 = devices_1.next(); !devices_1_1.done; devices_1_1 = devices_1.next()) {
                                    device = devices_1_1.value;
                                    if (device.kind !== 'audioinput')
                                        continue;
                                    this._audioDevices[device.deviceId] = device;
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (devices_1_1 && !devices_1_1.done && (_a = devices_1.return)) _a.call(devices_1);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_11 = _b.sent();
                            this.logger.error('_updateAudioDevices() [error:"%o"]', error_11);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._updateWebcams = function () {
            return __awaiter(this, void 0, void 0, function () {
                var devices, devices_2, devices_2_1, device, error_12;
                var e_4, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.debug('_updateWebcams()');
                            // Reset the list.
                            this._webcams = {};
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            this.logger.debug('_updateWebcams() | calling enumerateDevices()');
                            return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                        case 2:
                            devices = _b.sent();
                            try {
                                for (devices_2 = __values(devices), devices_2_1 = devices_2.next(); !devices_2_1.done; devices_2_1 = devices_2.next()) {
                                    device = devices_2_1.value;
                                    if (device.kind !== 'videoinput')
                                        continue;
                                    this._webcams[device.deviceId] = device;
                                }
                            }
                            catch (e_4_1) { e_4 = { error: e_4_1 }; }
                            finally {
                                try {
                                    if (devices_2_1 && !devices_2_1.done && (_a = devices_2.return)) _a.call(devices_2);
                                }
                                finally { if (e_4) throw e_4.error; }
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_12 = _b.sent();
                            this.logger.error('_updateWebcams() [error:"%o"]', error_12);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.disableWebcam = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_13;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('disableWebcam()');
                            if (!this._webcamProducer)
                                return [2 /*return*/];
                            // store.dispatch(meActions.setWebcamInProgress(true));
                            this._webcamProducer.close();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('closeProducer', { producerId: this._webcamProducer.id })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_13 = _a.sent();
                            this.logger.error('disableWebcam() [error:"%o"]', error_13);
                            return [3 /*break*/, 4];
                        case 4:
                            this._webcamProducer = null;
                            return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.disableMic = function () {
            return __awaiter(this, void 0, void 0, function () {
                var error_14;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('disableMic()');
                            if (!this._micProducer)
                                return [2 /*return*/];
                            // store.dispatch(meActions.setAudioInProgress(true));
                            this._micProducer.close();
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, this.signalingService.sendRequest('closeProducer', { producerId: this._micProducer.id })];
                        case 2:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            error_14 = _a.sent();
                            this.logger.error('disableMic() [error:"%o"]', error_14);
                            return [3 /*break*/, 4];
                        case 4:
                            this._micProducer = null;
                            return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._getWebcamDeviceId = function () {
            return __awaiter(this, void 0, void 0, function () {
                var selectedWebcam, webcams, error_15;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('_getWebcamDeviceId()');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            this.logger.debug('_getWebcamDeviceId() | calling _updateWebcams()');
                            return [4 /*yield*/, this._updateWebcams()];
                        case 2:
                            _a.sent();
                            selectedWebcam = null;
                            if (selectedWebcam && this._webcams[selectedWebcam])
                                return [2 /*return*/, selectedWebcam];
                            else {
                                webcams = Object.values(this._webcams);
                                // @ts-ignore
                                return [2 /*return*/, webcams[0] ? webcams[0].deviceId : null];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_15 = _a.sent();
                            this.logger.error('_getWebcamDeviceId() [error:"%o"]', error_15);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._getAudioDeviceId = function () {
            return __awaiter(this, void 0, void 0, function () {
                var selectedAudioDevice, audioDevices, error_16;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.debug('_getAudioDeviceId()');
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 3, , 4]);
                            this.logger.debug('_getAudioDeviceId() | calling _updateAudioDeviceId()');
                            return [4 /*yield*/, this._updateAudioDevices()];
                        case 2:
                            _a.sent();
                            selectedAudioDevice = null;
                            if (selectedAudioDevice && this._audioDevices[selectedAudioDevice])
                                return [2 /*return*/, selectedAudioDevice];
                            else {
                                audioDevices = Object.values(this._audioDevices);
                                // @ts-ignore
                                return [2 /*return*/, audioDevices[0] ? audioDevices[0].deviceId : null];
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_16 = _a.sent();
                            this.logger.error('_getAudioDeviceId() [error:"%o"]', error_16);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._updateAudioOutputDevices = function () {
            return __awaiter(this, void 0, void 0, function () {
                var devices, devices_3, devices_3_1, device, error_17;
                var e_5, _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.debug('_updateAudioOutputDevices()');
                            // Reset the list.
                            this._audioOutputDevices = {};
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 3, , 4]);
                            this.logger.debug('_updateAudioOutputDevices() | calling enumerateDevices()');
                            return [4 /*yield*/, navigator.mediaDevices.enumerateDevices()];
                        case 2:
                            devices = _b.sent();
                            try {
                                for (devices_3 = __values(devices), devices_3_1 = devices_3.next(); !devices_3_1.done; devices_3_1 = devices_3.next()) {
                                    device = devices_3_1.value;
                                    if (device.kind !== 'audiooutput')
                                        continue;
                                    this._audioOutputDevices[device.deviceId] = device;
                                }
                            }
                            catch (e_5_1) { e_5 = { error: e_5_1 }; }
                            finally {
                                try {
                                    if (devices_3_1 && !devices_3_1.done && (_a = devices_3.return)) _a.call(devices_3);
                                }
                                finally { if (e_5) throw e_5.error; }
                            }
                            return [3 /*break*/, 4];
                        case 3:
                            error_17 = _b.sent();
                            this.logger.error('_updateAudioOutputDevices() [error:"%o"]', error_17);
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype._joinRoom = function (_a) {
            var joinVideo = _a.joinVideo, joinAudio = _a.joinAudio;
            return __awaiter(this, void 0, void 0, function () {
                var displayName, routerRtpCapabilities, transportInfo_1, id_1, iceParameters_1, iceCandidates_1, dtlsParameters_1, transportInfo, id, iceParameters, iceCandidates, dtlsParameters, _b, authenticated, roles, peers, tracker, roomPermissions, userRoles, allowWhenRoleMissing, chatHistory, fileHistory, lastNHistory, locked, lobbyPeers, accessCode, error_18;
                var _this = this;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.logger.debug('_joinRoom() Device', this._device);
                            displayName = "Guest " + (Math.floor(Math.random() * (100000 - 10000)) + 10000);
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 11, , 12]);
                            if (this._device.bowser === 'safari') {
                                this._mediasoupDevice = new mediasoupClient.Device({ handlerName: 'Safari12' });
                            }
                            else {
                                this._mediasoupDevice = new mediasoupClient.Device();
                            }
                            return [4 /*yield*/, this.signalingService.sendRequest('getRouterRtpCapabilities')];
                        case 2:
                            routerRtpCapabilities = _c.sent();
                            routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
                                .filter(function (ext) { return ext.uri !== 'urn:3gpp:video-orientation'; });
                            return [4 /*yield*/, this._mediasoupDevice.load({ routerRtpCapabilities: routerRtpCapabilities })];
                        case 3:
                            _c.sent();
                            if (!this._produce) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.signalingService.sendRequest('createWebRtcTransport', {
                                    forceTcp: this._forceTcp,
                                    producing: true,
                                    consuming: false
                                })];
                        case 4:
                            transportInfo_1 = _c.sent();
                            id_1 = transportInfo_1.id, iceParameters_1 = transportInfo_1.iceParameters, iceCandidates_1 = transportInfo_1.iceCandidates, dtlsParameters_1 = transportInfo_1.dtlsParameters;
                            this._sendTransport = this._mediasoupDevice.createSendTransport({
                                id: id_1,
                                iceParameters: iceParameters_1,
                                iceCandidates: iceCandidates_1,
                                dtlsParameters: dtlsParameters_1,
                                iceServers: this._turnServers,
                                // TODO: Fix for issue #72
                                iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined,
                                proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS
                            });
                            this._sendTransport.on('connect', function (_a, callback, errback) {
                                var dtlsParameters = _a.dtlsParameters;
                                _this.signalingService.sendRequest('connectWebRtcTransport', {
                                    transportId: _this._sendTransport.id,
                                    dtlsParameters: dtlsParameters
                                })
                                    .then(callback)
                                    .catch(errback);
                            });
                            this._sendTransport.on('produce', function (_a, callback, errback) {
                                var kind = _a.kind, rtpParameters = _a.rtpParameters, appData = _a.appData;
                                return __awaiter(_this, void 0, void 0, function () {
                                    var id_2, error_19;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _b.trys.push([0, 2, , 3]);
                                                return [4 /*yield*/, this.signalingService.sendRequest('produce', {
                                                        transportId: this._sendTransport.id,
                                                        kind: kind,
                                                        rtpParameters: rtpParameters,
                                                        appData: appData
                                                    })];
                                            case 1:
                                                id_2 = (_b.sent()).id;
                                                callback({ id: id_2 });
                                                return [3 /*break*/, 3];
                                            case 2:
                                                error_19 = _b.sent();
                                                errback(error_19);
                                                return [3 /*break*/, 3];
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                });
                            });
                            _c.label = 5;
                        case 5: return [4 /*yield*/, this.signalingService.sendRequest('createWebRtcTransport', {
                                forceTcp: this._forceTcp,
                                producing: false,
                                consuming: true
                            })];
                        case 6:
                            transportInfo = _c.sent();
                            id = transportInfo.id, iceParameters = transportInfo.iceParameters, iceCandidates = transportInfo.iceCandidates, dtlsParameters = transportInfo.dtlsParameters;
                            this._recvTransport = this._mediasoupDevice.createRecvTransport({
                                id: id,
                                iceParameters: iceParameters,
                                iceCandidates: iceCandidates,
                                dtlsParameters: dtlsParameters,
                                iceServers: this._turnServers,
                                // TODO: Fix for issue #72
                                iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined
                            });
                            this._recvTransport.on('connect', function (_a, callback, errback) {
                                var dtlsParameters = _a.dtlsParameters;
                                _this.signalingService.sendRequest('connectWebRtcTransport', {
                                    transportId: _this._recvTransport.id,
                                    dtlsParameters: dtlsParameters
                                })
                                    .then(callback)
                                    .catch(errback);
                            });
                            return [4 /*yield*/, this.signalingService.sendRequest('join', {
                                    displayName: displayName,
                                    rtpCapabilities: this._mediasoupDevice.rtpCapabilities
                                })];
                        case 7:
                            _b = _c.sent(), authenticated = _b.authenticated, roles = _b.roles, peers = _b.peers, tracker = _b.tracker, roomPermissions = _b.roomPermissions, userRoles = _b.userRoles, allowWhenRoleMissing = _b.allowWhenRoleMissing, chatHistory = _b.chatHistory, fileHistory = _b.fileHistory, lastNHistory = _b.lastNHistory, locked = _b.locked, lobbyPeers = _b.lobbyPeers, accessCode = _b.accessCode;
                            this.logger.debug('_joinRoom() joined [authenticated:"%s", peers:"%o", roles:"%o", userRoles:"%o"]', authenticated, peers, roles, userRoles);
                            // for (const peer of peers)
                            // {
                            // 	store.dispatch(
                            // 		peerActions.addPeer({ ...peer, consumers: [] }));
                            // }
                            this.logger.debug('join audio', joinAudio, 'can produce audio', this._mediasoupDevice.canProduce('audio'), ' this._muted', this._muted);
                            if (!this._produce) return [3 /*break*/, 9];
                            if (joinVideo) {
                                this.updateWebcam({ init: true, start: true });
                            }
                            if (!(joinAudio &&
                                this._mediasoupDevice.canProduce('audio'))) return [3 /*break*/, 9];
                            if (!!this._muted) return [3 /*break*/, 9];
                            return [4 /*yield*/, this.updateMic({ start: true })];
                        case 8:
                            _c.sent();
                            _c.label = 9;
                        case 9: return [4 /*yield*/, this._updateAudioOutputDevices()];
                        case 10:
                            _c.sent();
                            // const  selectedAudioOutputDevice  = null
                            // if (!selectedAudioOutputDevice && this._audioOutputDevices !== {})
                            // {
                            // 	store.dispatch(
                            // 		settingsActions.setSelectedAudioOutputDevice(
                            // 			Object.keys(this._audioOutputDevices)[0]
                            // 		)
                            // 	);
                            // }
                            // store.dispatch(roomActions.setRoomState('connected'));
                            // // Clean all the existing notifications.
                            // store.dispatch(notificationActions.removeAllNotifications());
                            // store.dispatch(requestActions.notify(
                            // 	{
                            // 		text : intl.formatMessage({
                            // 			id             : 'room.joined',
                            // 			defaultMessage : 'You have joined the room'
                            // 		})
                            // 	}));
                            this.remotePeersService.addPeers(peers);
                            return [3 /*break*/, 12];
                        case 11:
                            error_18 = _c.sent();
                            this.logger.error('_joinRoom() [error:"%o"]', error_18);
                            this.close();
                            return [3 /*break*/, 12];
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        RoomService.prototype.deviceInfo = function () {
            var ua = navigator.userAgent;
            var browser = bowser.getParser(ua);
            var flag;
            if (browser.satisfies({ chrome: '>=0', chromium: '>=0' }))
                flag = 'chrome';
            else if (browser.satisfies({ firefox: '>=0' }))
                flag = 'firefox';
            else if (browser.satisfies({ safari: '>=0' }))
                flag = 'safari';
            else if (browser.satisfies({ opera: '>=0' }))
                flag = 'opera';
            else if (browser.satisfies({ 'microsoft edge': '>=0' }))
                flag = 'edge';
            else
                flag = 'unknown';
            return {
                flag: flag,
                os: browser.getOSName(true),
                platform: browser.getPlatformType(true),
                name: browser.getBrowserName(true),
                version: browser.getBrowserVersion(),
                bowser: browser
            };
        };
        RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(core.ɵɵinject(SignalingService), core.ɵɵinject(ngxLogger.NGXLogger), core.ɵɵinject(RemotePeersService)); };
        RoomService.ɵprov = core.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
        return RoomService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(RoomService, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], function () { return [{ type: SignalingService }, { type: ngxLogger.NGXLogger }, { type: RemotePeersService }]; }, null); })();

    Object.defineProperty(exports, 'LogService', {
        enumerable: true,
        get: function () {
            return ngxLogger.NGXLogger;
        }
    });
    exports.HugAngularLibComponent = HugAngularLibComponent;
    exports.HugAngularLibModule = HugAngularLibModule;
    exports.RemotePeersService = RemotePeersService;
    exports.RoomService = RoomService;
    exports.Stream = Stream;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=hug-angular-lib.umd.js.map

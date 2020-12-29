(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('ngx-logger')) :
    typeof define === 'function' && define.amd ? define('hug-angular-lib', ['exports', '@angular/core', 'ngx-logger'], factory) :
    (global = global || self, factory(global['hug-angular-lib'] = {}, global.ng.core, global.ngxLogger));
}(this, (function (exports, core, ngxLogger) { 'use strict';

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

    var Room2Service = /** @class */ (function () {
        function Room2Service() {
            this.room = 2;
        }
        Room2Service.ɵfac = function Room2Service_Factory(t) { return new (t || Room2Service)(); };
        Room2Service.ɵprov = core.ɵɵdefineInjectable({ token: Room2Service, factory: Room2Service.ɵfac });
        return Room2Service;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(Room2Service, [{
            type: core.Injectable
        }], function () { return []; }, null); })();

    var HugAngularLibService = /** @class */ (function () {
        function HugAngularLibService(room2) {
            this.room2 = room2;
            this.random = Math.random();
        }
        HugAngularLibService.ɵfac = function HugAngularLibService_Factory(t) { return new (t || HugAngularLibService)(core.ɵɵinject(Room2Service)); };
        HugAngularLibService.ɵprov = core.ɵɵdefineInjectable({ token: HugAngularLibService, factory: HugAngularLibService.ɵfac });
        return HugAngularLibService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibService, [{
            type: core.Injectable
        }], function () { return [{ type: Room2Service }]; }, null); })();

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
                    ngxLogger.LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: ngxLogger.NgxLoggerLevel.DEBUG, serverLogLevel: ngxLogger.NgxLoggerLevel.ERROR })
                ]] });
        return HugAngularLibModule;
    }());
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && core.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [ngxLogger.LoggerModule], exports: [HugAngularLibComponent] }); })();
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibModule, [{
            type: core.NgModule,
            args: [{
                    declarations: [HugAngularLibComponent],
                    imports: [
                        ngxLogger.LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: ngxLogger.NgxLoggerLevel.DEBUG, serverLogLevel: ngxLogger.NgxLoggerLevel.ERROR })
                    ],
                    providers: [ngxLogger.NGXLogger],
                    exports: [HugAngularLibComponent]
                }]
        }], null, null); })();

    var saveAs;
    var mediasoupClient;
    var requestTimeout, lastN, mobileLastN, videoAspectRatio;
    // {
    // 	requestTimeout = 20000,
    // 	lastN = 4,
    // 	mobileLastN = 1,
    // 	videoAspectRatio = 1.777 // 16 : 9
    // }
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
        function RoomService() {
            // Transport for sending.
            this._sendTransport = null;
            // Transport for receiving.
            this._recvTransport = null;
            this._closed = false;
            this._produce = true;
            this._forceTcp = false;
        }
        RoomService.prototype.init = function (_a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.peerId, peerId = _c === void 0 ? null : _c, _d = _b.device, device = _d === void 0 ? null : _d, _e = _b.produce, produce = _e === void 0 ? true : _e, _f = _b.forceTcp, forceTcp = _f === void 0 ? false : _f, _g = _b.muted, muted = _g === void 0 ? true : _g;
            if (!peerId)
                throw new Error('Missing peerId');
            else if (!device)
                throw new Error('Missing device');
            // logger.debug(
            //   'constructor() [peerId: "%s", device: "%s", produce: "%s", forceTcp: "%s", displayName ""]',
            //   peerId, device.flag, produce, forceTcp);
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
            this._device = device;
            // My peer name.
            this._peerId = peerId;
            // Alert sound
            this._soundAlert = new Audio('/sounds/notify.mp3');
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
            // this._startKeyListener();
            // this._startDevicesListener();
        };
        // close() {
        //   if (this._closed)
        //     return;
        //   this._closed = true;
        //   logger.debug('close()');
        //   this._signalingSocket.close();
        //   // Close mediasoup Transports.
        //   if (this._sendTransport)
        //     this._sendTransport.close();
        //   if (this._recvTransport)
        //     this._recvTransport.close();
        //   store.dispatch(roomActions.setRoomState('closed'));
        //   window.location = `/${this._roomId}`;
        // }
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
        // _startDevicesListener() {
        //   navigator.mediaDevices.addEventListener('devicechange', async () => {
        //     logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');
        //     await this._updateAudioDevices();
        //     await this._updateWebcams();
        //     await this._updateAudioOutputDevices();
        //     store.dispatch(requestActions.notify(
        //       {
        //         text: intl.formatMessage({
        //           id: 'devices.devicesChanged',
        //           defaultMessage: 'Your devices changed, configure your devices in the settings dialog'
        //         })
        //       }));
        //   });
        // }
        // _soundNotification() {
        //   const { notificationSounds } = store.getState().settings;
        //   if (notificationSounds) {
        //     const alertPromise = this._soundAlert.play();
        //     if (alertPromise !== undefined) {
        //       alertPromise
        //         .then()
        //         .catch((error) => {
        //           logger.error('_soundAlert.play() [error:"%o"]', error);
        //         });
        //     }
        //   }
        // }
        // timeoutCallback(callback) {
        //   let called = false;
        //   const interval = setTimeout(
        //     () => {
        //       if (called)
        //         return;
        //       called = true;
        //       callback(new SocketTimeoutError('Request timed out'));
        //     },
        //     requestTimeout
        //   );
        //   return (...args) => {
        //     if (called)
        //       return;
        //     called = true;
        //     clearTimeout(interval);
        //     callback(...args);
        //   };
        // }
        // _sendRequest(method, data) {
        //   return new Promise((resolve, reject) => {
        //     if (!this._signalingSocket) {
        //       reject('No socket connection');
        //     }
        //     else {
        //       this._signalingSocket.emit(
        //         'request',
        //         { method, data },
        //         this.timeoutCallback((err, response) => {
        //           if (err)
        //             reject(err);
        //           else
        //             resolve(response);
        //         })
        //       );
        //     }
        //   });
        // }
        // async getTransportStats() {
        //   try {
        //     if (this._recvTransport) {
        //       logger.debug('getTransportStats() - recv [transportId: "%s"]', this._recvTransport.id);
        //       const recv = await this.sendRequest('getTransportStats', { transportId: this._recvTransport.id });
        //       store.dispatch(
        //         transportActions.addTransportStats(recv, 'recv'));
        //     }
        //     if (this._sendTransport) {
        //       logger.debug('getTransportStats() - send [transportId: "%s"]', this._sendTransport.id);
        //       const send = await this.sendRequest('getTransportStats', { transportId: this._sendTransport.id });
        //       store.dispatch(
        //         transportActions.addTransportStats(send, 'send'));
        //     }
        //   }
        //   catch (error) {
        //     logger.error('getTransportStats() [error:"%o"]', error);
        //   }
        // }
        // async sendRequest(method, data) {
        //   logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);
        //   const {
        //     requestRetries = 3
        //   } = window.config;
        //   for (let tries = 0; tries < requestRetries; tries++) {
        //     try {
        //       return await this._sendRequest(method, data);
        //     }
        //     catch (error) {
        //       if (
        //         error instanceof SocketTimeoutError &&
        //         tries < requestRetries
        //       )
        //         logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
        //       else
        //         throw error;
        //     }
        //   }
        // }
        // async muteMic() {
        //   logger.debug('muteMic()');
        //   this._micProducer.pause();
        //   try {
        //     await this.sendRequest(
        //       'pauseProducer', { producerId: this._micProducer.id });
        //     store.dispatch(
        //       producerActions.setProducerPaused(this._micProducer.id));
        //     store.dispatch(
        //       settingsActions.setAudioMuted(true));
        //   }
        //   catch (error) {
        //     logger.error('muteMic() [error:"%o"]', error);
        //     store.dispatch(requestActions.notify(
        //       {
        //         type: 'error',
        //         text: intl.formatMessage({
        //           id: 'devices.microphoneMuteError',
        //           defaultMessage: 'Unable to mute your microphone'
        //         })
        //       }));
        //   }
        // }
        // async unmuteMic() {
        //   logger.debug('unmuteMic()');
        //   if (!this._micProducer) {
        //     this.updateMic({ start: true });
        //   }
        //   else {
        //     this._micProducer.resume();
        //     try {
        //       await this.sendRequest(
        //         'resumeProducer', { producerId: this._micProducer.id });
        //       store.dispatch(
        //         producerActions.setProducerResumed(this._micProducer.id));
        //       store.dispatch(
        //         settingsActions.setAudioMuted(false));
        //     }
        //     catch (error) {
        //       logger.error('unmuteMic() [error:"%o"]', error);
        //       store.dispatch(requestActions.notify(
        //         {
        //           type: 'error',
        //           text: intl.formatMessage({
        //             id: 'devices.microphoneUnMuteError',
        //             defaultMessage: 'Unable to unmute your microphone'
        //           })
        //         }));
        //     }
        //   }
        // }
        // disconnectLocalHark() {
        //   logger.debug('disconnectLocalHark()');
        //   if (this._harkStream != null) {
        //     let [track] = this._harkStream.getAudioTracks();
        //     track.stop();
        //     track = null;
        //     this._harkStream = null;
        //   }
        //   if (this._hark != null)
        //     this._hark.stop();
        // }
        // connectLocalHark(track) {
        //   logger.debug('connectLocalHark() [track:"%o"]', track);
        //   this._harkStream = new MediaStream();
        //   const newTrack = track.clone();
        //   this._harkStream.addTrack(newTrack);
        //   newTrack.enabled = true;
        //   this._hark = hark(this._harkStream,
        //     {
        //       play: false,
        //       interval: 10,
        //       threshold: store.getState().settings.noiseThreshold,
        //       history: 100
        //     });
        //   this._hark.lastVolume = -100;
        //   this._hark.on('volume_change', (volume) => {
        //     // Update only if there is a bigger diff
        //     if (this._micProducer && Math.abs(volume - this._hark.lastVolume) > 0.5) {
        //       // Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
        //       // This makes decay volume fast if difference to last saved value is big
        //       // and slow for small changes. This prevents flickering volume indicator
        //       // at low levels
        //       if (volume < this._hark.lastVolume) {
        //         volume =
        //           this._hark.lastVolume -
        //           Math.pow(
        //             (volume - this._hark.lastVolume) /
        //             (100 + this._hark.lastVolume)
        //             , 2
        //           ) * 10;
        //       }
        //       this._hark.lastVolume = volume;
        //       store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
        //     }
        //   });
        //   this._hark.on('speaking', () => {
        //     store.dispatch(meActions.setIsSpeaking(true));
        //     if (
        //       (store.getState().settings.voiceActivatedUnmute ||
        //         store.getState().me.isAutoMuted) &&
        //       this._micProducer &&
        //       this._micProducer.paused
        //     )
        //       this._micProducer.resume();
        //     store.dispatch(meActions.setAutoMuted(false)); // sanity action
        //   });
        //   this._hark.on('stopped_speaking', () => {
        //     store.dispatch(meActions.setIsSpeaking(false));
        //     if (
        //       store.getState().settings.voiceActivatedUnmute &&
        //       this._micProducer &&
        //       !this._micProducer.paused
        //     ) {
        //       this._micProducer.pause();
        //       store.dispatch(meActions.setAutoMuted(true));
        //     }
        //   });
        // }
        // async changeAudioOutputDevice(deviceId) {
        //   logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);
        //   store.dispatch(
        //     meActions.setAudioOutputInProgress(true));
        //   try {
        //     const device = this._audioOutputDevices[deviceId];
        //     if (!device)
        //       throw new Error('Selected audio output device no longer available');
        //     store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
        //     await this._updateAudioOutputDevices();
        //   }
        //   catch (error) {
        //     logger.error('changeAudioOutputDevice() [error:"%o"]', error);
        //   }
        //   store.dispatch(
        //     meActions.setAudioOutputInProgress(false));
        // }
        // // Only Firefox supports applyConstraints to audio tracks
        // // See:
        // // https://bugs.chromium.org/p/chromium/issues/detail?id=796964
        // async updateMic({
        //   start = false,
        //   restart = false || this._device.flag !== 'firefox',
        //   newDeviceId = null
        // } = {}) {
        //   logger.debug(
        //     'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
        //     start,
        //     restart,
        //     newDeviceId
        //   );
        //   let track;
        //   try {
        //     if (!this._mediasoupDevice.canProduce('audio'))
        //       throw new Error('cannot produce audio');
        //     if (newDeviceId && !restart)
        //       throw new Error('changing device requires restart');
        //     if (newDeviceId)
        //       store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));
        //     store.dispatch(meActions.setAudioInProgress(true));
        //     const deviceId = await this._getAudioDeviceId();
        //     const device = this._audioDevices[deviceId];
        //     if (!device)
        //       throw new Error('no audio devices');
        //     const {
        //       autoGainControl,
        //       echoCancellation,
        //       noiseSuppression
        //     } = store.getState().settings;
        //     if (!window.config.centralAudioOptions) {
        //       throw new Error(
        //         'Missing centralAudioOptions from app config! (See it in example config.)'
        //       );
        //     }
        //     const {
        //       sampleRate = 96000,
        //       channelCount = 1,
        //       volume = 1.0,
        //       sampleSize = 16,
        //       opusStereo = false,
        //       opusDtx = true,
        //       opusFec = true,
        //       opusPtime = 20,
        //       opusMaxPlaybackRate = 96000
        //     } = window.config.centralAudioOptions;
        //     if (
        //       (restart && this._micProducer) ||
        //       start
        //     ) {
        //       this.disconnectLocalHark();
        //       if (this._micProducer)
        //         await this.disableMic();
        //       const stream = await navigator.mediaDevices.getUserMedia(
        //         {
        //           audio: {
        //             deviceId: { ideal: deviceId },
        //             sampleRate,
        //             channelCount,
        //             volume,
        //             autoGainControl,
        //             echoCancellation,
        //             noiseSuppression,
        //             sampleSize
        //           }
        //         }
        //       );
        //       ([track] = stream.getAudioTracks());
        //       const { deviceId: trackDeviceId } = track.getSettings();
        //       store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));
        //       this._micProducer = await this._sendTransport.produce(
        //         {
        //           track,
        //           codecOptions:
        //           {
        //             opusStereo,
        //             opusDtx,
        //             opusFec,
        //             opusPtime,
        //             opusMaxPlaybackRate
        //           },
        //           appData:
        //             { source: 'mic' }
        //         });
        //       store.dispatch(producerActions.addProducer(
        //         {
        //           id: this._micProducer.id,
        //           source: 'mic',
        //           paused: this._micProducer.paused,
        //           track: this._micProducer.track,
        //           rtpParameters: this._micProducer.rtpParameters,
        //           codec: this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
        //         }));
        //       this._micProducer.on('transportclose', () => {
        //         this._micProducer = null;
        //       });
        //       this._micProducer.on('trackended', () => {
        //         store.dispatch(requestActions.notify(
        //           {
        //             type: 'error',
        //             text: intl.formatMessage({
        //               id: 'devices.microphoneDisconnected',
        //               defaultMessage: 'Microphone disconnected'
        //             })
        //           }));
        //         this.disableMic();
        //       });
        //       this._micProducer.volume = 0;
        //       this.connectLocalHark(track);
        //     }
        //     else if (this._micProducer) {
        //       ({ track } = this._micProducer);
        //       await track.applyConstraints(
        //         {
        //           sampleRate,
        //           channelCount,
        //           volume,
        //           autoGainControl,
        //           echoCancellation,
        //           noiseSuppression,
        //           sampleSize
        //         }
        //       );
        //       if (this._harkStream != null) {
        //         const [harkTrack] = this._harkStream.getAudioTracks();
        //         harkTrack && await harkTrack.applyConstraints(
        //           {
        //             sampleRate,
        //             channelCount,
        //             volume,
        //             autoGainControl,
        //             echoCancellation,
        //             noiseSuppression,
        //             sampleSize
        //           }
        //         );
        //       }
        //     }
        //     await this._updateAudioDevices();
        //   }
        //   catch (error) {
        //     logger.error('updateMic() [error:"%o"]', error);
        //     store.dispatch(requestActions.notify(
        //       {
        //         type: 'error',
        //         text: intl.formatMessage({
        //           id: 'devices.microphoneError',
        //           defaultMessage: 'An error occurred while accessing your microphone'
        //         })
        //       }));
        //     if (track)
        //       track.stop();
        //   }
        //   store.dispatch(meActions.setAudioInProgress(false));
        // }
        // async updateWebcam({
        //   init = false,
        //   start = false,
        //   restart = false,
        //   newDeviceId = null,
        //   newResolution = null,
        //   newFrameRate = null
        // } = {}) {
        //   logger.debug(
        //     'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
        //     start,
        //     restart,
        //     newDeviceId,
        //     newResolution,
        //     newFrameRate
        //   );
        //   let track;
        //   try {
        //     if (!this._mediasoupDevice.canProduce('video'))
        //       throw new Error('cannot produce video');
        //     if (newDeviceId && !restart)
        //       throw new Error('changing device requires restart');
        //     if (newDeviceId)
        //       store.dispatch(settingsActions.setSelectedWebcamDevice(newDeviceId));
        //     if (newResolution)
        //       store.dispatch(settingsActions.setVideoResolution(newResolution));
        //     if (newFrameRate)
        //       store.dispatch(settingsActions.setVideoFrameRate(newFrameRate));
        //     const { videoMuted } = store.getState().settings;
        //     if (init && videoMuted)
        //       return;
        //     else
        //       store.dispatch(settingsActions.setVideoMuted(false));
        //     store.dispatch(meActions.setWebcamInProgress(true));
        //     const deviceId = await this._getWebcamDeviceId();
        //     const device = this._webcams[deviceId];
        //     if (!device)
        //       throw new Error('no webcam devices');
        //     const {
        //       resolution,
        //       frameRate
        //     } = store.getState().settings;
        //     if (
        //       (restart && this._webcamProducer) ||
        //       start
        //     ) {
        //       if (this._webcamProducer)
        //         await this.disableWebcam();
        //       const stream = await navigator.mediaDevices.getUserMedia(
        //         {
        //           video:
        //           {
        //             deviceId: { ideal: deviceId },
        //             ...VIDEO_CONSTRAINS[resolution],
        //             frameRate
        //           }
        //         });
        //       ([track] = stream.getVideoTracks());
        //       const { deviceId: trackDeviceId } = track.getSettings();
        //       store.dispatch(settingsActions.setSelectedWebcamDevice(trackDeviceId));
        //       if (this._useSimulcast) {
        //         // If VP9 is the only available video codec then use SVC.
        //         const firstVideoCodec = this._mediasoupDevice
        //           .rtpCapabilities
        //           .codecs
        //           .find((c) => c.kind === 'video');
        //         let encodings;
        //         if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
        //           encodings = VIDEO_KSVC_ENCODINGS;
        //         else if ('simulcastEncodings' in window.config)
        //           encodings = window.config.simulcastEncodings;
        //         else
        //           encodings = VIDEO_SIMULCAST_ENCODINGS;
        //         this._webcamProducer = await this._sendTransport.produce(
        //           {
        //             track,
        //             encodings,
        //             codecOptions:
        //             {
        //               videoGoogleStartBitrate: 1000
        //             },
        //             appData:
        //             {
        //               source: 'webcam'
        //             }
        //           });
        //       }
        //       else {
        //         this._webcamProducer = await this._sendTransport.produce({
        //           track,
        //           appData:
        //           {
        //             source: 'webcam'
        //           }
        //         });
        //       }
        //       store.dispatch(producerActions.addProducer(
        //         {
        //           id: this._webcamProducer.id,
        //           source: 'webcam',
        //           paused: this._webcamProducer.paused,
        //           track: this._webcamProducer.track,
        //           rtpParameters: this._webcamProducer.rtpParameters,
        //           codec: this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
        //         }));
        //       this._webcamProducer.on('transportclose', () => {
        //         this._webcamProducer = null;
        //       });
        //       this._webcamProducer.on('trackended', () => {
        //         store.dispatch(requestActions.notify(
        //           {
        //             type: 'error',
        //             text: intl.formatMessage({
        //               id: 'devices.cameraDisconnected',
        //               defaultMessage: 'Camera disconnected'
        //             })
        //           }));
        //         this.disableWebcam();
        //       });
        //     }
        //     else if (this._webcamProducer) {
        //       ({ track } = this._webcamProducer);
        //       await track.applyConstraints(
        //         {
        //           ...VIDEO_CONSTRAINS[resolution],
        //           frameRate
        //         }
        //       );
        //       // Also change resolution of extra video producers
        //       for (const producer of this._extraVideoProducers.values()) {
        //         ({ track } = producer);
        //         await track.applyConstraints(
        //           {
        //             ...VIDEO_CONSTRAINS[resolution],
        //             frameRate
        //           }
        //         );
        //       }
        //     }
        //     await this._updateWebcams();
        //   }
        //   catch (error) {
        //     logger.error('updateWebcam() [error:"%o"]', error);
        //     store.dispatch(requestActions.notify(
        //       {
        //         type: 'error',
        //         text: intl.formatMessage({
        //           id: 'devices.cameraError',
        //           defaultMessage: 'An error occurred while accessing your camera'
        //         })
        //       }));
        //     if (track)
        //       track.stop();
        //   }
        //   store.dispatch(
        //     meActions.setWebcamInProgress(false));
        // }
        // async closeMeeting() {
        //   logger.debug('closeMeeting()');
        //   store.dispatch(
        //     roomActions.setCloseMeetingInProgress(true));
        //   try {
        //     await this.sendRequest('moderator:closeMeeting');
        //   }
        //   catch (error) {
        //     logger.error('closeMeeting() [error:"%o"]', error);
        //   }
        //   store.dispatch(
        //     roomActions.setCloseMeetingInProgress(false));
        // }
        // // type: mic/webcam/screen
        // // mute: true/false
        // async modifyPeerConsumer(peerId, type, mute) {
        //   logger.debug(
        //     'modifyPeerConsumer() [peerId:"%s", type:"%s"]',
        //     peerId,
        //     type
        //   );
        //   if (type === 'mic')
        //     store.dispatch(
        //       peerActions.setPeerAudioInProgress(peerId, true));
        //   else if (type === 'webcam')
        //     store.dispatch(
        //       peerActions.setPeerVideoInProgress(peerId, true));
        //   else if (type === 'screen')
        //     store.dispatch(
        //       peerActions.setPeerScreenInProgress(peerId, true));
        //   try {
        //     for (const consumer of this._consumers.values()) {
        //       if (consumer.appData.peerId === peerId && consumer.appData.source === type) {
        //         if (mute)
        //           await this._pauseConsumer(consumer);
        //         else
        //           await this._resumeConsumer(consumer);
        //       }
        //     }
        //   }
        //   catch (error) {
        //     logger.error('modifyPeerConsumer() [error:"%o"]', error);
        //   }
        //   if (type === 'mic')
        //     store.dispatch(
        //       peerActions.setPeerAudioInProgress(peerId, false));
        //   else if (type === 'webcam')
        //     store.dispatch(
        //       peerActions.setPeerVideoInProgress(peerId, false));
        //   else if (type === 'screen')
        //     store.dispatch(
        //       peerActions.setPeerScreenInProgress(peerId, false));
        // }
        // async _pauseConsumer(consumer) {
        //   logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);
        //   if (consumer.paused || consumer.closed)
        //     return;
        //   try {
        //     await this.sendRequest('pauseConsumer', { consumerId: consumer.id });
        //     consumer.pause();
        //     store.dispatch(
        //       consumerActions.setConsumerPaused(consumer.id, 'local'));
        //   }
        //   catch (error) {
        //     logger.error('_pauseConsumer() [error:"%o"]', error);
        //   }
        // }
        // async _resumeConsumer(consumer) {
        //   logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);
        //   if (!consumer.paused || consumer.closed)
        //     return;
        //   try {
        //     await this.sendRequest('resumeConsumer', { consumerId: consumer.id });
        //     consumer.resume();
        //     store.dispatch(
        //       consumerActions.setConsumerResumed(consumer.id, 'local'));
        //   }
        //   catch (error) {
        //     logger.error('_resumeConsumer() [error:"%o"]', error);
        //   }
        // }
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
            var roomId = _a.roomId, joinVideo = _a.joinVideo, joinAudio = _a.joinAudio;
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_b) {
                    this._roomId = roomId;
                    return [2 /*return*/];
                });
            });
        };
        RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(); };
        RoomService.ɵprov = core.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
        return RoomService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(RoomService, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], function () { return []; }, null); })();

    exports.HugAngularLibComponent = HugAngularLibComponent;
    exports.HugAngularLibModule = HugAngularLibModule;
    exports.HugAngularLibService = HugAngularLibService;
    exports.Room2Service = Room2Service;
    exports.RoomService = RoomService;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=hug-angular-lib.umd.js.map

import { __assign, __awaiter, __generator, __read, __values } from "tslib";
import { Stream } from './stream';
import { Injectable } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import bowser from 'bowser';
import * as mediasoupClient from 'mediasoup-client';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "./signaling.service";
import * as i2 from "./log.service";
import * as i3 from "./remote-peers.service";
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
        this.onCamProducing = new Subject();
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
                this.subscriptions.push(this.signalingService.onNewConsumer.pipe(switchMap(function (data) { return __awaiter(_this, void 0, void 0, function () {
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
                this.subscriptions.push(this.signalingService.onNotification.pipe(switchMap(function (notification) { return __awaiter(_this, void 0, void 0, function () {
                    var _a, _b, producerId, score, _c, id, displayName, picture, roles, peerId, consumerId, consumer, peerId, consumerId, consumer, consumerId, consumer, _d, consumerId, spatialLayer, temporalLayer, consumer, _e, consumerId, score, turnServers, error_10;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                this.logger.debug('socket "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
                                _f.label = 1;
                            case 1:
                                _f.trys.push([1, 16, , 17]);
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
                                }
                                return [3 /*break*/, 14];
                            case 2:
                                {
                                    _b = notification.data, producerId = _b.producerId, score = _b.score;
                                    // store.dispatch(
                                    //   producerActions.setProducerScore(producerId, score));
                                    return [3 /*break*/, 15];
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
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 4;
                            case 4:
                                {
                                    peerId = notification.data.peerId;
                                    this.remotePeersService.closePeer(peerId);
                                    // store.dispatch(
                                    //   peerActions.removePeer(peerId));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 5;
                            case 5:
                                {
                                    consumerId = notification.data.consumerId;
                                    consumer = this._consumers.get(consumerId);
                                    if (!consumer)
                                        return [3 /*break*/, 15];
                                    consumer.close();
                                    if (consumer.hark != null)
                                        consumer.hark.stop();
                                    this._consumers.delete(consumerId);
                                    peerId = consumer.appData.peerId;
                                    // store.dispatch(
                                    //   consumerActions.removeConsumer(consumerId, peerId));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 6;
                            case 6:
                                {
                                    consumerId = notification.data.consumerId;
                                    consumer = this._consumers.get(consumerId);
                                    if (!consumer)
                                        return [3 /*break*/, 15];
                                    // store.dispatch(
                                    //   consumerActions.setConsumerPaused(consumerId, 'remote'));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 7;
                            case 7:
                                {
                                    consumerId = notification.data.consumerId;
                                    consumer = this._consumers.get(consumerId);
                                    if (!consumer)
                                        return [3 /*break*/, 15];
                                    // store.dispatch(
                                    //   consumerActions.setConsumerResumed(consumerId, 'remote'));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 8;
                            case 8:
                                {
                                    _d = notification.data, consumerId = _d.consumerId, spatialLayer = _d.spatialLayer, temporalLayer = _d.temporalLayer;
                                    consumer = this._consumers.get(consumerId);
                                    if (!consumer)
                                        return [3 /*break*/, 15];
                                    this.remotePeersService.onConsumerLayerChanged(consumerId);
                                    // store.dispatch(consumerActions.setConsumerCurrentLayers(
                                    //   consumerId, spatialLayer, temporalLayer));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 9;
                            case 9:
                                {
                                    _e = notification.data, consumerId = _e.consumerId, score = _e.score;
                                    // store.dispatch(
                                    //   consumerActions.setConsumerScore(consumerId, score));
                                    return [3 /*break*/, 15];
                                }
                                _f.label = 10;
                            case 10: return [4 /*yield*/, this._joinRoom({ joinVideo: joinVideo, joinAudio: joinAudio })];
                            case 11:
                                _f.sent();
                                return [3 /*break*/, 15];
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
                                return [3 /*break*/, 15];
                            case 14:
                                {
                                    // this.logger.error(
                                    //   'unknown notification.method "%s"', notification.method);
                                }
                                _f.label = 15;
                            case 15: return [3 /*break*/, 17];
                            case 16:
                                error_10 = _f.sent();
                                this.logger.error('error on socket "notification" event [error:"%o"]', error_10);
                                return [3 /*break*/, 17];
                            case 17: return [2 /*return*/];
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
                        this.logger.debug('_joinRoom()');
                        displayName = "Guest " + (Math.floor(Math.random() * (100000 - 10000)) + 10000);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 11, , 12]);
                        this._mediasoupDevice = new mediasoupClient.Device();
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
    RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(i0.ɵɵinject(i1.SignalingService), i0.ɵɵinject(i2.LogService), i0.ɵɵinject(i3.RemotePeersService)); };
    RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
    return RoomService;
}());
export { RoomService };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.SignalingService }, { type: i2.LogService }, { type: i3.RemotePeersService }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7OztBQUcvQixJQUFJLE1BQU0sQ0FBQztBQUdYLElBQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNmLElBQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNyQixJQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUU5QixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdkIsSUFBTyxrQkFBa0IsR0FBSztJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtDQUM3QixDQUFBO0FBR0QsSUFBTSxnQkFBZ0IsR0FDdEI7SUFDQyxLQUFLLEVBQ0w7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxRQUFRLEVBQ1I7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxNQUFNLEVBQ047UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdC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O1lBQ3JELElBQUksR0FBRyxNQUFNLENBQUM7O1lBRWQsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUVuQixPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osRUFBRSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQzNCLFFBQVEsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN2QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtZQUNwQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBRUosQ0FBQzswRUFqckRXLFdBQVc7dURBQVgsV0FBVyxXQUFYLFdBQVcsbUJBRlgsTUFBTTtzQkFuRnBCO0NBdXdEQyxBQXJyREQsSUFxckRDO1NBbHJEYSxXQUFXO2tEQUFYLFdBQVc7Y0FIeEIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgUmVtb3RlUGVlcnNTZXJ2aWNlIH0gZnJvbSAnLi9yZW1vdGUtcGVlcnMuc2VydmljZSc7XG5pbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBTaWduYWxpbmdTZXJ2aWNlIH0gZnJvbSAnLi9zaWduYWxpbmcuc2VydmljZSc7XG5cbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGJvd3NlciBmcm9tICdib3dzZXInO1xuXG5pbXBvcnQgKiBhcyBtZWRpYXNvdXBDbGllbnQgZnJvbSAnbWVkaWFzb3VwLWNsaWVudCdcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcblxuXG5sZXQgc2F2ZUFzO1xuXG5cbmNvbnN0IGxhc3ROID0gNFxuY29uc3QgbW9iaWxlTGFzdE4gPSAxXG5jb25zdCB2aWRlb0FzcGVjdFJhdGlvID0gMS43NzdcblxuY29uc3Qgc2ltdWxjYXN0ID0gdHJ1ZTtcbmNvbnN0IFx0c2ltdWxjYXN0RW5jb2RpbmdzICAgPSBbXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiA0IH0sXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAyIH0sXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxIH1cbl1cblxuXG5jb25zdCBWSURFT19DT05TVFJBSU5TID1cbntcblx0J2xvdycgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzMjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J21lZGl1bScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiA2NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J2hpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTI4MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndmVyeWhpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTkyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndWx0cmEnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzg0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9XG59O1xuXG5jb25zdCBQQ19QUk9QUklFVEFSWV9DT05TVFJBSU5UUyA9XG57XG5cdG9wdGlvbmFsIDogWyB7IGdvb2dEc2NwOiB0cnVlIH0gXVxufTtcblxuY29uc3QgVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiA0LCBtYXhCaXRSYXRlOiAxMDAwMDAgfSxcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEsIG1heEJpdFJhdGU6IDEyMDAwMDAgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IHdlYmNhbSB2aWRlby5cbmNvbnN0IFZJREVPX0tTVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzX0tFWScgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IGRlc2t0b3Agc2hhcmluZy5cbmNvbnN0IFZJREVPX1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDMnLCBkdHg6IHRydWUgfVxuXTtcblxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCAgY2xhc3MgUm9vbVNlcnZpY2Uge1xuXG5cblxuICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gIF9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcbiAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gIF9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgX3Byb2R1Y2UgPSB0cnVlO1xuXG4gIF9mb3JjZVRjcCA9IGZhbHNlO1xuXG4gIF9tdXRlZFxuICBfZGV2aWNlXG4gIF9wZWVySWRcbiAgX3NvdW5kQWxlcnRcbiAgX3Jvb21JZFxuICBfbWVkaWFzb3VwRGV2aWNlXG5cbiAgX21pY1Byb2R1Y2VyXG4gIF9oYXJrXG4gIF9oYXJrU3RyZWFtXG4gIF93ZWJjYW1Qcm9kdWNlclxuICBfZXh0cmFWaWRlb1Byb2R1Y2Vyc1xuICBfd2ViY2Ftc1xuICBfYXVkaW9EZXZpY2VzXG4gIF9hdWRpb091dHB1dERldmljZXNcbiAgX2NvbnN1bWVyc1xuICBfdXNlU2ltdWxjYXN0XG4gIF90dXJuU2VydmVyc1xuXG4gIHN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgcHVibGljIG9uQ2FtUHJvZHVjaW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHNpZ25hbGluZ1NlcnZpY2U6IFNpZ25hbGluZ1NlcnZpY2UsXG4gICAgcHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UsXG4gIHByaXZhdGUgcmVtb3RlUGVlcnNTZXJ2aWNlOiBSZW1vdGVQZWVyc1NlcnZpY2UpIHtcblxuXG4gIH1cblxuICBpbml0KHtcbiAgICBwZWVySWQ9bnVsbCxcblxuICAgIHByb2R1Y2U9dHJ1ZSxcbiAgICBmb3JjZVRjcD1mYWxzZSxcbiAgICBtdXRlZD1mYWxzZVxuICB9ID0ge30pIHtcbiAgICBpZiAoIXBlZXJJZClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBwZWVySWQnKTtcblxuXG4gICAgLy8gbG9nZ2VyLmRlYnVnKFxuICAgIC8vICAgJ2NvbnN0cnVjdG9yKCkgW3BlZXJJZDogXCIlc1wiLCBkZXZpY2U6IFwiJXNcIiwgcHJvZHVjZTogXCIlc1wiLCBmb3JjZVRjcDogXCIlc1wiLCBkaXNwbGF5TmFtZSBcIlwiXScsXG4gICAgLy8gICBwZWVySWQsIGRldmljZS5mbGFnLCBwcm9kdWNlLCBmb3JjZVRjcCk7XG5cblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lOSVQgUm9vbSAnLCBwZWVySWQpXG5cbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICAvLyBXaGV0aGVyIHdlIHNob3VsZCBwcm9kdWNlLlxuICAgIHRoaXMuX3Byb2R1Y2UgPSBwcm9kdWNlO1xuXG4gICAgLy8gV2hldGhlciB3ZSBmb3JjZSBUQ1BcbiAgICB0aGlzLl9mb3JjZVRjcCA9IGZvcmNlVGNwO1xuXG5cblxuXG4gICAgLy8gV2hldGhlciBzaW11bGNhc3Qgc2hvdWxkIGJlIHVzZWQuXG4gICAgLy8gdGhpcy5fdXNlU2ltdWxjYXN0ID0gZmFsc2U7XG5cbiAgICAvLyBpZiAoJ3NpbXVsY2FzdCcgaW4gd2luZG93LmNvbmZpZylcbiAgICAvLyAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHdpbmRvdy5jb25maWcuc2ltdWxjYXN0O1xuXG5cblxuXG5cbiAgICB0aGlzLl9tdXRlZCA9IG11dGVkO1xuXG4gICAgLy8gVGhpcyBkZXZpY2VcbiAgICB0aGlzLl9kZXZpY2UgPSB0aGlzLmRldmljZUluZm8oKTtcblxuICAgIC8vIE15IHBlZXIgbmFtZS5cbiAgICB0aGlzLl9wZWVySWQgPSBwZWVySWQ7XG5cblxuXG4gICAgLy8gQWxlcnQgc291bmRcbiAgICAvLyB0aGlzLl9zb3VuZEFsZXJ0ID0gbmV3IEF1ZGlvKCcvc291bmRzL25vdGlmeS5tcDMnKTtcblxuXG5cblxuICAgIC8vIFRoZSByb29tIElEXG4gICAgdGhpcy5fcm9vbUlkID0gbnVsbDtcblxuICAgIC8vIG1lZGlhc291cC1jbGllbnQgRGV2aWNlIGluc3RhbmNlLlxuICAgIC8vIEB0eXBlIHttZWRpYXNvdXBDbGllbnQuRGV2aWNlfVxuICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG51bGw7XG5cblxuICAgIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgaGFya1xuICAgIHRoaXMuX2hhcmsgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgTWVkaWFTdHJlYW0gZm9yIGhhcmtcbiAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblxuICAgIC8vIExvY2FsIHdlYmNhbSBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gRXh0cmEgdmlkZW9zIGJlaW5nIHByb2R1Y2VkXG4gICAgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2VycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIE1hcCBvZiB3ZWJjYW0gTWVkaWFEZXZpY2VJbmZvcyBpbmRleGVkIGJ5IGRldmljZUlkLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBNZWRpYURldmljZUluZm9zPn1cbiAgICB0aGlzLl93ZWJjYW1zID0ge307XG5cbiAgICB0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG4gICAgLy8gbWVkaWFzb3VwIENvbnN1bWVycy5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgbWVkaWFzb3VwQ2xpZW50LkNvbnN1bWVyPn1cbiAgICB0aGlzLl9jb25zdW1lcnMgPSBuZXcgTWFwKCk7XG5cbiAgICB0aGlzLl91c2VTaW11bGNhc3QgPSBzaW11bGNhc3RcblxuICAgIC8vIHRoaXMuX3N0YXJ0S2V5TGlzdGVuZXIoKTtcblxuICAgIC8vIHRoaXMuX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCk7XG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScsIHRoaXMuX2Nsb3NlZCk7XG5cbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuY2xvc2UoKTtcblxuICAgIC8vIENsb3NlIG1lZGlhc291cCBUcmFuc3BvcnRzLlxuICAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZm9yRWFjaChzdWJzY3JpcHRpb24gPT4ge1xuICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKClcbiAgICB9KVxuXG4gIH1cblxuICAvLyBfc3RhcnRLZXlMaXN0ZW5lcigpIHtcbiAgLy8gICAvLyBBZGQga2V5ZG93biBldmVudCBsaXN0ZW5lciBvbiBkb2N1bWVudFxuICAvLyAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgLy8gICAgIGlmIChldmVudC5yZXBlYXQpIHJldHVybjtcbiAgLy8gICAgIGNvbnN0IGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpO1xuXG4gIC8vICAgICBjb25zdCBzb3VyY2UgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gICAgIGNvbnN0IGV4Y2x1ZGUgPSBbJ2lucHV0JywgJ3RleHRhcmVhJ107XG5cbiAgLy8gICAgIGlmIChleGNsdWRlLmluZGV4T2Yoc291cmNlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkgPT09IC0xKSB7XG4gIC8vICAgICAgIGxvZ2dlci5kZWJ1Zygna2V5RG93bigpIFtrZXk6XCIlc1wiXScsIGtleSk7XG5cbiAgLy8gICAgICAgc3dpdGNoIChrZXkpIHtcblxuICAvLyAgICAgICAgIC8qXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM3KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldFByZXZBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM5KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldE5leHRBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICAgICovXG5cblxuICAvLyAgICAgICAgIGNhc2UgJ00nOiAvLyBUb2dnbGUgbWljcm9waG9uZVxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgICAgICAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCkge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMudW5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VubXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVuYWJsZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFbmFibGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnVic6IC8vIFRvZ2dsZSB2aWRlb1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gIC8vICAgICAgICAgICAgIGVsc2VcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnSCc6IC8vIE9wZW4gaGVscCBkaWFsb2dcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SGVscE9wZW4odHJ1ZSkpO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgZGVmYXVsdDpcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcblxuXG4gIC8vIH1cblxuICBfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkgfCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLm9uZGV2aWNlY2hhbmdlJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuZGV2aWNlc0NoYW5nZWQnLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdZb3VyIGRldmljZXMgY2hhbmdlZCwgY29uZmlndXJlIHlvdXIgZGV2aWNlcyBpbiB0aGUgc2V0dGluZ3MgZGlhbG9nJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9KTtcbiAgfVxuXG5cblxuICBhc3luYyBtdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdtdXRlTWljKCknKTtcblxuICAgIHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAncGF1c2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJQYXVzZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKHRydWUpKTtcblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIG11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1bm11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ3VubXV0ZU1pYygpJyk7XG5cbiAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ3Jlc3VtZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJSZXN1bWVkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1bm11dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlRXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byB1bm11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICBhc3luYyBjaGFuZ2VBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtkZXZpY2VJZDpcIiVzXCJdJywgZGV2aWNlSWQpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RlZCBhdWRpbyBvdXRwdXQgZGV2aWNlIG5vIGxvbmdlciBhdmFpbGFibGUnKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyBPbmx5IEZpcmVmb3ggc3VwcG9ydHMgYXBwbHlDb25zdHJhaW50cyB0byBhdWRpbyB0cmFja3NcbiAgLy8gU2VlOlxuICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD03OTY5NjRcbiAgYXN5bmMgdXBkYXRlTWljKHtcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSB8fCB0aGlzLl9kZXZpY2UuZmxhZyAhPT0gJ2ZpcmVmb3gnLFxuICAgIG5ld0RldmljZUlkID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVNaWMoKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZFxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSBhdWRpbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRBdWRpb0RldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBhdWRpbyBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0IGF1dG9HYWluQ29udHJvbCA9IGZhbHNlO1xuICAgICAgY29uc3QgZWNob0NhbmNlbGxhdGlvbiA9IHRydWVcbiAgICAgIGNvbnN0IG5vaXNlU3VwcHJlc3Npb24gPSB0cnVlXG5cbiAgICAgIC8vIGlmICghd2luZG93LmNvbmZpZy5jZW50cmFsQXVkaW9PcHRpb25zKSB7XG4gICAgICAvLyAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIC8vICAgICAnTWlzc2luZyBjZW50cmFsQXVkaW9PcHRpb25zIGZyb20gYXBwIGNvbmZpZyEgKFNlZSBpdCBpbiBleGFtcGxlIGNvbmZpZy4pJ1xuICAgICAgLy8gICApO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgIHNhbXBsZVJhdGUgPSA5NjAwMCxcbiAgICAgICAgY2hhbm5lbENvdW50ID0gMSxcbiAgICAgICAgdm9sdW1lID0gMS4wLFxuICAgICAgICBzYW1wbGVTaXplID0gMTYsXG4gICAgICAgIG9wdXNTdGVyZW8gPSBmYWxzZSxcbiAgICAgICAgb3B1c0R0eCA9IHRydWUsXG4gICAgICAgIG9wdXNGZWMgPSB0cnVlLFxuICAgICAgICBvcHVzUHRpbWUgPSAyMCxcbiAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZSA9IDk2MDAwXG4gICAgICB9ID0ge307XG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fbWljUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgLy8gdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZU1pYygpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9wdXNTdGVyZW8sXG4gICAgICAgICAgICAgIG9wdXNEdHgsXG4gICAgICAgICAgICAgIG9wdXNGZWMsXG4gICAgICAgICAgICAgIG9wdXNQdGltZSxcbiAgICAgICAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHsgc291cmNlOiAnbWljJyB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl9taWNQcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ21pYycsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl9taWNQcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTWljcm9waG9uZSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVNaWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIudm9sdW1lID0gMDtcblxuICAgICAgICAvLyB0aGlzLmNvbm5lY3RMb2NhbEhhcmsodHJhY2spO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX21pY1Byb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IFtoYXJrVHJhY2tdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG4gICAgICAgICAgaGFya1RyYWNrICYmIGF3YWl0IGhhcmtUcmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlV2ViY2FtKHtcbiAgICBpbml0ID0gZmFsc2UsXG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsLFxuICAgIG5ld1Jlc29sdXRpb24gPSBudWxsLFxuICAgIG5ld0ZyYW1lUmF0ZSA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlV2ViY2FtKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIiwgbmV3UmVzb2x1dGlvbjpcIiVzXCIsIG5ld0ZyYW1lUmF0ZTpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkLFxuICAgICAgbmV3UmVzb2x1dGlvbixcbiAgICAgIG5ld0ZyYW1lUmF0ZVxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSB2aWRlbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gaWYgKG5ld1Jlc29sdXRpb24pXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb1Jlc29sdXRpb24obmV3UmVzb2x1dGlvbikpO1xuXG4gICAgICAvLyBpZiAobmV3RnJhbWVSYXRlKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9GcmFtZVJhdGUobmV3RnJhbWVSYXRlKSk7XG5cbiAgICAgIGNvbnN0ICB2aWRlb011dGVkICA9IGZhbHNlXG5cbiAgICAgIGlmIChpbml0ICYmIHZpZGVvTXV0ZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIC8vIGVsc2VcbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldFdlYmNhbURldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl93ZWJjYW1zW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2ViY2FtIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgIHJlc29sdXRpb24gPSAnbWVkaXVtJ1xuICAgICAgY29uc3QgZnJhbWVSYXRlID0gMTVcblxuXG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fd2ViY2FtUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZpZGVvOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIGlmICh0aGlzLl91c2VTaW11bGNhc3QpIHtcbiAgICAgICAgICAvLyBJZiBWUDkgaXMgdGhlIG9ubHkgYXZhaWxhYmxlIHZpZGVvIGNvZGVjIHRoZW4gdXNlIFNWQy5cbiAgICAgICAgICBjb25zdCBmaXJzdFZpZGVvQ29kZWMgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2VcbiAgICAgICAgICAgIC5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgICAgIC5jb2RlY3NcbiAgICAgICAgICAgIC5maW5kKChjKSA9PiBjLmtpbmQgPT09ICd2aWRlbycpO1xuXG4gICAgICAgICAgbGV0IGVuY29kaW5ncztcblxuICAgICAgICAgIGlmIChmaXJzdFZpZGVvQ29kZWMubWltZVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3ZpZGVvL3ZwOScpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19LU1ZDX0VOQ09ESU5HUztcbiAgICAgICAgICBlbHNlIGlmIChzaW11bGNhc3RFbmNvZGluZ3MpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBzaW11bGNhc3RFbmNvZGluZ3M7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUztcblxuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgICAgZW5jb2RpbmdzLFxuICAgICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2aWRlb0dvb2dsZVN0YXJ0Qml0cmF0ZTogMTAwMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZSh7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICd3ZWJjYW0nLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fd2ViY2FtUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cblxuICAgICAgICBjb25zdCB3ZWJDYW1TdHJlYW0gPSBuZXcgU3RyZWFtKClcbiAgICAgICAgd2ViQ2FtU3RyZWFtLnNldFByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICB0aGlzLm9uQ2FtUHJvZHVjaW5nLm5leHQod2ViQ2FtU3RyZWFtKVxuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0NhbWVyYSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBbHNvIGNoYW5nZSByZXNvbHV0aW9uIG9mIGV4dHJhIHZpZGVvIHByb2R1Y2Vyc1xuICAgICAgICBmb3IgKGNvbnN0IHByb2R1Y2VyIG9mIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAoeyB0cmFjayB9ID0gcHJvZHVjZXIpO1xuXG4gICAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBjYW1lcmEnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBjbG9zZU1lZXRpbmcoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlTWVldGluZygpJyk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnbW9kZXJhdG9yOmNsb3NlTWVldGluZycpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjbG9zZU1lZXRpbmcoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIC8vIHR5cGU6IG1pYy93ZWJjYW0vc2NyZWVuXG4gIC8vIC8vIG11dGU6IHRydWUvZmFsc2VcbiAgYXN5bmMgbW9kaWZ5UGVlckNvbnN1bWVyKHBlZXJJZCwgdHlwZSwgbXV0ZSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ21vZGlmeVBlZXJDb25zdW1lcigpIFtwZWVySWQ6XCIlc1wiLCB0eXBlOlwiJXNcIl0nLFxuICAgICAgcGVlcklkLFxuICAgICAgdHlwZVxuICAgICk7XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGhpcy5fY29uc3VtZXJzLnZhbHVlcygpKSB7XG4gICAgICAgIGlmIChjb25zdW1lci5hcHBEYXRhLnBlZXJJZCA9PT0gcGVlcklkICYmIGNvbnN1bWVyLmFwcERhdGEuc291cmNlID09PSB0eXBlKSB7XG4gICAgICAgICAgaWYgKG11dGUpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9yZXN1bWVDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbW9kaWZ5UGVlckNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIF9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19wYXVzZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3BhdXNlQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5wYXVzZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19wYXVzZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19yZXN1bWVDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKCFjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncmVzdW1lQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5yZXN1bWUoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3Jlc3VtZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gYXN5bmMgc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbc3BhdGlhbExheWVyOlwiJXNcIl0nLCBzcGF0aWFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fd2ViY2FtUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgICBpZiAodGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBzcGF0aWFsTGF5ZXI6XCIlc1wiLCB0ZW1wb3JhbExheWVyOlwiJXNcIl0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KFxuICAvLyAgICAgICAnc2V0Q29uc3VtZXJQcmVmZXJlZExheWVycycsIHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoXG4gIC8vICAgICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHByaW9yaXR5OiVkXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBwcmlvcml0eSk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnc2V0Q29uc3VtZXJQcmlvcml0eScsIHsgY29uc3VtZXJJZCwgcHJpb3JpdHkgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByaW9yaXR5KCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgcmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoY29uc3VtZXJJZCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbY29uc3VtZXJJZDpcIiVzXCJdJywgY29uc3VtZXJJZCk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUnLCB7IGNvbnN1bWVySWQgfSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG5cblxuXG4gIGFzeW5jIGpvaW4oeyByb29tSWQsIGpvaW5WaWRlbywgam9pbkF1ZGlvLCB0b2tlbiB9KSB7XG5cblxuICAgIHRoaXMuX3Jvb21JZCA9IHJvb21JZDtcblxuXG4gICAgLy8gaW5pdGlhbGl6ZSBzaWduYWxpbmcgc29ja2V0XG4gICAgLy8gbGlzdGVuIHRvIHNvY2tldCBldmVudHNcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuaW5pdCh0b2tlbilcbiAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbkRpc2Nvbm5lY3RlZC5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG4gICAgICAvLyB0aGlzLmNsb3NlXG4gICAgfSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uUmVjb25uZWN0aW5nLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcblxuXG5cblxuXHRcdFx0aWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xlYXJQZWVycygpO1xuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGluZycpKTtcbiAgICB9KSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5ld0NvbnN1bWVyLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChkYXRhKSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHBlZXJJZCxcbiAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgaWQsXG4gICAgICAgIGtpbmQsXG4gICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFwcERhdGEsXG4gICAgICAgIHByb2R1Y2VyUGF1c2VkXG4gICAgICB9ID0gZGF0YTtcblxuICAgICAgY29uc3QgY29uc3VtZXIgID0gYXdhaXQgdGhpcy5fcmVjdlRyYW5zcG9ydC5jb25zdW1lKFxuICAgICAgICB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgICBraW5kLFxuICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgYXBwRGF0YSA6IHsgLi4uYXBwRGF0YSwgcGVlcklkIH0gLy8gVHJpY2suXG4gICAgICAgIH0pIGFzIG1lZGlhc291cENsaWVudC50eXBlcy5Db25zdW1lcjtcblxuICAgICAgLy8gU3RvcmUgaW4gdGhlIG1hcC5cbiAgICAgIHRoaXMuX2NvbnN1bWVycy5zZXQoY29uc3VtZXIuaWQsIGNvbnN1bWVyKTtcblxuICAgICAgY29uc3VtZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT5cbiAgICAgIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lci5pZCk7XG4gICAgICB9KTtcblxuXG5cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3Q29uc3VtZXIoY29uc3VtZXIsICBwZWVySWQsIHR5cGUsIHByb2R1Y2VyUGF1c2VkKTtcblxuICAgICAgLy8gV2UgYXJlIHJlYWR5LiBBbnN3ZXIgdGhlIHJlcXVlc3Qgc28gdGhlIHNlcnZlciB3aWxsXG4gICAgICAvLyByZXN1bWUgdGhpcyBDb25zdW1lciAod2hpY2ggd2FzIHBhdXNlZCBmb3Igbm93KS5cblxuXG4gICAgICAvLyBpZiAoa2luZCA9PT0gJ2F1ZGlvJylcbiAgICAgIC8vIHtcbiAgICAgIC8vICAgY29uc3VtZXIudm9sdW1lID0gMDtcblxuICAgICAgLy8gICBjb25zdCBzdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuICAgICAgLy8gICBzdHJlYW0uYWRkVHJhY2soY29uc3VtZXIudHJhY2spO1xuXG4gICAgICAvLyAgIGlmICghc3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF0pXG4gICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXF1ZXN0Lm5ld0NvbnN1bWVyIHwgZ2l2ZW4gc3RyZWFtIGhhcyBubyBhdWRpbyB0cmFjaycpO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsgPSBoYXJrKHN0cmVhbSwgeyBwbGF5OiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICAgICAgLy8ge1xuICAgICAgICAvLyAgIHZvbHVtZSA9IE1hdGgucm91bmQodm9sdW1lKTtcblxuICAgICAgICAvLyAgIGlmIChjb25zdW1lciAmJiB2b2x1bWUgIT09IGNvbnN1bWVyLnZvbHVtZSlcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBjb25zdW1lci52b2x1bWUgPSB2b2x1bWU7XG5cbiAgICAgICAgLy8gICAgIC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUocGVlcklkLCB2b2x1bWUpKTtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH0pO1xuICAgICAgLy8gfVxuXG4gICAgfSkpLnN1YnNjcmliZSgpKVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTm90aWZpY2F0aW9uLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG4gICAgICAgIG5vdGlmaWNhdGlvbi5tZXRob2QsIG5vdGlmaWNhdGlvbi5kYXRhKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoIChub3RpZmljYXRpb24ubWV0aG9kKSB7XG5cblxuXG4gICAgICAgICAgY2FzZSAncHJvZHVjZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcHJvZHVjZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclNjb3JlKHByb2R1Y2VySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICduZXdQZWVyJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyQWN0aW9ucy5hZGRQZWVyKFxuICAgICAgICAgICAgICAvLyAgIHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcywgY29uc3VtZXJzOiBbXSB9KSk7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3UGVlcihpZCk7XG5cbiAgICAgICAgICAgICAgLy8gdGhpcy5fc291bmROb3RpZmljYXRpb24oKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgICAgIC8vICAge1xuICAgICAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgLy8gICAgICAgaWQ6ICdyb29tLm5ld1BlZXInLFxuICAgICAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ3tkaXNwbGF5TmFtZX0gam9pbmVkIHRoZSByb29tJ1xuICAgICAgICAgICAgICAvLyAgICAgfSwge1xuICAgICAgICAgICAgICAvLyAgICAgICBkaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdwZWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsb3NlUGVlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHBlZXJBY3Rpb25zLnJlbW92ZVBlZXIocGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNvbnN1bWVyLmNsb3NlKCk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvbnN1bWVyLmhhcmsgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb25zdW1lci5oYXJrLnN0b3AoKTtcblxuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBjb25zdW1lci5hcHBEYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5yZW1vdmVDb25zdW1lcihjb25zdW1lcklkLCBwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUGF1c2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclJlc3VtZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckxheWVyc0NoYW5nZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm9uQ29uc3VtZXJMYXllckNoYW5nZWQoY29uc3VtZXJJZClcbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyQ3VycmVudExheWVycyhcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJTY29yZShjb25zdW1lcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncm9vbUJhY2snOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY2FzZSAncm9vbVJlYWR5JzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7IHR1cm5TZXJ2ZXJzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAgICAgdGhpcy5fdHVyblNlcnZlcnMgPSB0dXJuU2VydmVycztcblxuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMudG9nZ2xlSm9pbmVkKCkpO1xuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SW5Mb2JieShmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLy8gdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIC8vICAgJ3Vua25vd24gbm90aWZpY2F0aW9uLm1ldGhvZCBcIiVzXCInLCBub3RpZmljYXRpb24ubWV0aG9kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdlcnJvciBvbiBzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnc29ja2V0LnJlcXVlc3RFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRXJyb3Igb24gc2VydmVyIHJlcXVlc3QnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcbiAgICAvLyBvbiByb29tIHJlYWR5IGpvaW4gcm9vbSBfam9pblJvb21cblxuICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAvLyBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgIC8vICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAvLyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgLy8gICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgLy8gYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAvLyBjcmVhdGUgc2VuZCB0cmFuc3BvcnQgY3JlYXRlV2ViUnRjVHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3J0XG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIGNyZWF0ZSByZWNlaXZlIHRyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9yXG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIHNlbmQgam9pbiByZXF1ZXN0XG5cbiAgICAvLyBhZGQgcGVlcnMgdG8gcGVlcnMgc2VydmljZVxuXG4gICAgLy8gcHJvZHVjZSB1cGRhdGVXZWJjYW0gdXBkYXRlTWljXG4gIH1cblxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb0RldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb0RldmljZXModGhpcy5fYXVkaW9EZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVXZWJjYW1zKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl93ZWJjYW1zID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAndmlkZW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2Ftc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldFdlYmNhbURldmljZXModGhpcy5fd2ViY2FtcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVXZWJjYW1zKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgZGlzYWJsZVdlYmNhbSgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZVdlYmNhbSgpJyk7XG5cblx0XHRpZiAoIXRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKHRydWUpKTtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuXHR9XG5cdGFzeW5jIGRpc2FibGVNaWMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVNaWMoKScpO1xuXG5cdFx0aWYgKCF0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cblxuXHRhc3luYyBfZ2V0V2ViY2FtRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuXG5cdFx0XHRjb25zdCAgc2VsZWN0ZWRXZWJjYW0gPSAgbnVsbFxuXG5cdFx0XHRpZiAoc2VsZWN0ZWRXZWJjYW0gJiYgdGhpcy5fd2ViY2Ftc1tzZWxlY3RlZFdlYmNhbV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZFdlYmNhbTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgd2ViY2FtcyA9IE9iamVjdC52YWx1ZXModGhpcy5fd2ViY2Ftcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gd2ViY2Ftc1swXSA/IHdlYmNhbXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cbiAgfVxuXG5cblx0YXN5bmMgX2dldEF1ZGlvRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlQXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuXG4gICAgICBjb25zdCAgc2VsZWN0ZWRBdWRpb0RldmljZSA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxlY3RlZEF1ZGlvRGV2aWNlICYmIHRoaXMuX2F1ZGlvRGV2aWNlc1tzZWxlY3RlZEF1ZGlvRGV2aWNlXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkQXVkaW9EZXZpY2U7XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvRGV2aWNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5fYXVkaW9EZXZpY2VzKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiBhdWRpb0RldmljZXNbMF0gPyBhdWRpb0RldmljZXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRBdWRpb0RldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvb3V0cHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dERldmljZXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cblxuICBhc3luYyBfam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19qb2luUm9vbSgpJyk7XG5cbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGBHdWVzdCAke01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAgLSAxMDAwMCkpICsgMTAwMDB9YFxuXG5cbiAgICB0cnkge1xuXG5cbiAgICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAgIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAgIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAgICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgICAgYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAgIGlmICh0aGlzLl9wcm9kdWNlKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2NyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgICAgcHJvZHVjaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29uc3VtaW5nOiBmYWxzZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IHRoaXMuX21lZGlhc291cERldmljZS5jcmVhdGVTZW5kVHJhbnNwb3J0KFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICAgIGljZVNlcnZlcnM6IHRoaXMuX3R1cm5TZXJ2ZXJzLFxuICAgICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBwcm9wcmlldGFyeUNvbnN0cmFpbnRzOiBQQ19QUk9QUklFVEFSWV9DT05TVFJBSU5UU1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQub24oXG4gICAgICAgICAgJ2Nvbm5lY3QnLCAoeyBkdGxzUGFyYW1ldGVycyB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAgICdjb25uZWN0V2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3NlbmRUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgICAuY2F0Y2goZXJyYmFjayk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQub24oXG4gICAgICAgICAgJ3Byb2R1Y2UnLCBhc3luYyAoeyBraW5kLCBydHBQYXJhbWV0ZXJzLCBhcHBEYXRhIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1zaGFkb3dcbiAgICAgICAgICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAgICAgJ3Byb2R1Y2UnLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3NlbmRUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICAgICAga2luZCxcbiAgICAgICAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgIGFwcERhdGFcbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHsgaWQgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgZXJyYmFjayhlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ2NyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgcHJvZHVjaW5nOiBmYWxzZSxcbiAgICAgICAgICBjb25zdW1pbmc6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgaWQsXG4gICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IHRoaXMuX21lZGlhc291cERldmljZS5jcmVhdGVSZWN2VHJhbnNwb3J0KFxuICAgICAgICB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZVNlcnZlcnM6IHRoaXMuX3R1cm5TZXJ2ZXJzLFxuICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZFxuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5vbihcbiAgICAgICAgJ2Nvbm5lY3QnLCAoeyBkdGxzUGFyYW1ldGVycyB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgIHtcbiAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjb25uZWN0V2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fcmVjdlRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAuY2F0Y2goZXJyYmFjayk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2V0IG91ciBtZWRpYSBjYXBhYmlsaXRpZXMuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0TWVkaWFDYXBhYmlsaXRpZXMoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHRjYW5TZW5kTWljICAgICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpLFxuICAgICAgLy8gXHRcdGNhblNlbmRXZWJjYW0gIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJyksXG4gICAgICAvLyBcdFx0Y2FuU2hhcmVTY3JlZW4gOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSAmJlxuICAgICAgLy8gXHRcdFx0dGhpcy5fc2NyZWVuU2hhcmluZy5pc1NjcmVlblNoYXJlQXZhaWxhYmxlKCksXG4gICAgICAvLyBcdFx0Y2FuU2hhcmVGaWxlcyA6IHRoaXMuX3RvcnJlbnRTdXBwb3J0XG4gICAgICAvLyBcdH0pKTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICByb2xlcyxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHRyYWNrZXIsXG4gICAgICAgIHJvb21QZXJtaXNzaW9ucyxcbiAgICAgICAgdXNlclJvbGVzLFxuICAgICAgICBhbGxvd1doZW5Sb2xlTWlzc2luZyxcbiAgICAgICAgY2hhdEhpc3RvcnksXG4gICAgICAgIGZpbGVIaXN0b3J5LFxuICAgICAgICBsYXN0Tkhpc3RvcnksXG4gICAgICAgIGxvY2tlZCxcbiAgICAgICAgbG9iYnlQZWVycyxcbiAgICAgICAgYWNjZXNzQ29kZVxuICAgICAgfSA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ2pvaW4nLFxuICAgICAgICB7XG4gICAgICAgICAgZGlzcGxheU5hbWU6IGRpc3BsYXlOYW1lLFxuXG4gICAgICAgICAgcnRwQ2FwYWJpbGl0aWVzOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UucnRwQ2FwYWJpbGl0aWVzXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ19qb2luUm9vbSgpIGpvaW5lZCBbYXV0aGVudGljYXRlZDpcIiVzXCIsIHBlZXJzOlwiJW9cIiwgcm9sZXM6XCIlb1wiLCB1c2VyUm9sZXM6XCIlb1wiXScsXG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICByb2xlcyxcbiAgICAgICAgdXNlclJvbGVzXG4gICAgICApO1xuXG5cblxuXG5cbiAgICAgIC8vIGZvciAoY29uc3QgcGVlciBvZiBwZWVycylcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0cGVlckFjdGlvbnMuYWRkUGVlcih7IC4uLnBlZXIsIGNvbnN1bWVyczogW10gfSkpO1xuICAgICAgLy8gfVxuXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdqb2luIGF1ZGlvJyxqb2luQXVkaW8gLCAnY2FuIHByb2R1Y2UgYXVkaW8nLFxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpLCAnIHRoaXMuX211dGVkJywgdGhpcy5fbXV0ZWQpXG4gICAgICAvLyBEb24ndCBwcm9kdWNlIGlmIGV4cGxpY2l0bHkgcmVxdWVzdGVkIHRvIG5vdCB0byBkbyBpdC5cbiAgICAgIGlmICh0aGlzLl9wcm9kdWNlKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luVmlkZW9cbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBpbml0OiB0cnVlLCBzdGFydDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pbkF1ZGlvICYmXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJylcbiAgICAgICAgKVxuICAgICAgICAgIGlmICghdGhpcy5fbXV0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBjb25zdCAgc2VsZWN0ZWRBdWRpb091dHB1dERldmljZSAgPSBudWxsXG5cbiAgICAgIC8vIGlmICghc2VsZWN0ZWRBdWRpb091dHB1dERldmljZSAmJiB0aGlzLl9hdWRpb091dHB1dERldmljZXMgIT09IHt9KVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShcbiAgICAgIC8vIFx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcylbMF1cbiAgICAgIC8vIFx0XHQpXG4gICAgICAvLyBcdCk7XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGVkJykpO1xuXG4gICAgICAvLyAvLyBDbGVhbiBhbGwgdGhlIGV4aXN0aW5nIG5vdGlmaWNhdGlvbnMuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChub3RpZmljYXRpb25BY3Rpb25zLnJlbW92ZUFsbE5vdGlmaWNhdGlvbnMoKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdHRleHQgOiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gXHRcdFx0aWQgICAgICAgICAgICAgOiAncm9vbS5qb2luZWQnLFxuICAgICAgLy8gXHRcdFx0ZGVmYXVsdE1lc3NhZ2UgOiAnWW91IGhhdmUgam9pbmVkIHRoZSByb29tJ1xuICAgICAgLy8gXHRcdH0pXG4gICAgICAvLyBcdH0pKTtcblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuYWRkUGVlcnMocGVlcnMpO1xuXG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX2pvaW5Sb29tKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cblxuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuICBkZXZpY2VJbmZvKCkge1xuICAgIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICBjb25zdCBicm93c2VyID0gYm93c2VyLmdldFBhcnNlcih1YSk7XG5cbiAgICBsZXQgZmxhZztcblxuICAgIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGNocm9tZTogJz49MCcsIGNocm9taXVtOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnY2hyb21lJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGZpcmVmb3g6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdmaXJlZm94JztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IHNhZmFyaTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ3NhZmFyaSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBvcGVyYTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ29wZXJhJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7ICdtaWNyb3NvZnQgZWRnZSc6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdlZGdlJztcbiAgICBlbHNlXG4gICAgICBmbGFnID0gJ3Vua25vd24nO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZsYWcsXG4gICAgICBvczogYnJvd3Nlci5nZXRPU05hbWUodHJ1ZSksIC8vIGlvcywgYW5kcm9pZCwgbGludXguLi5cbiAgICAgIHBsYXRmb3JtOiBicm93c2VyLmdldFBsYXRmb3JtVHlwZSh0cnVlKSwgLy8gbW9iaWxlLCBkZXNrdG9wLCB0YWJsZXRcbiAgICAgIG5hbWU6IGJyb3dzZXIuZ2V0QnJvd3Nlck5hbWUodHJ1ZSksXG4gICAgICB2ZXJzaW9uOiBicm93c2VyLmdldEJyb3dzZXJWZXJzaW9uKCksXG4gICAgICBib3dzZXI6IGJyb3dzZXJcbiAgICB9O1xuXG4gIH1cbn1cbiJdfQ==
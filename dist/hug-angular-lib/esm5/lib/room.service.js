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
                        this.logger.debug('_joinRoom() Device', this._device);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7OztBQUcvQixJQUFJLE1BQU0sQ0FBQztBQUdYLElBQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNmLElBQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNyQixJQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUU5QixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdkIsSUFBTyxrQkFBa0IsR0FBSztJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtDQUM3QixDQUFBO0FBR0QsSUFBTSxnQkFBZ0IsR0FDdEI7SUFDQyxLQUFLLEVBQ0w7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxRQUFRLEVBQ1I7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxNQUFNLEVBQ047UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdC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Z0IsRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUNyRCxJQUFJLEdBQUcsTUFBTSxDQUFDOztZQUVkLElBQUksR0FBRyxTQUFTLENBQUM7UUFFbkIsT0FBTztZQUNMLElBQUksTUFBQTtZQUNKLEVBQUUsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztZQUMzQixRQUFRLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUM7WUFDdkMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ2xDLE9BQU8sRUFBRSxPQUFPLENBQUMsaUJBQWlCLEVBQUU7WUFDcEMsTUFBTSxFQUFFLE9BQU87U0FDaEIsQ0FBQztJQUVKLENBQUM7MEVBanJEVyxXQUFXO3VEQUFYLFdBQVcsV0FBWCxXQUFXLG1CQUZYLE1BQU07c0JBbkZwQjtDQXV3REMsQUFyckRELElBcXJEQztTQWxyRGEsV0FBVztrREFBWCxXQUFXO2NBSHhCLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IFJlbW90ZVBlZXJzU2VydmljZSB9IGZyb20gJy4vcmVtb3RlLXBlZXJzLnNlcnZpY2UnO1xuaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgU2lnbmFsaW5nU2VydmljZSB9IGZyb20gJy4vc2lnbmFsaW5nLnNlcnZpY2UnO1xuXG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IHN3aXRjaE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBib3dzZXIgZnJvbSAnYm93c2VyJztcblxuaW1wb3J0ICogYXMgbWVkaWFzb3VwQ2xpZW50IGZyb20gJ21lZGlhc291cC1jbGllbnQnXG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5cblxubGV0IHNhdmVBcztcblxuXG5jb25zdCBsYXN0TiA9IDRcbmNvbnN0IG1vYmlsZUxhc3ROID0gMVxuY29uc3QgdmlkZW9Bc3BlY3RSYXRpbyA9IDEuNzc3XG5cbmNvbnN0IHNpbXVsY2FzdCA9IHRydWU7XG5jb25zdCBcdHNpbXVsY2FzdEVuY29kaW5ncyAgID0gW1xuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMiB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSB9XG5dXG5cblxuY29uc3QgVklERU9fQ09OU1RSQUlOUyA9XG57XG5cdCdsb3cnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdtZWRpdW0nIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogNjQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdoaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDEyODAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3ZlcnloaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDE5MjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3VsdHJhJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDM4NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fVxufTtcblxuY29uc3QgUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFMgPVxue1xuXHRvcHRpb25hbCA6IFsgeyBnb29nRHNjcDogdHJ1ZSB9IF1cbn07XG5cbmNvbnN0IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCwgbWF4Qml0UmF0ZTogMTAwMDAwIH0sXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxLCBtYXhCaXRSYXRlOiAxMjAwMDAwIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSB3ZWJjYW0gdmlkZW8uXG5jb25zdCBWSURFT19LU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUM19LRVknIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSBkZXNrdG9wIHNoYXJpbmcuXG5jb25zdCBWSURFT19TVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzJywgZHR4OiB0cnVlIH1cbl07XG5cblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgIGNsYXNzIFJvb21TZXJ2aWNlIHtcblxuXG5cbiAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICBfc2VuZFRyYW5zcG9ydCA9IG51bGw7XG4gIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICBfcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIF9wcm9kdWNlID0gdHJ1ZTtcblxuICBfZm9yY2VUY3AgPSBmYWxzZTtcblxuICBfbXV0ZWRcbiAgX2RldmljZVxuICBfcGVlcklkXG4gIF9zb3VuZEFsZXJ0XG4gIF9yb29tSWRcbiAgX21lZGlhc291cERldmljZVxuXG4gIF9taWNQcm9kdWNlclxuICBfaGFya1xuICBfaGFya1N0cmVhbVxuICBfd2ViY2FtUHJvZHVjZXJcbiAgX2V4dHJhVmlkZW9Qcm9kdWNlcnNcbiAgX3dlYmNhbXNcbiAgX2F1ZGlvRGV2aWNlc1xuICBfYXVkaW9PdXRwdXREZXZpY2VzXG4gIF9jb25zdW1lcnNcbiAgX3VzZVNpbXVsY2FzdFxuICBfdHVyblNlcnZlcnNcblxuICBzdWJzY3JpcHRpb25zID0gW107XG4gIHB1YmxpYyBvbkNhbVByb2R1Y2luZzogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBzaWduYWxpbmdTZXJ2aWNlOiBTaWduYWxpbmdTZXJ2aWNlLFxuICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlLFxuICBwcml2YXRlIHJlbW90ZVBlZXJzU2VydmljZTogUmVtb3RlUGVlcnNTZXJ2aWNlKSB7XG5cblxuICB9XG5cbiAgaW5pdCh7XG4gICAgcGVlcklkPW51bGwsXG5cbiAgICBwcm9kdWNlPXRydWUsXG4gICAgZm9yY2VUY3A9ZmFsc2UsXG4gICAgbXV0ZWQ9ZmFsc2VcbiAgfSA9IHt9KSB7XG4gICAgaWYgKCFwZWVySWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGVlcklkJyk7XG5cblxuICAgIC8vIGxvZ2dlci5kZWJ1ZyhcbiAgICAvLyAgICdjb25zdHJ1Y3RvcigpIFtwZWVySWQ6IFwiJXNcIiwgZGV2aWNlOiBcIiVzXCIsIHByb2R1Y2U6IFwiJXNcIiwgZm9yY2VUY3A6IFwiJXNcIiwgZGlzcGxheU5hbWUgXCJcIl0nLFxuICAgIC8vICAgcGVlcklkLCBkZXZpY2UuZmxhZywgcHJvZHVjZSwgZm9yY2VUY3ApO1xuXG5cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJTklUIFJvb20gJywgcGVlcklkKVxuXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgLy8gV2hldGhlciB3ZSBzaG91bGQgcHJvZHVjZS5cbiAgICB0aGlzLl9wcm9kdWNlID0gcHJvZHVjZTtcblxuICAgIC8vIFdoZXRoZXIgd2UgZm9yY2UgVENQXG4gICAgdGhpcy5fZm9yY2VUY3AgPSBmb3JjZVRjcDtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgc2ltdWxjYXN0IHNob3VsZCBiZSB1c2VkLlxuICAgIC8vIHRoaXMuX3VzZVNpbXVsY2FzdCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKCdzaW11bGNhc3QnIGluIHdpbmRvdy5jb25maWcpXG4gICAgLy8gICB0aGlzLl91c2VTaW11bGNhc3QgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdDtcblxuXG5cblxuXG4gICAgdGhpcy5fbXV0ZWQgPSBtdXRlZDtcblxuICAgIC8vIFRoaXMgZGV2aWNlXG4gICAgdGhpcy5fZGV2aWNlID0gdGhpcy5kZXZpY2VJbmZvKCk7XG5cbiAgICAvLyBNeSBwZWVyIG5hbWUuXG4gICAgdGhpcy5fcGVlcklkID0gcGVlcklkO1xuXG5cblxuICAgIC8vIEFsZXJ0IHNvdW5kXG4gICAgLy8gdGhpcy5fc291bmRBbGVydCA9IG5ldyBBdWRpbygnL3NvdW5kcy9ub3RpZnkubXAzJyk7XG5cblxuXG5cbiAgICAvLyBUaGUgcm9vbSBJRFxuICAgIHRoaXMuX3Jvb21JZCA9IG51bGw7XG5cbiAgICAvLyBtZWRpYXNvdXAtY2xpZW50IERldmljZSBpbnN0YW5jZS5cbiAgICAvLyBAdHlwZSB7bWVkaWFzb3VwQ2xpZW50LkRldmljZX1cbiAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBudWxsO1xuXG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIGhhcmtcbiAgICB0aGlzLl9oYXJrID0gbnVsbDtcblxuICAgIC8vIExvY2FsIE1lZGlhU3RyZWFtIGZvciBoYXJrXG4gICAgdGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCB3ZWJjYW0gbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIEV4dHJhIHZpZGVvcyBiZWluZyBwcm9kdWNlZFxuICAgIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBNYXAgb2Ygd2ViY2FtIE1lZGlhRGV2aWNlSW5mb3MgaW5kZXhlZCBieSBkZXZpY2VJZC5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgTWVkaWFEZXZpY2VJbmZvcz59XG4gICAgdGhpcy5fd2ViY2FtcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cbiAgICB0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuICAgIC8vIG1lZGlhc291cCBDb25zdW1lcnMuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIG1lZGlhc291cENsaWVudC5Db25zdW1lcj59XG4gICAgdGhpcy5fY29uc3VtZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gc2ltdWxjYXN0XG5cbiAgICAvLyB0aGlzLl9zdGFydEtleUxpc3RlbmVyKCk7XG5cbiAgICAvLyB0aGlzLl9zdGFydERldmljZXNMaXN0ZW5lcigpO1xuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknLCB0aGlzLl9jbG9zZWQpO1xuXG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmNsb3NlKCk7XG5cbiAgICAvLyBDbG9zZSBtZWRpYXNvdXAgVHJhbnNwb3J0cy5cbiAgICBpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmZvckVhY2goc3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXG4gICAgfSlcblxuICB9XG5cbiAgLy8gX3N0YXJ0S2V5TGlzdGVuZXIoKSB7XG4gIC8vICAgLy8gQWRkIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgb24gZG9jdW1lbnRcbiAgLy8gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gIC8vICAgICBpZiAoZXZlbnQucmVwZWF0KSByZXR1cm47XG4gIC8vICAgICBjb25zdCBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKTtcblxuICAvLyAgICAgY29uc3Qgc291cmNlID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vICAgICBjb25zdCBleGNsdWRlID0gWydpbnB1dCcsICd0ZXh0YXJlYSddO1xuXG4gIC8vICAgICBpZiAoZXhjbHVkZS5pbmRleE9mKHNvdXJjZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2tleURvd24oKSBba2V5OlwiJXNcIl0nLCBrZXkpO1xuXG4gIC8vICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgLy8gICAgICAgICAvKlxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzNyk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXRQcmV2QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzOSk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXROZXh0QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgICAqL1xuXG5cbiAgLy8gICAgICAgICBjYXNlICdNJzogLy8gVG9nZ2xlIG1pY3JvcGhvbmVcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQpIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLnVubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbm11dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFbmFibGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRW5hYmxlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgIH1cblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ1YnOiAvLyBUb2dnbGUgdmlkZW9cbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ0gnOiAvLyBPcGVuIGhlbHAgZGlhbG9nXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEhlbHBPcGVuKHRydWUpKTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGRlZmF1bHQ6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG5cblxuICAvLyB9XG5cbiAgX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlY2hhbmdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgYXN5bmMgbXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ3BhdXNlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUGF1c2VkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZCh0cnVlKSk7XG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdW5tdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdyZXN1bWVQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUmVzdW1lZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgYXN5bmMgY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZGV2aWNlSWQ6XCIlc1wiXScsIGRldmljZUlkKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0ZWQgYXVkaW8gb3V0cHV0IGRldmljZSBubyBsb25nZXIgYXZhaWxhYmxlJyk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gT25seSBGaXJlZm94IHN1cHBvcnRzIGFwcGx5Q29uc3RyYWludHMgdG8gYXVkaW8gdHJhY2tzXG4gIC8vIFNlZTpcbiAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Nzk2OTY0XG4gIGFzeW5jIHVwZGF0ZU1pYyh7XG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UgfHwgdGhpcy5fZGV2aWNlLmZsYWcgIT09ICdmaXJlZm94JyxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlTWljKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWRcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgYXVkaW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0QXVkaW9EZXZpY2VJZCgpO1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gYXVkaW8gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCBhdXRvR2FpbkNvbnRyb2wgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGVjaG9DYW5jZWxsYXRpb24gPSB0cnVlXG4gICAgICBjb25zdCBub2lzZVN1cHByZXNzaW9uID0gdHJ1ZVxuXG4gICAgICAvLyBpZiAoIXdpbmRvdy5jb25maWcuY2VudHJhbEF1ZGlvT3B0aW9ucykge1xuICAgICAgLy8gICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAvLyAgICAgJ01pc3NpbmcgY2VudHJhbEF1ZGlvT3B0aW9ucyBmcm9tIGFwcCBjb25maWchIChTZWUgaXQgaW4gZXhhbXBsZSBjb25maWcuKSdcbiAgICAgIC8vICAgKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICBzYW1wbGVSYXRlID0gOTYwMDAsXG4gICAgICAgIGNoYW5uZWxDb3VudCA9IDEsXG4gICAgICAgIHZvbHVtZSA9IDEuMCxcbiAgICAgICAgc2FtcGxlU2l6ZSA9IDE2LFxuICAgICAgICBvcHVzU3RlcmVvID0gZmFsc2UsXG4gICAgICAgIG9wdXNEdHggPSB0cnVlLFxuICAgICAgICBvcHVzRmVjID0gdHJ1ZSxcbiAgICAgICAgb3B1c1B0aW1lID0gMjAsXG4gICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGUgPSA5NjAwMFxuICAgICAgfSA9IHt9O1xuXG4gICAgICBpZiAoXG4gICAgICAgIChyZXN0YXJ0ICYmIHRoaXMuX21pY1Byb2R1Y2VyKSB8fFxuICAgICAgICBzdGFydFxuICAgICAgKSB7XG4gICAgICAgIC8vIHRoaXMuZGlzY29ubmVjdExvY2FsSGFyaygpO1xuXG4gICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcilcbiAgICAgICAgICBhd2FpdCB0aGlzLmRpc2FibGVNaWMoKTtcblxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdWRpbzoge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkpO1xuXG4gICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvcHVzU3RlcmVvLFxuICAgICAgICAgICAgICBvcHVzRHR4LFxuICAgICAgICAgICAgICBvcHVzRmVjLFxuICAgICAgICAgICAgICBvcHVzUHRpbWUsXG4gICAgICAgICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7IHNvdXJjZTogJ21pYycgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fbWljUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICdtaWMnLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fbWljUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ01pY3JvcGhvbmUgZGlzY29ubmVjdGVkJ1xuICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlTWljKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnZvbHVtZSA9IDA7XG5cbiAgICAgICAgLy8gdGhpcy5jb25uZWN0TG9jYWxIYXJrKHRyYWNrKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl9taWNQcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBbaGFya1RyYWNrXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuICAgICAgICAgIGhhcmtUcmFjayAmJiBhd2FpdCBoYXJrVHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVdlYmNhbSh7XG4gICAgaW5pdCA9IGZhbHNlLFxuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlLFxuICAgIG5ld0RldmljZUlkID0gbnVsbCxcbiAgICBuZXdSZXNvbHV0aW9uID0gbnVsbCxcbiAgICBuZXdGcmFtZVJhdGUgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZVdlYmNhbSgpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCIsIG5ld1Jlc29sdXRpb246XCIlc1wiLCBuZXdGcmFtZVJhdGU6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZCxcbiAgICAgIG5ld1Jlc29sdXRpb24sXG4gICAgICBuZXdGcmFtZVJhdGVcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgdmlkZW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkV2ViY2FtRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIGlmIChuZXdSZXNvbHV0aW9uKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9SZXNvbHV0aW9uKG5ld1Jlc29sdXRpb24pKTtcblxuICAgICAgLy8gaWYgKG5ld0ZyYW1lUmF0ZSlcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvRnJhbWVSYXRlKG5ld0ZyYW1lUmF0ZSkpO1xuXG4gICAgICBjb25zdCAgdmlkZW9NdXRlZCAgPSBmYWxzZVxuXG4gICAgICBpZiAoaW5pdCAmJiB2aWRlb011dGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICAvLyBlbHNlXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRXZWJjYW1EZXZpY2VJZCgpO1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fd2ViY2Ftc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIHdlYmNhbSBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0ICByZXNvbHV0aW9uID0gJ21lZGl1bSdcbiAgICAgIGNvbnN0IGZyYW1lUmF0ZSA9IDE1XG5cblxuXG4gICAgICBpZiAoXG4gICAgICAgIChyZXN0YXJ0ICYmIHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB8fFxuICAgICAgICBzdGFydFxuICAgICAgKSB7XG4gICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgICAgICAgICBhd2FpdCB0aGlzLmRpc2FibGVXZWJjYW0oKTtcblxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2aWRlbzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkpO1xuXG4gICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkV2ViY2FtRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICBpZiAodGhpcy5fdXNlU2ltdWxjYXN0KSB7XG4gICAgICAgICAgLy8gSWYgVlA5IGlzIHRoZSBvbmx5IGF2YWlsYWJsZSB2aWRlbyBjb2RlYyB0aGVuIHVzZSBTVkMuXG4gICAgICAgICAgY29uc3QgZmlyc3RWaWRlb0NvZGVjID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlXG4gICAgICAgICAgICAucnRwQ2FwYWJpbGl0aWVzXG4gICAgICAgICAgICAuY29kZWNzXG4gICAgICAgICAgICAuZmluZCgoYykgPT4gYy5raW5kID09PSAndmlkZW8nKTtcblxuICAgICAgICAgIGxldCBlbmNvZGluZ3M7XG5cbiAgICAgICAgICBpZiAoZmlyc3RWaWRlb0NvZGVjLm1pbWVUeXBlLnRvTG93ZXJDYXNlKCkgPT09ICd2aWRlby92cDknKVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fS1NWQ19FTkNPRElOR1M7XG4gICAgICAgICAgZWxzZSBpZiAoc2ltdWxjYXN0RW5jb2RpbmdzKVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gc2ltdWxjYXN0RW5jb2RpbmdzO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1M7XG5cbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICAgIGVuY29kaW5ncyxcbiAgICAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmlkZW9Hb29nbGVTdGFydEJpdHJhdGU6IDEwMDBcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2Uoe1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnd2ViY2FtJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG5cbiAgICAgICAgY29uc3Qgd2ViQ2FtU3RyZWFtID0gbmV3IFN0cmVhbSgpXG4gICAgICAgIHdlYkNhbVN0cmVhbS5zZXRQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgdGhpcy5vbkNhbVByb2R1Y2luZy5uZXh0KHdlYkNhbVN0cmVhbSlcblxuICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmNhbWVyYURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdDYW1lcmEgZGlzY29ubmVjdGVkJ1xuICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWxzbyBjaGFuZ2UgcmVzb2x1dGlvbiBvZiBleHRyYSB2aWRlbyBwcm9kdWNlcnNcbiAgICAgICAgZm9yIChjb25zdCBwcm9kdWNlciBvZiB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgKHsgdHJhY2sgfSA9IHByb2R1Y2VyKTtcblxuICAgICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVXZWJjYW0oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmNhbWVyYUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgY2FtZXJhJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgY2xvc2VNZWV0aW5nKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZU1lZXRpbmcoKScpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICByb29tQWN0aW9ucy5zZXRDbG9zZU1lZXRpbmdJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ21vZGVyYXRvcjpjbG9zZU1lZXRpbmcnKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2xvc2VNZWV0aW5nKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICByb29tQWN0aW9ucy5zZXRDbG9zZU1lZXRpbmdJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyAvLyB0eXBlOiBtaWMvd2ViY2FtL3NjcmVlblxuICAvLyAvLyBtdXRlOiB0cnVlL2ZhbHNlXG4gIGFzeW5jIG1vZGlmeVBlZXJDb25zdW1lcihwZWVySWQsIHR5cGUsIG11dGUpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbcGVlcklkOlwiJXNcIiwgdHlwZTpcIiVzXCJdJyxcbiAgICAgIHBlZXJJZCxcbiAgICAgIHR5cGVcbiAgICApO1xuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbnN1bWVyIG9mIHRoaXMuX2NvbnN1bWVycy52YWx1ZXMoKSkge1xuICAgICAgICBpZiAoY29uc3VtZXIuYXBwRGF0YS5wZWVySWQgPT09IHBlZXJJZCAmJiBjb25zdW1lci5hcHBEYXRhLnNvdXJjZSA9PT0gdHlwZSkge1xuICAgICAgICAgIGlmIChtdXRlKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcGF1c2VDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ21vZGlmeVBlZXJDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBfcGF1c2VDb25zdW1lcihjb25zdW1lcikge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfcGF1c2VDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKGNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdwYXVzZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAgICAgY29uc3VtZXIucGF1c2UoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcGF1c2VDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIF9yZXN1bWVDb25zdW1lcihjb25zdW1lcikge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfcmVzdW1lQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmICghY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3Jlc3VtZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAgICAgY29uc3VtZXIucmVzdW1lKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19yZXN1bWVDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGFzeW5jIHNldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW3NwYXRpYWxMYXllcjpcIiVzXCJdJywgc3BhdGlhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgICAgaWYgKHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtjb25zdW1lcklkOlwiJXNcIiwgc3BhdGlhbExheWVyOlwiJXNcIiwgdGVtcG9yYWxMYXllcjpcIiVzXCJdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdChcbiAgLy8gICAgICAgJ3NldENvbnN1bWVyUHJlZmVyZWRMYXllcnMnLCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKFxuICAvLyAgICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByaW9yaXR5KCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBwcmlvcml0eTolZF0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgcHJpb3JpdHkpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3NldENvbnN1bWVyUHJpb3JpdHknLCB7IGNvbnN1bWVySWQsIHByaW9yaXR5IH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHJlcXVlc3RDb25zdW1lcktleUZyYW1lKGNvbnN1bWVySWQpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2NvbnN1bWVySWQ6XCIlc1wiXScsIGNvbnN1bWVySWQpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lJywgeyBjb25zdW1lcklkIH0pO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcigncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuXG5cblxuICBhc3luYyBqb2luKHsgcm9vbUlkLCBqb2luVmlkZW8sIGpvaW5BdWRpbywgdG9rZW4gfSkge1xuXG5cbiAgICB0aGlzLl9yb29tSWQgPSByb29tSWQ7XG5cblxuICAgIC8vIGluaXRpYWxpemUgc2lnbmFsaW5nIHNvY2tldFxuICAgIC8vIGxpc3RlbiB0byBzb2NrZXQgZXZlbnRzXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmluaXQodG9rZW4pXG4gICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25EaXNjb25uZWN0ZWQuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuICAgICAgLy8gdGhpcy5jbG9zZVxuICAgIH0pKVxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vblJlY29ubmVjdGluZy5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG5cblxuXG5cblx0XHRcdGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsZWFyUGVlcnMoKTtcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RpbmcnKSk7XG4gICAgfSkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25OZXdDb25zdW1lci5waXBlKHN3aXRjaE1hcChhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwZWVySWQsXG4gICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgIGlkLFxuICAgICAgICBraW5kLFxuICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhcHBEYXRhLFxuICAgICAgICBwcm9kdWNlclBhdXNlZFxuICAgICAgfSA9IGRhdGE7XG5cbiAgICAgIGNvbnN0IGNvbnN1bWVyICA9IGF3YWl0IHRoaXMuX3JlY3ZUcmFuc3BvcnQuY29uc3VtZShcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgIGFwcERhdGEgOiB7IC4uLmFwcERhdGEsIHBlZXJJZCB9IC8vIFRyaWNrLlxuICAgICAgICB9KSBhcyBtZWRpYXNvdXBDbGllbnQudHlwZXMuQ29uc3VtZXI7XG5cbiAgICAgIC8vIFN0b3JlIGluIHRoZSBtYXAuXG4gICAgICB0aGlzLl9jb25zdW1lcnMuc2V0KGNvbnN1bWVyLmlkLCBjb25zdW1lcik7XG5cbiAgICAgIGNvbnN1bWVyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+XG4gICAgICB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXIuaWQpO1xuICAgICAgfSk7XG5cblxuXG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld0NvbnN1bWVyKGNvbnN1bWVyLCAgcGVlcklkLCB0eXBlLCBwcm9kdWNlclBhdXNlZCk7XG5cbiAgICAgIC8vIFdlIGFyZSByZWFkeS4gQW5zd2VyIHRoZSByZXF1ZXN0IHNvIHRoZSBzZXJ2ZXIgd2lsbFxuICAgICAgLy8gcmVzdW1lIHRoaXMgQ29uc3VtZXIgKHdoaWNoIHdhcyBwYXVzZWQgZm9yIG5vdykuXG5cblxuICAgICAgLy8gaWYgKGtpbmQgPT09ICdhdWRpbycpXG4gICAgICAvLyB7XG4gICAgICAvLyAgIGNvbnN1bWVyLnZvbHVtZSA9IDA7XG5cbiAgICAgIC8vICAgY29uc3Qgc3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgIC8vICAgc3RyZWFtLmFkZFRyYWNrKGNvbnN1bWVyLnRyYWNrKTtcblxuICAgICAgLy8gICBpZiAoIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKVxuICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcigncmVxdWVzdC5uZXdDb25zdW1lciB8IGdpdmVuIHN0cmVhbSBoYXMgbm8gYXVkaW8gdHJhY2snKTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrID0gaGFyayhzdHJlYW0sIHsgcGxheTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gICB2b2x1bWUgPSBNYXRoLnJvdW5kKHZvbHVtZSk7XG5cbiAgICAgICAgLy8gICBpZiAoY29uc3VtZXIgJiYgdm9sdW1lICE9PSBjb25zdW1lci52b2x1bWUpXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgY29uc3VtZXIudm9sdW1lID0gdm9sdW1lO1xuXG4gICAgICAgIC8vICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHBlZXJJZCwgdm9sdW1lKSk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAgIC8vIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5vdGlmaWNhdGlvbi5waXBlKHN3aXRjaE1hcChhc3luYyAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobm90aWZpY2F0aW9uLm1ldGhvZCkge1xuXG5cblxuICAgICAgICAgIGNhc2UgJ3Byb2R1Y2VyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHByb2R1Y2VySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJTY29yZShwcm9kdWNlcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnbmV3UGVlcic6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlckFjdGlvbnMuYWRkUGVlcihcbiAgICAgICAgICAgICAgLy8gICB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMsIGNvbnN1bWVyczogW10gfSkpO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld1BlZXIoaWQpO1xuXG4gICAgICAgICAgICAgIC8vIHRoaXMuX3NvdW5kTm90aWZpY2F0aW9uKCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIC8vICAgICAgIGlkOiAncm9vbS5uZXdQZWVyJyxcbiAgICAgICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICd7ZGlzcGxheU5hbWV9IGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgICAgICAgICAgLy8gICAgIH0sIHtcbiAgICAgICAgICAgICAgLy8gICAgICAgZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAncGVlckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbG9zZVBlZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwZWVyQWN0aW9ucy5yZW1vdmVQZWVyKHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjb25zdW1lci5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChjb25zdW1lci5oYXJrICE9IG51bGwpXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaGFyay5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gY29uc3VtZXIuYXBwRGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMucmVtb3ZlQ29uc3VtZXIoY29uc3VtZXJJZCwgcGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclBhdXNlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJSZXN1bWVkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJMYXllcnNDaGFuZ2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5vbkNvbnN1bWVyTGF5ZXJDaGFuZ2VkKGNvbnN1bWVySWQpXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lckN1cnJlbnRMYXllcnMoXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyU2NvcmUoY29uc3VtZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jvb21CYWNrJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgJ3Jvb21SZWFkeSc6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0dXJuU2VydmVycyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3R1cm5TZXJ2ZXJzID0gdHVyblNlcnZlcnM7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnRvZ2dsZUpvaW5lZCgpKTtcbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEluTG9iYnkoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAvLyAgICd1bmtub3duIG5vdGlmaWNhdGlvbi5tZXRob2QgXCIlc1wiJywgbm90aWZpY2F0aW9uLm1ldGhvZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignZXJyb3Igb24gc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ3NvY2tldC5yZXF1ZXN0RXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0Vycm9yIG9uIHNlcnZlciByZXF1ZXN0J1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG4gICAgLy8gb24gcm9vbSByZWFkeSBqb2luIHJvb20gX2pvaW5Sb29tXG5cbiAgICAvLyB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgLy8gY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAvLyAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgLy8gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgIC8vICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgIC8vIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgLy8gY3JlYXRlIHNlbmQgdHJhbnNwb3J0IGNyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9ydFxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBjcmVhdGUgcmVjZWl2ZSB0cmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvclxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBzZW5kIGpvaW4gcmVxdWVzdFxuXG4gICAgLy8gYWRkIHBlZXJzIHRvIHBlZXJzIHNlcnZpY2VcblxuICAgIC8vIHByb2R1Y2UgdXBkYXRlV2ViY2FtIHVwZGF0ZU1pY1xuICB9XG5cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9EZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9EZXZpY2VzKHRoaXMuX2F1ZGlvRGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb0RldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlV2ViY2FtcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fd2ViY2FtcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ3ZpZGVvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRXZWJjYW1EZXZpY2VzKHRoaXMuX3dlYmNhbXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlV2ViY2FtcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGRpc2FibGVXZWJjYW0oKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVXZWJjYW0oKScpO1xuXG5cdFx0aWYgKCF0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcblx0fVxuXHRhc3luYyBkaXNhYmxlTWljKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlTWljKCknKTtcblxuXHRcdGlmICghdGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG5cblx0YXN5bmMgX2dldFdlYmNhbURldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcblxuXHRcdFx0Y29uc3QgIHNlbGVjdGVkV2ViY2FtID0gIG51bGxcblxuXHRcdFx0aWYgKHNlbGVjdGVkV2ViY2FtICYmIHRoaXMuX3dlYmNhbXNbc2VsZWN0ZWRXZWJjYW1dKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRXZWJjYW07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHdlYmNhbXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX3dlYmNhbXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIHdlYmNhbXNbMF0gPyB3ZWJjYW1zWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRBdWRpb0RldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZUF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcblxuICAgICAgY29uc3QgIHNlbGVjdGVkQXVkaW9EZXZpY2UgPSBudWxsO1xuXG5cdFx0XHRpZiAoc2VsZWN0ZWRBdWRpb0RldmljZSAmJiB0aGlzLl9hdWRpb0RldmljZXNbc2VsZWN0ZWRBdWRpb0RldmljZV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZEF1ZGlvRGV2aWNlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdWRpb0RldmljZXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX2F1ZGlvRGV2aWNlcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gYXVkaW9EZXZpY2VzWzBdID8gYXVkaW9EZXZpY2VzWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb091dHB1dERldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb291dHB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXREZXZpY2VzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXG5cbiAgYXN5bmMgX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfam9pblJvb20oKSBEZXZpY2UnLCB0aGlzLl9kZXZpY2UpO1xuXG4gICAgY29uc3QgZGlzcGxheU5hbWUgPSBgR3Vlc3QgJHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAwIC0gMTAwMDApKSArIDEwMDAwfWBcblxuXG4gICAgdHJ5IHtcblxuXG4gICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgICBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgICByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgICAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICAgIHByb2R1Y2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnN1bWluZzogZmFsc2VcbiAgICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlU2VuZFRyYW5zcG9ydChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvcHJpZXRhcnlDb25zdHJhaW50czogUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFNcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdwcm9kdWNlJywgYXN5bmMgKHsga2luZCwgcnRwUGFyYW1ldGVycywgYXBwRGF0YSB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgICdwcm9kdWNlJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBhcHBEYXRhXG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayh7IGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGVycmJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgIHByb2R1Y2luZzogZmFsc2UsXG4gICAgICAgICAgY29uc3VtaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkLFxuICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlUmVjdlRyYW5zcG9ydChcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQub24oXG4gICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICB7XG4gICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBvdXIgbWVkaWEgY2FwYWJpbGl0aWVzLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldE1lZGlhQ2FwYWJpbGl0aWVzKFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0Y2FuU2VuZE1pYyAgICAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TZW5kV2ViY2FtICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlU2NyZWVuIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykgJiZcbiAgICAgIC8vIFx0XHRcdHRoaXMuX3NjcmVlblNoYXJpbmcuaXNTY3JlZW5TaGFyZUF2YWlsYWJsZSgpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlRmlsZXMgOiB0aGlzLl90b3JyZW50U3VwcG9ydFxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICB0cmFja2VyLFxuICAgICAgICByb29tUGVybWlzc2lvbnMsXG4gICAgICAgIHVzZXJSb2xlcyxcbiAgICAgICAgYWxsb3dXaGVuUm9sZU1pc3NpbmcsXG4gICAgICAgIGNoYXRIaXN0b3J5LFxuICAgICAgICBmaWxlSGlzdG9yeSxcbiAgICAgICAgbGFzdE5IaXN0b3J5LFxuICAgICAgICBsb2NrZWQsXG4gICAgICAgIGxvYmJ5UGVlcnMsXG4gICAgICAgIGFjY2Vzc0NvZGVcbiAgICAgIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdqb2luJyxcbiAgICAgICAge1xuICAgICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcblxuICAgICAgICAgIHJ0cENhcGFiaWxpdGllczogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdfam9pblJvb20oKSBqb2luZWQgW2F1dGhlbnRpY2F0ZWQ6XCIlc1wiLCBwZWVyczpcIiVvXCIsIHJvbGVzOlwiJW9cIiwgdXNlclJvbGVzOlwiJW9cIl0nLFxuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHVzZXJSb2xlc1xuICAgICAgKTtcblxuXG5cblxuXG4gICAgICAvLyBmb3IgKGNvbnN0IHBlZXIgb2YgcGVlcnMpXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHBlZXJBY3Rpb25zLmFkZFBlZXIoeyAuLi5wZWVyLCBjb25zdW1lcnM6IFtdIH0pKTtcbiAgICAgIC8vIH1cblxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnam9pbiBhdWRpbycsam9pbkF1ZGlvICwgJ2NhbiBwcm9kdWNlIGF1ZGlvJyxcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSwgJyB0aGlzLl9tdXRlZCcsIHRoaXMuX211dGVkKVxuICAgICAgLy8gRG9uJ3QgcHJvZHVjZSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCB0byBub3QgdG8gZG8gaXQuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pblZpZGVvXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgaW5pdDogdHJ1ZSwgc3RhcnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5BdWRpbyAmJlxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpXG4gICAgICAgIClcbiAgICAgICAgICBpZiAoIXRoaXMuX211dGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gY29uc3QgIHNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgID0gbnVsbFxuXG4gICAgICAvLyBpZiAoIXNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgJiYgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzICE9PSB7fSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0c2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoXG4gICAgICAvLyBcdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpWzBdXG4gICAgICAvLyBcdFx0KVxuICAgICAgLy8gXHQpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblxuICAgICAgLy8gLy8gQ2xlYW4gYWxsIHRoZSBleGlzdGluZyBub3RpZmljYXRpb25zLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobm90aWZpY2F0aW9uQWN0aW9ucy5yZW1vdmVBbGxOb3RpZmljYXRpb25zKCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHR0ZXh0IDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vIFx0XHRcdGlkICAgICAgICAgICAgIDogJ3Jvb20uam9pbmVkJyxcbiAgICAgIC8vIFx0XHRcdGRlZmF1bHRNZXNzYWdlIDogJ1lvdSBoYXZlIGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgIC8vIFx0XHR9KVxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmFkZFBlZXJzKHBlZXJzKTtcblxuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19qb2luUm9vbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbiAgZGV2aWNlSW5mbygpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodWEpO1xuXG4gICAgbGV0IGZsYWc7XG5cbiAgICBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBjaHJvbWU6ICc+PTAnLCBjaHJvbWl1bTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2Nocm9tZSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBmaXJlZm94OiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZmlyZWZveCc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBzYWZhcmk6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdzYWZhcmknO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgb3BlcmE6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdvcGVyYSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyAnbWljcm9zb2Z0IGVkZ2UnOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZWRnZSc7XG4gICAgZWxzZVxuICAgICAgZmxhZyA9ICd1bmtub3duJztcblxuICAgIHJldHVybiB7XG4gICAgICBmbGFnLFxuICAgICAgb3M6IGJyb3dzZXIuZ2V0T1NOYW1lKHRydWUpLCAvLyBpb3MsIGFuZHJvaWQsIGxpbnV4Li4uXG4gICAgICBwbGF0Zm9ybTogYnJvd3Nlci5nZXRQbGF0Zm9ybVR5cGUodHJ1ZSksIC8vIG1vYmlsZSwgZGVza3RvcCwgdGFibGV0XG4gICAgICBuYW1lOiBicm93c2VyLmdldEJyb3dzZXJOYW1lKHRydWUpLFxuICAgICAgdmVyc2lvbjogYnJvd3Nlci5nZXRCcm93c2VyVmVyc2lvbigpLFxuICAgICAgYm93c2VyOiBicm93c2VyXG4gICAgfTtcblxuICB9XG59XG4iXX0=
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
        this.onCamProducing = new Subject();
    }
    RoomService.prototype.init = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.peerId, peerId = _c === void 0 ? null : _c, _d = _b.produce, produce = _d === void 0 ? true : _d, _e = _b.forceTcp, forceTcp = _e === void 0 ? false : _e, _f = _b.muted, muted = _f === void 0 ? false : _f;
        if (!peerId)
            throw new Error('Missing peerId');
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
        var roomId = _a.roomId, joinVideo = _a.joinVideo, joinAudio = _a.joinAudio;
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_b) {
                this._roomId = roomId;
                // initialize signaling socket
                // listen to socket events
                this.signalingService.init(roomId, this._peerId);
                this.signalingService.onDisconnected.subscribe(function () {
                    // close
                    // this.close
                });
                this.signalingService.onReconnecting.subscribe(function () {
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
                });
                this.signalingService.onNewConsumer.pipe(switchMap(function (data) { return __awaiter(_this, void 0, void 0, function () {
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
                }); })).subscribe();
                this.signalingService.onNotification.pipe(switchMap(function (notification) { return __awaiter(_this, void 0, void 0, function () {
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
                }); })).subscribe();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7OztBQUcvQixJQUFJLE1BQU0sQ0FBQztBQUdYLElBQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNmLElBQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNyQixJQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUU5QixJQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdkIsSUFBTyxrQkFBa0IsR0FBSztJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtDQUM3QixDQUFBO0FBR0QsSUFBTSxnQkFBZ0IsR0FDdEI7SUFDQyxLQUFLLEVBQ0w7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxRQUFRLEVBQ1I7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxNQUFNLEVBQ047UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdC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LE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBSZW1vdGVQZWVyc1NlcnZpY2UgfSBmcm9tICcuL3JlbW90ZS1wZWVycy5zZXJ2aWNlJztcbmltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IFNpZ25hbGluZ1NlcnZpY2UgfSBmcm9tICcuL3NpZ25hbGluZy5zZXJ2aWNlJztcblxuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYm93c2VyIGZyb20gJ2Jvd3Nlcic7XG5cbmltcG9ydCAqIGFzIG1lZGlhc291cENsaWVudCBmcm9tICdtZWRpYXNvdXAtY2xpZW50J1xuaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuXG5cbmxldCBzYXZlQXM7XG5cblxuY29uc3QgbGFzdE4gPSA0XG5jb25zdCBtb2JpbGVMYXN0TiA9IDFcbmNvbnN0IHZpZGVvQXNwZWN0UmF0aW8gPSAxLjc3N1xuXG5jb25zdCBzaW11bGNhc3QgPSB0cnVlO1xuY29uc3QgXHRzaW11bGNhc3RFbmNvZGluZ3MgICA9IFtcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDIgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEgfVxuXVxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG4gIF91c2VTaW11bGNhc3RcbiAgX3R1cm5TZXJ2ZXJzXG5cbiAgcHVibGljIG9uQ2FtUHJvZHVjaW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHNpZ25hbGluZ1NlcnZpY2U6IFNpZ25hbGluZ1NlcnZpY2UsXG4gICAgcHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UsXG4gIHByaXZhdGUgcmVtb3RlUGVlcnNTZXJ2aWNlOiBSZW1vdGVQZWVyc1NlcnZpY2UpIHtcblxuXG4gIH1cblxuICBpbml0KHtcbiAgICBwZWVySWQ9bnVsbCxcblxuICAgIHByb2R1Y2U9dHJ1ZSxcbiAgICBmb3JjZVRjcD1mYWxzZSxcbiAgICBtdXRlZD1mYWxzZVxuICB9ID0ge30pIHtcbiAgICBpZiAoIXBlZXJJZClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBwZWVySWQnKTtcblxuXG4gICAgLy8gbG9nZ2VyLmRlYnVnKFxuICAgIC8vICAgJ2NvbnN0cnVjdG9yKCkgW3BlZXJJZDogXCIlc1wiLCBkZXZpY2U6IFwiJXNcIiwgcHJvZHVjZTogXCIlc1wiLCBmb3JjZVRjcDogXCIlc1wiLCBkaXNwbGF5TmFtZSBcIlwiXScsXG4gICAgLy8gICBwZWVySWQsIGRldmljZS5mbGFnLCBwcm9kdWNlLCBmb3JjZVRjcCk7XG5cblxuXG5cbiAgICAvLyBXaGV0aGVyIHdlIHNob3VsZCBwcm9kdWNlLlxuICAgIHRoaXMuX3Byb2R1Y2UgPSBwcm9kdWNlO1xuXG4gICAgLy8gV2hldGhlciB3ZSBmb3JjZSBUQ1BcbiAgICB0aGlzLl9mb3JjZVRjcCA9IGZvcmNlVGNwO1xuXG5cblxuXG4gICAgLy8gV2hldGhlciBzaW11bGNhc3Qgc2hvdWxkIGJlIHVzZWQuXG4gICAgLy8gdGhpcy5fdXNlU2ltdWxjYXN0ID0gZmFsc2U7XG5cbiAgICAvLyBpZiAoJ3NpbXVsY2FzdCcgaW4gd2luZG93LmNvbmZpZylcbiAgICAvLyAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHdpbmRvdy5jb25maWcuc2ltdWxjYXN0O1xuXG5cblxuXG5cbiAgICB0aGlzLl9tdXRlZCA9IG11dGVkO1xuXG4gICAgLy8gVGhpcyBkZXZpY2VcbiAgICB0aGlzLl9kZXZpY2UgPSB0aGlzLmRldmljZUluZm8oKTtcblxuICAgIC8vIE15IHBlZXIgbmFtZS5cbiAgICB0aGlzLl9wZWVySWQgPSBwZWVySWQ7XG5cblxuXG4gICAgLy8gQWxlcnQgc291bmRcbiAgICAvLyB0aGlzLl9zb3VuZEFsZXJ0ID0gbmV3IEF1ZGlvKCcvc291bmRzL25vdGlmeS5tcDMnKTtcblxuXG5cblxuICAgIC8vIFRoZSByb29tIElEXG4gICAgdGhpcy5fcm9vbUlkID0gbnVsbDtcblxuICAgIC8vIG1lZGlhc291cC1jbGllbnQgRGV2aWNlIGluc3RhbmNlLlxuICAgIC8vIEB0eXBlIHttZWRpYXNvdXBDbGllbnQuRGV2aWNlfVxuICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG51bGw7XG5cblxuICAgIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgaGFya1xuICAgIHRoaXMuX2hhcmsgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgTWVkaWFTdHJlYW0gZm9yIGhhcmtcbiAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblxuICAgIC8vIExvY2FsIHdlYmNhbSBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gRXh0cmEgdmlkZW9zIGJlaW5nIHByb2R1Y2VkXG4gICAgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2VycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIE1hcCBvZiB3ZWJjYW0gTWVkaWFEZXZpY2VJbmZvcyBpbmRleGVkIGJ5IGRldmljZUlkLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBNZWRpYURldmljZUluZm9zPn1cbiAgICB0aGlzLl93ZWJjYW1zID0ge307XG5cbiAgICB0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG4gICAgLy8gbWVkaWFzb3VwIENvbnN1bWVycy5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgbWVkaWFzb3VwQ2xpZW50LkNvbnN1bWVyPn1cbiAgICB0aGlzLl9jb25zdW1lcnMgPSBuZXcgTWFwKCk7XG5cbiAgICB0aGlzLl91c2VTaW11bGNhc3QgPSBzaW11bGNhc3RcblxuICAgIC8vIHRoaXMuX3N0YXJ0S2V5TGlzdGVuZXIoKTtcblxuICAgIC8vIHRoaXMuX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCk7XG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuY2xvc2UoKTtcblxuICAgIC8vIENsb3NlIG1lZGlhc291cCBUcmFuc3BvcnRzLlxuICAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cblxuICB9XG5cbiAgLy8gX3N0YXJ0S2V5TGlzdGVuZXIoKSB7XG4gIC8vICAgLy8gQWRkIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgb24gZG9jdW1lbnRcbiAgLy8gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gIC8vICAgICBpZiAoZXZlbnQucmVwZWF0KSByZXR1cm47XG4gIC8vICAgICBjb25zdCBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKTtcblxuICAvLyAgICAgY29uc3Qgc291cmNlID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vICAgICBjb25zdCBleGNsdWRlID0gWydpbnB1dCcsICd0ZXh0YXJlYSddO1xuXG4gIC8vICAgICBpZiAoZXhjbHVkZS5pbmRleE9mKHNvdXJjZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2tleURvd24oKSBba2V5OlwiJXNcIl0nLCBrZXkpO1xuXG4gIC8vICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgLy8gICAgICAgICAvKlxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzNyk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXRQcmV2QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzOSk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXROZXh0QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgICAqL1xuXG5cbiAgLy8gICAgICAgICBjYXNlICdNJzogLy8gVG9nZ2xlIG1pY3JvcGhvbmVcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQpIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLnVubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbm11dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFbmFibGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRW5hYmxlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgIH1cblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ1YnOiAvLyBUb2dnbGUgdmlkZW9cbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ0gnOiAvLyBPcGVuIGhlbHAgZGlhbG9nXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEhlbHBPcGVuKHRydWUpKTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGRlZmF1bHQ6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG5cblxuICAvLyB9XG5cbiAgX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlY2hhbmdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgYXN5bmMgbXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ3BhdXNlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUGF1c2VkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZCh0cnVlKSk7XG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdW5tdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdyZXN1bWVQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUmVzdW1lZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG5cbiAgYXN5bmMgY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZGV2aWNlSWQ6XCIlc1wiXScsIGRldmljZUlkKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0ZWQgYXVkaW8gb3V0cHV0IGRldmljZSBubyBsb25nZXIgYXZhaWxhYmxlJyk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gT25seSBGaXJlZm94IHN1cHBvcnRzIGFwcGx5Q29uc3RyYWludHMgdG8gYXVkaW8gdHJhY2tzXG4gIC8vIFNlZTpcbiAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Nzk2OTY0XG4gIGFzeW5jIHVwZGF0ZU1pYyh7XG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UgfHwgdGhpcy5fZGV2aWNlLmZsYWcgIT09ICdmaXJlZm94JyxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlTWljKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWRcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgYXVkaW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0QXVkaW9EZXZpY2VJZCgpO1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gYXVkaW8gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCBhdXRvR2FpbkNvbnRyb2wgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGVjaG9DYW5jZWxsYXRpb24gPSB0cnVlXG4gICAgICBjb25zdCBub2lzZVN1cHByZXNzaW9uID0gdHJ1ZVxuXG4gICAgICAvLyBpZiAoIXdpbmRvdy5jb25maWcuY2VudHJhbEF1ZGlvT3B0aW9ucykge1xuICAgICAgLy8gICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAvLyAgICAgJ01pc3NpbmcgY2VudHJhbEF1ZGlvT3B0aW9ucyBmcm9tIGFwcCBjb25maWchIChTZWUgaXQgaW4gZXhhbXBsZSBjb25maWcuKSdcbiAgICAgIC8vICAgKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICBzYW1wbGVSYXRlID0gOTYwMDAsXG4gICAgICAgIGNoYW5uZWxDb3VudCA9IDEsXG4gICAgICAgIHZvbHVtZSA9IDEuMCxcbiAgICAgICAgc2FtcGxlU2l6ZSA9IDE2LFxuICAgICAgICBvcHVzU3RlcmVvID0gZmFsc2UsXG4gICAgICAgIG9wdXNEdHggPSB0cnVlLFxuICAgICAgICBvcHVzRmVjID0gdHJ1ZSxcbiAgICAgICAgb3B1c1B0aW1lID0gMjAsXG4gICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGUgPSA5NjAwMFxuICAgICAgfSA9IHt9O1xuXG4gICAgICBpZiAoXG4gICAgICAgIChyZXN0YXJ0ICYmIHRoaXMuX21pY1Byb2R1Y2VyKSB8fFxuICAgICAgICBzdGFydFxuICAgICAgKSB7XG4gICAgICAgIC8vIHRoaXMuZGlzY29ubmVjdExvY2FsSGFyaygpO1xuXG4gICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcilcbiAgICAgICAgICBhd2FpdCB0aGlzLmRpc2FibGVNaWMoKTtcblxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdWRpbzoge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkpO1xuXG4gICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvcHVzU3RlcmVvLFxuICAgICAgICAgICAgICBvcHVzRHR4LFxuICAgICAgICAgICAgICBvcHVzRmVjLFxuICAgICAgICAgICAgICBvcHVzUHRpbWUsXG4gICAgICAgICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7IHNvdXJjZTogJ21pYycgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fbWljUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICdtaWMnLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fbWljUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ01pY3JvcGhvbmUgZGlzY29ubmVjdGVkJ1xuICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlTWljKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnZvbHVtZSA9IDA7XG5cbiAgICAgICAgLy8gdGhpcy5jb25uZWN0TG9jYWxIYXJrKHRyYWNrKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl9taWNQcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBbaGFya1RyYWNrXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuICAgICAgICAgIGhhcmtUcmFjayAmJiBhd2FpdCBoYXJrVHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVdlYmNhbSh7XG4gICAgaW5pdCA9IGZhbHNlLFxuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlLFxuICAgIG5ld0RldmljZUlkID0gbnVsbCxcbiAgICBuZXdSZXNvbHV0aW9uID0gbnVsbCxcbiAgICBuZXdGcmFtZVJhdGUgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZVdlYmNhbSgpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCIsIG5ld1Jlc29sdXRpb246XCIlc1wiLCBuZXdGcmFtZVJhdGU6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZCxcbiAgICAgIG5ld1Jlc29sdXRpb24sXG4gICAgICBuZXdGcmFtZVJhdGVcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgdmlkZW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkV2ViY2FtRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIGlmIChuZXdSZXNvbHV0aW9uKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9SZXNvbHV0aW9uKG5ld1Jlc29sdXRpb24pKTtcblxuICAgICAgLy8gaWYgKG5ld0ZyYW1lUmF0ZSlcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvRnJhbWVSYXRlKG5ld0ZyYW1lUmF0ZSkpO1xuXG4gICAgICBjb25zdCAgdmlkZW9NdXRlZCAgPSBmYWxzZVxuXG4gICAgICBpZiAoaW5pdCAmJiB2aWRlb011dGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICAvLyBlbHNlXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRXZWJjYW1EZXZpY2VJZCgpO1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fd2ViY2Ftc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIHdlYmNhbSBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0ICByZXNvbHV0aW9uID0gJ21lZGl1bSdcbiAgICAgIGNvbnN0IGZyYW1lUmF0ZSA9IDE1XG5cblxuXG4gICAgICBpZiAoXG4gICAgICAgIChyZXN0YXJ0ICYmIHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB8fFxuICAgICAgICBzdGFydFxuICAgICAgKSB7XG4gICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgICAgICAgICBhd2FpdCB0aGlzLmRpc2FibGVXZWJjYW0oKTtcblxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2aWRlbzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldFZpZGVvVHJhY2tzKCkpO1xuXG4gICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkV2ViY2FtRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICBpZiAodGhpcy5fdXNlU2ltdWxjYXN0KSB7XG4gICAgICAgICAgLy8gSWYgVlA5IGlzIHRoZSBvbmx5IGF2YWlsYWJsZSB2aWRlbyBjb2RlYyB0aGVuIHVzZSBTVkMuXG4gICAgICAgICAgY29uc3QgZmlyc3RWaWRlb0NvZGVjID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlXG4gICAgICAgICAgICAucnRwQ2FwYWJpbGl0aWVzXG4gICAgICAgICAgICAuY29kZWNzXG4gICAgICAgICAgICAuZmluZCgoYykgPT4gYy5raW5kID09PSAndmlkZW8nKTtcblxuICAgICAgICAgIGxldCBlbmNvZGluZ3M7XG5cbiAgICAgICAgICBpZiAoZmlyc3RWaWRlb0NvZGVjLm1pbWVUeXBlLnRvTG93ZXJDYXNlKCkgPT09ICd2aWRlby92cDknKVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fS1NWQ19FTkNPRElOR1M7XG4gICAgICAgICAgZWxzZSBpZiAoc2ltdWxjYXN0RW5jb2RpbmdzKVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gc2ltdWxjYXN0RW5jb2RpbmdzO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1M7XG5cbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICAgIGVuY29kaW5ncyxcbiAgICAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdmlkZW9Hb29nbGVTdGFydEJpdHJhdGU6IDEwMDBcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2Uoe1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnd2ViY2FtJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG5cbiAgICAgICAgY29uc3Qgd2ViQ2FtU3RyZWFtID0gbmV3IFN0cmVhbSgpXG4gICAgICAgIHdlYkNhbVN0cmVhbS5zZXRQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgdGhpcy5vbkNhbVByb2R1Y2luZy5uZXh0KHdlYkNhbVN0cmVhbSlcblxuICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmNhbWVyYURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdDYW1lcmEgZGlzY29ubmVjdGVkJ1xuICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWxzbyBjaGFuZ2UgcmVzb2x1dGlvbiBvZiBleHRyYSB2aWRlbyBwcm9kdWNlcnNcbiAgICAgICAgZm9yIChjb25zdCBwcm9kdWNlciBvZiB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzLnZhbHVlcygpKSB7XG4gICAgICAgICAgKHsgdHJhY2sgfSA9IHByb2R1Y2VyKTtcblxuICAgICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gICAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVXZWJjYW0oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmNhbWVyYUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgY2FtZXJhJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgY2xvc2VNZWV0aW5nKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZU1lZXRpbmcoKScpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICByb29tQWN0aW9ucy5zZXRDbG9zZU1lZXRpbmdJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ21vZGVyYXRvcjpjbG9zZU1lZXRpbmcnKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2xvc2VNZWV0aW5nKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICByb29tQWN0aW9ucy5zZXRDbG9zZU1lZXRpbmdJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyAvLyB0eXBlOiBtaWMvd2ViY2FtL3NjcmVlblxuICAvLyAvLyBtdXRlOiB0cnVlL2ZhbHNlXG4gIGFzeW5jIG1vZGlmeVBlZXJDb25zdW1lcihwZWVySWQsIHR5cGUsIG11dGUpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbcGVlcklkOlwiJXNcIiwgdHlwZTpcIiVzXCJdJyxcbiAgICAgIHBlZXJJZCxcbiAgICAgIHR5cGVcbiAgICApO1xuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKGNvbnN0IGNvbnN1bWVyIG9mIHRoaXMuX2NvbnN1bWVycy52YWx1ZXMoKSkge1xuICAgICAgICBpZiAoY29uc3VtZXIuYXBwRGF0YS5wZWVySWQgPT09IHBlZXJJZCAmJiBjb25zdW1lci5hcHBEYXRhLnNvdXJjZSA9PT0gdHlwZSkge1xuICAgICAgICAgIGlmIChtdXRlKVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcGF1c2VDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXdhaXQgdGhpcy5fcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ21vZGlmeVBlZXJDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBfcGF1c2VDb25zdW1lcihjb25zdW1lcikge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfcGF1c2VDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKGNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdwYXVzZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAgICAgY29uc3VtZXIucGF1c2UoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcGF1c2VDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIF9yZXN1bWVDb25zdW1lcihjb25zdW1lcikge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfcmVzdW1lQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmICghY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3Jlc3VtZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAgICAgY29uc3VtZXIucmVzdW1lKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19yZXN1bWVDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGFzeW5jIHNldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW3NwYXRpYWxMYXllcjpcIiVzXCJdJywgc3BhdGlhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgICAgaWYgKHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtjb25zdW1lcklkOlwiJXNcIiwgc3BhdGlhbExheWVyOlwiJXNcIiwgdGVtcG9yYWxMYXllcjpcIiVzXCJdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdChcbiAgLy8gICAgICAgJ3NldENvbnN1bWVyUHJlZmVyZWRMYXllcnMnLCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKFxuICAvLyAgICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByaW9yaXR5KCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBwcmlvcml0eTolZF0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgcHJpb3JpdHkpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3NldENvbnN1bWVyUHJpb3JpdHknLCB7IGNvbnN1bWVySWQsIHByaW9yaXR5IH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHJlcXVlc3RDb25zdW1lcktleUZyYW1lKGNvbnN1bWVySWQpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2NvbnN1bWVySWQ6XCIlc1wiXScsIGNvbnN1bWVySWQpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lJywgeyBjb25zdW1lcklkIH0pO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcigncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuXG5cblxuICBhc3luYyBqb2luKHsgcm9vbUlkLCBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG5cblxuICAgIHRoaXMuX3Jvb21JZCA9IHJvb21JZDtcblxuXG4gICAgLy8gaW5pdGlhbGl6ZSBzaWduYWxpbmcgc29ja2V0XG4gICAgLy8gbGlzdGVuIHRvIHNvY2tldCBldmVudHNcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuaW5pdChyb29tSWQsIHRoaXMuX3BlZXJJZClcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25EaXNjb25uZWN0ZWQuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuICAgICAgLy8gdGhpcy5jbG9zZVxuICAgIH0pXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uUmVjb25uZWN0aW5nLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcblxuXG5cblxuXHRcdFx0aWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xlYXJQZWVycygpO1xuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGluZycpKTtcbiAgICB9KVxuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTmV3Q29uc3VtZXIucGlwZShzd2l0Y2hNYXAoYXN5bmMgKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGVlcklkLFxuICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICBpZCxcbiAgICAgICAga2luZCxcbiAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgYXBwRGF0YSxcbiAgICAgICAgcHJvZHVjZXJQYXVzZWRcbiAgICAgIH0gPSBkYXRhO1xuXG4gICAgICBjb25zdCBjb25zdW1lciAgPSBhd2FpdCB0aGlzLl9yZWN2VHJhbnNwb3J0LmNvbnN1bWUoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICBhcHBEYXRhIDogeyAuLi5hcHBEYXRhLCBwZWVySWQgfSAvLyBUcmljay5cbiAgICAgICAgfSkgYXMgbWVkaWFzb3VwQ2xpZW50LnR5cGVzLkNvbnN1bWVyO1xuXG4gICAgICAvLyBTdG9yZSBpbiB0aGUgbWFwLlxuICAgICAgdGhpcy5fY29uc3VtZXJzLnNldChjb25zdW1lci5pZCwgY29uc3VtZXIpO1xuXG4gICAgICBjb25zdW1lci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PlxuICAgICAge1xuICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVyLmlkKTtcbiAgICAgIH0pO1xuXG5cblxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5uZXdDb25zdW1lcihjb25zdW1lciwgIHBlZXJJZCwgdHlwZSwgcHJvZHVjZXJQYXVzZWQpO1xuXG4gICAgICAvLyBXZSBhcmUgcmVhZHkuIEFuc3dlciB0aGUgcmVxdWVzdCBzbyB0aGUgc2VydmVyIHdpbGxcbiAgICAgIC8vIHJlc3VtZSB0aGlzIENvbnN1bWVyICh3aGljaCB3YXMgcGF1c2VkIGZvciBub3cpLlxuXG5cbiAgICAgIC8vIGlmIChraW5kID09PSAnYXVkaW8nKVxuICAgICAgLy8ge1xuICAgICAgLy8gICBjb25zdW1lci52b2x1bWUgPSAwO1xuXG4gICAgICAvLyAgIGNvbnN0IHN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuXG4gICAgICAvLyAgIHN0cmVhbS5hZGRUcmFjayhjb25zdW1lci50cmFjayk7XG5cbiAgICAgIC8vICAgaWYgKCFzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXSlcbiAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcXVlc3QubmV3Q29uc3VtZXIgfCBnaXZlbiBzdHJlYW0gaGFzIG5vIGF1ZGlvIHRyYWNrJyk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyayA9IGhhcmsoc3RyZWFtLCB7IHBsYXk6IGZhbHNlIH0pO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsub24oJ3ZvbHVtZV9jaGFuZ2UnLCAodm9sdW1lKSA9PlxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgdm9sdW1lID0gTWF0aC5yb3VuZCh2b2x1bWUpO1xuXG4gICAgICAgIC8vICAgaWYgKGNvbnN1bWVyICYmIHZvbHVtZSAhPT0gY29uc3VtZXIudm9sdW1lKVxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGNvbnN1bWVyLnZvbHVtZSA9IHZvbHVtZTtcblxuICAgICAgICAvLyAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZShwZWVySWQsIHZvbHVtZSkpO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfSk7XG4gICAgICAvLyB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKClcblxuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5vdGlmaWNhdGlvbi5waXBlKHN3aXRjaE1hcChhc3luYyAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobm90aWZpY2F0aW9uLm1ldGhvZCkge1xuXG5cblxuICAgICAgICAgIGNhc2UgJ3Byb2R1Y2VyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHByb2R1Y2VySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJTY29yZShwcm9kdWNlcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnbmV3UGVlcic6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlckFjdGlvbnMuYWRkUGVlcihcbiAgICAgICAgICAgICAgLy8gICB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMsIGNvbnN1bWVyczogW10gfSkpO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld1BlZXIoaWQpO1xuXG4gICAgICAgICAgICAgIC8vIHRoaXMuX3NvdW5kTm90aWZpY2F0aW9uKCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIC8vICAgICAgIGlkOiAncm9vbS5uZXdQZWVyJyxcbiAgICAgICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICd7ZGlzcGxheU5hbWV9IGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgICAgICAgICAgLy8gICAgIH0sIHtcbiAgICAgICAgICAgICAgLy8gICAgICAgZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAncGVlckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbG9zZVBlZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwZWVyQWN0aW9ucy5yZW1vdmVQZWVyKHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjb25zdW1lci5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChjb25zdW1lci5oYXJrICE9IG51bGwpXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaGFyay5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gY29uc3VtZXIuYXBwRGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMucmVtb3ZlQ29uc3VtZXIoY29uc3VtZXJJZCwgcGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclBhdXNlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJSZXN1bWVkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJMYXllcnNDaGFuZ2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5vbkNvbnN1bWVyTGF5ZXJDaGFuZ2VkKGNvbnN1bWVySWQpXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lckN1cnJlbnRMYXllcnMoXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyU2NvcmUoY29uc3VtZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jvb21CYWNrJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgJ3Jvb21SZWFkeSc6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0dXJuU2VydmVycyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3R1cm5TZXJ2ZXJzID0gdHVyblNlcnZlcnM7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnRvZ2dsZUpvaW5lZCgpKTtcbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEluTG9iYnkoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAvLyAgICd1bmtub3duIG5vdGlmaWNhdGlvbi5tZXRob2QgXCIlc1wiJywgbm90aWZpY2F0aW9uLm1ldGhvZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignZXJyb3Igb24gc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ3NvY2tldC5yZXF1ZXN0RXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0Vycm9yIG9uIHNlcnZlciByZXF1ZXN0J1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKClcbiAgICAvLyBvbiByb29tIHJlYWR5IGpvaW4gcm9vbSBfam9pblJvb21cblxuICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAvLyBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgIC8vICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAvLyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgLy8gICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgLy8gYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAvLyBjcmVhdGUgc2VuZCB0cmFuc3BvcnQgY3JlYXRlV2ViUnRjVHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3J0XG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIGNyZWF0ZSByZWNlaXZlIHRyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9yXG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIHNlbmQgam9pbiByZXF1ZXN0XG5cbiAgICAvLyBhZGQgcGVlcnMgdG8gcGVlcnMgc2VydmljZVxuXG4gICAgLy8gcHJvZHVjZSB1cGRhdGVXZWJjYW0gdXBkYXRlTWljXG4gIH1cblxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb0RldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb0RldmljZXModGhpcy5fYXVkaW9EZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVXZWJjYW1zKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl93ZWJjYW1zID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAndmlkZW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2Ftc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldFdlYmNhbURldmljZXModGhpcy5fd2ViY2FtcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVXZWJjYW1zKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgZGlzYWJsZVdlYmNhbSgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZVdlYmNhbSgpJyk7XG5cblx0XHRpZiAoIXRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKHRydWUpKTtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuXHR9XG5cdGFzeW5jIGRpc2FibGVNaWMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVNaWMoKScpO1xuXG5cdFx0aWYgKCF0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cblxuXHRhc3luYyBfZ2V0V2ViY2FtRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuXG5cdFx0XHRjb25zdCAgc2VsZWN0ZWRXZWJjYW0gPSAgbnVsbFxuXG5cdFx0XHRpZiAoc2VsZWN0ZWRXZWJjYW0gJiYgdGhpcy5fd2ViY2Ftc1tzZWxlY3RlZFdlYmNhbV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZFdlYmNhbTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgd2ViY2FtcyA9IE9iamVjdC52YWx1ZXModGhpcy5fd2ViY2Ftcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gd2ViY2Ftc1swXSA/IHdlYmNhbXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cbiAgfVxuXG5cblx0YXN5bmMgX2dldEF1ZGlvRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlQXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuXG4gICAgICBjb25zdCAgc2VsZWN0ZWRBdWRpb0RldmljZSA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxlY3RlZEF1ZGlvRGV2aWNlICYmIHRoaXMuX2F1ZGlvRGV2aWNlc1tzZWxlY3RlZEF1ZGlvRGV2aWNlXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkQXVkaW9EZXZpY2U7XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvRGV2aWNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5fYXVkaW9EZXZpY2VzKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiBhdWRpb0RldmljZXNbMF0gPyBhdWRpb0RldmljZXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRBdWRpb0RldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvb3V0cHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dERldmljZXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cblxuICBhc3luYyBfam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19qb2luUm9vbSgpJyk7XG5cbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGBHdWVzdCAke01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAgLSAxMDAwMCkpICsgMTAwMDB9YFxuXG5cbiAgICB0cnkge1xuXG5cbiAgICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAgIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAgIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAgICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgICAgYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAgIGlmICh0aGlzLl9wcm9kdWNlKSB7XG4gICAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2NyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgICAgcHJvZHVjaW5nOiB0cnVlLFxuICAgICAgICAgICAgY29uc3VtaW5nOiBmYWxzZVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IHRoaXMuX21lZGlhc291cERldmljZS5jcmVhdGVTZW5kVHJhbnNwb3J0KFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICAgIGljZVNlcnZlcnM6IHRoaXMuX3R1cm5TZXJ2ZXJzLFxuICAgICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBwcm9wcmlldGFyeUNvbnN0cmFpbnRzOiBQQ19QUk9QUklFVEFSWV9DT05TVFJBSU5UU1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQub24oXG4gICAgICAgICAgJ2Nvbm5lY3QnLCAoeyBkdGxzUGFyYW1ldGVycyB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAgICdjb25uZWN0V2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3NlbmRUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgICAuY2F0Y2goZXJyYmFjayk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQub24oXG4gICAgICAgICAgJ3Byb2R1Y2UnLCBhc3luYyAoeyBraW5kLCBydHBQYXJhbWV0ZXJzLCBhcHBEYXRhIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1zaGFkb3dcbiAgICAgICAgICAgIGNvbnN0IHsgaWQgfSA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAgICAgJ3Byb2R1Y2UnLFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3NlbmRUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICAgICAga2luZCxcbiAgICAgICAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgIGFwcERhdGFcbiAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNhbGxiYWNrKHsgaWQgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgZXJyYmFjayhlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ2NyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgIHtcbiAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgcHJvZHVjaW5nOiBmYWxzZSxcbiAgICAgICAgICBjb25zdW1pbmc6IHRydWVcbiAgICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgaWQsXG4gICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IHRoaXMuX21lZGlhc291cERldmljZS5jcmVhdGVSZWN2VHJhbnNwb3J0KFxuICAgICAgICB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZVNlcnZlcnM6IHRoaXMuX3R1cm5TZXJ2ZXJzLFxuICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZFxuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5vbihcbiAgICAgICAgJ2Nvbm5lY3QnLCAoeyBkdGxzUGFyYW1ldGVycyB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4gLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1zaGFkb3dcbiAgICAgIHtcbiAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjb25uZWN0V2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fcmVjdlRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgICAgfSlcbiAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAuY2F0Y2goZXJyYmFjayk7XG4gICAgICB9KTtcblxuICAgICAgLy8gU2V0IG91ciBtZWRpYSBjYXBhYmlsaXRpZXMuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0TWVkaWFDYXBhYmlsaXRpZXMoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHRjYW5TZW5kTWljICAgICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpLFxuICAgICAgLy8gXHRcdGNhblNlbmRXZWJjYW0gIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJyksXG4gICAgICAvLyBcdFx0Y2FuU2hhcmVTY3JlZW4gOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSAmJlxuICAgICAgLy8gXHRcdFx0dGhpcy5fc2NyZWVuU2hhcmluZy5pc1NjcmVlblNoYXJlQXZhaWxhYmxlKCksXG4gICAgICAvLyBcdFx0Y2FuU2hhcmVGaWxlcyA6IHRoaXMuX3RvcnJlbnRTdXBwb3J0XG4gICAgICAvLyBcdH0pKTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICByb2xlcyxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHRyYWNrZXIsXG4gICAgICAgIHJvb21QZXJtaXNzaW9ucyxcbiAgICAgICAgdXNlclJvbGVzLFxuICAgICAgICBhbGxvd1doZW5Sb2xlTWlzc2luZyxcbiAgICAgICAgY2hhdEhpc3RvcnksXG4gICAgICAgIGZpbGVIaXN0b3J5LFxuICAgICAgICBsYXN0Tkhpc3RvcnksXG4gICAgICAgIGxvY2tlZCxcbiAgICAgICAgbG9iYnlQZWVycyxcbiAgICAgICAgYWNjZXNzQ29kZVxuICAgICAgfSA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ2pvaW4nLFxuICAgICAgICB7XG4gICAgICAgICAgZGlzcGxheU5hbWU6IGRpc3BsYXlOYW1lLFxuXG4gICAgICAgICAgcnRwQ2FwYWJpbGl0aWVzOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UucnRwQ2FwYWJpbGl0aWVzXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ19qb2luUm9vbSgpIGpvaW5lZCBbYXV0aGVudGljYXRlZDpcIiVzXCIsIHBlZXJzOlwiJW9cIiwgcm9sZXM6XCIlb1wiLCB1c2VyUm9sZXM6XCIlb1wiXScsXG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICByb2xlcyxcbiAgICAgICAgdXNlclJvbGVzXG4gICAgICApO1xuXG5cblxuXG5cbiAgICAgIC8vIGZvciAoY29uc3QgcGVlciBvZiBwZWVycylcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0cGVlckFjdGlvbnMuYWRkUGVlcih7IC4uLnBlZXIsIGNvbnN1bWVyczogW10gfSkpO1xuICAgICAgLy8gfVxuXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdqb2luIGF1ZGlvJyxqb2luQXVkaW8gLCAnY2FuIHByb2R1Y2UgYXVkaW8nLFxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpLCAnIHRoaXMuX211dGVkJywgdGhpcy5fbXV0ZWQpXG4gICAgICAvLyBEb24ndCBwcm9kdWNlIGlmIGV4cGxpY2l0bHkgcmVxdWVzdGVkIHRvIG5vdCB0byBkbyBpdC5cbiAgICAgIGlmICh0aGlzLl9wcm9kdWNlKSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luVmlkZW9cbiAgICAgICAgKSB7XG4gICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBpbml0OiB0cnVlLCBzdGFydDogdHJ1ZSB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pbkF1ZGlvICYmXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJylcbiAgICAgICAgKVxuICAgICAgICAgIGlmICghdGhpcy5fbXV0ZWQpIHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBjb25zdCAgc2VsZWN0ZWRBdWRpb091dHB1dERldmljZSAgPSBudWxsXG5cbiAgICAgIC8vIGlmICghc2VsZWN0ZWRBdWRpb091dHB1dERldmljZSAmJiB0aGlzLl9hdWRpb091dHB1dERldmljZXMgIT09IHt9KVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShcbiAgICAgIC8vIFx0XHRcdE9iamVjdC5rZXlzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcylbMF1cbiAgICAgIC8vIFx0XHQpXG4gICAgICAvLyBcdCk7XG4gICAgICAvLyB9XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGVkJykpO1xuXG4gICAgICAvLyAvLyBDbGVhbiBhbGwgdGhlIGV4aXN0aW5nIG5vdGlmaWNhdGlvbnMuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChub3RpZmljYXRpb25BY3Rpb25zLnJlbW92ZUFsbE5vdGlmaWNhdGlvbnMoKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdHRleHQgOiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gXHRcdFx0aWQgICAgICAgICAgICAgOiAncm9vbS5qb2luZWQnLFxuICAgICAgLy8gXHRcdFx0ZGVmYXVsdE1lc3NhZ2UgOiAnWW91IGhhdmUgam9pbmVkIHRoZSByb29tJ1xuICAgICAgLy8gXHRcdH0pXG4gICAgICAvLyBcdH0pKTtcblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuYWRkUGVlcnMocGVlcnMpO1xuXG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX2pvaW5Sb29tKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cblxuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuICBkZXZpY2VJbmZvKCkge1xuICAgIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcbiAgICBjb25zdCBicm93c2VyID0gYm93c2VyLmdldFBhcnNlcih1YSk7XG5cbiAgICBsZXQgZmxhZztcblxuICAgIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGNocm9tZTogJz49MCcsIGNocm9taXVtOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnY2hyb21lJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IGZpcmVmb3g6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdmaXJlZm94JztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IHNhZmFyaTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ3NhZmFyaSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBvcGVyYTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ29wZXJhJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7ICdtaWNyb3NvZnQgZWRnZSc6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdlZGdlJztcbiAgICBlbHNlXG4gICAgICBmbGFnID0gJ3Vua25vd24nO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZsYWcsXG4gICAgICBvczogYnJvd3Nlci5nZXRPU05hbWUodHJ1ZSksIC8vIGlvcywgYW5kcm9pZCwgbGludXguLi5cbiAgICAgIHBsYXRmb3JtOiBicm93c2VyLmdldFBsYXRmb3JtVHlwZSh0cnVlKSwgLy8gbW9iaWxlLCBkZXNrdG9wLCB0YWJsZXRcbiAgICAgIG5hbWU6IGJyb3dzZXIuZ2V0QnJvd3Nlck5hbWUodHJ1ZSksXG4gICAgICB2ZXJzaW9uOiBicm93c2VyLmdldEJyb3dzZXJWZXJzaW9uKCksXG4gICAgICBib3dzZXI6IGJyb3dzZXJcbiAgICB9O1xuXG4gIH1cbn1cbiJdfQ==
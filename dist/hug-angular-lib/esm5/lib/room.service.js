import { __assign, __awaiter, __generator, __read, __values } from "tslib";
import { Stream } from './stream';
import { Injectable } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import bowser from 'bowser';
import * as mediasoupClient from 'mediasoup-client';
import { Subject } from 'rxjs';
import hark from 'hark';
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
        this.onVolumeChange = new Subject();
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
                        this._mediasoupDevice = new mediasoupClient.Device({ handlerName: 'Safari12' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxJQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixJQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsSUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLElBQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELElBQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtRQUM3QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsVUFBVSxFQUNWO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtRQUM3QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsT0FBTyxFQUNQO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtRQUM3QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0NBQ0QsQ0FBQztBQUVGLElBQU0sMEJBQTBCLEdBQ2hDO0lBQ0MsUUFBUSxFQUFHLENBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUU7Q0FDakMsQ0FBQztBQUVGLElBQU0seUJBQXlCLEdBQy9CO0lBQ0MsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRTtJQUNoRCxFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFO0NBQ2pELENBQUM7QUFFRiw2QkFBNkI7QUFDN0IsSUFBTSxvQkFBb0IsR0FDMUI7SUFDQyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUU7Q0FDL0IsQ0FBQztBQUVGLGdDQUFnQztBQUNoQyxJQUFNLG1CQUFtQixHQUN6QjtJQUNDLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO0NBQ3RDLENBQUM7QUFHRjtJQXdDRSxxQkFDVSxnQkFBa0MsRUFDbEMsTUFBa0IsRUFDcEIsa0JBQXNDO1FBRnBDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFDbEMsV0FBTSxHQUFOLE1BQU0sQ0FBWTtRQUNwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBcEM5Qyx5QkFBeUI7UUFDekIsbUJBQWMsR0FBRyxJQUFJLENBQUM7UUFDdEIsMkJBQTJCO1FBQzNCLG1CQUFjLEdBQUcsSUFBSSxDQUFDO1FBRXRCLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFFaEIsYUFBUSxHQUFHLElBQUksQ0FBQztRQUVoQixjQUFTLEdBQUcsS0FBSyxDQUFDO1FBcUJsQixrQkFBYSxHQUFHLEVBQUUsQ0FBQztRQUNaLG1CQUFjLEdBQWlCLElBQUksT0FBTyxFQUFFLENBQUM7UUFDN0MsbUJBQWMsR0FBaUIsSUFBSSxPQUFPLEVBQUUsQ0FBQztJQU9wRCxDQUFDO0lBRUQsMEJBQUksR0FBSixVQUFLLEVBTUM7WUFORCw0QkFNQyxFQUxKLGNBQVcsRUFBWCxrQ0FBVyxFQUVYLGVBQVksRUFBWixtQ0FBWSxFQUNaLGdCQUFjLEVBQWQscUNBQWMsRUFDZCxhQUFXLEVBQVgsa0NBQVc7UUFFWCxJQUFJLENBQUMsTUFBTTtZQUNULE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUdwQyxnQkFBZ0I7UUFDaEIsaUdBQWlHO1FBQ2pHLDZDQUE2QztRQUk3QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDckIsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBRXhCLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUsxQixvQ0FBb0M7UUFDcEMsOEJBQThCO1FBRTlCLG9DQUFvQztRQUNwQyxrREFBa0Q7UUFNbEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFFcEIsY0FBYztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRWpDLGdCQUFnQjtRQUNoQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztRQUl0QixjQUFjO1FBQ2Qsc0RBQXNEO1FBS3RELGNBQWM7UUFDZCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUVwQixvQ0FBb0M7UUFDcEMsaUNBQWlDO1FBQ2pDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7UUFHN0IseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBRTNCLDJCQUEyQjtRQUMzQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUUzQixnQ0FBZ0M7UUFDaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFFekIsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBRWxCLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztRQUV4QixtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFFNUIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBRXRDLHNEQUFzRDtRQUN0RCx3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFFbkIsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFFeEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztRQUU5Qix1QkFBdUI7UUFDdkIsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQTtRQUU5Qiw0QkFBNEI7UUFFNUIsZ0NBQWdDO0lBRWxDLENBQUM7SUFDRCwyQkFBSyxHQUFMO1FBQ0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUUzQyxJQUFJLElBQUksQ0FBQyxPQUFPO1lBQ2QsT0FBTztRQUVULElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBRXBCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRTdCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5Qiw4QkFBOEI7UUFDOUIsSUFBSSxJQUFJLENBQUMsY0FBYztZQUNyQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRTlCLElBQUksSUFBSSxDQUFDLGNBQWM7WUFDckIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUU5QixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxVQUFBLFlBQVk7WUFDckMsWUFBWSxDQUFDLFdBQVcsRUFBRSxDQUFBO1FBQzVCLENBQUMsQ0FBQyxDQUFBO0lBRUosQ0FBQztJQUVELHdCQUF3QjtJQUN4Qiw4Q0FBOEM7SUFDOUMsc0RBQXNEO0lBQ3RELGdDQUFnQztJQUNoQyxvREFBb0Q7SUFFcEQsbUNBQW1DO0lBRW5DLDZDQUE2QztJQUU3QyxrRUFBa0U7SUFDbEUsbURBQW1EO0lBRW5ELHVCQUF1QjtJQUV2QixhQUFhO0lBQ2Isd0NBQXdDO0lBQ3hDLFlBQVk7SUFDWixrRUFBa0U7SUFDbEUscURBQXFEO0lBRXJELDREQUE0RDtJQUM1RCxtQkFBbUI7SUFDbkIsWUFBWTtJQUVaLHdDQUF3QztJQUN4QyxZQUFZO0lBQ1osa0VBQWtFO0lBQ2xFLHFEQUFxRDtJQUVyRCw0REFBNEQ7SUFDNUQsbUJBQW1CO0lBQ25CLFlBQVk7SUFDWixhQUFhO0lBR2IseUNBQXlDO0lBQ3pDLGNBQWM7SUFDZCx1Q0FBdUM7SUFDdkMsaURBQWlEO0lBQ2pELGtDQUFrQztJQUVsQyx3REFBd0Q7SUFDeEQsc0JBQXNCO0lBQ3RCLGlEQUFpRDtJQUNqRCxzREFBc0Q7SUFDdEQsZ0VBQWdFO0lBQ2hFLHlCQUF5QjtJQUN6Qix5QkFBeUI7SUFDekIsa0JBQWtCO0lBQ2xCLHVCQUF1QjtJQUN2QixvQ0FBb0M7SUFFcEMsd0RBQXdEO0lBQ3hELHNCQUFzQjtJQUN0QixpREFBaUQ7SUFDakQsd0RBQXdEO0lBQ3hELGtFQUFrRTtJQUNsRSx5QkFBeUI7SUFDekIseUJBQXlCO0lBQ3pCLGtCQUFrQjtJQUNsQixnQkFBZ0I7SUFDaEIscUJBQXFCO0lBQ3JCLGlEQUFpRDtJQUVqRCxzREFBc0Q7SUFDdEQsb0JBQW9CO0lBQ3BCLCtDQUErQztJQUMvQyxzREFBc0Q7SUFDdEQsZ0VBQWdFO0lBQ2hFLHVCQUF1QjtJQUN2Qix1QkFBdUI7SUFDdkIsZ0JBQWdCO0lBRWhCLHFCQUFxQjtJQUNyQixjQUFjO0lBRWQsb0NBQW9DO0lBQ3BDLGNBQWM7SUFDZCx3Q0FBd0M7SUFDeEMsc0NBQXNDO0lBQ3RDLG1CQUFtQjtJQUNuQixvREFBb0Q7SUFFcEQscUJBQXFCO0lBQ3JCLGNBQWM7SUFFZCx3Q0FBd0M7SUFDeEMsY0FBYztJQUNkLDZEQUE2RDtJQUU3RCxxQkFBcUI7SUFDckIsY0FBYztJQUVkLG1CQUFtQjtJQUNuQixjQUFjO0lBQ2QscUJBQXFCO0lBQ3JCLGNBQWM7SUFDZCxVQUFVO0lBQ1YsUUFBUTtJQUNSLFFBQVE7SUFHUixJQUFJO0lBRUosMkNBQXFCLEdBQXJCO1FBQUEsaUJBZ0JDO1FBZkMsU0FBUyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLEVBQUU7Ozs7d0JBQ3RELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlFQUFpRSxDQUFDLENBQUM7d0JBRXJGLHFCQUFNLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFBOzt3QkFBaEMsU0FBZ0MsQ0FBQzt3QkFDakMscUJBQU0sSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFBOzt3QkFBM0IsU0FBMkIsQ0FBQzt3QkFDNUIscUJBQU0sSUFBSSxDQUFDLHlCQUF5QixFQUFFLEVBQUE7O3dCQUF0QyxTQUFzQyxDQUFDOzs7O2FBU3hDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFJSyw2QkFBTyxHQUFiOzs7Ozs7d0JBQ0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7d0JBRS9CLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Ozs7d0JBR3hCLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQ3JDLGVBQWUsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUE7O3dCQUR4RCxTQUN3RCxDQUFDOzs7O3dCQVV6RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxPQUFLLENBQUMsQ0FBQzs7Ozs7O0tBV3REO0lBRUssK0JBQVMsR0FBZjs7Ozs7O3dCQUNFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDOzZCQUU3QixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQWxCLHdCQUFrQjt3QkFDcEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDOzs7d0JBR2hDLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLENBQUM7Ozs7d0JBR3pCLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQ3JDLGdCQUFnQixFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBQTs7d0JBRHpELFNBQ3lELENBQUM7Ozs7d0JBVTFELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLE9BQUssQ0FBQyxDQUFDOzs7Ozs7S0FZMUQ7SUFDRix5Q0FBbUIsR0FBbkI7UUFFQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBRTNDLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQzVCO1lBQ0ssSUFBQSxpREFBNkMsRUFBM0MsYUFBMkMsQ0FBQztZQUVsRCxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDYixLQUFLLEdBQUcsSUFBSSxDQUFDO1lBRWIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7U0FDeEI7UUFFRCxJQUFJLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSTtZQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCxzQ0FBZ0IsR0FBaEIsVUFBaUIsS0FBSztRQUF0QixpQkFnRkM7UUE5RUEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFNUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBRXJDLElBQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUUvQixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVwQyxRQUFRLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUV4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUNqQztZQUNDLElBQUksRUFBUSxLQUFLO1lBQ2pCLFFBQVEsRUFBSSxFQUFFO1lBQ2QsU0FBUyxFQUFHLENBQUMsRUFBRTtZQUNmLE9BQU8sRUFBSyxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFFN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsZUFBZSxFQUFFLFVBQUMsTUFBTTtZQUVsQyx3Q0FBd0M7WUFDM0MsSUFBSSxLQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxFQUN2RTtnQkFDSyx1RUFBdUU7Z0JBQzNFLHdFQUF3RTtnQkFDeEUsd0VBQXdFO2dCQUN4RSxnQkFBZ0I7Z0JBQ2hCLElBQUksTUFBTSxHQUFHLEtBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUNsQztvQkFDTSxNQUFNO3dCQUNOLEtBQUksQ0FBQyxLQUFLLENBQUMsVUFBVTs0QkFDckIsSUFBSSxDQUFDLEdBQUcsQ0FDTixDQUFDLE1BQU0sR0FBRyxLQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztnQ0FDaEMsQ0FBQyxHQUFHLEdBQUcsS0FBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFDM0IsQ0FBQyxDQUNSLEdBQUcsRUFBRSxDQUFDO2lCQUNGO2dCQUVELEtBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQztnQkFDakMscUNBQXFDO2dCQUVyQyx3REFBd0Q7Z0JBQzVELHlFQUF5RTthQUN6RTtRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLElBQUk7UUFDSixrREFBa0Q7UUFFbEQsUUFBUTtRQUNSLHVEQUF1RDtRQUN2RCx3Q0FBd0M7UUFDeEMseUJBQXlCO1FBQ3pCLDZCQUE2QjtRQUM3QixLQUFLO1FBQ0wsZ0NBQWdDO1FBRWhDLG1FQUFtRTtRQUNuRSxNQUFNO1FBRU4sMENBQTBDO1FBQzFDLElBQUk7UUFDSixtREFBbUQ7UUFFbkQsUUFBUTtRQUNSLHNEQUFzRDtRQUN0RCx5QkFBeUI7UUFDekIsOEJBQThCO1FBQzlCLEtBQUs7UUFDTCxLQUFLO1FBQ0wsK0JBQStCO1FBRS9CLGtEQUFrRDtRQUNsRCxLQUFLO1FBQ0wsTUFBTTtJQUNQLENBQUM7SUFFTSw2Q0FBdUIsR0FBN0IsVUFBOEIsUUFBUTs7Ozs7O3dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxRQUFRLENBQUMsQ0FBQzs7Ozt3QkFNakUsTUFBTSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQzt3QkFFbEQsSUFBSSxDQUFDLE1BQU07NEJBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsQ0FBQyxDQUFDO3dCQUV0RSwwRUFBMEU7d0JBRTFFLHFCQUFNLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFBOzt3QkFGdEMsMEVBQTBFO3dCQUUxRSxTQUFzQyxDQUFDOzs7O3dCQUd2QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRSxPQUFLLENBQUMsQ0FBQzs7Ozs7O0tBS3RFO0lBRUQseURBQXlEO0lBQ3pELE9BQU87SUFDUCwrREFBK0Q7SUFDekQsK0JBQVMsR0FBZixVQUFnQixFQUlWO1lBSlUsNEJBSVYsRUFISixhQUFhLEVBQWIsa0NBQWEsRUFDYixlQUFrRCxFQUFsRCx1RUFBa0QsRUFDbEQsbUJBQWtCLEVBQWxCLHVDQUFrQjs7Ozs7Ozs7d0JBRWxCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUNmLDBEQUEwRCxFQUMxRCxLQUFLLEVBQ0wsT0FBTyxFQUNQLFdBQVcsQ0FDWixDQUFDOzs7O3dCQUtBLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQzs0QkFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO3dCQUUxQyxJQUFJLFdBQVcsSUFBSSxDQUFDLE9BQU87NEJBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQzt3QkFPckMscUJBQU0sSUFBSSxDQUFDLGlCQUFpQixFQUFFLEVBQUE7O3dCQUF6QyxRQUFRLEdBQUcsU0FBOEI7d0JBQ3pDLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUU1QyxJQUFJLENBQUMsTUFBTTs0QkFDVCxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7d0JBRWhDLGVBQWUsR0FBRyxLQUFLLENBQUM7d0JBQ3hCLGdCQUFnQixHQUFHLElBQUksQ0FBQTt3QkFDdkIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO3dCQVF2QixLQVVGLEVBQUUsRUFUSixrQkFBa0IsRUFBbEIsVUFBVSxtQkFBRyxLQUFLLEtBQUEsRUFDbEIsb0JBQWdCLEVBQWhCLFlBQVksbUJBQUcsQ0FBQyxLQUFBLEVBQ2hCLGNBQVksRUFBWixNQUFNLG1CQUFHLEdBQUcsS0FBQSxFQUNaLGtCQUFlLEVBQWYsVUFBVSxtQkFBRyxFQUFFLEtBQUEsRUFDZixrQkFBa0IsRUFBbEIsVUFBVSxtQkFBRyxLQUFLLEtBQUEsRUFDbEIsZUFBYyxFQUFkLE9BQU8sbUJBQUcsSUFBSSxLQUFBLEVBQ2QsZUFBYyxFQUFkLE9BQU8sbUJBQUcsSUFBSSxLQUFBLEVBQ2QsaUJBQWMsRUFBZCxTQUFTLG1CQUFHLEVBQUUsS0FBQSxFQUNkLDJCQUEyQixFQUEzQixtQkFBbUIsbUJBQUcsS0FBSyxLQUFBLENBQ3RCOzZCQUdMLENBQUEsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQzs0QkFDOUIsS0FBSyxDQUFBLEVBREwsd0JBQ0s7NkJBSUQsSUFBSSxDQUFDLFlBQVksRUFBakIsd0JBQWlCO3dCQUNuQixxQkFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUE7O3dCQUF2QixTQUF1QixDQUFDOzs0QkFFWCxxQkFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FDdEQ7NEJBQ0UsS0FBSyxFQUFFO2dDQUNMLFFBQVEsRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUU7Z0NBQzdCLFVBQVUsWUFBQTtnQ0FDVixZQUFZLGNBQUE7Z0NBQ1osYUFBYTtnQ0FDYixNQUFNLFFBQUE7Z0NBQ04sZUFBZSxpQkFBQTtnQ0FDZixnQkFBZ0Isa0JBQUE7Z0NBQ2hCLGdCQUFnQixrQkFBQTtnQ0FDaEIsVUFBVSxZQUFBOzZCQUNYO3lCQUNGLENBQ0YsRUFBQTs7d0JBZEssTUFBTSxHQUFHLFNBY2Q7d0JBRUQsQ0FBQyx1Q0FBaUMsRUFBaEMsYUFBSyxDQUE0QixDQUFDO3dCQUVsQixhQUFhLEdBQUssS0FBSyxDQUFDLFdBQVcsRUFBRSxTQUF4QixDQUF5Qjt3QkFFeEQseUVBQXlFO3dCQUV6RSxLQUFBLElBQUksQ0FBQTt3QkFBZ0IscUJBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQ25EO2dDQUNFLEtBQUssT0FBQTtnQ0FDTCxZQUFZLEVBQ1o7b0NBQ0UsVUFBVSxZQUFBO29DQUNWLE9BQU8sU0FBQTtvQ0FDUCxPQUFPLFNBQUE7b0NBQ1AsU0FBUyxXQUFBO29DQUNULG1CQUFtQixxQkFBQTtpQ0FDcEI7Z0NBQ0QsT0FBTyxFQUNMLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTs2QkFDcEIsQ0FBQyxFQUFBOzt3QkFmSix5RUFBeUU7d0JBRXpFLEdBQUssWUFBWSxHQUFHLFNBYWhCLENBQUM7d0JBRUwsOENBQThDO3dCQUM5QyxNQUFNO3dCQUNOLGdDQUFnQzt3QkFDaEMscUJBQXFCO3dCQUNyQix3Q0FBd0M7d0JBQ3hDLHNDQUFzQzt3QkFDdEMsc0RBQXNEO3dCQUN0RCw4RUFBOEU7d0JBQzlFLFNBQVM7d0JBRVQsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUU7NEJBQ3JDLEtBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO3dCQUMzQixDQUFDLENBQUMsQ0FBQzt3QkFFSCxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUU7NEJBQ2pDLHdDQUF3Qzs0QkFDeEMsTUFBTTs0QkFDTixxQkFBcUI7NEJBQ3JCLGlDQUFpQzs0QkFDakMsOENBQThDOzRCQUM5QyxrREFBa0Q7NEJBQ2xELFNBQVM7NEJBQ1QsU0FBUzs0QkFFVCxLQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ3BCLENBQUMsQ0FBQyxDQUFDO3dCQUVILElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQzt3QkFFN0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDOzs7NkJBRXRCLElBQUksQ0FBQyxZQUFZLEVBQWpCLHlCQUFpQjt3QkFDeEIsQ0FBRywrQkFBSyxDQUF1QixDQUFDO3dCQUVoQyxxQkFBTSxLQUFLLENBQUMsZ0JBQWdCLENBQzFCO2dDQUNFLFVBQVUsWUFBQTtnQ0FDVixZQUFZLGNBQUE7Z0NBQ1osTUFBTSxRQUFBO2dDQUNOLGVBQWUsaUJBQUE7Z0NBQ2YsZ0JBQWdCLGtCQUFBO2dDQUNoQixnQkFBZ0Isa0JBQUE7Z0NBQ2hCLFVBQVUsWUFBQTs2QkFDWCxDQUNGLEVBQUE7O3dCQVZELFNBVUMsQ0FBQzs2QkFFRSxDQUFBLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFBLEVBQXhCLHlCQUF3Qjt3QkFDcEIsS0FBQSxPQUFjLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLElBQUEsRUFBOUMsU0FBUyxRQUFBLENBQXNDO3dCQUV0RCxLQUFBLFNBQVMsQ0FBQTtpQ0FBVCx5QkFBUzt3QkFBSSxxQkFBTSxTQUFTLENBQUMsZ0JBQWdCLENBQzNDO2dDQUNFLFVBQVUsWUFBQTtnQ0FDVixZQUFZLGNBQUE7Z0NBQ1osTUFBTSxRQUFBO2dDQUNOLGVBQWUsaUJBQUE7Z0NBQ2YsZ0JBQWdCLGtCQUFBO2dDQUNoQixnQkFBZ0Isa0JBQUE7Z0NBQ2hCLFVBQVUsWUFBQTs2QkFDWCxDQUNGLEVBQUE7OzhCQVZZLFNBVVo7Ozt3QkFWRCxHQVVFOzs2QkFJTixxQkFBTSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsRUFBQTs7d0JBQWhDLFNBQWdDLENBQUM7Ozs7d0JBR2pDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLE9BQUssQ0FBQyxDQUFDO3dCQUVyRCx3Q0FBd0M7d0JBQ3hDLE1BQU07d0JBQ04scUJBQXFCO3dCQUNyQixpQ0FBaUM7d0JBQ2pDLHVDQUF1Qzt3QkFDdkMsNEVBQTRFO3dCQUM1RSxTQUFTO3dCQUNULFNBQVM7d0JBRVQsSUFBSSxLQUFLOzRCQUNQLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7Ozs7O0tBSWxCO0lBRUssa0NBQVksR0FBbEIsVUFBbUIsRUFPYjtZQVBhLDRCQU9iLEVBTkosWUFBWSxFQUFaLGlDQUFZLEVBQ1osYUFBYSxFQUFiLGtDQUFhLEVBQ2IsZUFBZSxFQUFmLG9DQUFlLEVBQ2YsbUJBQWtCLEVBQWxCLHVDQUFrQixFQUNsQixxQkFBb0IsRUFBcEIseUNBQW9CLEVBQ3BCLG9CQUFtQixFQUFuQix3Q0FBbUI7Ozs7Ozs7O3dCQUVuQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDZixvR0FBb0csRUFDcEcsS0FBSyxFQUNMLE9BQU8sRUFDUCxXQUFXLEVBQ1gsYUFBYSxFQUNiLFlBQVksQ0FDYixDQUFDOzs7O3dCQUtBLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQzs0QkFDNUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO3dCQUUxQyxJQUFJLFdBQVcsSUFBSSxDQUFDLE9BQU87NEJBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQzt3QkFXL0MsVUFBVSxHQUFJLEtBQUssQ0FBQTt3QkFFMUIsSUFBSSxJQUFJLElBQUksVUFBVTs0QkFDcEIsc0JBQU87d0JBTVEscUJBQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUE7O3dCQUExQyxRQUFRLEdBQUcsU0FBK0I7d0JBQzFDLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUV2QyxJQUFJLENBQUMsTUFBTTs0QkFDVCxNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7d0JBRWhDLFVBQVUsR0FBRyxRQUFRLENBQUE7d0JBQ3RCLFNBQVMsR0FBRyxFQUFFLENBQUE7NkJBS2xCLENBQUEsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQzs0QkFDakMsS0FBSyxDQUFBLEVBREwseUJBQ0s7NkJBRUQsSUFBSSxDQUFDLGVBQWUsRUFBcEIsd0JBQW9CO3dCQUN0QixxQkFBTSxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUE7O3dCQUExQixTQUEwQixDQUFDOzs0QkFFZCxxQkFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FDdEQ7NEJBQ0UsS0FBSyxzQkFFSCxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQzFCLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxLQUMvQixTQUFTLFdBQUEsR0FDVjt5QkFDRixDQUFDLEVBQUE7O3dCQVJFLE1BQU0sR0FBRyxTQVFYO3dCQUVKLENBQUMsdUNBQWlDLEVBQWhDLGFBQUssQ0FBNEIsQ0FBQzt3QkFFbEIsYUFBYSxHQUFLLEtBQUssQ0FBQyxXQUFXLEVBQUUsU0FBeEIsQ0FBeUI7NkJBSXBELElBQUksQ0FBQyxhQUFhLEVBQWxCLHdCQUFrQjt3QkFFZCxlQUFlLEdBQUcsSUFBSSxDQUFDLGdCQUFnQjs2QkFDMUMsZUFBZTs2QkFDZixNQUFNOzZCQUNOLElBQUksQ0FBQyxVQUFDLENBQUMsSUFBSyxPQUFBLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFsQixDQUFrQixDQUFDLENBQUM7d0JBRS9CLFNBQVMsU0FBQSxDQUFDO3dCQUVkLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsS0FBSyxXQUFXOzRCQUN4RCxTQUFTLEdBQUcsb0JBQW9CLENBQUM7NkJBQzlCLElBQUksa0JBQWtCOzRCQUN6QixTQUFTLEdBQUcsa0JBQWtCLENBQUM7OzRCQUUvQixTQUFTLEdBQUcseUJBQXlCLENBQUM7d0JBRXhDLEtBQUEsSUFBSSxDQUFBO3dCQUFtQixxQkFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FDdEQ7Z0NBQ0UsS0FBSyxPQUFBO2dDQUNMLFNBQVMsV0FBQTtnQ0FDVCxZQUFZLEVBQ1o7b0NBQ0UsdUJBQXVCLEVBQUUsSUFBSTtpQ0FDOUI7Z0NBQ0QsT0FBTyxFQUNQO29DQUNFLE1BQU0sRUFBRSxRQUFRO2lDQUNqQjs2QkFDRixDQUFDLEVBQUE7O3dCQVpKLEdBQUssZUFBZSxHQUFHLFNBWW5CLENBQUM7Ozt3QkFHTCxLQUFBLElBQUksQ0FBQTt3QkFBbUIscUJBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7Z0NBQ3ZELEtBQUssT0FBQTtnQ0FDTCxPQUFPLEVBQ1A7b0NBQ0UsTUFBTSxFQUFFLFFBQVE7aUNBQ2pCOzZCQUNGLENBQUMsRUFBQTs7d0JBTkYsR0FBSyxlQUFlLEdBQUcsU0FNckIsQ0FBQzs7O3dCQWNDLFlBQVksR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFBO3dCQUNqQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQzt3QkFFL0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7d0JBRXRDLElBQUksQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLGdCQUFnQixFQUFFOzRCQUN4QyxLQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzt3QkFDOUIsQ0FBQyxDQUFDLENBQUM7d0JBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFOzRCQUNwQyx3Q0FBd0M7NEJBQ3hDLE1BQU07NEJBQ04scUJBQXFCOzRCQUNyQixpQ0FBaUM7NEJBQ2pDLDBDQUEwQzs0QkFDMUMsOENBQThDOzRCQUM5QyxTQUFTOzRCQUNULFNBQVM7NEJBRVQsS0FBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO3dCQUN2QixDQUFDLENBQUMsQ0FBQzs7OzZCQUVJLElBQUksQ0FBQyxlQUFlLEVBQXBCLHlCQUFvQjt3QkFDM0IsQ0FBRyxrQ0FBSyxDQUEwQixDQUFDO3dCQUVuQyxxQkFBTSxLQUFLLENBQUMsZ0JBQWdCLHVCQUVyQixnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsS0FDL0IsU0FBUyxXQUFBLElBRVosRUFBQTs7d0JBTEQsU0FLQyxDQUFDOzs7O3dCQUdxQixLQUFBLFNBQUEsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxDQUFBOzs7O3dCQUE5QyxRQUFRO3dCQUNqQixDQUFHLHNCQUFLLENBQWMsQ0FBQzt3QkFFdkIscUJBQU0sS0FBSyxDQUFDLGdCQUFnQix1QkFFckIsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQy9CLFNBQVMsV0FBQSxJQUVaLEVBQUE7O3dCQUxELFNBS0MsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs2QkFJTixxQkFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUE7O3dCQUEzQixTQUEyQixDQUFDOzs7O3dCQUc1QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxPQUFLLENBQUMsQ0FBQzt3QkFFeEQsd0NBQXdDO3dCQUN4QyxNQUFNO3dCQUNOLHFCQUFxQjt3QkFDckIsaUNBQWlDO3dCQUNqQyxtQ0FBbUM7d0JBQ25DLHdFQUF3RTt3QkFDeEUsU0FBUzt3QkFDVCxTQUFTO3dCQUVULElBQUksS0FBSzs0QkFDUCxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7Ozs7OztLQUtsQjtJQUVLLGtDQUFZLEdBQWxCOzs7Ozs7d0JBQ0UsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzs7Ozt3QkFNbEMscUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFBOzt3QkFBakUsU0FBaUUsQ0FBQzs7Ozt3QkFHbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsT0FBSyxDQUFDLENBQUM7Ozs7OztLQUszRDtJQUVELDZCQUE2QjtJQUM3QixzQkFBc0I7SUFDaEIsd0NBQWtCLEdBQXhCLFVBQXlCLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSTs7Ozs7Ozt3QkFDekMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQ2YsK0NBQStDLEVBQy9DLE1BQU0sRUFDTixJQUFJLENBQ0wsQ0FBQzs7Ozs7Ozt3QkFhdUIsS0FBQSxTQUFBLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUE7Ozs7d0JBQXBDLFFBQVE7NkJBQ2IsQ0FBQSxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFBLEVBQXRFLHdCQUFzRTs2QkFDcEUsSUFBSSxFQUFKLHdCQUFJO3dCQUNOLHFCQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUE7O3dCQUFuQyxTQUFtQyxDQUFDOzs0QkFFcEMscUJBQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsRUFBQTs7d0JBQXBDLFNBQW9DLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7d0JBSzNDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLE9BQUssQ0FBQyxDQUFDOzs7Ozs7S0FZakU7SUFFSyxvQ0FBYyxHQUFwQixVQUFxQixRQUFROzs7Ozs7d0JBQzNCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUVoRSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU07NEJBQ3BDLHNCQUFPOzs7O3dCQUdQLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZUFBZSxFQUFFLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFBOzt3QkFBckYsU0FBcUYsQ0FBQzt3QkFFdEYsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDOzs7O3dCQU1qQixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxPQUFLLENBQUMsQ0FBQzs7Ozs7O0tBRTdEO0lBRUsscUNBQWUsR0FBckIsVUFBc0IsUUFBUTs7Ozs7O3dCQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFFakUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU07NEJBQ3JDLHNCQUFPOzs7O3dCQUdQLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUE7O3dCQUF0RixTQUFzRixDQUFDO3dCQUV2RixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7Ozs7d0JBTWxCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLE9BQUssQ0FBQyxDQUFDOzs7Ozs7S0FFOUQ7SUFFRCxrREFBa0Q7SUFDbEQsbUZBQW1GO0lBRW5GLFVBQVU7SUFDVixnQ0FBZ0M7SUFDaEMscUVBQXFFO0lBQ3JFLHVDQUF1QztJQUN2Qyw0RUFBNEU7SUFDNUUsTUFBTTtJQUNOLG9CQUFvQjtJQUNwQix1RUFBdUU7SUFDdkUsTUFBTTtJQUNOLElBQUk7SUFFSiw4RUFBOEU7SUFDOUUsa0JBQWtCO0lBQ2xCLCtGQUErRjtJQUMvRixnREFBZ0Q7SUFFaEQsVUFBVTtJQUNWLDhCQUE4QjtJQUM5QixtRkFBbUY7SUFFbkYsaUVBQWlFO0lBQ2pFLG1EQUFtRDtJQUNuRCxNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLHdFQUF3RTtJQUN4RSxNQUFNO0lBQ04sSUFBSTtJQUVKLG9EQUFvRDtJQUNwRCxrQkFBa0I7SUFDbEIsOERBQThEO0lBQzlELDZCQUE2QjtJQUU3QixVQUFVO0lBQ1YsK0VBQStFO0lBRS9FLGlGQUFpRjtJQUNqRixNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLGlFQUFpRTtJQUNqRSxNQUFNO0lBQ04sSUFBSTtJQUVKLDhDQUE4QztJQUM5Qyw2RUFBNkU7SUFFN0UsVUFBVTtJQUNWLHlFQUF5RTtJQUN6RSxNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLHFFQUFxRTtJQUNyRSxNQUFNO0lBQ04sSUFBSTtJQUtFLDBCQUFJLEdBQVYsVUFBVyxFQUF1QztZQUFyQyxrQkFBTSxFQUFFLHdCQUFTLEVBQUUsd0JBQVMsRUFBRSxnQkFBSzs7OztnQkFHOUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7Z0JBR3RCLDhCQUE4QjtnQkFDOUIsMEJBQTBCO2dCQUMxQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNsQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBRTtvQkFDckUsUUFBUTtvQkFDUixhQUFhO2dCQUNmLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ0gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUU7b0JBQ3RFLFFBQVE7b0JBS1gsSUFBSSxLQUFJLENBQUMsZUFBZSxFQUN4Qjt3QkFDQyxLQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDO3dCQUU3QixrQkFBa0I7d0JBQ2xCLDZEQUE2RDt3QkFFN0QsS0FBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7cUJBQzVCO29CQUVELElBQUksS0FBSSxDQUFDLFlBQVksRUFDckI7d0JBQ0MsS0FBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFFMUIsa0JBQWtCO3dCQUNsQiwwREFBMEQ7d0JBRTFELEtBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO3FCQUN6QjtvQkFFRCxJQUFJLEtBQUksQ0FBQyxjQUFjLEVBQ3ZCO3dCQUNDLEtBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBRTVCLEtBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO3FCQUMzQjtvQkFFRCxJQUFJLEtBQUksQ0FBQyxjQUFjLEVBQ3ZCO3dCQUNDLEtBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7d0JBRTVCLEtBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO3FCQUMzQjtvQkFFRSxLQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBR3hDLDBEQUEwRDtnQkFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFFSCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBTyxJQUFJOzs7Ozs7Z0NBRWxGLE1BQU0sR0FRSixJQUFJLE9BUkEsRUFDTixVQUFVLEdBT1IsSUFBSSxXQVBJLEVBQ1YsRUFBRSxHQU1BLElBQUksR0FOSixFQUNGLElBQUksR0FLRixJQUFJLEtBTEYsRUFDSixhQUFhLEdBSVgsSUFBSSxjQUpPLEVBQ2IsSUFBSSxHQUdGLElBQUksS0FIRixFQUNKLE9BQU8sR0FFTCxJQUFJLFFBRkMsRUFDUCxjQUFjLEdBQ1osSUFBSSxlQURRLENBQ1A7Z0NBRVMscUJBQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQ2pEO3dDQUNFLEVBQUUsSUFBQTt3Q0FDRixVQUFVLFlBQUE7d0NBQ1YsSUFBSSxNQUFBO3dDQUNKLGFBQWEsZUFBQTt3Q0FDYixPQUFPLHdCQUFRLE9BQU8sS0FBRSxNQUFNLFFBQUEsR0FBRSxDQUFDLFNBQVM7cUNBQzNDLENBQUMsRUFBQTs7Z0NBUEUsUUFBUSxHQUFJLFNBT29CO2dDQUV0QyxvQkFBb0I7Z0NBQ3BCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0NBRTNDLFFBQVEsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUU7b0NBRTVCLEtBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQ0FDdEMsQ0FBQyxDQUFDLENBQUM7Z0NBS0gsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUcsTUFBTSxFQUFFLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQzs7OztxQkFnQzlFLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7Z0JBRWhCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFPLFlBQVk7Ozs7O2dDQUM3RixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDZixzREFBc0QsRUFDdEQsWUFBWSxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Ozs7Z0NBR2hDLEtBQUEsWUFBWSxDQUFDLE1BQU0sQ0FBQTs7eUNBSXBCLGVBQWUsQ0FBQyxDQUFoQix3QkFBZTt5Q0FVZixTQUFTLENBQUMsQ0FBVix3QkFBUzt5Q0F3QlQsWUFBWSxDQUFDLENBQWIsd0JBQVk7eUNBWVosZ0JBQWdCLENBQUMsQ0FBakIsd0JBQWdCO3lDQXVCaEIsZ0JBQWdCLENBQUMsQ0FBakIsd0JBQWdCO3lDQWNoQixpQkFBaUIsQ0FBQyxDQUFsQix3QkFBaUI7eUNBY2pCLHVCQUF1QixDQUFDLENBQXhCLHdCQUF1Qjt5Q0FldkIsZUFBZSxDQUFDLENBQWhCLHdCQUFlO3lDQVNiLFVBQVUsQ0FBQyxDQUFYLHlCQUFVO3lDQU9SLFdBQVcsQ0FBQyxDQUFaLHlCQUFXO3lDQWFiLGVBQWUsQ0FBQyxDQUFoQix5QkFBZTs7OztnQ0E1SXBCO29DQUNRLEtBQXdCLFlBQVksQ0FBQyxJQUFJLEVBQXZDLFVBQVUsZ0JBQUEsRUFBRSxLQUFLLFdBQUEsQ0FBdUI7b0NBRWhELGtCQUFrQjtvQ0FDbEIsMERBQTBEO29DQUUxRCx5QkFBTTtpQ0FDUDs7O2dDQUdEO29DQUNRLEtBQXNDLFlBQVksQ0FBQyxJQUFJLEVBQXJELEVBQUUsUUFBQSxFQUFFLFdBQVcsaUJBQUEsRUFBRSxPQUFPLGFBQUEsRUFBRSxLQUFLLFdBQUEsQ0FBdUI7b0NBRTlELHNDQUFzQztvQ0FDdEMsMERBQTBEO29DQUUxRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29DQUVwQyw2QkFBNkI7b0NBRTdCLHdDQUF3QztvQ0FDeEMsTUFBTTtvQ0FDTixpQ0FBaUM7b0NBQ2pDLDRCQUE0QjtvQ0FDNUIsd0RBQXdEO29DQUN4RCxXQUFXO29DQUNYLG9CQUFvQjtvQ0FDcEIsU0FBUztvQ0FDVCxTQUFTO29DQUVULHlCQUFNO2lDQUNQOzs7Z0NBR0Q7b0NBQ1UsTUFBTSxHQUFLLFlBQVksQ0FBQyxJQUFJLE9BQXRCLENBQXVCO29DQUVyQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29DQUUxQyxrQkFBa0I7b0NBQ2xCLHFDQUFxQztvQ0FFckMseUJBQU07aUNBQ1A7OztnQ0FHRDtvQ0FDVSxVQUFVLEdBQUssWUFBWSxDQUFDLElBQUksV0FBdEIsQ0FBdUI7b0NBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQ0FFakQsSUFBSSxDQUFDLFFBQVE7d0NBQ1gseUJBQU07b0NBRVIsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO29DQUVqQixJQUFJLFFBQVEsQ0FBQyxJQUFJLElBQUksSUFBSTt3Q0FDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQ0FFdkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7b0NBRTNCLE1BQU0sR0FBSyxRQUFRLENBQUMsT0FBTyxPQUFyQixDQUFzQjtvQ0FFcEMsa0JBQWtCO29DQUNsQix5REFBeUQ7b0NBRXpELHlCQUFNO2lDQUNQOzs7Z0NBR0Q7b0NBQ1UsVUFBVSxHQUFLLFlBQVksQ0FBQyxJQUFJLFdBQXRCLENBQXVCO29DQUNuQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7b0NBRWpELElBQUksQ0FBQyxRQUFRO3dDQUNYLHlCQUFNO29DQUVSLGtCQUFrQjtvQ0FDbEIsOERBQThEO29DQUU5RCx5QkFBTTtpQ0FDUDs7O2dDQUdEO29DQUNVLFVBQVUsR0FBSyxZQUFZLENBQUMsSUFBSSxXQUF0QixDQUF1QjtvQ0FDbkMsUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO29DQUVqRCxJQUFJLENBQUMsUUFBUTt3Q0FDWCx5QkFBTTtvQ0FFUixrQkFBa0I7b0NBQ2xCLCtEQUErRDtvQ0FFL0QseUJBQU07aUNBQ1A7OztnQ0FHRDtvQ0FDUSxLQUE4QyxZQUFZLENBQUMsSUFBSSxFQUE3RCxVQUFVLGdCQUFBLEVBQUUsWUFBWSxrQkFBQSxFQUFFLGFBQWEsbUJBQUEsQ0FBdUI7b0NBQ2hFLFFBQVEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztvQ0FFakQsSUFBSSxDQUFDLFFBQVE7d0NBQ1gseUJBQU07b0NBRVIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO29DQUMxRCwyREFBMkQ7b0NBQzNELCtDQUErQztvQ0FFL0MseUJBQU07aUNBQ1A7OztnQ0FHRDtvQ0FDUSxLQUF3QixZQUFZLENBQUMsSUFBSSxFQUF2QyxVQUFVLGdCQUFBLEVBQUUsS0FBSyxXQUFBLENBQXVCO29DQUVoRCxrQkFBa0I7b0NBQ2xCLDBEQUEwRDtvQ0FFMUQseUJBQU07aUNBQ1A7O3FDQUdHLHFCQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLFdBQUEsRUFBRSxTQUFTLFdBQUEsRUFBRSxDQUFDLEVBQUE7O2dDQUE5QyxTQUE4QyxDQUFDO2dDQUUvQyx5QkFBTTs7Z0NBS0ksV0FBVyxHQUFLLFlBQVksQ0FBQyxJQUFJLFlBQXRCLENBQXVCO2dDQUUxQyxJQUFJLENBQUMsWUFBWSxHQUFHLFdBQVcsQ0FBQztnQ0FFaEMsOENBQThDO2dDQUM5QyxpREFBaUQ7Z0NBRWpELHFCQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxTQUFTLFdBQUEsRUFBRSxTQUFTLFdBQUEsRUFBRSxDQUFDLEVBQUE7O2dDQUg5Qyw4Q0FBOEM7Z0NBQzlDLGlEQUFpRDtnQ0FFakQsU0FBOEMsQ0FBQztnQ0FFL0MseUJBQU07O2dDQUdWO29DQUNVLE1BQU0sR0FBSyxZQUFZLENBQUMsSUFBSSxPQUF0QixDQUF1QjtvQ0FJdkMsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTt3Q0FDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFBO3FDQUM1QztvQ0FDQyxnREFBZ0Q7b0NBRWxELHlCQUFNO2lDQUNQOzs7Z0NBRUg7b0NBQ0UscUJBQXFCO29DQUNyQiw4REFBOEQ7aUNBQy9EOzs7OztnQ0FJTCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtREFBbUQsRUFBRSxRQUFLLENBQUMsQ0FBQzs7Ozs7cUJBWWpGLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUE7Ozs7S0F3QmpCO0lBR0kseUNBQW1CLEdBQXpCOzs7Ozs7O3dCQUVDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7d0JBRTNDLGtCQUFrQjt3QkFDbEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxFQUFFLENBQUM7Ozs7d0JBSXZCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7d0JBRXhELHFCQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLEVBQUUsRUFBQTs7d0JBQXpELE9BQU8sR0FBRyxTQUErQzs7NEJBRS9ELEtBQXFCLFlBQUEsU0FBQSxPQUFPLENBQUEscUZBQzVCO2dDQURXLE1BQU07Z0NBRWhCLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxZQUFZO29DQUMvQixTQUFTO2dDQUVWLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs2QkFDN0M7Ozs7Ozs7Ozs7Ozt3QkFPRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxRQUFLLENBQUMsQ0FBQzs7Ozs7O0tBRWhFO0lBRUssb0NBQWMsR0FBcEI7Ozs7Ozs7d0JBRUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQzt3QkFFdEMsa0JBQWtCO3dCQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQzs7Ozt3QkFJbEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQzt3QkFFbkQscUJBQU0sU0FBUyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFBOzt3QkFBekQsT0FBTyxHQUFHLFNBQStDOzs0QkFFL0QsS0FBcUIsWUFBQSxTQUFBLE9BQU8sQ0FBQSxxRkFDNUI7Z0NBRFcsTUFBTTtnQ0FFaEIsSUFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLFlBQVk7b0NBQy9CLFNBQVM7Z0NBRVYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDOzZCQUN4Qzs7Ozs7Ozs7Ozs7O3dCQU9ELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLFFBQUssQ0FBQyxDQUFDOzs7Ozs7S0FFM0Q7SUFFSyxtQ0FBYSxHQUFuQjs7Ozs7O3dCQUVDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUM7d0JBRXJDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZTs0QkFDeEIsc0JBQU87d0JBRVIsdURBQXVEO3dCQUV2RCxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDOzs7O3dCQU81QixxQkFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUN0QyxlQUFlLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFBOzt3QkFEMUQsU0FDMEQsQ0FBQzs7Ozt3QkFJM0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsUUFBSyxDQUFDLENBQUM7Ozt3QkFHMUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7Ozs7O0tBRzVCO0lBQ0ssZ0NBQVUsR0FBaEI7Ozs7Ozt3QkFFQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFFbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZOzRCQUNyQixzQkFBTzt3QkFFUixzREFBc0Q7d0JBRXRELElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7Ozs7d0JBT3pCLHFCQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQ3RDLGVBQWUsRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUE7O3dCQUR2RCxTQUN1RCxDQUFDOzs7O3dCQUl4RCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxRQUFLLENBQUMsQ0FBQzs7O3dCQUd2RCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQzs7Ozs7S0FHeEI7SUFHSSx3Q0FBa0IsR0FBeEI7Ozs7Ozt3QkFFQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDOzs7O3dCQUl6QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO3dCQUVyRSxxQkFBTSxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUE7O3dCQUEzQixTQUEyQixDQUFDO3dCQUVyQixjQUFjLEdBQUksSUFBSSxDQUFBO3dCQUU3QixJQUFJLGNBQWMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQzs0QkFDbEQsc0JBQU8sY0FBYyxFQUFDOzZCQUV2Qjs0QkFDTyxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7NEJBRXpDLGFBQWE7NEJBQ2pCLHNCQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFDO3lCQUMvQzs7Ozt3QkFJRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxRQUFLLENBQUMsQ0FBQzs7Ozs7O0tBRTlEO0lBR0ksdUNBQWlCLEdBQXZCOzs7Ozs7d0JBRUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQzs7Ozt3QkFJeEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0RBQXNELENBQUMsQ0FBQzt3QkFFMUUscUJBQU0sSUFBSSxDQUFDLG1CQUFtQixFQUFFLEVBQUE7O3dCQUFoQyxTQUFnQyxDQUFDO3dCQUV2QixtQkFBbUIsR0FBRyxJQUFJLENBQUM7d0JBRXJDLElBQUksbUJBQW1CLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQzs0QkFDakUsc0JBQU8sbUJBQW1CLEVBQUM7NkJBRTVCOzRCQUNPLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQzs0QkFFbkQsYUFBYTs0QkFDakIsc0JBQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUM7eUJBQ3pEOzs7O3dCQUlELElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGtDQUFrQyxFQUFFLFFBQUssQ0FBQyxDQUFDOzs7Ozs7S0FFOUQ7SUFFSywrQ0FBeUIsR0FBL0I7Ozs7Ozs7d0JBRUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQzt3QkFFakQsa0JBQWtCO3dCQUNsQixJQUFJLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFDOzs7O3dCQUk3QixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywwREFBMEQsQ0FBQyxDQUFDO3dCQUU5RCxxQkFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLEVBQUE7O3dCQUF6RCxPQUFPLEdBQUcsU0FBK0M7OzRCQUUvRCxLQUFxQixZQUFBLFNBQUEsT0FBTyxDQUFBLHFGQUM1QjtnQ0FEVyxNQUFNO2dDQUVoQixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssYUFBYTtvQ0FDaEMsU0FBUztnQ0FFVixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs2QkFDbkQ7Ozs7Ozs7Ozs7Ozt3QkFPRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywwQ0FBMEMsRUFBRSxRQUFLLENBQUMsQ0FBQzs7Ozs7O0tBRXRFO0lBSU0sK0JBQVMsR0FBZixVQUFnQixFQUF3QjtZQUF0Qix3QkFBUyxFQUFFLHdCQUFTOzs7Ozs7O3dCQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBRWhELFdBQVcsR0FBRyxZQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFFLENBQUE7Ozs7d0JBTWpGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLGVBQWUsQ0FBQyxNQUFNLENBQUMsRUFBQyxXQUFXLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQzt3QkFHM0UscUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFBOzt3QkFEL0QscUJBQXFCLEdBQ3pCLFNBQW1FO3dCQUVyRSxxQkFBcUIsQ0FBQyxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQyxnQkFBZ0I7NkJBQzVFLE1BQU0sQ0FBQyxVQUFDLEdBQUcsSUFBSyxPQUFBLEdBQUcsQ0FBQyxHQUFHLEtBQUssNEJBQTRCLEVBQXhDLENBQXdDLENBQUMsQ0FBQzt3QkFFN0QscUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLHFCQUFxQix1QkFBQSxFQUFFLENBQUMsRUFBQTs7d0JBQTNELFNBQTJELENBQUM7NkJBRXhELElBQUksQ0FBQyxRQUFRLEVBQWIsd0JBQWE7d0JBQ08scUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDM0QsdUJBQXVCLEVBQ3ZCO2dDQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUztnQ0FDeEIsU0FBUyxFQUFFLElBQUk7Z0NBQ2YsU0FBUyxFQUFFLEtBQUs7NkJBQ2pCLENBQUMsRUFBQTs7d0JBTkUsa0JBQWdCLFNBTWxCO3dCQUdGLE9BSUUsZUFBYSxHQUpiLEVBQ0Ysa0JBR0UsZUFBYSxjQUhGLEVBQ2Isa0JBRUUsZUFBYSxjQUZGLEVBQ2IsbUJBQ0UsZUFBYSxlQURELENBQ0U7d0JBRWxCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUM3RDs0QkFDRSxFQUFFLE1BQUE7NEJBQ0YsYUFBYSxpQkFBQTs0QkFDYixhQUFhLGlCQUFBOzRCQUNiLGNBQWMsa0JBQUE7NEJBQ2QsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZOzRCQUM3QiwwQkFBMEI7NEJBQzFCLGtCQUFrQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7NEJBQzlGLHNCQUFzQixFQUFFLDBCQUEwQjt5QkFDbkQsQ0FBQyxDQUFDO3dCQUVMLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUNwQixTQUFTLEVBQUUsVUFBQyxFQUFrQixFQUFFLFFBQVEsRUFBRSxPQUFPO2dDQUFuQyxrQ0FBYzs0QkFFNUIsS0FBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDL0Isd0JBQXdCLEVBQ3hCO2dDQUNFLFdBQVcsRUFBRSxLQUFJLENBQUMsY0FBYyxDQUFDLEVBQUU7Z0NBQ25DLGNBQWMsZ0JBQUE7NkJBQ2YsQ0FBQztpQ0FDRCxJQUFJLENBQUMsUUFBUSxDQUFDO2lDQUNkLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQzt3QkFDcEIsQ0FBQyxDQUFDLENBQUM7d0JBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQ3BCLFNBQVMsRUFBRSxVQUFPLEVBQWdDLEVBQUUsUUFBUSxFQUFFLE9BQU87Z0NBQWpELGNBQUksRUFBRSxnQ0FBYSxFQUFFLG9CQUFPOzs7Ozs7OzRDQUcvQixxQkFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUNwRCxTQUFTLEVBQ1Q7b0RBQ0UsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRTtvREFDbkMsSUFBSSxNQUFBO29EQUNKLGFBQWEsZUFBQTtvREFDYixPQUFPLFNBQUE7aURBQ1IsQ0FBQyxFQUFBOzs0Q0FQSSxPQUFPLENBQUEsU0FPWCxDQUFBLEdBUE07NENBU1YsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFBLEVBQUUsQ0FBQyxDQUFDOzs7OzRDQUdqQixPQUFPLENBQUMsUUFBSyxDQUFDLENBQUM7Ozs7Ozt5QkFFbEIsQ0FBQyxDQUFDOzs0QkFHaUIscUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDM0QsdUJBQXVCLEVBQ3ZCOzRCQUNFLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUzs0QkFDeEIsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLFNBQVMsRUFBRSxJQUFJO3lCQUNoQixDQUFDLEVBQUE7O3dCQU5FLGFBQWEsR0FBRyxTQU1sQjt3QkFHRixFQUFFLEdBSUEsYUFBYSxHQUpiLEVBQ0YsYUFBYSxHQUdYLGFBQWEsY0FIRixFQUNiLGFBQWEsR0FFWCxhQUFhLGNBRkYsRUFDYixjQUFjLEdBQ1osYUFBYSxlQURELENBQ0U7d0JBRWxCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUM3RDs0QkFDRSxFQUFFLElBQUE7NEJBQ0YsYUFBYSxlQUFBOzRCQUNiLGFBQWEsZUFBQTs0QkFDYixjQUFjLGdCQUFBOzRCQUNkLFVBQVUsRUFBRSxJQUFJLENBQUMsWUFBWTs0QkFDN0IsMEJBQTBCOzRCQUMxQixrQkFBa0IsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTO3lCQUMvRixDQUFDLENBQUM7d0JBRUwsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQ3BCLFNBQVMsRUFBRSxVQUFDLEVBQWtCLEVBQUUsUUFBUSxFQUFFLE9BQU87Z0NBQW5DLGtDQUFjOzRCQUU1QixLQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUMvQix3QkFBd0IsRUFDeEI7Z0NBQ0UsV0FBVyxFQUFFLEtBQUksQ0FBQyxjQUFjLENBQUMsRUFBRTtnQ0FDbkMsY0FBYyxnQkFBQTs2QkFDZixDQUFDO2lDQUNELElBQUksQ0FBQyxRQUFRLENBQUM7aUNBQ2QsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUNwQixDQUFDLENBQUMsQ0FBQzt3QkEwQkMscUJBQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDekMsTUFBTSxFQUNOO2dDQUNFLFdBQVcsRUFBRSxXQUFXO2dDQUV4QixlQUFlLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWU7NkJBQ3ZELENBQUMsRUFBQTs7d0JBcEJFLEtBY0YsU0FNQSxFQW5CRixhQUFhLG1CQUFBLEVBQ2IsS0FBSyxXQUFBLEVBQ0wsS0FBSyxXQUFBLEVBQ0wsT0FBTyxhQUFBLEVBQ1AsZUFBZSxxQkFBQSxFQUNmLFNBQVMsZUFBQSxFQUNULG9CQUFvQiwwQkFBQSxFQUNwQixXQUFXLGlCQUFBLEVBQ1gsV0FBVyxpQkFBQSxFQUNYLFlBQVksa0JBQUEsRUFDWixNQUFNLFlBQUEsRUFDTixVQUFVLGdCQUFBLEVBQ1YsVUFBVSxnQkFBQTt3QkFTWixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FDZixpRkFBaUYsRUFDakYsYUFBYSxFQUNiLEtBQUssRUFDTCxLQUFLLEVBQ0wsU0FBUyxDQUNWLENBQUM7d0JBTUYsNEJBQTRCO3dCQUM1QixJQUFJO3dCQUNKLG1CQUFtQjt3QkFDbkIsc0RBQXNEO3dCQUN0RCxJQUFJO3dCQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBQyxTQUFTLEVBQUcsbUJBQW1CLEVBQzVELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsY0FBYyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTs2QkFFdkUsSUFBSSxDQUFDLFFBQVEsRUFBYix3QkFBYTt3QkFDZixJQUNFLFNBQVMsRUFDVDs0QkFDQSxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzt5QkFDaEQ7NkJBRUMsQ0FBQSxTQUFTOzRCQUNULElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUEsRUFEekMsd0JBQ3lDOzZCQUVyQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQVosd0JBQVk7d0JBQ2QscUJBQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFBOzt3QkFBckMsU0FBcUMsQ0FBQzs7NEJBSzVDLHFCQUFNLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxFQUFBOzt3QkFBdEMsU0FBc0MsQ0FBQzt3QkFFdkMsMkNBQTJDO3dCQUUzQyxxRUFBcUU7d0JBQ3JFLElBQUk7d0JBQ0osbUJBQW1CO3dCQUNuQixrREFBa0Q7d0JBQ2xELDhDQUE4Qzt3QkFDOUMsTUFBTTt3QkFDTixNQUFNO3dCQUNOLElBQUk7d0JBRUoseURBQXlEO3dCQUV6RCwyQ0FBMkM7d0JBQzNDLGdFQUFnRTt3QkFFaEUsd0NBQXdDO3dCQUN4QyxLQUFLO3dCQUNMLGdDQUFnQzt3QkFDaEMscUNBQXFDO3dCQUNyQyxpREFBaUQ7d0JBQ2pELE9BQU87d0JBQ1AsUUFBUTt3QkFFUixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDOzs7O3dCQUt4QyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxRQUFLLENBQUMsQ0FBQzt3QkFHckQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDOzs7Ozs7S0FFaEI7SUFDRCxnQ0FBVSxHQUFWO1FBQ0UsSUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQztRQUMvQixJQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXJDLElBQUksSUFBSSxDQUFDO1FBRVQsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDdkQsSUFBSSxHQUFHLFFBQVEsQ0FBQzthQUNiLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUM1QyxJQUFJLEdBQUcsU0FBUyxDQUFDO2FBQ2QsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzNDLElBQUksR0FBRyxRQUFRLENBQUM7YUFDYixJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDMUMsSUFBSSxHQUFHLE9BQU8sQ0FBQzthQUNaLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFDO1lBQ3JELElBQUksR0FBRyxNQUFNLENBQUM7O1lBRWQsSUFBSSxHQUFHLFNBQVMsQ0FBQztRQUVuQixPQUFPO1lBQ0wsSUFBSSxNQUFBO1lBQ0osRUFBRSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQzNCLFFBQVEsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN2QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtZQUNwQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBRUosQ0FBQzswRUFqeURXLFdBQVc7dURBQVgsV0FBVyxXQUFYLFdBQVcsbUJBRlgsTUFBTTtzQkFwRnBCO0NBdzNEQyxBQXJ5REQsSUFxeURDO1NBbHlEYSxXQUFXO2tEQUFYLFdBQVc7Y0FIeEIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgUmVtb3RlUGVlcnNTZXJ2aWNlIH0gZnJvbSAnLi9yZW1vdGUtcGVlcnMuc2VydmljZSc7XG5pbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBTaWduYWxpbmdTZXJ2aWNlIH0gZnJvbSAnLi9zaWduYWxpbmcuc2VydmljZSc7XG5cbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGJvd3NlciBmcm9tICdib3dzZXInO1xuXG5pbXBvcnQgKiBhcyBtZWRpYXNvdXBDbGllbnQgZnJvbSAnbWVkaWFzb3VwLWNsaWVudCdcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBoYXJrIGZyb20gJ2hhcmsnO1xuXG5cbmxldCBzYXZlQXM7XG5cblxuY29uc3QgbGFzdE4gPSA0XG5jb25zdCBtb2JpbGVMYXN0TiA9IDFcbmNvbnN0IHZpZGVvQXNwZWN0UmF0aW8gPSAxLjc3N1xuXG5jb25zdCBzaW11bGNhc3QgPSB0cnVlO1xuY29uc3QgXHRzaW11bGNhc3RFbmNvZGluZ3MgICA9IFtcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDIgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEgfVxuXVxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG4gIF91c2VTaW11bGNhc3RcbiAgX3R1cm5TZXJ2ZXJzXG5cbiAgc3Vic2NyaXB0aW9ucyA9IFtdO1xuICBwdWJsaWMgb25DYW1Qcm9kdWNpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIHB1YmxpYyBvblZvbHVtZUNoYW5nZTogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBzaWduYWxpbmdTZXJ2aWNlOiBTaWduYWxpbmdTZXJ2aWNlLFxuICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlLFxuICBwcml2YXRlIHJlbW90ZVBlZXJzU2VydmljZTogUmVtb3RlUGVlcnNTZXJ2aWNlKSB7XG5cblxuICB9XG5cbiAgaW5pdCh7XG4gICAgcGVlcklkPW51bGwsXG5cbiAgICBwcm9kdWNlPXRydWUsXG4gICAgZm9yY2VUY3A9ZmFsc2UsXG4gICAgbXV0ZWQ9ZmFsc2VcbiAgfSA9IHt9KSB7XG4gICAgaWYgKCFwZWVySWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGVlcklkJyk7XG5cblxuICAgIC8vIGxvZ2dlci5kZWJ1ZyhcbiAgICAvLyAgICdjb25zdHJ1Y3RvcigpIFtwZWVySWQ6IFwiJXNcIiwgZGV2aWNlOiBcIiVzXCIsIHByb2R1Y2U6IFwiJXNcIiwgZm9yY2VUY3A6IFwiJXNcIiwgZGlzcGxheU5hbWUgXCJcIl0nLFxuICAgIC8vICAgcGVlcklkLCBkZXZpY2UuZmxhZywgcHJvZHVjZSwgZm9yY2VUY3ApO1xuXG5cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJTklUIFJvb20gJywgcGVlcklkKVxuXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgLy8gV2hldGhlciB3ZSBzaG91bGQgcHJvZHVjZS5cbiAgICB0aGlzLl9wcm9kdWNlID0gcHJvZHVjZTtcblxuICAgIC8vIFdoZXRoZXIgd2UgZm9yY2UgVENQXG4gICAgdGhpcy5fZm9yY2VUY3AgPSBmb3JjZVRjcDtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgc2ltdWxjYXN0IHNob3VsZCBiZSB1c2VkLlxuICAgIC8vIHRoaXMuX3VzZVNpbXVsY2FzdCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKCdzaW11bGNhc3QnIGluIHdpbmRvdy5jb25maWcpXG4gICAgLy8gICB0aGlzLl91c2VTaW11bGNhc3QgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdDtcblxuXG5cblxuXG4gICAgdGhpcy5fbXV0ZWQgPSBtdXRlZDtcblxuICAgIC8vIFRoaXMgZGV2aWNlXG4gICAgdGhpcy5fZGV2aWNlID0gdGhpcy5kZXZpY2VJbmZvKCk7XG5cbiAgICAvLyBNeSBwZWVyIG5hbWUuXG4gICAgdGhpcy5fcGVlcklkID0gcGVlcklkO1xuXG5cblxuICAgIC8vIEFsZXJ0IHNvdW5kXG4gICAgLy8gdGhpcy5fc291bmRBbGVydCA9IG5ldyBBdWRpbygnL3NvdW5kcy9ub3RpZnkubXAzJyk7XG5cblxuXG5cbiAgICAvLyBUaGUgcm9vbSBJRFxuICAgIHRoaXMuX3Jvb21JZCA9IG51bGw7XG5cbiAgICAvLyBtZWRpYXNvdXAtY2xpZW50IERldmljZSBpbnN0YW5jZS5cbiAgICAvLyBAdHlwZSB7bWVkaWFzb3VwQ2xpZW50LkRldmljZX1cbiAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBudWxsO1xuXG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIGhhcmtcbiAgICB0aGlzLl9oYXJrID0gbnVsbDtcblxuICAgIC8vIExvY2FsIE1lZGlhU3RyZWFtIGZvciBoYXJrXG4gICAgdGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCB3ZWJjYW0gbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIEV4dHJhIHZpZGVvcyBiZWluZyBwcm9kdWNlZFxuICAgIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBNYXAgb2Ygd2ViY2FtIE1lZGlhRGV2aWNlSW5mb3MgaW5kZXhlZCBieSBkZXZpY2VJZC5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgTWVkaWFEZXZpY2VJbmZvcz59XG4gICAgdGhpcy5fd2ViY2FtcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cbiAgICB0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuICAgIC8vIG1lZGlhc291cCBDb25zdW1lcnMuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIG1lZGlhc291cENsaWVudC5Db25zdW1lcj59XG4gICAgdGhpcy5fY29uc3VtZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gc2ltdWxjYXN0XG5cbiAgICAvLyB0aGlzLl9zdGFydEtleUxpc3RlbmVyKCk7XG5cbiAgICAvLyB0aGlzLl9zdGFydERldmljZXNMaXN0ZW5lcigpO1xuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknLCB0aGlzLl9jbG9zZWQpO1xuXG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmNsb3NlKCk7XG5cbiAgICAvLyBDbG9zZSBtZWRpYXNvdXAgVHJhbnNwb3J0cy5cbiAgICBpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmZvckVhY2goc3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXG4gICAgfSlcblxuICB9XG5cbiAgLy8gX3N0YXJ0S2V5TGlzdGVuZXIoKSB7XG4gIC8vICAgLy8gQWRkIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgb24gZG9jdW1lbnRcbiAgLy8gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gIC8vICAgICBpZiAoZXZlbnQucmVwZWF0KSByZXR1cm47XG4gIC8vICAgICBjb25zdCBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKTtcblxuICAvLyAgICAgY29uc3Qgc291cmNlID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vICAgICBjb25zdCBleGNsdWRlID0gWydpbnB1dCcsICd0ZXh0YXJlYSddO1xuXG4gIC8vICAgICBpZiAoZXhjbHVkZS5pbmRleE9mKHNvdXJjZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2tleURvd24oKSBba2V5OlwiJXNcIl0nLCBrZXkpO1xuXG4gIC8vICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgLy8gICAgICAgICAvKlxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzNyk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXRQcmV2QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzOSk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXROZXh0QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgICAqL1xuXG5cbiAgLy8gICAgICAgICBjYXNlICdNJzogLy8gVG9nZ2xlIG1pY3JvcGhvbmVcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQpIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLnVubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbm11dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFbmFibGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRW5hYmxlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgIH1cblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ1YnOiAvLyBUb2dnbGUgdmlkZW9cbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ0gnOiAvLyBPcGVuIGhlbHAgZGlhbG9nXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEhlbHBPcGVuKHRydWUpKTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGRlZmF1bHQ6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG5cblxuICAvLyB9XG5cbiAgX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlY2hhbmdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgYXN5bmMgbXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ3BhdXNlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUGF1c2VkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZCh0cnVlKSk7XG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdW5tdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdyZXN1bWVQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUmVzdW1lZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXHRkaXNjb25uZWN0TG9jYWxIYXJrKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNjb25uZWN0TG9jYWxIYXJrKCknKTtcblxuXHRcdGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpXG5cdFx0e1xuXHRcdFx0bGV0IFsgdHJhY2sgXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuXHRcdFx0dHJhY2suc3RvcCgpO1xuXHRcdFx0dHJhY2sgPSBudWxsO1xuXG5cdFx0XHR0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5faGFyayAhPSBudWxsKVxuXHRcdFx0dGhpcy5faGFyay5zdG9wKCk7XG5cdH1cblxuXHRjb25uZWN0TG9jYWxIYXJrKHRyYWNrKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Nvbm5lY3RMb2NhbEhhcmsoKSBbdHJhY2s6XCIlb1wiXScsIHRyYWNrKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuXHRcdGNvbnN0IG5ld1RyYWNrID0gdHJhY2suY2xvbmUoKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0uYWRkVHJhY2sobmV3VHJhY2spO1xuXG5cdFx0bmV3VHJhY2suZW5hYmxlZCA9IHRydWU7XG5cblx0XHR0aGlzLl9oYXJrID0gaGFyayh0aGlzLl9oYXJrU3RyZWFtLFxuXHRcdFx0e1xuXHRcdFx0XHRwbGF5ICAgICAgOiBmYWxzZSxcblx0XHRcdFx0aW50ZXJ2YWwgIDogMTAsXG5cdFx0XHRcdHRocmVzaG9sZCA6IC01MCxcblx0XHRcdFx0aGlzdG9yeSAgIDogMTAwXG5cdFx0XHR9KTtcblxuXHRcdHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IC0xMDA7XG5cblx0XHR0aGlzLl9oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICB7XG4gICAgICAvLyBVcGRhdGUgb25seSBpZiB0aGVyZSBpcyBhIGJpZ2dlciBkaWZmXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIgJiYgTWF0aC5hYnModm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSA+IDAuNSlcblx0XHRcdHtcbiAgICAgICAgLy8gRGVjYXkgY2FsY3VsYXRpb246IGtlZXAgaW4gbWluZCB0aGF0IHZvbHVtZSByYW5nZSBpcyAtMTAwIC4uLiAwIChkQilcblx0XHRcdFx0Ly8gVGhpcyBtYWtlcyBkZWNheSB2b2x1bWUgZmFzdCBpZiBkaWZmZXJlbmNlIHRvIGxhc3Qgc2F2ZWQgdmFsdWUgaXMgYmlnXG5cdFx0XHRcdC8vIGFuZCBzbG93IGZvciBzbWFsbCBjaGFuZ2VzLiBUaGlzIHByZXZlbnRzIGZsaWNrZXJpbmcgdm9sdW1lIGluZGljYXRvclxuXHRcdFx0XHQvLyBhdCBsb3cgbGV2ZWxzXG5cdFx0XHRcdGlmICh2b2x1bWUgPCB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpXG5cdFx0XHRcdHtcbiAgICAgICAgICB2b2x1bWUgPVxuICAgICAgICAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSAtXG4gICAgICAgICAgTWF0aC5wb3coXG4gICAgICAgICAgICAodm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSAvXG4gICAgICAgICAgICAoMTAwICsgdGhpcy5faGFyay5sYXN0Vm9sdW1lKVxuICAgICAgICAgICAgLCAyXG5cdFx0XHRcdFx0XHQpICogMTA7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnVk9MVU1FIENIQU5HRSBIQVJLJyk7XG5cbiAgICAgICAgLy8gdGhpcy5vblZvbHVtZUNoYW5nZS5uZXh0KHtwZWVyOnRoaXMuX3BlZXJJZCwgdm9sdW1lfSlcblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZSh0aGlzLl9wZWVySWQsIHZvbHVtZSkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3BlYWtpbmcnLCAoKSA9PlxuXHRcdC8vIHtcblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKHRydWUpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHQoc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSB8fFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLm1lLmlzQXV0b011dGVkKSAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlciAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdXRvTXV0ZWQoZmFsc2UpKTsgLy8gc2FuaXR5IGFjdGlvblxuXHRcdC8vIH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3RvcHBlZF9zcGVha2luZycsICgpID0+XG5cdFx0Ly8ge1xuXHRcdC8vIFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldElzU3BlYWtpbmcoZmFsc2UpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLnZvaWNlQWN0aXZhdGVkVW5tdXRlICYmXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyICYmXG5cdFx0Ly8gXHRcdCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdHtcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuXHRcdC8vIFx0XHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKHRydWUpKTtcblx0XHQvLyBcdH1cblx0XHQvLyB9KTtcblx0fVxuXG4gIGFzeW5jIGNoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2RldmljZUlkOlwiJXNcIl0nLCBkZXZpY2VJZCk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbGVjdGVkIGF1ZGlvIG91dHB1dCBkZXZpY2Ugbm8gbG9uZ2VyIGF2YWlsYWJsZScpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIE9ubHkgRmlyZWZveCBzdXBwb3J0cyBhcHBseUNvbnN0cmFpbnRzIHRvIGF1ZGlvIHRyYWNrc1xuICAvLyBTZWU6XG4gIC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTc5Njk2NFxuICBhc3luYyB1cGRhdGVNaWMoe1xuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlIHx8IHRoaXMuX2RldmljZS5mbGFnICE9PSAnZmlyZWZveCcsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZU1pYygpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIGF1ZGlvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldEF1ZGlvRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGF1ZGlvIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgYXV0b0dhaW5Db250cm9sID0gZmFsc2U7XG4gICAgICBjb25zdCBlY2hvQ2FuY2VsbGF0aW9uID0gdHJ1ZVxuICAgICAgY29uc3Qgbm9pc2VTdXBwcmVzc2lvbiA9IHRydWVcblxuICAgICAgLy8gaWYgKCF3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnMpIHtcbiAgICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgLy8gICAgICdNaXNzaW5nIGNlbnRyYWxBdWRpb09wdGlvbnMgZnJvbSBhcHAgY29uZmlnISAoU2VlIGl0IGluIGV4YW1wbGUgY29uZmlnLiknXG4gICAgICAvLyAgICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc2FtcGxlUmF0ZSA9IDk2MDAwLFxuICAgICAgICBjaGFubmVsQ291bnQgPSAxLFxuICAgICAgICB2b2x1bWUgPSAxLjAsXG4gICAgICAgIHNhbXBsZVNpemUgPSAxNixcbiAgICAgICAgb3B1c1N0ZXJlbyA9IGZhbHNlLFxuICAgICAgICBvcHVzRHR4ID0gdHJ1ZSxcbiAgICAgICAgb3B1c0ZlYyA9IHRydWUsXG4gICAgICAgIG9wdXNQdGltZSA9IDIwLFxuICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlID0gOTYwMDBcbiAgICAgIH0gPSB7fTtcblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl9taWNQcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICAvLyB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKTtcblxuICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlTWljKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb3B1c1N0ZXJlbyxcbiAgICAgICAgICAgICAgb3B1c0R0eCxcbiAgICAgICAgICAgICAgb3B1c0ZlYyxcbiAgICAgICAgICAgICAgb3B1c1B0aW1lLFxuICAgICAgICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAgeyBzb3VyY2U6ICdtaWMnIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnbWljJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX21pY1Byb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNaWNyb3Bob25lIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZU1pYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci52b2x1bWUgPSAwO1xuXG4gICAgICAgIHRoaXMuY29ubmVjdExvY2FsSGFyayh0cmFjayk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fbWljUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgW2hhcmtUcmFja10gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cbiAgICAgICAgICBoYXJrVHJhY2sgJiYgYXdhaXQgaGFya1RyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVXZWJjYW0oe1xuICAgIGluaXQgPSBmYWxzZSxcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGwsXG4gICAgbmV3UmVzb2x1dGlvbiA9IG51bGwsXG4gICAgbmV3RnJhbWVSYXRlID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVXZWJjYW0oKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiLCBuZXdSZXNvbHV0aW9uOlwiJXNcIiwgbmV3RnJhbWVSYXRlOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWQsXG4gICAgICBuZXdSZXNvbHV0aW9uLFxuICAgICAgbmV3RnJhbWVSYXRlXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIHZpZGVvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBpZiAobmV3UmVzb2x1dGlvbilcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvUmVzb2x1dGlvbihuZXdSZXNvbHV0aW9uKSk7XG5cbiAgICAgIC8vIGlmIChuZXdGcmFtZVJhdGUpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb0ZyYW1lUmF0ZShuZXdGcmFtZVJhdGUpKTtcblxuICAgICAgY29uc3QgIHZpZGVvTXV0ZWQgID0gZmFsc2VcblxuICAgICAgaWYgKGluaXQgJiYgdmlkZW9NdXRlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgLy8gZWxzZVxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX3dlYmNhbXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCAgcmVzb2x1dGlvbiA9ICdtZWRpdW0nXG4gICAgICBjb25zdCBmcmFtZVJhdGUgPSAxNVxuXG5cblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlkZW86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICAgICAgLmNvZGVjc1xuICAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAgICAgICAgIGVsc2UgaWYgKHNpbXVsY2FzdEVuY29kaW5ncylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IHNpbXVsY2FzdEVuY29kaW5ncztcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IHdlYkNhbVN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICAgICAgICB3ZWJDYW1TdHJlYW0uc2V0UHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIHRoaXMub25DYW1Qcm9kdWNpbmcubmV4dCh3ZWJDYW1TdHJlYW0pXG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2VNZWV0aW5nKCknKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAnbW9kaWZ5UGVlckNvbnN1bWVyKCkgW3BlZXJJZDpcIiVzXCIsIHR5cGU6XCIlc1wiXScsXG4gICAgICBwZWVySWQsXG4gICAgICB0eXBlXG4gICAgKTtcblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChjb25zdCBjb25zdW1lciBvZiB0aGlzLl9jb25zdW1lcnMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKGNvbnN1bWVyLmFwcERhdGEucGVlcklkID09PSBwZWVySWQgJiYgY29uc3VtZXIuYXBwRGF0YS5zb3VyY2UgPT09IHR5cGUpIHtcbiAgICAgICAgICBpZiAobXV0ZSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncGF1c2VDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnBhdXNlKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdyZXN1bWVDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnJlc3VtZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8sIHRva2VuIH0pIHtcblxuXG4gICAgdGhpcy5fcm9vbUlkID0gcm9vbUlkO1xuXG5cbiAgICAvLyBpbml0aWFsaXplIHNpZ25hbGluZyBzb2NrZXRcbiAgICAvLyBsaXN0ZW4gdG8gc29ja2V0IGV2ZW50c1xuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5pbml0KHRva2VuKVxuICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uRGlzY29ubmVjdGVkLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcbiAgICAgIC8vIHRoaXMuY2xvc2VcbiAgICB9KSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25SZWNvbm5lY3Rpbmcuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuXG5cblxuXG5cdFx0XHRpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbGVhclBlZXJzKCk7XG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0aW5nJykpO1xuICAgIH0pKVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTmV3Q29uc3VtZXIucGlwZShzd2l0Y2hNYXAoYXN5bmMgKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGVlcklkLFxuICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICBpZCxcbiAgICAgICAga2luZCxcbiAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgYXBwRGF0YSxcbiAgICAgICAgcHJvZHVjZXJQYXVzZWRcbiAgICAgIH0gPSBkYXRhO1xuXG4gICAgICBjb25zdCBjb25zdW1lciAgPSBhd2FpdCB0aGlzLl9yZWN2VHJhbnNwb3J0LmNvbnN1bWUoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICBhcHBEYXRhIDogeyAuLi5hcHBEYXRhLCBwZWVySWQgfSAvLyBUcmljay5cbiAgICAgICAgfSkgYXMgbWVkaWFzb3VwQ2xpZW50LnR5cGVzLkNvbnN1bWVyO1xuXG4gICAgICAvLyBTdG9yZSBpbiB0aGUgbWFwLlxuICAgICAgdGhpcy5fY29uc3VtZXJzLnNldChjb25zdW1lci5pZCwgY29uc3VtZXIpO1xuXG4gICAgICBjb25zdW1lci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PlxuICAgICAge1xuICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVyLmlkKTtcbiAgICAgIH0pO1xuXG5cblxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5uZXdDb25zdW1lcihjb25zdW1lciwgIHBlZXJJZCwgdHlwZSwgcHJvZHVjZXJQYXVzZWQpO1xuXG4gICAgICAvLyBXZSBhcmUgcmVhZHkuIEFuc3dlciB0aGUgcmVxdWVzdCBzbyB0aGUgc2VydmVyIHdpbGxcbiAgICAgIC8vIHJlc3VtZSB0aGlzIENvbnN1bWVyICh3aGljaCB3YXMgcGF1c2VkIGZvciBub3cpLlxuXG5cbiAgICAgIC8vIGlmIChraW5kID09PSAnYXVkaW8nKVxuICAgICAgLy8ge1xuICAgICAgLy8gICBjb25zdW1lci52b2x1bWUgPSAwO1xuXG4gICAgICAvLyAgIGNvbnN0IHN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuXG4gICAgICAvLyAgIHN0cmVhbS5hZGRUcmFjayhjb25zdW1lci50cmFjayk7XG5cbiAgICAgIC8vICAgaWYgKCFzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXSlcbiAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcXVlc3QubmV3Q29uc3VtZXIgfCBnaXZlbiBzdHJlYW0gaGFzIG5vIGF1ZGlvIHRyYWNrJyk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyayA9IGhhcmsoc3RyZWFtLCB7IHBsYXk6IGZhbHNlIH0pO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsub24oJ3ZvbHVtZV9jaGFuZ2UnLCAodm9sdW1lKSA9PlxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgdm9sdW1lID0gTWF0aC5yb3VuZCh2b2x1bWUpO1xuXG4gICAgICAgIC8vICAgaWYgKGNvbnN1bWVyICYmIHZvbHVtZSAhPT0gY29uc3VtZXIudm9sdW1lKVxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGNvbnN1bWVyLnZvbHVtZSA9IHZvbHVtZTtcblxuICAgICAgICAvLyAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZShwZWVySWQsIHZvbHVtZSkpO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfSk7XG4gICAgICAvLyB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25Ob3RpZmljYXRpb24ucGlwZShzd2l0Y2hNYXAoYXN5bmMgKG5vdGlmaWNhdGlvbikgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBzd2l0Y2ggKG5vdGlmaWNhdGlvbi5tZXRob2QpIHtcblxuXG5cbiAgICAgICAgICBjYXNlICdwcm9kdWNlclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwcm9kdWNlcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyU2NvcmUocHJvZHVjZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ25ld1BlZXInOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJBY3Rpb25zLmFkZFBlZXIoXG4gICAgICAgICAgICAgIC8vICAgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzLCBjb25zdW1lcnM6IFtdIH0pKTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5uZXdQZWVyKGlkKTtcblxuICAgICAgICAgICAgICAvLyB0aGlzLl9zb3VuZE5vdGlmaWNhdGlvbigpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAgICAgLy8gICB7XG4gICAgICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAvLyAgICAgICBpZDogJ3Jvb20ubmV3UGVlcicsXG4gICAgICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAne2Rpc3BsYXlOYW1lfSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAgICAgICAgIC8vICAgICB9LCB7XG4gICAgICAgICAgICAgIC8vICAgICAgIGRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ3BlZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xvc2VQZWVyKHBlZXJJZCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgcGVlckFjdGlvbnMucmVtb3ZlUGVlcihwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY29uc3VtZXIuY2xvc2UoKTtcblxuICAgICAgICAgICAgICBpZiAoY29uc3VtZXIuaGFyayAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnN1bWVyLmhhcmsuc3RvcCgpO1xuXG4gICAgICAgICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IGNvbnN1bWVyLmFwcERhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnJlbW92ZUNvbnN1bWVyKGNvbnN1bWVySWQsIHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJQYXVzZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXJJZCwgJ3JlbW90ZScpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUmVzdW1lZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXJJZCwgJ3JlbW90ZScpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyTGF5ZXJzQ2hhbmdlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2Uub25Db25zdW1lckxheWVyQ2hhbmdlZChjb25zdW1lcklkKVxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJDdXJyZW50TGF5ZXJzKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclNjb3JlKGNvbnN1bWVySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdyb29tQmFjayc6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjYXNlICdyb29tUmVhZHknOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHVyblNlcnZlcnMgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgICAgICB0aGlzLl90dXJuU2VydmVycyA9IHR1cm5TZXJ2ZXJzO1xuXG4gICAgICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy50b2dnbGVKb2luZWQoKSk7XG4gICAgICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRJbkxvYmJ5KGZhbHNlKSk7XG5cbiAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYWN0aXZlU3BlYWtlcic6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cblxuXG4gICAgICAgICAgICAgIGlmIChwZWVySWQgPT09IHRoaXMuX3BlZXJJZCkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5vblZvbHVtZUNoYW5nZS5uZXh0KG5vdGlmaWNhdGlvbi5kYXRhKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIHRoaXMuX3Nwb3RsaWdodHMuaGFuZGxlQWN0aXZlU3BlYWtlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAvLyB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgLy8gICAndW5rbm93biBub3RpZmljYXRpb24ubWV0aG9kIFwiJXNcIicsIG5vdGlmaWNhdGlvbi5tZXRob2QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Vycm9yIG9uIHNvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgLy8gICAgICAgaWQ6ICdzb2NrZXQucmVxdWVzdEVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFcnJvciBvbiBzZXJ2ZXIgcmVxdWVzdCdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuXG4gICAgfSkpLnN1YnNjcmliZSgpKVxuICAgIC8vIG9uIHJvb20gcmVhZHkgam9pbiByb29tIF9qb2luUm9vbVxuXG4gICAgLy8gdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgIC8vIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgLy8gICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgIC8vIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAvLyAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAvLyBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgIC8vIGNyZWF0ZSBzZW5kIHRyYW5zcG9ydCBjcmVhdGVXZWJSdGNUcmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvcnRcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gY3JlYXRlIHJlY2VpdmUgdHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3JcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gc2VuZCBqb2luIHJlcXVlc3RcblxuICAgIC8vIGFkZCBwZWVycyB0byBwZWVycyBzZXJ2aWNlXG5cbiAgICAvLyBwcm9kdWNlIHVwZGF0ZVdlYmNhbSB1cGRhdGVNaWNcbiAgfVxuXG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvRGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvRGV2aWNlcyh0aGlzLl9hdWRpb0RldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZVdlYmNhbXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICd2aWRlb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1zW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0V2ViY2FtRGV2aWNlcyh0aGlzLl93ZWJjYW1zKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZVdlYmNhbXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBkaXNhYmxlV2ViY2FtKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlV2ViY2FtKCknKTtcblxuXHRcdGlmICghdGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVXZWJjYW0oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQodHJ1ZSkpO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG5cdH1cblx0YXN5bmMgZGlzYWJsZU1pYygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZU1pYygpJyk7XG5cblx0XHRpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRXZWJjYW1EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG5cblx0XHRcdGNvbnN0ICBzZWxlY3RlZFdlYmNhbSA9ICBudWxsXG5cblx0XHRcdGlmIChzZWxlY3RlZFdlYmNhbSAmJiB0aGlzLl93ZWJjYW1zW3NlbGVjdGVkV2ViY2FtXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkV2ViY2FtO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB3ZWJjYW1zID0gT2JqZWN0LnZhbHVlcyh0aGlzLl93ZWJjYW1zKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiB3ZWJjYW1zWzBdID8gd2ViY2Ftc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldFdlYmNhbURldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuICB9XG5cblxuXHRhc3luYyBfZ2V0QXVkaW9EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG5cbiAgICAgIGNvbnN0ICBzZWxlY3RlZEF1ZGlvRGV2aWNlID0gbnVsbDtcblxuXHRcdFx0aWYgKHNlbGVjdGVkQXVkaW9EZXZpY2UgJiYgdGhpcy5fYXVkaW9EZXZpY2VzW3NlbGVjdGVkQXVkaW9EZXZpY2VdKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRBdWRpb0RldmljZTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXVkaW9EZXZpY2VzID0gT2JqZWN0LnZhbHVlcyh0aGlzLl9hdWRpb0RldmljZXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIGF1ZGlvRGV2aWNlc1swXSA/IGF1ZGlvRGV2aWNlc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldEF1ZGlvRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9vdXRwdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0RGV2aWNlcyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblxuXG4gIGFzeW5jIF9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX2pvaW5Sb29tKCkgRGV2aWNlJywgdGhpcy5fZGV2aWNlKTtcblxuICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYEd1ZXN0ICR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDEwMDAwMCAtIDEwMDAwKSkgKyAxMDAwMH1gXG5cblxuICAgIHRyeSB7XG5cblxuICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2Uoe2hhbmRsZXJOYW1lOidTYWZhcmkxMid9KTtcblxuICAgICAgY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgICAgcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgICAgICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgICBwcm9kdWNpbmc6IHRydWUsXG4gICAgICAgICAgICBjb25zdW1pbmc6IGZhbHNlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVNlbmRUcmFuc3BvcnQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHByb3ByaWV0YXJ5Q29uc3RyYWludHM6IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAncHJvZHVjZScsIGFzeW5jICh7IGtpbmQsIHJ0cFBhcmFtZXRlcnMsIGFwcERhdGEgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgY29uc3QgeyBpZCB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgICAncHJvZHVjZScsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgYXBwRGF0YVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FsbGJhY2soeyBpZCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBlcnJiYWNrKGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICBwcm9kdWNpbmc6IGZhbHNlLFxuICAgICAgICAgIGNvbnN1bWluZzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBpZCxcbiAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVJlY3ZUcmFuc3BvcnQoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0Lm9uKFxuICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAge1xuICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgb3VyIG1lZGlhIGNhcGFiaWxpdGllcy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRNZWRpYUNhcGFiaWxpdGllcyhcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdGNhblNlbmRNaWMgICAgIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksXG4gICAgICAvLyBcdFx0Y2FuU2VuZFdlYmNhbSAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZVNjcmVlbiA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpICYmXG4gICAgICAvLyBcdFx0XHR0aGlzLl9zY3JlZW5TaGFyaW5nLmlzU2NyZWVuU2hhcmVBdmFpbGFibGUoKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZUZpbGVzIDogdGhpcy5fdG9ycmVudFN1cHBvcnRcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgdHJhY2tlcixcbiAgICAgICAgcm9vbVBlcm1pc3Npb25zLFxuICAgICAgICB1c2VyUm9sZXMsXG4gICAgICAgIGFsbG93V2hlblJvbGVNaXNzaW5nLFxuICAgICAgICBjaGF0SGlzdG9yeSxcbiAgICAgICAgZmlsZUhpc3RvcnksXG4gICAgICAgIGxhc3ROSGlzdG9yeSxcbiAgICAgICAgbG9ja2VkLFxuICAgICAgICBsb2JieVBlZXJzLFxuICAgICAgICBhY2Nlc3NDb2RlXG4gICAgICB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnam9pbicsXG4gICAgICAgIHtcbiAgICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG5cbiAgICAgICAgICBydHBDYXBhYmlsaXRpZXM6IHRoaXMuX21lZGlhc291cERldmljZS5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnX2pvaW5Sb29tKCkgam9pbmVkIFthdXRoZW50aWNhdGVkOlwiJXNcIiwgcGVlcnM6XCIlb1wiLCByb2xlczpcIiVvXCIsIHVzZXJSb2xlczpcIiVvXCJdJyxcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICB1c2VyUm9sZXNcbiAgICAgICk7XG5cblxuXG5cblxuICAgICAgLy8gZm9yIChjb25zdCBwZWVyIG9mIHBlZXJzKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRwZWVyQWN0aW9ucy5hZGRQZWVyKHsgLi4ucGVlciwgY29uc3VtZXJzOiBbXSB9KSk7XG4gICAgICAvLyB9XG5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ2pvaW4gYXVkaW8nLGpvaW5BdWRpbyAsICdjYW4gcHJvZHVjZSBhdWRpbycsXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksICcgdGhpcy5fbXV0ZWQnLCB0aGlzLl9tdXRlZClcbiAgICAgIC8vIERvbid0IHByb2R1Y2UgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQgdG8gbm90IHRvIGRvIGl0LlxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5WaWRlb1xuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IGluaXQ6IHRydWUsIHN0YXJ0OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luQXVkaW8gJiZcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKVxuICAgICAgICApXG4gICAgICAgICAgaWYgKCF0aGlzLl9tdXRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIGNvbnN0ICBzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICA9IG51bGxcblxuICAgICAgLy8gaWYgKCFzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICYmIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyAhPT0ge30pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKFxuICAgICAgLy8gXHRcdFx0T2JqZWN0LmtleXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKVswXVxuICAgICAgLy8gXHRcdClcbiAgICAgIC8vIFx0KTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cbiAgICAgIC8vIC8vIENsZWFuIGFsbCB0aGUgZXhpc3Rpbmcgbm90aWZpY2F0aW9ucy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG5vdGlmaWNhdGlvbkFjdGlvbnMucmVtb3ZlQWxsTm90aWZpY2F0aW9ucygpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0dGV4dCA6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyBcdFx0XHRpZCAgICAgICAgICAgICA6ICdyb29tLmpvaW5lZCcsXG4gICAgICAvLyBcdFx0XHRkZWZhdWx0TWVzc2FnZSA6ICdZb3UgaGF2ZSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAvLyBcdFx0fSlcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5hZGRQZWVycyhwZWVycyk7XG5cblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfam9pblJvb20oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuXG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG4gIGRldmljZUluZm8oKSB7XG4gICAgY29uc3QgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGNvbnN0IGJyb3dzZXIgPSBib3dzZXIuZ2V0UGFyc2VyKHVhKTtcblxuICAgIGxldCBmbGFnO1xuXG4gICAgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgY2hyb21lOiAnPj0wJywgY2hyb21pdW06ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdjaHJvbWUnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgZmlyZWZveDogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2ZpcmVmb3gnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgc2FmYXJpOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnc2FmYXJpJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IG9wZXJhOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnb3BlcmEnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgJ21pY3Jvc29mdCBlZGdlJzogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2VkZ2UnO1xuICAgIGVsc2VcbiAgICAgIGZsYWcgPSAndW5rbm93bic7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmxhZyxcbiAgICAgIG9zOiBicm93c2VyLmdldE9TTmFtZSh0cnVlKSwgLy8gaW9zLCBhbmRyb2lkLCBsaW51eC4uLlxuICAgICAgcGxhdGZvcm06IGJyb3dzZXIuZ2V0UGxhdGZvcm1UeXBlKHRydWUpLCAvLyBtb2JpbGUsIGRlc2t0b3AsIHRhYmxldFxuICAgICAgbmFtZTogYnJvd3Nlci5nZXRCcm93c2VyTmFtZSh0cnVlKSxcbiAgICAgIHZlcnNpb246IGJyb3dzZXIuZ2V0QnJvd3NlclZlcnNpb24oKSxcbiAgICAgIGJvd3NlcjogYnJvd3NlclxuICAgIH07XG5cbiAgfVxufVxuIl19
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
                        // this._mediasoupDevice = new mediasoupClient.Device({handlerName:'Safari12'});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxJQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixJQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsSUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLElBQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELElBQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFT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InNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IFJlbW90ZVBlZXJzU2VydmljZSB9IGZyb20gJy4vcmVtb3RlLXBlZXJzLnNlcnZpY2UnO1xuaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgU2lnbmFsaW5nU2VydmljZSB9IGZyb20gJy4vc2lnbmFsaW5nLnNlcnZpY2UnO1xuXG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IHN3aXRjaE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBib3dzZXIgZnJvbSAnYm93c2VyJztcblxuaW1wb3J0ICogYXMgbWVkaWFzb3VwQ2xpZW50IGZyb20gJ21lZGlhc291cC1jbGllbnQnXG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgaGFyayBmcm9tICdoYXJrJztcblxuXG5sZXQgc2F2ZUFzO1xuXG5cbmNvbnN0IGxhc3ROID0gNFxuY29uc3QgbW9iaWxlTGFzdE4gPSAxXG5jb25zdCB2aWRlb0FzcGVjdFJhdGlvID0gMS43NzdcblxuY29uc3Qgc2ltdWxjYXN0ID0gdHJ1ZTtcbmNvbnN0IFx0c2ltdWxjYXN0RW5jb2RpbmdzICAgPSBbXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiA0IH0sXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAyIH0sXG4gIHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxIH1cbl1cblxuXG5jb25zdCBWSURFT19DT05TVFJBSU5TID1cbntcblx0J2xvdycgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzMjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J21lZGl1bScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiA2NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J2hpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTI4MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndmVyeWhpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTkyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndWx0cmEnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzg0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9XG59O1xuXG5jb25zdCBQQ19QUk9QUklFVEFSWV9DT05TVFJBSU5UUyA9XG57XG5cdG9wdGlvbmFsIDogWyB7IGdvb2dEc2NwOiB0cnVlIH0gXVxufTtcblxuY29uc3QgVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiA0LCBtYXhCaXRSYXRlOiAxMDAwMDAgfSxcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEsIG1heEJpdFJhdGU6IDEyMDAwMDAgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IHdlYmNhbSB2aWRlby5cbmNvbnN0IFZJREVPX0tTVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzX0tFWScgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IGRlc2t0b3Agc2hhcmluZy5cbmNvbnN0IFZJREVPX1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDMnLCBkdHg6IHRydWUgfVxuXTtcblxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCAgY2xhc3MgUm9vbVNlcnZpY2Uge1xuXG5cblxuICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gIF9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcbiAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gIF9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgX3Byb2R1Y2UgPSB0cnVlO1xuXG4gIF9mb3JjZVRjcCA9IGZhbHNlO1xuXG4gIF9tdXRlZFxuICBfZGV2aWNlXG4gIF9wZWVySWRcbiAgX3NvdW5kQWxlcnRcbiAgX3Jvb21JZFxuICBfbWVkaWFzb3VwRGV2aWNlXG5cbiAgX21pY1Byb2R1Y2VyXG4gIF9oYXJrXG4gIF9oYXJrU3RyZWFtXG4gIF93ZWJjYW1Qcm9kdWNlclxuICBfZXh0cmFWaWRlb1Byb2R1Y2Vyc1xuICBfd2ViY2Ftc1xuICBfYXVkaW9EZXZpY2VzXG4gIF9hdWRpb091dHB1dERldmljZXNcbiAgX2NvbnN1bWVyc1xuICBfdXNlU2ltdWxjYXN0XG4gIF90dXJuU2VydmVyc1xuXG4gIHN1YnNjcmlwdGlvbnMgPSBbXTtcbiAgcHVibGljIG9uQ2FtUHJvZHVjaW5nOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBwdWJsaWMgb25Wb2x1bWVDaGFuZ2U6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgc2lnbmFsaW5nU2VydmljZTogU2lnbmFsaW5nU2VydmljZSxcbiAgICBwcml2YXRlIGxvZ2dlcjogTG9nU2VydmljZSxcbiAgcHJpdmF0ZSByZW1vdGVQZWVyc1NlcnZpY2U6IFJlbW90ZVBlZXJzU2VydmljZSkge1xuXG5cbiAgfVxuXG4gIGluaXQoe1xuICAgIHBlZXJJZD1udWxsLFxuXG4gICAgcHJvZHVjZT10cnVlLFxuICAgIGZvcmNlVGNwPWZhbHNlLFxuICAgIG11dGVkPWZhbHNlXG4gIH0gPSB7fSkge1xuICAgIGlmICghcGVlcklkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHBlZXJJZCcpO1xuXG5cbiAgICAvLyBsb2dnZXIuZGVidWcoXG4gICAgLy8gICAnY29uc3RydWN0b3IoKSBbcGVlcklkOiBcIiVzXCIsIGRldmljZTogXCIlc1wiLCBwcm9kdWNlOiBcIiVzXCIsIGZvcmNlVGNwOiBcIiVzXCIsIGRpc3BsYXlOYW1lIFwiXCJdJyxcbiAgICAvLyAgIHBlZXJJZCwgZGV2aWNlLmZsYWcsIHByb2R1Y2UsIGZvcmNlVGNwKTtcblxuXG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnSU5JVCBSb29tICcsIHBlZXJJZClcblxuICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgIC8vIFdoZXRoZXIgd2Ugc2hvdWxkIHByb2R1Y2UuXG4gICAgdGhpcy5fcHJvZHVjZSA9IHByb2R1Y2U7XG5cbiAgICAvLyBXaGV0aGVyIHdlIGZvcmNlIFRDUFxuICAgIHRoaXMuX2ZvcmNlVGNwID0gZm9yY2VUY3A7XG5cblxuXG5cbiAgICAvLyBXaGV0aGVyIHNpbXVsY2FzdCBzaG91bGQgYmUgdXNlZC5cbiAgICAvLyB0aGlzLl91c2VTaW11bGNhc3QgPSBmYWxzZTtcblxuICAgIC8vIGlmICgnc2ltdWxjYXN0JyBpbiB3aW5kb3cuY29uZmlnKVxuICAgIC8vICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gd2luZG93LmNvbmZpZy5zaW11bGNhc3Q7XG5cblxuXG5cblxuICAgIHRoaXMuX211dGVkID0gbXV0ZWQ7XG5cbiAgICAvLyBUaGlzIGRldmljZVxuICAgIHRoaXMuX2RldmljZSA9IHRoaXMuZGV2aWNlSW5mbygpO1xuXG4gICAgLy8gTXkgcGVlciBuYW1lLlxuICAgIHRoaXMuX3BlZXJJZCA9IHBlZXJJZDtcblxuXG5cbiAgICAvLyBBbGVydCBzb3VuZFxuICAgIC8vIHRoaXMuX3NvdW5kQWxlcnQgPSBuZXcgQXVkaW8oJy9zb3VuZHMvbm90aWZ5Lm1wMycpO1xuXG5cblxuXG4gICAgLy8gVGhlIHJvb20gSURcbiAgICB0aGlzLl9yb29tSWQgPSBudWxsO1xuXG4gICAgLy8gbWVkaWFzb3VwLWNsaWVudCBEZXZpY2UgaW5zdGFuY2UuXG4gICAgLy8gQHR5cGUge21lZGlhc291cENsaWVudC5EZXZpY2V9XG4gICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbnVsbDtcblxuXG4gICAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBoYXJrXG4gICAgdGhpcy5faGFyayA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBNZWRpYVN0cmVhbSBmb3IgaGFya1xuICAgIHRoaXMuX2hhcmtTdHJlYW0gPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgd2ViY2FtIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBFeHRyYSB2aWRlb3MgYmVpbmcgcHJvZHVjZWRcbiAgICB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gTWFwIG9mIHdlYmNhbSBNZWRpYURldmljZUluZm9zIGluZGV4ZWQgYnkgZGV2aWNlSWQuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIE1lZGlhRGV2aWNlSW5mb3M+fVxuICAgIHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cbiAgICAvLyBtZWRpYXNvdXAgQ29uc3VtZXJzLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBtZWRpYXNvdXBDbGllbnQuQ29uc3VtZXI+fVxuICAgIHRoaXMuX2NvbnN1bWVycyA9IG5ldyBNYXAoKTtcblxuICAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHNpbXVsY2FzdFxuXG4gICAgLy8gdGhpcy5fc3RhcnRLZXlMaXN0ZW5lcigpO1xuXG4gICAgLy8gdGhpcy5fc3RhcnREZXZpY2VzTGlzdGVuZXIoKTtcblxuICB9XG4gIGNsb3NlKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJywgdGhpcy5fY2xvc2VkKTtcblxuICAgIGlmICh0aGlzLl9jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknKTtcblxuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5jbG9zZSgpO1xuXG4gICAgLy8gQ2xvc2UgbWVkaWFzb3VwIFRyYW5zcG9ydHMuXG4gICAgaWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICBpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5mb3JFYWNoKHN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxuICAgIH0pXG5cbiAgICB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKVxuICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsZWFyUGVlcnMoKVxuICB9XG5cbiAgLy8gX3N0YXJ0S2V5TGlzdGVuZXIoKSB7XG4gIC8vICAgLy8gQWRkIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgb24gZG9jdW1lbnRcbiAgLy8gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gIC8vICAgICBpZiAoZXZlbnQucmVwZWF0KSByZXR1cm47XG4gIC8vICAgICBjb25zdCBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKTtcblxuICAvLyAgICAgY29uc3Qgc291cmNlID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vICAgICBjb25zdCBleGNsdWRlID0gWydpbnB1dCcsICd0ZXh0YXJlYSddO1xuXG4gIC8vICAgICBpZiAoZXhjbHVkZS5pbmRleE9mKHNvdXJjZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2tleURvd24oKSBba2V5OlwiJXNcIl0nLCBrZXkpO1xuXG4gIC8vICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgLy8gICAgICAgICAvKlxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzNyk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXRQcmV2QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzOSk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXROZXh0QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgICAqL1xuXG5cbiAgLy8gICAgICAgICBjYXNlICdNJzogLy8gVG9nZ2xlIG1pY3JvcGhvbmVcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQpIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLnVubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbm11dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFbmFibGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRW5hYmxlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgIH1cblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ1YnOiAvLyBUb2dnbGUgdmlkZW9cbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ0gnOiAvLyBPcGVuIGhlbHAgZGlhbG9nXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEhlbHBPcGVuKHRydWUpKTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGRlZmF1bHQ6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG5cblxuICAvLyB9XG5cbiAgX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlY2hhbmdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgYXN5bmMgbXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ3BhdXNlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUGF1c2VkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZCh0cnVlKSk7XG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdW5tdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdyZXN1bWVQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUmVzdW1lZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXHRkaXNjb25uZWN0TG9jYWxIYXJrKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNjb25uZWN0TG9jYWxIYXJrKCknKTtcblxuXHRcdGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpXG5cdFx0e1xuXHRcdFx0bGV0IFsgdHJhY2sgXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuXHRcdFx0dHJhY2suc3RvcCgpO1xuXHRcdFx0dHJhY2sgPSBudWxsO1xuXG5cdFx0XHR0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5faGFyayAhPSBudWxsKVxuXHRcdFx0dGhpcy5faGFyay5zdG9wKCk7XG5cdH1cblxuXHRjb25uZWN0TG9jYWxIYXJrKHRyYWNrKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Nvbm5lY3RMb2NhbEhhcmsoKSBbdHJhY2s6XCIlb1wiXScsIHRyYWNrKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuXHRcdGNvbnN0IG5ld1RyYWNrID0gdHJhY2suY2xvbmUoKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0uYWRkVHJhY2sobmV3VHJhY2spO1xuXG5cdFx0bmV3VHJhY2suZW5hYmxlZCA9IHRydWU7XG5cblx0XHR0aGlzLl9oYXJrID0gaGFyayh0aGlzLl9oYXJrU3RyZWFtLFxuXHRcdFx0e1xuXHRcdFx0XHRwbGF5ICAgICAgOiBmYWxzZSxcblx0XHRcdFx0aW50ZXJ2YWwgIDogMTAsXG5cdFx0XHRcdHRocmVzaG9sZCA6IC01MCxcblx0XHRcdFx0aGlzdG9yeSAgIDogMTAwXG5cdFx0XHR9KTtcblxuXHRcdHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IC0xMDA7XG5cblx0XHR0aGlzLl9oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICB7XG4gICAgICAvLyBVcGRhdGUgb25seSBpZiB0aGVyZSBpcyBhIGJpZ2dlciBkaWZmXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIgJiYgTWF0aC5hYnModm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSA+IDAuNSlcblx0XHRcdHtcbiAgICAgICAgLy8gRGVjYXkgY2FsY3VsYXRpb246IGtlZXAgaW4gbWluZCB0aGF0IHZvbHVtZSByYW5nZSBpcyAtMTAwIC4uLiAwIChkQilcblx0XHRcdFx0Ly8gVGhpcyBtYWtlcyBkZWNheSB2b2x1bWUgZmFzdCBpZiBkaWZmZXJlbmNlIHRvIGxhc3Qgc2F2ZWQgdmFsdWUgaXMgYmlnXG5cdFx0XHRcdC8vIGFuZCBzbG93IGZvciBzbWFsbCBjaGFuZ2VzLiBUaGlzIHByZXZlbnRzIGZsaWNrZXJpbmcgdm9sdW1lIGluZGljYXRvclxuXHRcdFx0XHQvLyBhdCBsb3cgbGV2ZWxzXG5cdFx0XHRcdGlmICh2b2x1bWUgPCB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpXG5cdFx0XHRcdHtcbiAgICAgICAgICB2b2x1bWUgPVxuICAgICAgICAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSAtXG4gICAgICAgICAgTWF0aC5wb3coXG4gICAgICAgICAgICAodm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSAvXG4gICAgICAgICAgICAoMTAwICsgdGhpcy5faGFyay5sYXN0Vm9sdW1lKVxuICAgICAgICAgICAgLCAyXG5cdFx0XHRcdFx0XHQpICogMTA7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnVk9MVU1FIENIQU5HRSBIQVJLJyk7XG5cbiAgICAgICAgLy8gdGhpcy5vblZvbHVtZUNoYW5nZS5uZXh0KHtwZWVyOnRoaXMuX3BlZXJJZCwgdm9sdW1lfSlcblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZSh0aGlzLl9wZWVySWQsIHZvbHVtZSkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3BlYWtpbmcnLCAoKSA9PlxuXHRcdC8vIHtcblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKHRydWUpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHQoc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSB8fFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLm1lLmlzQXV0b011dGVkKSAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlciAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdXRvTXV0ZWQoZmFsc2UpKTsgLy8gc2FuaXR5IGFjdGlvblxuXHRcdC8vIH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3RvcHBlZF9zcGVha2luZycsICgpID0+XG5cdFx0Ly8ge1xuXHRcdC8vIFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldElzU3BlYWtpbmcoZmFsc2UpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLnZvaWNlQWN0aXZhdGVkVW5tdXRlICYmXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyICYmXG5cdFx0Ly8gXHRcdCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdHtcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuXHRcdC8vIFx0XHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKHRydWUpKTtcblx0XHQvLyBcdH1cblx0XHQvLyB9KTtcblx0fVxuXG4gIGFzeW5jIGNoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2RldmljZUlkOlwiJXNcIl0nLCBkZXZpY2VJZCk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbGVjdGVkIGF1ZGlvIG91dHB1dCBkZXZpY2Ugbm8gbG9uZ2VyIGF2YWlsYWJsZScpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIE9ubHkgRmlyZWZveCBzdXBwb3J0cyBhcHBseUNvbnN0cmFpbnRzIHRvIGF1ZGlvIHRyYWNrc1xuICAvLyBTZWU6XG4gIC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTc5Njk2NFxuICBhc3luYyB1cGRhdGVNaWMoe1xuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlIHx8IHRoaXMuX2RldmljZS5mbGFnICE9PSAnZmlyZWZveCcsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZU1pYygpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIGF1ZGlvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldEF1ZGlvRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGF1ZGlvIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgYXV0b0dhaW5Db250cm9sID0gZmFsc2U7XG4gICAgICBjb25zdCBlY2hvQ2FuY2VsbGF0aW9uID0gdHJ1ZVxuICAgICAgY29uc3Qgbm9pc2VTdXBwcmVzc2lvbiA9IHRydWVcblxuICAgICAgLy8gaWYgKCF3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnMpIHtcbiAgICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgLy8gICAgICdNaXNzaW5nIGNlbnRyYWxBdWRpb09wdGlvbnMgZnJvbSBhcHAgY29uZmlnISAoU2VlIGl0IGluIGV4YW1wbGUgY29uZmlnLiknXG4gICAgICAvLyAgICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc2FtcGxlUmF0ZSA9IDk2MDAwLFxuICAgICAgICBjaGFubmVsQ291bnQgPSAxLFxuICAgICAgICB2b2x1bWUgPSAxLjAsXG4gICAgICAgIHNhbXBsZVNpemUgPSAxNixcbiAgICAgICAgb3B1c1N0ZXJlbyA9IGZhbHNlLFxuICAgICAgICBvcHVzRHR4ID0gdHJ1ZSxcbiAgICAgICAgb3B1c0ZlYyA9IHRydWUsXG4gICAgICAgIG9wdXNQdGltZSA9IDIwLFxuICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlID0gOTYwMDBcbiAgICAgIH0gPSB7fTtcblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl9taWNQcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKTtcblxuICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlTWljKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb3B1c1N0ZXJlbyxcbiAgICAgICAgICAgICAgb3B1c0R0eCxcbiAgICAgICAgICAgICAgb3B1c0ZlYyxcbiAgICAgICAgICAgICAgb3B1c1B0aW1lLFxuICAgICAgICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAgeyBzb3VyY2U6ICdtaWMnIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnbWljJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX21pY1Byb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNaWNyb3Bob25lIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZU1pYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci52b2x1bWUgPSAwO1xuXG4gICAgICAgIHRoaXMuY29ubmVjdExvY2FsSGFyayh0cmFjayk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fbWljUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgW2hhcmtUcmFja10gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cbiAgICAgICAgICBoYXJrVHJhY2sgJiYgYXdhaXQgaGFya1RyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVXZWJjYW0oe1xuICAgIGluaXQgPSBmYWxzZSxcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGwsXG4gICAgbmV3UmVzb2x1dGlvbiA9IG51bGwsXG4gICAgbmV3RnJhbWVSYXRlID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVXZWJjYW0oKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiLCBuZXdSZXNvbHV0aW9uOlwiJXNcIiwgbmV3RnJhbWVSYXRlOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWQsXG4gICAgICBuZXdSZXNvbHV0aW9uLFxuICAgICAgbmV3RnJhbWVSYXRlXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIHZpZGVvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBpZiAobmV3UmVzb2x1dGlvbilcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvUmVzb2x1dGlvbihuZXdSZXNvbHV0aW9uKSk7XG5cbiAgICAgIC8vIGlmIChuZXdGcmFtZVJhdGUpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb0ZyYW1lUmF0ZShuZXdGcmFtZVJhdGUpKTtcblxuICAgICAgY29uc3QgIHZpZGVvTXV0ZWQgID0gZmFsc2VcblxuICAgICAgaWYgKGluaXQgJiYgdmlkZW9NdXRlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgLy8gZWxzZVxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX3dlYmNhbXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCAgcmVzb2x1dGlvbiA9ICdtZWRpdW0nXG4gICAgICBjb25zdCBmcmFtZVJhdGUgPSAxNVxuXG5cblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlkZW86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICAgICAgLmNvZGVjc1xuICAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAgICAgICAgIGVsc2UgaWYgKHNpbXVsY2FzdEVuY29kaW5ncylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IHNpbXVsY2FzdEVuY29kaW5ncztcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IHdlYkNhbVN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICAgICAgICB3ZWJDYW1TdHJlYW0uc2V0UHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIHRoaXMub25DYW1Qcm9kdWNpbmcubmV4dCh3ZWJDYW1TdHJlYW0pXG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2VNZWV0aW5nKCknKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAnbW9kaWZ5UGVlckNvbnN1bWVyKCkgW3BlZXJJZDpcIiVzXCIsIHR5cGU6XCIlc1wiXScsXG4gICAgICBwZWVySWQsXG4gICAgICB0eXBlXG4gICAgKTtcblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChjb25zdCBjb25zdW1lciBvZiB0aGlzLl9jb25zdW1lcnMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKGNvbnN1bWVyLmFwcERhdGEucGVlcklkID09PSBwZWVySWQgJiYgY29uc3VtZXIuYXBwRGF0YS5zb3VyY2UgPT09IHR5cGUpIHtcbiAgICAgICAgICBpZiAobXV0ZSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncGF1c2VDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnBhdXNlKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdyZXN1bWVDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnJlc3VtZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8sIHRva2VuIH0pIHtcblxuXG4gICAgdGhpcy5fcm9vbUlkID0gcm9vbUlkO1xuXG5cbiAgICAvLyBpbml0aWFsaXplIHNpZ25hbGluZyBzb2NrZXRcbiAgICAvLyBsaXN0ZW4gdG8gc29ja2V0IGV2ZW50c1xuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5pbml0KHRva2VuKVxuICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uRGlzY29ubmVjdGVkLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcbiAgICAgIC8vIHRoaXMuY2xvc2VcbiAgICB9KSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25SZWNvbm5lY3Rpbmcuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuXG4gICAgICB0aGlzLmxvZ2dlci5sb2coJ1JlY29ubmVjdGluZy4uLicpXG5cblxuXHRcdFx0aWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xlYXJQZWVycygpO1xuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGluZycpKTtcbiAgICB9KSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5ld0NvbnN1bWVyLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChkYXRhKSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHBlZXJJZCxcbiAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgaWQsXG4gICAgICAgIGtpbmQsXG4gICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFwcERhdGEsXG4gICAgICAgIHByb2R1Y2VyUGF1c2VkXG4gICAgICB9ID0gZGF0YTtcblxuICAgICAgY29uc3QgY29uc3VtZXIgID0gYXdhaXQgdGhpcy5fcmVjdlRyYW5zcG9ydC5jb25zdW1lKFxuICAgICAgICB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgICBraW5kLFxuICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgYXBwRGF0YSA6IHsgLi4uYXBwRGF0YSwgcGVlcklkIH0gLy8gVHJpY2suXG4gICAgICAgIH0pIGFzIG1lZGlhc291cENsaWVudC50eXBlcy5Db25zdW1lcjtcblxuICAgICAgLy8gU3RvcmUgaW4gdGhlIG1hcC5cbiAgICAgIHRoaXMuX2NvbnN1bWVycy5zZXQoY29uc3VtZXIuaWQsIGNvbnN1bWVyKTtcblxuICAgICAgY29uc3VtZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT5cbiAgICAgIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lci5pZCk7XG4gICAgICB9KTtcblxuXG5cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3Q29uc3VtZXIoY29uc3VtZXIsICBwZWVySWQsIHR5cGUsIHByb2R1Y2VyUGF1c2VkKTtcblxuICAgICAgLy8gV2UgYXJlIHJlYWR5LiBBbnN3ZXIgdGhlIHJlcXVlc3Qgc28gdGhlIHNlcnZlciB3aWxsXG4gICAgICAvLyByZXN1bWUgdGhpcyBDb25zdW1lciAod2hpY2ggd2FzIHBhdXNlZCBmb3Igbm93KS5cblxuXG4gICAgICAvLyBpZiAoa2luZCA9PT0gJ2F1ZGlvJylcbiAgICAgIC8vIHtcbiAgICAgIC8vICAgY29uc3VtZXIudm9sdW1lID0gMDtcblxuICAgICAgLy8gICBjb25zdCBzdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuICAgICAgLy8gICBzdHJlYW0uYWRkVHJhY2soY29uc3VtZXIudHJhY2spO1xuXG4gICAgICAvLyAgIGlmICghc3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF0pXG4gICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXF1ZXN0Lm5ld0NvbnN1bWVyIHwgZ2l2ZW4gc3RyZWFtIGhhcyBubyBhdWRpbyB0cmFjaycpO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsgPSBoYXJrKHN0cmVhbSwgeyBwbGF5OiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICAgICAgLy8ge1xuICAgICAgICAvLyAgIHZvbHVtZSA9IE1hdGgucm91bmQodm9sdW1lKTtcblxuICAgICAgICAvLyAgIGlmIChjb25zdW1lciAmJiB2b2x1bWUgIT09IGNvbnN1bWVyLnZvbHVtZSlcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBjb25zdW1lci52b2x1bWUgPSB2b2x1bWU7XG5cbiAgICAgICAgLy8gICAgIC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUocGVlcklkLCB2b2x1bWUpKTtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH0pO1xuICAgICAgLy8gfVxuXG4gICAgfSkpLnN1YnNjcmliZSgpKVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTm90aWZpY2F0aW9uLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG4gICAgICAgIG5vdGlmaWNhdGlvbi5tZXRob2QsIG5vdGlmaWNhdGlvbi5kYXRhKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoIChub3RpZmljYXRpb24ubWV0aG9kKSB7XG5cblxuXG4gICAgICAgICAgY2FzZSAncHJvZHVjZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcHJvZHVjZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclNjb3JlKHByb2R1Y2VySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICduZXdQZWVyJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyQWN0aW9ucy5hZGRQZWVyKFxuICAgICAgICAgICAgICAvLyAgIHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcywgY29uc3VtZXJzOiBbXSB9KSk7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3UGVlcihpZCk7XG5cbiAgICAgICAgICAgICAgLy8gdGhpcy5fc291bmROb3RpZmljYXRpb24oKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgICAgIC8vICAge1xuICAgICAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgLy8gICAgICAgaWQ6ICdyb29tLm5ld1BlZXInLFxuICAgICAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ3tkaXNwbGF5TmFtZX0gam9pbmVkIHRoZSByb29tJ1xuICAgICAgICAgICAgICAvLyAgICAgfSwge1xuICAgICAgICAgICAgICAvLyAgICAgICBkaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdwZWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsb3NlUGVlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHBlZXJBY3Rpb25zLnJlbW92ZVBlZXIocGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNvbnN1bWVyLmNsb3NlKCk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvbnN1bWVyLmhhcmsgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb25zdW1lci5oYXJrLnN0b3AoKTtcblxuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBjb25zdW1lci5hcHBEYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5yZW1vdmVDb25zdW1lcihjb25zdW1lcklkLCBwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUGF1c2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclJlc3VtZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckxheWVyc0NoYW5nZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm9uQ29uc3VtZXJMYXllckNoYW5nZWQoY29uc3VtZXJJZClcbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyQ3VycmVudExheWVycyhcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJTY29yZShjb25zdW1lcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncm9vbUJhY2snOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY2FzZSAncm9vbVJlYWR5JzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7IHR1cm5TZXJ2ZXJzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAgICAgdGhpcy5fdHVyblNlcnZlcnMgPSB0dXJuU2VydmVycztcblxuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMudG9nZ2xlSm9pbmVkKCkpO1xuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SW5Mb2JieShmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZVNwZWFrZXInOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG5cblxuICAgICAgICAgICAgICBpZiAocGVlcklkID09PSB0aGlzLl9wZWVySWQpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMub25Wb2x1bWVDaGFuZ2UubmV4dChub3RpZmljYXRpb24uZGF0YSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyB0aGlzLl9zcG90bGlnaHRzLmhhbmRsZUFjdGl2ZVNwZWFrZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLy8gdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIC8vICAgJ3Vua25vd24gbm90aWZpY2F0aW9uLm1ldGhvZCBcIiVzXCInLCBub3RpZmljYXRpb24ubWV0aG9kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdlcnJvciBvbiBzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnc29ja2V0LnJlcXVlc3RFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRXJyb3Igb24gc2VydmVyIHJlcXVlc3QnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcbiAgICAvLyBvbiByb29tIHJlYWR5IGpvaW4gcm9vbSBfam9pblJvb21cblxuICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAvLyBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgIC8vICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAvLyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgLy8gICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgLy8gYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAvLyBjcmVhdGUgc2VuZCB0cmFuc3BvcnQgY3JlYXRlV2ViUnRjVHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3J0XG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIGNyZWF0ZSByZWNlaXZlIHRyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9yXG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIHNlbmQgam9pbiByZXF1ZXN0XG5cbiAgICAvLyBhZGQgcGVlcnMgdG8gcGVlcnMgc2VydmljZVxuXG4gICAgLy8gcHJvZHVjZSB1cGRhdGVXZWJjYW0gdXBkYXRlTWljXG4gIH1cblxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb0RldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb0RldmljZXModGhpcy5fYXVkaW9EZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVXZWJjYW1zKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl93ZWJjYW1zID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAndmlkZW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2Ftc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldFdlYmNhbURldmljZXModGhpcy5fd2ViY2FtcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVXZWJjYW1zKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgZGlzYWJsZVdlYmNhbSgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZVdlYmNhbSgpJyk7XG5cblx0XHRpZiAoIXRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKHRydWUpKTtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuXHR9XG5cdGFzeW5jIGRpc2FibGVNaWMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVNaWMoKScpO1xuXG5cdFx0aWYgKCF0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cblxuXHRhc3luYyBfZ2V0V2ViY2FtRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuXG5cdFx0XHRjb25zdCAgc2VsZWN0ZWRXZWJjYW0gPSAgbnVsbFxuXG5cdFx0XHRpZiAoc2VsZWN0ZWRXZWJjYW0gJiYgdGhpcy5fd2ViY2Ftc1tzZWxlY3RlZFdlYmNhbV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZFdlYmNhbTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgd2ViY2FtcyA9IE9iamVjdC52YWx1ZXModGhpcy5fd2ViY2Ftcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gd2ViY2Ftc1swXSA/IHdlYmNhbXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cbiAgfVxuXG5cblx0YXN5bmMgX2dldEF1ZGlvRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlQXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuXG4gICAgICBjb25zdCAgc2VsZWN0ZWRBdWRpb0RldmljZSA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxlY3RlZEF1ZGlvRGV2aWNlICYmIHRoaXMuX2F1ZGlvRGV2aWNlc1tzZWxlY3RlZEF1ZGlvRGV2aWNlXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkQXVkaW9EZXZpY2U7XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvRGV2aWNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5fYXVkaW9EZXZpY2VzKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiBhdWRpb0RldmljZXNbMF0gPyBhdWRpb0RldmljZXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRBdWRpb0RldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvb3V0cHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dERldmljZXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cblxuICBhc3luYyBfam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19qb2luUm9vbSgpIERldmljZScsIHRoaXMuX2RldmljZSk7XG5cbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGBHdWVzdCAke01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAgLSAxMDAwMCkpICsgMTAwMDB9YFxuXG5cbiAgICB0cnkge1xuXG5cbiAgICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKHtoYW5kbGVyTmFtZTonU2FmYXJpMTInfSk7XG4gICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgICBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgICByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgICAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICAgIHByb2R1Y2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnN1bWluZzogZmFsc2VcbiAgICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlU2VuZFRyYW5zcG9ydChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvcHJpZXRhcnlDb25zdHJhaW50czogUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFNcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdwcm9kdWNlJywgYXN5bmMgKHsga2luZCwgcnRwUGFyYW1ldGVycywgYXBwRGF0YSB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgICdwcm9kdWNlJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBhcHBEYXRhXG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayh7IGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGVycmJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgIHByb2R1Y2luZzogZmFsc2UsXG4gICAgICAgICAgY29uc3VtaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkLFxuICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlUmVjdlRyYW5zcG9ydChcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQub24oXG4gICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICB7XG4gICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBvdXIgbWVkaWEgY2FwYWJpbGl0aWVzLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldE1lZGlhQ2FwYWJpbGl0aWVzKFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0Y2FuU2VuZE1pYyAgICAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TZW5kV2ViY2FtICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlU2NyZWVuIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykgJiZcbiAgICAgIC8vIFx0XHRcdHRoaXMuX3NjcmVlblNoYXJpbmcuaXNTY3JlZW5TaGFyZUF2YWlsYWJsZSgpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlRmlsZXMgOiB0aGlzLl90b3JyZW50U3VwcG9ydFxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICB0cmFja2VyLFxuICAgICAgICByb29tUGVybWlzc2lvbnMsXG4gICAgICAgIHVzZXJSb2xlcyxcbiAgICAgICAgYWxsb3dXaGVuUm9sZU1pc3NpbmcsXG4gICAgICAgIGNoYXRIaXN0b3J5LFxuICAgICAgICBmaWxlSGlzdG9yeSxcbiAgICAgICAgbGFzdE5IaXN0b3J5LFxuICAgICAgICBsb2NrZWQsXG4gICAgICAgIGxvYmJ5UGVlcnMsXG4gICAgICAgIGFjY2Vzc0NvZGVcbiAgICAgIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdqb2luJyxcbiAgICAgICAge1xuICAgICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcblxuICAgICAgICAgIHJ0cENhcGFiaWxpdGllczogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdfam9pblJvb20oKSBqb2luZWQgW2F1dGhlbnRpY2F0ZWQ6XCIlc1wiLCBwZWVyczpcIiVvXCIsIHJvbGVzOlwiJW9cIiwgdXNlclJvbGVzOlwiJW9cIl0nLFxuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHVzZXJSb2xlc1xuICAgICAgKTtcblxuXG5cblxuXG4gICAgICAvLyBmb3IgKGNvbnN0IHBlZXIgb2YgcGVlcnMpXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHBlZXJBY3Rpb25zLmFkZFBlZXIoeyAuLi5wZWVyLCBjb25zdW1lcnM6IFtdIH0pKTtcbiAgICAgIC8vIH1cblxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnam9pbiBhdWRpbycsam9pbkF1ZGlvICwgJ2NhbiBwcm9kdWNlIGF1ZGlvJyxcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSwgJyB0aGlzLl9tdXRlZCcsIHRoaXMuX211dGVkKVxuICAgICAgLy8gRG9uJ3QgcHJvZHVjZSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCB0byBub3QgdG8gZG8gaXQuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pblZpZGVvXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgaW5pdDogdHJ1ZSwgc3RhcnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5BdWRpbyAmJlxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpXG4gICAgICAgIClcbiAgICAgICAgICBpZiAoIXRoaXMuX211dGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gY29uc3QgIHNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgID0gbnVsbFxuXG4gICAgICAvLyBpZiAoIXNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgJiYgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzICE9PSB7fSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0c2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoXG4gICAgICAvLyBcdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpWzBdXG4gICAgICAvLyBcdFx0KVxuICAgICAgLy8gXHQpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblxuICAgICAgLy8gLy8gQ2xlYW4gYWxsIHRoZSBleGlzdGluZyBub3RpZmljYXRpb25zLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobm90aWZpY2F0aW9uQWN0aW9ucy5yZW1vdmVBbGxOb3RpZmljYXRpb25zKCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHR0ZXh0IDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vIFx0XHRcdGlkICAgICAgICAgICAgIDogJ3Jvb20uam9pbmVkJyxcbiAgICAgIC8vIFx0XHRcdGRlZmF1bHRNZXNzYWdlIDogJ1lvdSBoYXZlIGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgIC8vIFx0XHR9KVxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmFkZFBlZXJzKHBlZXJzKTtcblxuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19qb2luUm9vbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbiAgZGV2aWNlSW5mbygpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodWEpO1xuXG4gICAgbGV0IGZsYWc7XG5cbiAgICBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBjaHJvbWU6ICc+PTAnLCBjaHJvbWl1bTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2Nocm9tZSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBmaXJlZm94OiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZmlyZWZveCc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBzYWZhcmk6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdzYWZhcmknO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgb3BlcmE6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdvcGVyYSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyAnbWljcm9zb2Z0IGVkZ2UnOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZWRnZSc7XG4gICAgZWxzZVxuICAgICAgZmxhZyA9ICd1bmtub3duJztcblxuICAgIHJldHVybiB7XG4gICAgICBmbGFnLFxuICAgICAgb3M6IGJyb3dzZXIuZ2V0T1NOYW1lKHRydWUpLCAvLyBpb3MsIGFuZHJvaWQsIGxpbnV4Li4uXG4gICAgICBwbGF0Zm9ybTogYnJvd3Nlci5nZXRQbGF0Zm9ybVR5cGUodHJ1ZSksIC8vIG1vYmlsZSwgZGVza3RvcCwgdGFibGV0XG4gICAgICBuYW1lOiBicm93c2VyLmdldEJyb3dzZXJOYW1lKHRydWUpLFxuICAgICAgdmVyc2lvbjogYnJvd3Nlci5nZXRCcm93c2VyVmVyc2lvbigpLFxuICAgICAgYm93c2VyOiBicm93c2VyXG4gICAgfTtcbiAgfVxufVxuIl19
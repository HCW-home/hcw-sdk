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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxJQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixJQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsSUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLElBQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELElBQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFT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QUFFLE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBSZW1vdGVQZWVyc1NlcnZpY2UgfSBmcm9tICcuL3JlbW90ZS1wZWVycy5zZXJ2aWNlJztcbmltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IFNpZ25hbGluZ1NlcnZpY2UgfSBmcm9tICcuL3NpZ25hbGluZy5zZXJ2aWNlJztcblxuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYm93c2VyIGZyb20gJ2Jvd3Nlcic7XG5cbmltcG9ydCAqIGFzIG1lZGlhc291cENsaWVudCBmcm9tICdtZWRpYXNvdXAtY2xpZW50J1xuaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IGhhcmsgZnJvbSAnaGFyayc7XG5cblxubGV0IHNhdmVBcztcblxuXG5jb25zdCBsYXN0TiA9IDRcbmNvbnN0IG1vYmlsZUxhc3ROID0gMVxuY29uc3QgdmlkZW9Bc3BlY3RSYXRpbyA9IDEuNzc3XG5cbmNvbnN0IHNpbXVsY2FzdCA9IHRydWU7XG5jb25zdCBcdHNpbXVsY2FzdEVuY29kaW5ncyAgID0gW1xuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMiB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSB9XG5dXG5cblxuY29uc3QgVklERU9fQ09OU1RSQUlOUyA9XG57XG5cdCdsb3cnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdtZWRpdW0nIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogNjQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdoaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDEyODAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3ZlcnloaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDE5MjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3VsdHJhJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDM4NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fVxufTtcblxuY29uc3QgUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFMgPVxue1xuXHRvcHRpb25hbCA6IFsgeyBnb29nRHNjcDogdHJ1ZSB9IF1cbn07XG5cbmNvbnN0IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCwgbWF4Qml0UmF0ZTogMTAwMDAwIH0sXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxLCBtYXhCaXRSYXRlOiAxMjAwMDAwIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSB3ZWJjYW0gdmlkZW8uXG5jb25zdCBWSURFT19LU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUM19LRVknIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSBkZXNrdG9wIHNoYXJpbmcuXG5jb25zdCBWSURFT19TVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzJywgZHR4OiB0cnVlIH1cbl07XG5cblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgIGNsYXNzIFJvb21TZXJ2aWNlIHtcblxuXG5cbiAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICBfc2VuZFRyYW5zcG9ydCA9IG51bGw7XG4gIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICBfcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIF9wcm9kdWNlID0gdHJ1ZTtcblxuICBfZm9yY2VUY3AgPSBmYWxzZTtcblxuICBfbXV0ZWRcbiAgX2RldmljZVxuICBfcGVlcklkXG4gIF9zb3VuZEFsZXJ0XG4gIF9yb29tSWRcbiAgX21lZGlhc291cERldmljZVxuXG4gIF9taWNQcm9kdWNlclxuICBfaGFya1xuICBfaGFya1N0cmVhbVxuICBfd2ViY2FtUHJvZHVjZXJcbiAgX2V4dHJhVmlkZW9Qcm9kdWNlcnNcbiAgX3dlYmNhbXNcbiAgX2F1ZGlvRGV2aWNlc1xuICBfYXVkaW9PdXRwdXREZXZpY2VzXG4gIF9jb25zdW1lcnNcbiAgX3VzZVNpbXVsY2FzdFxuICBfdHVyblNlcnZlcnNcblxuICBzdWJzY3JpcHRpb25zID0gW107XG4gIHB1YmxpYyBvbkNhbVByb2R1Y2luZzogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIG9uVm9sdW1lQ2hhbmdlOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHNpZ25hbGluZ1NlcnZpY2U6IFNpZ25hbGluZ1NlcnZpY2UsXG4gICAgcHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UsXG4gIHByaXZhdGUgcmVtb3RlUGVlcnNTZXJ2aWNlOiBSZW1vdGVQZWVyc1NlcnZpY2UpIHtcblxuXG4gIH1cblxuICBpbml0KHtcbiAgICBwZWVySWQ9bnVsbCxcblxuICAgIHByb2R1Y2U9dHJ1ZSxcbiAgICBmb3JjZVRjcD1mYWxzZSxcbiAgICBtdXRlZD1mYWxzZVxuICB9ID0ge30pIHtcbiAgICBpZiAoIXBlZXJJZClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBwZWVySWQnKTtcblxuXG4gICAgLy8gbG9nZ2VyLmRlYnVnKFxuICAgIC8vICAgJ2NvbnN0cnVjdG9yKCkgW3BlZXJJZDogXCIlc1wiLCBkZXZpY2U6IFwiJXNcIiwgcHJvZHVjZTogXCIlc1wiLCBmb3JjZVRjcDogXCIlc1wiLCBkaXNwbGF5TmFtZSBcIlwiXScsXG4gICAgLy8gICBwZWVySWQsIGRldmljZS5mbGFnLCBwcm9kdWNlLCBmb3JjZVRjcCk7XG5cblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lOSVQgUm9vbSAnLCBwZWVySWQpXG5cbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICAvLyBXaGV0aGVyIHdlIHNob3VsZCBwcm9kdWNlLlxuICAgIHRoaXMuX3Byb2R1Y2UgPSBwcm9kdWNlO1xuXG4gICAgLy8gV2hldGhlciB3ZSBmb3JjZSBUQ1BcbiAgICB0aGlzLl9mb3JjZVRjcCA9IGZvcmNlVGNwO1xuXG5cblxuXG4gICAgLy8gV2hldGhlciBzaW11bGNhc3Qgc2hvdWxkIGJlIHVzZWQuXG4gICAgLy8gdGhpcy5fdXNlU2ltdWxjYXN0ID0gZmFsc2U7XG5cbiAgICAvLyBpZiAoJ3NpbXVsY2FzdCcgaW4gd2luZG93LmNvbmZpZylcbiAgICAvLyAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHdpbmRvdy5jb25maWcuc2ltdWxjYXN0O1xuXG5cblxuXG5cbiAgICB0aGlzLl9tdXRlZCA9IG11dGVkO1xuXG4gICAgLy8gVGhpcyBkZXZpY2VcbiAgICB0aGlzLl9kZXZpY2UgPSB0aGlzLmRldmljZUluZm8oKTtcblxuICAgIC8vIE15IHBlZXIgbmFtZS5cbiAgICB0aGlzLl9wZWVySWQgPSBwZWVySWQ7XG5cblxuXG4gICAgLy8gQWxlcnQgc291bmRcbiAgICAvLyB0aGlzLl9zb3VuZEFsZXJ0ID0gbmV3IEF1ZGlvKCcvc291bmRzL25vdGlmeS5tcDMnKTtcblxuXG5cblxuICAgIC8vIFRoZSByb29tIElEXG4gICAgdGhpcy5fcm9vbUlkID0gbnVsbDtcblxuICAgIC8vIG1lZGlhc291cC1jbGllbnQgRGV2aWNlIGluc3RhbmNlLlxuICAgIC8vIEB0eXBlIHttZWRpYXNvdXBDbGllbnQuRGV2aWNlfVxuICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG51bGw7XG5cblxuICAgIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgaGFya1xuICAgIHRoaXMuX2hhcmsgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgTWVkaWFTdHJlYW0gZm9yIGhhcmtcbiAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblxuICAgIC8vIExvY2FsIHdlYmNhbSBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gRXh0cmEgdmlkZW9zIGJlaW5nIHByb2R1Y2VkXG4gICAgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2VycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIE1hcCBvZiB3ZWJjYW0gTWVkaWFEZXZpY2VJbmZvcyBpbmRleGVkIGJ5IGRldmljZUlkLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBNZWRpYURldmljZUluZm9zPn1cbiAgICB0aGlzLl93ZWJjYW1zID0ge307XG5cbiAgICB0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG4gICAgLy8gbWVkaWFzb3VwIENvbnN1bWVycy5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgbWVkaWFzb3VwQ2xpZW50LkNvbnN1bWVyPn1cbiAgICB0aGlzLl9jb25zdW1lcnMgPSBuZXcgTWFwKCk7XG5cbiAgICB0aGlzLl91c2VTaW11bGNhc3QgPSBzaW11bGNhc3RcblxuICAgIC8vIHRoaXMuX3N0YXJ0S2V5TGlzdGVuZXIoKTtcblxuICAgIC8vIHRoaXMuX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCk7XG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScsIHRoaXMuX2Nsb3NlZCk7XG5cbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuY2xvc2UoKTtcblxuICAgIC8vIENsb3NlIG1lZGlhc291cCBUcmFuc3BvcnRzLlxuICAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZm9yRWFjaChzdWJzY3JpcHRpb24gPT4ge1xuICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKClcbiAgICB9KVxuXG4gICAgdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKClcbiAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbGVhclBlZXJzKClcbiAgfVxuXG4gIC8vIF9zdGFydEtleUxpc3RlbmVyKCkge1xuICAvLyAgIC8vIEFkZCBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIG9uIGRvY3VtZW50XG4gIC8vICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAvLyAgICAgaWYgKGV2ZW50LnJlcGVhdCkgcmV0dXJuO1xuICAvLyAgICAgY29uc3Qga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCk7XG5cbiAgLy8gICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50LnRhcmdldDtcblxuICAvLyAgICAgY29uc3QgZXhjbHVkZSA9IFsnaW5wdXQnLCAndGV4dGFyZWEnXTtcblxuICAvLyAgICAgaWYgKGV4Y2x1ZGUuaW5kZXhPZihzb3VyY2UudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdrZXlEb3duKCkgW2tleTpcIiVzXCJdJywga2V5KTtcblxuICAvLyAgICAgICBzd2l0Y2ggKGtleSkge1xuXG4gIC8vICAgICAgICAgLypcbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzcpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0UHJldkFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzkpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0TmV4dEFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICAgKi9cblxuXG4gIC8vICAgICAgICAgY2FzZSAnTSc6IC8vIFRvZ2dsZSBtaWNyb3Bob25lXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAvLyAgICAgICAgICAgICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkKSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ011dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy51bm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5tdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRW5hYmxlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0VuYWJsZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdWJzogLy8gVG9nZ2xlIHZpZGVvXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgLy8gICAgICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdIJzogLy8gT3BlbiBoZWxwIGRpYWxvZ1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRIZWxwT3Blbih0cnVlKSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBkZWZhdWx0OlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuXG5cbiAgLy8gfVxuXG4gIF9zdGFydERldmljZXNMaXN0ZW5lcigpIHtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZWNoYW5nZScsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB8IG5hdmlnYXRvci5tZWRpYURldmljZXMub25kZXZpY2VjaGFuZ2UnKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5kZXZpY2VzQ2hhbmdlZCcsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1lvdXIgZGV2aWNlcyBjaGFuZ2VkLCBjb25maWd1cmUgeW91ciBkZXZpY2VzIGluIHRoZSBzZXR0aW5ncyBkaWFsb2cnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH0pO1xuICB9XG5cblxuXG4gIGFzeW5jIG11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ211dGVNaWMoKScpO1xuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdwYXVzZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclBhdXNlZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQodHJ1ZSkpO1xuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ211dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gbXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHVubXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygndW5tdXRlTWljKCknKTtcblxuICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAncmVzdW1lUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclJlc3VtZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VubXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGVFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIHVubXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblx0ZGlzY29ubmVjdExvY2FsSGFyaygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzY29ubmVjdExvY2FsSGFyaygpJyk7XG5cblx0XHRpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKVxuXHRcdHtcblx0XHRcdGxldCBbIHRyYWNrIF0gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cblx0XHRcdHRyYWNrLnN0b3AoKTtcblx0XHRcdHRyYWNrID0gbnVsbDtcblxuXHRcdFx0dGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2hhcmsgIT0gbnVsbClcblx0XHRcdHRoaXMuX2hhcmsuc3RvcCgpO1xuXHR9XG5cblx0Y29ubmVjdExvY2FsSGFyayh0cmFjaylcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdjb25uZWN0TG9jYWxIYXJrKCkgW3RyYWNrOlwiJW9cIl0nLCB0cmFjayk7XG5cblx0XHR0aGlzLl9oYXJrU3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cblx0XHRjb25zdCBuZXdUcmFjayA9IHRyYWNrLmNsb25lKCk7XG5cblx0XHR0aGlzLl9oYXJrU3RyZWFtLmFkZFRyYWNrKG5ld1RyYWNrKTtcblxuXHRcdG5ld1RyYWNrLmVuYWJsZWQgPSB0cnVlO1xuXG5cdFx0dGhpcy5faGFyayA9IGhhcmsodGhpcy5faGFya1N0cmVhbSxcblx0XHRcdHtcblx0XHRcdFx0cGxheSAgICAgIDogZmFsc2UsXG5cdFx0XHRcdGludGVydmFsICA6IDEwLFxuXHRcdFx0XHR0aHJlc2hvbGQgOiAtNTAsXG5cdFx0XHRcdGhpc3RvcnkgICA6IDEwMFxuXHRcdFx0fSk7XG5cblx0XHR0aGlzLl9oYXJrLmxhc3RWb2x1bWUgPSAtMTAwO1xuXG5cdFx0dGhpcy5faGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAge1xuICAgICAgLy8gVXBkYXRlIG9ubHkgaWYgdGhlcmUgaXMgYSBiaWdnZXIgZGlmZlxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyICYmIE1hdGguYWJzKHZvbHVtZSAtIHRoaXMuX2hhcmsubGFzdFZvbHVtZSkgPiAwLjUpXG5cdFx0XHR7XG4gICAgICAgIC8vIERlY2F5IGNhbGN1bGF0aW9uOiBrZWVwIGluIG1pbmQgdGhhdCB2b2x1bWUgcmFuZ2UgaXMgLTEwMCAuLi4gMCAoZEIpXG5cdFx0XHRcdC8vIFRoaXMgbWFrZXMgZGVjYXkgdm9sdW1lIGZhc3QgaWYgZGlmZmVyZW5jZSB0byBsYXN0IHNhdmVkIHZhbHVlIGlzIGJpZ1xuXHRcdFx0XHQvLyBhbmQgc2xvdyBmb3Igc21hbGwgY2hhbmdlcy4gVGhpcyBwcmV2ZW50cyBmbGlja2VyaW5nIHZvbHVtZSBpbmRpY2F0b3Jcblx0XHRcdFx0Ly8gYXQgbG93IGxldmVsc1xuXHRcdFx0XHRpZiAodm9sdW1lIDwgdGhpcy5faGFyay5sYXN0Vm9sdW1lKVxuXHRcdFx0XHR7XG4gICAgICAgICAgdm9sdW1lID1cbiAgICAgICAgICB0aGlzLl9oYXJrLmxhc3RWb2x1bWUgLVxuICAgICAgICAgIE1hdGgucG93KFxuICAgICAgICAgICAgKHZvbHVtZSAtIHRoaXMuX2hhcmsubGFzdFZvbHVtZSkgL1xuICAgICAgICAgICAgKDEwMCArIHRoaXMuX2hhcmsubGFzdFZvbHVtZSlcbiAgICAgICAgICAgICwgMlxuXHRcdFx0XHRcdFx0KSAqIDEwO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1ZPTFVNRSBDSEFOR0UgSEFSSycpO1xuXG4gICAgICAgIC8vIHRoaXMub25Wb2x1bWVDaGFuZ2UubmV4dCh7cGVlcjp0aGlzLl9wZWVySWQsIHZvbHVtZX0pXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUodGhpcy5fcGVlcklkLCB2b2x1bWUpKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIHRoaXMuX2hhcmsub24oJ3NwZWFraW5nJywgKCkgPT5cblx0XHQvLyB7XG5cdFx0Ly8gXHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0SXNTcGVha2luZyh0cnVlKSk7XG5cblx0XHQvLyBcdGlmIChcblx0XHQvLyBcdFx0KHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3Mudm9pY2VBY3RpdmF0ZWRVbm11dGUgfHxcblx0XHQvLyBcdFx0c3RvcmUuZ2V0U3RhdGUoKS5tZS5pc0F1dG9NdXRlZCkgJiZcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIgJiZcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG5cdFx0Ly8gXHQpXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG5cdFx0Ly8gXHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKGZhbHNlKSk7IC8vIHNhbml0eSBhY3Rpb25cblx0XHQvLyB9KTtcblxuXHRcdC8vIHRoaXMuX2hhcmsub24oJ3N0b3BwZWRfc3BlYWtpbmcnLCAoKSA9PlxuXHRcdC8vIHtcblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKGZhbHNlKSk7XG5cblx0XHQvLyBcdGlmIChcblx0XHQvLyBcdFx0c3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlciAmJlxuXHRcdC8vIFx0XHQhdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG5cdFx0Ly8gXHQpXG5cdFx0Ly8gXHR7XG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cblx0XHQvLyBcdFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1dG9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gfSk7XG5cdH1cblxuICBhc3luYyBjaGFuZ2VBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtkZXZpY2VJZDpcIiVzXCJdJywgZGV2aWNlSWQpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RlZCBhdWRpbyBvdXRwdXQgZGV2aWNlIG5vIGxvbmdlciBhdmFpbGFibGUnKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyBPbmx5IEZpcmVmb3ggc3VwcG9ydHMgYXBwbHlDb25zdHJhaW50cyB0byBhdWRpbyB0cmFja3NcbiAgLy8gU2VlOlxuICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD03OTY5NjRcbiAgYXN5bmMgdXBkYXRlTWljKHtcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSB8fCB0aGlzLl9kZXZpY2UuZmxhZyAhPT0gJ2ZpcmVmb3gnLFxuICAgIG5ld0RldmljZUlkID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVNaWMoKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZFxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSBhdWRpbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRBdWRpb0RldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBhdWRpbyBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0IGF1dG9HYWluQ29udHJvbCA9IGZhbHNlO1xuICAgICAgY29uc3QgZWNob0NhbmNlbGxhdGlvbiA9IHRydWVcbiAgICAgIGNvbnN0IG5vaXNlU3VwcHJlc3Npb24gPSB0cnVlXG5cbiAgICAgIC8vIGlmICghd2luZG93LmNvbmZpZy5jZW50cmFsQXVkaW9PcHRpb25zKSB7XG4gICAgICAvLyAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIC8vICAgICAnTWlzc2luZyBjZW50cmFsQXVkaW9PcHRpb25zIGZyb20gYXBwIGNvbmZpZyEgKFNlZSBpdCBpbiBleGFtcGxlIGNvbmZpZy4pJ1xuICAgICAgLy8gICApO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgIHNhbXBsZVJhdGUgPSA5NjAwMCxcbiAgICAgICAgY2hhbm5lbENvdW50ID0gMSxcbiAgICAgICAgdm9sdW1lID0gMS4wLFxuICAgICAgICBzYW1wbGVTaXplID0gMTYsXG4gICAgICAgIG9wdXNTdGVyZW8gPSBmYWxzZSxcbiAgICAgICAgb3B1c0R0eCA9IHRydWUsXG4gICAgICAgIG9wdXNGZWMgPSB0cnVlLFxuICAgICAgICBvcHVzUHRpbWUgPSAyMCxcbiAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZSA9IDk2MDAwXG4gICAgICB9ID0ge307XG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fbWljUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZU1pYygpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9wdXNTdGVyZW8sXG4gICAgICAgICAgICAgIG9wdXNEdHgsXG4gICAgICAgICAgICAgIG9wdXNGZWMsXG4gICAgICAgICAgICAgIG9wdXNQdGltZSxcbiAgICAgICAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHsgc291cmNlOiAnbWljJyB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl9taWNQcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ21pYycsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl9taWNQcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTWljcm9waG9uZSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVNaWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIudm9sdW1lID0gMDtcblxuICAgICAgICB0aGlzLmNvbm5lY3RMb2NhbEhhcmsodHJhY2spO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX21pY1Byb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IFtoYXJrVHJhY2tdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG4gICAgICAgICAgaGFya1RyYWNrICYmIGF3YWl0IGhhcmtUcmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlV2ViY2FtKHtcbiAgICBpbml0ID0gZmFsc2UsXG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsLFxuICAgIG5ld1Jlc29sdXRpb24gPSBudWxsLFxuICAgIG5ld0ZyYW1lUmF0ZSA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlV2ViY2FtKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIiwgbmV3UmVzb2x1dGlvbjpcIiVzXCIsIG5ld0ZyYW1lUmF0ZTpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkLFxuICAgICAgbmV3UmVzb2x1dGlvbixcbiAgICAgIG5ld0ZyYW1lUmF0ZVxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSB2aWRlbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gaWYgKG5ld1Jlc29sdXRpb24pXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb1Jlc29sdXRpb24obmV3UmVzb2x1dGlvbikpO1xuXG4gICAgICAvLyBpZiAobmV3RnJhbWVSYXRlKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9GcmFtZVJhdGUobmV3RnJhbWVSYXRlKSk7XG5cbiAgICAgIGNvbnN0ICB2aWRlb011dGVkICA9IGZhbHNlXG5cbiAgICAgIGlmIChpbml0ICYmIHZpZGVvTXV0ZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIC8vIGVsc2VcbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldFdlYmNhbURldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl93ZWJjYW1zW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2ViY2FtIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgIHJlc29sdXRpb24gPSAnbWVkaXVtJ1xuICAgICAgY29uc3QgZnJhbWVSYXRlID0gMTVcblxuXG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fd2ViY2FtUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZpZGVvOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIGlmICh0aGlzLl91c2VTaW11bGNhc3QpIHtcbiAgICAgICAgICAvLyBJZiBWUDkgaXMgdGhlIG9ubHkgYXZhaWxhYmxlIHZpZGVvIGNvZGVjIHRoZW4gdXNlIFNWQy5cbiAgICAgICAgICBjb25zdCBmaXJzdFZpZGVvQ29kZWMgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2VcbiAgICAgICAgICAgIC5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgICAgIC5jb2RlY3NcbiAgICAgICAgICAgIC5maW5kKChjKSA9PiBjLmtpbmQgPT09ICd2aWRlbycpO1xuXG4gICAgICAgICAgbGV0IGVuY29kaW5ncztcblxuICAgICAgICAgIGlmIChmaXJzdFZpZGVvQ29kZWMubWltZVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3ZpZGVvL3ZwOScpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19LU1ZDX0VOQ09ESU5HUztcbiAgICAgICAgICBlbHNlIGlmIChzaW11bGNhc3RFbmNvZGluZ3MpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBzaW11bGNhc3RFbmNvZGluZ3M7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUztcblxuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgICAgZW5jb2RpbmdzLFxuICAgICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2aWRlb0dvb2dsZVN0YXJ0Qml0cmF0ZTogMTAwMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZSh7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICd3ZWJjYW0nLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fd2ViY2FtUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cblxuICAgICAgICBjb25zdCB3ZWJDYW1TdHJlYW0gPSBuZXcgU3RyZWFtKClcbiAgICAgICAgd2ViQ2FtU3RyZWFtLnNldFByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICB0aGlzLm9uQ2FtUHJvZHVjaW5nLm5leHQod2ViQ2FtU3RyZWFtKVxuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0NhbWVyYSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBbHNvIGNoYW5nZSByZXNvbHV0aW9uIG9mIGV4dHJhIHZpZGVvIHByb2R1Y2Vyc1xuICAgICAgICBmb3IgKGNvbnN0IHByb2R1Y2VyIG9mIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAoeyB0cmFjayB9ID0gcHJvZHVjZXIpO1xuXG4gICAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBjYW1lcmEnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBjbG9zZU1lZXRpbmcoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlTWVldGluZygpJyk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnbW9kZXJhdG9yOmNsb3NlTWVldGluZycpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjbG9zZU1lZXRpbmcoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIC8vIHR5cGU6IG1pYy93ZWJjYW0vc2NyZWVuXG4gIC8vIC8vIG11dGU6IHRydWUvZmFsc2VcbiAgYXN5bmMgbW9kaWZ5UGVlckNvbnN1bWVyKHBlZXJJZCwgdHlwZSwgbXV0ZSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ21vZGlmeVBlZXJDb25zdW1lcigpIFtwZWVySWQ6XCIlc1wiLCB0eXBlOlwiJXNcIl0nLFxuICAgICAgcGVlcklkLFxuICAgICAgdHlwZVxuICAgICk7XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGhpcy5fY29uc3VtZXJzLnZhbHVlcygpKSB7XG4gICAgICAgIGlmIChjb25zdW1lci5hcHBEYXRhLnBlZXJJZCA9PT0gcGVlcklkICYmIGNvbnN1bWVyLmFwcERhdGEuc291cmNlID09PSB0eXBlKSB7XG4gICAgICAgICAgaWYgKG11dGUpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9yZXN1bWVDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbW9kaWZ5UGVlckNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIF9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19wYXVzZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3BhdXNlQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5wYXVzZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19wYXVzZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19yZXN1bWVDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKCFjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncmVzdW1lQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5yZXN1bWUoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3Jlc3VtZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gYXN5bmMgc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbc3BhdGlhbExheWVyOlwiJXNcIl0nLCBzcGF0aWFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fd2ViY2FtUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgICBpZiAodGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBzcGF0aWFsTGF5ZXI6XCIlc1wiLCB0ZW1wb3JhbExheWVyOlwiJXNcIl0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KFxuICAvLyAgICAgICAnc2V0Q29uc3VtZXJQcmVmZXJlZExheWVycycsIHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoXG4gIC8vICAgICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHByaW9yaXR5OiVkXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBwcmlvcml0eSk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnc2V0Q29uc3VtZXJQcmlvcml0eScsIHsgY29uc3VtZXJJZCwgcHJpb3JpdHkgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByaW9yaXR5KCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgcmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoY29uc3VtZXJJZCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbY29uc3VtZXJJZDpcIiVzXCJdJywgY29uc3VtZXJJZCk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUnLCB7IGNvbnN1bWVySWQgfSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG5cblxuXG4gIGFzeW5jIGpvaW4oeyByb29tSWQsIGpvaW5WaWRlbywgam9pbkF1ZGlvLCB0b2tlbiB9KSB7XG5cblxuICAgIHRoaXMuX3Jvb21JZCA9IHJvb21JZDtcblxuXG4gICAgLy8gaW5pdGlhbGl6ZSBzaWduYWxpbmcgc29ja2V0XG4gICAgLy8gbGlzdGVuIHRvIHNvY2tldCBldmVudHNcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuaW5pdCh0b2tlbilcbiAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbkRpc2Nvbm5lY3RlZC5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG4gICAgICAvLyB0aGlzLmNsb3NlXG4gICAgfSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uUmVjb25uZWN0aW5nLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcblxuICAgICAgdGhpcy5sb2dnZXIubG9nKCdSZWNvbm5lY3RpbmcuLi4nKVxuXG5cblx0XHRcdGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsZWFyUGVlcnMoKTtcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RpbmcnKSk7XG4gICAgfSkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25OZXdDb25zdW1lci5waXBlKHN3aXRjaE1hcChhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwZWVySWQsXG4gICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgIGlkLFxuICAgICAgICBraW5kLFxuICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhcHBEYXRhLFxuICAgICAgICBwcm9kdWNlclBhdXNlZFxuICAgICAgfSA9IGRhdGE7XG5cbiAgICAgIGNvbnN0IGNvbnN1bWVyICA9IGF3YWl0IHRoaXMuX3JlY3ZUcmFuc3BvcnQuY29uc3VtZShcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgIGFwcERhdGEgOiB7IC4uLmFwcERhdGEsIHBlZXJJZCB9IC8vIFRyaWNrLlxuICAgICAgICB9KSBhcyBtZWRpYXNvdXBDbGllbnQudHlwZXMuQ29uc3VtZXI7XG5cbiAgICAgIC8vIFN0b3JlIGluIHRoZSBtYXAuXG4gICAgICB0aGlzLl9jb25zdW1lcnMuc2V0KGNvbnN1bWVyLmlkLCBjb25zdW1lcik7XG5cbiAgICAgIGNvbnN1bWVyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+XG4gICAgICB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXIuaWQpO1xuICAgICAgfSk7XG5cblxuXG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld0NvbnN1bWVyKGNvbnN1bWVyLCAgcGVlcklkLCB0eXBlLCBwcm9kdWNlclBhdXNlZCk7XG5cbiAgICAgIC8vIFdlIGFyZSByZWFkeS4gQW5zd2VyIHRoZSByZXF1ZXN0IHNvIHRoZSBzZXJ2ZXIgd2lsbFxuICAgICAgLy8gcmVzdW1lIHRoaXMgQ29uc3VtZXIgKHdoaWNoIHdhcyBwYXVzZWQgZm9yIG5vdykuXG5cblxuICAgICAgLy8gaWYgKGtpbmQgPT09ICdhdWRpbycpXG4gICAgICAvLyB7XG4gICAgICAvLyAgIGNvbnN1bWVyLnZvbHVtZSA9IDA7XG5cbiAgICAgIC8vICAgY29uc3Qgc3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgIC8vICAgc3RyZWFtLmFkZFRyYWNrKGNvbnN1bWVyLnRyYWNrKTtcblxuICAgICAgLy8gICBpZiAoIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKVxuICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcigncmVxdWVzdC5uZXdDb25zdW1lciB8IGdpdmVuIHN0cmVhbSBoYXMgbm8gYXVkaW8gdHJhY2snKTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrID0gaGFyayhzdHJlYW0sIHsgcGxheTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gICB2b2x1bWUgPSBNYXRoLnJvdW5kKHZvbHVtZSk7XG5cbiAgICAgICAgLy8gICBpZiAoY29uc3VtZXIgJiYgdm9sdW1lICE9PSBjb25zdW1lci52b2x1bWUpXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgY29uc3VtZXIudm9sdW1lID0gdm9sdW1lO1xuXG4gICAgICAgIC8vICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHBlZXJJZCwgdm9sdW1lKSk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAgIC8vIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5vdGlmaWNhdGlvbi5waXBlKHN3aXRjaE1hcChhc3luYyAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobm90aWZpY2F0aW9uLm1ldGhvZCkge1xuXG5cblxuICAgICAgICAgIGNhc2UgJ3Byb2R1Y2VyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHByb2R1Y2VySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJTY29yZShwcm9kdWNlcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnbmV3UGVlcic6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlckFjdGlvbnMuYWRkUGVlcihcbiAgICAgICAgICAgICAgLy8gICB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMsIGNvbnN1bWVyczogW10gfSkpO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld1BlZXIoaWQpO1xuXG4gICAgICAgICAgICAgIC8vIHRoaXMuX3NvdW5kTm90aWZpY2F0aW9uKCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIC8vICAgICAgIGlkOiAncm9vbS5uZXdQZWVyJyxcbiAgICAgICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICd7ZGlzcGxheU5hbWV9IGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgICAgICAgICAgLy8gICAgIH0sIHtcbiAgICAgICAgICAgICAgLy8gICAgICAgZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAncGVlckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbG9zZVBlZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwZWVyQWN0aW9ucy5yZW1vdmVQZWVyKHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjb25zdW1lci5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChjb25zdW1lci5oYXJrICE9IG51bGwpXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaGFyay5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gY29uc3VtZXIuYXBwRGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMucmVtb3ZlQ29uc3VtZXIoY29uc3VtZXJJZCwgcGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclBhdXNlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJSZXN1bWVkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJMYXllcnNDaGFuZ2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5vbkNvbnN1bWVyTGF5ZXJDaGFuZ2VkKGNvbnN1bWVySWQpXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lckN1cnJlbnRMYXllcnMoXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyU2NvcmUoY29uc3VtZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jvb21CYWNrJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgJ3Jvb21SZWFkeSc6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0dXJuU2VydmVycyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3R1cm5TZXJ2ZXJzID0gdHVyblNlcnZlcnM7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnRvZ2dsZUpvaW5lZCgpKTtcbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEluTG9iYnkoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdhY3RpdmVTcGVha2VyJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuXG5cbiAgICAgICAgICAgICAgaWYgKHBlZXJJZCA9PT0gdGhpcy5fcGVlcklkKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLm9uVm9sdW1lQ2hhbmdlLm5leHQobm90aWZpY2F0aW9uLmRhdGEpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gdGhpcy5fc3BvdGxpZ2h0cy5oYW5kbGVBY3RpdmVTcGVha2VyKHBlZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAvLyAgICd1bmtub3duIG5vdGlmaWNhdGlvbi5tZXRob2QgXCIlc1wiJywgbm90aWZpY2F0aW9uLm1ldGhvZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignZXJyb3Igb24gc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ3NvY2tldC5yZXF1ZXN0RXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0Vycm9yIG9uIHNlcnZlciByZXF1ZXN0J1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG4gICAgLy8gb24gcm9vbSByZWFkeSBqb2luIHJvb20gX2pvaW5Sb29tXG5cbiAgICAvLyB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgLy8gY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAvLyAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgLy8gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgIC8vICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgIC8vIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgLy8gY3JlYXRlIHNlbmQgdHJhbnNwb3J0IGNyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9ydFxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBjcmVhdGUgcmVjZWl2ZSB0cmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvclxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBzZW5kIGpvaW4gcmVxdWVzdFxuXG4gICAgLy8gYWRkIHBlZXJzIHRvIHBlZXJzIHNlcnZpY2VcblxuICAgIC8vIHByb2R1Y2UgdXBkYXRlV2ViY2FtIHVwZGF0ZU1pY1xuICB9XG5cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9EZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9EZXZpY2VzKHRoaXMuX2F1ZGlvRGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb0RldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlV2ViY2FtcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fd2ViY2FtcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ3ZpZGVvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRXZWJjYW1EZXZpY2VzKHRoaXMuX3dlYmNhbXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlV2ViY2FtcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGRpc2FibGVXZWJjYW0oKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVXZWJjYW0oKScpO1xuXG5cdFx0aWYgKCF0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcblx0fVxuXHRhc3luYyBkaXNhYmxlTWljKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlTWljKCknKTtcblxuXHRcdGlmICghdGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG5cblx0YXN5bmMgX2dldFdlYmNhbURldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcblxuXHRcdFx0Y29uc3QgIHNlbGVjdGVkV2ViY2FtID0gIG51bGxcblxuXHRcdFx0aWYgKHNlbGVjdGVkV2ViY2FtICYmIHRoaXMuX3dlYmNhbXNbc2VsZWN0ZWRXZWJjYW1dKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRXZWJjYW07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHdlYmNhbXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX3dlYmNhbXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIHdlYmNhbXNbMF0gPyB3ZWJjYW1zWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRBdWRpb0RldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZUF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcblxuICAgICAgY29uc3QgIHNlbGVjdGVkQXVkaW9EZXZpY2UgPSBudWxsO1xuXG5cdFx0XHRpZiAoc2VsZWN0ZWRBdWRpb0RldmljZSAmJiB0aGlzLl9hdWRpb0RldmljZXNbc2VsZWN0ZWRBdWRpb0RldmljZV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZEF1ZGlvRGV2aWNlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdWRpb0RldmljZXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX2F1ZGlvRGV2aWNlcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gYXVkaW9EZXZpY2VzWzBdID8gYXVkaW9EZXZpY2VzWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb091dHB1dERldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb291dHB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXREZXZpY2VzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXG5cbiAgYXN5bmMgX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfam9pblJvb20oKSBEZXZpY2UnLCB0aGlzLl9kZXZpY2UpO1xuXG4gICAgY29uc3QgZGlzcGxheU5hbWUgPSBgR3Vlc3QgJHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAwIC0gMTAwMDApKSArIDEwMDAwfWBcblxuXG4gICAgdHJ5IHtcblxuXG4gICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSh7aGFuZGxlck5hbWU6J1NhZmFyaTEyJ30pO1xuXG4gICAgICBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgICByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgICAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICAgIHByb2R1Y2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnN1bWluZzogZmFsc2VcbiAgICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlU2VuZFRyYW5zcG9ydChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvcHJpZXRhcnlDb25zdHJhaW50czogUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFNcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdwcm9kdWNlJywgYXN5bmMgKHsga2luZCwgcnRwUGFyYW1ldGVycywgYXBwRGF0YSB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgICdwcm9kdWNlJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBhcHBEYXRhXG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayh7IGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGVycmJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgIHByb2R1Y2luZzogZmFsc2UsXG4gICAgICAgICAgY29uc3VtaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkLFxuICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlUmVjdlRyYW5zcG9ydChcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQub24oXG4gICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICB7XG4gICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBvdXIgbWVkaWEgY2FwYWJpbGl0aWVzLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldE1lZGlhQ2FwYWJpbGl0aWVzKFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0Y2FuU2VuZE1pYyAgICAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TZW5kV2ViY2FtICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlU2NyZWVuIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykgJiZcbiAgICAgIC8vIFx0XHRcdHRoaXMuX3NjcmVlblNoYXJpbmcuaXNTY3JlZW5TaGFyZUF2YWlsYWJsZSgpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlRmlsZXMgOiB0aGlzLl90b3JyZW50U3VwcG9ydFxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICB0cmFja2VyLFxuICAgICAgICByb29tUGVybWlzc2lvbnMsXG4gICAgICAgIHVzZXJSb2xlcyxcbiAgICAgICAgYWxsb3dXaGVuUm9sZU1pc3NpbmcsXG4gICAgICAgIGNoYXRIaXN0b3J5LFxuICAgICAgICBmaWxlSGlzdG9yeSxcbiAgICAgICAgbGFzdE5IaXN0b3J5LFxuICAgICAgICBsb2NrZWQsXG4gICAgICAgIGxvYmJ5UGVlcnMsXG4gICAgICAgIGFjY2Vzc0NvZGVcbiAgICAgIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdqb2luJyxcbiAgICAgICAge1xuICAgICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcblxuICAgICAgICAgIHJ0cENhcGFiaWxpdGllczogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdfam9pblJvb20oKSBqb2luZWQgW2F1dGhlbnRpY2F0ZWQ6XCIlc1wiLCBwZWVyczpcIiVvXCIsIHJvbGVzOlwiJW9cIiwgdXNlclJvbGVzOlwiJW9cIl0nLFxuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHVzZXJSb2xlc1xuICAgICAgKTtcblxuXG5cblxuXG4gICAgICAvLyBmb3IgKGNvbnN0IHBlZXIgb2YgcGVlcnMpXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHBlZXJBY3Rpb25zLmFkZFBlZXIoeyAuLi5wZWVyLCBjb25zdW1lcnM6IFtdIH0pKTtcbiAgICAgIC8vIH1cblxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnam9pbiBhdWRpbycsam9pbkF1ZGlvICwgJ2NhbiBwcm9kdWNlIGF1ZGlvJyxcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSwgJyB0aGlzLl9tdXRlZCcsIHRoaXMuX211dGVkKVxuICAgICAgLy8gRG9uJ3QgcHJvZHVjZSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCB0byBub3QgdG8gZG8gaXQuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pblZpZGVvXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgaW5pdDogdHJ1ZSwgc3RhcnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5BdWRpbyAmJlxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpXG4gICAgICAgIClcbiAgICAgICAgICBpZiAoIXRoaXMuX211dGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gY29uc3QgIHNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgID0gbnVsbFxuXG4gICAgICAvLyBpZiAoIXNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgJiYgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzICE9PSB7fSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0c2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoXG4gICAgICAvLyBcdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpWzBdXG4gICAgICAvLyBcdFx0KVxuICAgICAgLy8gXHQpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblxuICAgICAgLy8gLy8gQ2xlYW4gYWxsIHRoZSBleGlzdGluZyBub3RpZmljYXRpb25zLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobm90aWZpY2F0aW9uQWN0aW9ucy5yZW1vdmVBbGxOb3RpZmljYXRpb25zKCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHR0ZXh0IDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vIFx0XHRcdGlkICAgICAgICAgICAgIDogJ3Jvb20uam9pbmVkJyxcbiAgICAgIC8vIFx0XHRcdGRlZmF1bHRNZXNzYWdlIDogJ1lvdSBoYXZlIGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgIC8vIFx0XHR9KVxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmFkZFBlZXJzKHBlZXJzKTtcblxuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19qb2luUm9vbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbiAgZGV2aWNlSW5mbygpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodWEpO1xuXG4gICAgbGV0IGZsYWc7XG5cbiAgICBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBjaHJvbWU6ICc+PTAnLCBjaHJvbWl1bTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2Nocm9tZSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBmaXJlZm94OiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZmlyZWZveCc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBzYWZhcmk6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdzYWZhcmknO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgb3BlcmE6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdvcGVyYSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyAnbWljcm9zb2Z0IGVkZ2UnOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZWRnZSc7XG4gICAgZWxzZVxuICAgICAgZmxhZyA9ICd1bmtub3duJztcblxuICAgIHJldHVybiB7XG4gICAgICBmbGFnLFxuICAgICAgb3M6IGJyb3dzZXIuZ2V0T1NOYW1lKHRydWUpLCAvLyBpb3MsIGFuZHJvaWQsIGxpbnV4Li4uXG4gICAgICBwbGF0Zm9ybTogYnJvd3Nlci5nZXRQbGF0Zm9ybVR5cGUodHJ1ZSksIC8vIG1vYmlsZSwgZGVza3RvcCwgdGFibGV0XG4gICAgICBuYW1lOiBicm93c2VyLmdldEJyb3dzZXJOYW1lKHRydWUpLFxuICAgICAgdmVyc2lvbjogYnJvd3Nlci5nZXRCcm93c2VyVmVyc2lvbigpLFxuICAgICAgYm93c2VyOiBicm93c2VyXG4gICAgfTtcblxuICB9XG59XG4iXX0=
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
                        _q.trys.push([1, 23, , 24]);
                        if (!this._mediasoupDevice.canProduce('video'))
                            throw new Error('cannot produce video');
                        if (newDeviceId && !restart)
                            throw new Error('changing device requires restart');
                        videoMuted = false;
                        if (init && videoMuted)
                            return [2 /*return*/];
                        deviceId = void 0;
                        if (!newDeviceId) return [3 /*break*/, 2];
                        deviceId = newDeviceId;
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this._getWebcamDeviceId()];
                    case 3:
                        deviceId = _q.sent();
                        _q.label = 4;
                    case 4:
                        device = this._webcams[newDeviceId || deviceId];
                        console.log('WEBCAMS ', this._webcams, device, deviceId);
                        if (!device)
                            throw new Error('no webcam devices');
                        resolution = 'medium';
                        frameRate = 15;
                        if (!((restart && this._webcamProducer) ||
                            start)) return [3 /*break*/, 12];
                        if (!this._webcamProducer) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.disableWebcam()];
                    case 5:
                        _q.sent();
                        _q.label = 6;
                    case 6: return [4 /*yield*/, navigator.mediaDevices.getUserMedia({
                            video: __assign(__assign({ deviceId: { ideal: deviceId } }, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate })
                        })];
                    case 7:
                        stream = _q.sent();
                        (_o = __read(stream.getVideoTracks(), 1), track = _o[0]);
                        trackDeviceId = track.getSettings().deviceId;
                        if (!this._useSimulcast) return [3 /*break*/, 9];
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
                    case 8:
                        _j._webcamProducer = _q.sent();
                        return [3 /*break*/, 11];
                    case 9:
                        _k = this;
                        return [4 /*yield*/, this._sendTransport.produce({
                                track: track,
                                appData: {
                                    source: 'webcam'
                                }
                            })];
                    case 10:
                        _k._webcamProducer = _q.sent();
                        _q.label = 11;
                    case 11:
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
                        return [3 /*break*/, 21];
                    case 12:
                        if (!this._webcamProducer) return [3 /*break*/, 21];
                        (track = this._webcamProducer.track);
                        return [4 /*yield*/, track.applyConstraints(__assign(__assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate }))];
                    case 13:
                        _q.sent();
                        _q.label = 14;
                    case 14:
                        _q.trys.push([14, 19, 20, 21]);
                        _l = __values(this._extraVideoProducers.values()), _m = _l.next();
                        _q.label = 15;
                    case 15:
                        if (!!_m.done) return [3 /*break*/, 18];
                        producer = _m.value;
                        (track = producer.track);
                        return [4 /*yield*/, track.applyConstraints(__assign(__assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate: frameRate }))];
                    case 16:
                        _q.sent();
                        _q.label = 17;
                    case 17:
                        _m = _l.next();
                        return [3 /*break*/, 15];
                    case 18: return [3 /*break*/, 21];
                    case 19:
                        e_1_1 = _q.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 21];
                    case 20:
                        try {
                            if (_m && !_m.done && (_p = _l.return)) _p.call(_l);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 21: return [4 /*yield*/, this._updateWebcams()];
                    case 22:
                        _q.sent();
                        return [3 /*break*/, 24];
                    case 23:
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
                        return [3 /*break*/, 24];
                    case 24: return [2 /*return*/];
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
                        if (this._device.os === 'ios') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxJQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixJQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsSUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsSUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLElBQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELElBQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFT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O1lBQzNCLFFBQVEsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN2QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtZQUNwQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBQ0osQ0FBQzswRUE3eURXLFdBQVc7dURBQVgsV0FBVyxXQUFYLFdBQVcsbUJBRlgsTUFBTTtzQkFwRnBCO0NBbzREQyxBQWp6REQsSUFpekRDO1NBOXlEYSxXQUFXO2tEQUFYLFdBQVc7Y0FIeEIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgUmVtb3RlUGVlcnNTZXJ2aWNlIH0gZnJvbSAnLi9yZW1vdGUtcGVlcnMuc2VydmljZSc7XG5pbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBTaWduYWxpbmdTZXJ2aWNlIH0gZnJvbSAnLi9zaWduYWxpbmcuc2VydmljZSc7XG5cbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGJvd3NlciBmcm9tICdib3dzZXInO1xuXG5pbXBvcnQgKiBhcyBtZWRpYXNvdXBDbGllbnQgZnJvbSAnbWVkaWFzb3VwLWNsaWVudCdcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBoYXJrIGZyb20gJ2hhcmsnO1xuXG5cbmxldCBzYXZlQXM7XG5cblxuY29uc3QgbGFzdE4gPSA0XG5jb25zdCBtb2JpbGVMYXN0TiA9IDFcbmNvbnN0IHZpZGVvQXNwZWN0UmF0aW8gPSAxLjc3N1xuXG5jb25zdCBzaW11bGNhc3QgPSB0cnVlO1xuY29uc3QgXHRzaW11bGNhc3RFbmNvZGluZ3MgICA9IFtcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDIgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEgfVxuXVxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG4gIF91c2VTaW11bGNhc3RcbiAgX3R1cm5TZXJ2ZXJzXG5cbiAgc3Vic2NyaXB0aW9ucyA9IFtdO1xuICBwdWJsaWMgb25DYW1Qcm9kdWNpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIHB1YmxpYyBvblZvbHVtZUNoYW5nZTogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBzaWduYWxpbmdTZXJ2aWNlOiBTaWduYWxpbmdTZXJ2aWNlLFxuICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlLFxuICBwcml2YXRlIHJlbW90ZVBlZXJzU2VydmljZTogUmVtb3RlUGVlcnNTZXJ2aWNlKSB7XG5cblxuICB9XG5cbiAgaW5pdCh7XG4gICAgcGVlcklkPW51bGwsXG5cbiAgICBwcm9kdWNlPXRydWUsXG4gICAgZm9yY2VUY3A9ZmFsc2UsXG4gICAgbXV0ZWQ9ZmFsc2VcbiAgfSA9IHt9KSB7XG4gICAgaWYgKCFwZWVySWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGVlcklkJyk7XG5cblxuICAgIC8vIGxvZ2dlci5kZWJ1ZyhcbiAgICAvLyAgICdjb25zdHJ1Y3RvcigpIFtwZWVySWQ6IFwiJXNcIiwgZGV2aWNlOiBcIiVzXCIsIHByb2R1Y2U6IFwiJXNcIiwgZm9yY2VUY3A6IFwiJXNcIiwgZGlzcGxheU5hbWUgXCJcIl0nLFxuICAgIC8vICAgcGVlcklkLCBkZXZpY2UuZmxhZywgcHJvZHVjZSwgZm9yY2VUY3ApO1xuXG5cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJTklUIFJvb20gJywgcGVlcklkKVxuXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgLy8gV2hldGhlciB3ZSBzaG91bGQgcHJvZHVjZS5cbiAgICB0aGlzLl9wcm9kdWNlID0gcHJvZHVjZTtcblxuICAgIC8vIFdoZXRoZXIgd2UgZm9yY2UgVENQXG4gICAgdGhpcy5fZm9yY2VUY3AgPSBmb3JjZVRjcDtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgc2ltdWxjYXN0IHNob3VsZCBiZSB1c2VkLlxuICAgIC8vIHRoaXMuX3VzZVNpbXVsY2FzdCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKCdzaW11bGNhc3QnIGluIHdpbmRvdy5jb25maWcpXG4gICAgLy8gICB0aGlzLl91c2VTaW11bGNhc3QgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdDtcblxuXG5cblxuXG4gICAgdGhpcy5fbXV0ZWQgPSBtdXRlZDtcblxuICAgIC8vIFRoaXMgZGV2aWNlXG4gICAgdGhpcy5fZGV2aWNlID0gdGhpcy5kZXZpY2VJbmZvKCk7XG5cbiAgICAvLyBNeSBwZWVyIG5hbWUuXG4gICAgdGhpcy5fcGVlcklkID0gcGVlcklkO1xuXG5cblxuICAgIC8vIEFsZXJ0IHNvdW5kXG4gICAgLy8gdGhpcy5fc291bmRBbGVydCA9IG5ldyBBdWRpbygnL3NvdW5kcy9ub3RpZnkubXAzJyk7XG5cblxuXG5cbiAgICAvLyBUaGUgcm9vbSBJRFxuICAgIHRoaXMuX3Jvb21JZCA9IG51bGw7XG5cbiAgICAvLyBtZWRpYXNvdXAtY2xpZW50IERldmljZSBpbnN0YW5jZS5cbiAgICAvLyBAdHlwZSB7bWVkaWFzb3VwQ2xpZW50LkRldmljZX1cbiAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBudWxsO1xuXG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIGhhcmtcbiAgICB0aGlzLl9oYXJrID0gbnVsbDtcblxuICAgIC8vIExvY2FsIE1lZGlhU3RyZWFtIGZvciBoYXJrXG4gICAgdGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCB3ZWJjYW0gbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIEV4dHJhIHZpZGVvcyBiZWluZyBwcm9kdWNlZFxuICAgIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBNYXAgb2Ygd2ViY2FtIE1lZGlhRGV2aWNlSW5mb3MgaW5kZXhlZCBieSBkZXZpY2VJZC5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgTWVkaWFEZXZpY2VJbmZvcz59XG4gICAgdGhpcy5fd2ViY2FtcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cbiAgICB0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuICAgIC8vIG1lZGlhc291cCBDb25zdW1lcnMuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIG1lZGlhc291cENsaWVudC5Db25zdW1lcj59XG4gICAgdGhpcy5fY29uc3VtZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gc2ltdWxjYXN0XG5cbiAgICAvLyB0aGlzLl9zdGFydEtleUxpc3RlbmVyKCk7XG5cbiAgICAvLyB0aGlzLl9zdGFydERldmljZXNMaXN0ZW5lcigpO1xuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknLCB0aGlzLl9jbG9zZWQpO1xuXG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmNsb3NlKCk7XG5cbiAgICAvLyBDbG9zZSBtZWRpYXNvdXAgVHJhbnNwb3J0cy5cbiAgICBpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmZvckVhY2goc3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXG4gICAgfSlcblxuICAgIHRoaXMuZGlzY29ubmVjdExvY2FsSGFyaygpXG4gICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xlYXJQZWVycygpXG4gIH1cblxuICAvLyBfc3RhcnRLZXlMaXN0ZW5lcigpIHtcbiAgLy8gICAvLyBBZGQga2V5ZG93biBldmVudCBsaXN0ZW5lciBvbiBkb2N1bWVudFxuICAvLyAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgLy8gICAgIGlmIChldmVudC5yZXBlYXQpIHJldHVybjtcbiAgLy8gICAgIGNvbnN0IGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpO1xuXG4gIC8vICAgICBjb25zdCBzb3VyY2UgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gICAgIGNvbnN0IGV4Y2x1ZGUgPSBbJ2lucHV0JywgJ3RleHRhcmVhJ107XG5cbiAgLy8gICAgIGlmIChleGNsdWRlLmluZGV4T2Yoc291cmNlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkgPT09IC0xKSB7XG4gIC8vICAgICAgIGxvZ2dlci5kZWJ1Zygna2V5RG93bigpIFtrZXk6XCIlc1wiXScsIGtleSk7XG5cbiAgLy8gICAgICAgc3dpdGNoIChrZXkpIHtcblxuICAvLyAgICAgICAgIC8qXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM3KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldFByZXZBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM5KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldE5leHRBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICAgICovXG5cblxuICAvLyAgICAgICAgIGNhc2UgJ00nOiAvLyBUb2dnbGUgbWljcm9waG9uZVxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgICAgICAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCkge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMudW5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VubXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVuYWJsZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFbmFibGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnVic6IC8vIFRvZ2dsZSB2aWRlb1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gIC8vICAgICAgICAgICAgIGVsc2VcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnSCc6IC8vIE9wZW4gaGVscCBkaWFsb2dcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SGVscE9wZW4odHJ1ZSkpO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgZGVmYXVsdDpcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcblxuXG4gIC8vIH1cblxuICBfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkgfCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLm9uZGV2aWNlY2hhbmdlJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuZGV2aWNlc0NoYW5nZWQnLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdZb3VyIGRldmljZXMgY2hhbmdlZCwgY29uZmlndXJlIHlvdXIgZGV2aWNlcyBpbiB0aGUgc2V0dGluZ3MgZGlhbG9nJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9KTtcbiAgfVxuXG5cblxuICBhc3luYyBtdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdtdXRlTWljKCknKTtcblxuICAgIHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAncGF1c2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJQYXVzZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKHRydWUpKTtcblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIG11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1bm11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ3VubXV0ZU1pYygpJyk7XG5cbiAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ3Jlc3VtZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJSZXN1bWVkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1bm11dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlRXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byB1bm11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cdGRpc2Nvbm5lY3RMb2NhbEhhcmsoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2Nvbm5lY3RMb2NhbEhhcmsoKScpO1xuXG5cdFx0aWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbClcblx0XHR7XG5cdFx0XHRsZXQgWyB0cmFjayBdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG5cdFx0XHR0cmFjay5zdG9wKCk7XG5cdFx0XHR0cmFjayA9IG51bGw7XG5cblx0XHRcdHRoaXMuX2hhcmtTdHJlYW0gPSBudWxsO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9oYXJrICE9IG51bGwpXG5cdFx0XHR0aGlzLl9oYXJrLnN0b3AoKTtcblx0fVxuXG5cdGNvbm5lY3RMb2NhbEhhcmsodHJhY2spXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnY29ubmVjdExvY2FsSGFyaygpIFt0cmFjazpcIiVvXCJdJywgdHJhY2spO1xuXG5cdFx0dGhpcy5faGFya1N0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuXG5cdFx0Y29uc3QgbmV3VHJhY2sgPSB0cmFjay5jbG9uZSgpO1xuXG5cdFx0dGhpcy5faGFya1N0cmVhbS5hZGRUcmFjayhuZXdUcmFjayk7XG5cblx0XHRuZXdUcmFjay5lbmFibGVkID0gdHJ1ZTtcblxuXHRcdHRoaXMuX2hhcmsgPSBoYXJrKHRoaXMuX2hhcmtTdHJlYW0sXG5cdFx0XHR7XG5cdFx0XHRcdHBsYXkgICAgICA6IGZhbHNlLFxuXHRcdFx0XHRpbnRlcnZhbCAgOiAxMCxcblx0XHRcdFx0dGhyZXNob2xkIDogLTUwLFxuXHRcdFx0XHRoaXN0b3J5ICAgOiAxMDBcblx0XHRcdH0pO1xuXG5cdFx0dGhpcy5faGFyay5sYXN0Vm9sdW1lID0gLTEwMDtcblxuXHRcdHRoaXMuX2hhcmsub24oJ3ZvbHVtZV9jaGFuZ2UnLCAodm9sdW1lKSA9PlxuICAgIHtcbiAgICAgIC8vIFVwZGF0ZSBvbmx5IGlmIHRoZXJlIGlzIGEgYmlnZ2VyIGRpZmZcblx0XHRcdGlmICh0aGlzLl9taWNQcm9kdWNlciAmJiBNYXRoLmFicyh2b2x1bWUgLSB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpID4gMC41KVxuXHRcdFx0e1xuICAgICAgICAvLyBEZWNheSBjYWxjdWxhdGlvbjoga2VlcCBpbiBtaW5kIHRoYXQgdm9sdW1lIHJhbmdlIGlzIC0xMDAgLi4uIDAgKGRCKVxuXHRcdFx0XHQvLyBUaGlzIG1ha2VzIGRlY2F5IHZvbHVtZSBmYXN0IGlmIGRpZmZlcmVuY2UgdG8gbGFzdCBzYXZlZCB2YWx1ZSBpcyBiaWdcblx0XHRcdFx0Ly8gYW5kIHNsb3cgZm9yIHNtYWxsIGNoYW5nZXMuIFRoaXMgcHJldmVudHMgZmxpY2tlcmluZyB2b2x1bWUgaW5kaWNhdG9yXG5cdFx0XHRcdC8vIGF0IGxvdyBsZXZlbHNcblx0XHRcdFx0aWYgKHZvbHVtZSA8IHRoaXMuX2hhcmsubGFzdFZvbHVtZSlcblx0XHRcdFx0e1xuICAgICAgICAgIHZvbHVtZSA9XG4gICAgICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lIC1cbiAgICAgICAgICBNYXRoLnBvdyhcbiAgICAgICAgICAgICh2b2x1bWUgLSB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpIC9cbiAgICAgICAgICAgICgxMDAgKyB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpXG4gICAgICAgICAgICAsIDJcblx0XHRcdFx0XHRcdCkgKiAxMDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLl9oYXJrLmxhc3RWb2x1bWUgPSB2b2x1bWU7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdWT0xVTUUgQ0hBTkdFIEhBUksnKTtcblxuICAgICAgICAvLyB0aGlzLm9uVm9sdW1lQ2hhbmdlLm5leHQoe3BlZXI6dGhpcy5fcGVlcklkLCB2b2x1bWV9KVxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHRoaXMuX3BlZXJJZCwgdm9sdW1lKSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQvLyB0aGlzLl9oYXJrLm9uKCdzcGVha2luZycsICgpID0+XG5cdFx0Ly8ge1xuXHRcdC8vIFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldElzU3BlYWtpbmcodHJ1ZSkpO1xuXG5cdFx0Ly8gXHRpZiAoXG5cdFx0Ly8gXHRcdChzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLnZvaWNlQWN0aXZhdGVkVW5tdXRlIHx8XG5cdFx0Ly8gXHRcdHN0b3JlLmdldFN0YXRlKCkubWUuaXNBdXRvTXV0ZWQpICYmXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyICYmXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZFxuXHRcdC8vIFx0KVxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuXHRcdC8vIFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1dG9NdXRlZChmYWxzZSkpOyAvLyBzYW5pdHkgYWN0aW9uXG5cdFx0Ly8gfSk7XG5cblx0XHQvLyB0aGlzLl9oYXJrLm9uKCdzdG9wcGVkX3NwZWFraW5nJywgKCkgPT5cblx0XHQvLyB7XG5cdFx0Ly8gXHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0SXNTcGVha2luZyhmYWxzZSkpO1xuXG5cdFx0Ly8gXHRpZiAoXG5cdFx0Ly8gXHRcdHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3Mudm9pY2VBY3RpdmF0ZWRVbm11dGUgJiZcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIgJiZcblx0XHQvLyBcdFx0IXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZFxuXHRcdC8vIFx0KVxuXHRcdC8vIFx0e1xuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG5cdFx0Ly8gXHRcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdXRvTXV0ZWQodHJ1ZSkpO1xuXHRcdC8vIFx0fVxuXHRcdC8vIH0pO1xuXHR9XG5cbiAgYXN5bmMgY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZGV2aWNlSWQ6XCIlc1wiXScsIGRldmljZUlkKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0ZWQgYXVkaW8gb3V0cHV0IGRldmljZSBubyBsb25nZXIgYXZhaWxhYmxlJyk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gT25seSBGaXJlZm94IHN1cHBvcnRzIGFwcGx5Q29uc3RyYWludHMgdG8gYXVkaW8gdHJhY2tzXG4gIC8vIFNlZTpcbiAgLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Nzk2OTY0XG4gIGFzeW5jIHVwZGF0ZU1pYyh7XG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UgfHwgdGhpcy5fZGV2aWNlLmZsYWcgIT09ICdmaXJlZm94JyxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlTWljKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWRcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgYXVkaW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0QXVkaW9EZXZpY2VJZCgpO1xuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gYXVkaW8gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCBhdXRvR2FpbkNvbnRyb2wgPSBmYWxzZTtcbiAgICAgIGNvbnN0IGVjaG9DYW5jZWxsYXRpb24gPSB0cnVlXG4gICAgICBjb25zdCBub2lzZVN1cHByZXNzaW9uID0gdHJ1ZVxuXG4gICAgICAvLyBpZiAoIXdpbmRvdy5jb25maWcuY2VudHJhbEF1ZGlvT3B0aW9ucykge1xuICAgICAgLy8gICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAvLyAgICAgJ01pc3NpbmcgY2VudHJhbEF1ZGlvT3B0aW9ucyBmcm9tIGFwcCBjb25maWchIChTZWUgaXQgaW4gZXhhbXBsZSBjb25maWcuKSdcbiAgICAgIC8vICAgKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3Qge1xuICAgICAgICBzYW1wbGVSYXRlID0gOTYwMDAsXG4gICAgICAgIGNoYW5uZWxDb3VudCA9IDEsXG4gICAgICAgIHZvbHVtZSA9IDEuMCxcbiAgICAgICAgc2FtcGxlU2l6ZSA9IDE2LFxuICAgICAgICBvcHVzU3RlcmVvID0gZmFsc2UsXG4gICAgICAgIG9wdXNEdHggPSB0cnVlLFxuICAgICAgICBvcHVzRmVjID0gdHJ1ZSxcbiAgICAgICAgb3B1c1B0aW1lID0gMjAsXG4gICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGUgPSA5NjAwMFxuICAgICAgfSA9IHt9O1xuXG4gICAgICBpZiAoXG4gICAgICAgIChyZXN0YXJ0ICYmIHRoaXMuX21pY1Byb2R1Y2VyKSB8fFxuICAgICAgICBzdGFydFxuICAgICAgKSB7XG4gICAgICAgIHRoaXMuZGlzY29ubmVjdExvY2FsSGFyaygpO1xuXG4gICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcilcbiAgICAgICAgICBhd2FpdCB0aGlzLmRpc2FibGVNaWMoKTtcblxuICAgICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYShcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdWRpbzoge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkpO1xuXG4gICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBvcHVzU3RlcmVvLFxuICAgICAgICAgICAgICBvcHVzRHR4LFxuICAgICAgICAgICAgICBvcHVzRmVjLFxuICAgICAgICAgICAgICBvcHVzUHRpbWUsXG4gICAgICAgICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7IHNvdXJjZTogJ21pYycgfVxuICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fbWljUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICdtaWMnLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fbWljUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ01pY3JvcGhvbmUgZGlzY29ubmVjdGVkJ1xuICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgdGhpcy5kaXNhYmxlTWljKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnZvbHVtZSA9IDA7XG5cbiAgICAgICAgdGhpcy5jb25uZWN0TG9jYWxIYXJrKHRyYWNrKTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl9taWNQcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpIHtcbiAgICAgICAgICBjb25zdCBbaGFya1RyYWNrXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuICAgICAgICAgIGhhcmtUcmFjayAmJiBhd2FpdCBoYXJrVHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIHVwZGF0ZVdlYmNhbSh7XG4gICAgaW5pdCA9IGZhbHNlLFxuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlLFxuICAgIG5ld0RldmljZUlkID0gbnVsbCxcbiAgICBuZXdSZXNvbHV0aW9uID0gbnVsbCxcbiAgICBuZXdGcmFtZVJhdGUgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZVdlYmNhbSgpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCIsIG5ld1Jlc29sdXRpb246XCIlc1wiLCBuZXdGcmFtZVJhdGU6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZCxcbiAgICAgIG5ld1Jlc29sdXRpb24sXG4gICAgICBuZXdGcmFtZVJhdGVcbiAgICApO1xuXG4gICAgbGV0IHRyYWNrO1xuXG4gICAgdHJ5IHtcbiAgICAgIGlmICghdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IHByb2R1Y2UgdmlkZW8nKTtcblxuICAgICAgaWYgKG5ld0RldmljZUlkICYmICFyZXN0YXJ0KVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NoYW5naW5nIGRldmljZSByZXF1aXJlcyByZXN0YXJ0Jyk7XG5cbiAgICAgIC8vIGlmIChuZXdEZXZpY2VJZClcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkV2ViY2FtRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIGlmIChuZXdSZXNvbHV0aW9uKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9SZXNvbHV0aW9uKG5ld1Jlc29sdXRpb24pKTtcblxuICAgICAgLy8gaWYgKG5ld0ZyYW1lUmF0ZSlcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvRnJhbWVSYXRlKG5ld0ZyYW1lUmF0ZSkpO1xuXG4gICAgICBjb25zdCAgdmlkZW9NdXRlZCAgPSBmYWxzZVxuXG4gICAgICBpZiAoaW5pdCAmJiB2aWRlb011dGVkKVxuICAgICAgICByZXR1cm47XG4gICAgICAvLyBlbHNlXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgbGV0IGRldmljZUlkXG4gICAgICBpZiAobmV3RGV2aWNlSWQpIHtcbiAgICAgICAgZGV2aWNlSWQgPSBuZXdEZXZpY2VJZFxuICAgICAgfWVsc2V7XG4gICAgICAgIGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fd2ViY2Ftc1tuZXdEZXZpY2VJZCB8fCBkZXZpY2VJZF07XG5cbiAgICAgIGNvbnNvbGUubG9nKCdXRUJDQU1TICcsIHRoaXMuX3dlYmNhbXMsIGRldmljZSwgZGV2aWNlSWQpXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCAgcmVzb2x1dGlvbiA9ICdtZWRpdW0nXG4gICAgICBjb25zdCBmcmFtZVJhdGUgPSAxNVxuXG5cblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlkZW86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICAgICAgLmNvZGVjc1xuICAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAgICAgICAgIGVsc2UgaWYgKHNpbXVsY2FzdEVuY29kaW5ncylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IHNpbXVsY2FzdEVuY29kaW5ncztcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IHdlYkNhbVN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICAgICAgICB3ZWJDYW1TdHJlYW0uc2V0UHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIHRoaXMub25DYW1Qcm9kdWNpbmcubmV4dCh3ZWJDYW1TdHJlYW0pXG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2VNZWV0aW5nKCknKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAnbW9kaWZ5UGVlckNvbnN1bWVyKCkgW3BlZXJJZDpcIiVzXCIsIHR5cGU6XCIlc1wiXScsXG4gICAgICBwZWVySWQsXG4gICAgICB0eXBlXG4gICAgKTtcblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChjb25zdCBjb25zdW1lciBvZiB0aGlzLl9jb25zdW1lcnMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKGNvbnN1bWVyLmFwcERhdGEucGVlcklkID09PSBwZWVySWQgJiYgY29uc3VtZXIuYXBwRGF0YS5zb3VyY2UgPT09IHR5cGUpIHtcbiAgICAgICAgICBpZiAobXV0ZSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncGF1c2VDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnBhdXNlKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdyZXN1bWVDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnJlc3VtZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8sIHRva2VuIH0pIHtcblxuXG4gICAgdGhpcy5fcm9vbUlkID0gcm9vbUlkO1xuXG5cbiAgICAvLyBpbml0aWFsaXplIHNpZ25hbGluZyBzb2NrZXRcbiAgICAvLyBsaXN0ZW4gdG8gc29ja2V0IGV2ZW50c1xuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5pbml0KHRva2VuKVxuICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uRGlzY29ubmVjdGVkLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcbiAgICAgIC8vIHRoaXMuY2xvc2VcbiAgICB9KSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25SZWNvbm5lY3Rpbmcuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuXG4gICAgICB0aGlzLmxvZ2dlci5sb2coJ1JlY29ubmVjdGluZy4uLicpXG5cblxuXHRcdFx0aWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblx0XHRcdH1cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xlYXJQZWVycygpO1xuXG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldFJvb21TdGF0ZSgnY29ubmVjdGluZycpKTtcbiAgICB9KSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5ld0NvbnN1bWVyLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChkYXRhKSA9PiB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHBlZXJJZCxcbiAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgaWQsXG4gICAgICAgIGtpbmQsXG4gICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFwcERhdGEsXG4gICAgICAgIHByb2R1Y2VyUGF1c2VkXG4gICAgICB9ID0gZGF0YTtcblxuICAgICAgY29uc3QgY29uc3VtZXIgID0gYXdhaXQgdGhpcy5fcmVjdlRyYW5zcG9ydC5jb25zdW1lKFxuICAgICAgICB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgcHJvZHVjZXJJZCxcbiAgICAgICAgICBraW5kLFxuICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgYXBwRGF0YSA6IHsgLi4uYXBwRGF0YSwgcGVlcklkIH0gLy8gVHJpY2suXG4gICAgICAgIH0pIGFzIG1lZGlhc291cENsaWVudC50eXBlcy5Db25zdW1lcjtcblxuICAgICAgLy8gU3RvcmUgaW4gdGhlIG1hcC5cbiAgICAgIHRoaXMuX2NvbnN1bWVycy5zZXQoY29uc3VtZXIuaWQsIGNvbnN1bWVyKTtcblxuICAgICAgY29uc3VtZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT5cbiAgICAgIHtcbiAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lci5pZCk7XG4gICAgICB9KTtcblxuXG5cblxuICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3Q29uc3VtZXIoY29uc3VtZXIsICBwZWVySWQsIHR5cGUsIHByb2R1Y2VyUGF1c2VkKTtcblxuICAgICAgLy8gV2UgYXJlIHJlYWR5LiBBbnN3ZXIgdGhlIHJlcXVlc3Qgc28gdGhlIHNlcnZlciB3aWxsXG4gICAgICAvLyByZXN1bWUgdGhpcyBDb25zdW1lciAod2hpY2ggd2FzIHBhdXNlZCBmb3Igbm93KS5cblxuXG4gICAgICAvLyBpZiAoa2luZCA9PT0gJ2F1ZGlvJylcbiAgICAgIC8vIHtcbiAgICAgIC8vICAgY29uc3VtZXIudm9sdW1lID0gMDtcblxuICAgICAgLy8gICBjb25zdCBzdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuICAgICAgLy8gICBzdHJlYW0uYWRkVHJhY2soY29uc3VtZXIudHJhY2spO1xuXG4gICAgICAvLyAgIGlmICghc3RyZWFtLmdldEF1ZGlvVHJhY2tzKClbMF0pXG4gICAgICAvLyAgICAgdGhyb3cgbmV3IEVycm9yKCdyZXF1ZXN0Lm5ld0NvbnN1bWVyIHwgZ2l2ZW4gc3RyZWFtIGhhcyBubyBhdWRpbyB0cmFjaycpO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsgPSBoYXJrKHN0cmVhbSwgeyBwbGF5OiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICAgICAgLy8ge1xuICAgICAgICAvLyAgIHZvbHVtZSA9IE1hdGgucm91bmQodm9sdW1lKTtcblxuICAgICAgICAvLyAgIGlmIChjb25zdW1lciAmJiB2b2x1bWUgIT09IGNvbnN1bWVyLnZvbHVtZSlcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBjb25zdW1lci52b2x1bWUgPSB2b2x1bWU7XG5cbiAgICAgICAgLy8gICAgIC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUocGVlcklkLCB2b2x1bWUpKTtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH0pO1xuICAgICAgLy8gfVxuXG4gICAgfSkpLnN1YnNjcmliZSgpKVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTm90aWZpY2F0aW9uLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG4gICAgICAgIG5vdGlmaWNhdGlvbi5tZXRob2QsIG5vdGlmaWNhdGlvbi5kYXRhKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoIChub3RpZmljYXRpb24ubWV0aG9kKSB7XG5cblxuXG4gICAgICAgICAgY2FzZSAncHJvZHVjZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcHJvZHVjZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclNjb3JlKHByb2R1Y2VySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICduZXdQZWVyJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyQWN0aW9ucy5hZGRQZWVyKFxuICAgICAgICAgICAgICAvLyAgIHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcywgY29uc3VtZXJzOiBbXSB9KSk7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3UGVlcihpZCk7XG5cbiAgICAgICAgICAgICAgLy8gdGhpcy5fc291bmROb3RpZmljYXRpb24oKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgICAgIC8vICAge1xuICAgICAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgLy8gICAgICAgaWQ6ICdyb29tLm5ld1BlZXInLFxuICAgICAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ3tkaXNwbGF5TmFtZX0gam9pbmVkIHRoZSByb29tJ1xuICAgICAgICAgICAgICAvLyAgICAgfSwge1xuICAgICAgICAgICAgICAvLyAgICAgICBkaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdwZWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsb3NlUGVlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHBlZXJBY3Rpb25zLnJlbW92ZVBlZXIocGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNvbnN1bWVyLmNsb3NlKCk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvbnN1bWVyLmhhcmsgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb25zdW1lci5oYXJrLnN0b3AoKTtcblxuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBjb25zdW1lci5hcHBEYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5yZW1vdmVDb25zdW1lcihjb25zdW1lcklkLCBwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUGF1c2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclJlc3VtZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckxheWVyc0NoYW5nZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm9uQ29uc3VtZXJMYXllckNoYW5nZWQoY29uc3VtZXJJZClcbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyQ3VycmVudExheWVycyhcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJTY29yZShjb25zdW1lcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncm9vbUJhY2snOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY2FzZSAncm9vbVJlYWR5JzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7IHR1cm5TZXJ2ZXJzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAgICAgdGhpcy5fdHVyblNlcnZlcnMgPSB0dXJuU2VydmVycztcblxuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMudG9nZ2xlSm9pbmVkKCkpO1xuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SW5Mb2JieShmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZVNwZWFrZXInOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG5cblxuICAgICAgICAgICAgICBpZiAocGVlcklkID09PSB0aGlzLl9wZWVySWQpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMub25Wb2x1bWVDaGFuZ2UubmV4dChub3RpZmljYXRpb24uZGF0YSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAvLyB0aGlzLl9zcG90bGlnaHRzLmhhbmRsZUFjdGl2ZVNwZWFrZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLy8gdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIC8vICAgJ3Vua25vd24gbm90aWZpY2F0aW9uLm1ldGhvZCBcIiVzXCInLCBub3RpZmljYXRpb24ubWV0aG9kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdlcnJvciBvbiBzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnc29ja2V0LnJlcXVlc3RFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRXJyb3Igb24gc2VydmVyIHJlcXVlc3QnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcbiAgICAvLyBvbiByb29tIHJlYWR5IGpvaW4gcm9vbSBfam9pblJvb21cblxuICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAvLyBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgIC8vICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAvLyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgLy8gICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgLy8gYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAvLyBjcmVhdGUgc2VuZCB0cmFuc3BvcnQgY3JlYXRlV2ViUnRjVHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3J0XG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIGNyZWF0ZSByZWNlaXZlIHRyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9yXG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIHNlbmQgam9pbiByZXF1ZXN0XG5cbiAgICAvLyBhZGQgcGVlcnMgdG8gcGVlcnMgc2VydmljZVxuXG4gICAgLy8gcHJvZHVjZSB1cGRhdGVXZWJjYW0gdXBkYXRlTWljXG4gIH1cblxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb0RldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb0RldmljZXModGhpcy5fYXVkaW9EZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvRGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVXZWJjYW1zKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl93ZWJjYW1zID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAndmlkZW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2Ftc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldFdlYmNhbURldmljZXModGhpcy5fd2ViY2FtcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVXZWJjYW1zKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgZGlzYWJsZVdlYmNhbSgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZVdlYmNhbSgpJyk7XG5cblx0XHRpZiAoIXRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKHRydWUpKTtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyhmYWxzZSkpO1xuXHR9XG5cdGFzeW5jIGRpc2FibGVNaWMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVNaWMoKScpO1xuXG5cdFx0aWYgKCF0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHRhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG5cdFx0XHRcdCdjbG9zZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdkaXNhYmxlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cblxuXHRhc3luYyBfZ2V0V2ViY2FtRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuXG5cdFx0XHRjb25zdCAgc2VsZWN0ZWRXZWJjYW0gPSAgbnVsbFxuXG5cdFx0XHRpZiAoc2VsZWN0ZWRXZWJjYW0gJiYgdGhpcy5fd2ViY2Ftc1tzZWxlY3RlZFdlYmNhbV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZFdlYmNhbTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3Qgd2ViY2FtcyA9IE9iamVjdC52YWx1ZXModGhpcy5fd2ViY2Ftcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gd2ViY2Ftc1swXSA/IHdlYmNhbXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cbiAgfVxuXG5cblx0YXN5bmMgX2dldEF1ZGlvRGV2aWNlSWQoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlQXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuXG4gICAgICBjb25zdCAgc2VsZWN0ZWRBdWRpb0RldmljZSA9IG51bGw7XG5cblx0XHRcdGlmIChzZWxlY3RlZEF1ZGlvRGV2aWNlICYmIHRoaXMuX2F1ZGlvRGV2aWNlc1tzZWxlY3RlZEF1ZGlvRGV2aWNlXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkQXVkaW9EZXZpY2U7XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IGF1ZGlvRGV2aWNlcyA9IE9iamVjdC52YWx1ZXModGhpcy5fYXVkaW9EZXZpY2VzKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiBhdWRpb0RldmljZXNbMF0gPyBhdWRpb0RldmljZXNbMF0uZGV2aWNlSWQgOiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ19nZXRBdWRpb0RldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvb3V0cHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dERldmljZXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cblxuICBhc3luYyBfam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19qb2luUm9vbSgpIERldmljZScsIHRoaXMuX2RldmljZSk7XG5cbiAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGBHdWVzdCAke01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqICgxMDAwMDAgLSAxMDAwMCkpICsgMTAwMDB9YFxuXG5cbiAgICB0cnkge1xuXG5cbiAgICAgIGlmICh0aGlzLl9kZXZpY2Uub3MgPT09ICdpb3MnKSB7XG4gICAgICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKHtoYW5kbGVyTmFtZTonU2FmYXJpMTInfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgICByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgICAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICAgIHByb2R1Y2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnN1bWluZzogZmFsc2VcbiAgICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlU2VuZFRyYW5zcG9ydChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvcHJpZXRhcnlDb25zdHJhaW50czogUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFNcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdwcm9kdWNlJywgYXN5bmMgKHsga2luZCwgcnRwUGFyYW1ldGVycywgYXBwRGF0YSB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgICdwcm9kdWNlJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBhcHBEYXRhXG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayh7IGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGVycmJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgIHByb2R1Y2luZzogZmFsc2UsXG4gICAgICAgICAgY29uc3VtaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkLFxuICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlUmVjdlRyYW5zcG9ydChcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQub24oXG4gICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICB7XG4gICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBvdXIgbWVkaWEgY2FwYWJpbGl0aWVzLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldE1lZGlhQ2FwYWJpbGl0aWVzKFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0Y2FuU2VuZE1pYyAgICAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TZW5kV2ViY2FtICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlU2NyZWVuIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykgJiZcbiAgICAgIC8vIFx0XHRcdHRoaXMuX3NjcmVlblNoYXJpbmcuaXNTY3JlZW5TaGFyZUF2YWlsYWJsZSgpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlRmlsZXMgOiB0aGlzLl90b3JyZW50U3VwcG9ydFxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICB0cmFja2VyLFxuICAgICAgICByb29tUGVybWlzc2lvbnMsXG4gICAgICAgIHVzZXJSb2xlcyxcbiAgICAgICAgYWxsb3dXaGVuUm9sZU1pc3NpbmcsXG4gICAgICAgIGNoYXRIaXN0b3J5LFxuICAgICAgICBmaWxlSGlzdG9yeSxcbiAgICAgICAgbGFzdE5IaXN0b3J5LFxuICAgICAgICBsb2NrZWQsXG4gICAgICAgIGxvYmJ5UGVlcnMsXG4gICAgICAgIGFjY2Vzc0NvZGVcbiAgICAgIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdqb2luJyxcbiAgICAgICAge1xuICAgICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcblxuICAgICAgICAgIHJ0cENhcGFiaWxpdGllczogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdfam9pblJvb20oKSBqb2luZWQgW2F1dGhlbnRpY2F0ZWQ6XCIlc1wiLCBwZWVyczpcIiVvXCIsIHJvbGVzOlwiJW9cIiwgdXNlclJvbGVzOlwiJW9cIl0nLFxuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHVzZXJSb2xlc1xuICAgICAgKTtcblxuXG5cblxuXG4gICAgICAvLyBmb3IgKGNvbnN0IHBlZXIgb2YgcGVlcnMpXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHBlZXJBY3Rpb25zLmFkZFBlZXIoeyAuLi5wZWVyLCBjb25zdW1lcnM6IFtdIH0pKTtcbiAgICAgIC8vIH1cblxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnam9pbiBhdWRpbycsam9pbkF1ZGlvICwgJ2NhbiBwcm9kdWNlIGF1ZGlvJyxcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSwgJyB0aGlzLl9tdXRlZCcsIHRoaXMuX211dGVkKVxuICAgICAgLy8gRG9uJ3QgcHJvZHVjZSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCB0byBub3QgdG8gZG8gaXQuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pblZpZGVvXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgaW5pdDogdHJ1ZSwgc3RhcnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5BdWRpbyAmJlxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpXG4gICAgICAgIClcbiAgICAgICAgICBpZiAoIXRoaXMuX211dGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gY29uc3QgIHNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgID0gbnVsbFxuXG4gICAgICAvLyBpZiAoIXNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgJiYgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzICE9PSB7fSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0c2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoXG4gICAgICAvLyBcdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpWzBdXG4gICAgICAvLyBcdFx0KVxuICAgICAgLy8gXHQpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblxuICAgICAgLy8gLy8gQ2xlYW4gYWxsIHRoZSBleGlzdGluZyBub3RpZmljYXRpb25zLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobm90aWZpY2F0aW9uQWN0aW9ucy5yZW1vdmVBbGxOb3RpZmljYXRpb25zKCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHR0ZXh0IDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vIFx0XHRcdGlkICAgICAgICAgICAgIDogJ3Jvb20uam9pbmVkJyxcbiAgICAgIC8vIFx0XHRcdGRlZmF1bHRNZXNzYWdlIDogJ1lvdSBoYXZlIGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgIC8vIFx0XHR9KVxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmFkZFBlZXJzKHBlZXJzKTtcblxuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19qb2luUm9vbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbiAgZGV2aWNlSW5mbygpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodWEpO1xuXG4gICAgbGV0IGZsYWc7XG5cbiAgICBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBjaHJvbWU6ICc+PTAnLCBjaHJvbWl1bTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2Nocm9tZSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBmaXJlZm94OiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZmlyZWZveCc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBzYWZhcmk6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdzYWZhcmknO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgb3BlcmE6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdvcGVyYSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyAnbWljcm9zb2Z0IGVkZ2UnOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZWRnZSc7XG4gICAgZWxzZVxuICAgICAgZmxhZyA9ICd1bmtub3duJztcblxuICAgIHJldHVybiB7XG4gICAgICBmbGFnLFxuICAgICAgb3M6IGJyb3dzZXIuZ2V0T1NOYW1lKHRydWUpLCAvLyBpb3MsIGFuZHJvaWQsIGxpbnV4Li4uXG4gICAgICBwbGF0Zm9ybTogYnJvd3Nlci5nZXRQbGF0Zm9ybVR5cGUodHJ1ZSksIC8vIG1vYmlsZSwgZGVza3RvcCwgdGFibGV0XG4gICAgICBuYW1lOiBicm93c2VyLmdldEJyb3dzZXJOYW1lKHRydWUpLFxuICAgICAgdmVyc2lvbjogYnJvd3Nlci5nZXRCcm93c2VyVmVyc2lvbigpLFxuICAgICAgYm93c2VyOiBicm93c2VyXG4gICAgfTtcbiAgfVxufVxuIl19
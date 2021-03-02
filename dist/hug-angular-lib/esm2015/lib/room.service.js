import { __awaiter } from "tslib";
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
let saveAs;
const lastN = 4;
const mobileLastN = 1;
const videoAspectRatio = 1.777;
const simulcast = true;
const simulcastEncodings = [
    { scaleResolutionDownBy: 4 },
    { scaleResolutionDownBy: 2 },
    { scaleResolutionDownBy: 1 }
];
const VIDEO_CONSTRAINS = {
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
const PC_PROPRIETARY_CONSTRAINTS = {
    optional: [{ googDscp: true }]
};
const VIDEO_SIMULCAST_ENCODINGS = [
    { scaleResolutionDownBy: 4, maxBitRate: 100000 },
    { scaleResolutionDownBy: 1, maxBitRate: 1200000 }
];
// Used for VP9 webcam video.
const VIDEO_KSVC_ENCODINGS = [
    { scalabilityMode: 'S3T3_KEY' }
];
// Used for VP9 desktop sharing.
const VIDEO_SVC_ENCODINGS = [
    { scalabilityMode: 'S3T3', dtx: true }
];
export class RoomService {
    constructor(signalingService, logger, remotePeersService) {
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
    init({ peerId = null, produce = true, forceTcp = false, muted = false } = {}) {
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
    }
    close() {
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
        this.subscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
    }
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
    _startDevicesListener() {
        navigator.mediaDevices.addEventListener('devicechange', () => __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');
            yield this._updateAudioDevices();
            yield this._updateWebcams();
            yield this._updateAudioOutputDevices();
            // store.dispatch(requestActions.notify(
            //   {
            //     text: intl.formatMessage({
            //       id: 'devices.devicesChanged',
            //       defaultMessage: 'Your devices changed, configure your devices in the settings dialog'
            //     })
            //   }));
        }));
    }
    muteMic() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('muteMic()');
            this._micProducer.pause();
            try {
                yield this.signalingService.sendRequest('pauseProducer', { producerId: this._micProducer.id });
                // store.dispatch(
                //   producerActions.setProducerPaused(this._micProducer.id));
                // store.dispatch(
                //   settingsActions.setAudioMuted(true));
            }
            catch (error) {
                this.logger.error('muteMic() [error:"%o"]', error);
                // store.dispatch(requestActions.notify(
                //   {
                //     type: 'error',
                //     text: intl.formatMessage({
                //       id: 'devices.microphoneMuteError',
                //       defaultMessage: 'Unable to mute your microphone'
                //     })
                //   }));
            }
        });
    }
    unmuteMic() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('unmuteMic()');
            if (!this._micProducer) {
                this.updateMic({ start: true });
            }
            else {
                this._micProducer.resume();
                try {
                    yield this.signalingService.sendRequest('resumeProducer', { producerId: this._micProducer.id });
                    // store.dispatch(
                    //   producerActions.setProducerResumed(this._micProducer.id));
                    // store.dispatch(
                    //   settingsActions.setAudioMuted(false));
                }
                catch (error) {
                    this.logger.error('unmuteMic() [error:"%o"]', error);
                    // store.dispatch(requestActions.notify(
                    //   {
                    //     type: 'error',
                    //     text: intl.formatMessage({
                    //       id: 'devices.microphoneUnMuteError',
                    //       defaultMessage: 'Unable to unmute your microphone'
                    //     })
                    //   }));
                }
            }
        });
    }
    disconnectLocalHark() {
        this.logger.debug('disconnectLocalHark()');
        if (this._harkStream != null) {
            let [track] = this._harkStream.getAudioTracks();
            track.stop();
            track = null;
            this._harkStream = null;
        }
        if (this._hark != null)
            this._hark.stop();
    }
    connectLocalHark(track) {
        this.logger.debug('connectLocalHark() [track:"%o"]', track);
        this._harkStream = new MediaStream();
        const newTrack = track.clone();
        this._harkStream.addTrack(newTrack);
        newTrack.enabled = true;
        this._hark = hark(this._harkStream, {
            play: false,
            interval: 10,
            threshold: -50,
            history: 100
        });
        this._hark.lastVolume = -100;
        this._hark.on('volume_change', (volume) => {
            // Update only if there is a bigger diff
            if (this._micProducer && Math.abs(volume - this._hark.lastVolume) > 0.5) {
                // Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
                // This makes decay volume fast if difference to last saved value is big
                // and slow for small changes. This prevents flickering volume indicator
                // at low levels
                if (volume < this._hark.lastVolume) {
                    volume =
                        this._hark.lastVolume -
                            Math.pow((volume - this._hark.lastVolume) /
                                (100 + this._hark.lastVolume), 2) * 10;
                }
                this._hark.lastVolume = volume;
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
    }
    changeAudioOutputDevice(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);
            // store.dispatch(
            //   meActions.setAudioOutputInProgress(true));
            try {
                const device = this._audioOutputDevices[deviceId];
                if (!device)
                    throw new Error('Selected audio output device no longer available');
                // store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
                yield this._updateAudioOutputDevices();
            }
            catch (error) {
                this.logger.error('changeAudioOutputDevice() [error:"%o"]', error);
            }
            // store.dispatch(
            //   meActions.setAudioOutputInProgress(false));
        });
    }
    // Only Firefox supports applyConstraints to audio tracks
    // See:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    updateMic({ start = false, restart = false || this._device.flag !== 'firefox', newDeviceId = null } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]', start, restart, newDeviceId);
            let track;
            try {
                if (!this._mediasoupDevice.canProduce('audio'))
                    throw new Error('cannot produce audio');
                if (newDeviceId && !restart)
                    throw new Error('changing device requires restart');
                // if (newDeviceId)
                //   store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));
                // store.dispatch(meActions.setAudioInProgress(true));
                const deviceId = yield this._getAudioDeviceId();
                const device = this._audioDevices[deviceId];
                if (!device)
                    throw new Error('no audio devices');
                const autoGainControl = false;
                const echoCancellation = true;
                const noiseSuppression = true;
                // if (!window.config.centralAudioOptions) {
                //   throw new Error(
                //     'Missing centralAudioOptions from app config! (See it in example config.)'
                //   );
                // }
                const { sampleRate = 96000, channelCount = 1, volume = 1.0, sampleSize = 16, opusStereo = false, opusDtx = true, opusFec = true, opusPtime = 20, opusMaxPlaybackRate = 96000 } = {};
                if ((restart && this._micProducer) ||
                    start) {
                    // this.disconnectLocalHark();
                    if (this._micProducer)
                        yield this.disableMic();
                    const stream = yield navigator.mediaDevices.getUserMedia({
                        audio: {
                            deviceId: { ideal: deviceId },
                            sampleRate,
                            channelCount,
                            // @ts-ignore
                            volume,
                            autoGainControl,
                            echoCancellation,
                            noiseSuppression,
                            sampleSize
                        }
                    });
                    ([track] = stream.getAudioTracks());
                    const { deviceId: trackDeviceId } = track.getSettings();
                    // store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));
                    this._micProducer = yield this._sendTransport.produce({
                        track,
                        codecOptions: {
                            opusStereo,
                            opusDtx,
                            opusFec,
                            opusPtime,
                            opusMaxPlaybackRate
                        },
                        appData: { source: 'mic' }
                    });
                    // store.dispatch(producerActions.addProducer(
                    //   {
                    //     id: this._micProducer.id,
                    //     source: 'mic',
                    //     paused: this._micProducer.paused,
                    //     track: this._micProducer.track,
                    //     rtpParameters: this._micProducer.rtpParameters,
                    //     codec: this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                    //   }));
                    this._micProducer.on('transportclose', () => {
                        this._micProducer = null;
                    });
                    this._micProducer.on('trackended', () => {
                        // store.dispatch(requestActions.notify(
                        //   {
                        //     type: 'error',
                        //     text: intl.formatMessage({
                        //       id: 'devices.microphoneDisconnected',
                        //       defaultMessage: 'Microphone disconnected'
                        //     })
                        //   }));
                        this.disableMic();
                    });
                    this._micProducer.volume = 0;
                    this.connectLocalHark(track);
                }
                else if (this._micProducer) {
                    ({ track } = this._micProducer);
                    yield track.applyConstraints({
                        sampleRate,
                        channelCount,
                        volume,
                        autoGainControl,
                        echoCancellation,
                        noiseSuppression,
                        sampleSize
                    });
                    if (this._harkStream != null) {
                        const [harkTrack] = this._harkStream.getAudioTracks();
                        harkTrack && (yield harkTrack.applyConstraints({
                            sampleRate,
                            channelCount,
                            volume,
                            autoGainControl,
                            echoCancellation,
                            noiseSuppression,
                            sampleSize
                        }));
                    }
                }
                yield this._updateAudioDevices();
            }
            catch (error) {
                this.logger.error('updateMic() [error:"%o"]', error);
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
            }
            // store.dispatch(meActions.setAudioInProgress(false));
        });
    }
    updateWebcam({ init = false, start = false, restart = false, newDeviceId = null, newResolution = null, newFrameRate = null } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]', start, restart, newDeviceId, newResolution, newFrameRate);
            let track;
            try {
                if (!this._mediasoupDevice.canProduce('video'))
                    throw new Error('cannot produce video');
                if (newDeviceId && !restart)
                    throw new Error('changing device requires restart');
                // if (newDeviceId)
                //   store.dispatch(settingsActions.setSelectedWebcamDevice(newDeviceId));
                // if (newResolution)
                //   store.dispatch(settingsActions.setVideoResolution(newResolution));
                // if (newFrameRate)
                //   store.dispatch(settingsActions.setVideoFrameRate(newFrameRate));
                const videoMuted = false;
                if (init && videoMuted)
                    return;
                // else
                // store.dispatch(settingsActions.setVideoMuted(false));
                // store.dispatch(meActions.setWebcamInProgress(true));
                const deviceId = yield this._getWebcamDeviceId();
                const device = this._webcams[deviceId];
                if (!device)
                    throw new Error('no webcam devices');
                const resolution = 'medium';
                const frameRate = 15;
                if ((restart && this._webcamProducer) ||
                    start) {
                    if (this._webcamProducer)
                        yield this.disableWebcam();
                    const stream = yield navigator.mediaDevices.getUserMedia({
                        video: Object.assign(Object.assign({ deviceId: { ideal: deviceId } }, VIDEO_CONSTRAINS[resolution]), { frameRate })
                    });
                    ([track] = stream.getVideoTracks());
                    const { deviceId: trackDeviceId } = track.getSettings();
                    // store.dispatch(settingsActions.setSelectedWebcamDevice(trackDeviceId));
                    if (this._useSimulcast) {
                        // If VP9 is the only available video codec then use SVC.
                        const firstVideoCodec = this._mediasoupDevice
                            .rtpCapabilities
                            .codecs
                            .find((c) => c.kind === 'video');
                        let encodings;
                        if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
                            encodings = VIDEO_KSVC_ENCODINGS;
                        else if (simulcastEncodings)
                            encodings = simulcastEncodings;
                        else
                            encodings = VIDEO_SIMULCAST_ENCODINGS;
                        this._webcamProducer = yield this._sendTransport.produce({
                            track,
                            encodings,
                            codecOptions: {
                                videoGoogleStartBitrate: 1000
                            },
                            appData: {
                                source: 'webcam'
                            }
                        });
                    }
                    else {
                        this._webcamProducer = yield this._sendTransport.produce({
                            track,
                            appData: {
                                source: 'webcam'
                            }
                        });
                    }
                    // store.dispatch(producerActions.addProducer(
                    //   {
                    //     id: this._webcamProducer.id,
                    //     source: 'webcam',
                    //     paused: this._webcamProducer.paused,
                    //     track: this._webcamProducer.track,
                    //     rtpParameters: this._webcamProducer.rtpParameters,
                    //     codec: this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
                    //   }));
                    const webCamStream = new Stream();
                    webCamStream.setProducer(this._webcamProducer);
                    this.onCamProducing.next(webCamStream);
                    this._webcamProducer.on('transportclose', () => {
                        this._webcamProducer = null;
                    });
                    this._webcamProducer.on('trackended', () => {
                        // store.dispatch(requestActions.notify(
                        //   {
                        //     type: 'error',
                        //     text: intl.formatMessage({
                        //       id: 'devices.cameraDisconnected',
                        //       defaultMessage: 'Camera disconnected'
                        //     })
                        //   }));
                        this.disableWebcam();
                    });
                }
                else if (this._webcamProducer) {
                    ({ track } = this._webcamProducer);
                    yield track.applyConstraints(Object.assign(Object.assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate }));
                    // Also change resolution of extra video producers
                    for (const producer of this._extraVideoProducers.values()) {
                        ({ track } = producer);
                        yield track.applyConstraints(Object.assign(Object.assign({}, VIDEO_CONSTRAINS[resolution]), { frameRate }));
                    }
                }
                yield this._updateWebcams();
            }
            catch (error) {
                this.logger.error('updateWebcam() [error:"%o"]', error);
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
            }
            // store.dispatch(
            //   meActions.setWebcamInProgress(false));
        });
    }
    closeMeeting() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('closeMeeting()');
            // store.dispatch(
            //   roomActions.setCloseMeetingInProgress(true));
            try {
                yield this.signalingService.sendRequest('moderator:closeMeeting');
            }
            catch (error) {
                this.logger.error('closeMeeting() [error:"%o"]', error);
            }
            // store.dispatch(
            //   roomActions.setCloseMeetingInProgress(false));
        });
    }
    // // type: mic/webcam/screen
    // // mute: true/false
    modifyPeerConsumer(peerId, type, mute) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('modifyPeerConsumer() [peerId:"%s", type:"%s"]', peerId, type);
            // if (type === 'mic')
            //   store.dispatch(
            //     peerActions.setPeerAudioInProgress(peerId, true));
            // else if (type === 'webcam')
            //   store.dispatch(
            //     peerActions.setPeerVideoInProgress(peerId, true));
            // else if (type === 'screen')
            //   store.dispatch(
            //     peerActions.setPeerScreenInProgress(peerId, true));
            try {
                for (const consumer of this._consumers.values()) {
                    if (consumer.appData.peerId === peerId && consumer.appData.source === type) {
                        if (mute)
                            yield this._pauseConsumer(consumer);
                        else
                            yield this._resumeConsumer(consumer);
                    }
                }
            }
            catch (error) {
                this.logger.error('modifyPeerConsumer() [error:"%o"]', error);
            }
            // if (type === 'mic')
            //   store.dispatch(
            //     peerActions.setPeerAudioInProgress(peerId, false));
            // else if (type === 'webcam')
            //   store.dispatch(
            //     peerActions.setPeerVideoInProgress(peerId, false));
            // else if (type === 'screen')
            //   store.dispatch(
            //     peerActions.setPeerScreenInProgress(peerId, false));
        });
    }
    _pauseConsumer(consumer) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);
            if (consumer.paused || consumer.closed)
                return;
            try {
                yield this.signalingService.sendRequest('pauseConsumer', { consumerId: consumer.id });
                consumer.pause();
                // store.dispatch(
                //   consumerActions.setConsumerPaused(consumer.id, 'local'));
            }
            catch (error) {
                this.logger.error('_pauseConsumer() [error:"%o"]', error);
            }
        });
    }
    _resumeConsumer(consumer) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);
            if (!consumer.paused || consumer.closed)
                return;
            try {
                yield this.signalingService.sendRequest('resumeConsumer', { consumerId: consumer.id });
                consumer.resume();
                // store.dispatch(
                //   consumerActions.setConsumerResumed(consumer.id, 'local'));
            }
            catch (error) {
                this.logger.error('_resumeConsumer() [error:"%o"]', error);
            }
        });
    }
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
    join({ roomId, joinVideo, joinAudio, token }) {
        return __awaiter(this, void 0, void 0, function* () {
            this._roomId = roomId;
            // initialize signaling socket
            // listen to socket events
            this.signalingService.init(token);
            this.subscriptions.push(this.signalingService.onDisconnected.subscribe(() => {
                // close
                // this.close
            }));
            this.subscriptions.push(this.signalingService.onReconnecting.subscribe(() => {
                // close
                if (this._webcamProducer) {
                    this._webcamProducer.close();
                    // store.dispatch(
                    // 	producerActions.removeProducer(this._webcamProducer.id));
                    this._webcamProducer = null;
                }
                if (this._micProducer) {
                    this._micProducer.close();
                    // store.dispatch(
                    // 	producerActions.removeProducer(this._micProducer.id));
                    this._micProducer = null;
                }
                if (this._sendTransport) {
                    this._sendTransport.close();
                    this._sendTransport = null;
                }
                if (this._recvTransport) {
                    this._recvTransport.close();
                    this._recvTransport = null;
                }
                this.remotePeersService.clearPeers();
                // store.dispatch(roomActions.setRoomState('connecting'));
            }));
            this.subscriptions.push(this.signalingService.onNewConsumer.pipe(switchMap((data) => __awaiter(this, void 0, void 0, function* () {
                const { peerId, producerId, id, kind, rtpParameters, type, appData, producerPaused } = data;
                const consumer = yield this._recvTransport.consume({
                    id,
                    producerId,
                    kind,
                    rtpParameters,
                    appData: Object.assign(Object.assign({}, appData), { peerId }) // Trick.
                });
                // Store in the map.
                this._consumers.set(consumer.id, consumer);
                consumer.on('transportclose', () => {
                    this._consumers.delete(consumer.id);
                });
                this.remotePeersService.newConsumer(consumer, peerId, type, producerPaused);
                // We are ready. Answer the request so the server will
                // resume this Consumer (which was paused for now).
                // if (kind === 'audio')
                // {
                //   consumer.volume = 0;
                //   const stream = new MediaStream();
                //   stream.addTrack(consumer.track);
                //   if (!stream.getAudioTracks()[0])
                //     throw new Error('request.newConsumer | given stream has no audio track');
                // consumer.hark = hark(stream, { play: false });
                // consumer.hark.on('volume_change', (volume) =>
                // {
                //   volume = Math.round(volume);
                //   if (consumer && volume !== consumer.volume)
                //   {
                //     consumer.volume = volume;
                //     // store.dispatch(peerVolumeActions.setPeerVolume(peerId, volume));
                //   }
                // });
                // }
            }))).subscribe());
            this.subscriptions.push(this.signalingService.onNotification.pipe(switchMap((notification) => __awaiter(this, void 0, void 0, function* () {
                this.logger.debug('socket "notification" event [method:"%s", data:"%o"]', notification.method, notification.data);
                try {
                    switch (notification.method) {
                        case 'producerScore':
                            {
                                const { producerId, score } = notification.data;
                                // store.dispatch(
                                //   producerActions.setProducerScore(producerId, score));
                                break;
                            }
                        case 'newPeer':
                            {
                                const { id, displayName, picture, roles } = notification.data;
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
                                break;
                            }
                        case 'peerClosed':
                            {
                                const { peerId } = notification.data;
                                this.remotePeersService.closePeer(peerId);
                                // store.dispatch(
                                //   peerActions.removePeer(peerId));
                                break;
                            }
                        case 'consumerClosed':
                            {
                                const { consumerId } = notification.data;
                                const consumer = this._consumers.get(consumerId);
                                if (!consumer)
                                    break;
                                consumer.close();
                                if (consumer.hark != null)
                                    consumer.hark.stop();
                                this._consumers.delete(consumerId);
                                const { peerId } = consumer.appData;
                                // store.dispatch(
                                //   consumerActions.removeConsumer(consumerId, peerId));
                                break;
                            }
                        case 'consumerPaused':
                            {
                                const { consumerId } = notification.data;
                                const consumer = this._consumers.get(consumerId);
                                if (!consumer)
                                    break;
                                // store.dispatch(
                                //   consumerActions.setConsumerPaused(consumerId, 'remote'));
                                break;
                            }
                        case 'consumerResumed':
                            {
                                const { consumerId } = notification.data;
                                const consumer = this._consumers.get(consumerId);
                                if (!consumer)
                                    break;
                                // store.dispatch(
                                //   consumerActions.setConsumerResumed(consumerId, 'remote'));
                                break;
                            }
                        case 'consumerLayersChanged':
                            {
                                const { consumerId, spatialLayer, temporalLayer } = notification.data;
                                const consumer = this._consumers.get(consumerId);
                                if (!consumer)
                                    break;
                                this.remotePeersService.onConsumerLayerChanged(consumerId);
                                // store.dispatch(consumerActions.setConsumerCurrentLayers(
                                //   consumerId, spatialLayer, temporalLayer));
                                break;
                            }
                        case 'consumerScore':
                            {
                                const { consumerId, score } = notification.data;
                                // store.dispatch(
                                //   consumerActions.setConsumerScore(consumerId, score));
                                break;
                            }
                        case 'roomBack':
                            {
                                yield this._joinRoom({ joinVideo, joinAudio });
                                break;
                            }
                        case 'roomReady':
                            {
                                const { turnServers } = notification.data;
                                this._turnServers = turnServers;
                                // store.dispatch(roomActions.toggleJoined());
                                // store.dispatch(roomActions.setInLobby(false));
                                yield this._joinRoom({ joinVideo, joinAudio });
                                break;
                            }
                        case 'activeSpeaker':
                            {
                                const { peerId } = notification.data;
                                if (peerId === this._peerId) {
                                    this.onVolumeChange.next(notification.data);
                                }
                                // this._spotlights.handleActiveSpeaker(peerId);
                                break;
                            }
                        default:
                            {
                                // this.logger.error(
                                //   'unknown notification.method "%s"', notification.method);
                            }
                    }
                }
                catch (error) {
                    this.logger.error('error on socket "notification" event [error:"%o"]', error);
                    // store.dispatch(requestActions.notify(
                    //   {
                    //     type: 'error',
                    //     text: intl.formatMessage({
                    //       id: 'socket.requestError',
                    //       defaultMessage: 'Error on server request'
                    //     })
                    //   }));
                }
            }))).subscribe());
            // on room ready join room _joinRoom
            // this._mediasoupDevice = new mediasoupClient.Device();
            // const routerRtpCapabilities =
            //   await this.sendRequest('getRouterRtpCapabilities');
            // routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
            //   .filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');
            // await this._mediasoupDevice.load({ routerRtpCapabilities });
            // create send transport createWebRtcTransport this.signalingService.sendCreateTransport
            // listen to transport events
            // create receive transport this.signalingService.sendCreateTranspor
            // listen to transport events
            // send join request
            // add peers to peers service
            // produce updateWebcam updateMic
        });
    }
    _updateAudioDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_updateAudioDevices()');
            // Reset the list.
            this._audioDevices = {};
            try {
                this.logger.debug('_updateAudioDevices() | calling enumerateDevices()');
                const devices = yield navigator.mediaDevices.enumerateDevices();
                for (const device of devices) {
                    if (device.kind !== 'audioinput')
                        continue;
                    this._audioDevices[device.deviceId] = device;
                }
                // store.dispatch(
                // 	meActions.setAudioDevices(this._audioDevices));
            }
            catch (error) {
                this.logger.error('_updateAudioDevices() [error:"%o"]', error);
            }
        });
    }
    _updateWebcams() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_updateWebcams()');
            // Reset the list.
            this._webcams = {};
            try {
                this.logger.debug('_updateWebcams() | calling enumerateDevices()');
                const devices = yield navigator.mediaDevices.enumerateDevices();
                for (const device of devices) {
                    if (device.kind !== 'videoinput')
                        continue;
                    this._webcams[device.deviceId] = device;
                }
                // store.dispatch(
                // 	meActions.setWebcamDevices(this._webcams));
            }
            catch (error) {
                this.logger.error('_updateWebcams() [error:"%o"]', error);
            }
        });
    }
    disableWebcam() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('disableWebcam()');
            if (!this._webcamProducer)
                return;
            // store.dispatch(meActions.setWebcamInProgress(true));
            this._webcamProducer.close();
            // store.dispatch(
            // 	producerActions.removeProducer(this._webcamProducer.id));
            try {
                yield this.signalingService.sendRequest('closeProducer', { producerId: this._webcamProducer.id });
            }
            catch (error) {
                this.logger.error('disableWebcam() [error:"%o"]', error);
            }
            this._webcamProducer = null;
            // store.dispatch(settingsActions.setVideoMuted(true));
            // store.dispatch(meActions.setWebcamInProgress(false));
        });
    }
    disableMic() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('disableMic()');
            if (!this._micProducer)
                return;
            // store.dispatch(meActions.setAudioInProgress(true));
            this._micProducer.close();
            // store.dispatch(
            // 	producerActions.removeProducer(this._micProducer.id));
            try {
                yield this.signalingService.sendRequest('closeProducer', { producerId: this._micProducer.id });
            }
            catch (error) {
                this.logger.error('disableMic() [error:"%o"]', error);
            }
            this._micProducer = null;
            // store.dispatch(meActions.setAudioInProgress(false));
        });
    }
    _getWebcamDeviceId() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_getWebcamDeviceId()');
            try {
                this.logger.debug('_getWebcamDeviceId() | calling _updateWebcams()');
                yield this._updateWebcams();
                const selectedWebcam = null;
                if (selectedWebcam && this._webcams[selectedWebcam])
                    return selectedWebcam;
                else {
                    const webcams = Object.values(this._webcams);
                    // @ts-ignore
                    return webcams[0] ? webcams[0].deviceId : null;
                }
            }
            catch (error) {
                this.logger.error('_getWebcamDeviceId() [error:"%o"]', error);
            }
        });
    }
    _getAudioDeviceId() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_getAudioDeviceId()');
            try {
                this.logger.debug('_getAudioDeviceId() | calling _updateAudioDeviceId()');
                yield this._updateAudioDevices();
                const selectedAudioDevice = null;
                if (selectedAudioDevice && this._audioDevices[selectedAudioDevice])
                    return selectedAudioDevice;
                else {
                    const audioDevices = Object.values(this._audioDevices);
                    // @ts-ignore
                    return audioDevices[0] ? audioDevices[0].deviceId : null;
                }
            }
            catch (error) {
                this.logger.error('_getAudioDeviceId() [error:"%o"]', error);
            }
        });
    }
    _updateAudioOutputDevices() {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_updateAudioOutputDevices()');
            // Reset the list.
            this._audioOutputDevices = {};
            try {
                this.logger.debug('_updateAudioOutputDevices() | calling enumerateDevices()');
                const devices = yield navigator.mediaDevices.enumerateDevices();
                for (const device of devices) {
                    if (device.kind !== 'audiooutput')
                        continue;
                    this._audioOutputDevices[device.deviceId] = device;
                }
                // store.dispatch(
                // 	meActions.setAudioOutputDevices(this._audioOutputDevices));
            }
            catch (error) {
                this.logger.error('_updateAudioOutputDevices() [error:"%o"]', error);
            }
        });
    }
    _joinRoom({ joinVideo, joinAudio }) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug('_joinRoom() Device', this._device);
            const displayName = `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`;
            try {
                this._mediasoupDevice = new mediasoupClient.Device({ handlerName: 'Safari12' });
                const routerRtpCapabilities = yield this.signalingService.sendRequest('getRouterRtpCapabilities');
                routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
                    .filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');
                yield this._mediasoupDevice.load({ routerRtpCapabilities });
                if (this._produce) {
                    const transportInfo = yield this.signalingService.sendRequest('createWebRtcTransport', {
                        forceTcp: this._forceTcp,
                        producing: true,
                        consuming: false
                    });
                    const { id, iceParameters, iceCandidates, dtlsParameters } = transportInfo;
                    this._sendTransport = this._mediasoupDevice.createSendTransport({
                        id,
                        iceParameters,
                        iceCandidates,
                        dtlsParameters,
                        iceServers: this._turnServers,
                        // TODO: Fix for issue #72
                        iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined,
                        proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS
                    });
                    this._sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
                     {
                        this.signalingService.sendRequest('connectWebRtcTransport', {
                            transportId: this._sendTransport.id,
                            dtlsParameters
                        })
                            .then(callback)
                            .catch(errback);
                    });
                    this._sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // eslint-disable-next-line no-shadow
                            const { id } = yield this.signalingService.sendRequest('produce', {
                                transportId: this._sendTransport.id,
                                kind,
                                rtpParameters,
                                appData
                            });
                            callback({ id });
                        }
                        catch (error) {
                            errback(error);
                        }
                    }));
                }
                const transportInfo = yield this.signalingService.sendRequest('createWebRtcTransport', {
                    forceTcp: this._forceTcp,
                    producing: false,
                    consuming: true
                });
                const { id, iceParameters, iceCandidates, dtlsParameters } = transportInfo;
                this._recvTransport = this._mediasoupDevice.createRecvTransport({
                    id,
                    iceParameters,
                    iceCandidates,
                    dtlsParameters,
                    iceServers: this._turnServers,
                    // TODO: Fix for issue #72
                    iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined
                });
                this._recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
                 {
                    this.signalingService.sendRequest('connectWebRtcTransport', {
                        transportId: this._recvTransport.id,
                        dtlsParameters
                    })
                        .then(callback)
                        .catch(errback);
                });
                // Set our media capabilities.
                // store.dispatch(meActions.setMediaCapabilities(
                // 	{
                // 		canSendMic     : this._mediasoupDevice.canProduce('audio'),
                // 		canSendWebcam  : this._mediasoupDevice.canProduce('video'),
                // 		canShareScreen : this._mediasoupDevice.canProduce('video') &&
                // 			this._screenSharing.isScreenShareAvailable(),
                // 		canShareFiles : this._torrentSupport
                // 	}));
                const { authenticated, roles, peers, tracker, roomPermissions, userRoles, allowWhenRoleMissing, chatHistory, fileHistory, lastNHistory, locked, lobbyPeers, accessCode } = yield this.signalingService.sendRequest('join', {
                    displayName: displayName,
                    rtpCapabilities: this._mediasoupDevice.rtpCapabilities
                });
                this.logger.debug('_joinRoom() joined [authenticated:"%s", peers:"%o", roles:"%o", userRoles:"%o"]', authenticated, peers, roles, userRoles);
                // for (const peer of peers)
                // {
                // 	store.dispatch(
                // 		peerActions.addPeer({ ...peer, consumers: [] }));
                // }
                this.logger.debug('join audio', joinAudio, 'can produce audio', this._mediasoupDevice.canProduce('audio'), ' this._muted', this._muted);
                // Don't produce if explicitly requested to not to do it.
                if (this._produce) {
                    if (joinVideo) {
                        this.updateWebcam({ init: true, start: true });
                    }
                    if (joinAudio &&
                        this._mediasoupDevice.canProduce('audio'))
                        if (!this._muted) {
                            yield this.updateMic({ start: true });
                        }
                }
                yield this._updateAudioOutputDevices();
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
            }
            catch (error) {
                this.logger.error('_joinRoom() [error:"%o"]', error);
                this.close();
            }
        });
    }
    deviceInfo() {
        const ua = navigator.userAgent;
        const browser = bowser.getParser(ua);
        let flag;
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
            flag,
            os: browser.getOSName(true),
            platform: browser.getPlatformType(true),
            name: browser.getBrowserName(true),
            version: browser.getBrowserVersion(),
            bowser: browser
        };
    }
}
RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(i0.ɵɵinject(i1.SignalingService), i0.ɵɵinject(i2.LogService), i0.ɵɵinject(i3.RemotePeersService)); };
RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.SignalingService }, { type: i2.LogService }, { type: i3.RemotePeersService }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLE1BQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELE1BQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFT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QUMsaUJBQWlCLEVBQUU7WUFDcEMsTUFBTSxFQUFFLE9BQU87U0FDaEIsQ0FBQztJQUVKLENBQUM7O3NFQWp5RFcsV0FBVzttREFBWCxXQUFXLFdBQVgsV0FBVyxtQkFGWCxNQUFNO2tEQUVOLFdBQVc7Y0FIeEIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgUmVtb3RlUGVlcnNTZXJ2aWNlIH0gZnJvbSAnLi9yZW1vdGUtcGVlcnMuc2VydmljZSc7XG5pbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBTaWduYWxpbmdTZXJ2aWNlIH0gZnJvbSAnLi9zaWduYWxpbmcuc2VydmljZSc7XG5cbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuaW1wb3J0IHsgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGJvd3NlciBmcm9tICdib3dzZXInO1xuXG5pbXBvcnQgKiBhcyBtZWRpYXNvdXBDbGllbnQgZnJvbSAnbWVkaWFzb3VwLWNsaWVudCdcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzJztcbmltcG9ydCBoYXJrIGZyb20gJ2hhcmsnO1xuXG5cbmxldCBzYXZlQXM7XG5cblxuY29uc3QgbGFzdE4gPSA0XG5jb25zdCBtb2JpbGVMYXN0TiA9IDFcbmNvbnN0IHZpZGVvQXNwZWN0UmF0aW8gPSAxLjc3N1xuXG5jb25zdCBzaW11bGNhc3QgPSB0cnVlO1xuY29uc3QgXHRzaW11bGNhc3RFbmNvZGluZ3MgICA9IFtcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDIgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEgfVxuXVxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG4gIF91c2VTaW11bGNhc3RcbiAgX3R1cm5TZXJ2ZXJzXG5cbiAgc3Vic2NyaXB0aW9ucyA9IFtdO1xuICBwdWJsaWMgb25DYW1Qcm9kdWNpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIHB1YmxpYyBvblZvbHVtZUNoYW5nZTogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBzaWduYWxpbmdTZXJ2aWNlOiBTaWduYWxpbmdTZXJ2aWNlLFxuICAgIHByaXZhdGUgbG9nZ2VyOiBMb2dTZXJ2aWNlLFxuICBwcml2YXRlIHJlbW90ZVBlZXJzU2VydmljZTogUmVtb3RlUGVlcnNTZXJ2aWNlKSB7XG5cblxuICB9XG5cbiAgaW5pdCh7XG4gICAgcGVlcklkPW51bGwsXG5cbiAgICBwcm9kdWNlPXRydWUsXG4gICAgZm9yY2VUY3A9ZmFsc2UsXG4gICAgbXV0ZWQ9ZmFsc2VcbiAgfSA9IHt9KSB7XG4gICAgaWYgKCFwZWVySWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGVlcklkJyk7XG5cblxuICAgIC8vIGxvZ2dlci5kZWJ1ZyhcbiAgICAvLyAgICdjb25zdHJ1Y3RvcigpIFtwZWVySWQ6IFwiJXNcIiwgZGV2aWNlOiBcIiVzXCIsIHByb2R1Y2U6IFwiJXNcIiwgZm9yY2VUY3A6IFwiJXNcIiwgZGlzcGxheU5hbWUgXCJcIl0nLFxuICAgIC8vICAgcGVlcklkLCBkZXZpY2UuZmxhZywgcHJvZHVjZSwgZm9yY2VUY3ApO1xuXG5cblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdJTklUIFJvb20gJywgcGVlcklkKVxuXG4gICAgdGhpcy5fY2xvc2VkID0gZmFsc2U7XG4gICAgLy8gV2hldGhlciB3ZSBzaG91bGQgcHJvZHVjZS5cbiAgICB0aGlzLl9wcm9kdWNlID0gcHJvZHVjZTtcblxuICAgIC8vIFdoZXRoZXIgd2UgZm9yY2UgVENQXG4gICAgdGhpcy5fZm9yY2VUY3AgPSBmb3JjZVRjcDtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgc2ltdWxjYXN0IHNob3VsZCBiZSB1c2VkLlxuICAgIC8vIHRoaXMuX3VzZVNpbXVsY2FzdCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKCdzaW11bGNhc3QnIGluIHdpbmRvdy5jb25maWcpXG4gICAgLy8gICB0aGlzLl91c2VTaW11bGNhc3QgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdDtcblxuXG5cblxuXG4gICAgdGhpcy5fbXV0ZWQgPSBtdXRlZDtcblxuICAgIC8vIFRoaXMgZGV2aWNlXG4gICAgdGhpcy5fZGV2aWNlID0gdGhpcy5kZXZpY2VJbmZvKCk7XG5cbiAgICAvLyBNeSBwZWVyIG5hbWUuXG4gICAgdGhpcy5fcGVlcklkID0gcGVlcklkO1xuXG5cblxuICAgIC8vIEFsZXJ0IHNvdW5kXG4gICAgLy8gdGhpcy5fc291bmRBbGVydCA9IG5ldyBBdWRpbygnL3NvdW5kcy9ub3RpZnkubXAzJyk7XG5cblxuXG5cbiAgICAvLyBUaGUgcm9vbSBJRFxuICAgIHRoaXMuX3Jvb21JZCA9IG51bGw7XG5cbiAgICAvLyBtZWRpYXNvdXAtY2xpZW50IERldmljZSBpbnN0YW5jZS5cbiAgICAvLyBAdHlwZSB7bWVkaWFzb3VwQ2xpZW50LkRldmljZX1cbiAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBudWxsO1xuXG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gICAgdGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIGhhcmtcbiAgICB0aGlzLl9oYXJrID0gbnVsbDtcblxuICAgIC8vIExvY2FsIE1lZGlhU3RyZWFtIGZvciBoYXJrXG4gICAgdGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCB3ZWJjYW0gbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIEV4dHJhIHZpZGVvcyBiZWluZyBwcm9kdWNlZFxuICAgIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBNYXAgb2Ygd2ViY2FtIE1lZGlhRGV2aWNlSW5mb3MgaW5kZXhlZCBieSBkZXZpY2VJZC5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgTWVkaWFEZXZpY2VJbmZvcz59XG4gICAgdGhpcy5fd2ViY2FtcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9EZXZpY2VzID0ge307XG5cbiAgICB0aGlzLl9hdWRpb091dHB1dERldmljZXMgPSB7fTtcblxuICAgIC8vIG1lZGlhc291cCBDb25zdW1lcnMuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIG1lZGlhc291cENsaWVudC5Db25zdW1lcj59XG4gICAgdGhpcy5fY29uc3VtZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gc2ltdWxjYXN0XG5cbiAgICAvLyB0aGlzLl9zdGFydEtleUxpc3RlbmVyKCk7XG5cbiAgICAvLyB0aGlzLl9zdGFydERldmljZXNMaXN0ZW5lcigpO1xuXG4gIH1cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknLCB0aGlzLl9jbG9zZWQpO1xuXG4gICAgaWYgKHRoaXMuX2Nsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRoaXMuX2Nsb3NlZCA9IHRydWU7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmNsb3NlKCk7XG5cbiAgICAvLyBDbG9zZSBtZWRpYXNvdXAgVHJhbnNwb3J0cy5cbiAgICBpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuICAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmZvckVhY2goc3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpXG4gICAgfSlcblxuICB9XG5cbiAgLy8gX3N0YXJ0S2V5TGlzdGVuZXIoKSB7XG4gIC8vICAgLy8gQWRkIGtleWRvd24gZXZlbnQgbGlzdGVuZXIgb24gZG9jdW1lbnRcbiAgLy8gICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgKGV2ZW50KSA9PiB7XG4gIC8vICAgICBpZiAoZXZlbnQucmVwZWF0KSByZXR1cm47XG4gIC8vICAgICBjb25zdCBrZXkgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGV2ZW50LndoaWNoKTtcblxuICAvLyAgICAgY29uc3Qgc291cmNlID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vICAgICBjb25zdCBleGNsdWRlID0gWydpbnB1dCcsICd0ZXh0YXJlYSddO1xuXG4gIC8vICAgICBpZiAoZXhjbHVkZS5pbmRleE9mKHNvdXJjZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpID09PSAtMSkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2tleURvd24oKSBba2V5OlwiJXNcIl0nLCBrZXkpO1xuXG4gIC8vICAgICAgIHN3aXRjaCAoa2V5KSB7XG5cbiAgLy8gICAgICAgICAvKlxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzNyk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXRQcmV2QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgU3RyaW5nLmZyb21DaGFyQ29kZSgzOSk6XG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgY29uc3QgbmV3UGVlcklkID0gdGhpcy5fc3BvdGxpZ2h0cy5nZXROZXh0QXNTZWxlY3RlZChcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5yb29tLnNlbGVjdGVkUGVlcklkKTtcblxuICAvLyAgICAgICAgICAgaWYgKG5ld1BlZXJJZCkgdGhpcy5zZXRTZWxlY3RlZFBlZXIobmV3UGVlcklkKTtcbiAgLy8gICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgIH1cbiAgLy8gICAgICAgICAqL1xuXG5cbiAgLy8gICAgICAgICBjYXNlICdNJzogLy8gVG9nZ2xlIG1pY3JvcGhvbmVcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQpIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLnVubXV0ZU1pYygpO1xuXG4gIC8vICAgICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbm11dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFbmFibGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRW5hYmxlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgIH1cblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ1YnOiAvLyBUb2dnbGUgdmlkZW9cbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVXZWJjYW0oeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGNhc2UgJ0gnOiAvLyBPcGVuIGhlbHAgZGlhbG9nXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEhlbHBPcGVuKHRydWUpKTtcblxuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cblxuICAvLyAgICAgICAgIGRlZmF1bHQ6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG5cblxuICAvLyB9XG5cbiAgX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkge1xuICAgIG5hdmlnYXRvci5tZWRpYURldmljZXMuYWRkRXZlbnRMaXN0ZW5lcignZGV2aWNlY2hhbmdlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfSk7XG4gIH1cblxuXG5cbiAgYXN5bmMgbXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgJ3BhdXNlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUGF1c2VkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZCh0cnVlKSk7XG5cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdW5tdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdyZXN1bWVQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyUmVzdW1lZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKGZhbHNlKSk7XG5cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXHRkaXNjb25uZWN0TG9jYWxIYXJrKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNjb25uZWN0TG9jYWxIYXJrKCknKTtcblxuXHRcdGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpXG5cdFx0e1xuXHRcdFx0bGV0IFsgdHJhY2sgXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuXHRcdFx0dHJhY2suc3RvcCgpO1xuXHRcdFx0dHJhY2sgPSBudWxsO1xuXG5cdFx0XHR0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5faGFyayAhPSBudWxsKVxuXHRcdFx0dGhpcy5faGFyay5zdG9wKCk7XG5cdH1cblxuXHRjb25uZWN0TG9jYWxIYXJrKHRyYWNrKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Nvbm5lY3RMb2NhbEhhcmsoKSBbdHJhY2s6XCIlb1wiXScsIHRyYWNrKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0gPSBuZXcgTWVkaWFTdHJlYW0oKTtcblxuXHRcdGNvbnN0IG5ld1RyYWNrID0gdHJhY2suY2xvbmUoKTtcblxuXHRcdHRoaXMuX2hhcmtTdHJlYW0uYWRkVHJhY2sobmV3VHJhY2spO1xuXG5cdFx0bmV3VHJhY2suZW5hYmxlZCA9IHRydWU7XG5cblx0XHR0aGlzLl9oYXJrID0gaGFyayh0aGlzLl9oYXJrU3RyZWFtLFxuXHRcdFx0e1xuXHRcdFx0XHRwbGF5ICAgICAgOiBmYWxzZSxcblx0XHRcdFx0aW50ZXJ2YWwgIDogMTAsXG5cdFx0XHRcdHRocmVzaG9sZCA6IC01MCxcblx0XHRcdFx0aGlzdG9yeSAgIDogMTAwXG5cdFx0XHR9KTtcblxuXHRcdHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IC0xMDA7XG5cblx0XHR0aGlzLl9oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT5cbiAgICB7XG4gICAgICAvLyBVcGRhdGUgb25seSBpZiB0aGVyZSBpcyBhIGJpZ2dlciBkaWZmXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIgJiYgTWF0aC5hYnModm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSA+IDAuNSlcblx0XHRcdHtcbiAgICAgICAgLy8gRGVjYXkgY2FsY3VsYXRpb246IGtlZXAgaW4gbWluZCB0aGF0IHZvbHVtZSByYW5nZSBpcyAtMTAwIC4uLiAwIChkQilcblx0XHRcdFx0Ly8gVGhpcyBtYWtlcyBkZWNheSB2b2x1bWUgZmFzdCBpZiBkaWZmZXJlbmNlIHRvIGxhc3Qgc2F2ZWQgdmFsdWUgaXMgYmlnXG5cdFx0XHRcdC8vIGFuZCBzbG93IGZvciBzbWFsbCBjaGFuZ2VzLiBUaGlzIHByZXZlbnRzIGZsaWNrZXJpbmcgdm9sdW1lIGluZGljYXRvclxuXHRcdFx0XHQvLyBhdCBsb3cgbGV2ZWxzXG5cdFx0XHRcdGlmICh2b2x1bWUgPCB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpXG5cdFx0XHRcdHtcbiAgICAgICAgICB2b2x1bWUgPVxuICAgICAgICAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSAtXG4gICAgICAgICAgTWF0aC5wb3coXG4gICAgICAgICAgICAodm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSAvXG4gICAgICAgICAgICAoMTAwICsgdGhpcy5faGFyay5sYXN0Vm9sdW1lKVxuICAgICAgICAgICAgLCAyXG5cdFx0XHRcdFx0XHQpICogMTA7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lID0gdm9sdW1lO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnVk9MVU1FIENIQU5HRSBIQVJLJyk7XG5cbiAgICAgICAgLy8gdGhpcy5vblZvbHVtZUNoYW5nZS5uZXh0KHtwZWVyOnRoaXMuX3BlZXJJZCwgdm9sdW1lfSlcblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZSh0aGlzLl9wZWVySWQsIHZvbHVtZSkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3BlYWtpbmcnLCAoKSA9PlxuXHRcdC8vIHtcblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKHRydWUpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHQoc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSB8fFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLm1lLmlzQXV0b011dGVkKSAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlciAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdXRvTXV0ZWQoZmFsc2UpKTsgLy8gc2FuaXR5IGFjdGlvblxuXHRcdC8vIH0pO1xuXG5cdFx0Ly8gdGhpcy5faGFyay5vbignc3RvcHBlZF9zcGVha2luZycsICgpID0+XG5cdFx0Ly8ge1xuXHRcdC8vIFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldElzU3BlYWtpbmcoZmFsc2UpKTtcblxuXHRcdC8vIFx0aWYgKFxuXHRcdC8vIFx0XHRzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLnZvaWNlQWN0aXZhdGVkVW5tdXRlICYmXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyICYmXG5cdFx0Ly8gXHRcdCF0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcblx0XHQvLyBcdClcblx0XHQvLyBcdHtcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuXHRcdC8vIFx0XHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKHRydWUpKTtcblx0XHQvLyBcdH1cblx0XHQvLyB9KTtcblx0fVxuXG4gIGFzeW5jIGNoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2RldmljZUlkOlwiJXNcIl0nLCBkZXZpY2VJZCk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbGVjdGVkIGF1ZGlvIG91dHB1dCBkZXZpY2Ugbm8gbG9uZ2VyIGF2YWlsYWJsZScpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIE9ubHkgRmlyZWZveCBzdXBwb3J0cyBhcHBseUNvbnN0cmFpbnRzIHRvIGF1ZGlvIHRyYWNrc1xuICAvLyBTZWU6XG4gIC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTc5Njk2NFxuICBhc3luYyB1cGRhdGVNaWMoe1xuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlIHx8IHRoaXMuX2RldmljZS5mbGFnICE9PSAnZmlyZWZveCcsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZU1pYygpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIGF1ZGlvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldEF1ZGlvRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGF1ZGlvIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgYXV0b0dhaW5Db250cm9sID0gZmFsc2U7XG4gICAgICBjb25zdCBlY2hvQ2FuY2VsbGF0aW9uID0gdHJ1ZVxuICAgICAgY29uc3Qgbm9pc2VTdXBwcmVzc2lvbiA9IHRydWVcblxuICAgICAgLy8gaWYgKCF3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnMpIHtcbiAgICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgLy8gICAgICdNaXNzaW5nIGNlbnRyYWxBdWRpb09wdGlvbnMgZnJvbSBhcHAgY29uZmlnISAoU2VlIGl0IGluIGV4YW1wbGUgY29uZmlnLiknXG4gICAgICAvLyAgICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc2FtcGxlUmF0ZSA9IDk2MDAwLFxuICAgICAgICBjaGFubmVsQ291bnQgPSAxLFxuICAgICAgICB2b2x1bWUgPSAxLjAsXG4gICAgICAgIHNhbXBsZVNpemUgPSAxNixcbiAgICAgICAgb3B1c1N0ZXJlbyA9IGZhbHNlLFxuICAgICAgICBvcHVzRHR4ID0gdHJ1ZSxcbiAgICAgICAgb3B1c0ZlYyA9IHRydWUsXG4gICAgICAgIG9wdXNQdGltZSA9IDIwLFxuICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlID0gOTYwMDBcbiAgICAgIH0gPSB7fTtcblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl9taWNQcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICAvLyB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKTtcblxuICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlTWljKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb3B1c1N0ZXJlbyxcbiAgICAgICAgICAgICAgb3B1c0R0eCxcbiAgICAgICAgICAgICAgb3B1c0ZlYyxcbiAgICAgICAgICAgICAgb3B1c1B0aW1lLFxuICAgICAgICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAgeyBzb3VyY2U6ICdtaWMnIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnbWljJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX21pY1Byb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNaWNyb3Bob25lIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZU1pYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci52b2x1bWUgPSAwO1xuXG4gICAgICAgIHRoaXMuY29ubmVjdExvY2FsSGFyayh0cmFjayk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fbWljUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgW2hhcmtUcmFja10gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cbiAgICAgICAgICBoYXJrVHJhY2sgJiYgYXdhaXQgaGFya1RyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVXZWJjYW0oe1xuICAgIGluaXQgPSBmYWxzZSxcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGwsXG4gICAgbmV3UmVzb2x1dGlvbiA9IG51bGwsXG4gICAgbmV3RnJhbWVSYXRlID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVXZWJjYW0oKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiLCBuZXdSZXNvbHV0aW9uOlwiJXNcIiwgbmV3RnJhbWVSYXRlOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWQsXG4gICAgICBuZXdSZXNvbHV0aW9uLFxuICAgICAgbmV3RnJhbWVSYXRlXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIHZpZGVvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBpZiAobmV3UmVzb2x1dGlvbilcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvUmVzb2x1dGlvbihuZXdSZXNvbHV0aW9uKSk7XG5cbiAgICAgIC8vIGlmIChuZXdGcmFtZVJhdGUpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb0ZyYW1lUmF0ZShuZXdGcmFtZVJhdGUpKTtcblxuICAgICAgY29uc3QgIHZpZGVvTXV0ZWQgID0gZmFsc2VcblxuICAgICAgaWYgKGluaXQgJiYgdmlkZW9NdXRlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgLy8gZWxzZVxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX3dlYmNhbXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCAgcmVzb2x1dGlvbiA9ICdtZWRpdW0nXG4gICAgICBjb25zdCBmcmFtZVJhdGUgPSAxNVxuXG5cblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlkZW86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICAgICAgLmNvZGVjc1xuICAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAgICAgICAgIGVsc2UgaWYgKHNpbXVsY2FzdEVuY29kaW5ncylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IHNpbXVsY2FzdEVuY29kaW5ncztcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IHdlYkNhbVN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICAgICAgICB3ZWJDYW1TdHJlYW0uc2V0UHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIHRoaXMub25DYW1Qcm9kdWNpbmcubmV4dCh3ZWJDYW1TdHJlYW0pXG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2VNZWV0aW5nKCknKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAnbW9kaWZ5UGVlckNvbnN1bWVyKCkgW3BlZXJJZDpcIiVzXCIsIHR5cGU6XCIlc1wiXScsXG4gICAgICBwZWVySWQsXG4gICAgICB0eXBlXG4gICAgKTtcblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChjb25zdCBjb25zdW1lciBvZiB0aGlzLl9jb25zdW1lcnMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKGNvbnN1bWVyLmFwcERhdGEucGVlcklkID09PSBwZWVySWQgJiYgY29uc3VtZXIuYXBwRGF0YS5zb3VyY2UgPT09IHR5cGUpIHtcbiAgICAgICAgICBpZiAobXV0ZSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncGF1c2VDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnBhdXNlKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdyZXN1bWVDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnJlc3VtZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8sIHRva2VuIH0pIHtcblxuXG4gICAgdGhpcy5fcm9vbUlkID0gcm9vbUlkO1xuXG5cbiAgICAvLyBpbml0aWFsaXplIHNpZ25hbGluZyBzb2NrZXRcbiAgICAvLyBsaXN0ZW4gdG8gc29ja2V0IGV2ZW50c1xuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5pbml0KHRva2VuKVxuICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uRGlzY29ubmVjdGVkLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcbiAgICAgIC8vIHRoaXMuY2xvc2VcbiAgICB9KSlcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25SZWNvbm5lY3Rpbmcuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuXG5cblxuXG5cdFx0XHRpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbGVhclBlZXJzKCk7XG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0aW5nJykpO1xuICAgIH0pKVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTmV3Q29uc3VtZXIucGlwZShzd2l0Y2hNYXAoYXN5bmMgKGRhdGEpID0+IHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgcGVlcklkLFxuICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICBpZCxcbiAgICAgICAga2luZCxcbiAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgYXBwRGF0YSxcbiAgICAgICAgcHJvZHVjZXJQYXVzZWRcbiAgICAgIH0gPSBkYXRhO1xuXG4gICAgICBjb25zdCBjb25zdW1lciAgPSBhd2FpdCB0aGlzLl9yZWN2VHJhbnNwb3J0LmNvbnN1bWUoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBwcm9kdWNlcklkLFxuICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICBhcHBEYXRhIDogeyAuLi5hcHBEYXRhLCBwZWVySWQgfSAvLyBUcmljay5cbiAgICAgICAgfSkgYXMgbWVkaWFzb3VwQ2xpZW50LnR5cGVzLkNvbnN1bWVyO1xuXG4gICAgICAvLyBTdG9yZSBpbiB0aGUgbWFwLlxuICAgICAgdGhpcy5fY29uc3VtZXJzLnNldChjb25zdW1lci5pZCwgY29uc3VtZXIpO1xuXG4gICAgICBjb25zdW1lci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PlxuICAgICAge1xuICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVyLmlkKTtcbiAgICAgIH0pO1xuXG5cblxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5uZXdDb25zdW1lcihjb25zdW1lciwgIHBlZXJJZCwgdHlwZSwgcHJvZHVjZXJQYXVzZWQpO1xuXG4gICAgICAvLyBXZSBhcmUgcmVhZHkuIEFuc3dlciB0aGUgcmVxdWVzdCBzbyB0aGUgc2VydmVyIHdpbGxcbiAgICAgIC8vIHJlc3VtZSB0aGlzIENvbnN1bWVyICh3aGljaCB3YXMgcGF1c2VkIGZvciBub3cpLlxuXG5cbiAgICAgIC8vIGlmIChraW5kID09PSAnYXVkaW8nKVxuICAgICAgLy8ge1xuICAgICAgLy8gICBjb25zdW1lci52b2x1bWUgPSAwO1xuXG4gICAgICAvLyAgIGNvbnN0IHN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuXG4gICAgICAvLyAgIHN0cmVhbS5hZGRUcmFjayhjb25zdW1lci50cmFjayk7XG5cbiAgICAgIC8vICAgaWYgKCFzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKVswXSlcbiAgICAgIC8vICAgICB0aHJvdyBuZXcgRXJyb3IoJ3JlcXVlc3QubmV3Q29uc3VtZXIgfCBnaXZlbiBzdHJlYW0gaGFzIG5vIGF1ZGlvIHRyYWNrJyk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyayA9IGhhcmsoc3RyZWFtLCB7IHBsYXk6IGZhbHNlIH0pO1xuXG4gICAgICAgIC8vIGNvbnN1bWVyLmhhcmsub24oJ3ZvbHVtZV9jaGFuZ2UnLCAodm9sdW1lKSA9PlxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgdm9sdW1lID0gTWF0aC5yb3VuZCh2b2x1bWUpO1xuXG4gICAgICAgIC8vICAgaWYgKGNvbnN1bWVyICYmIHZvbHVtZSAhPT0gY29uc3VtZXIudm9sdW1lKVxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGNvbnN1bWVyLnZvbHVtZSA9IHZvbHVtZTtcblxuICAgICAgICAvLyAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZShwZWVySWQsIHZvbHVtZSkpO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfSk7XG4gICAgICAvLyB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25Ob3RpZmljYXRpb24ucGlwZShzd2l0Y2hNYXAoYXN5bmMgKG5vdGlmaWNhdGlvbikgPT4ge1xuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJyxcbiAgICAgICAgbm90aWZpY2F0aW9uLm1ldGhvZCwgbm90aWZpY2F0aW9uLmRhdGEpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBzd2l0Y2ggKG5vdGlmaWNhdGlvbi5tZXRob2QpIHtcblxuXG5cbiAgICAgICAgICBjYXNlICdwcm9kdWNlclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwcm9kdWNlcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgcHJvZHVjZXJBY3Rpb25zLnNldFByb2R1Y2VyU2NvcmUocHJvZHVjZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ25ld1BlZXInOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJBY3Rpb25zLmFkZFBlZXIoXG4gICAgICAgICAgICAgIC8vICAgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzLCBjb25zdW1lcnM6IFtdIH0pKTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5uZXdQZWVyKGlkKTtcblxuICAgICAgICAgICAgICAvLyB0aGlzLl9zb3VuZE5vdGlmaWNhdGlvbigpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAgICAgLy8gICB7XG4gICAgICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgICAvLyAgICAgICBpZDogJ3Jvb20ubmV3UGVlcicsXG4gICAgICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAne2Rpc3BsYXlOYW1lfSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAgICAgICAgIC8vICAgICB9LCB7XG4gICAgICAgICAgICAgIC8vICAgICAgIGRpc3BsYXlOYW1lXG4gICAgICAgICAgICAgIC8vICAgICB9KVxuICAgICAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ3BlZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UuY2xvc2VQZWVyKHBlZXJJZCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgcGVlckFjdGlvbnMucmVtb3ZlUGVlcihwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgY29uc3VtZXIuY2xvc2UoKTtcblxuICAgICAgICAgICAgICBpZiAoY29uc3VtZXIuaGFyayAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnN1bWVyLmhhcmsuc3RvcCgpO1xuXG4gICAgICAgICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IGNvbnN1bWVyLmFwcERhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnJlbW92ZUNvbnN1bWVyKGNvbnN1bWVySWQsIHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJQYXVzZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXJJZCwgJ3JlbW90ZScpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUmVzdW1lZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXJJZCwgJ3JlbW90ZScpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyTGF5ZXJzQ2hhbmdlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2Uub25Db25zdW1lckxheWVyQ2hhbmdlZChjb25zdW1lcklkKVxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJDdXJyZW50TGF5ZXJzKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclNjb3JlKGNvbnN1bWVySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdyb29tQmFjayc6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjYXNlICdyb29tUmVhZHknOlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHVyblNlcnZlcnMgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgICAgICB0aGlzLl90dXJuU2VydmVycyA9IHR1cm5TZXJ2ZXJzO1xuXG4gICAgICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy50b2dnbGVKb2luZWQoKSk7XG4gICAgICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRJbkxvYmJ5KGZhbHNlKSk7XG5cbiAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAnYWN0aXZlU3BlYWtlcic6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cblxuXG4gICAgICAgICAgICAgIGlmIChwZWVySWQgPT09IHRoaXMuX3BlZXJJZCkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5vblZvbHVtZUNoYW5nZS5uZXh0KG5vdGlmaWNhdGlvbi5kYXRhKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIC8vIHRoaXMuX3Nwb3RsaWdodHMuaGFuZGxlQWN0aXZlU3BlYWtlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAvLyB0aGlzLmxvZ2dlci5lcnJvcihcbiAgICAgICAgICAgICAgLy8gICAndW5rbm93biBub3RpZmljYXRpb24ubWV0aG9kIFwiJXNcIicsIG5vdGlmaWNhdGlvbi5tZXRob2QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Vycm9yIG9uIHNvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgLy8gICAgICAgaWQ6ICdzb2NrZXQucmVxdWVzdEVycm9yJyxcbiAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFcnJvciBvbiBzZXJ2ZXIgcmVxdWVzdCdcbiAgICAgICAgLy8gICAgIH0pXG4gICAgICAgIC8vICAgfSkpO1xuICAgICAgfVxuXG4gICAgfSkpLnN1YnNjcmliZSgpKVxuICAgIC8vIG9uIHJvb20gcmVhZHkgam9pbiByb29tIF9qb2luUm9vbVxuXG4gICAgLy8gdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgIC8vIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgLy8gICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgIC8vIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAvLyAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAvLyBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgIC8vIGNyZWF0ZSBzZW5kIHRyYW5zcG9ydCBjcmVhdGVXZWJSdGNUcmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvcnRcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gY3JlYXRlIHJlY2VpdmUgdHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3JcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gc2VuZCBqb2luIHJlcXVlc3RcblxuICAgIC8vIGFkZCBwZWVycyB0byBwZWVycyBzZXJ2aWNlXG5cbiAgICAvLyBwcm9kdWNlIHVwZGF0ZVdlYmNhbSB1cGRhdGVNaWNcbiAgfVxuXG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvRGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvRGV2aWNlcyh0aGlzLl9hdWRpb0RldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZVdlYmNhbXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICd2aWRlb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1zW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0V2ViY2FtRGV2aWNlcyh0aGlzLl93ZWJjYW1zKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZVdlYmNhbXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBkaXNhYmxlV2ViY2FtKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlV2ViY2FtKCknKTtcblxuXHRcdGlmICghdGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVXZWJjYW0oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQodHJ1ZSkpO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG5cdH1cblx0YXN5bmMgZGlzYWJsZU1pYygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZU1pYygpJyk7XG5cblx0XHRpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRXZWJjYW1EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG5cblx0XHRcdGNvbnN0ICBzZWxlY3RlZFdlYmNhbSA9ICBudWxsXG5cblx0XHRcdGlmIChzZWxlY3RlZFdlYmNhbSAmJiB0aGlzLl93ZWJjYW1zW3NlbGVjdGVkV2ViY2FtXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkV2ViY2FtO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB3ZWJjYW1zID0gT2JqZWN0LnZhbHVlcyh0aGlzLl93ZWJjYW1zKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiB3ZWJjYW1zWzBdID8gd2ViY2Ftc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldFdlYmNhbURldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuICB9XG5cblxuXHRhc3luYyBfZ2V0QXVkaW9EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG5cbiAgICAgIGNvbnN0ICBzZWxlY3RlZEF1ZGlvRGV2aWNlID0gbnVsbDtcblxuXHRcdFx0aWYgKHNlbGVjdGVkQXVkaW9EZXZpY2UgJiYgdGhpcy5fYXVkaW9EZXZpY2VzW3NlbGVjdGVkQXVkaW9EZXZpY2VdKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRBdWRpb0RldmljZTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXVkaW9EZXZpY2VzID0gT2JqZWN0LnZhbHVlcyh0aGlzLl9hdWRpb0RldmljZXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIGF1ZGlvRGV2aWNlc1swXSA/IGF1ZGlvRGV2aWNlc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldEF1ZGlvRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9vdXRwdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0RGV2aWNlcyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblxuXG4gIGFzeW5jIF9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX2pvaW5Sb29tKCkgRGV2aWNlJywgdGhpcy5fZGV2aWNlKTtcblxuICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYEd1ZXN0ICR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDEwMDAwMCAtIDEwMDAwKSkgKyAxMDAwMH1gXG5cblxuICAgIHRyeSB7XG5cblxuICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2Uoe2hhbmRsZXJOYW1lOidTYWZhcmkxMid9KTtcblxuICAgICAgY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgICAgcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgICAgICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgICBwcm9kdWNpbmc6IHRydWUsXG4gICAgICAgICAgICBjb25zdW1pbmc6IGZhbHNlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVNlbmRUcmFuc3BvcnQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHByb3ByaWV0YXJ5Q29uc3RyYWludHM6IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAncHJvZHVjZScsIGFzeW5jICh7IGtpbmQsIHJ0cFBhcmFtZXRlcnMsIGFwcERhdGEgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgY29uc3QgeyBpZCB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgICAncHJvZHVjZScsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgYXBwRGF0YVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FsbGJhY2soeyBpZCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBlcnJiYWNrKGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICBwcm9kdWNpbmc6IGZhbHNlLFxuICAgICAgICAgIGNvbnN1bWluZzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBpZCxcbiAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVJlY3ZUcmFuc3BvcnQoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0Lm9uKFxuICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAge1xuICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgb3VyIG1lZGlhIGNhcGFiaWxpdGllcy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRNZWRpYUNhcGFiaWxpdGllcyhcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdGNhblNlbmRNaWMgICAgIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksXG4gICAgICAvLyBcdFx0Y2FuU2VuZFdlYmNhbSAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZVNjcmVlbiA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpICYmXG4gICAgICAvLyBcdFx0XHR0aGlzLl9zY3JlZW5TaGFyaW5nLmlzU2NyZWVuU2hhcmVBdmFpbGFibGUoKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZUZpbGVzIDogdGhpcy5fdG9ycmVudFN1cHBvcnRcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgdHJhY2tlcixcbiAgICAgICAgcm9vbVBlcm1pc3Npb25zLFxuICAgICAgICB1c2VyUm9sZXMsXG4gICAgICAgIGFsbG93V2hlblJvbGVNaXNzaW5nLFxuICAgICAgICBjaGF0SGlzdG9yeSxcbiAgICAgICAgZmlsZUhpc3RvcnksXG4gICAgICAgIGxhc3ROSGlzdG9yeSxcbiAgICAgICAgbG9ja2VkLFxuICAgICAgICBsb2JieVBlZXJzLFxuICAgICAgICBhY2Nlc3NDb2RlXG4gICAgICB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnam9pbicsXG4gICAgICAgIHtcbiAgICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG5cbiAgICAgICAgICBydHBDYXBhYmlsaXRpZXM6IHRoaXMuX21lZGlhc291cERldmljZS5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnX2pvaW5Sb29tKCkgam9pbmVkIFthdXRoZW50aWNhdGVkOlwiJXNcIiwgcGVlcnM6XCIlb1wiLCByb2xlczpcIiVvXCIsIHVzZXJSb2xlczpcIiVvXCJdJyxcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICB1c2VyUm9sZXNcbiAgICAgICk7XG5cblxuXG5cblxuICAgICAgLy8gZm9yIChjb25zdCBwZWVyIG9mIHBlZXJzKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRwZWVyQWN0aW9ucy5hZGRQZWVyKHsgLi4ucGVlciwgY29uc3VtZXJzOiBbXSB9KSk7XG4gICAgICAvLyB9XG5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ2pvaW4gYXVkaW8nLGpvaW5BdWRpbyAsICdjYW4gcHJvZHVjZSBhdWRpbycsXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksICcgdGhpcy5fbXV0ZWQnLCB0aGlzLl9tdXRlZClcbiAgICAgIC8vIERvbid0IHByb2R1Y2UgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQgdG8gbm90IHRvIGRvIGl0LlxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5WaWRlb1xuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IGluaXQ6IHRydWUsIHN0YXJ0OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luQXVkaW8gJiZcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKVxuICAgICAgICApXG4gICAgICAgICAgaWYgKCF0aGlzLl9tdXRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIGNvbnN0ICBzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICA9IG51bGxcblxuICAgICAgLy8gaWYgKCFzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICYmIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyAhPT0ge30pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKFxuICAgICAgLy8gXHRcdFx0T2JqZWN0LmtleXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKVswXVxuICAgICAgLy8gXHRcdClcbiAgICAgIC8vIFx0KTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cbiAgICAgIC8vIC8vIENsZWFuIGFsbCB0aGUgZXhpc3Rpbmcgbm90aWZpY2F0aW9ucy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG5vdGlmaWNhdGlvbkFjdGlvbnMucmVtb3ZlQWxsTm90aWZpY2F0aW9ucygpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0dGV4dCA6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyBcdFx0XHRpZCAgICAgICAgICAgICA6ICdyb29tLmpvaW5lZCcsXG4gICAgICAvLyBcdFx0XHRkZWZhdWx0TWVzc2FnZSA6ICdZb3UgaGF2ZSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAvLyBcdFx0fSlcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5hZGRQZWVycyhwZWVycyk7XG5cblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfam9pblJvb20oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuXG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG4gIGRldmljZUluZm8oKSB7XG4gICAgY29uc3QgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGNvbnN0IGJyb3dzZXIgPSBib3dzZXIuZ2V0UGFyc2VyKHVhKTtcblxuICAgIGxldCBmbGFnO1xuXG4gICAgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgY2hyb21lOiAnPj0wJywgY2hyb21pdW06ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdjaHJvbWUnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgZmlyZWZveDogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2ZpcmVmb3gnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgc2FmYXJpOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnc2FmYXJpJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IG9wZXJhOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnb3BlcmEnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgJ21pY3Jvc29mdCBlZGdlJzogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2VkZ2UnO1xuICAgIGVsc2VcbiAgICAgIGZsYWcgPSAndW5rbm93bic7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmxhZyxcbiAgICAgIG9zOiBicm93c2VyLmdldE9TTmFtZSh0cnVlKSwgLy8gaW9zLCBhbmRyb2lkLCBsaW51eC4uLlxuICAgICAgcGxhdGZvcm06IGJyb3dzZXIuZ2V0UGxhdGZvcm1UeXBlKHRydWUpLCAvLyBtb2JpbGUsIGRlc2t0b3AsIHRhYmxldFxuICAgICAgbmFtZTogYnJvd3Nlci5nZXRCcm93c2VyTmFtZSh0cnVlKSxcbiAgICAgIHZlcnNpb246IGJyb3dzZXIuZ2V0QnJvd3NlclZlcnNpb24oKSxcbiAgICAgIGJvd3NlcjogYnJvd3NlclxuICAgIH07XG5cbiAgfVxufVxuIl19
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
        this.disconnectLocalHark();
        this.remotePeersService.clearPeers();
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
                    this.disconnectLocalHark();
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
                this.logger.log('Reconnecting...');
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
                // this._mediasoupDevice = new mediasoupClient.Device({handlerName:'Safari12'});
                this._mediasoupDevice = new mediasoupClient.Device();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQy9CLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFHeEIsSUFBSSxNQUFNLENBQUM7QUFHWCxNQUFNLEtBQUssR0FBRyxDQUFDLENBQUE7QUFDZixNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUE7QUFDckIsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7QUFFOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLE1BQU8sa0JBQWtCLEdBQUs7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7SUFDNUIsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUU7Q0FDN0IsQ0FBQTtBQUdELE1BQU0sZ0JBQWdCLEdBQ3RCO0lBQ0MsS0FBSyxFQUNMO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsUUFBUSxFQUNSO1FBQ0MsS0FBSyxFQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUM1QixXQUFXLEVBQUcsZ0JBQWdCO0tBQzlCO0lBQ0QsTUFBTSxFQUNOO1FBQ0MsS0FBSyxFQUFT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QUFTLENBQUMsSUFBSSxDQUFDO1lBQzNCLFFBQVEsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN2QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtZQUNwQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBQ0osQ0FBQzs7c0VBbnlEVyxXQUFXO21EQUFYLFdBQVcsV0FBWCxXQUFXLG1CQUZYLE1BQU07a0RBRU4sV0FBVztjQUh4QixVQUFVO2VBQUM7Z0JBQ1YsVUFBVSxFQUFFLE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBSZW1vdGVQZWVyc1NlcnZpY2UgfSBmcm9tICcuL3JlbW90ZS1wZWVycy5zZXJ2aWNlJztcbmltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IFNpZ25hbGluZ1NlcnZpY2UgfSBmcm9tICcuL3NpZ25hbGluZy5zZXJ2aWNlJztcblxuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYm93c2VyIGZyb20gJ2Jvd3Nlcic7XG5cbmltcG9ydCAqIGFzIG1lZGlhc291cENsaWVudCBmcm9tICdtZWRpYXNvdXAtY2xpZW50J1xuaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IGhhcmsgZnJvbSAnaGFyayc7XG5cblxubGV0IHNhdmVBcztcblxuXG5jb25zdCBsYXN0TiA9IDRcbmNvbnN0IG1vYmlsZUxhc3ROID0gMVxuY29uc3QgdmlkZW9Bc3BlY3RSYXRpbyA9IDEuNzc3XG5cbmNvbnN0IHNpbXVsY2FzdCA9IHRydWU7XG5jb25zdCBcdHNpbXVsY2FzdEVuY29kaW5ncyAgID0gW1xuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMiB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSB9XG5dXG5cblxuY29uc3QgVklERU9fQ09OU1RSQUlOUyA9XG57XG5cdCdsb3cnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdtZWRpdW0nIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogNjQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdoaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDEyODAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3ZlcnloaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDE5MjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3VsdHJhJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDM4NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fVxufTtcblxuY29uc3QgUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFMgPVxue1xuXHRvcHRpb25hbCA6IFsgeyBnb29nRHNjcDogdHJ1ZSB9IF1cbn07XG5cbmNvbnN0IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCwgbWF4Qml0UmF0ZTogMTAwMDAwIH0sXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxLCBtYXhCaXRSYXRlOiAxMjAwMDAwIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSB3ZWJjYW0gdmlkZW8uXG5jb25zdCBWSURFT19LU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUM19LRVknIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSBkZXNrdG9wIHNoYXJpbmcuXG5jb25zdCBWSURFT19TVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzJywgZHR4OiB0cnVlIH1cbl07XG5cblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgIGNsYXNzIFJvb21TZXJ2aWNlIHtcblxuXG5cbiAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICBfc2VuZFRyYW5zcG9ydCA9IG51bGw7XG4gIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICBfcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIF9wcm9kdWNlID0gdHJ1ZTtcblxuICBfZm9yY2VUY3AgPSBmYWxzZTtcblxuICBfbXV0ZWRcbiAgX2RldmljZVxuICBfcGVlcklkXG4gIF9zb3VuZEFsZXJ0XG4gIF9yb29tSWRcbiAgX21lZGlhc291cERldmljZVxuXG4gIF9taWNQcm9kdWNlclxuICBfaGFya1xuICBfaGFya1N0cmVhbVxuICBfd2ViY2FtUHJvZHVjZXJcbiAgX2V4dHJhVmlkZW9Qcm9kdWNlcnNcbiAgX3dlYmNhbXNcbiAgX2F1ZGlvRGV2aWNlc1xuICBfYXVkaW9PdXRwdXREZXZpY2VzXG4gIF9jb25zdW1lcnNcbiAgX3VzZVNpbXVsY2FzdFxuICBfdHVyblNlcnZlcnNcblxuICBzdWJzY3JpcHRpb25zID0gW107XG4gIHB1YmxpYyBvbkNhbVByb2R1Y2luZzogU3ViamVjdDxhbnk+ID0gbmV3IFN1YmplY3QoKTtcbiAgcHVibGljIG9uVm9sdW1lQ2hhbmdlOiBTdWJqZWN0PGFueT4gPSBuZXcgU3ViamVjdCgpO1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHNpZ25hbGluZ1NlcnZpY2U6IFNpZ25hbGluZ1NlcnZpY2UsXG4gICAgcHJpdmF0ZSBsb2dnZXI6IExvZ1NlcnZpY2UsXG4gIHByaXZhdGUgcmVtb3RlUGVlcnNTZXJ2aWNlOiBSZW1vdGVQZWVyc1NlcnZpY2UpIHtcblxuXG4gIH1cblxuICBpbml0KHtcbiAgICBwZWVySWQ9bnVsbCxcblxuICAgIHByb2R1Y2U9dHJ1ZSxcbiAgICBmb3JjZVRjcD1mYWxzZSxcbiAgICBtdXRlZD1mYWxzZVxuICB9ID0ge30pIHtcbiAgICBpZiAoIXBlZXJJZClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBwZWVySWQnKTtcblxuXG4gICAgLy8gbG9nZ2VyLmRlYnVnKFxuICAgIC8vICAgJ2NvbnN0cnVjdG9yKCkgW3BlZXJJZDogXCIlc1wiLCBkZXZpY2U6IFwiJXNcIiwgcHJvZHVjZTogXCIlc1wiLCBmb3JjZVRjcDogXCIlc1wiLCBkaXNwbGF5TmFtZSBcIlwiXScsXG4gICAgLy8gICBwZWVySWQsIGRldmljZS5mbGFnLCBwcm9kdWNlLCBmb3JjZVRjcCk7XG5cblxuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ0lOSVQgUm9vbSAnLCBwZWVySWQpXG5cbiAgICB0aGlzLl9jbG9zZWQgPSBmYWxzZTtcbiAgICAvLyBXaGV0aGVyIHdlIHNob3VsZCBwcm9kdWNlLlxuICAgIHRoaXMuX3Byb2R1Y2UgPSBwcm9kdWNlO1xuXG4gICAgLy8gV2hldGhlciB3ZSBmb3JjZSBUQ1BcbiAgICB0aGlzLl9mb3JjZVRjcCA9IGZvcmNlVGNwO1xuXG5cblxuXG4gICAgLy8gV2hldGhlciBzaW11bGNhc3Qgc2hvdWxkIGJlIHVzZWQuXG4gICAgLy8gdGhpcy5fdXNlU2ltdWxjYXN0ID0gZmFsc2U7XG5cbiAgICAvLyBpZiAoJ3NpbXVsY2FzdCcgaW4gd2luZG93LmNvbmZpZylcbiAgICAvLyAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHdpbmRvdy5jb25maWcuc2ltdWxjYXN0O1xuXG5cblxuXG5cbiAgICB0aGlzLl9tdXRlZCA9IG11dGVkO1xuXG4gICAgLy8gVGhpcyBkZXZpY2VcbiAgICB0aGlzLl9kZXZpY2UgPSB0aGlzLmRldmljZUluZm8oKTtcblxuICAgIC8vIE15IHBlZXIgbmFtZS5cbiAgICB0aGlzLl9wZWVySWQgPSBwZWVySWQ7XG5cblxuXG4gICAgLy8gQWxlcnQgc291bmRcbiAgICAvLyB0aGlzLl9zb3VuZEFsZXJ0ID0gbmV3IEF1ZGlvKCcvc291bmRzL25vdGlmeS5tcDMnKTtcblxuXG5cblxuICAgIC8vIFRoZSByb29tIElEXG4gICAgdGhpcy5fcm9vbUlkID0gbnVsbDtcblxuICAgIC8vIG1lZGlhc291cC1jbGllbnQgRGV2aWNlIGluc3RhbmNlLlxuICAgIC8vIEB0eXBlIHttZWRpYXNvdXBDbGllbnQuRGV2aWNlfVxuICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG51bGw7XG5cblxuICAgIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgaGFya1xuICAgIHRoaXMuX2hhcmsgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgTWVkaWFTdHJlYW0gZm9yIGhhcmtcbiAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblxuICAgIC8vIExvY2FsIHdlYmNhbSBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gRXh0cmEgdmlkZW9zIGJlaW5nIHByb2R1Y2VkXG4gICAgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2VycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIE1hcCBvZiB3ZWJjYW0gTWVkaWFEZXZpY2VJbmZvcyBpbmRleGVkIGJ5IGRldmljZUlkLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBNZWRpYURldmljZUluZm9zPn1cbiAgICB0aGlzLl93ZWJjYW1zID0ge307XG5cbiAgICB0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG4gICAgLy8gbWVkaWFzb3VwIENvbnN1bWVycy5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgbWVkaWFzb3VwQ2xpZW50LkNvbnN1bWVyPn1cbiAgICB0aGlzLl9jb25zdW1lcnMgPSBuZXcgTWFwKCk7XG5cbiAgICB0aGlzLl91c2VTaW11bGNhc3QgPSBzaW11bGNhc3RcblxuICAgIC8vIHRoaXMuX3N0YXJ0S2V5TGlzdGVuZXIoKTtcblxuICAgIC8vIHRoaXMuX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCk7XG5cbiAgfVxuICBjbG9zZSgpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2UoKScsIHRoaXMuX2Nsb3NlZCk7XG5cbiAgICBpZiAodGhpcy5fY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuY2xvc2UoKTtcblxuICAgIC8vIENsb3NlIG1lZGlhc291cCBUcmFuc3BvcnRzLlxuICAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMuZm9yRWFjaChzdWJzY3JpcHRpb24gPT4ge1xuICAgICAgc3Vic2NyaXB0aW9uLnVuc3Vic2NyaWJlKClcbiAgICB9KVxuXG4gICAgdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKClcbiAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbGVhclBlZXJzKClcbiAgfVxuXG4gIC8vIF9zdGFydEtleUxpc3RlbmVyKCkge1xuICAvLyAgIC8vIEFkZCBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIG9uIGRvY3VtZW50XG4gIC8vICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAvLyAgICAgaWYgKGV2ZW50LnJlcGVhdCkgcmV0dXJuO1xuICAvLyAgICAgY29uc3Qga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCk7XG5cbiAgLy8gICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50LnRhcmdldDtcblxuICAvLyAgICAgY29uc3QgZXhjbHVkZSA9IFsnaW5wdXQnLCAndGV4dGFyZWEnXTtcblxuICAvLyAgICAgaWYgKGV4Y2x1ZGUuaW5kZXhPZihzb3VyY2UudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdrZXlEb3duKCkgW2tleTpcIiVzXCJdJywga2V5KTtcblxuICAvLyAgICAgICBzd2l0Y2ggKGtleSkge1xuXG4gIC8vICAgICAgICAgLypcbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzcpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0UHJldkFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzkpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0TmV4dEFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICAgKi9cblxuXG4gIC8vICAgICAgICAgY2FzZSAnTSc6IC8vIFRvZ2dsZSBtaWNyb3Bob25lXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAvLyAgICAgICAgICAgICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkKSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ011dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy51bm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5tdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRW5hYmxlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0VuYWJsZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdWJzogLy8gVG9nZ2xlIHZpZGVvXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgLy8gICAgICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdIJzogLy8gT3BlbiBoZWxwIGRpYWxvZ1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRIZWxwT3Blbih0cnVlKSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBkZWZhdWx0OlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuXG5cbiAgLy8gfVxuXG4gIF9zdGFydERldmljZXNMaXN0ZW5lcigpIHtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZWNoYW5nZScsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB8IG5hdmlnYXRvci5tZWRpYURldmljZXMub25kZXZpY2VjaGFuZ2UnKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5kZXZpY2VzQ2hhbmdlZCcsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1lvdXIgZGV2aWNlcyBjaGFuZ2VkLCBjb25maWd1cmUgeW91ciBkZXZpY2VzIGluIHRoZSBzZXR0aW5ncyBkaWFsb2cnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH0pO1xuICB9XG5cblxuXG4gIGFzeW5jIG11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ211dGVNaWMoKScpO1xuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdwYXVzZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclBhdXNlZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQodHJ1ZSkpO1xuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ211dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gbXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHVubXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygndW5tdXRlTWljKCknKTtcblxuICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAncmVzdW1lUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclJlc3VtZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VubXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGVFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIHVubXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblx0ZGlzY29ubmVjdExvY2FsSGFyaygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzY29ubmVjdExvY2FsSGFyaygpJyk7XG5cblx0XHRpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKVxuXHRcdHtcblx0XHRcdGxldCBbIHRyYWNrIF0gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cblx0XHRcdHRyYWNrLnN0b3AoKTtcblx0XHRcdHRyYWNrID0gbnVsbDtcblxuXHRcdFx0dGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuX2hhcmsgIT0gbnVsbClcblx0XHRcdHRoaXMuX2hhcmsuc3RvcCgpO1xuXHR9XG5cblx0Y29ubmVjdExvY2FsSGFyayh0cmFjaylcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdjb25uZWN0TG9jYWxIYXJrKCkgW3RyYWNrOlwiJW9cIl0nLCB0cmFjayk7XG5cblx0XHR0aGlzLl9oYXJrU3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cblx0XHRjb25zdCBuZXdUcmFjayA9IHRyYWNrLmNsb25lKCk7XG5cblx0XHR0aGlzLl9oYXJrU3RyZWFtLmFkZFRyYWNrKG5ld1RyYWNrKTtcblxuXHRcdG5ld1RyYWNrLmVuYWJsZWQgPSB0cnVlO1xuXG5cdFx0dGhpcy5faGFyayA9IGhhcmsodGhpcy5faGFya1N0cmVhbSxcblx0XHRcdHtcblx0XHRcdFx0cGxheSAgICAgIDogZmFsc2UsXG5cdFx0XHRcdGludGVydmFsICA6IDEwLFxuXHRcdFx0XHR0aHJlc2hvbGQgOiAtNTAsXG5cdFx0XHRcdGhpc3RvcnkgICA6IDEwMFxuXHRcdFx0fSk7XG5cblx0XHR0aGlzLl9oYXJrLmxhc3RWb2x1bWUgPSAtMTAwO1xuXG5cdFx0dGhpcy5faGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAge1xuICAgICAgLy8gVXBkYXRlIG9ubHkgaWYgdGhlcmUgaXMgYSBiaWdnZXIgZGlmZlxuXHRcdFx0aWYgKHRoaXMuX21pY1Byb2R1Y2VyICYmIE1hdGguYWJzKHZvbHVtZSAtIHRoaXMuX2hhcmsubGFzdFZvbHVtZSkgPiAwLjUpXG5cdFx0XHR7XG4gICAgICAgIC8vIERlY2F5IGNhbGN1bGF0aW9uOiBrZWVwIGluIG1pbmQgdGhhdCB2b2x1bWUgcmFuZ2UgaXMgLTEwMCAuLi4gMCAoZEIpXG5cdFx0XHRcdC8vIFRoaXMgbWFrZXMgZGVjYXkgdm9sdW1lIGZhc3QgaWYgZGlmZmVyZW5jZSB0byBsYXN0IHNhdmVkIHZhbHVlIGlzIGJpZ1xuXHRcdFx0XHQvLyBhbmQgc2xvdyBmb3Igc21hbGwgY2hhbmdlcy4gVGhpcyBwcmV2ZW50cyBmbGlja2VyaW5nIHZvbHVtZSBpbmRpY2F0b3Jcblx0XHRcdFx0Ly8gYXQgbG93IGxldmVsc1xuXHRcdFx0XHRpZiAodm9sdW1lIDwgdGhpcy5faGFyay5sYXN0Vm9sdW1lKVxuXHRcdFx0XHR7XG4gICAgICAgICAgdm9sdW1lID1cbiAgICAgICAgICB0aGlzLl9oYXJrLmxhc3RWb2x1bWUgLVxuICAgICAgICAgIE1hdGgucG93KFxuICAgICAgICAgICAgKHZvbHVtZSAtIHRoaXMuX2hhcmsubGFzdFZvbHVtZSkgL1xuICAgICAgICAgICAgKDEwMCArIHRoaXMuX2hhcmsubGFzdFZvbHVtZSlcbiAgICAgICAgICAgICwgMlxuXHRcdFx0XHRcdFx0KSAqIDEwO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IHZvbHVtZTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ1ZPTFVNRSBDSEFOR0UgSEFSSycpO1xuXG4gICAgICAgIC8vIHRoaXMub25Wb2x1bWVDaGFuZ2UubmV4dCh7cGVlcjp0aGlzLl9wZWVySWQsIHZvbHVtZX0pXG5cdFx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUodGhpcy5fcGVlcklkLCB2b2x1bWUpKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8vIHRoaXMuX2hhcmsub24oJ3NwZWFraW5nJywgKCkgPT5cblx0XHQvLyB7XG5cdFx0Ly8gXHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0SXNTcGVha2luZyh0cnVlKSk7XG5cblx0XHQvLyBcdGlmIChcblx0XHQvLyBcdFx0KHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3Mudm9pY2VBY3RpdmF0ZWRVbm11dGUgfHxcblx0XHQvLyBcdFx0c3RvcmUuZ2V0U3RhdGUoKS5tZS5pc0F1dG9NdXRlZCkgJiZcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIgJiZcblx0XHQvLyBcdFx0dGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG5cdFx0Ly8gXHQpXG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG5cdFx0Ly8gXHRzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKGZhbHNlKSk7IC8vIHNhbml0eSBhY3Rpb25cblx0XHQvLyB9KTtcblxuXHRcdC8vIHRoaXMuX2hhcmsub24oJ3N0b3BwZWRfc3BlYWtpbmcnLCAoKSA9PlxuXHRcdC8vIHtcblx0XHQvLyBcdHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKGZhbHNlKSk7XG5cblx0XHQvLyBcdGlmIChcblx0XHQvLyBcdFx0c3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSAmJlxuXHRcdC8vIFx0XHR0aGlzLl9taWNQcm9kdWNlciAmJlxuXHRcdC8vIFx0XHQhdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG5cdFx0Ly8gXHQpXG5cdFx0Ly8gXHR7XG5cdFx0Ly8gXHRcdHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cblx0XHQvLyBcdFx0c3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1dG9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gXHR9XG5cdFx0Ly8gfSk7XG5cdH1cblxuICBhc3luYyBjaGFuZ2VBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtkZXZpY2VJZDpcIiVzXCJdJywgZGV2aWNlSWQpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RlZCBhdWRpbyBvdXRwdXQgZGV2aWNlIG5vIGxvbmdlciBhdmFpbGFibGUnKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyBPbmx5IEZpcmVmb3ggc3VwcG9ydHMgYXBwbHlDb25zdHJhaW50cyB0byBhdWRpbyB0cmFja3NcbiAgLy8gU2VlOlxuICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD03OTY5NjRcbiAgYXN5bmMgdXBkYXRlTWljKHtcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSB8fCB0aGlzLl9kZXZpY2UuZmxhZyAhPT0gJ2ZpcmVmb3gnLFxuICAgIG5ld0RldmljZUlkID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVNaWMoKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZFxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSBhdWRpbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRBdWRpb0RldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBhdWRpbyBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0IGF1dG9HYWluQ29udHJvbCA9IGZhbHNlO1xuICAgICAgY29uc3QgZWNob0NhbmNlbGxhdGlvbiA9IHRydWVcbiAgICAgIGNvbnN0IG5vaXNlU3VwcHJlc3Npb24gPSB0cnVlXG5cbiAgICAgIC8vIGlmICghd2luZG93LmNvbmZpZy5jZW50cmFsQXVkaW9PcHRpb25zKSB7XG4gICAgICAvLyAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIC8vICAgICAnTWlzc2luZyBjZW50cmFsQXVkaW9PcHRpb25zIGZyb20gYXBwIGNvbmZpZyEgKFNlZSBpdCBpbiBleGFtcGxlIGNvbmZpZy4pJ1xuICAgICAgLy8gICApO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgIHNhbXBsZVJhdGUgPSA5NjAwMCxcbiAgICAgICAgY2hhbm5lbENvdW50ID0gMSxcbiAgICAgICAgdm9sdW1lID0gMS4wLFxuICAgICAgICBzYW1wbGVTaXplID0gMTYsXG4gICAgICAgIG9wdXNTdGVyZW8gPSBmYWxzZSxcbiAgICAgICAgb3B1c0R0eCA9IHRydWUsXG4gICAgICAgIG9wdXNGZWMgPSB0cnVlLFxuICAgICAgICBvcHVzUHRpbWUgPSAyMCxcbiAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZSA9IDk2MDAwXG4gICAgICB9ID0ge307XG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fbWljUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZU1pYygpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9wdXNTdGVyZW8sXG4gICAgICAgICAgICAgIG9wdXNEdHgsXG4gICAgICAgICAgICAgIG9wdXNGZWMsXG4gICAgICAgICAgICAgIG9wdXNQdGltZSxcbiAgICAgICAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHsgc291cmNlOiAnbWljJyB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl9taWNQcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ21pYycsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl9taWNQcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTWljcm9waG9uZSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVNaWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIudm9sdW1lID0gMDtcblxuICAgICAgICB0aGlzLmNvbm5lY3RMb2NhbEhhcmsodHJhY2spO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX21pY1Byb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IFtoYXJrVHJhY2tdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG4gICAgICAgICAgaGFya1RyYWNrICYmIGF3YWl0IGhhcmtUcmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlV2ViY2FtKHtcbiAgICBpbml0ID0gZmFsc2UsXG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsLFxuICAgIG5ld1Jlc29sdXRpb24gPSBudWxsLFxuICAgIG5ld0ZyYW1lUmF0ZSA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlV2ViY2FtKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIiwgbmV3UmVzb2x1dGlvbjpcIiVzXCIsIG5ld0ZyYW1lUmF0ZTpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkLFxuICAgICAgbmV3UmVzb2x1dGlvbixcbiAgICAgIG5ld0ZyYW1lUmF0ZVxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSB2aWRlbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gaWYgKG5ld1Jlc29sdXRpb24pXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb1Jlc29sdXRpb24obmV3UmVzb2x1dGlvbikpO1xuXG4gICAgICAvLyBpZiAobmV3RnJhbWVSYXRlKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9GcmFtZVJhdGUobmV3RnJhbWVSYXRlKSk7XG5cbiAgICAgIGNvbnN0ICB2aWRlb011dGVkICA9IGZhbHNlXG5cbiAgICAgIGlmIChpbml0ICYmIHZpZGVvTXV0ZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIC8vIGVsc2VcbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldFdlYmNhbURldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl93ZWJjYW1zW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2ViY2FtIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgIHJlc29sdXRpb24gPSAnbWVkaXVtJ1xuICAgICAgY29uc3QgZnJhbWVSYXRlID0gMTVcblxuXG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fd2ViY2FtUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZpZGVvOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIGlmICh0aGlzLl91c2VTaW11bGNhc3QpIHtcbiAgICAgICAgICAvLyBJZiBWUDkgaXMgdGhlIG9ubHkgYXZhaWxhYmxlIHZpZGVvIGNvZGVjIHRoZW4gdXNlIFNWQy5cbiAgICAgICAgICBjb25zdCBmaXJzdFZpZGVvQ29kZWMgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2VcbiAgICAgICAgICAgIC5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgICAgIC5jb2RlY3NcbiAgICAgICAgICAgIC5maW5kKChjKSA9PiBjLmtpbmQgPT09ICd2aWRlbycpO1xuXG4gICAgICAgICAgbGV0IGVuY29kaW5ncztcblxuICAgICAgICAgIGlmIChmaXJzdFZpZGVvQ29kZWMubWltZVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3ZpZGVvL3ZwOScpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19LU1ZDX0VOQ09ESU5HUztcbiAgICAgICAgICBlbHNlIGlmIChzaW11bGNhc3RFbmNvZGluZ3MpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBzaW11bGNhc3RFbmNvZGluZ3M7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUztcblxuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgICAgZW5jb2RpbmdzLFxuICAgICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2aWRlb0dvb2dsZVN0YXJ0Qml0cmF0ZTogMTAwMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZSh7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICd3ZWJjYW0nLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fd2ViY2FtUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cblxuICAgICAgICBjb25zdCB3ZWJDYW1TdHJlYW0gPSBuZXcgU3RyZWFtKClcbiAgICAgICAgd2ViQ2FtU3RyZWFtLnNldFByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICB0aGlzLm9uQ2FtUHJvZHVjaW5nLm5leHQod2ViQ2FtU3RyZWFtKVxuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0NhbWVyYSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBbHNvIGNoYW5nZSByZXNvbHV0aW9uIG9mIGV4dHJhIHZpZGVvIHByb2R1Y2Vyc1xuICAgICAgICBmb3IgKGNvbnN0IHByb2R1Y2VyIG9mIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAoeyB0cmFjayB9ID0gcHJvZHVjZXIpO1xuXG4gICAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBjYW1lcmEnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBjbG9zZU1lZXRpbmcoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlTWVldGluZygpJyk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnbW9kZXJhdG9yOmNsb3NlTWVldGluZycpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjbG9zZU1lZXRpbmcoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIC8vIHR5cGU6IG1pYy93ZWJjYW0vc2NyZWVuXG4gIC8vIC8vIG11dGU6IHRydWUvZmFsc2VcbiAgYXN5bmMgbW9kaWZ5UGVlckNvbnN1bWVyKHBlZXJJZCwgdHlwZSwgbXV0ZSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ21vZGlmeVBlZXJDb25zdW1lcigpIFtwZWVySWQ6XCIlc1wiLCB0eXBlOlwiJXNcIl0nLFxuICAgICAgcGVlcklkLFxuICAgICAgdHlwZVxuICAgICk7XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGhpcy5fY29uc3VtZXJzLnZhbHVlcygpKSB7XG4gICAgICAgIGlmIChjb25zdW1lci5hcHBEYXRhLnBlZXJJZCA9PT0gcGVlcklkICYmIGNvbnN1bWVyLmFwcERhdGEuc291cmNlID09PSB0eXBlKSB7XG4gICAgICAgICAgaWYgKG11dGUpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9yZXN1bWVDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbW9kaWZ5UGVlckNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIF9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19wYXVzZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3BhdXNlQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5wYXVzZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19wYXVzZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19yZXN1bWVDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKCFjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncmVzdW1lQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5yZXN1bWUoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3Jlc3VtZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gYXN5bmMgc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbc3BhdGlhbExheWVyOlwiJXNcIl0nLCBzcGF0aWFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fd2ViY2FtUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgICBpZiAodGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBzcGF0aWFsTGF5ZXI6XCIlc1wiLCB0ZW1wb3JhbExheWVyOlwiJXNcIl0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KFxuICAvLyAgICAgICAnc2V0Q29uc3VtZXJQcmVmZXJlZExheWVycycsIHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoXG4gIC8vICAgICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHByaW9yaXR5OiVkXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBwcmlvcml0eSk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnc2V0Q29uc3VtZXJQcmlvcml0eScsIHsgY29uc3VtZXJJZCwgcHJpb3JpdHkgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByaW9yaXR5KCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgcmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoY29uc3VtZXJJZCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbY29uc3VtZXJJZDpcIiVzXCJdJywgY29uc3VtZXJJZCk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUnLCB7IGNvbnN1bWVySWQgfSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG5cblxuXG4gIGFzeW5jIGpvaW4oeyByb29tSWQsIGpvaW5WaWRlbywgam9pbkF1ZGlvLCB0b2tlbiB9KSB7XG5cblxuICAgIHRoaXMuX3Jvb21JZCA9IHJvb21JZDtcblxuXG4gICAgLy8gaW5pdGlhbGl6ZSBzaWduYWxpbmcgc29ja2V0XG4gICAgLy8gbGlzdGVuIHRvIHNvY2tldCBldmVudHNcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2UuaW5pdCh0b2tlbilcbiAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbkRpc2Nvbm5lY3RlZC5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG4gICAgICAvLyB0aGlzLmNsb3NlXG4gICAgfSkpXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLnB1c2godGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uUmVjb25uZWN0aW5nLnN1YnNjcmliZSggKCkgPT4ge1xuICAgICAgLy8gY2xvc2VcblxuICAgICAgdGhpcy5sb2dnZXIubG9nKCdSZWNvbm5lY3RpbmcuLi4nKVxuXG5cblx0XHRcdGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsZWFyUGVlcnMoKTtcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RpbmcnKSk7XG4gICAgfSkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25OZXdDb25zdW1lci5waXBlKHN3aXRjaE1hcChhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwZWVySWQsXG4gICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgIGlkLFxuICAgICAgICBraW5kLFxuICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhcHBEYXRhLFxuICAgICAgICBwcm9kdWNlclBhdXNlZFxuICAgICAgfSA9IGRhdGE7XG5cbiAgICAgIGNvbnN0IGNvbnN1bWVyICA9IGF3YWl0IHRoaXMuX3JlY3ZUcmFuc3BvcnQuY29uc3VtZShcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgIGFwcERhdGEgOiB7IC4uLmFwcERhdGEsIHBlZXJJZCB9IC8vIFRyaWNrLlxuICAgICAgICB9KSBhcyBtZWRpYXNvdXBDbGllbnQudHlwZXMuQ29uc3VtZXI7XG5cbiAgICAgIC8vIFN0b3JlIGluIHRoZSBtYXAuXG4gICAgICB0aGlzLl9jb25zdW1lcnMuc2V0KGNvbnN1bWVyLmlkLCBjb25zdW1lcik7XG5cbiAgICAgIGNvbnN1bWVyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+XG4gICAgICB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXIuaWQpO1xuICAgICAgfSk7XG5cblxuXG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld0NvbnN1bWVyKGNvbnN1bWVyLCAgcGVlcklkLCB0eXBlLCBwcm9kdWNlclBhdXNlZCk7XG5cbiAgICAgIC8vIFdlIGFyZSByZWFkeS4gQW5zd2VyIHRoZSByZXF1ZXN0IHNvIHRoZSBzZXJ2ZXIgd2lsbFxuICAgICAgLy8gcmVzdW1lIHRoaXMgQ29uc3VtZXIgKHdoaWNoIHdhcyBwYXVzZWQgZm9yIG5vdykuXG5cblxuICAgICAgLy8gaWYgKGtpbmQgPT09ICdhdWRpbycpXG4gICAgICAvLyB7XG4gICAgICAvLyAgIGNvbnN1bWVyLnZvbHVtZSA9IDA7XG5cbiAgICAgIC8vICAgY29uc3Qgc3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgIC8vICAgc3RyZWFtLmFkZFRyYWNrKGNvbnN1bWVyLnRyYWNrKTtcblxuICAgICAgLy8gICBpZiAoIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKVxuICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcigncmVxdWVzdC5uZXdDb25zdW1lciB8IGdpdmVuIHN0cmVhbSBoYXMgbm8gYXVkaW8gdHJhY2snKTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrID0gaGFyayhzdHJlYW0sIHsgcGxheTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gICB2b2x1bWUgPSBNYXRoLnJvdW5kKHZvbHVtZSk7XG5cbiAgICAgICAgLy8gICBpZiAoY29uc3VtZXIgJiYgdm9sdW1lICE9PSBjb25zdW1lci52b2x1bWUpXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgY29uc3VtZXIudm9sdW1lID0gdm9sdW1lO1xuXG4gICAgICAgIC8vICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHBlZXJJZCwgdm9sdW1lKSk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAgIC8vIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5vdGlmaWNhdGlvbi5waXBlKHN3aXRjaE1hcChhc3luYyAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobm90aWZpY2F0aW9uLm1ldGhvZCkge1xuXG5cblxuICAgICAgICAgIGNhc2UgJ3Byb2R1Y2VyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHByb2R1Y2VySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJTY29yZShwcm9kdWNlcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnbmV3UGVlcic6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlckFjdGlvbnMuYWRkUGVlcihcbiAgICAgICAgICAgICAgLy8gICB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMsIGNvbnN1bWVyczogW10gfSkpO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld1BlZXIoaWQpO1xuXG4gICAgICAgICAgICAgIC8vIHRoaXMuX3NvdW5kTm90aWZpY2F0aW9uKCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIC8vICAgICAgIGlkOiAncm9vbS5uZXdQZWVyJyxcbiAgICAgICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICd7ZGlzcGxheU5hbWV9IGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgICAgICAgICAgLy8gICAgIH0sIHtcbiAgICAgICAgICAgICAgLy8gICAgICAgZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAncGVlckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbG9zZVBlZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwZWVyQWN0aW9ucy5yZW1vdmVQZWVyKHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjb25zdW1lci5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChjb25zdW1lci5oYXJrICE9IG51bGwpXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaGFyay5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gY29uc3VtZXIuYXBwRGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMucmVtb3ZlQ29uc3VtZXIoY29uc3VtZXJJZCwgcGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclBhdXNlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJSZXN1bWVkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJMYXllcnNDaGFuZ2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5vbkNvbnN1bWVyTGF5ZXJDaGFuZ2VkKGNvbnN1bWVySWQpXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lckN1cnJlbnRMYXllcnMoXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyU2NvcmUoY29uc3VtZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jvb21CYWNrJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgJ3Jvb21SZWFkeSc6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0dXJuU2VydmVycyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3R1cm5TZXJ2ZXJzID0gdHVyblNlcnZlcnM7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnRvZ2dsZUpvaW5lZCgpKTtcbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEluTG9iYnkoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlICdhY3RpdmVTcGVha2VyJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuXG5cbiAgICAgICAgICAgICAgaWYgKHBlZXJJZCA9PT0gdGhpcy5fcGVlcklkKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLm9uVm9sdW1lQ2hhbmdlLm5leHQobm90aWZpY2F0aW9uLmRhdGEpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgLy8gdGhpcy5fc3BvdGxpZ2h0cy5oYW5kbGVBY3RpdmVTcGVha2VyKHBlZXJJZCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAvLyAgICd1bmtub3duIG5vdGlmaWNhdGlvbi5tZXRob2QgXCIlc1wiJywgbm90aWZpY2F0aW9uLm1ldGhvZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignZXJyb3Igb24gc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ3NvY2tldC5yZXF1ZXN0RXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0Vycm9yIG9uIHNlcnZlciByZXF1ZXN0J1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG4gICAgLy8gb24gcm9vbSByZWFkeSBqb2luIHJvb20gX2pvaW5Sb29tXG5cbiAgICAvLyB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgLy8gY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAvLyAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgLy8gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgIC8vICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgIC8vIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgLy8gY3JlYXRlIHNlbmQgdHJhbnNwb3J0IGNyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9ydFxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBjcmVhdGUgcmVjZWl2ZSB0cmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvclxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBzZW5kIGpvaW4gcmVxdWVzdFxuXG4gICAgLy8gYWRkIHBlZXJzIHRvIHBlZXJzIHNlcnZpY2VcblxuICAgIC8vIHByb2R1Y2UgdXBkYXRlV2ViY2FtIHVwZGF0ZU1pY1xuICB9XG5cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9EZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9EZXZpY2VzKHRoaXMuX2F1ZGlvRGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb0RldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlV2ViY2FtcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fd2ViY2FtcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ3ZpZGVvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRXZWJjYW1EZXZpY2VzKHRoaXMuX3dlYmNhbXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlV2ViY2FtcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGRpc2FibGVXZWJjYW0oKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVXZWJjYW0oKScpO1xuXG5cdFx0aWYgKCF0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcblx0fVxuXHRhc3luYyBkaXNhYmxlTWljKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlTWljKCknKTtcblxuXHRcdGlmICghdGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG5cblx0YXN5bmMgX2dldFdlYmNhbURldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcblxuXHRcdFx0Y29uc3QgIHNlbGVjdGVkV2ViY2FtID0gIG51bGxcblxuXHRcdFx0aWYgKHNlbGVjdGVkV2ViY2FtICYmIHRoaXMuX3dlYmNhbXNbc2VsZWN0ZWRXZWJjYW1dKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRXZWJjYW07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHdlYmNhbXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX3dlYmNhbXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIHdlYmNhbXNbMF0gPyB3ZWJjYW1zWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRBdWRpb0RldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZUF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcblxuICAgICAgY29uc3QgIHNlbGVjdGVkQXVkaW9EZXZpY2UgPSBudWxsO1xuXG5cdFx0XHRpZiAoc2VsZWN0ZWRBdWRpb0RldmljZSAmJiB0aGlzLl9hdWRpb0RldmljZXNbc2VsZWN0ZWRBdWRpb0RldmljZV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZEF1ZGlvRGV2aWNlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdWRpb0RldmljZXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX2F1ZGlvRGV2aWNlcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gYXVkaW9EZXZpY2VzWzBdID8gYXVkaW9EZXZpY2VzWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb091dHB1dERldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb291dHB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXREZXZpY2VzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXG5cbiAgYXN5bmMgX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfam9pblJvb20oKSBEZXZpY2UnLCB0aGlzLl9kZXZpY2UpO1xuXG4gICAgY29uc3QgZGlzcGxheU5hbWUgPSBgR3Vlc3QgJHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAwIC0gMTAwMDApKSArIDEwMDAwfWBcblxuXG4gICAgdHJ5IHtcblxuXG4gICAgICAvLyB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSh7aGFuZGxlck5hbWU6J1NhZmFyaTEyJ30pO1xuICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgICAgY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgICAgcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgICAgICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgICBwcm9kdWNpbmc6IHRydWUsXG4gICAgICAgICAgICBjb25zdW1pbmc6IGZhbHNlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVNlbmRUcmFuc3BvcnQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHByb3ByaWV0YXJ5Q29uc3RyYWludHM6IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAncHJvZHVjZScsIGFzeW5jICh7IGtpbmQsIHJ0cFBhcmFtZXRlcnMsIGFwcERhdGEgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgY29uc3QgeyBpZCB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgICAncHJvZHVjZScsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgYXBwRGF0YVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FsbGJhY2soeyBpZCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBlcnJiYWNrKGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICBwcm9kdWNpbmc6IGZhbHNlLFxuICAgICAgICAgIGNvbnN1bWluZzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBpZCxcbiAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVJlY3ZUcmFuc3BvcnQoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0Lm9uKFxuICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAge1xuICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgb3VyIG1lZGlhIGNhcGFiaWxpdGllcy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRNZWRpYUNhcGFiaWxpdGllcyhcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdGNhblNlbmRNaWMgICAgIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksXG4gICAgICAvLyBcdFx0Y2FuU2VuZFdlYmNhbSAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZVNjcmVlbiA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpICYmXG4gICAgICAvLyBcdFx0XHR0aGlzLl9zY3JlZW5TaGFyaW5nLmlzU2NyZWVuU2hhcmVBdmFpbGFibGUoKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZUZpbGVzIDogdGhpcy5fdG9ycmVudFN1cHBvcnRcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgdHJhY2tlcixcbiAgICAgICAgcm9vbVBlcm1pc3Npb25zLFxuICAgICAgICB1c2VyUm9sZXMsXG4gICAgICAgIGFsbG93V2hlblJvbGVNaXNzaW5nLFxuICAgICAgICBjaGF0SGlzdG9yeSxcbiAgICAgICAgZmlsZUhpc3RvcnksXG4gICAgICAgIGxhc3ROSGlzdG9yeSxcbiAgICAgICAgbG9ja2VkLFxuICAgICAgICBsb2JieVBlZXJzLFxuICAgICAgICBhY2Nlc3NDb2RlXG4gICAgICB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnam9pbicsXG4gICAgICAgIHtcbiAgICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG5cbiAgICAgICAgICBydHBDYXBhYmlsaXRpZXM6IHRoaXMuX21lZGlhc291cERldmljZS5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnX2pvaW5Sb29tKCkgam9pbmVkIFthdXRoZW50aWNhdGVkOlwiJXNcIiwgcGVlcnM6XCIlb1wiLCByb2xlczpcIiVvXCIsIHVzZXJSb2xlczpcIiVvXCJdJyxcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICB1c2VyUm9sZXNcbiAgICAgICk7XG5cblxuXG5cblxuICAgICAgLy8gZm9yIChjb25zdCBwZWVyIG9mIHBlZXJzKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRwZWVyQWN0aW9ucy5hZGRQZWVyKHsgLi4ucGVlciwgY29uc3VtZXJzOiBbXSB9KSk7XG4gICAgICAvLyB9XG5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ2pvaW4gYXVkaW8nLGpvaW5BdWRpbyAsICdjYW4gcHJvZHVjZSBhdWRpbycsXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksICcgdGhpcy5fbXV0ZWQnLCB0aGlzLl9tdXRlZClcbiAgICAgIC8vIERvbid0IHByb2R1Y2UgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQgdG8gbm90IHRvIGRvIGl0LlxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5WaWRlb1xuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IGluaXQ6IHRydWUsIHN0YXJ0OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luQXVkaW8gJiZcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKVxuICAgICAgICApXG4gICAgICAgICAgaWYgKCF0aGlzLl9tdXRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIGNvbnN0ICBzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICA9IG51bGxcblxuICAgICAgLy8gaWYgKCFzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICYmIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyAhPT0ge30pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKFxuICAgICAgLy8gXHRcdFx0T2JqZWN0LmtleXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKVswXVxuICAgICAgLy8gXHRcdClcbiAgICAgIC8vIFx0KTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cbiAgICAgIC8vIC8vIENsZWFuIGFsbCB0aGUgZXhpc3Rpbmcgbm90aWZpY2F0aW9ucy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG5vdGlmaWNhdGlvbkFjdGlvbnMucmVtb3ZlQWxsTm90aWZpY2F0aW9ucygpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0dGV4dCA6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyBcdFx0XHRpZCAgICAgICAgICAgICA6ICdyb29tLmpvaW5lZCcsXG4gICAgICAvLyBcdFx0XHRkZWZhdWx0TWVzc2FnZSA6ICdZb3UgaGF2ZSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAvLyBcdFx0fSlcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5hZGRQZWVycyhwZWVycyk7XG5cblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfam9pblJvb20oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuXG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG4gIGRldmljZUluZm8oKSB7XG4gICAgY29uc3QgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGNvbnN0IGJyb3dzZXIgPSBib3dzZXIuZ2V0UGFyc2VyKHVhKTtcblxuICAgIGxldCBmbGFnO1xuXG4gICAgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgY2hyb21lOiAnPj0wJywgY2hyb21pdW06ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdjaHJvbWUnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgZmlyZWZveDogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2ZpcmVmb3gnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgc2FmYXJpOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnc2FmYXJpJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IG9wZXJhOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnb3BlcmEnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgJ21pY3Jvc29mdCBlZGdlJzogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2VkZ2UnO1xuICAgIGVsc2VcbiAgICAgIGZsYWcgPSAndW5rbm93bic7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmxhZyxcbiAgICAgIG9zOiBicm93c2VyLmdldE9TTmFtZSh0cnVlKSwgLy8gaW9zLCBhbmRyb2lkLCBsaW51eC4uLlxuICAgICAgcGxhdGZvcm06IGJyb3dzZXIuZ2V0UGxhdGZvcm1UeXBlKHRydWUpLCAvLyBtb2JpbGUsIGRlc2t0b3AsIHRhYmxldFxuICAgICAgbmFtZTogYnJvd3Nlci5nZXRCcm93c2VyTmFtZSh0cnVlKSxcbiAgICAgIHZlcnNpb246IGJyb3dzZXIuZ2V0QnJvd3NlclZlcnNpb24oKSxcbiAgICAgIGJvd3NlcjogYnJvd3NlclxuICAgIH07XG4gIH1cbn1cbiJdfQ==
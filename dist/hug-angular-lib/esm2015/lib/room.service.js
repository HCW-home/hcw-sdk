import { __awaiter } from "tslib";
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
                    // this.connectLocalHark(track);
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
    join({ roomId, joinVideo, joinAudio }) {
        return __awaiter(this, void 0, void 0, function* () {
            this._roomId = roomId;
            // initialize signaling socket
            // listen to socket events
            this.signalingService.init(roomId, this._peerId);
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
            this.logger.debug('_joinRoom()');
            const displayName = `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`;
            try {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7OztBQUcvQixJQUFJLE1BQU0sQ0FBQztBQUdYLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNmLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUU5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdkIsTUFBTyxrQkFBa0IsR0FBSztJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtDQUM3QixDQUFBO0FBR0QsTUFBTSxnQkFBZ0IsR0FDdEI7SUFDQyxLQUFLLEVBQ0w7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxRQUFRLEVBQ1I7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxNQUFNLEVBQ047UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdC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RUFBRSxLQUFLLEVBQUUsQ0FBQztZQUN2RCxJQUFJLEdBQUcsUUFBUSxDQUFDO2FBQ2IsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzVDLElBQUksR0FBRyxTQUFTLENBQUM7YUFDZCxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDM0MsSUFBSSxHQUFHLFFBQVEsQ0FBQzthQUNiLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztZQUMxQyxJQUFJLEdBQUcsT0FBTyxDQUFDO2FBQ1osSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDckQsSUFBSSxHQUFHLE1BQU0sQ0FBQzs7WUFFZCxJQUFJLEdBQUcsU0FBUyxDQUFDO1FBRW5CLE9BQU87WUFDTCxJQUFJO1lBQ0osRUFBRSxFQUFFLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1lBQzNCLFFBQVEsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUN2QyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7WUFDbEMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsRUFBRTtZQUNwQyxNQUFNLEVBQUUsT0FBTztTQUNoQixDQUFDO0lBRUosQ0FBQzs7c0VBanJEVyxXQUFXO21EQUFYLFdBQVcsV0FBWCxXQUFXLG1CQUZYLE1BQU07a0RBRU4sV0FBVztjQUh4QixVQUFVO2VBQUM7Z0JBQ1YsVUFBVSxFQUFFLE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdHJlYW0gfSBmcm9tICcuL3N0cmVhbSc7XG5pbXBvcnQgeyBSZW1vdGVQZWVyc1NlcnZpY2UgfSBmcm9tICcuL3JlbW90ZS1wZWVycy5zZXJ2aWNlJztcbmltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IFNpZ25hbGluZ1NlcnZpY2UgfSBmcm9tICcuL3NpZ25hbGluZy5zZXJ2aWNlJztcblxuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5pbXBvcnQgeyBzd2l0Y2hNYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgYm93c2VyIGZyb20gJ2Jvd3Nlcic7XG5cbmltcG9ydCAqIGFzIG1lZGlhc291cENsaWVudCBmcm9tICdtZWRpYXNvdXAtY2xpZW50J1xuaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuXG5cbmxldCBzYXZlQXM7XG5cblxuY29uc3QgbGFzdE4gPSA0XG5jb25zdCBtb2JpbGVMYXN0TiA9IDFcbmNvbnN0IHZpZGVvQXNwZWN0UmF0aW8gPSAxLjc3N1xuXG5jb25zdCBzaW11bGNhc3QgPSB0cnVlO1xuY29uc3QgXHRzaW11bGNhc3RFbmNvZGluZ3MgICA9IFtcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDIgfSxcbiAgeyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEgfVxuXVxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG4gIF91c2VTaW11bGNhc3RcbiAgX3R1cm5TZXJ2ZXJzXG5cbiAgc3Vic2NyaXB0aW9ucyA9IFtdO1xuICBwdWJsaWMgb25DYW1Qcm9kdWNpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgc2lnbmFsaW5nU2VydmljZTogU2lnbmFsaW5nU2VydmljZSxcbiAgICBwcml2YXRlIGxvZ2dlcjogTG9nU2VydmljZSxcbiAgcHJpdmF0ZSByZW1vdGVQZWVyc1NlcnZpY2U6IFJlbW90ZVBlZXJzU2VydmljZSkge1xuXG5cbiAgfVxuXG4gIGluaXQoe1xuICAgIHBlZXJJZD1udWxsLFxuXG4gICAgcHJvZHVjZT10cnVlLFxuICAgIGZvcmNlVGNwPWZhbHNlLFxuICAgIG11dGVkPWZhbHNlXG4gIH0gPSB7fSkge1xuICAgIGlmICghcGVlcklkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHBlZXJJZCcpO1xuXG5cbiAgICAvLyBsb2dnZXIuZGVidWcoXG4gICAgLy8gICAnY29uc3RydWN0b3IoKSBbcGVlcklkOiBcIiVzXCIsIGRldmljZTogXCIlc1wiLCBwcm9kdWNlOiBcIiVzXCIsIGZvcmNlVGNwOiBcIiVzXCIsIGRpc3BsYXlOYW1lIFwiXCJdJyxcbiAgICAvLyAgIHBlZXJJZCwgZGV2aWNlLmZsYWcsIHByb2R1Y2UsIGZvcmNlVGNwKTtcblxuXG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnSU5JVCBSb29tICcsIHBlZXJJZClcblxuICAgIHRoaXMuX2Nsb3NlZCA9IGZhbHNlO1xuICAgIC8vIFdoZXRoZXIgd2Ugc2hvdWxkIHByb2R1Y2UuXG4gICAgdGhpcy5fcHJvZHVjZSA9IHByb2R1Y2U7XG5cbiAgICAvLyBXaGV0aGVyIHdlIGZvcmNlIFRDUFxuICAgIHRoaXMuX2ZvcmNlVGNwID0gZm9yY2VUY3A7XG5cblxuXG5cbiAgICAvLyBXaGV0aGVyIHNpbXVsY2FzdCBzaG91bGQgYmUgdXNlZC5cbiAgICAvLyB0aGlzLl91c2VTaW11bGNhc3QgPSBmYWxzZTtcblxuICAgIC8vIGlmICgnc2ltdWxjYXN0JyBpbiB3aW5kb3cuY29uZmlnKVxuICAgIC8vICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gd2luZG93LmNvbmZpZy5zaW11bGNhc3Q7XG5cblxuXG5cblxuICAgIHRoaXMuX211dGVkID0gbXV0ZWQ7XG5cbiAgICAvLyBUaGlzIGRldmljZVxuICAgIHRoaXMuX2RldmljZSA9IHRoaXMuZGV2aWNlSW5mbygpO1xuXG4gICAgLy8gTXkgcGVlciBuYW1lLlxuICAgIHRoaXMuX3BlZXJJZCA9IHBlZXJJZDtcblxuXG5cbiAgICAvLyBBbGVydCBzb3VuZFxuICAgIC8vIHRoaXMuX3NvdW5kQWxlcnQgPSBuZXcgQXVkaW8oJy9zb3VuZHMvbm90aWZ5Lm1wMycpO1xuXG5cblxuXG4gICAgLy8gVGhlIHJvb20gSURcbiAgICB0aGlzLl9yb29tSWQgPSBudWxsO1xuXG4gICAgLy8gbWVkaWFzb3VwLWNsaWVudCBEZXZpY2UgaW5zdGFuY2UuXG4gICAgLy8gQHR5cGUge21lZGlhc291cENsaWVudC5EZXZpY2V9XG4gICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbnVsbDtcblxuXG4gICAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBoYXJrXG4gICAgdGhpcy5faGFyayA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBNZWRpYVN0cmVhbSBmb3IgaGFya1xuICAgIHRoaXMuX2hhcmtTdHJlYW0gPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgd2ViY2FtIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBFeHRyYSB2aWRlb3MgYmVpbmcgcHJvZHVjZWRcbiAgICB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gTWFwIG9mIHdlYmNhbSBNZWRpYURldmljZUluZm9zIGluZGV4ZWQgYnkgZGV2aWNlSWQuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIE1lZGlhRGV2aWNlSW5mb3M+fVxuICAgIHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cbiAgICAvLyBtZWRpYXNvdXAgQ29uc3VtZXJzLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBtZWRpYXNvdXBDbGllbnQuQ29uc3VtZXI+fVxuICAgIHRoaXMuX2NvbnN1bWVycyA9IG5ldyBNYXAoKTtcblxuICAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHNpbXVsY2FzdFxuXG4gICAgLy8gdGhpcy5fc3RhcnRLZXlMaXN0ZW5lcigpO1xuXG4gICAgLy8gdGhpcy5fc3RhcnREZXZpY2VzTGlzdGVuZXIoKTtcblxuICB9XG4gIGNsb3NlKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjbG9zZSgpJywgdGhpcy5fY2xvc2VkKTtcblxuICAgIGlmICh0aGlzLl9jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknKTtcblxuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5jbG9zZSgpO1xuXG4gICAgLy8gQ2xvc2UgbWVkaWFzb3VwIFRyYW5zcG9ydHMuXG4gICAgaWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICBpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5mb3JFYWNoKHN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBzdWJzY3JpcHRpb24udW5zdWJzY3JpYmUoKVxuICAgIH0pXG5cbiAgfVxuXG4gIC8vIF9zdGFydEtleUxpc3RlbmVyKCkge1xuICAvLyAgIC8vIEFkZCBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIG9uIGRvY3VtZW50XG4gIC8vICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAvLyAgICAgaWYgKGV2ZW50LnJlcGVhdCkgcmV0dXJuO1xuICAvLyAgICAgY29uc3Qga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCk7XG5cbiAgLy8gICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50LnRhcmdldDtcblxuICAvLyAgICAgY29uc3QgZXhjbHVkZSA9IFsnaW5wdXQnLCAndGV4dGFyZWEnXTtcblxuICAvLyAgICAgaWYgKGV4Y2x1ZGUuaW5kZXhPZihzb3VyY2UudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdrZXlEb3duKCkgW2tleTpcIiVzXCJdJywga2V5KTtcblxuICAvLyAgICAgICBzd2l0Y2ggKGtleSkge1xuXG4gIC8vICAgICAgICAgLypcbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzcpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0UHJldkFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzkpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0TmV4dEFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICAgKi9cblxuXG4gIC8vICAgICAgICAgY2FzZSAnTSc6IC8vIFRvZ2dsZSBtaWNyb3Bob25lXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAvLyAgICAgICAgICAgICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkKSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ011dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy51bm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5tdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRW5hYmxlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0VuYWJsZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdWJzogLy8gVG9nZ2xlIHZpZGVvXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgLy8gICAgICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdIJzogLy8gT3BlbiBoZWxwIGRpYWxvZ1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRIZWxwT3Blbih0cnVlKSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBkZWZhdWx0OlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuXG5cbiAgLy8gfVxuXG4gIF9zdGFydERldmljZXNMaXN0ZW5lcigpIHtcbiAgICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZWNoYW5nZScsIGFzeW5jICgpID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB8IG5hdmlnYXRvci5tZWRpYURldmljZXMub25kZXZpY2VjaGFuZ2UnKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5kZXZpY2VzQ2hhbmdlZCcsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1lvdXIgZGV2aWNlcyBjaGFuZ2VkLCBjb25maWd1cmUgeW91ciBkZXZpY2VzIGluIHRoZSBzZXR0aW5ncyBkaWFsb2cnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH0pO1xuICB9XG5cblxuXG4gIGFzeW5jIG11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ211dGVNaWMoKScpO1xuXG4gICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdwYXVzZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclBhdXNlZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQodHJ1ZSkpO1xuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ211dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVNdXRlRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gbXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHVubXV0ZU1pYygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygndW5tdXRlTWljKCknKTtcblxuICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAncmVzdW1lUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclJlc3VtZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICB9XG4gICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VubXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVVbk11dGVFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIHVubXV0ZSB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuXG4gIGFzeW5jIGNoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2RldmljZUlkOlwiJXNcIl0nLCBkZXZpY2VJZCk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NlbGVjdGVkIGF1ZGlvIG91dHB1dCBkZXZpY2Ugbm8gbG9uZ2VyIGF2YWlsYWJsZScpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkpO1xuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIE9ubHkgRmlyZWZveCBzdXBwb3J0cyBhcHBseUNvbnN0cmFpbnRzIHRvIGF1ZGlvIHRyYWNrc1xuICAvLyBTZWU6XG4gIC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTc5Njk2NFxuICBhc3luYyB1cGRhdGVNaWMoe1xuICAgIHN0YXJ0ID0gZmFsc2UsXG4gICAgcmVzdGFydCA9IGZhbHNlIHx8IHRoaXMuX2RldmljZS5mbGFnICE9PSAnZmlyZWZveCcsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsXG4gIH0gPSB7fSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ3VwZGF0ZU1pYygpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIGF1ZGlvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldEF1ZGlvRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgICAgIGlmICghZGV2aWNlKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGF1ZGlvIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgYXV0b0dhaW5Db250cm9sID0gZmFsc2U7XG4gICAgICBjb25zdCBlY2hvQ2FuY2VsbGF0aW9uID0gdHJ1ZVxuICAgICAgY29uc3Qgbm9pc2VTdXBwcmVzc2lvbiA9IHRydWVcblxuICAgICAgLy8gaWYgKCF3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnMpIHtcbiAgICAgIC8vICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgLy8gICAgICdNaXNzaW5nIGNlbnRyYWxBdWRpb09wdGlvbnMgZnJvbSBhcHAgY29uZmlnISAoU2VlIGl0IGluIGV4YW1wbGUgY29uZmlnLiknXG4gICAgICAvLyAgICk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc2FtcGxlUmF0ZSA9IDk2MDAwLFxuICAgICAgICBjaGFubmVsQ291bnQgPSAxLFxuICAgICAgICB2b2x1bWUgPSAxLjAsXG4gICAgICAgIHNhbXBsZVNpemUgPSAxNixcbiAgICAgICAgb3B1c1N0ZXJlbyA9IGZhbHNlLFxuICAgICAgICBvcHVzRHR4ID0gdHJ1ZSxcbiAgICAgICAgb3B1c0ZlYyA9IHRydWUsXG4gICAgICAgIG9wdXNQdGltZSA9IDIwLFxuICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlID0gOTYwMDBcbiAgICAgIH0gPSB7fTtcblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl9taWNQcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICAvLyB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKTtcblxuICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlTWljKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXVkaW86IHtcbiAgICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRBdWRpb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKHRyYWNrRGV2aWNlSWQpKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgb3B1c1N0ZXJlbyxcbiAgICAgICAgICAgICAgb3B1c0R0eCxcbiAgICAgICAgICAgICAgb3B1c0ZlYyxcbiAgICAgICAgICAgICAgb3B1c1B0aW1lLFxuICAgICAgICAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgICAgeyBzb3VyY2U6ICdtaWMnIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwcm9kdWNlckFjdGlvbnMuYWRkUHJvZHVjZXIoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgaWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkLFxuICAgICAgICAvLyAgICAgc291cmNlOiAnbWljJyxcbiAgICAgICAgLy8gICAgIHBhdXNlZDogdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkLFxuICAgICAgICAvLyAgICAgdHJhY2s6IHRoaXMuX21pY1Byb2R1Y2VyLnRyYWNrLFxuICAgICAgICAvLyAgICAgcnRwUGFyYW1ldGVyczogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycyxcbiAgICAgICAgLy8gICAgIGNvZGVjOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLmNvZGVjc1swXS5taW1lVHlwZS5zcGxpdCgnLycpWzFdXG4gICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZURpc2Nvbm5lY3RlZCcsXG4gICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNaWNyb3Bob25lIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZU1pYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci52b2x1bWUgPSAwO1xuXG4gICAgICAgIC8vIHRoaXMuY29ubmVjdExvY2FsSGFyayh0cmFjayk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fbWljUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgW2hhcmtUcmFja10gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cbiAgICAgICAgICBoYXJrVHJhY2sgJiYgYXdhaXQgaGFya1RyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1cGRhdGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gICB7XG4gICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIG1pY3JvcGhvbmUnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyB1cGRhdGVXZWJjYW0oe1xuICAgIGluaXQgPSBmYWxzZSxcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSxcbiAgICBuZXdEZXZpY2VJZCA9IG51bGwsXG4gICAgbmV3UmVzb2x1dGlvbiA9IG51bGwsXG4gICAgbmV3RnJhbWVSYXRlID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVXZWJjYW0oKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiLCBuZXdSZXNvbHV0aW9uOlwiJXNcIiwgbmV3RnJhbWVSYXRlOlwiJXNcIl0nLFxuICAgICAgc3RhcnQsXG4gICAgICByZXN0YXJ0LFxuICAgICAgbmV3RGV2aWNlSWQsXG4gICAgICBuZXdSZXNvbHV0aW9uLFxuICAgICAgbmV3RnJhbWVSYXRlXG4gICAgKTtcblxuICAgIGxldCB0cmFjaztcblxuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIHZpZGVvJyk7XG5cbiAgICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gICAgICAvLyBpZiAobmV3RGV2aWNlSWQpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBpZiAobmV3UmVzb2x1dGlvbilcbiAgICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvUmVzb2x1dGlvbihuZXdSZXNvbHV0aW9uKSk7XG5cbiAgICAgIC8vIGlmIChuZXdGcmFtZVJhdGUpXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb0ZyYW1lUmF0ZShuZXdGcmFtZVJhdGUpKTtcblxuICAgICAgY29uc3QgIHZpZGVvTXV0ZWQgID0gZmFsc2VcblxuICAgICAgaWYgKGluaXQgJiYgdmlkZW9NdXRlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgLy8gZWxzZVxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZChmYWxzZSkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX3dlYmNhbXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gICAgICBjb25zdCAgcmVzb2x1dGlvbiA9ICdtZWRpdW0nXG4gICAgICBjb25zdCBmcmFtZVJhdGUgPSAxNVxuXG5cblxuICAgICAgaWYgKFxuICAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgICAgICAgc3RhcnRcbiAgICAgICkge1xuICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmlkZW86XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICAgICAgLmNvZGVjc1xuICAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAgICAgICAgIGVsc2UgaWYgKHNpbXVsY2FzdEVuY29kaW5ncylcbiAgICAgICAgICAgIGVuY29kaW5ncyA9IHNpbXVsY2FzdEVuY29kaW5ncztcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgICAgICAgICAgIHRyYWNrLFxuICAgICAgICAgICAgYXBwRGF0YTpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuXG4gICAgICAgIGNvbnN0IHdlYkNhbVN0cmVhbSA9IG5ldyBTdHJlYW0oKVxuICAgICAgICB3ZWJDYW1TdHJlYW0uc2V0UHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIHRoaXMub25DYW1Qcm9kdWNpbmcubmV4dCh3ZWJDYW1TdHJlYW0pXG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgIC8vICAge1xuICAgICAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICB7XG4gICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgICAgIC8vICAgICB9KVxuICAgICAgLy8gICB9KSk7XG5cbiAgICAgIGlmICh0cmFjaylcbiAgICAgICAgdHJhY2suc3RvcCgpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnY2xvc2VNZWV0aW5nKCknKTtcblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAnbW9kaWZ5UGVlckNvbnN1bWVyKCkgW3BlZXJJZDpcIiVzXCIsIHR5cGU6XCIlc1wiXScsXG4gICAgICBwZWVySWQsXG4gICAgICB0eXBlXG4gICAgKTtcblxuICAgIC8vIGlmICh0eXBlID09PSAnbWljJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChjb25zdCBjb25zdW1lciBvZiB0aGlzLl9jb25zdW1lcnMudmFsdWVzKCkpIHtcbiAgICAgICAgaWYgKGNvbnN1bWVyLmFwcERhdGEucGVlcklkID09PSBwZWVySWQgJiYgY29uc3VtZXIuYXBwRGF0YS5zb3VyY2UgPT09IHR5cGUpIHtcbiAgICAgICAgICBpZiAobXV0ZSlcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gICAgLy8gZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncGF1c2VDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnBhdXNlKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQYXVzZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdyZXN1bWVDb25zdW1lcicsIHsgY29uc3VtZXJJZDogY29uc3VtZXIuaWQgfSk7XG5cbiAgICAgIGNvbnN1bWVyLnJlc3VtZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG4gIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuXG5cbiAgICB0aGlzLl9yb29tSWQgPSByb29tSWQ7XG5cblxuICAgIC8vIGluaXRpYWxpemUgc2lnbmFsaW5nIHNvY2tldFxuICAgIC8vIGxpc3RlbiB0byBzb2NrZXQgZXZlbnRzXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLmluaXQocm9vbUlkLCB0aGlzLl9wZWVySWQpXG4gICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25EaXNjb25uZWN0ZWQuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuICAgICAgLy8gdGhpcy5jbG9zZVxuICAgIH0pKVxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vblJlY29ubmVjdGluZy5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG5cblxuXG5cblx0XHRcdGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9taWNQcm9kdWNlcilcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIuY2xvc2UoKTtcblxuXHRcdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdFx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cblx0XHRcdGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cdFx0XHR9XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsZWFyUGVlcnMoKTtcblxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RpbmcnKSk7XG4gICAgfSkpXG5cbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMucHVzaCh0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25OZXdDb25zdW1lci5waXBlKHN3aXRjaE1hcChhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwZWVySWQsXG4gICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgIGlkLFxuICAgICAgICBraW5kLFxuICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhcHBEYXRhLFxuICAgICAgICBwcm9kdWNlclBhdXNlZFxuICAgICAgfSA9IGRhdGE7XG5cbiAgICAgIGNvbnN0IGNvbnN1bWVyICA9IGF3YWl0IHRoaXMuX3JlY3ZUcmFuc3BvcnQuY29uc3VtZShcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgIGFwcERhdGEgOiB7IC4uLmFwcERhdGEsIHBlZXJJZCB9IC8vIFRyaWNrLlxuICAgICAgICB9KSBhcyBtZWRpYXNvdXBDbGllbnQudHlwZXMuQ29uc3VtZXI7XG5cbiAgICAgIC8vIFN0b3JlIGluIHRoZSBtYXAuXG4gICAgICB0aGlzLl9jb25zdW1lcnMuc2V0KGNvbnN1bWVyLmlkLCBjb25zdW1lcik7XG5cbiAgICAgIGNvbnN1bWVyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+XG4gICAgICB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXIuaWQpO1xuICAgICAgfSk7XG5cblxuXG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld0NvbnN1bWVyKGNvbnN1bWVyLCAgcGVlcklkLCB0eXBlLCBwcm9kdWNlclBhdXNlZCk7XG5cbiAgICAgIC8vIFdlIGFyZSByZWFkeS4gQW5zd2VyIHRoZSByZXF1ZXN0IHNvIHRoZSBzZXJ2ZXIgd2lsbFxuICAgICAgLy8gcmVzdW1lIHRoaXMgQ29uc3VtZXIgKHdoaWNoIHdhcyBwYXVzZWQgZm9yIG5vdykuXG5cblxuICAgICAgLy8gaWYgKGtpbmQgPT09ICdhdWRpbycpXG4gICAgICAvLyB7XG4gICAgICAvLyAgIGNvbnN1bWVyLnZvbHVtZSA9IDA7XG5cbiAgICAgIC8vICAgY29uc3Qgc3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgIC8vICAgc3RyZWFtLmFkZFRyYWNrKGNvbnN1bWVyLnRyYWNrKTtcblxuICAgICAgLy8gICBpZiAoIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKVxuICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcigncmVxdWVzdC5uZXdDb25zdW1lciB8IGdpdmVuIHN0cmVhbSBoYXMgbm8gYXVkaW8gdHJhY2snKTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrID0gaGFyayhzdHJlYW0sIHsgcGxheTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gICB2b2x1bWUgPSBNYXRoLnJvdW5kKHZvbHVtZSk7XG5cbiAgICAgICAgLy8gICBpZiAoY29uc3VtZXIgJiYgdm9sdW1lICE9PSBjb25zdW1lci52b2x1bWUpXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgY29uc3VtZXIudm9sdW1lID0gdm9sdW1lO1xuXG4gICAgICAgIC8vICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHBlZXJJZCwgdm9sdW1lKSk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAgIC8vIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKSlcblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5wdXNoKHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbk5vdGlmaWNhdGlvbi5waXBlKHN3aXRjaE1hcChhc3luYyAobm90aWZpY2F0aW9uKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICAgJ3NvY2tldCBcIm5vdGlmaWNhdGlvblwiIGV2ZW50IFttZXRob2Q6XCIlc1wiLCBkYXRhOlwiJW9cIl0nLFxuICAgICAgICBub3RpZmljYXRpb24ubWV0aG9kLCBub3RpZmljYXRpb24uZGF0YSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHN3aXRjaCAobm90aWZpY2F0aW9uLm1ldGhvZCkge1xuXG5cblxuICAgICAgICAgIGNhc2UgJ3Byb2R1Y2VyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IHByb2R1Y2VySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJTY29yZShwcm9kdWNlcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnbmV3UGVlcic6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocGVlckFjdGlvbnMuYWRkUGVlcihcbiAgICAgICAgICAgICAgLy8gICB7IGlkLCBkaXNwbGF5TmFtZSwgcGljdHVyZSwgcm9sZXMsIGNvbnN1bWVyczogW10gfSkpO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld1BlZXIoaWQpO1xuXG4gICAgICAgICAgICAgIC8vIHRoaXMuX3NvdW5kTm90aWZpY2F0aW9uKCk7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgICAgIC8vICAgICAgIGlkOiAncm9vbS5uZXdQZWVyJyxcbiAgICAgICAgICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICd7ZGlzcGxheU5hbWV9IGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgICAgICAgICAgLy8gICAgIH0sIHtcbiAgICAgICAgICAgICAgLy8gICAgICAgZGlzcGxheU5hbWVcbiAgICAgICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgICAgIC8vICAgfSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAncGVlckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbG9zZVBlZXIocGVlcklkKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBwZWVyQWN0aW9ucy5yZW1vdmVQZWVyKHBlZXJJZCkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJDbG9zZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICBjb25zdW1lci5jbG9zZSgpO1xuXG4gICAgICAgICAgICAgIGlmIChjb25zdW1lci5oYXJrICE9IG51bGwpXG4gICAgICAgICAgICAgICAgY29uc3VtZXIuaGFyay5zdG9wKCk7XG5cbiAgICAgICAgICAgICAgdGhpcy5fY29uc3VtZXJzLmRlbGV0ZShjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBjb25zdCB7IHBlZXJJZCB9ID0gY29uc3VtZXIuYXBwRGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMucmVtb3ZlQ29uc3VtZXIoY29uc3VtZXJJZCwgcGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclBhdXNlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJSZXN1bWVkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUmVzdW1lZChjb25zdW1lcklkLCAncmVtb3RlJykpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgY2FzZSAnY29uc3VtZXJMYXllcnNDaGFuZ2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5vbkNvbnN1bWVyTGF5ZXJDaGFuZ2VkKGNvbnN1bWVySWQpXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lckN1cnJlbnRMYXllcnMoXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclNjb3JlJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkLCBzY29yZSB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyU2NvcmUoY29uc3VtZXJJZCwgc2NvcmUpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgJ3Jvb21CYWNrJzpcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNhc2UgJ3Jvb21SZWFkeSc6XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0dXJuU2VydmVycyB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3R1cm5TZXJ2ZXJzID0gdHVyblNlcnZlcnM7XG5cbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnRvZ2dsZUpvaW5lZCgpKTtcbiAgICAgICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJvb21BY3Rpb25zLnNldEluTG9iYnkoZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIC8vIHRoaXMubG9nZ2VyLmVycm9yKFxuICAgICAgICAgICAgICAvLyAgICd1bmtub3duIG5vdGlmaWNhdGlvbi5tZXRob2QgXCIlc1wiJywgbm90aWZpY2F0aW9uLm1ldGhvZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZ2dlci5lcnJvcignZXJyb3Igb24gc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgIC8vICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAgICAgICAvLyAgICAgICBpZDogJ3NvY2tldC5yZXF1ZXN0RXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0Vycm9yIG9uIHNlcnZlciByZXF1ZXN0J1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG5cbiAgICB9KSkuc3Vic2NyaWJlKCkpXG4gICAgLy8gb24gcm9vbSByZWFkeSBqb2luIHJvb20gX2pvaW5Sb29tXG5cbiAgICAvLyB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgLy8gY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAvLyAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgLy8gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgIC8vICAgLmZpbHRlcigoZXh0KSA9PiBleHQudXJpICE9PSAndXJuOjNncHA6dmlkZW8tb3JpZW50YXRpb24nKTtcblxuICAgIC8vIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgLy8gY3JlYXRlIHNlbmQgdHJhbnNwb3J0IGNyZWF0ZVdlYlJ0Y1RyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9ydFxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBjcmVhdGUgcmVjZWl2ZSB0cmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvclxuICAgIC8vIGxpc3RlbiB0byB0cmFuc3BvcnQgZXZlbnRzXG5cbiAgICAvLyBzZW5kIGpvaW4gcmVxdWVzdFxuXG4gICAgLy8gYWRkIHBlZXJzIHRvIHBlZXJzIHNlcnZpY2VcblxuICAgIC8vIHByb2R1Y2UgdXBkYXRlV2ViY2FtIHVwZGF0ZU1pY1xuICB9XG5cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9EZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb0RldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9pbnB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9EZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9EZXZpY2VzKHRoaXMuX2F1ZGlvRGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb0RldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlV2ViY2FtcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fd2ViY2FtcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ3ZpZGVvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX3dlYmNhbXNbZGV2aWNlLmRldmljZUlkXSA9IGRldmljZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHQvLyBcdG1lQWN0aW9ucy5zZXRXZWJjYW1EZXZpY2VzKHRoaXMuX3dlYmNhbXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlV2ViY2FtcygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIGRpc2FibGVXZWJjYW0oKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ2Rpc2FibGVXZWJjYW0oKScpO1xuXG5cdFx0aWYgKCF0aGlzLl93ZWJjYW1Qcm9kdWNlcilcblx0XHRcdHJldHVybjtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcblx0XHQvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZCh0cnVlKSk7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcblx0fVxuXHRhc3luYyBkaXNhYmxlTWljKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlTWljKCknKTtcblxuXHRcdGlmICghdGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHQvLyBcdHByb2R1Y2VyQWN0aW9ucy5yZW1vdmVQcm9kdWNlcih0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0YXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuXHRcdFx0XHQnY2xvc2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignZGlzYWJsZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblxuXHRcdHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG5cblx0YXN5bmMgX2dldFdlYmNhbURldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRXZWJjYW1EZXZpY2VJZCgpIHwgY2FsbGluZyBfdXBkYXRlV2ViY2FtcygpJyk7XG5cblx0XHRcdGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcblxuXHRcdFx0Y29uc3QgIHNlbGVjdGVkV2ViY2FtID0gIG51bGxcblxuXHRcdFx0aWYgKHNlbGVjdGVkV2ViY2FtICYmIHRoaXMuX3dlYmNhbXNbc2VsZWN0ZWRXZWJjYW1dKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRXZWJjYW07XG5cdFx0XHRlbHNlXG5cdFx0XHR7XG5cdFx0XHRcdGNvbnN0IHdlYmNhbXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX3dlYmNhbXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIHdlYmNhbXNbMF0gPyB3ZWJjYW1zWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRBdWRpb0RldmljZUlkKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0QXVkaW9EZXZpY2VJZCgpJyk7XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZUF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcblxuICAgICAgY29uc3QgIHNlbGVjdGVkQXVkaW9EZXZpY2UgPSBudWxsO1xuXG5cdFx0XHRpZiAoc2VsZWN0ZWRBdWRpb0RldmljZSAmJiB0aGlzLl9hdWRpb0RldmljZXNbc2VsZWN0ZWRBdWRpb0RldmljZV0pXG5cdFx0XHRcdHJldHVybiBzZWxlY3RlZEF1ZGlvRGV2aWNlO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCBhdWRpb0RldmljZXMgPSBPYmplY3QudmFsdWVzKHRoaXMuX2F1ZGlvRGV2aWNlcyk7XG5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuXHRcdFx0XHRyZXR1cm4gYXVkaW9EZXZpY2VzWzBdID8gYXVkaW9EZXZpY2VzWzBdLmRldmljZUlkIDogbnVsbDtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfZ2V0QXVkaW9EZXZpY2VJZCgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXHRcdH1cblx0fVxuXG5cdGFzeW5jIF91cGRhdGVBdWRpb091dHB1dERldmljZXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKScpO1xuXG5cdFx0Ly8gUmVzZXQgdGhlIGxpc3QuXG5cdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cblx0XHR0cnlcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICdhdWRpb291dHB1dCcpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cblx0XHRcdFx0dGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXREZXZpY2VzKHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcykpO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXG5cbiAgYXN5bmMgX2pvaW5Sb29tKHsgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdfam9pblJvb20oKScpO1xuXG4gICAgY29uc3QgZGlzcGxheU5hbWUgPSBgR3Vlc3QgJHtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoMTAwMDAwIC0gMTAwMDApKSArIDEwMDAwfWBcblxuXG4gICAgdHJ5IHtcblxuXG4gICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UgPSBuZXcgbWVkaWFzb3VwQ2xpZW50LkRldmljZSgpO1xuXG4gICAgICBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ2dldFJvdXRlclJ0cENhcGFiaWxpdGllcycpO1xuXG4gICAgICByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgICAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX21lZGlhc291cERldmljZS5sb2FkKHsgcm91dGVyUnRwQ2FwYWJpbGl0aWVzIH0pO1xuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICAgIHByb2R1Y2luZzogdHJ1ZSxcbiAgICAgICAgICAgIGNvbnN1bWluZzogZmFsc2VcbiAgICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgaWQsXG4gICAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzXG4gICAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlU2VuZFRyYW5zcG9ydChcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZCxcbiAgICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAgIC8vIFRPRE86IEZpeCBmb3IgaXNzdWUgIzcyXG4gICAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgcHJvcHJpZXRhcnlDb25zdHJhaW50czogUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFNcbiAgICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0Lm9uKFxuICAgICAgICAgICdwcm9kdWNlJywgYXN5bmMgKHsga2luZCwgcnRwUGFyYW1ldGVycywgYXBwRGF0YSB9LCBjYWxsYmFjaywgZXJyYmFjaykgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tc2hhZG93XG4gICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgICAgICdwcm9kdWNlJyxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgICAgIGtpbmQsXG4gICAgICAgICAgICAgICAgcnRwUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICBhcHBEYXRhXG4gICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjYWxsYmFjayh7IGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGVycmJhY2soZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHRyYW5zcG9ydEluZm8gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdjcmVhdGVXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICB7XG4gICAgICAgICAgZm9yY2VUY3A6IHRoaXMuX2ZvcmNlVGNwLFxuICAgICAgICAgIHByb2R1Y2luZzogZmFsc2UsXG4gICAgICAgICAgY29uc3VtaW5nOiB0cnVlXG4gICAgICAgIH0pO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGlkLFxuICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICBpY2VDYW5kaWRhdGVzLFxuICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgfSA9IHRyYW5zcG9ydEluZm87XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY3JlYXRlUmVjdlRyYW5zcG9ydChcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVycyxcbiAgICAgICAgICBpY2VTZXJ2ZXJzOiB0aGlzLl90dXJuU2VydmVycyxcbiAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgIGljZVRyYW5zcG9ydFBvbGljeTogdGhpcy5fZGV2aWNlLmZsYWcgPT09ICdmaXJlZm94JyAmJiB0aGlzLl90dXJuU2VydmVycyA/ICdyZWxheScgOiB1bmRlZmluZWRcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQub24oXG4gICAgICAgICdjb25uZWN0JywgKHsgZHRsc1BhcmFtZXRlcnMgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tc2hhZG93XG4gICAgICB7XG4gICAgICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY29ubmVjdFdlYlJ0Y1RyYW5zcG9ydCcsXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQsXG4gICAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oY2FsbGJhY2spXG4gICAgICAgICAgLmNhdGNoKGVycmJhY2spO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNldCBvdXIgbWVkaWEgY2FwYWJpbGl0aWVzLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldE1lZGlhQ2FwYWJpbGl0aWVzKFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0Y2FuU2VuZE1pYyAgICAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TZW5kV2ViY2FtICA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlU2NyZWVuIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ3ZpZGVvJykgJiZcbiAgICAgIC8vIFx0XHRcdHRoaXMuX3NjcmVlblNoYXJpbmcuaXNTY3JlZW5TaGFyZUF2YWlsYWJsZSgpLFxuICAgICAgLy8gXHRcdGNhblNoYXJlRmlsZXMgOiB0aGlzLl90b3JyZW50U3VwcG9ydFxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIGNvbnN0IHtcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHBlZXJzLFxuICAgICAgICB0cmFja2VyLFxuICAgICAgICByb29tUGVybWlzc2lvbnMsXG4gICAgICAgIHVzZXJSb2xlcyxcbiAgICAgICAgYWxsb3dXaGVuUm9sZU1pc3NpbmcsXG4gICAgICAgIGNoYXRIaXN0b3J5LFxuICAgICAgICBmaWxlSGlzdG9yeSxcbiAgICAgICAgbGFzdE5IaXN0b3J5LFxuICAgICAgICBsb2NrZWQsXG4gICAgICAgIGxvYmJ5UGVlcnMsXG4gICAgICAgIGFjY2Vzc0NvZGVcbiAgICAgIH0gPSBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICdqb2luJyxcbiAgICAgICAge1xuICAgICAgICAgIGRpc3BsYXlOYW1lOiBkaXNwbGF5TmFtZSxcblxuICAgICAgICAgIHJ0cENhcGFiaWxpdGllczogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLnJ0cENhcGFiaWxpdGllc1xuICAgICAgICB9KTtcblxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAgICdfam9pblJvb20oKSBqb2luZWQgW2F1dGhlbnRpY2F0ZWQ6XCIlc1wiLCBwZWVyczpcIiVvXCIsIHJvbGVzOlwiJW9cIiwgdXNlclJvbGVzOlwiJW9cIl0nLFxuICAgICAgICBhdXRoZW50aWNhdGVkLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgcm9sZXMsXG4gICAgICAgIHVzZXJSb2xlc1xuICAgICAgKTtcblxuXG5cblxuXG4gICAgICAvLyBmb3IgKGNvbnN0IHBlZXIgb2YgcGVlcnMpXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHBlZXJBY3Rpb25zLmFkZFBlZXIoeyAuLi5wZWVyLCBjb25zdW1lcnM6IFtdIH0pKTtcbiAgICAgIC8vIH1cblxuICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1Zygnam9pbiBhdWRpbycsam9pbkF1ZGlvICwgJ2NhbiBwcm9kdWNlIGF1ZGlvJyxcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSwgJyB0aGlzLl9tdXRlZCcsIHRoaXMuX211dGVkKVxuICAgICAgLy8gRG9uJ3QgcHJvZHVjZSBpZiBleHBsaWNpdGx5IHJlcXVlc3RlZCB0byBub3QgdG8gZG8gaXQuXG4gICAgICBpZiAodGhpcy5fcHJvZHVjZSkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgam9pblZpZGVvXG4gICAgICAgICkge1xuICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgaW5pdDogdHJ1ZSwgc3RhcnQ6IHRydWUgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5BdWRpbyAmJlxuICAgICAgICAgIHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpXG4gICAgICAgIClcbiAgICAgICAgICBpZiAoIXRoaXMuX211dGVkKSB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb091dHB1dERldmljZXMoKTtcblxuICAgICAgLy8gY29uc3QgIHNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgID0gbnVsbFxuXG4gICAgICAvLyBpZiAoIXNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UgJiYgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzICE9PSB7fSlcbiAgICAgIC8vIHtcbiAgICAgIC8vIFx0c3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyBcdFx0c2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoXG4gICAgICAvLyBcdFx0XHRPYmplY3Qua2V5cyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpWzBdXG4gICAgICAvLyBcdFx0KVxuICAgICAgLy8gXHQpO1xuICAgICAgLy8gfVxuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nvbm5lY3RlZCcpKTtcblxuICAgICAgLy8gLy8gQ2xlYW4gYWxsIHRoZSBleGlzdGluZyBub3RpZmljYXRpb25zLlxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobm90aWZpY2F0aW9uQWN0aW9ucy5yZW1vdmVBbGxOb3RpZmljYXRpb25zKCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyBcdHtcbiAgICAgIC8vIFx0XHR0ZXh0IDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vIFx0XHRcdGlkICAgICAgICAgICAgIDogJ3Jvb20uam9pbmVkJyxcbiAgICAgIC8vIFx0XHRcdGRlZmF1bHRNZXNzYWdlIDogJ1lvdSBoYXZlIGpvaW5lZCB0aGUgcm9vbSdcbiAgICAgIC8vIFx0XHR9KVxuICAgICAgLy8gXHR9KSk7XG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmFkZFBlZXJzKHBlZXJzKTtcblxuXG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19qb2luUm9vbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG5cbiAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICB9XG4gIH1cbiAgZGV2aWNlSW5mbygpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgY29uc3QgYnJvd3NlciA9IGJvd3Nlci5nZXRQYXJzZXIodWEpO1xuXG4gICAgbGV0IGZsYWc7XG5cbiAgICBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBjaHJvbWU6ICc+PTAnLCBjaHJvbWl1bTogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2Nocm9tZSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBmaXJlZm94OiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZmlyZWZveCc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyBzYWZhcmk6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdzYWZhcmknO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgb3BlcmE6ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdvcGVyYSc7XG4gICAgZWxzZSBpZiAoYnJvd3Nlci5zYXRpc2ZpZXMoeyAnbWljcm9zb2Z0IGVkZ2UnOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnZWRnZSc7XG4gICAgZWxzZVxuICAgICAgZmxhZyA9ICd1bmtub3duJztcblxuICAgIHJldHVybiB7XG4gICAgICBmbGFnLFxuICAgICAgb3M6IGJyb3dzZXIuZ2V0T1NOYW1lKHRydWUpLCAvLyBpb3MsIGFuZHJvaWQsIGxpbnV4Li4uXG4gICAgICBwbGF0Zm9ybTogYnJvd3Nlci5nZXRQbGF0Zm9ybVR5cGUodHJ1ZSksIC8vIG1vYmlsZSwgZGVza3RvcCwgdGFibGV0XG4gICAgICBuYW1lOiBicm93c2VyLmdldEJyb3dzZXJOYW1lKHRydWUpLFxuICAgICAgdmVyc2lvbjogYnJvd3Nlci5nZXRCcm93c2VyVmVyc2lvbigpLFxuICAgICAgYm93c2VyOiBicm93c2VyXG4gICAgfTtcblxuICB9XG59XG4iXX0=
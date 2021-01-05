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
        this.onCamProducing = new Subject();
    }
    init({ peerId = null, produce = true, forceTcp = false, muted = false } = {}) {
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
    }
    close() {
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
            this.signalingService.onDisconnected.subscribe(() => {
                // close
                // this.close
            });
            this.signalingService.onReconnecting.subscribe(() => {
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
            });
            this.signalingService.onNewConsumer.pipe(switchMap((data) => __awaiter(this, void 0, void 0, function* () {
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
            }))).subscribe();
            this.signalingService.onNotification.pipe(switchMap((notification) => __awaiter(this, void 0, void 0, function* () {
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
            }))).subscribe();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUtsQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRTNDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFFNUIsT0FBTyxLQUFLLGVBQWUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDOzs7OztBQUcvQixJQUFJLE1BQU0sQ0FBQztBQUdYLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQTtBQUNmLE1BQU0sV0FBVyxHQUFHLENBQUMsQ0FBQTtBQUNyQixNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtBQUU5QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDdkIsTUFBTyxrQkFBa0IsR0FBSztJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtJQUM1QixFQUFFLHFCQUFxQixFQUFFLENBQUMsRUFBRTtDQUM3QixDQUFBO0FBR0QsTUFBTSxnQkFBZ0IsR0FDdEI7SUFDQyxLQUFLLEVBQ0w7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxRQUFRLEVBQ1I7UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO1FBQzVCLFdBQVcsRUFBRyxnQkFBZ0I7S0FDOUI7SUFDRCxNQUFNLEVBQ047UUFDQyxLQUFLLEVBQVMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdC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WUFDSixFQUFFLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDM0IsUUFBUSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLElBQUksRUFBRSxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQztZQUNsQyxPQUFPLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixFQUFFO1lBQ3BDLE1BQU0sRUFBRSxPQUFPO1NBQ2hCLENBQUM7SUFFSixDQUFDOztzRUF6cURXLFdBQVc7bURBQVgsV0FBVyxXQUFYLFdBQVcsbUJBRlgsTUFBTTtrREFFTixXQUFXO2NBSHhCLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0cmVhbSB9IGZyb20gJy4vc3RyZWFtJztcbmltcG9ydCB7IFJlbW90ZVBlZXJzU2VydmljZSB9IGZyb20gJy4vcmVtb3RlLXBlZXJzLnNlcnZpY2UnO1xuaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgU2lnbmFsaW5nU2VydmljZSB9IGZyb20gJy4vc2lnbmFsaW5nLnNlcnZpY2UnO1xuXG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmltcG9ydCB7IHN3aXRjaE1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBib3dzZXIgZnJvbSAnYm93c2VyJztcblxuaW1wb3J0ICogYXMgbWVkaWFzb3VwQ2xpZW50IGZyb20gJ21lZGlhc291cC1jbGllbnQnXG5pbXBvcnQgeyBTdWJqZWN0IH0gZnJvbSAncnhqcyc7XG5cblxubGV0IHNhdmVBcztcblxuXG5jb25zdCBsYXN0TiA9IDRcbmNvbnN0IG1vYmlsZUxhc3ROID0gMVxuY29uc3QgdmlkZW9Bc3BlY3RSYXRpbyA9IDEuNzc3XG5cbmNvbnN0IHNpbXVsY2FzdCA9IHRydWU7XG5jb25zdCBcdHNpbXVsY2FzdEVuY29kaW5ncyAgID0gW1xuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMiB9LFxuICB7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSB9XG5dXG5cblxuY29uc3QgVklERU9fQ09OU1RSQUlOUyA9XG57XG5cdCdsb3cnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdtZWRpdW0nIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogNjQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCdoaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDEyODAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3ZlcnloaWdoJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDE5MjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J3VsdHJhJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDM4NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fVxufTtcblxuY29uc3QgUENfUFJPUFJJRVRBUllfQ09OU1RSQUlOVFMgPVxue1xuXHRvcHRpb25hbCA6IFsgeyBnb29nRHNjcDogdHJ1ZSB9IF1cbn07XG5cbmNvbnN0IFZJREVPX1NJTVVMQ0FTVF9FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogNCwgbWF4Qml0UmF0ZTogMTAwMDAwIH0sXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiAxLCBtYXhCaXRSYXRlOiAxMjAwMDAwIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSB3ZWJjYW0gdmlkZW8uXG5jb25zdCBWSURFT19LU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUM19LRVknIH1cbl07XG5cbi8vIFVzZWQgZm9yIFZQOSBkZXNrdG9wIHNoYXJpbmcuXG5jb25zdCBWSURFT19TVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzJywgZHR4OiB0cnVlIH1cbl07XG5cblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgIGNsYXNzIFJvb21TZXJ2aWNlIHtcblxuXG5cbiAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICBfc2VuZFRyYW5zcG9ydCA9IG51bGw7XG4gIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICBfcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgX2Nsb3NlZCA9IGZhbHNlO1xuXG4gIF9wcm9kdWNlID0gdHJ1ZTtcblxuICBfZm9yY2VUY3AgPSBmYWxzZTtcblxuICBfbXV0ZWRcbiAgX2RldmljZVxuICBfcGVlcklkXG4gIF9zb3VuZEFsZXJ0XG4gIF9yb29tSWRcbiAgX21lZGlhc291cERldmljZVxuXG4gIF9taWNQcm9kdWNlclxuICBfaGFya1xuICBfaGFya1N0cmVhbVxuICBfd2ViY2FtUHJvZHVjZXJcbiAgX2V4dHJhVmlkZW9Qcm9kdWNlcnNcbiAgX3dlYmNhbXNcbiAgX2F1ZGlvRGV2aWNlc1xuICBfYXVkaW9PdXRwdXREZXZpY2VzXG4gIF9jb25zdW1lcnNcbiAgX3VzZVNpbXVsY2FzdFxuICBfdHVyblNlcnZlcnNcblxuICBwdWJsaWMgb25DYW1Qcm9kdWNpbmc6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KCk7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHByaXZhdGUgc2lnbmFsaW5nU2VydmljZTogU2lnbmFsaW5nU2VydmljZSxcbiAgICBwcml2YXRlIGxvZ2dlcjogTG9nU2VydmljZSxcbiAgcHJpdmF0ZSByZW1vdGVQZWVyc1NlcnZpY2U6IFJlbW90ZVBlZXJzU2VydmljZSkge1xuXG5cbiAgfVxuXG4gIGluaXQoe1xuICAgIHBlZXJJZD1udWxsLFxuXG4gICAgcHJvZHVjZT10cnVlLFxuICAgIGZvcmNlVGNwPWZhbHNlLFxuICAgIG11dGVkPWZhbHNlXG4gIH0gPSB7fSkge1xuICAgIGlmICghcGVlcklkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHBlZXJJZCcpO1xuXG5cbiAgICAvLyBsb2dnZXIuZGVidWcoXG4gICAgLy8gICAnY29uc3RydWN0b3IoKSBbcGVlcklkOiBcIiVzXCIsIGRldmljZTogXCIlc1wiLCBwcm9kdWNlOiBcIiVzXCIsIGZvcmNlVGNwOiBcIiVzXCIsIGRpc3BsYXlOYW1lIFwiXCJdJyxcbiAgICAvLyAgIHBlZXJJZCwgZGV2aWNlLmZsYWcsIHByb2R1Y2UsIGZvcmNlVGNwKTtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgd2Ugc2hvdWxkIHByb2R1Y2UuXG4gICAgdGhpcy5fcHJvZHVjZSA9IHByb2R1Y2U7XG5cbiAgICAvLyBXaGV0aGVyIHdlIGZvcmNlIFRDUFxuICAgIHRoaXMuX2ZvcmNlVGNwID0gZm9yY2VUY3A7XG5cblxuXG5cbiAgICAvLyBXaGV0aGVyIHNpbXVsY2FzdCBzaG91bGQgYmUgdXNlZC5cbiAgICAvLyB0aGlzLl91c2VTaW11bGNhc3QgPSBmYWxzZTtcblxuICAgIC8vIGlmICgnc2ltdWxjYXN0JyBpbiB3aW5kb3cuY29uZmlnKVxuICAgIC8vICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gd2luZG93LmNvbmZpZy5zaW11bGNhc3Q7XG5cblxuXG5cblxuICAgIHRoaXMuX211dGVkID0gbXV0ZWQ7XG5cbiAgICAvLyBUaGlzIGRldmljZVxuICAgIHRoaXMuX2RldmljZSA9IHRoaXMuZGV2aWNlSW5mbygpO1xuXG4gICAgLy8gTXkgcGVlciBuYW1lLlxuICAgIHRoaXMuX3BlZXJJZCA9IHBlZXJJZDtcblxuXG5cbiAgICAvLyBBbGVydCBzb3VuZFxuICAgIC8vIHRoaXMuX3NvdW5kQWxlcnQgPSBuZXcgQXVkaW8oJy9zb3VuZHMvbm90aWZ5Lm1wMycpO1xuXG5cblxuXG4gICAgLy8gVGhlIHJvb20gSURcbiAgICB0aGlzLl9yb29tSWQgPSBudWxsO1xuXG4gICAgLy8gbWVkaWFzb3VwLWNsaWVudCBEZXZpY2UgaW5zdGFuY2UuXG4gICAgLy8gQHR5cGUge21lZGlhc291cENsaWVudC5EZXZpY2V9XG4gICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbnVsbDtcblxuXG4gICAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBoYXJrXG4gICAgdGhpcy5faGFyayA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBNZWRpYVN0cmVhbSBmb3IgaGFya1xuICAgIHRoaXMuX2hhcmtTdHJlYW0gPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgd2ViY2FtIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBFeHRyYSB2aWRlb3MgYmVpbmcgcHJvZHVjZWRcbiAgICB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gTWFwIG9mIHdlYmNhbSBNZWRpYURldmljZUluZm9zIGluZGV4ZWQgYnkgZGV2aWNlSWQuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIE1lZGlhRGV2aWNlSW5mb3M+fVxuICAgIHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cbiAgICAvLyBtZWRpYXNvdXAgQ29uc3VtZXJzLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBtZWRpYXNvdXBDbGllbnQuQ29uc3VtZXI+fVxuICAgIHRoaXMuX2NvbnN1bWVycyA9IG5ldyBNYXAoKTtcblxuICAgIHRoaXMuX3VzZVNpbXVsY2FzdCA9IHNpbXVsY2FzdFxuXG4gICAgLy8gdGhpcy5fc3RhcnRLZXlMaXN0ZW5lcigpO1xuXG4gICAgLy8gdGhpcy5fc3RhcnREZXZpY2VzTGlzdGVuZXIoKTtcblxuICB9XG4gIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLl9jbG9zZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlKCknKTtcblxuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5jbG9zZSgpO1xuXG4gICAgLy8gQ2xvc2UgbWVkaWFzb3VwIFRyYW5zcG9ydHMuXG4gICAgaWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpXG4gICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgICBpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcbiAgICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQuY2xvc2UoKTtcblxuXG4gIH1cblxuICAvLyBfc3RhcnRLZXlMaXN0ZW5lcigpIHtcbiAgLy8gICAvLyBBZGQga2V5ZG93biBldmVudCBsaXN0ZW5lciBvbiBkb2N1bWVudFxuICAvLyAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgLy8gICAgIGlmIChldmVudC5yZXBlYXQpIHJldHVybjtcbiAgLy8gICAgIGNvbnN0IGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpO1xuXG4gIC8vICAgICBjb25zdCBzb3VyY2UgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gICAgIGNvbnN0IGV4Y2x1ZGUgPSBbJ2lucHV0JywgJ3RleHRhcmVhJ107XG5cbiAgLy8gICAgIGlmIChleGNsdWRlLmluZGV4T2Yoc291cmNlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkgPT09IC0xKSB7XG4gIC8vICAgICAgIGxvZ2dlci5kZWJ1Zygna2V5RG93bigpIFtrZXk6XCIlc1wiXScsIGtleSk7XG5cbiAgLy8gICAgICAgc3dpdGNoIChrZXkpIHtcblxuICAvLyAgICAgICAgIC8qXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM3KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldFByZXZBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM5KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldE5leHRBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICAgICovXG5cblxuICAvLyAgICAgICAgIGNhc2UgJ00nOiAvLyBUb2dnbGUgbWljcm9waG9uZVxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgICAgICAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCkge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMudW5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VubXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVuYWJsZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFbmFibGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnVic6IC8vIFRvZ2dsZSB2aWRlb1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gIC8vICAgICAgICAgICAgIGVsc2VcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnSCc6IC8vIE9wZW4gaGVscCBkaWFsb2dcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SGVscE9wZW4odHJ1ZSkpO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgZGVmYXVsdDpcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcblxuXG4gIC8vIH1cblxuICBfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB7XG4gICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkgfCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLm9uZGV2aWNlY2hhbmdlJyk7XG5cbiAgICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuZGV2aWNlc0NoYW5nZWQnLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdZb3VyIGRldmljZXMgY2hhbmdlZCwgY29uZmlndXJlIHlvdXIgZGV2aWNlcyBpbiB0aGUgc2V0dGluZ3MgZGlhbG9nJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9KTtcbiAgfVxuXG5cblxuICBhc3luYyBtdXRlTWljKCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdtdXRlTWljKCknKTtcblxuICAgIHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAncGF1c2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJQYXVzZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKHRydWUpKTtcblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdtdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZUVycm9yJyxcbiAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIG11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB1bm11dGVNaWMoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ3VubXV0ZU1pYygpJyk7XG5cbiAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ3Jlc3VtZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgLy8gICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJSZXN1bWVkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgIC8vICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCd1bm11dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlRXJyb3InLFxuICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byB1bm11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgLy8gICB9KSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cblxuICBhc3luYyBjaGFuZ2VBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtkZXZpY2VJZDpcIiVzXCJdJywgZGV2aWNlSWQpO1xuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKHRydWUpKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RlZCBhdWRpbyBvdXRwdXQgZGV2aWNlIG5vIGxvbmdlciBhdmFpbGFibGUnKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpKTtcblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ2NoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICAvLyBPbmx5IEZpcmVmb3ggc3VwcG9ydHMgYXBwbHlDb25zdHJhaW50cyB0byBhdWRpbyB0cmFja3NcbiAgLy8gU2VlOlxuICAvLyBodHRwczovL2J1Z3MuY2hyb21pdW0ub3JnL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD03OTY5NjRcbiAgYXN5bmMgdXBkYXRlTWljKHtcbiAgICBzdGFydCA9IGZhbHNlLFxuICAgIHJlc3RhcnQgPSBmYWxzZSB8fCB0aGlzLl9kZXZpY2UuZmxhZyAhPT0gJ2ZpcmVmb3gnLFxuICAgIG5ld0RldmljZUlkID0gbnVsbFxuICB9ID0ge30pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhcbiAgICAgICd1cGRhdGVNaWMoKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiXScsXG4gICAgICBzdGFydCxcbiAgICAgIHJlc3RhcnQsXG4gICAgICBuZXdEZXZpY2VJZFxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSBhdWRpbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuICAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRBdWRpb0RldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlSWRdO1xuXG4gICAgICBpZiAoIWRldmljZSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBhdWRpbyBkZXZpY2VzJyk7XG5cbiAgICAgIGNvbnN0IGF1dG9HYWluQ29udHJvbCA9IGZhbHNlO1xuICAgICAgY29uc3QgZWNob0NhbmNlbGxhdGlvbiA9IHRydWVcbiAgICAgIGNvbnN0IG5vaXNlU3VwcHJlc3Npb24gPSB0cnVlXG5cbiAgICAgIC8vIGlmICghd2luZG93LmNvbmZpZy5jZW50cmFsQXVkaW9PcHRpb25zKSB7XG4gICAgICAvLyAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIC8vICAgICAnTWlzc2luZyBjZW50cmFsQXVkaW9PcHRpb25zIGZyb20gYXBwIGNvbmZpZyEgKFNlZSBpdCBpbiBleGFtcGxlIGNvbmZpZy4pJ1xuICAgICAgLy8gICApO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCB7XG4gICAgICAgIHNhbXBsZVJhdGUgPSA5NjAwMCxcbiAgICAgICAgY2hhbm5lbENvdW50ID0gMSxcbiAgICAgICAgdm9sdW1lID0gMS4wLFxuICAgICAgICBzYW1wbGVTaXplID0gMTYsXG4gICAgICAgIG9wdXNTdGVyZW8gPSBmYWxzZSxcbiAgICAgICAgb3B1c0R0eCA9IHRydWUsXG4gICAgICAgIG9wdXNGZWMgPSB0cnVlLFxuICAgICAgICBvcHVzUHRpbWUgPSAyMCxcbiAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZSA9IDk2MDAwXG4gICAgICB9ID0ge307XG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fbWljUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgLy8gdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZU1pYygpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF1ZGlvOiB7XG4gICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgICAgICAgdm9sdW1lLFxuICAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHJhY2ssXG4gICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG9wdXNTdGVyZW8sXG4gICAgICAgICAgICAgIG9wdXNEdHgsXG4gICAgICAgICAgICAgIG9wdXNGZWMsXG4gICAgICAgICAgICAgIG9wdXNQdGltZSxcbiAgICAgICAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICAgIHsgc291cmNlOiAnbWljJyB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAgICAgICAvLyAgIHtcbiAgICAgICAgLy8gICAgIGlkOiB0aGlzLl9taWNQcm9kdWNlci5pZCxcbiAgICAgICAgLy8gICAgIHNvdXJjZTogJ21pYycsXG4gICAgICAgIC8vICAgICBwYXVzZWQ6IHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCxcbiAgICAgICAgLy8gICAgIHRyYWNrOiB0aGlzLl9taWNQcm9kdWNlci50cmFjayxcbiAgICAgICAgLy8gICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gICAgICAgIC8vICAgICBjb2RlYzogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAgICAgICAvLyAgIH0pKTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgLy8gICB7XG4gICAgICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgICAgLy8gICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVEaXNjb25uZWN0ZWQnLFxuICAgICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTWljcm9waG9uZSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVNaWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIudm9sdW1lID0gMDtcblxuICAgICAgICAvLyB0aGlzLmNvbm5lY3RMb2NhbEhhcmsodHJhY2spO1xuICAgICAgfVxuICAgICAgZWxzZSBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX21pY1Byb2R1Y2VyKTtcblxuICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICB2b2x1bWUsXG4gICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAgICAgICAgIGNvbnN0IFtoYXJrVHJhY2tdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG4gICAgICAgICAgaGFya1RyYWNrICYmIGF3YWl0IGhhcmtUcmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gICAgICAgICAgICAgIHZvbHVtZSxcbiAgICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAgICAgICAgICAgICBzYW1wbGVTaXplXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcigndXBkYXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgIC8vICAge1xuICAgICAgLy8gICAgIHR5cGU6ICdlcnJvcicsXG4gICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgIC8vICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBtaWNyb3Bob25lJ1xuICAgICAgLy8gICAgIH0pXG4gICAgICAvLyAgIH0pKTtcblxuICAgICAgaWYgKHRyYWNrKVxuICAgICAgICB0cmFjay5zdG9wKCk7XG4gICAgfVxuXG4gICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICB9XG5cbiAgYXN5bmMgdXBkYXRlV2ViY2FtKHtcbiAgICBpbml0ID0gZmFsc2UsXG4gICAgc3RhcnQgPSBmYWxzZSxcbiAgICByZXN0YXJ0ID0gZmFsc2UsXG4gICAgbmV3RGV2aWNlSWQgPSBudWxsLFxuICAgIG5ld1Jlc29sdXRpb24gPSBudWxsLFxuICAgIG5ld0ZyYW1lUmF0ZSA9IG51bGxcbiAgfSA9IHt9KSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoXG4gICAgICAndXBkYXRlV2ViY2FtKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIiwgbmV3UmVzb2x1dGlvbjpcIiVzXCIsIG5ld0ZyYW1lUmF0ZTpcIiVzXCJdJyxcbiAgICAgIHN0YXJ0LFxuICAgICAgcmVzdGFydCxcbiAgICAgIG5ld0RldmljZUlkLFxuICAgICAgbmV3UmVzb2x1dGlvbixcbiAgICAgIG5ld0ZyYW1lUmF0ZVxuICAgICk7XG5cbiAgICBsZXQgdHJhY2s7XG5cbiAgICB0cnkge1xuICAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSB2aWRlbycpO1xuXG4gICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAgICAgLy8gaWYgKG5ld0RldmljZUlkKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAgICAgLy8gaWYgKG5ld1Jlc29sdXRpb24pXG4gICAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb1Jlc29sdXRpb24obmV3UmVzb2x1dGlvbikpO1xuXG4gICAgICAvLyBpZiAobmV3RnJhbWVSYXRlKVxuICAgICAgLy8gICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9GcmFtZVJhdGUobmV3RnJhbWVSYXRlKSk7XG5cbiAgICAgIGNvbnN0ICB2aWRlb011dGVkICA9IGZhbHNlXG5cbiAgICAgIGlmIChpbml0ICYmIHZpZGVvTXV0ZWQpXG4gICAgICAgIHJldHVybjtcbiAgICAgIC8vIGVsc2VcbiAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQoZmFsc2UpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldFdlYmNhbURldmljZUlkKCk7XG4gICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl93ZWJjYW1zW2RldmljZUlkXTtcblxuICAgICAgaWYgKCFkZXZpY2UpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2ViY2FtIGRldmljZXMnKTtcblxuICAgICAgY29uc3QgIHJlc29sdXRpb24gPSAnbWVkaXVtJ1xuICAgICAgY29uc3QgZnJhbWVSYXRlID0gMTVcblxuXG5cbiAgICAgIGlmIChcbiAgICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fd2ViY2FtUHJvZHVjZXIpIHx8XG4gICAgICAgIHN0YXJ0XG4gICAgICApIHtcbiAgICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuXG4gICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZpZGVvOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKSk7XG5cbiAgICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gICAgICAgIGlmICh0aGlzLl91c2VTaW11bGNhc3QpIHtcbiAgICAgICAgICAvLyBJZiBWUDkgaXMgdGhlIG9ubHkgYXZhaWxhYmxlIHZpZGVvIGNvZGVjIHRoZW4gdXNlIFNWQy5cbiAgICAgICAgICBjb25zdCBmaXJzdFZpZGVvQ29kZWMgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2VcbiAgICAgICAgICAgIC5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgICAgIC5jb2RlY3NcbiAgICAgICAgICAgIC5maW5kKChjKSA9PiBjLmtpbmQgPT09ICd2aWRlbycpO1xuXG4gICAgICAgICAgbGV0IGVuY29kaW5ncztcblxuICAgICAgICAgIGlmIChmaXJzdFZpZGVvQ29kZWMubWltZVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3ZpZGVvL3ZwOScpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19LU1ZDX0VOQ09ESU5HUztcbiAgICAgICAgICBlbHNlIGlmIChzaW11bGNhc3RFbmNvZGluZ3MpXG4gICAgICAgICAgICBlbmNvZGluZ3MgPSBzaW11bGNhc3RFbmNvZGluZ3M7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUztcblxuICAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgICAgZW5jb2RpbmdzLFxuICAgICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB2aWRlb0dvb2dsZVN0YXJ0Qml0cmF0ZTogMTAwMFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBhcHBEYXRhOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZSh7XG4gICAgICAgICAgICB0cmFjayxcbiAgICAgICAgICAgIGFwcERhdGE6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgICAgICAgLy8gICB7XG4gICAgICAgIC8vICAgICBpZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQsXG4gICAgICAgIC8vICAgICBzb3VyY2U6ICd3ZWJjYW0nLFxuICAgICAgICAvLyAgICAgcGF1c2VkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5wYXVzZWQsXG4gICAgICAgIC8vICAgICB0cmFjazogdGhpcy5fd2ViY2FtUHJvZHVjZXIudHJhY2ssXG4gICAgICAgIC8vICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAgICAgICAvLyAgICAgY29kZWM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgICAgICAgLy8gICB9KSk7XG5cblxuICAgICAgICBjb25zdCB3ZWJDYW1TdHJlYW0gPSBuZXcgU3RyZWFtKClcbiAgICAgICAgd2ViQ2FtU3RyZWFtLnNldFByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAgICAgICB0aGlzLm9uQ2FtUHJvZHVjaW5nLm5leHQod2ViQ2FtU3RyZWFtKVxuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+IHtcbiAgICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyLm9uKCd0cmFja2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgICAgICAgICAvLyAgIHtcbiAgICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRGlzY29ubmVjdGVkJyxcbiAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0NhbWVyYSBkaXNjb25uZWN0ZWQnXG4gICAgICAgICAgLy8gICAgIH0pXG4gICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBlbHNlIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcikge1xuICAgICAgICAoeyB0cmFjayB9ID0gdGhpcy5fd2ViY2FtUHJvZHVjZXIpO1xuXG4gICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gICAgICAgICAge1xuICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBbHNvIGNoYW5nZSByZXNvbHV0aW9uIG9mIGV4dHJhIHZpZGVvIHByb2R1Y2Vyc1xuICAgICAgICBmb3IgKGNvbnN0IHByb2R1Y2VyIG9mIHRoaXMuX2V4dHJhVmlkZW9Qcm9kdWNlcnMudmFsdWVzKCkpIHtcbiAgICAgICAgICAoeyB0cmFjayB9ID0gcHJvZHVjZXIpO1xuXG4gICAgICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgICAgICAgICAgICAgZnJhbWVSYXRlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ3VwZGF0ZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAvLyAgIHtcbiAgICAgIC8vICAgICB0eXBlOiAnZXJyb3InLFxuICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRXJyb3InLFxuICAgICAgLy8gICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBjYW1lcmEnXG4gICAgICAvLyAgICAgfSlcbiAgICAgIC8vICAgfSkpO1xuXG4gICAgICBpZiAodHJhY2spXG4gICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuICBhc3luYyBjbG9zZU1lZXRpbmcoKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ2Nsb3NlTWVldGluZygpJyk7XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgnbW9kZXJhdG9yOmNsb3NlTWVldGluZycpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdjbG9zZU1lZXRpbmcoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgfVxuXG4gIC8vIC8vIHR5cGU6IG1pYy93ZWJjYW0vc2NyZWVuXG4gIC8vIC8vIG11dGU6IHRydWUvZmFsc2VcbiAgYXN5bmMgbW9kaWZ5UGVlckNvbnN1bWVyKHBlZXJJZCwgdHlwZSwgbXV0ZSkge1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgJ21vZGlmeVBlZXJDb25zdW1lcigpIFtwZWVySWQ6XCIlc1wiLCB0eXBlOlwiJXNcIl0nLFxuICAgICAgcGVlcklkLFxuICAgICAgdHlwZVxuICAgICk7XG5cbiAgICAvLyBpZiAodHlwZSA9PT0gJ21pYycpXG4gICAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgICAvLyAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgICAvLyBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAgIC8vICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGhpcy5fY29uc3VtZXJzLnZhbHVlcygpKSB7XG4gICAgICAgIGlmIChjb25zdW1lci5hcHBEYXRhLnBlZXJJZCA9PT0gcGVlcklkICYmIGNvbnN1bWVyLmFwcERhdGEuc291cmNlID09PSB0eXBlKSB7XG4gICAgICAgICAgaWYgKG11dGUpXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBhd2FpdCB0aGlzLl9yZXN1bWVDb25zdW1lcihjb25zdW1lcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignbW9kaWZ5UGVlckNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gaWYgKHR5cGUgPT09ICdtaWMnKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICd3ZWJjYW0nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJWaWRlb0luUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAgIC8vIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAgIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gICAgLy8gICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgfVxuXG4gIGFzeW5jIF9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19wYXVzZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgICBpZiAoY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgICAgIHJldHVybjtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoJ3BhdXNlQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5wYXVzZSgpO1xuXG4gICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gICAgfVxuICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy5sb2dnZXIuZXJyb3IoJ19wYXVzZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgX3Jlc3VtZUNvbnN1bWVyKGNvbnN1bWVyKSB7XG4gICAgdGhpcy5sb2dnZXIuZGVidWcoJ19yZXN1bWVDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gICAgaWYgKCFjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdCgncmVzdW1lQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gICAgICBjb25zdW1lci5yZXN1bWUoKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLmxvZ2dlci5lcnJvcignX3Jlc3VtZUNvbnN1bWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgLy8gYXN5bmMgc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbc3BhdGlhbExheWVyOlwiJXNcIl0nLCBzcGF0aWFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fd2ViY2FtUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgICBpZiAodGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIuc2V0TWF4U3BhdGlhbExheWVyKHNwYXRpYWxMYXllcik7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBzcGF0aWFsTGF5ZXI6XCIlc1wiLCB0ZW1wb3JhbExheWVyOlwiJXNcIl0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KFxuICAvLyAgICAgICAnc2V0Q29uc3VtZXJQcmVmZXJlZExheWVycycsIHsgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyIH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoXG4gIC8vICAgICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHByaW9yaXR5OiVkXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBwcmlvcml0eSk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnc2V0Q29uc3VtZXJQcmlvcml0eScsIHsgY29uc3VtZXJJZCwgcHJpb3JpdHkgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByaW9yaXR5KGNvbnN1bWVySWQsIHByaW9yaXR5KSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByaW9yaXR5KCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgcmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoY29uc3VtZXJJZCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbY29uc3VtZXJJZDpcIiVzXCJdJywgY29uc3VtZXJJZCk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUnLCB7IGNvbnN1bWVySWQgfSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG5cblxuXG4gIGFzeW5jIGpvaW4oeyByb29tSWQsIGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pIHtcblxuXG4gICAgdGhpcy5fcm9vbUlkID0gcm9vbUlkO1xuXG5cbiAgICAvLyBpbml0aWFsaXplIHNpZ25hbGluZyBzb2NrZXRcbiAgICAvLyBsaXN0ZW4gdG8gc29ja2V0IGV2ZW50c1xuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5pbml0KHJvb21JZCwgdGhpcy5fcGVlcklkKVxuICAgIHRoaXMuc2lnbmFsaW5nU2VydmljZS5vbkRpc2Nvbm5lY3RlZC5zdWJzY3JpYmUoICgpID0+IHtcbiAgICAgIC8vIGNsb3NlXG4gICAgICAvLyB0aGlzLmNsb3NlXG4gICAgfSlcbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25SZWNvbm5lY3Rpbmcuc3Vic2NyaWJlKCAoKSA9PiB7XG4gICAgICAvLyBjbG9zZVxuXG5cblxuXG5cdFx0XHRpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX3dlYmNhbVByb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fbWljUHJvZHVjZXIpXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX21pY1Byb2R1Y2VyLmNsb3NlKCk7XG5cblx0XHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0XHRcdC8vIFx0cHJvZHVjZXJBY3Rpb25zLnJlbW92ZVByb2R1Y2VyKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cblx0XHRcdFx0dGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5fcmVjdlRyYW5zcG9ydClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG5cdFx0XHRcdHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXHRcdFx0fVxuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5jbGVhclBlZXJzKCk7XG5cblxuXHRcdFx0Ly8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0aW5nJykpO1xuICAgIH0pXG5cbiAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uub25OZXdDb25zdW1lci5waXBlKHN3aXRjaE1hcChhc3luYyAoZGF0YSkgPT4ge1xuICAgICAgY29uc3Qge1xuICAgICAgICBwZWVySWQsXG4gICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgIGlkLFxuICAgICAgICBraW5kLFxuICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhcHBEYXRhLFxuICAgICAgICBwcm9kdWNlclBhdXNlZFxuICAgICAgfSA9IGRhdGE7XG5cbiAgICAgIGNvbnN0IGNvbnN1bWVyICA9IGF3YWl0IHRoaXMuX3JlY3ZUcmFuc3BvcnQuY29uc3VtZShcbiAgICAgICAge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIHByb2R1Y2VySWQsXG4gICAgICAgICAga2luZCxcbiAgICAgICAgICBydHBQYXJhbWV0ZXJzLFxuICAgICAgICAgIGFwcERhdGEgOiB7IC4uLmFwcERhdGEsIHBlZXJJZCB9IC8vIFRyaWNrLlxuICAgICAgICB9KSBhcyBtZWRpYXNvdXBDbGllbnQudHlwZXMuQ29uc3VtZXI7XG5cbiAgICAgIC8vIFN0b3JlIGluIHRoZSBtYXAuXG4gICAgICB0aGlzLl9jb25zdW1lcnMuc2V0KGNvbnN1bWVyLmlkLCBjb25zdW1lcik7XG5cbiAgICAgIGNvbnN1bWVyLm9uKCd0cmFuc3BvcnRjbG9zZScsICgpID0+XG4gICAgICB7XG4gICAgICAgIHRoaXMuX2NvbnN1bWVycy5kZWxldGUoY29uc3VtZXIuaWQpO1xuICAgICAgfSk7XG5cblxuXG5cbiAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm5ld0NvbnN1bWVyKGNvbnN1bWVyLCAgcGVlcklkLCB0eXBlLCBwcm9kdWNlclBhdXNlZCk7XG5cbiAgICAgIC8vIFdlIGFyZSByZWFkeS4gQW5zd2VyIHRoZSByZXF1ZXN0IHNvIHRoZSBzZXJ2ZXIgd2lsbFxuICAgICAgLy8gcmVzdW1lIHRoaXMgQ29uc3VtZXIgKHdoaWNoIHdhcyBwYXVzZWQgZm9yIG5vdykuXG5cblxuICAgICAgLy8gaWYgKGtpbmQgPT09ICdhdWRpbycpXG4gICAgICAvLyB7XG4gICAgICAvLyAgIGNvbnN1bWVyLnZvbHVtZSA9IDA7XG5cbiAgICAgIC8vICAgY29uc3Qgc3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgICAgIC8vICAgc3RyZWFtLmFkZFRyYWNrKGNvbnN1bWVyLnRyYWNrKTtcblxuICAgICAgLy8gICBpZiAoIXN0cmVhbS5nZXRBdWRpb1RyYWNrcygpWzBdKVxuICAgICAgLy8gICAgIHRocm93IG5ldyBFcnJvcigncmVxdWVzdC5uZXdDb25zdW1lciB8IGdpdmVuIHN0cmVhbSBoYXMgbm8gYXVkaW8gdHJhY2snKTtcblxuICAgICAgICAvLyBjb25zdW1lci5oYXJrID0gaGFyayhzdHJlYW0sIHsgcGxheTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gY29uc3VtZXIuaGFyay5vbigndm9sdW1lX2NoYW5nZScsICh2b2x1bWUpID0+XG4gICAgICAgIC8vIHtcbiAgICAgICAgLy8gICB2b2x1bWUgPSBNYXRoLnJvdW5kKHZvbHVtZSk7XG5cbiAgICAgICAgLy8gICBpZiAoY29uc3VtZXIgJiYgdm9sdW1lICE9PSBjb25zdW1lci52b2x1bWUpXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgY29uc3VtZXIudm9sdW1lID0gdm9sdW1lO1xuXG4gICAgICAgIC8vICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyVm9sdW1lQWN0aW9ucy5zZXRQZWVyVm9sdW1lKHBlZXJJZCwgdm9sdW1lKSk7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9KTtcbiAgICAgIC8vIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKVxuXG4gICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLm9uTm90aWZpY2F0aW9uLnBpcGUoc3dpdGNoTWFwKGFzeW5jIChub3RpZmljYXRpb24pID0+IHtcbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnc29ja2V0IFwibm90aWZpY2F0aW9uXCIgZXZlbnQgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsXG4gICAgICAgIG5vdGlmaWNhdGlvbi5tZXRob2QsIG5vdGlmaWNhdGlvbi5kYXRhKTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgc3dpdGNoIChub3RpZmljYXRpb24ubWV0aG9kKSB7XG5cblxuXG4gICAgICAgICAgY2FzZSAncHJvZHVjZXJTY29yZSc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgcHJvZHVjZXJJZCwgc2NvcmUgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclNjb3JlKHByb2R1Y2VySWQsIHNjb3JlKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICduZXdQZWVyJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBpZCwgZGlzcGxheU5hbWUsIHBpY3R1cmUsIHJvbGVzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChwZWVyQWN0aW9ucy5hZGRQZWVyKFxuICAgICAgICAgICAgICAvLyAgIHsgaWQsIGRpc3BsYXlOYW1lLCBwaWN0dXJlLCByb2xlcywgY29uc3VtZXJzOiBbXSB9KSk7XG5cbiAgICAgICAgICAgICAgdGhpcy5yZW1vdGVQZWVyc1NlcnZpY2UubmV3UGVlcihpZCk7XG5cbiAgICAgICAgICAgICAgLy8gdGhpcy5fc291bmROb3RpZmljYXRpb24oKTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgICAgICAgIC8vICAge1xuICAgICAgICAgICAgICAvLyAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgICAgICAgICAgICAgLy8gICAgICAgaWQ6ICdyb29tLm5ld1BlZXInLFxuICAgICAgICAgICAgICAvLyAgICAgICBkZWZhdWx0TWVzc2FnZTogJ3tkaXNwbGF5TmFtZX0gam9pbmVkIHRoZSByb29tJ1xuICAgICAgICAgICAgICAvLyAgICAgfSwge1xuICAgICAgICAgICAgICAvLyAgICAgICBkaXNwbGF5TmFtZVxuICAgICAgICAgICAgICAvLyAgICAgfSlcbiAgICAgICAgICAgICAgLy8gICB9KSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdwZWVyQ2xvc2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBwZWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLmNsb3NlUGVlcihwZWVySWQpO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIHBlZXJBY3Rpb25zLnJlbW92ZVBlZXIocGVlcklkKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckNsb3NlZCc6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgY29uc3VtZXJJZCB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIGNvbnN1bWVyLmNsb3NlKCk7XG5cbiAgICAgICAgICAgICAgaWYgKGNvbnN1bWVyLmhhcmsgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb25zdW1lci5oYXJrLnN0b3AoKTtcblxuICAgICAgICAgICAgICB0aGlzLl9jb25zdW1lcnMuZGVsZXRlKGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHsgcGVlcklkIH0gPSBjb25zdW1lci5hcHBEYXRhO1xuXG4gICAgICAgICAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKFxuICAgICAgICAgICAgICAvLyAgIGNvbnN1bWVyQWN0aW9ucy5yZW1vdmVDb25zdW1lcihjb25zdW1lcklkLCBwZWVySWQpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyUGF1c2VkJzpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgeyBjb25zdW1lcklkIH0gPSBub3RpZmljYXRpb24uZGF0YTtcbiAgICAgICAgICAgICAgY29uc3QgY29uc3VtZXIgPSB0aGlzLl9jb25zdW1lcnMuZ2V0KGNvbnN1bWVySWQpO1xuXG4gICAgICAgICAgICAgIGlmICghY29uc3VtZXIpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goXG4gICAgICAgICAgICAgIC8vICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lclJlc3VtZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQgfSA9IG5vdGlmaWNhdGlvbi5kYXRhO1xuICAgICAgICAgICAgICBjb25zdCBjb25zdW1lciA9IHRoaXMuX2NvbnN1bWVycy5nZXQoY29uc3VtZXJJZCk7XG5cbiAgICAgICAgICAgICAgaWYgKCFjb25zdW1lcilcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVySWQsICdyZW1vdGUnKSk7XG5cbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICBjYXNlICdjb25zdW1lckxheWVyc0NoYW5nZWQnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9ID0gbm90aWZpY2F0aW9uLmRhdGE7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbnN1bWVyID0gdGhpcy5fY29uc3VtZXJzLmdldChjb25zdW1lcklkKTtcblxuICAgICAgICAgICAgICBpZiAoIWNvbnN1bWVyKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgIHRoaXMucmVtb3RlUGVlcnNTZXJ2aWNlLm9uQ29uc3VtZXJMYXllckNoYW5nZWQoY29uc3VtZXJJZClcbiAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyQ3VycmVudExheWVycyhcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcblxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIGNhc2UgJ2NvbnN1bWVyU2NvcmUnOlxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBjb25zdCB7IGNvbnN1bWVySWQsIHNjb3JlIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChcbiAgICAgICAgICAgICAgLy8gICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJTY29yZShjb25zdW1lcklkLCBzY29yZSkpO1xuXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSAncm9vbUJhY2snOlxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5fam9pblJvb20oeyBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY2FzZSAncm9vbVJlYWR5JzpcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB7IHR1cm5TZXJ2ZXJzIH0gPSBub3RpZmljYXRpb24uZGF0YTtcblxuICAgICAgICAgICAgICAgICAgdGhpcy5fdHVyblNlcnZlcnMgPSB0dXJuU2VydmVycztcblxuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMudG9nZ2xlSm9pbmVkKCkpO1xuICAgICAgICAgICAgICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SW5Mb2JieShmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLl9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pO1xuXG4gICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLy8gdGhpcy5sb2dnZXIuZXJyb3IoXG4gICAgICAgICAgICAgIC8vICAgJ3Vua25vd24gbm90aWZpY2F0aW9uLm1ldGhvZCBcIiVzXCInLCBub3RpZmljYXRpb24ubWV0aG9kKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdlcnJvciBvbiBzb2NrZXQgXCJub3RpZmljYXRpb25cIiBldmVudCBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAgICAgICAvLyBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gICAgICAgIC8vICAge1xuICAgICAgICAvLyAgICAgdHlwZTogJ2Vycm9yJyxcbiAgICAgICAgLy8gICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAgIC8vICAgICAgIGlkOiAnc29ja2V0LnJlcXVlc3RFcnJvcicsXG4gICAgICAgIC8vICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnRXJyb3Igb24gc2VydmVyIHJlcXVlc3QnXG4gICAgICAgIC8vICAgICB9KVxuICAgICAgICAvLyAgIH0pKTtcbiAgICAgIH1cblxuICAgIH0pKS5zdWJzY3JpYmUoKVxuICAgIC8vIG9uIHJvb20gcmVhZHkgam9pbiByb29tIF9qb2luUm9vbVxuXG4gICAgLy8gdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgIC8vIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgLy8gICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgIC8vIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAvLyAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAvLyBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgIC8vIGNyZWF0ZSBzZW5kIHRyYW5zcG9ydCBjcmVhdGVXZWJSdGNUcmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvcnRcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gY3JlYXRlIHJlY2VpdmUgdHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3JcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gc2VuZCBqb2luIHJlcXVlc3RcblxuICAgIC8vIGFkZCBwZWVycyB0byBwZWVycyBzZXJ2aWNlXG5cbiAgICAvLyBwcm9kdWNlIHVwZGF0ZVdlYmNhbSB1cGRhdGVNaWNcbiAgfVxuXG5cblx0YXN5bmMgX3VwZGF0ZUF1ZGlvRGV2aWNlcygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX3VwZGF0ZUF1ZGlvRGV2aWNlcygpJyk7XG5cblx0XHQvLyBSZXNldCB0aGUgbGlzdC5cblx0XHR0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgfCBjYWxsaW5nIGVudW1lcmF0ZURldmljZXMoKScpO1xuXG5cdFx0XHRjb25zdCBkZXZpY2VzID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5lbnVtZXJhdGVEZXZpY2VzKCk7XG5cblx0XHRcdGZvciAoY29uc3QgZGV2aWNlIG9mIGRldmljZXMpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChkZXZpY2Uua2luZCAhPT0gJ2F1ZGlvaW5wdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvRGV2aWNlcyh0aGlzLl9hdWRpb0RldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9EZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgX3VwZGF0ZVdlYmNhbXMoKVxuXHR7XG5cdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVXZWJjYW1zKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlV2ViY2FtcygpIHwgY2FsbGluZyBlbnVtZXJhdGVEZXZpY2VzKCknKTtcblxuXHRcdFx0Y29uc3QgZGV2aWNlcyA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZW51bWVyYXRlRGV2aWNlcygpO1xuXG5cdFx0XHRmb3IgKGNvbnN0IGRldmljZSBvZiBkZXZpY2VzKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoZGV2aWNlLmtpbmQgIT09ICd2aWRlb2lucHV0Jylcblx0XHRcdFx0XHRjb250aW51ZTtcblxuXHRcdFx0XHR0aGlzLl93ZWJjYW1zW2RldmljZS5kZXZpY2VJZF0gPSBkZXZpY2U7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHN0b3JlLmRpc3BhdGNoKFxuXHRcdFx0Ly8gXHRtZUFjdGlvbnMuc2V0V2ViY2FtRGV2aWNlcyh0aGlzLl93ZWJjYW1zKSk7XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX3VwZGF0ZVdlYmNhbXMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBkaXNhYmxlV2ViY2FtKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdkaXNhYmxlV2ViY2FtKCknKTtcblxuXHRcdGlmICghdGhpcy5fd2ViY2FtUHJvZHVjZXIpXG5cdFx0XHRyZXR1cm47XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVXZWJjYW0oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvTXV0ZWQodHJ1ZSkpO1xuXHRcdC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG5cdH1cblx0YXN5bmMgZGlzYWJsZU1pYygpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnZGlzYWJsZU1pYygpJyk7XG5cblx0XHRpZiAoIXRoaXMuX21pY1Byb2R1Y2VyKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1ZGlvSW5Qcm9ncmVzcyh0cnVlKSk7XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlci5jbG9zZSgpO1xuXG5cdFx0Ly8gc3RvcmUuZGlzcGF0Y2goXG5cdFx0Ly8gXHRwcm9kdWNlckFjdGlvbnMucmVtb3ZlUHJvZHVjZXIodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcblx0XHRcdFx0J2Nsb3NlUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXHRcdH1cblx0XHRjYXRjaCAoZXJyb3IpXG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZXJyb3IoJ2Rpc2FibGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cblx0XHR0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cblx0XHQvLyBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIH1cblxuXG5cdGFzeW5jIF9nZXRXZWJjYW1EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldFdlYmNhbURldmljZUlkKCknKTtcblxuXHRcdHRyeVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfZ2V0V2ViY2FtRGV2aWNlSWQoKSB8IGNhbGxpbmcgX3VwZGF0ZVdlYmNhbXMoKScpO1xuXG5cdFx0XHRhd2FpdCB0aGlzLl91cGRhdGVXZWJjYW1zKCk7XG5cblx0XHRcdGNvbnN0ICBzZWxlY3RlZFdlYmNhbSA9ICBudWxsXG5cblx0XHRcdGlmIChzZWxlY3RlZFdlYmNhbSAmJiB0aGlzLl93ZWJjYW1zW3NlbGVjdGVkV2ViY2FtXSlcblx0XHRcdFx0cmV0dXJuIHNlbGVjdGVkV2ViY2FtO1xuXHRcdFx0ZWxzZVxuXHRcdFx0e1xuXHRcdFx0XHRjb25zdCB3ZWJjYW1zID0gT2JqZWN0LnZhbHVlcyh0aGlzLl93ZWJjYW1zKTtcblxuICAgICAgICAvLyBAdHMtaWdub3JlXG5cdFx0XHRcdHJldHVybiB3ZWJjYW1zWzBdID8gd2ViY2Ftc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldFdlYmNhbURldmljZUlkKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuICB9XG5cblxuXHRhc3luYyBfZ2V0QXVkaW9EZXZpY2VJZCgpXG5cdHtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnX2dldEF1ZGlvRGV2aWNlSWQoKScpO1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ19nZXRBdWRpb0RldmljZUlkKCkgfCBjYWxsaW5nIF91cGRhdGVBdWRpb0RldmljZUlkKCknKTtcblxuXHRcdFx0YXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG5cbiAgICAgIGNvbnN0ICBzZWxlY3RlZEF1ZGlvRGV2aWNlID0gbnVsbDtcblxuXHRcdFx0aWYgKHNlbGVjdGVkQXVkaW9EZXZpY2UgJiYgdGhpcy5fYXVkaW9EZXZpY2VzW3NlbGVjdGVkQXVkaW9EZXZpY2VdKVxuXHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWRBdWRpb0RldmljZTtcblx0XHRcdGVsc2Vcblx0XHRcdHtcblx0XHRcdFx0Y29uc3QgYXVkaW9EZXZpY2VzID0gT2JqZWN0LnZhbHVlcyh0aGlzLl9hdWRpb0RldmljZXMpO1xuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcblx0XHRcdFx0cmV0dXJuIGF1ZGlvRGV2aWNlc1swXSA/IGF1ZGlvRGV2aWNlc1swXS5kZXZpY2VJZCA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGNhdGNoIChlcnJvcilcblx0XHR7XG5cdFx0XHR0aGlzLmxvZ2dlci5lcnJvcignX2dldEF1ZGlvRGV2aWNlSWQoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblx0XHR9XG5cdH1cblxuXHRhc3luYyBfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKClcblx0e1xuXHRcdHRoaXMubG9nZ2VyLmRlYnVnKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCknKTtcblxuXHRcdC8vIFJlc2V0IHRoZSBsaXN0LlxuXHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG5cdFx0dHJ5XG5cdFx0e1xuXHRcdFx0dGhpcy5sb2dnZXIuZGVidWcoJ191cGRhdGVBdWRpb091dHB1dERldmljZXMoKSB8IGNhbGxpbmcgZW51bWVyYXRlRGV2aWNlcygpJyk7XG5cblx0XHRcdGNvbnN0IGRldmljZXMgPSBhd2FpdCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmVudW1lcmF0ZURldmljZXMoKTtcblxuXHRcdFx0Zm9yIChjb25zdCBkZXZpY2Ugb2YgZGV2aWNlcylcblx0XHRcdHtcblx0XHRcdFx0aWYgKGRldmljZS5raW5kICE9PSAnYXVkaW9vdXRwdXQnKVxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXG5cdFx0XHRcdHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlc1tkZXZpY2UuZGV2aWNlSWRdID0gZGV2aWNlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzdG9yZS5kaXNwYXRjaChcblx0XHRcdC8vIFx0bWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0RGV2aWNlcyh0aGlzLl9hdWRpb091dHB1dERldmljZXMpKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKGVycm9yKVxuXHRcdHtcblx0XHRcdHRoaXMubG9nZ2VyLmVycm9yKCdfdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cdFx0fVxuXHR9XG5cblxuXG4gIGFzeW5jIF9qb2luUm9vbSh7IGpvaW5WaWRlbywgam9pbkF1ZGlvIH0pIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnX2pvaW5Sb29tKCknKTtcblxuICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gYEd1ZXN0ICR7TWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKDEwMDAwMCAtIDEwMDAwKSkgKyAxMDAwMH1gXG5cblxuICAgIHRyeSB7XG5cblxuICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgICAgY29uc3Qgcm91dGVyUnRwQ2FwYWJpbGl0aWVzID1cbiAgICAgICAgYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgICAgcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnMgPSByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9uc1xuICAgICAgICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgICBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgY29uc3QgdHJhbnNwb3J0SW5mbyA9IGF3YWl0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kUmVxdWVzdChcbiAgICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBmb3JjZVRjcDogdGhpcy5fZm9yY2VUY3AsXG4gICAgICAgICAgICBwcm9kdWNpbmc6IHRydWUsXG4gICAgICAgICAgICBjb25zdW1pbmc6IGZhbHNlXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3Qge1xuICAgICAgICAgIGlkLFxuICAgICAgICAgIGljZVBhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICBkdGxzUGFyYW1ldGVyc1xuICAgICAgICB9ID0gdHJhbnNwb3J0SW5mbztcblxuICAgICAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVNlbmRUcmFuc3BvcnQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQsXG4gICAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgICAgIGR0bHNQYXJhbWV0ZXJzLFxuICAgICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgICAvLyBUT0RPOiBGaXggZm9yIGlzc3VlICM3MlxuICAgICAgICAgICAgaWNlVHJhbnNwb3J0UG9saWN5OiB0aGlzLl9kZXZpY2UuZmxhZyA9PT0gJ2ZpcmVmb3gnICYmIHRoaXMuX3R1cm5TZXJ2ZXJzID8gJ3JlbGF5JyA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIHByb3ByaWV0YXJ5Q29uc3RyYWludHM6IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGhlbihjYWxsYmFjaylcbiAgICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5vbihcbiAgICAgICAgICAncHJvZHVjZScsIGFzeW5jICh7IGtpbmQsIHJ0cFBhcmFtZXRlcnMsIGFwcERhdGEgfSwgY2FsbGJhY2ssIGVycmJhY2spID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXNoYWRvd1xuICAgICAgICAgICAgY29uc3QgeyBpZCB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAgICAgICAncHJvZHVjZScsXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCxcbiAgICAgICAgICAgICAgICBraW5kLFxuICAgICAgICAgICAgICAgIHJ0cFBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgYXBwRGF0YVxuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY2FsbGJhY2soeyBpZCB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBlcnJiYWNrKGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB0cmFuc3BvcnRJbmZvID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnY3JlYXRlV2ViUnRjVHJhbnNwb3J0JyxcbiAgICAgICAge1xuICAgICAgICAgIGZvcmNlVGNwOiB0aGlzLl9mb3JjZVRjcCxcbiAgICAgICAgICBwcm9kdWNpbmc6IGZhbHNlLFxuICAgICAgICAgIGNvbnN1bWluZzogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgY29uc3Qge1xuICAgICAgICBpZCxcbiAgICAgICAgaWNlUGFyYW1ldGVycyxcbiAgICAgICAgaWNlQ2FuZGlkYXRlcyxcbiAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgIH0gPSB0cmFuc3BvcnRJbmZvO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0ID0gdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNyZWF0ZVJlY3ZUcmFuc3BvcnQoXG4gICAgICAgIHtcbiAgICAgICAgICBpZCxcbiAgICAgICAgICBpY2VQYXJhbWV0ZXJzLFxuICAgICAgICAgIGljZUNhbmRpZGF0ZXMsXG4gICAgICAgICAgZHRsc1BhcmFtZXRlcnMsXG4gICAgICAgICAgaWNlU2VydmVyczogdGhpcy5fdHVyblNlcnZlcnMsXG4gICAgICAgICAgLy8gVE9ETzogRml4IGZvciBpc3N1ZSAjNzJcbiAgICAgICAgICBpY2VUcmFuc3BvcnRQb2xpY3k6IHRoaXMuX2RldmljZS5mbGFnID09PSAnZmlyZWZveCcgJiYgdGhpcy5fdHVyblNlcnZlcnMgPyAncmVsYXknIDogdW5kZWZpbmVkXG4gICAgICAgIH0pO1xuXG4gICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0Lm9uKFxuICAgICAgICAnY29ubmVjdCcsICh7IGR0bHNQYXJhbWV0ZXJzIH0sIGNhbGxiYWNrLCBlcnJiYWNrKSA9PiAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXNoYWRvd1xuICAgICAge1xuICAgICAgICB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZFJlcXVlc3QoXG4gICAgICAgICAgJ2Nvbm5lY3RXZWJSdGNUcmFuc3BvcnQnLFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRyYW5zcG9ydElkOiB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkLFxuICAgICAgICAgICAgZHRsc1BhcmFtZXRlcnNcbiAgICAgICAgICB9KVxuICAgICAgICAgIC50aGVuKGNhbGxiYWNrKVxuICAgICAgICAgIC5jYXRjaChlcnJiYWNrKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTZXQgb3VyIG1lZGlhIGNhcGFiaWxpdGllcy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRNZWRpYUNhcGFiaWxpdGllcyhcbiAgICAgIC8vIFx0e1xuICAgICAgLy8gXHRcdGNhblNlbmRNaWMgICAgIDogdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksXG4gICAgICAvLyBcdFx0Y2FuU2VuZFdlYmNhbSAgOiB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZVNjcmVlbiA6IHRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpICYmXG4gICAgICAvLyBcdFx0XHR0aGlzLl9zY3JlZW5TaGFyaW5nLmlzU2NyZWVuU2hhcmVBdmFpbGFibGUoKSxcbiAgICAgIC8vIFx0XHRjYW5TaGFyZUZpbGVzIDogdGhpcy5fdG9ycmVudFN1cHBvcnRcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICBjb25zdCB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICBwZWVycyxcbiAgICAgICAgdHJhY2tlcixcbiAgICAgICAgcm9vbVBlcm1pc3Npb25zLFxuICAgICAgICB1c2VyUm9sZXMsXG4gICAgICAgIGFsbG93V2hlblJvbGVNaXNzaW5nLFxuICAgICAgICBjaGF0SGlzdG9yeSxcbiAgICAgICAgZmlsZUhpc3RvcnksXG4gICAgICAgIGxhc3ROSGlzdG9yeSxcbiAgICAgICAgbG9ja2VkLFxuICAgICAgICBsb2JieVBlZXJzLFxuICAgICAgICBhY2Nlc3NDb2RlXG4gICAgICB9ID0gYXdhaXQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRSZXF1ZXN0KFxuICAgICAgICAnam9pbicsXG4gICAgICAgIHtcbiAgICAgICAgICBkaXNwbGF5TmFtZTogZGlzcGxheU5hbWUsXG5cbiAgICAgICAgICBydHBDYXBhYmlsaXRpZXM6IHRoaXMuX21lZGlhc291cERldmljZS5ydHBDYXBhYmlsaXRpZXNcbiAgICAgICAgfSk7XG5cbiAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKFxuICAgICAgICAnX2pvaW5Sb29tKCkgam9pbmVkIFthdXRoZW50aWNhdGVkOlwiJXNcIiwgcGVlcnM6XCIlb1wiLCByb2xlczpcIiVvXCIsIHVzZXJSb2xlczpcIiVvXCJdJyxcbiAgICAgICAgYXV0aGVudGljYXRlZCxcbiAgICAgICAgcGVlcnMsXG4gICAgICAgIHJvbGVzLFxuICAgICAgICB1c2VyUm9sZXNcbiAgICAgICk7XG5cblxuXG5cblxuICAgICAgLy8gZm9yIChjb25zdCBwZWVyIG9mIHBlZXJzKVxuICAgICAgLy8ge1xuICAgICAgLy8gXHRzdG9yZS5kaXNwYXRjaChcbiAgICAgIC8vIFx0XHRwZWVyQWN0aW9ucy5hZGRQZWVyKHsgLi4ucGVlciwgY29uc3VtZXJzOiBbXSB9KSk7XG4gICAgICAvLyB9XG5cbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ2pvaW4gYXVkaW8nLGpvaW5BdWRpbyAsICdjYW4gcHJvZHVjZSBhdWRpbycsXG4gICAgICAgICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmNhblByb2R1Y2UoJ2F1ZGlvJyksICcgdGhpcy5fbXV0ZWQnLCB0aGlzLl9tdXRlZClcbiAgICAgIC8vIERvbid0IHByb2R1Y2UgaWYgZXhwbGljaXRseSByZXF1ZXN0ZWQgdG8gbm90IHRvIGRvIGl0LlxuICAgICAgaWYgKHRoaXMuX3Byb2R1Y2UpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGpvaW5WaWRlb1xuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IGluaXQ6IHRydWUsIHN0YXJ0OiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcbiAgICAgICAgICBqb2luQXVkaW8gJiZcbiAgICAgICAgICB0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKVxuICAgICAgICApXG4gICAgICAgICAgaWYgKCF0aGlzLl9tdXRlZCkge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgICAgIC8vIGNvbnN0ICBzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICA9IG51bGxcblxuICAgICAgLy8gaWYgKCFzZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlICYmIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyAhPT0ge30pXG4gICAgICAvLyB7XG4gICAgICAvLyBcdHN0b3JlLmRpc3BhdGNoKFxuICAgICAgLy8gXHRcdHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKFxuICAgICAgLy8gXHRcdFx0T2JqZWN0LmtleXModGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzKVswXVxuICAgICAgLy8gXHRcdClcbiAgICAgIC8vIFx0KTtcbiAgICAgIC8vIH1cblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjb25uZWN0ZWQnKSk7XG5cbiAgICAgIC8vIC8vIENsZWFuIGFsbCB0aGUgZXhpc3Rpbmcgbm90aWZpY2F0aW9ucy5cbiAgICAgIC8vIHN0b3JlLmRpc3BhdGNoKG5vdGlmaWNhdGlvbkFjdGlvbnMucmVtb3ZlQWxsTm90aWZpY2F0aW9ucygpKTtcblxuICAgICAgLy8gc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAgICAgLy8gXHR7XG4gICAgICAvLyBcdFx0dGV4dCA6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gICAgICAvLyBcdFx0XHRpZCAgICAgICAgICAgICA6ICdyb29tLmpvaW5lZCcsXG4gICAgICAvLyBcdFx0XHRkZWZhdWx0TWVzc2FnZSA6ICdZb3UgaGF2ZSBqb2luZWQgdGhlIHJvb20nXG4gICAgICAvLyBcdFx0fSlcbiAgICAgIC8vIFx0fSkpO1xuXG4gICAgICB0aGlzLnJlbW90ZVBlZXJzU2VydmljZS5hZGRQZWVycyhwZWVycyk7XG5cblxuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdfam9pblJvb20oKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuXG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfVxuICB9XG4gIGRldmljZUluZm8oKSB7XG4gICAgY29uc3QgdWEgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuICAgIGNvbnN0IGJyb3dzZXIgPSBib3dzZXIuZ2V0UGFyc2VyKHVhKTtcblxuICAgIGxldCBmbGFnO1xuXG4gICAgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgY2hyb21lOiAnPj0wJywgY2hyb21pdW06ICc+PTAnIH0pKVxuICAgICAgZmxhZyA9ICdjaHJvbWUnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgZmlyZWZveDogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2ZpcmVmb3gnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgc2FmYXJpOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnc2FmYXJpJztcbiAgICBlbHNlIGlmIChicm93c2VyLnNhdGlzZmllcyh7IG9wZXJhOiAnPj0wJyB9KSlcbiAgICAgIGZsYWcgPSAnb3BlcmEnO1xuICAgIGVsc2UgaWYgKGJyb3dzZXIuc2F0aXNmaWVzKHsgJ21pY3Jvc29mdCBlZGdlJzogJz49MCcgfSkpXG4gICAgICBmbGFnID0gJ2VkZ2UnO1xuICAgIGVsc2VcbiAgICAgIGZsYWcgPSAndW5rbm93bic7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmxhZyxcbiAgICAgIG9zOiBicm93c2VyLmdldE9TTmFtZSh0cnVlKSwgLy8gaW9zLCBhbmRyb2lkLCBsaW51eC4uLlxuICAgICAgcGxhdGZvcm06IGJyb3dzZXIuZ2V0UGxhdGZvcm1UeXBlKHRydWUpLCAvLyBtb2JpbGUsIGRlc2t0b3AsIHRhYmxldFxuICAgICAgbmFtZTogYnJvd3Nlci5nZXRCcm93c2VyTmFtZSh0cnVlKSxcbiAgICAgIHZlcnNpb246IGJyb3dzZXIuZ2V0QnJvd3NlclZlcnNpb24oKSxcbiAgICAgIGJvd3NlcjogYnJvd3NlclxuICAgIH07XG5cbiAgfVxufVxuIl19
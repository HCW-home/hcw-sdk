import { __awaiter } from "tslib";
import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
let saveAs;
let mediasoupClient;
let requestTimeout, lastN, mobileLastN, videoAspectRatio;
// {
// 	requestTimeout = 20000,
// 	lastN = 4,
// 	mobileLastN = 1,
// 	videoAspectRatio = 1.777 // 16 : 9
// }
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
    constructor() {
        // Transport for sending.
        this._sendTransport = null;
        // Transport for receiving.
        this._recvTransport = null;
        this._closed = false;
        this._produce = true;
        this._forceTcp = false;
    }
    init({ peerId = null, device = null, produce = true, forceTcp = false, muted = true } = {}) {
        if (!peerId)
            throw new Error('Missing peerId');
        else if (!device)
            throw new Error('Missing device');
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
        this._device = device;
        // My peer name.
        this._peerId = peerId;
        // Alert sound
        this._soundAlert = new Audio('/sounds/notify.mp3');
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
        // this._startKeyListener();
        // this._startDevicesListener();
    }
    // close() {
    //   if (this._closed)
    //     return;
    //   this._closed = true;
    //   logger.debug('close()');
    //   this._signalingSocket.close();
    //   // Close mediasoup Transports.
    //   if (this._sendTransport)
    //     this._sendTransport.close();
    //   if (this._recvTransport)
    //     this._recvTransport.close();
    //   store.dispatch(roomActions.setRoomState('closed'));
    //   window.location = `/${this._roomId}`;
    // }
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
    // _startDevicesListener() {
    //   navigator.mediaDevices.addEventListener('devicechange', async () => {
    //     logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');
    //     await this._updateAudioDevices();
    //     await this._updateWebcams();
    //     await this._updateAudioOutputDevices();
    //     store.dispatch(requestActions.notify(
    //       {
    //         text: intl.formatMessage({
    //           id: 'devices.devicesChanged',
    //           defaultMessage: 'Your devices changed, configure your devices in the settings dialog'
    //         })
    //       }));
    //   });
    // }
    // _soundNotification() {
    //   const { notificationSounds } = store.getState().settings;
    //   if (notificationSounds) {
    //     const alertPromise = this._soundAlert.play();
    //     if (alertPromise !== undefined) {
    //       alertPromise
    //         .then()
    //         .catch((error) => {
    //           logger.error('_soundAlert.play() [error:"%o"]', error);
    //         });
    //     }
    //   }
    // }
    // timeoutCallback(callback) {
    //   let called = false;
    //   const interval = setTimeout(
    //     () => {
    //       if (called)
    //         return;
    //       called = true;
    //       callback(new SocketTimeoutError('Request timed out'));
    //     },
    //     requestTimeout
    //   );
    //   return (...args) => {
    //     if (called)
    //       return;
    //     called = true;
    //     clearTimeout(interval);
    //     callback(...args);
    //   };
    // }
    // _sendRequest(method, data) {
    //   return new Promise((resolve, reject) => {
    //     if (!this._signalingSocket) {
    //       reject('No socket connection');
    //     }
    //     else {
    //       this._signalingSocket.emit(
    //         'request',
    //         { method, data },
    //         this.timeoutCallback((err, response) => {
    //           if (err)
    //             reject(err);
    //           else
    //             resolve(response);
    //         })
    //       );
    //     }
    //   });
    // }
    // async getTransportStats() {
    //   try {
    //     if (this._recvTransport) {
    //       logger.debug('getTransportStats() - recv [transportId: "%s"]', this._recvTransport.id);
    //       const recv = await this.sendRequest('getTransportStats', { transportId: this._recvTransport.id });
    //       store.dispatch(
    //         transportActions.addTransportStats(recv, 'recv'));
    //     }
    //     if (this._sendTransport) {
    //       logger.debug('getTransportStats() - send [transportId: "%s"]', this._sendTransport.id);
    //       const send = await this.sendRequest('getTransportStats', { transportId: this._sendTransport.id });
    //       store.dispatch(
    //         transportActions.addTransportStats(send, 'send'));
    //     }
    //   }
    //   catch (error) {
    //     logger.error('getTransportStats() [error:"%o"]', error);
    //   }
    // }
    // async sendRequest(method, data) {
    //   logger.debug('sendRequest() [method:"%s", data:"%o"]', method, data);
    //   const {
    //     requestRetries = 3
    //   } = window.config;
    //   for (let tries = 0; tries < requestRetries; tries++) {
    //     try {
    //       return await this._sendRequest(method, data);
    //     }
    //     catch (error) {
    //       if (
    //         error instanceof SocketTimeoutError &&
    //         tries < requestRetries
    //       )
    //         logger.warn('sendRequest() | timeout, retrying [attempt:"%s"]', tries);
    //       else
    //         throw error;
    //     }
    //   }
    // }
    // async muteMic() {
    //   logger.debug('muteMic()');
    //   this._micProducer.pause();
    //   try {
    //     await this.sendRequest(
    //       'pauseProducer', { producerId: this._micProducer.id });
    //     store.dispatch(
    //       producerActions.setProducerPaused(this._micProducer.id));
    //     store.dispatch(
    //       settingsActions.setAudioMuted(true));
    //   }
    //   catch (error) {
    //     logger.error('muteMic() [error:"%o"]', error);
    //     store.dispatch(requestActions.notify(
    //       {
    //         type: 'error',
    //         text: intl.formatMessage({
    //           id: 'devices.microphoneMuteError',
    //           defaultMessage: 'Unable to mute your microphone'
    //         })
    //       }));
    //   }
    // }
    // async unmuteMic() {
    //   logger.debug('unmuteMic()');
    //   if (!this._micProducer) {
    //     this.updateMic({ start: true });
    //   }
    //   else {
    //     this._micProducer.resume();
    //     try {
    //       await this.sendRequest(
    //         'resumeProducer', { producerId: this._micProducer.id });
    //       store.dispatch(
    //         producerActions.setProducerResumed(this._micProducer.id));
    //       store.dispatch(
    //         settingsActions.setAudioMuted(false));
    //     }
    //     catch (error) {
    //       logger.error('unmuteMic() [error:"%o"]', error);
    //       store.dispatch(requestActions.notify(
    //         {
    //           type: 'error',
    //           text: intl.formatMessage({
    //             id: 'devices.microphoneUnMuteError',
    //             defaultMessage: 'Unable to unmute your microphone'
    //           })
    //         }));
    //     }
    //   }
    // }
    // disconnectLocalHark() {
    //   logger.debug('disconnectLocalHark()');
    //   if (this._harkStream != null) {
    //     let [track] = this._harkStream.getAudioTracks();
    //     track.stop();
    //     track = null;
    //     this._harkStream = null;
    //   }
    //   if (this._hark != null)
    //     this._hark.stop();
    // }
    // connectLocalHark(track) {
    //   logger.debug('connectLocalHark() [track:"%o"]', track);
    //   this._harkStream = new MediaStream();
    //   const newTrack = track.clone();
    //   this._harkStream.addTrack(newTrack);
    //   newTrack.enabled = true;
    //   this._hark = hark(this._harkStream,
    //     {
    //       play: false,
    //       interval: 10,
    //       threshold: store.getState().settings.noiseThreshold,
    //       history: 100
    //     });
    //   this._hark.lastVolume = -100;
    //   this._hark.on('volume_change', (volume) => {
    //     // Update only if there is a bigger diff
    //     if (this._micProducer && Math.abs(volume - this._hark.lastVolume) > 0.5) {
    //       // Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
    //       // This makes decay volume fast if difference to last saved value is big
    //       // and slow for small changes. This prevents flickering volume indicator
    //       // at low levels
    //       if (volume < this._hark.lastVolume) {
    //         volume =
    //           this._hark.lastVolume -
    //           Math.pow(
    //             (volume - this._hark.lastVolume) /
    //             (100 + this._hark.lastVolume)
    //             , 2
    //           ) * 10;
    //       }
    //       this._hark.lastVolume = volume;
    //       store.dispatch(peerVolumeActions.setPeerVolume(this._peerId, volume));
    //     }
    //   });
    //   this._hark.on('speaking', () => {
    //     store.dispatch(meActions.setIsSpeaking(true));
    //     if (
    //       (store.getState().settings.voiceActivatedUnmute ||
    //         store.getState().me.isAutoMuted) &&
    //       this._micProducer &&
    //       this._micProducer.paused
    //     )
    //       this._micProducer.resume();
    //     store.dispatch(meActions.setAutoMuted(false)); // sanity action
    //   });
    //   this._hark.on('stopped_speaking', () => {
    //     store.dispatch(meActions.setIsSpeaking(false));
    //     if (
    //       store.getState().settings.voiceActivatedUnmute &&
    //       this._micProducer &&
    //       !this._micProducer.paused
    //     ) {
    //       this._micProducer.pause();
    //       store.dispatch(meActions.setAutoMuted(true));
    //     }
    //   });
    // }
    // async changeAudioOutputDevice(deviceId) {
    //   logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);
    //   store.dispatch(
    //     meActions.setAudioOutputInProgress(true));
    //   try {
    //     const device = this._audioOutputDevices[deviceId];
    //     if (!device)
    //       throw new Error('Selected audio output device no longer available');
    //     store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));
    //     await this._updateAudioOutputDevices();
    //   }
    //   catch (error) {
    //     logger.error('changeAudioOutputDevice() [error:"%o"]', error);
    //   }
    //   store.dispatch(
    //     meActions.setAudioOutputInProgress(false));
    // }
    // // Only Firefox supports applyConstraints to audio tracks
    // // See:
    // // https://bugs.chromium.org/p/chromium/issues/detail?id=796964
    // async updateMic({
    //   start = false,
    //   restart = false || this._device.flag !== 'firefox',
    //   newDeviceId = null
    // } = {}) {
    //   logger.debug(
    //     'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
    //     start,
    //     restart,
    //     newDeviceId
    //   );
    //   let track;
    //   try {
    //     if (!this._mediasoupDevice.canProduce('audio'))
    //       throw new Error('cannot produce audio');
    //     if (newDeviceId && !restart)
    //       throw new Error('changing device requires restart');
    //     if (newDeviceId)
    //       store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));
    //     store.dispatch(meActions.setAudioInProgress(true));
    //     const deviceId = await this._getAudioDeviceId();
    //     const device = this._audioDevices[deviceId];
    //     if (!device)
    //       throw new Error('no audio devices');
    //     const {
    //       autoGainControl,
    //       echoCancellation,
    //       noiseSuppression
    //     } = store.getState().settings;
    //     if (!window.config.centralAudioOptions) {
    //       throw new Error(
    //         'Missing centralAudioOptions from app config! (See it in example config.)'
    //       );
    //     }
    //     const {
    //       sampleRate = 96000,
    //       channelCount = 1,
    //       volume = 1.0,
    //       sampleSize = 16,
    //       opusStereo = false,
    //       opusDtx = true,
    //       opusFec = true,
    //       opusPtime = 20,
    //       opusMaxPlaybackRate = 96000
    //     } = window.config.centralAudioOptions;
    //     if (
    //       (restart && this._micProducer) ||
    //       start
    //     ) {
    //       this.disconnectLocalHark();
    //       if (this._micProducer)
    //         await this.disableMic();
    //       const stream = await navigator.mediaDevices.getUserMedia(
    //         {
    //           audio: {
    //             deviceId: { ideal: deviceId },
    //             sampleRate,
    //             channelCount,
    //             volume,
    //             autoGainControl,
    //             echoCancellation,
    //             noiseSuppression,
    //             sampleSize
    //           }
    //         }
    //       );
    //       ([track] = stream.getAudioTracks());
    //       const { deviceId: trackDeviceId } = track.getSettings();
    //       store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));
    //       this._micProducer = await this._sendTransport.produce(
    //         {
    //           track,
    //           codecOptions:
    //           {
    //             opusStereo,
    //             opusDtx,
    //             opusFec,
    //             opusPtime,
    //             opusMaxPlaybackRate
    //           },
    //           appData:
    //             { source: 'mic' }
    //         });
    //       store.dispatch(producerActions.addProducer(
    //         {
    //           id: this._micProducer.id,
    //           source: 'mic',
    //           paused: this._micProducer.paused,
    //           track: this._micProducer.track,
    //           rtpParameters: this._micProducer.rtpParameters,
    //           codec: this._micProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
    //         }));
    //       this._micProducer.on('transportclose', () => {
    //         this._micProducer = null;
    //       });
    //       this._micProducer.on('trackended', () => {
    //         store.dispatch(requestActions.notify(
    //           {
    //             type: 'error',
    //             text: intl.formatMessage({
    //               id: 'devices.microphoneDisconnected',
    //               defaultMessage: 'Microphone disconnected'
    //             })
    //           }));
    //         this.disableMic();
    //       });
    //       this._micProducer.volume = 0;
    //       this.connectLocalHark(track);
    //     }
    //     else if (this._micProducer) {
    //       ({ track } = this._micProducer);
    //       await track.applyConstraints(
    //         {
    //           sampleRate,
    //           channelCount,
    //           volume,
    //           autoGainControl,
    //           echoCancellation,
    //           noiseSuppression,
    //           sampleSize
    //         }
    //       );
    //       if (this._harkStream != null) {
    //         const [harkTrack] = this._harkStream.getAudioTracks();
    //         harkTrack && await harkTrack.applyConstraints(
    //           {
    //             sampleRate,
    //             channelCount,
    //             volume,
    //             autoGainControl,
    //             echoCancellation,
    //             noiseSuppression,
    //             sampleSize
    //           }
    //         );
    //       }
    //     }
    //     await this._updateAudioDevices();
    //   }
    //   catch (error) {
    //     logger.error('updateMic() [error:"%o"]', error);
    //     store.dispatch(requestActions.notify(
    //       {
    //         type: 'error',
    //         text: intl.formatMessage({
    //           id: 'devices.microphoneError',
    //           defaultMessage: 'An error occurred while accessing your microphone'
    //         })
    //       }));
    //     if (track)
    //       track.stop();
    //   }
    //   store.dispatch(meActions.setAudioInProgress(false));
    // }
    // async updateWebcam({
    //   init = false,
    //   start = false,
    //   restart = false,
    //   newDeviceId = null,
    //   newResolution = null,
    //   newFrameRate = null
    // } = {}) {
    //   logger.debug(
    //     'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
    //     start,
    //     restart,
    //     newDeviceId,
    //     newResolution,
    //     newFrameRate
    //   );
    //   let track;
    //   try {
    //     if (!this._mediasoupDevice.canProduce('video'))
    //       throw new Error('cannot produce video');
    //     if (newDeviceId && !restart)
    //       throw new Error('changing device requires restart');
    //     if (newDeviceId)
    //       store.dispatch(settingsActions.setSelectedWebcamDevice(newDeviceId));
    //     if (newResolution)
    //       store.dispatch(settingsActions.setVideoResolution(newResolution));
    //     if (newFrameRate)
    //       store.dispatch(settingsActions.setVideoFrameRate(newFrameRate));
    //     const { videoMuted } = store.getState().settings;
    //     if (init && videoMuted)
    //       return;
    //     else
    //       store.dispatch(settingsActions.setVideoMuted(false));
    //     store.dispatch(meActions.setWebcamInProgress(true));
    //     const deviceId = await this._getWebcamDeviceId();
    //     const device = this._webcams[deviceId];
    //     if (!device)
    //       throw new Error('no webcam devices');
    //     const {
    //       resolution,
    //       frameRate
    //     } = store.getState().settings;
    //     if (
    //       (restart && this._webcamProducer) ||
    //       start
    //     ) {
    //       if (this._webcamProducer)
    //         await this.disableWebcam();
    //       const stream = await navigator.mediaDevices.getUserMedia(
    //         {
    //           video:
    //           {
    //             deviceId: { ideal: deviceId },
    //             ...VIDEO_CONSTRAINS[resolution],
    //             frameRate
    //           }
    //         });
    //       ([track] = stream.getVideoTracks());
    //       const { deviceId: trackDeviceId } = track.getSettings();
    //       store.dispatch(settingsActions.setSelectedWebcamDevice(trackDeviceId));
    //       if (this._useSimulcast) {
    //         // If VP9 is the only available video codec then use SVC.
    //         const firstVideoCodec = this._mediasoupDevice
    //           .rtpCapabilities
    //           .codecs
    //           .find((c) => c.kind === 'video');
    //         let encodings;
    //         if (firstVideoCodec.mimeType.toLowerCase() === 'video/vp9')
    //           encodings = VIDEO_KSVC_ENCODINGS;
    //         else if ('simulcastEncodings' in window.config)
    //           encodings = window.config.simulcastEncodings;
    //         else
    //           encodings = VIDEO_SIMULCAST_ENCODINGS;
    //         this._webcamProducer = await this._sendTransport.produce(
    //           {
    //             track,
    //             encodings,
    //             codecOptions:
    //             {
    //               videoGoogleStartBitrate: 1000
    //             },
    //             appData:
    //             {
    //               source: 'webcam'
    //             }
    //           });
    //       }
    //       else {
    //         this._webcamProducer = await this._sendTransport.produce({
    //           track,
    //           appData:
    //           {
    //             source: 'webcam'
    //           }
    //         });
    //       }
    //       store.dispatch(producerActions.addProducer(
    //         {
    //           id: this._webcamProducer.id,
    //           source: 'webcam',
    //           paused: this._webcamProducer.paused,
    //           track: this._webcamProducer.track,
    //           rtpParameters: this._webcamProducer.rtpParameters,
    //           codec: this._webcamProducer.rtpParameters.codecs[0].mimeType.split('/')[1]
    //         }));
    //       this._webcamProducer.on('transportclose', () => {
    //         this._webcamProducer = null;
    //       });
    //       this._webcamProducer.on('trackended', () => {
    //         store.dispatch(requestActions.notify(
    //           {
    //             type: 'error',
    //             text: intl.formatMessage({
    //               id: 'devices.cameraDisconnected',
    //               defaultMessage: 'Camera disconnected'
    //             })
    //           }));
    //         this.disableWebcam();
    //       });
    //     }
    //     else if (this._webcamProducer) {
    //       ({ track } = this._webcamProducer);
    //       await track.applyConstraints(
    //         {
    //           ...VIDEO_CONSTRAINS[resolution],
    //           frameRate
    //         }
    //       );
    //       // Also change resolution of extra video producers
    //       for (const producer of this._extraVideoProducers.values()) {
    //         ({ track } = producer);
    //         await track.applyConstraints(
    //           {
    //             ...VIDEO_CONSTRAINS[resolution],
    //             frameRate
    //           }
    //         );
    //       }
    //     }
    //     await this._updateWebcams();
    //   }
    //   catch (error) {
    //     logger.error('updateWebcam() [error:"%o"]', error);
    //     store.dispatch(requestActions.notify(
    //       {
    //         type: 'error',
    //         text: intl.formatMessage({
    //           id: 'devices.cameraError',
    //           defaultMessage: 'An error occurred while accessing your camera'
    //         })
    //       }));
    //     if (track)
    //       track.stop();
    //   }
    //   store.dispatch(
    //     meActions.setWebcamInProgress(false));
    // }
    // async closeMeeting() {
    //   logger.debug('closeMeeting()');
    //   store.dispatch(
    //     roomActions.setCloseMeetingInProgress(true));
    //   try {
    //     await this.sendRequest('moderator:closeMeeting');
    //   }
    //   catch (error) {
    //     logger.error('closeMeeting() [error:"%o"]', error);
    //   }
    //   store.dispatch(
    //     roomActions.setCloseMeetingInProgress(false));
    // }
    // // type: mic/webcam/screen
    // // mute: true/false
    // async modifyPeerConsumer(peerId, type, mute) {
    //   logger.debug(
    //     'modifyPeerConsumer() [peerId:"%s", type:"%s"]',
    //     peerId,
    //     type
    //   );
    //   if (type === 'mic')
    //     store.dispatch(
    //       peerActions.setPeerAudioInProgress(peerId, true));
    //   else if (type === 'webcam')
    //     store.dispatch(
    //       peerActions.setPeerVideoInProgress(peerId, true));
    //   else if (type === 'screen')
    //     store.dispatch(
    //       peerActions.setPeerScreenInProgress(peerId, true));
    //   try {
    //     for (const consumer of this._consumers.values()) {
    //       if (consumer.appData.peerId === peerId && consumer.appData.source === type) {
    //         if (mute)
    //           await this._pauseConsumer(consumer);
    //         else
    //           await this._resumeConsumer(consumer);
    //       }
    //     }
    //   }
    //   catch (error) {
    //     logger.error('modifyPeerConsumer() [error:"%o"]', error);
    //   }
    //   if (type === 'mic')
    //     store.dispatch(
    //       peerActions.setPeerAudioInProgress(peerId, false));
    //   else if (type === 'webcam')
    //     store.dispatch(
    //       peerActions.setPeerVideoInProgress(peerId, false));
    //   else if (type === 'screen')
    //     store.dispatch(
    //       peerActions.setPeerScreenInProgress(peerId, false));
    // }
    // async _pauseConsumer(consumer) {
    //   logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);
    //   if (consumer.paused || consumer.closed)
    //     return;
    //   try {
    //     await this.sendRequest('pauseConsumer', { consumerId: consumer.id });
    //     consumer.pause();
    //     store.dispatch(
    //       consumerActions.setConsumerPaused(consumer.id, 'local'));
    //   }
    //   catch (error) {
    //     logger.error('_pauseConsumer() [error:"%o"]', error);
    //   }
    // }
    // async _resumeConsumer(consumer) {
    //   logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);
    //   if (!consumer.paused || consumer.closed)
    //     return;
    //   try {
    //     await this.sendRequest('resumeConsumer', { consumerId: consumer.id });
    //     consumer.resume();
    //     store.dispatch(
    //       consumerActions.setConsumerResumed(consumer.id, 'local'));
    //   }
    //   catch (error) {
    //     logger.error('_resumeConsumer() [error:"%o"]', error);
    //   }
    // }
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
}
RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(); };
RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return []; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQzs7QUFLM0MsSUFBSSxNQUFNLENBQUM7QUFFWCxJQUFJLGVBQWUsQ0FBQztBQUdwQixJQUFJLGNBQWMsRUFDakIsS0FBSyxFQUNMLFdBQVcsRUFDWCxnQkFBZ0IsQ0FBQztBQUdqQixJQUFJO0FBQ0osMkJBQTJCO0FBQzNCLGNBQWM7QUFDZCxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLElBQUk7QUFJTCxNQUFNLGdCQUFnQixHQUN0QjtJQUNDLEtBQUssRUFDTDtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7UUFDNUIsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELFFBQVEsRUFDUjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7UUFDNUIsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELE1BQU0sRUFDTjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELFVBQVUsRUFDVjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELE9BQU8sRUFDUDtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtDQUNELENBQUM7QUFFRixNQUFNLDBCQUEwQixHQUNoQztJQUNDLFFBQVEsRUFBRyxDQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFFO0NBQ2pDLENBQUM7QUFFRixNQUFNLHlCQUF5QixHQUMvQjtJ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QUFVO2VBQUM7Z0JBQ1YsVUFBVSxFQUFFLE1BQU07YUFDbkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSb29tMlNlcnZpY2UgfSBmcm9tICcuL3Jvb20yLnNlcnZpY2UnO1xuaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5cblxuXG5sZXQgc2F2ZUFzO1xuXG5sZXQgbWVkaWFzb3VwQ2xpZW50O1xuXG5cbmxldCByZXF1ZXN0VGltZW91dCxcblx0bGFzdE4sXG5cdG1vYmlsZUxhc3ROLFxuXHR2aWRlb0FzcGVjdFJhdGlvO1xuXG5cblx0Ly8ge1xuXHQvLyBcdHJlcXVlc3RUaW1lb3V0ID0gMjAwMDAsXG5cdC8vIFx0bGFzdE4gPSA0LFxuXHQvLyBcdG1vYmlsZUxhc3ROID0gMSxcblx0Ly8gXHR2aWRlb0FzcGVjdFJhdGlvID0gMS43NzcgLy8gMTYgOiA5XG5cdC8vIH1cblxuXG5cbmNvbnN0IFZJREVPX0NPTlNUUkFJTlMgPVxue1xuXHQnbG93JyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDMyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnbWVkaXVtJyA6XG5cdHtcblx0XHR3aWR0aCAgICAgICA6IHsgaWRlYWw6IDY0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQnaGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxMjgwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd2ZXJ5aGlnaCcgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAxOTIwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH0sXG5cdCd1bHRyYScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzODQwIH0sXG5cdFx0YXNwZWN0UmF0aW8gOiB2aWRlb0FzcGVjdFJhdGlvXG5cdH1cbn07XG5cbmNvbnN0IFBDX1BST1BSSUVUQVJZX0NPTlNUUkFJTlRTID1cbntcblx0b3B0aW9uYWwgOiBbIHsgZ29vZ0RzY3A6IHRydWUgfSBdXG59O1xuXG5jb25zdCBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDQsIG1heEJpdFJhdGU6IDEwMDAwMCB9LFxuXHR7IHNjYWxlUmVzb2x1dGlvbkRvd25CeTogMSwgbWF4Qml0UmF0ZTogMTIwMDAwMCB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgd2ViY2FtIHZpZGVvLlxuY29uc3QgVklERU9fS1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDNfS0VZJyB9XG5dO1xuXG4vLyBVc2VkIGZvciBWUDkgZGVza3RvcCBzaGFyaW5nLlxuY29uc3QgVklERU9fU1ZDX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGFiaWxpdHlNb2RlOiAnUzNUMycsIGR0eDogdHJ1ZSB9XG5dO1xuXG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0ICBjbGFzcyBSb29tU2VydmljZSB7XG5cblxuXG4gIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuICAvLyBUcmFuc3BvcnQgZm9yIHJlY2VpdmluZy5cbiAgX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gIF9jbG9zZWQgPSBmYWxzZTtcblxuICBfcHJvZHVjZSA9IHRydWU7XG5cbiAgX2ZvcmNlVGNwID0gZmFsc2U7XG5cbiAgX211dGVkXG4gIF9kZXZpY2VcbiAgX3BlZXJJZFxuICBfc291bmRBbGVydFxuICBfcm9vbUlkXG4gIF9tZWRpYXNvdXBEZXZpY2VcblxuICBfbWljUHJvZHVjZXJcbiAgX2hhcmtcbiAgX2hhcmtTdHJlYW1cbiAgX3dlYmNhbVByb2R1Y2VyXG4gIF9leHRyYVZpZGVvUHJvZHVjZXJzXG4gIF93ZWJjYW1zXG4gIF9hdWRpb0RldmljZXNcbiAgX2F1ZGlvT3V0cHV0RGV2aWNlc1xuICBfY29uc3VtZXJzXG5cblxuICBjb25zdHJ1Y3RvcigpIHtcblxuXG4gIH1cblxuICBpbml0KHtcbiAgICBwZWVySWQ9bnVsbCxcbiAgICBkZXZpY2U9IG51bGwsXG4gICAgcHJvZHVjZT10cnVlLFxuICAgIGZvcmNlVGNwPWZhbHNlLFxuICAgIG11dGVkPXRydWVcbiAgfSA9IHt9KSB7XG4gICAgaWYgKCFwZWVySWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcGVlcklkJyk7XG4gICAgZWxzZSBpZiAoIWRldmljZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBkZXZpY2UnKTtcblxuICAgIC8vIGxvZ2dlci5kZWJ1ZyhcbiAgICAvLyAgICdjb25zdHJ1Y3RvcigpIFtwZWVySWQ6IFwiJXNcIiwgZGV2aWNlOiBcIiVzXCIsIHByb2R1Y2U6IFwiJXNcIiwgZm9yY2VUY3A6IFwiJXNcIiwgZGlzcGxheU5hbWUgXCJcIl0nLFxuICAgIC8vICAgcGVlcklkLCBkZXZpY2UuZmxhZywgcHJvZHVjZSwgZm9yY2VUY3ApO1xuXG5cblxuXG4gICAgLy8gV2hldGhlciB3ZSBzaG91bGQgcHJvZHVjZS5cbiAgICB0aGlzLl9wcm9kdWNlID0gcHJvZHVjZTtcblxuICAgIC8vIFdoZXRoZXIgd2UgZm9yY2UgVENQXG4gICAgdGhpcy5fZm9yY2VUY3AgPSBmb3JjZVRjcDtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgc2ltdWxjYXN0IHNob3VsZCBiZSB1c2VkLlxuICAgIC8vIHRoaXMuX3VzZVNpbXVsY2FzdCA9IGZhbHNlO1xuXG4gICAgLy8gaWYgKCdzaW11bGNhc3QnIGluIHdpbmRvdy5jb25maWcpXG4gICAgLy8gICB0aGlzLl91c2VTaW11bGNhc3QgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdDtcblxuXG5cblxuXG4gICAgdGhpcy5fbXV0ZWQgPSBtdXRlZDtcblxuICAgIC8vIFRoaXMgZGV2aWNlXG4gICAgdGhpcy5fZGV2aWNlID0gZGV2aWNlO1xuXG4gICAgLy8gTXkgcGVlciBuYW1lLlxuICAgIHRoaXMuX3BlZXJJZCA9IHBlZXJJZDtcblxuXG5cbiAgICAvLyBBbGVydCBzb3VuZFxuICAgIHRoaXMuX3NvdW5kQWxlcnQgPSBuZXcgQXVkaW8oJy9zb3VuZHMvbm90aWZ5Lm1wMycpO1xuXG5cblxuXG4gICAgLy8gVGhlIHJvb20gSURcbiAgICB0aGlzLl9yb29tSWQgPSBudWxsO1xuXG4gICAgLy8gbWVkaWFzb3VwLWNsaWVudCBEZXZpY2UgaW5zdGFuY2UuXG4gICAgLy8gQHR5cGUge21lZGlhc291cENsaWVudC5EZXZpY2V9XG4gICAgdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbnVsbDtcblxuXG4gICAgLy8gVHJhbnNwb3J0IGZvciBzZW5kaW5nLlxuICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gICAgdGhpcy5fcmVjdlRyYW5zcG9ydCA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgbWVkaWFzb3VwIFByb2R1Y2VyLlxuICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcblxuICAgIC8vIExvY2FsIG1pYyBoYXJrXG4gICAgdGhpcy5faGFyayA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBNZWRpYVN0cmVhbSBmb3IgaGFya1xuICAgIHRoaXMuX2hhcmtTdHJlYW0gPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgd2ViY2FtIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBFeHRyYSB2aWRlb3MgYmVpbmcgcHJvZHVjZWRcbiAgICB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gTWFwIG9mIHdlYmNhbSBNZWRpYURldmljZUluZm9zIGluZGV4ZWQgYnkgZGV2aWNlSWQuXG4gICAgLy8gQHR5cGUge01hcDxTdHJpbmcsIE1lZGlhRGV2aWNlSW5mb3M+fVxuICAgIHRoaXMuX3dlYmNhbXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvRGV2aWNlcyA9IHt9O1xuXG4gICAgdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzID0ge307XG5cbiAgICAvLyBtZWRpYXNvdXAgQ29uc3VtZXJzLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBtZWRpYXNvdXBDbGllbnQuQ29uc3VtZXI+fVxuICAgIHRoaXMuX2NvbnN1bWVycyA9IG5ldyBNYXAoKTtcblxuXG4gICAgLy8gdGhpcy5fc3RhcnRLZXlMaXN0ZW5lcigpO1xuXG4gICAgLy8gdGhpcy5fc3RhcnREZXZpY2VzTGlzdGVuZXIoKTtcblxuICB9XG4gIC8vIGNsb3NlKCkge1xuICAvLyAgIGlmICh0aGlzLl9jbG9zZWQpXG4gIC8vICAgICByZXR1cm47XG5cbiAgLy8gICB0aGlzLl9jbG9zZWQgPSB0cnVlO1xuXG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdjbG9zZSgpJyk7XG5cbiAgLy8gICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuY2xvc2UoKTtcblxuICAvLyAgIC8vIENsb3NlIG1lZGlhc291cCBUcmFuc3BvcnRzLlxuICAvLyAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KVxuICAvLyAgICAgdGhpcy5fc2VuZFRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gIC8vICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpXG4gIC8vICAgICB0aGlzLl9yZWN2VHJhbnNwb3J0LmNsb3NlKCk7XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRSb29tU3RhdGUoJ2Nsb3NlZCcpKTtcblxuICAvLyAgIHdpbmRvdy5sb2NhdGlvbiA9IGAvJHt0aGlzLl9yb29tSWR9YDtcbiAgLy8gfVxuXG4gIC8vIF9zdGFydEtleUxpc3RlbmVyKCkge1xuICAvLyAgIC8vIEFkZCBrZXlkb3duIGV2ZW50IGxpc3RlbmVyIG9uIGRvY3VtZW50XG4gIC8vICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChldmVudCkgPT4ge1xuICAvLyAgICAgaWYgKGV2ZW50LnJlcGVhdCkgcmV0dXJuO1xuICAvLyAgICAgY29uc3Qga2V5ID0gU3RyaW5nLmZyb21DaGFyQ29kZShldmVudC53aGljaCk7XG5cbiAgLy8gICAgIGNvbnN0IHNvdXJjZSA9IGV2ZW50LnRhcmdldDtcblxuICAvLyAgICAgY29uc3QgZXhjbHVkZSA9IFsnaW5wdXQnLCAndGV4dGFyZWEnXTtcblxuICAvLyAgICAgaWYgKGV4Y2x1ZGUuaW5kZXhPZihzb3VyY2UudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSA9PT0gLTEpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdrZXlEb3duKCkgW2tleTpcIiVzXCJdJywga2V5KTtcblxuICAvLyAgICAgICBzd2l0Y2ggKGtleSkge1xuXG4gIC8vICAgICAgICAgLypcbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzcpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0UHJldkFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlIFN0cmluZy5mcm9tQ2hhckNvZGUoMzkpOlxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGNvbnN0IG5ld1BlZXJJZCA9IHRoaXMuX3Nwb3RsaWdodHMuZ2V0TmV4dEFzU2VsZWN0ZWQoXG4gIC8vICAgICAgICAgICAgIHN0b3JlLmdldFN0YXRlKCkucm9vbS5zZWxlY3RlZFBlZXJJZCk7XG5cbiAgLy8gICAgICAgICAgIGlmIChuZXdQZWVySWQpIHRoaXMuc2V0U2VsZWN0ZWRQZWVyKG5ld1BlZXJJZCk7XG4gIC8vICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICAgKi9cblxuXG4gIC8vICAgICAgICAgY2FzZSAnTSc6IC8vIFRvZ2dsZSBtaWNyb3Bob25lXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl9taWNQcm9kdWNlcikge1xuICAvLyAgICAgICAgICAgICAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkKSB7XG4gIC8vICAgICAgICAgICAgICAgICB0aGlzLm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ011dGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgICB9KSk7XG4gIC8vICAgICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy51bm11dGVNaWMoKTtcblxuICAvLyAgICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5tdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgfVxuICAvLyAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZU1pYyh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRW5hYmxlJyxcbiAgLy8gICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0VuYWJsZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdWJzogLy8gVG9nZ2xlIHZpZGVvXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGlmICh0aGlzLl93ZWJjYW1Qcm9kdWNlcilcbiAgLy8gICAgICAgICAgICAgICB0aGlzLmRpc2FibGVXZWJjYW0oKTtcbiAgLy8gICAgICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgICAgIHRoaXMudXBkYXRlV2ViY2FtKHsgc3RhcnQ6IHRydWUgfSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBjYXNlICdIJzogLy8gT3BlbiBoZWxwIGRpYWxvZ1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBzdG9yZS5kaXNwYXRjaChyb29tQWN0aW9ucy5zZXRIZWxwT3Blbih0cnVlKSk7XG5cbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG5cbiAgLy8gICAgICAgICBkZWZhdWx0OlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBicmVhaztcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuXG5cbiAgLy8gfVxuXG4gIC8vIF9zdGFydERldmljZXNMaXN0ZW5lcigpIHtcbiAgLy8gICBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLmFkZEV2ZW50TGlzdGVuZXIoJ2RldmljZWNoYW5nZScsIGFzeW5jICgpID0+IHtcbiAgLy8gICAgIGxvZ2dlci5kZWJ1ZygnX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCkgfCBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzLm9uZGV2aWNlY2hhbmdlJyk7XG5cbiAgLy8gICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvRGV2aWNlcygpO1xuICAvLyAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAvLyAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAge1xuICAvLyAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICBpZDogJ2RldmljZXMuZGV2aWNlc0NoYW5nZWQnLFxuICAvLyAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdZb3VyIGRldmljZXMgY2hhbmdlZCwgY29uZmlndXJlIHlvdXIgZGV2aWNlcyBpbiB0aGUgc2V0dGluZ3MgZGlhbG9nJ1xuICAvLyAgICAgICAgIH0pXG4gIC8vICAgICAgIH0pKTtcbiAgLy8gICB9KTtcbiAgLy8gfVxuXG5cbiAgLy8gX3NvdW5kTm90aWZpY2F0aW9uKCkge1xuICAvLyAgIGNvbnN0IHsgbm90aWZpY2F0aW9uU291bmRzIH0gPSBzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzO1xuXG4gIC8vICAgaWYgKG5vdGlmaWNhdGlvblNvdW5kcykge1xuICAvLyAgICAgY29uc3QgYWxlcnRQcm9taXNlID0gdGhpcy5fc291bmRBbGVydC5wbGF5KCk7XG5cbiAgLy8gICAgIGlmIChhbGVydFByb21pc2UgIT09IHVuZGVmaW5lZCkge1xuICAvLyAgICAgICBhbGVydFByb21pc2VcbiAgLy8gICAgICAgICAudGhlbigpXG4gIC8vICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAvLyAgICAgICAgICAgbG9nZ2VyLmVycm9yKCdfc291bmRBbGVydC5wbGF5KCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgICAgICAgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gdGltZW91dENhbGxiYWNrKGNhbGxiYWNrKSB7XG4gIC8vICAgbGV0IGNhbGxlZCA9IGZhbHNlO1xuXG4gIC8vICAgY29uc3QgaW50ZXJ2YWwgPSBzZXRUaW1lb3V0KFxuICAvLyAgICAgKCkgPT4ge1xuICAvLyAgICAgICBpZiAoY2FsbGVkKVxuICAvLyAgICAgICAgIHJldHVybjtcbiAgLy8gICAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgLy8gICAgICAgY2FsbGJhY2sobmV3IFNvY2tldFRpbWVvdXRFcnJvcignUmVxdWVzdCB0aW1lZCBvdXQnKSk7XG4gIC8vICAgICB9LFxuICAvLyAgICAgcmVxdWVzdFRpbWVvdXRcbiAgLy8gICApO1xuXG4gIC8vICAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gIC8vICAgICBpZiAoY2FsbGVkKVxuICAvLyAgICAgICByZXR1cm47XG4gIC8vICAgICBjYWxsZWQgPSB0cnVlO1xuICAvLyAgICAgY2xlYXJUaW1lb3V0KGludGVydmFsKTtcblxuICAvLyAgICAgY2FsbGJhY2soLi4uYXJncyk7XG4gIC8vICAgfTtcbiAgLy8gfVxuXG4gIC8vIF9zZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpIHtcbiAgLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAvLyAgICAgaWYgKCF0aGlzLl9zaWduYWxpbmdTb2NrZXQpIHtcbiAgLy8gICAgICAgcmVqZWN0KCdObyBzb2NrZXQgY29ubmVjdGlvbicpO1xuICAvLyAgICAgfVxuICAvLyAgICAgZWxzZSB7XG4gIC8vICAgICAgIHRoaXMuX3NpZ25hbGluZ1NvY2tldC5lbWl0KFxuICAvLyAgICAgICAgICdyZXF1ZXN0JyxcbiAgLy8gICAgICAgICB7IG1ldGhvZCwgZGF0YSB9LFxuICAvLyAgICAgICAgIHRoaXMudGltZW91dENhbGxiYWNrKChlcnIsIHJlc3BvbnNlKSA9PiB7XG4gIC8vICAgICAgICAgICBpZiAoZXJyKVxuICAvLyAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgLy8gICAgICAgICAgIGVsc2VcbiAgLy8gICAgICAgICAgICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gIC8vICAgICAgICAgfSlcbiAgLy8gICAgICAgKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gfVxuXG4gIC8vIGFzeW5jIGdldFRyYW5zcG9ydFN0YXRzKCkge1xuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAodGhpcy5fcmVjdlRyYW5zcG9ydCkge1xuICAvLyAgICAgICBsb2dnZXIuZGVidWcoJ2dldFRyYW5zcG9ydFN0YXRzKCkgLSByZWN2IFt0cmFuc3BvcnRJZDogXCIlc1wiXScsIHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQpO1xuXG4gIC8vICAgICAgIGNvbnN0IHJlY3YgPSBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdnZXRUcmFuc3BvcnRTdGF0cycsIHsgdHJhbnNwb3J0SWQ6IHRoaXMuX3JlY3ZUcmFuc3BvcnQuaWQgfSk7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgICAgdHJhbnNwb3J0QWN0aW9ucy5hZGRUcmFuc3BvcnRTdGF0cyhyZWN2LCAncmVjdicpKTtcbiAgLy8gICAgIH1cblxuICAvLyAgICAgaWYgKHRoaXMuX3NlbmRUcmFuc3BvcnQpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdnZXRUcmFuc3BvcnRTdGF0cygpIC0gc2VuZCBbdHJhbnNwb3J0SWQ6IFwiJXNcIl0nLCB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkKTtcblxuICAvLyAgICAgICBjb25zdCBzZW5kID0gYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0VHJhbnNwb3J0U3RhdHMnLCB7IHRyYW5zcG9ydElkOiB0aGlzLl9zZW5kVHJhbnNwb3J0LmlkIH0pO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICAgIHRyYW5zcG9ydEFjdGlvbnMuYWRkVHJhbnNwb3J0U3RhdHMoc2VuZCwgJ3NlbmQnKSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdnZXRUcmFuc3BvcnRTdGF0cygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2VuZFJlcXVlc3QoKSBbbWV0aG9kOlwiJXNcIiwgZGF0YTpcIiVvXCJdJywgbWV0aG9kLCBkYXRhKTtcblxuICAvLyAgIGNvbnN0IHtcbiAgLy8gICAgIHJlcXVlc3RSZXRyaWVzID0gM1xuICAvLyAgIH0gPSB3aW5kb3cuY29uZmlnO1xuXG4gIC8vICAgZm9yIChsZXQgdHJpZXMgPSAwOyB0cmllcyA8IHJlcXVlc3RSZXRyaWVzOyB0cmllcysrKSB7XG4gIC8vICAgICB0cnkge1xuICAvLyAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5fc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgICBpZiAoXG4gIC8vICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBTb2NrZXRUaW1lb3V0RXJyb3IgJiZcbiAgLy8gICAgICAgICB0cmllcyA8IHJlcXVlc3RSZXRyaWVzXG4gIC8vICAgICAgIClcbiAgLy8gICAgICAgICBsb2dnZXIud2Fybignc2VuZFJlcXVlc3QoKSB8IHRpbWVvdXQsIHJldHJ5aW5nIFthdHRlbXB0OlwiJXNcIl0nLCB0cmllcyk7XG4gIC8vICAgICAgIGVsc2VcbiAgLy8gICAgICAgICB0aHJvdyBlcnJvcjtcbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vIH1cblxuXG5cblxuICAvLyBhc3luYyBtdXRlTWljKCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnbXV0ZU1pYygpJyk7XG5cbiAgLy8gICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZSgpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdwYXVzZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclBhdXNlZCh0aGlzLl9taWNQcm9kdWNlci5pZCkpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQodHJ1ZSkpO1xuXG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdtdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAge1xuICAvLyAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gIC8vICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lTXV0ZUVycm9yJyxcbiAgLy8gICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnVW5hYmxlIHRvIG11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgIH0pXG4gIC8vICAgICAgIH0pKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyB1bm11dGVNaWMoKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCd1bm11dGVNaWMoKScpO1xuXG4gIC8vICAgaWYgKCF0aGlzLl9taWNQcm9kdWNlcikge1xuICAvLyAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcbiAgLy8gICB9XG4gIC8vICAgZWxzZSB7XG4gIC8vICAgICB0aGlzLl9taWNQcm9kdWNlci5yZXN1bWUoKTtcblxuICAvLyAgICAgdHJ5IHtcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdChcbiAgLy8gICAgICAgICAncmVzdW1lUHJvZHVjZXInLCB7IHByb2R1Y2VySWQ6IHRoaXMuX21pY1Byb2R1Y2VyLmlkIH0pO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICAgIHByb2R1Y2VyQWN0aW9ucy5zZXRQcm9kdWNlclJlc3VtZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgICBzZXR0aW5nc0FjdGlvbnMuc2V0QXVkaW9NdXRlZChmYWxzZSkpO1xuXG4gIC8vICAgICB9XG4gIC8vICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmVycm9yKCd1bm11dGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgLy8gICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lVW5NdXRlRXJyb3InLFxuICAvLyAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byB1bm11dGUgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICB9KSk7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cblxuICAvLyBkaXNjb25uZWN0TG9jYWxIYXJrKCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnZGlzY29ubmVjdExvY2FsSGFyaygpJyk7XG5cbiAgLy8gICBpZiAodGhpcy5faGFya1N0cmVhbSAhPSBudWxsKSB7XG4gIC8vICAgICBsZXQgW3RyYWNrXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuICAvLyAgICAgdHJhY2suc3RvcCgpO1xuICAvLyAgICAgdHJhY2sgPSBudWxsO1xuXG4gIC8vICAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcbiAgLy8gICB9XG5cbiAgLy8gICBpZiAodGhpcy5faGFyayAhPSBudWxsKVxuICAvLyAgICAgdGhpcy5faGFyay5zdG9wKCk7XG4gIC8vIH1cblxuICAvLyBjb25uZWN0TG9jYWxIYXJrKHRyYWNrKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdjb25uZWN0TG9jYWxIYXJrKCkgW3RyYWNrOlwiJW9cIl0nLCB0cmFjayk7XG5cbiAgLy8gICB0aGlzLl9oYXJrU3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgLy8gICBjb25zdCBuZXdUcmFjayA9IHRyYWNrLmNsb25lKCk7XG5cbiAgLy8gICB0aGlzLl9oYXJrU3RyZWFtLmFkZFRyYWNrKG5ld1RyYWNrKTtcblxuICAvLyAgIG5ld1RyYWNrLmVuYWJsZWQgPSB0cnVlO1xuXG4gIC8vICAgdGhpcy5faGFyayA9IGhhcmsodGhpcy5faGFya1N0cmVhbSxcbiAgLy8gICAgIHtcbiAgLy8gICAgICAgcGxheTogZmFsc2UsXG4gIC8vICAgICAgIGludGVydmFsOiAxMCxcbiAgLy8gICAgICAgdGhyZXNob2xkOiBzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLm5vaXNlVGhyZXNob2xkLFxuICAvLyAgICAgICBoaXN0b3J5OiAxMDBcbiAgLy8gICAgIH0pO1xuXG4gIC8vICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lID0gLTEwMDtcblxuICAvLyAgIHRoaXMuX2hhcmsub24oJ3ZvbHVtZV9jaGFuZ2UnLCAodm9sdW1lKSA9PiB7XG4gIC8vICAgICAvLyBVcGRhdGUgb25seSBpZiB0aGVyZSBpcyBhIGJpZ2dlciBkaWZmXG4gIC8vICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIgJiYgTWF0aC5hYnModm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSA+IDAuNSkge1xuICAvLyAgICAgICAvLyBEZWNheSBjYWxjdWxhdGlvbjoga2VlcCBpbiBtaW5kIHRoYXQgdm9sdW1lIHJhbmdlIGlzIC0xMDAgLi4uIDAgKGRCKVxuICAvLyAgICAgICAvLyBUaGlzIG1ha2VzIGRlY2F5IHZvbHVtZSBmYXN0IGlmIGRpZmZlcmVuY2UgdG8gbGFzdCBzYXZlZCB2YWx1ZSBpcyBiaWdcbiAgLy8gICAgICAgLy8gYW5kIHNsb3cgZm9yIHNtYWxsIGNoYW5nZXMuIFRoaXMgcHJldmVudHMgZmxpY2tlcmluZyB2b2x1bWUgaW5kaWNhdG9yXG4gIC8vICAgICAgIC8vIGF0IGxvdyBsZXZlbHNcbiAgLy8gICAgICAgaWYgKHZvbHVtZSA8IHRoaXMuX2hhcmsubGFzdFZvbHVtZSkge1xuICAvLyAgICAgICAgIHZvbHVtZSA9XG4gIC8vICAgICAgICAgICB0aGlzLl9oYXJrLmxhc3RWb2x1bWUgLVxuICAvLyAgICAgICAgICAgTWF0aC5wb3coXG4gIC8vICAgICAgICAgICAgICh2b2x1bWUgLSB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpIC9cbiAgLy8gICAgICAgICAgICAgKDEwMCArIHRoaXMuX2hhcmsubGFzdFZvbHVtZSlcbiAgLy8gICAgICAgICAgICAgLCAyXG4gIC8vICAgICAgICAgICApICogMTA7XG4gIC8vICAgICAgIH1cblxuICAvLyAgICAgICB0aGlzLl9oYXJrLmxhc3RWb2x1bWUgPSB2b2x1bWU7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2gocGVlclZvbHVtZUFjdGlvbnMuc2V0UGVlclZvbHVtZSh0aGlzLl9wZWVySWQsIHZvbHVtZSkpO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuXG4gIC8vICAgdGhpcy5faGFyay5vbignc3BlYWtpbmcnLCAoKSA9PiB7XG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0SXNTcGVha2luZyh0cnVlKSk7XG5cbiAgLy8gICAgIGlmIChcbiAgLy8gICAgICAgKHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3Mudm9pY2VBY3RpdmF0ZWRVbm11dGUgfHxcbiAgLy8gICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLm1lLmlzQXV0b011dGVkKSAmJlxuICAvLyAgICAgICB0aGlzLl9taWNQcm9kdWNlciAmJlxuICAvLyAgICAgICB0aGlzLl9taWNQcm9kdWNlci5wYXVzZWRcbiAgLy8gICAgIClcbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdXRvTXV0ZWQoZmFsc2UpKTsgLy8gc2FuaXR5IGFjdGlvblxuICAvLyAgIH0pO1xuXG4gIC8vICAgdGhpcy5faGFyay5vbignc3RvcHBlZF9zcGVha2luZycsICgpID0+IHtcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRJc1NwZWFraW5nKGZhbHNlKSk7XG5cbiAgLy8gICAgIGlmIChcbiAgLy8gICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy52b2ljZUFjdGl2YXRlZFVubXV0ZSAmJlxuICAvLyAgICAgICB0aGlzLl9taWNQcm9kdWNlciAmJlxuICAvLyAgICAgICAhdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG4gIC8vICAgICApIHtcbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKHRydWUpKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gfVxuXG4gIC8vIGFzeW5jIGNoYW5nZUF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtkZXZpY2VJZDpcIiVzXCJdJywgZGV2aWNlSWQpO1xuXG4gIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICBtZUFjdGlvbnMuc2V0QXVkaW9PdXRwdXRJblByb2dyZXNzKHRydWUpKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb091dHB1dERldmljZXNbZGV2aWNlSWRdO1xuXG4gIC8vICAgICBpZiAoIWRldmljZSlcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdTZWxlY3RlZCBhdWRpbyBvdXRwdXQgZGV2aWNlIG5vIGxvbmdlciBhdmFpbGFibGUnKTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9PdXRwdXREZXZpY2UoZGV2aWNlSWQpKTtcblxuICAvLyAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9PdXRwdXREZXZpY2VzKCk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdjaGFuZ2VBdWRpb091dHB1dERldmljZSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cblxuICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyhmYWxzZSkpO1xuICAvLyB9XG5cbiAgLy8gLy8gT25seSBGaXJlZm94IHN1cHBvcnRzIGFwcGx5Q29uc3RyYWludHMgdG8gYXVkaW8gdHJhY2tzXG4gIC8vIC8vIFNlZTpcbiAgLy8gLy8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9Nzk2OTY0XG4gIC8vIGFzeW5jIHVwZGF0ZU1pYyh7XG4gIC8vICAgc3RhcnQgPSBmYWxzZSxcbiAgLy8gICByZXN0YXJ0ID0gZmFsc2UgfHwgdGhpcy5fZGV2aWNlLmZsYWcgIT09ICdmaXJlZm94JyxcbiAgLy8gICBuZXdEZXZpY2VJZCA9IG51bGxcbiAgLy8gfSA9IHt9KSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ3VwZGF0ZU1pYygpIFtzdGFydDpcIiVzXCIsIHJlc3RhcnQ6XCIlc1wiLCBuZXdEZXZpY2VJZDpcIiVzXCJdJyxcbiAgLy8gICAgIHN0YXJ0LFxuICAvLyAgICAgcmVzdGFydCxcbiAgLy8gICAgIG5ld0RldmljZUlkXG4gIC8vICAgKTtcblxuICAvLyAgIGxldCB0cmFjaztcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCdhdWRpbycpKVxuICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIGF1ZGlvJyk7XG5cbiAgLy8gICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gIC8vICAgICBpZiAobmV3RGV2aWNlSWQpXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvRGV2aWNlKG5ld0RldmljZUlkKSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gIC8vICAgICBjb25zdCBkZXZpY2VJZCA9IGF3YWl0IHRoaXMuX2dldEF1ZGlvRGV2aWNlSWQoKTtcbiAgLy8gICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX2F1ZGlvRGV2aWNlc1tkZXZpY2VJZF07XG5cbiAgLy8gICAgIGlmICghZGV2aWNlKVxuICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGF1ZGlvIGRldmljZXMnKTtcblxuICAvLyAgICAgY29uc3Qge1xuICAvLyAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gIC8vICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gIC8vICAgICAgIG5vaXNlU3VwcHJlc3Npb25cbiAgLy8gICAgIH0gPSBzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzO1xuXG4gIC8vICAgICBpZiAoIXdpbmRvdy5jb25maWcuY2VudHJhbEF1ZGlvT3B0aW9ucykge1xuICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gIC8vICAgICAgICAgJ01pc3NpbmcgY2VudHJhbEF1ZGlvT3B0aW9ucyBmcm9tIGFwcCBjb25maWchIChTZWUgaXQgaW4gZXhhbXBsZSBjb25maWcuKSdcbiAgLy8gICAgICAgKTtcbiAgLy8gICAgIH1cblxuICAvLyAgICAgY29uc3Qge1xuICAvLyAgICAgICBzYW1wbGVSYXRlID0gOTYwMDAsXG4gIC8vICAgICAgIGNoYW5uZWxDb3VudCA9IDEsXG4gIC8vICAgICAgIHZvbHVtZSA9IDEuMCxcbiAgLy8gICAgICAgc2FtcGxlU2l6ZSA9IDE2LFxuICAvLyAgICAgICBvcHVzU3RlcmVvID0gZmFsc2UsXG4gIC8vICAgICAgIG9wdXNEdHggPSB0cnVlLFxuICAvLyAgICAgICBvcHVzRmVjID0gdHJ1ZSxcbiAgLy8gICAgICAgb3B1c1B0aW1lID0gMjAsXG4gIC8vICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGUgPSA5NjAwMFxuICAvLyAgICAgfSA9IHdpbmRvdy5jb25maWcuY2VudHJhbEF1ZGlvT3B0aW9ucztcblxuICAvLyAgICAgaWYgKFxuICAvLyAgICAgICAocmVzdGFydCAmJiB0aGlzLl9taWNQcm9kdWNlcikgfHxcbiAgLy8gICAgICAgc3RhcnRcbiAgLy8gICAgICkge1xuICAvLyAgICAgICB0aGlzLmRpc2Nvbm5lY3RMb2NhbEhhcmsoKTtcblxuICAvLyAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpXG4gIC8vICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlTWljKCk7XG5cbiAgLy8gICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgYXVkaW86IHtcbiAgLy8gICAgICAgICAgICAgZGV2aWNlSWQ6IHsgaWRlYWw6IGRldmljZUlkIH0sXG4gIC8vICAgICAgICAgICAgIHNhbXBsZVJhdGUsXG4gIC8vICAgICAgICAgICAgIGNoYW5uZWxDb3VudCxcbiAgLy8gICAgICAgICAgICAgdm9sdW1lLFxuICAvLyAgICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gIC8vICAgICAgICAgICAgIGVjaG9DYW5jZWxsYXRpb24sXG4gIC8vICAgICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gIC8vICAgICAgICAgICAgIHNhbXBsZVNpemVcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICk7XG5cbiAgLy8gICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0QXVkaW9UcmFja3MoKSk7XG5cbiAgLy8gICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgdHJhY2ssXG4gIC8vICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIG9wdXNTdGVyZW8sXG4gIC8vICAgICAgICAgICAgIG9wdXNEdHgsXG4gIC8vICAgICAgICAgICAgIG9wdXNGZWMsXG4gIC8vICAgICAgICAgICAgIG9wdXNQdGltZSxcbiAgLy8gICAgICAgICAgICAgb3B1c01heFBsYXliYWNrUmF0ZVxuICAvLyAgICAgICAgICAgfSxcbiAgLy8gICAgICAgICAgIGFwcERhdGE6XG4gIC8vICAgICAgICAgICAgIHsgc291cmNlOiAnbWljJyB9XG4gIC8vICAgICAgICAgfSk7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGlkOiB0aGlzLl9taWNQcm9kdWNlci5pZCxcbiAgLy8gICAgICAgICAgIHNvdXJjZTogJ21pYycsXG4gIC8vICAgICAgICAgICBwYXVzZWQ6IHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCxcbiAgLy8gICAgICAgICAgIHRyYWNrOiB0aGlzLl9taWNQcm9kdWNlci50cmFjayxcbiAgLy8gICAgICAgICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gIC8vICAgICAgICAgICBjb2RlYzogdGhpcy5fbWljUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAvLyAgICAgICAgIH0pKTtcblxuICAvLyAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gIC8vICAgICAgICAgdGhpcy5fbWljUHJvZHVjZXIgPSBudWxsO1xuICAvLyAgICAgICB9KTtcblxuICAvLyAgICAgICB0aGlzLl9taWNQcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgLy8gICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gIC8vICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVEaXNjb25uZWN0ZWQnLFxuICAvLyAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnTWljcm9waG9uZSBkaXNjb25uZWN0ZWQnXG4gIC8vICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICB9KSk7XG5cbiAgLy8gICAgICAgICB0aGlzLmRpc2FibGVNaWMoKTtcbiAgLy8gICAgICAgfSk7XG5cbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIudm9sdW1lID0gMDtcblxuICAvLyAgICAgICB0aGlzLmNvbm5lY3RMb2NhbEhhcmsodHJhY2spO1xuICAvLyAgICAgfVxuICAvLyAgICAgZWxzZSBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX21pY1Byb2R1Y2VyKTtcblxuICAvLyAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIHNhbXBsZVJhdGUsXG4gIC8vICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gIC8vICAgICAgICAgICB2b2x1bWUsXG4gIC8vICAgICAgICAgICBhdXRvR2FpbkNvbnRyb2wsXG4gIC8vICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAvLyAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgLy8gICAgICAgICAgIHNhbXBsZVNpemVcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICk7XG5cbiAgLy8gICAgICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAvLyAgICAgICAgIGNvbnN0IFtoYXJrVHJhY2tdID0gdGhpcy5faGFya1N0cmVhbS5nZXRBdWRpb1RyYWNrcygpO1xuXG4gIC8vICAgICAgICAgaGFya1RyYWNrICYmIGF3YWl0IGhhcmtUcmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAvLyAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gIC8vICAgICAgICAgICAgIHZvbHVtZSxcbiAgLy8gICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAvLyAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAvLyAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAvLyAgICAgICAgICAgICBzYW1wbGVTaXplXG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgICAgKTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuXG4gIC8vICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3VwZGF0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgIHtcbiAgLy8gICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAvLyAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVycm9yJyxcbiAgLy8gICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQW4gZXJyb3Igb2NjdXJyZWQgd2hpbGUgYWNjZXNzaW5nIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICB9KVxuICAvLyAgICAgICB9KSk7XG5cbiAgLy8gICAgIGlmICh0cmFjaylcbiAgLy8gICAgICAgdHJhY2suc3RvcCgpO1xuICAvLyAgIH1cblxuICAvLyAgIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRBdWRpb0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHVwZGF0ZVdlYmNhbSh7XG4gIC8vICAgaW5pdCA9IGZhbHNlLFxuICAvLyAgIHN0YXJ0ID0gZmFsc2UsXG4gIC8vICAgcmVzdGFydCA9IGZhbHNlLFxuICAvLyAgIG5ld0RldmljZUlkID0gbnVsbCxcbiAgLy8gICBuZXdSZXNvbHV0aW9uID0gbnVsbCxcbiAgLy8gICBuZXdGcmFtZVJhdGUgPSBudWxsXG4gIC8vIH0gPSB7fSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICd1cGRhdGVXZWJjYW0oKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiLCBuZXdSZXNvbHV0aW9uOlwiJXNcIiwgbmV3RnJhbWVSYXRlOlwiJXNcIl0nLFxuICAvLyAgICAgc3RhcnQsXG4gIC8vICAgICByZXN0YXJ0LFxuICAvLyAgICAgbmV3RGV2aWNlSWQsXG4gIC8vICAgICBuZXdSZXNvbHV0aW9uLFxuICAvLyAgICAgbmV3RnJhbWVSYXRlXG4gIC8vICAgKTtcblxuICAvLyAgIGxldCB0cmFjaztcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAoIXRoaXMuX21lZGlhc291cERldmljZS5jYW5Qcm9kdWNlKCd2aWRlbycpKVxuICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Nhbm5vdCBwcm9kdWNlIHZpZGVvJyk7XG5cbiAgLy8gICAgIGlmIChuZXdEZXZpY2VJZCAmJiAhcmVzdGFydClcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdjaGFuZ2luZyBkZXZpY2UgcmVxdWlyZXMgcmVzdGFydCcpO1xuXG4gIC8vICAgICBpZiAobmV3RGV2aWNlSWQpXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gIC8vICAgICBpZiAobmV3UmVzb2x1dGlvbilcbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFZpZGVvUmVzb2x1dGlvbihuZXdSZXNvbHV0aW9uKSk7XG5cbiAgLy8gICAgIGlmIChuZXdGcmFtZVJhdGUpXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb0ZyYW1lUmF0ZShuZXdGcmFtZVJhdGUpKTtcblxuICAvLyAgICAgY29uc3QgeyB2aWRlb011dGVkIH0gPSBzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzO1xuXG4gIC8vICAgICBpZiAoaW5pdCAmJiB2aWRlb011dGVkKVxuICAvLyAgICAgICByZXR1cm47XG4gIC8vICAgICBlbHNlXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb011dGVkKGZhbHNlKSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKHRydWUpKTtcblxuICAvLyAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRXZWJjYW1EZXZpY2VJZCgpO1xuICAvLyAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fd2ViY2Ftc1tkZXZpY2VJZF07XG5cbiAgLy8gICAgIGlmICghZGV2aWNlKVxuICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIHdlYmNhbSBkZXZpY2VzJyk7XG5cbiAgLy8gICAgIGNvbnN0IHtcbiAgLy8gICAgICAgcmVzb2x1dGlvbixcbiAgLy8gICAgICAgZnJhbWVSYXRlXG4gIC8vICAgICB9ID0gc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncztcblxuICAvLyAgICAgaWYgKFxuICAvLyAgICAgICAocmVzdGFydCAmJiB0aGlzLl93ZWJjYW1Qcm9kdWNlcikgfHxcbiAgLy8gICAgICAgc3RhcnRcbiAgLy8gICAgICkge1xuICAvLyAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgICAgYXdhaXQgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG5cbiAgLy8gICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoXG4gIC8vICAgICAgICAge1xuICAvLyAgICAgICAgICAgdmlkZW86XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAvLyAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAvLyAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgICB9KTtcblxuICAvLyAgICAgICAoW3RyYWNrXSA9IHN0cmVhbS5nZXRWaWRlb1RyYWNrcygpKTtcblxuICAvLyAgICAgICBjb25zdCB7IGRldmljZUlkOiB0cmFja0RldmljZUlkIH0gPSB0cmFjay5nZXRTZXR0aW5ncygpO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZFdlYmNhbURldmljZSh0cmFja0RldmljZUlkKSk7XG5cbiAgLy8gICAgICAgaWYgKHRoaXMuX3VzZVNpbXVsY2FzdCkge1xuICAvLyAgICAgICAgIC8vIElmIFZQOSBpcyB0aGUgb25seSBhdmFpbGFibGUgdmlkZW8gY29kZWMgdGhlbiB1c2UgU1ZDLlxuICAvLyAgICAgICAgIGNvbnN0IGZpcnN0VmlkZW9Db2RlYyA9IHRoaXMuX21lZGlhc291cERldmljZVxuICAvLyAgICAgICAgICAgLnJ0cENhcGFiaWxpdGllc1xuICAvLyAgICAgICAgICAgLmNvZGVjc1xuICAvLyAgICAgICAgICAgLmZpbmQoKGMpID0+IGMua2luZCA9PT0gJ3ZpZGVvJyk7XG5cbiAgLy8gICAgICAgICBsZXQgZW5jb2RpbmdzO1xuXG4gIC8vICAgICAgICAgaWYgKGZpcnN0VmlkZW9Db2RlYy5taW1lVHlwZS50b0xvd2VyQ2FzZSgpID09PSAndmlkZW8vdnA5JylcbiAgLy8gICAgICAgICAgIGVuY29kaW5ncyA9IFZJREVPX0tTVkNfRU5DT0RJTkdTO1xuICAvLyAgICAgICAgIGVsc2UgaWYgKCdzaW11bGNhc3RFbmNvZGluZ3MnIGluIHdpbmRvdy5jb25maWcpXG4gIC8vICAgICAgICAgICBlbmNvZGluZ3MgPSB3aW5kb3cuY29uZmlnLnNpbXVsY2FzdEVuY29kaW5ncztcbiAgLy8gICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19TSU1VTENBU1RfRU5DT0RJTkdTO1xuXG4gIC8vICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBhd2FpdCB0aGlzLl9zZW5kVHJhbnNwb3J0LnByb2R1Y2UoXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHRyYWNrLFxuICAvLyAgICAgICAgICAgICBlbmNvZGluZ3MsXG4gIC8vICAgICAgICAgICAgIGNvZGVjT3B0aW9uczpcbiAgLy8gICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgIHZpZGVvR29vZ2xlU3RhcnRCaXRyYXRlOiAxMDAwXG4gIC8vICAgICAgICAgICAgIH0sXG4gIC8vICAgICAgICAgICAgIGFwcERhdGE6XG4gIC8vICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nXG4gIC8vICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgIH0pO1xuICAvLyAgICAgICB9XG4gIC8vICAgICAgIGVsc2Uge1xuICAvLyAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKHtcbiAgLy8gICAgICAgICAgIHRyYWNrLFxuICAvLyAgICAgICAgICAgYXBwRGF0YTpcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICAgIH0pO1xuICAvLyAgICAgICB9XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2gocHJvZHVjZXJBY3Rpb25zLmFkZFByb2R1Y2VyKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGlkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5pZCxcbiAgLy8gICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbScsXG4gIC8vICAgICAgICAgICBwYXVzZWQ6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnBhdXNlZCxcbiAgLy8gICAgICAgICAgIHRyYWNrOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci50cmFjayxcbiAgLy8gICAgICAgICAgIHJ0cFBhcmFtZXRlcnM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMsXG4gIC8vICAgICAgICAgICBjb2RlYzogdGhpcy5fd2ViY2FtUHJvZHVjZXIucnRwUGFyYW1ldGVycy5jb2RlY3NbMF0ubWltZVR5cGUuc3BsaXQoJy8nKVsxXVxuICAvLyAgICAgICAgIH0pKTtcblxuICAvLyAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhbnNwb3J0Y2xvc2UnLCAoKSA9PiB7XG4gIC8vICAgICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuICAvLyAgICAgICB9KTtcblxuICAvLyAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlci5vbigndHJhY2tlbmRlZCcsICgpID0+IHtcbiAgLy8gICAgICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gIC8vICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgaWQ6ICdkZXZpY2VzLmNhbWVyYURpc2Nvbm5lY3RlZCcsXG4gIC8vICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdDYW1lcmEgZGlzY29ubmVjdGVkJ1xuICAvLyAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgfSkpO1xuXG4gIC8vICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gIC8vICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgICAgZWxzZSBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgKHsgdHJhY2sgfSA9IHRoaXMuX3dlYmNhbVByb2R1Y2VyKTtcblxuICAvLyAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gIC8vICAgICAgICAgICBmcmFtZVJhdGVcbiAgLy8gICAgICAgICB9XG4gIC8vICAgICAgICk7XG5cbiAgLy8gICAgICAgLy8gQWxzbyBjaGFuZ2UgcmVzb2x1dGlvbiBvZiBleHRyYSB2aWRlbyBwcm9kdWNlcnNcbiAgLy8gICAgICAgZm9yIChjb25zdCBwcm9kdWNlciBvZiB0aGlzLl9leHRyYVZpZGVvUHJvZHVjZXJzLnZhbHVlcygpKSB7XG4gIC8vICAgICAgICAgKHsgdHJhY2sgfSA9IHByb2R1Y2VyKTtcblxuICAvLyAgICAgICAgIGF3YWl0IHRyYWNrLmFwcGx5Q29uc3RyYWludHMoXG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIC4uLlZJREVPX0NPTlNUUkFJTlNbcmVzb2x1dGlvbl0sXG4gIC8vICAgICAgICAgICAgIGZyYW1lUmF0ZVxuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICAgICk7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cblxuICAvLyAgICAgYXdhaXQgdGhpcy5fdXBkYXRlV2ViY2FtcygpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcigndXBkYXRlV2ViY2FtKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAge1xuICAvLyAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gIC8vICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFFcnJvcicsXG4gIC8vICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIGNhbWVyYSdcbiAgLy8gICAgICAgICB9KVxuICAvLyAgICAgICB9KSk7XG5cbiAgLy8gICAgIGlmICh0cmFjaylcbiAgLy8gICAgICAgdHJhY2suc3RvcCgpO1xuICAvLyAgIH1cblxuICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgbWVBY3Rpb25zLnNldFdlYmNhbUluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgLy8gfVxuXG4gIC8vIGFzeW5jIGNsb3NlTWVldGluZygpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ2Nsb3NlTWVldGluZygpJyk7XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3ModHJ1ZSkpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ21vZGVyYXRvcjpjbG9zZU1lZXRpbmcnKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ2Nsb3NlTWVldGluZygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cblxuICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgcm9vbUFjdGlvbnMuc2V0Q2xvc2VNZWV0aW5nSW5Qcm9ncmVzcyhmYWxzZSkpO1xuICAvLyB9XG5cbiAgLy8gLy8gdHlwZTogbWljL3dlYmNhbS9zY3JlZW5cbiAgLy8gLy8gbXV0ZTogdHJ1ZS9mYWxzZVxuICAvLyBhc3luYyBtb2RpZnlQZWVyQ29uc3VtZXIocGVlcklkLCB0eXBlLCBtdXRlKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKFxuICAvLyAgICAgJ21vZGlmeVBlZXJDb25zdW1lcigpIFtwZWVySWQ6XCIlc1wiLCB0eXBlOlwiJXNcIl0nLFxuICAvLyAgICAgcGVlcklkLFxuICAvLyAgICAgdHlwZVxuICAvLyAgICk7XG5cbiAgLy8gICBpZiAodHlwZSA9PT0gJ21pYycpXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgLy8gICBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuICAvLyAgIGVsc2UgaWYgKHR5cGUgPT09ICdzY3JlZW4nKVxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIHBlZXJBY3Rpb25zLnNldFBlZXJTY3JlZW5JblByb2dyZXNzKHBlZXJJZCwgdHJ1ZSkpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGZvciAoY29uc3QgY29uc3VtZXIgb2YgdGhpcy5fY29uc3VtZXJzLnZhbHVlcygpKSB7XG4gIC8vICAgICAgIGlmIChjb25zdW1lci5hcHBEYXRhLnBlZXJJZCA9PT0gcGVlcklkICYmIGNvbnN1bWVyLmFwcERhdGEuc291cmNlID09PSB0eXBlKSB7XG4gIC8vICAgICAgICAgaWYgKG11dGUpXG4gIC8vICAgICAgICAgICBhd2FpdCB0aGlzLl9wYXVzZUNvbnN1bWVyKGNvbnN1bWVyKTtcbiAgLy8gICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICBhd2FpdCB0aGlzLl9yZXN1bWVDb25zdW1lcihjb25zdW1lcik7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ21vZGlmeVBlZXJDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cblxuICAvLyAgIGlmICh0eXBlID09PSAnbWljJylcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyQXVkaW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgLy8gICBlbHNlIGlmICh0eXBlID09PSAnd2ViY2FtJylcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyVmlkZW9JblByb2dyZXNzKHBlZXJJZCwgZmFsc2UpKTtcbiAgLy8gICBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gIC8vIH1cblxuICAvLyBhc3luYyBfcGF1c2VDb25zdW1lcihjb25zdW1lcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnX3BhdXNlQ29uc3VtZXIoKSBbY29uc3VtZXI6XCIlb1wiXScsIGNvbnN1bWVyKTtcblxuICAvLyAgIGlmIChjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAvLyAgICAgcmV0dXJuO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3BhdXNlQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gIC8vICAgICBjb25zdW1lci5wYXVzZSgpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUGF1c2VkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdfcGF1c2VDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIF9yZXN1bWVDb25zdW1lcihjb25zdW1lcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnX3Jlc3VtZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgLy8gICBpZiAoIWNvbnN1bWVyLnBhdXNlZCB8fCBjb25zdW1lci5jbG9zZWQpXG4gIC8vICAgICByZXR1cm47XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgncmVzdW1lQ29uc3VtZXInLCB7IGNvbnN1bWVySWQ6IGNvbnN1bWVyLmlkIH0pO1xuXG4gIC8vICAgICBjb25zdW1lci5yZXN1bWUoKTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclJlc3VtZWQoY29uc3VtZXIuaWQsICdsb2NhbCcpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ19yZXN1bWVDb25zdW1lcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKCkgW3NwYXRpYWxMYXllcjpcIiVzXCJdJywgc3BhdGlhbExheWVyKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgICAgaWYgKHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlcilcbiAgLy8gICAgICAgYXdhaXQgdGhpcy5fc2NyZWVuU2hhcmluZ1Byb2R1Y2VyLnNldE1heFNwYXRpYWxMYXllcihzcGF0aWFsTGF5ZXIpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtjb25zdW1lcklkOlwiJXNcIiwgc3BhdGlhbExheWVyOlwiJXNcIiwgdGVtcG9yYWxMYXllcjpcIiVzXCJdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdChcbiAgLy8gICAgICAgJ3NldENvbnN1bWVyUHJlZmVyZWRMYXllcnMnLCB7IGNvbnN1bWVySWQsIHNwYXRpYWxMYXllciwgdGVtcG9yYWxMYXllciB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKFxuICAvLyAgICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJlZmVycmVkTGF5ZXJzKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdzZXRDb25zdW1lclByaW9yaXR5KCkgW2NvbnN1bWVySWQ6XCIlc1wiLCBwcmlvcml0eTolZF0nLFxuICAvLyAgICAgY29uc3VtZXJJZCwgcHJpb3JpdHkpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3NldENvbnN1bWVyUHJpb3JpdHknLCB7IGNvbnN1bWVySWQsIHByaW9yaXR5IH0pO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJQcmlvcml0eShjb25zdW1lcklkLCBwcmlvcml0eSkpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHJlcXVlc3RDb25zdW1lcktleUZyYW1lKGNvbnN1bWVySWQpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2NvbnN1bWVySWQ6XCIlc1wiXScsIGNvbnN1bWVySWQpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lJywgeyBjb25zdW1lcklkIH0pO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcigncmVxdWVzdENvbnN1bWVyS2V5RnJhbWUoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuXG5cblxuICBhc3luYyBqb2luKHsgcm9vbUlkLCBqb2luVmlkZW8sIGpvaW5BdWRpbyB9KSB7XG5cblxuICAgIHRoaXMuX3Jvb21JZCA9IHJvb21JZDtcblxuXG4gICAgLy8gaW5pdGlhbGl6ZSBzaWduYWxpbmcgc29ja2V0XG4gICAgLy8gbGlzdGVuIHRvIHNvY2tldCBldmVudHNcblxuICAgIC8vIG9uIHJvb20gcmVhZHkgam9pbiByb29tIF9qb2luUm9vbVxuXG4gICAgLy8gdGhpcy5fbWVkaWFzb3VwRGV2aWNlID0gbmV3IG1lZGlhc291cENsaWVudC5EZXZpY2UoKTtcblxuICAgIC8vIGNvbnN0IHJvdXRlclJ0cENhcGFiaWxpdGllcyA9XG4gICAgLy8gICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdnZXRSb3V0ZXJSdHBDYXBhYmlsaXRpZXMnKTtcblxuICAgIC8vIHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zID0gcm91dGVyUnRwQ2FwYWJpbGl0aWVzLmhlYWRlckV4dGVuc2lvbnNcbiAgICAvLyAgIC5maWx0ZXIoKGV4dCkgPT4gZXh0LnVyaSAhPT0gJ3VybjozZ3BwOnZpZGVvLW9yaWVudGF0aW9uJyk7XG5cbiAgICAvLyBhd2FpdCB0aGlzLl9tZWRpYXNvdXBEZXZpY2UubG9hZCh7IHJvdXRlclJ0cENhcGFiaWxpdGllcyB9KTtcblxuICAgIC8vIGNyZWF0ZSBzZW5kIHRyYW5zcG9ydCBjcmVhdGVXZWJSdGNUcmFuc3BvcnQgdGhpcy5zaWduYWxpbmdTZXJ2aWNlLnNlbmRDcmVhdGVUcmFuc3BvcnRcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gY3JlYXRlIHJlY2VpdmUgdHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3JcbiAgICAvLyBsaXN0ZW4gdG8gdHJhbnNwb3J0IGV2ZW50c1xuXG4gICAgLy8gc2VuZCBqb2luIHJlcXVlc3RcblxuICAgIC8vIGFkZCBwZWVycyB0byBwZWVycyBzZXJ2aWNlXG5cbiAgICAvLyBwcm9kdWNlIHVwZGF0ZVdlYmNhbSB1cGRhdGVNaWNcbiAgfVxuXG5cbn1cbiJdfQ==
import { __awaiter, __generator } from "tslib";
import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
var saveAs;
var mediasoupClient;
var requestTimeout, lastN, mobileLastN, videoAspectRatio;
// {
// 	requestTimeout = 20000,
// 	lastN = 4,
// 	mobileLastN = 1,
// 	videoAspectRatio = 1.777 // 16 : 9
// }
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
    function RoomService() {
        // Transport for sending.
        this._sendTransport = null;
        // Transport for receiving.
        this._recvTransport = null;
        this._closed = false;
        this._produce = true;
        this._forceTcp = false;
    }
    RoomService.prototype.init = function (_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.peerId, peerId = _c === void 0 ? null : _c, _d = _b.device, device = _d === void 0 ? null : _d, _e = _b.produce, produce = _e === void 0 ? true : _e, _f = _b.forceTcp, forceTcp = _f === void 0 ? false : _f, _g = _b.muted, muted = _g === void 0 ? true : _g;
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
    };
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
    RoomService.prototype.join = function (_a) {
        var roomId = _a.roomId, joinVideo = _a.joinVideo, joinAudio = _a.joinAudio;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                this._roomId = roomId;
                return [2 /*return*/];
            });
        });
    };
    RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(); };
    RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
    return RoomService;
}());
export { RoomService };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return []; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQ0EsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGVBQWUsQ0FBQzs7QUFLM0MsSUFBSSxNQUFNLENBQUM7QUFFWCxJQUFJLGVBQWUsQ0FBQztBQUdwQixJQUFJLGNBQWMsRUFDakIsS0FBSyxFQUNMLFdBQVcsRUFDWCxnQkFBZ0IsQ0FBQztBQUdqQixJQUFJO0FBQ0osMkJBQTJCO0FBQzNCLGNBQWM7QUFDZCxvQkFBb0I7QUFDcEIsc0NBQXNDO0FBQ3RDLElBQUk7QUFJTCxJQUFNLGdCQUFnQixHQUN0QjtJQUNDLEtBQUssRUFDTDtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7UUFDNUIsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELFFBQVEsRUFDUjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7UUFDNUIsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELE1BQU0sRUFDTjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELFVBQVUsRUFDVjtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtJQUNELE9BQU8sRUFDUDtRQUNDLEtBQUssRUFBUyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxFQUFHLGdCQUFnQjtLQUM5QjtDQUNELENBQUM7QUFFRixJQUFNLDBCQUEwQixHQUNoQztJQUNDLFFBQVEsRUFBRyxDQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFFO0NBQ2pDLENBQUM7QUFFRixJQUFNLHlCQUF5QixHQUMvQjtJ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Z0NBQWdDO0lBQ2hDLHFFQUFxRTtJQUNyRSx1Q0FBdUM7SUFDdkMsNEVBQTRFO0lBQzVFLE1BQU07SUFDTixvQkFBb0I7SUFDcEIsdUVBQXVFO0lBQ3ZFLE1BQU07SUFDTixJQUFJO0lBRUosOEVBQThFO0lBQzlFLGtCQUFrQjtJQUNsQiwrRkFBK0Y7SUFDL0YsZ0RBQWdEO0lBRWhELFVBQVU7SUFDViw4QkFBOEI7SUFDOUIsbUZBQW1GO0lBRW5GLGlFQUFpRTtJQUNqRSxtREFBbUQ7SUFDbkQsTUFBTTtJQUNOLG9CQUFvQjtJQUNwQix3RUFBd0U7SUFDeEUsTUFBTTtJQUNOLElBQUk7SUFFSixvREFBb0Q7SUFDcEQsa0JBQWtCO0lBQ2xCLDhEQUE4RDtJQUM5RCw2QkFBNkI7SUFFN0IsVUFBVTtJQUNWLCtFQUErRTtJQUUvRSxpRkFBaUY7SUFDakYsTUFBTTtJQUNOLG9CQUFvQjtJQUNwQixpRUFBaUU7SUFDakUsTUFBTTtJQUNOLElBQUk7SUFFSiw4Q0FBOEM7SUFDOUMsNkVBQTZFO0lBRTdFLFVBQVU7SUFDVix5RUFBeUU7SUFDekUsTUFBTTtJQUNOLG9CQUFvQjtJQUNwQixxRUFBcUU7SUFDckUsTUFBTTtJQUNOLElBQUk7SUFLRSwwQkFBSSxHQUFWLFVBQVcsRUFBZ0M7WUFBOUIsa0JBQU0sRUFBRSx3QkFBUyxFQUFFLHdCQUFTOzs7Z0JBR3ZDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDOzs7O0tBNkJ2QjswRUF2bkNXLFdBQVc7dURBQVgsV0FBVyxXQUFYLFdBQVcsbUJBRlgsTUFBTTtzQkFoRnBCO0NBNHNDQyxBQTduQ0QsSUE2bkNDO1NBMW5DYSxXQUFXO2tEQUFYLFdBQVc7Y0FIeEIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUm9vbTJTZXJ2aWNlIH0gZnJvbSAnLi9yb29tMi5zZXJ2aWNlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuXG5cblxubGV0IHNhdmVBcztcblxubGV0IG1lZGlhc291cENsaWVudDtcblxuXG5sZXQgcmVxdWVzdFRpbWVvdXQsXG5cdGxhc3ROLFxuXHRtb2JpbGVMYXN0Tixcblx0dmlkZW9Bc3BlY3RSYXRpbztcblxuXG5cdC8vIHtcblx0Ly8gXHRyZXF1ZXN0VGltZW91dCA9IDIwMDAwLFxuXHQvLyBcdGxhc3ROID0gNCxcblx0Ly8gXHRtb2JpbGVMYXN0TiA9IDEsXG5cdC8vIFx0dmlkZW9Bc3BlY3RSYXRpbyA9IDEuNzc3IC8vIDE2IDogOVxuXHQvLyB9XG5cblxuXG5jb25zdCBWSURFT19DT05TVFJBSU5TID1cbntcblx0J2xvdycgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiAzMjAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J21lZGl1bScgOlxuXHR7XG5cdFx0d2lkdGggICAgICAgOiB7IGlkZWFsOiA2NDAgfSxcblx0XHRhc3BlY3RSYXRpbyA6IHZpZGVvQXNwZWN0UmF0aW9cblx0fSxcblx0J2hpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTI4MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndmVyeWhpZ2gnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMTkyMCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9LFxuXHQndWx0cmEnIDpcblx0e1xuXHRcdHdpZHRoICAgICAgIDogeyBpZGVhbDogMzg0MCB9LFxuXHRcdGFzcGVjdFJhdGlvIDogdmlkZW9Bc3BlY3RSYXRpb1xuXHR9XG59O1xuXG5jb25zdCBQQ19QUk9QUklFVEFSWV9DT05TVFJBSU5UUyA9XG57XG5cdG9wdGlvbmFsIDogWyB7IGdvb2dEc2NwOiB0cnVlIH0gXVxufTtcblxuY29uc3QgVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUyA9XG5bXG5cdHsgc2NhbGVSZXNvbHV0aW9uRG93bkJ5OiA0LCBtYXhCaXRSYXRlOiAxMDAwMDAgfSxcblx0eyBzY2FsZVJlc29sdXRpb25Eb3duQnk6IDEsIG1heEJpdFJhdGU6IDEyMDAwMDAgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IHdlYmNhbSB2aWRlby5cbmNvbnN0IFZJREVPX0tTVkNfRU5DT0RJTkdTID1cbltcblx0eyBzY2FsYWJpbGl0eU1vZGU6ICdTM1QzX0tFWScgfVxuXTtcblxuLy8gVXNlZCBmb3IgVlA5IGRlc2t0b3Agc2hhcmluZy5cbmNvbnN0IFZJREVPX1NWQ19FTkNPRElOR1MgPVxuW1xuXHR7IHNjYWxhYmlsaXR5TW9kZTogJ1MzVDMnLCBkdHg6IHRydWUgfVxuXTtcblxuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCAgY2xhc3MgUm9vbVNlcnZpY2Uge1xuXG5cblxuICAvLyBUcmFuc3BvcnQgZm9yIHNlbmRpbmcuXG4gIF9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcbiAgLy8gVHJhbnNwb3J0IGZvciByZWNlaXZpbmcuXG4gIF9yZWN2VHJhbnNwb3J0ID0gbnVsbDtcblxuICBfY2xvc2VkID0gZmFsc2U7XG5cbiAgX3Byb2R1Y2UgPSB0cnVlO1xuXG4gIF9mb3JjZVRjcCA9IGZhbHNlO1xuXG4gIF9tdXRlZFxuICBfZGV2aWNlXG4gIF9wZWVySWRcbiAgX3NvdW5kQWxlcnRcbiAgX3Jvb21JZFxuICBfbWVkaWFzb3VwRGV2aWNlXG5cbiAgX21pY1Byb2R1Y2VyXG4gIF9oYXJrXG4gIF9oYXJrU3RyZWFtXG4gIF93ZWJjYW1Qcm9kdWNlclxuICBfZXh0cmFWaWRlb1Byb2R1Y2Vyc1xuICBfd2ViY2Ftc1xuICBfYXVkaW9EZXZpY2VzXG4gIF9hdWRpb091dHB1dERldmljZXNcbiAgX2NvbnN1bWVyc1xuXG5cbiAgY29uc3RydWN0b3IoKSB7XG5cblxuICB9XG5cbiAgaW5pdCh7XG4gICAgcGVlcklkPW51bGwsXG4gICAgZGV2aWNlPSBudWxsLFxuICAgIHByb2R1Y2U9dHJ1ZSxcbiAgICBmb3JjZVRjcD1mYWxzZSxcbiAgICBtdXRlZD10cnVlXG4gIH0gPSB7fSkge1xuICAgIGlmICghcGVlcklkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHBlZXJJZCcpO1xuICAgIGVsc2UgaWYgKCFkZXZpY2UpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgZGV2aWNlJyk7XG5cbiAgICAvLyBsb2dnZXIuZGVidWcoXG4gICAgLy8gICAnY29uc3RydWN0b3IoKSBbcGVlcklkOiBcIiVzXCIsIGRldmljZTogXCIlc1wiLCBwcm9kdWNlOiBcIiVzXCIsIGZvcmNlVGNwOiBcIiVzXCIsIGRpc3BsYXlOYW1lIFwiXCJdJyxcbiAgICAvLyAgIHBlZXJJZCwgZGV2aWNlLmZsYWcsIHByb2R1Y2UsIGZvcmNlVGNwKTtcblxuXG5cblxuICAgIC8vIFdoZXRoZXIgd2Ugc2hvdWxkIHByb2R1Y2UuXG4gICAgdGhpcy5fcHJvZHVjZSA9IHByb2R1Y2U7XG5cbiAgICAvLyBXaGV0aGVyIHdlIGZvcmNlIFRDUFxuICAgIHRoaXMuX2ZvcmNlVGNwID0gZm9yY2VUY3A7XG5cblxuXG5cbiAgICAvLyBXaGV0aGVyIHNpbXVsY2FzdCBzaG91bGQgYmUgdXNlZC5cbiAgICAvLyB0aGlzLl91c2VTaW11bGNhc3QgPSBmYWxzZTtcblxuICAgIC8vIGlmICgnc2ltdWxjYXN0JyBpbiB3aW5kb3cuY29uZmlnKVxuICAgIC8vICAgdGhpcy5fdXNlU2ltdWxjYXN0ID0gd2luZG93LmNvbmZpZy5zaW11bGNhc3Q7XG5cblxuXG5cblxuICAgIHRoaXMuX211dGVkID0gbXV0ZWQ7XG5cbiAgICAvLyBUaGlzIGRldmljZVxuICAgIHRoaXMuX2RldmljZSA9IGRldmljZTtcblxuICAgIC8vIE15IHBlZXIgbmFtZS5cbiAgICB0aGlzLl9wZWVySWQgPSBwZWVySWQ7XG5cblxuXG4gICAgLy8gQWxlcnQgc291bmRcbiAgICB0aGlzLl9zb3VuZEFsZXJ0ID0gbmV3IEF1ZGlvKCcvc291bmRzL25vdGlmeS5tcDMnKTtcblxuXG5cblxuICAgIC8vIFRoZSByb29tIElEXG4gICAgdGhpcy5fcm9vbUlkID0gbnVsbDtcblxuICAgIC8vIG1lZGlhc291cC1jbGllbnQgRGV2aWNlIGluc3RhbmNlLlxuICAgIC8vIEB0eXBlIHttZWRpYXNvdXBDbGllbnQuRGV2aWNlfVxuICAgIHRoaXMuX21lZGlhc291cERldmljZSA9IG51bGw7XG5cblxuICAgIC8vIFRyYW5zcG9ydCBmb3Igc2VuZGluZy5cbiAgICB0aGlzLl9zZW5kVHJhbnNwb3J0ID0gbnVsbDtcblxuICAgIC8vIFRyYW5zcG9ydCBmb3IgcmVjZWl2aW5nLlxuICAgIHRoaXMuX3JlY3ZUcmFuc3BvcnQgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgbWljIG1lZGlhc291cCBQcm9kdWNlci5cbiAgICB0aGlzLl9taWNQcm9kdWNlciA9IG51bGw7XG5cbiAgICAvLyBMb2NhbCBtaWMgaGFya1xuICAgIHRoaXMuX2hhcmsgPSBudWxsO1xuXG4gICAgLy8gTG9jYWwgTWVkaWFTdHJlYW0gZm9yIGhhcmtcbiAgICB0aGlzLl9oYXJrU3RyZWFtID0gbnVsbDtcblxuICAgIC8vIExvY2FsIHdlYmNhbSBtZWRpYXNvdXAgUHJvZHVjZXIuXG4gICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIgPSBudWxsO1xuXG4gICAgLy8gRXh0cmEgdmlkZW9zIGJlaW5nIHByb2R1Y2VkXG4gICAgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2VycyA9IG5ldyBNYXAoKTtcblxuICAgIC8vIE1hcCBvZiB3ZWJjYW0gTWVkaWFEZXZpY2VJbmZvcyBpbmRleGVkIGJ5IGRldmljZUlkLlxuICAgIC8vIEB0eXBlIHtNYXA8U3RyaW5nLCBNZWRpYURldmljZUluZm9zPn1cbiAgICB0aGlzLl93ZWJjYW1zID0ge307XG5cbiAgICB0aGlzLl9hdWRpb0RldmljZXMgPSB7fTtcblxuICAgIHRoaXMuX2F1ZGlvT3V0cHV0RGV2aWNlcyA9IHt9O1xuXG4gICAgLy8gbWVkaWFzb3VwIENvbnN1bWVycy5cbiAgICAvLyBAdHlwZSB7TWFwPFN0cmluZywgbWVkaWFzb3VwQ2xpZW50LkNvbnN1bWVyPn1cbiAgICB0aGlzLl9jb25zdW1lcnMgPSBuZXcgTWFwKCk7XG5cblxuICAgIC8vIHRoaXMuX3N0YXJ0S2V5TGlzdGVuZXIoKTtcblxuICAgIC8vIHRoaXMuX3N0YXJ0RGV2aWNlc0xpc3RlbmVyKCk7XG5cbiAgfVxuICAvLyBjbG9zZSgpIHtcbiAgLy8gICBpZiAodGhpcy5fY2xvc2VkKVxuICAvLyAgICAgcmV0dXJuO1xuXG4gIC8vICAgdGhpcy5fY2xvc2VkID0gdHJ1ZTtcblxuICAvLyAgIGxvZ2dlci5kZWJ1ZygnY2xvc2UoKScpO1xuXG4gIC8vICAgdGhpcy5fc2lnbmFsaW5nU29ja2V0LmNsb3NlKCk7XG5cbiAgLy8gICAvLyBDbG9zZSBtZWRpYXNvdXAgVHJhbnNwb3J0cy5cbiAgLy8gICBpZiAodGhpcy5fc2VuZFRyYW5zcG9ydClcbiAgLy8gICAgIHRoaXMuX3NlbmRUcmFuc3BvcnQuY2xvc2UoKTtcblxuICAvLyAgIGlmICh0aGlzLl9yZWN2VHJhbnNwb3J0KVxuICAvLyAgICAgdGhpcy5fcmVjdlRyYW5zcG9ydC5jbG9zZSgpO1xuXG4gIC8vICAgc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0Um9vbVN0YXRlKCdjbG9zZWQnKSk7XG5cbiAgLy8gICB3aW5kb3cubG9jYXRpb24gPSBgLyR7dGhpcy5fcm9vbUlkfWA7XG4gIC8vIH1cblxuICAvLyBfc3RhcnRLZXlMaXN0ZW5lcigpIHtcbiAgLy8gICAvLyBBZGQga2V5ZG93biBldmVudCBsaXN0ZW5lciBvbiBkb2N1bWVudFxuICAvLyAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgLy8gICAgIGlmIChldmVudC5yZXBlYXQpIHJldHVybjtcbiAgLy8gICAgIGNvbnN0IGtleSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZXZlbnQud2hpY2gpO1xuXG4gIC8vICAgICBjb25zdCBzb3VyY2UgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gICAgIGNvbnN0IGV4Y2x1ZGUgPSBbJ2lucHV0JywgJ3RleHRhcmVhJ107XG5cbiAgLy8gICAgIGlmIChleGNsdWRlLmluZGV4T2Yoc291cmNlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkgPT09IC0xKSB7XG4gIC8vICAgICAgIGxvZ2dlci5kZWJ1Zygna2V5RG93bigpIFtrZXk6XCIlc1wiXScsIGtleSk7XG5cbiAgLy8gICAgICAgc3dpdGNoIChrZXkpIHtcblxuICAvLyAgICAgICAgIC8qXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM3KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldFByZXZBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSBTdHJpbmcuZnJvbUNoYXJDb2RlKDM5KTpcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBjb25zdCBuZXdQZWVySWQgPSB0aGlzLl9zcG90bGlnaHRzLmdldE5leHRBc1NlbGVjdGVkKFxuICAvLyAgICAgICAgICAgICBzdG9yZS5nZXRTdGF0ZSgpLnJvb20uc2VsZWN0ZWRQZWVySWQpO1xuXG4gIC8vICAgICAgICAgICBpZiAobmV3UGVlcklkKSB0aGlzLnNldFNlbGVjdGVkUGVlcihuZXdQZWVySWQpO1xuICAvLyAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICAgICovXG5cblxuICAvLyAgICAgICAgIGNhc2UgJ00nOiAvLyBUb2dnbGUgbWljcm9waG9uZVxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgICAgICAgICAgICBpZiAoIXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZCkge1xuICAvLyAgICAgICAgICAgICAgICAgdGhpcy5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGUnLFxuICAvLyAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdNdXRlZCB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgICAgfSkpO1xuICAvLyAgICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICAgICAgICAgIHRoaXMudW5tdXRlTWljKCk7XG5cbiAgLy8gICAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VubXV0ZWQgeW91ciBtaWNyb3Bob25lJ1xuICAvLyAgICAgICAgICAgICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICAgIH1cbiAgLy8gICAgICAgICAgICAgZWxzZSB7XG4gIC8vICAgICAgICAgICAgICAgdGhpcy51cGRhdGVNaWMoeyBzdGFydDogdHJ1ZSB9KTtcblxuICAvLyAgICAgICAgICAgICAgIHN0b3JlLmRpc3BhdGNoKHJlcXVlc3RBY3Rpb25zLm5vdGlmeShcbiAgLy8gICAgICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICAgICAgdGV4dDogaW50bC5mb3JtYXRNZXNzYWdlKHtcbiAgLy8gICAgICAgICAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZUVuYWJsZScsXG4gIC8vICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdFbmFibGVkIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgICAgICAgIH0pKTtcbiAgLy8gICAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnVic6IC8vIFRvZ2dsZSB2aWRlb1xuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBpZiAodGhpcy5fd2ViY2FtUHJvZHVjZXIpXG4gIC8vICAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlV2ViY2FtKCk7XG4gIC8vICAgICAgICAgICAgIGVsc2VcbiAgLy8gICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVdlYmNhbSh7IHN0YXJ0OiB0cnVlIH0pO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgY2FzZSAnSCc6IC8vIE9wZW4gaGVscCBkaWFsb2dcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocm9vbUFjdGlvbnMuc2V0SGVscE9wZW4odHJ1ZSkpO1xuXG4gIC8vICAgICAgICAgICAgIGJyZWFrO1xuICAvLyAgICAgICAgICAgfVxuXG4gIC8vICAgICAgICAgZGVmYXVsdDpcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgYnJlYWs7XG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcblxuXG4gIC8vIH1cblxuICAvLyBfc3RhcnREZXZpY2VzTGlzdGVuZXIoKSB7XG4gIC8vICAgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5hZGRFdmVudExpc3RlbmVyKCdkZXZpY2VjaGFuZ2UnLCBhc3luYyAoKSA9PiB7XG4gIC8vICAgICBsb2dnZXIuZGVidWcoJ19zdGFydERldmljZXNMaXN0ZW5lcigpIHwgbmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5vbmRldmljZWNoYW5nZScpO1xuXG4gIC8vICAgICBhd2FpdCB0aGlzLl91cGRhdGVBdWRpb0RldmljZXMoKTtcbiAgLy8gICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgLy8gICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgIHtcbiAgLy8gICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgaWQ6ICdkZXZpY2VzLmRldmljZXNDaGFuZ2VkJyxcbiAgLy8gICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnWW91ciBkZXZpY2VzIGNoYW5nZWQsIGNvbmZpZ3VyZSB5b3VyIGRldmljZXMgaW4gdGhlIHNldHRpbmdzIGRpYWxvZydcbiAgLy8gICAgICAgICB9KVxuICAvLyAgICAgICB9KSk7XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuXG4gIC8vIF9zb3VuZE5vdGlmaWNhdGlvbigpIHtcbiAgLy8gICBjb25zdCB7IG5vdGlmaWNhdGlvblNvdW5kcyB9ID0gc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncztcblxuICAvLyAgIGlmIChub3RpZmljYXRpb25Tb3VuZHMpIHtcbiAgLy8gICAgIGNvbnN0IGFsZXJ0UHJvbWlzZSA9IHRoaXMuX3NvdW5kQWxlcnQucGxheSgpO1xuXG4gIC8vICAgICBpZiAoYWxlcnRQcm9taXNlICE9PSB1bmRlZmluZWQpIHtcbiAgLy8gICAgICAgYWxlcnRQcm9taXNlXG4gIC8vICAgICAgICAgLnRoZW4oKVxuICAvLyAgICAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgLy8gICAgICAgICAgIGxvZ2dlci5lcnJvcignX3NvdW5kQWxlcnQucGxheSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgICAgICAgIH0pO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIHRpbWVvdXRDYWxsYmFjayhjYWxsYmFjaykge1xuICAvLyAgIGxldCBjYWxsZWQgPSBmYWxzZTtcblxuICAvLyAgIGNvbnN0IGludGVydmFsID0gc2V0VGltZW91dChcbiAgLy8gICAgICgpID0+IHtcbiAgLy8gICAgICAgaWYgKGNhbGxlZClcbiAgLy8gICAgICAgICByZXR1cm47XG4gIC8vICAgICAgIGNhbGxlZCA9IHRydWU7XG4gIC8vICAgICAgIGNhbGxiYWNrKG5ldyBTb2NrZXRUaW1lb3V0RXJyb3IoJ1JlcXVlc3QgdGltZWQgb3V0JykpO1xuICAvLyAgICAgfSxcbiAgLy8gICAgIHJlcXVlc3RUaW1lb3V0XG4gIC8vICAgKTtcblxuICAvLyAgIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAvLyAgICAgaWYgKGNhbGxlZClcbiAgLy8gICAgICAgcmV0dXJuO1xuICAvLyAgICAgY2FsbGVkID0gdHJ1ZTtcbiAgLy8gICAgIGNsZWFyVGltZW91dChpbnRlcnZhbCk7XG5cbiAgLy8gICAgIGNhbGxiYWNrKC4uLmFyZ3MpO1xuICAvLyAgIH07XG4gIC8vIH1cblxuICAvLyBfc2VuZFJlcXVlc3QobWV0aG9kLCBkYXRhKSB7XG4gIC8vICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgLy8gICAgIGlmICghdGhpcy5fc2lnbmFsaW5nU29ja2V0KSB7XG4gIC8vICAgICAgIHJlamVjdCgnTm8gc29ja2V0IGNvbm5lY3Rpb24nKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGVsc2Uge1xuICAvLyAgICAgICB0aGlzLl9zaWduYWxpbmdTb2NrZXQuZW1pdChcbiAgLy8gICAgICAgICAncmVxdWVzdCcsXG4gIC8vICAgICAgICAgeyBtZXRob2QsIGRhdGEgfSxcbiAgLy8gICAgICAgICB0aGlzLnRpbWVvdXRDYWxsYmFjaygoZXJyLCByZXNwb25zZSkgPT4ge1xuICAvLyAgICAgICAgICAgaWYgKGVycilcbiAgLy8gICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gIC8vICAgICAgICAgICBlbHNlXG4gIC8vICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAvLyAgICAgICAgIH0pXG4gIC8vICAgICAgICk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyBhc3luYyBnZXRUcmFuc3BvcnRTdGF0cygpIHtcbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3JlY3ZUcmFuc3BvcnQpIHtcbiAgLy8gICAgICAgbG9nZ2VyLmRlYnVnKCdnZXRUcmFuc3BvcnRTdGF0cygpIC0gcmVjdiBbdHJhbnNwb3J0SWQ6IFwiJXNcIl0nLCB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkKTtcblxuICAvLyAgICAgICBjb25zdCByZWN2ID0gYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0VHJhbnNwb3J0U3RhdHMnLCB7IHRyYW5zcG9ydElkOiB0aGlzLl9yZWN2VHJhbnNwb3J0LmlkIH0pO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICAgIHRyYW5zcG9ydEFjdGlvbnMuYWRkVHJhbnNwb3J0U3RhdHMocmVjdiwgJ3JlY3YnKSk7XG4gIC8vICAgICB9XG5cbiAgLy8gICAgIGlmICh0aGlzLl9zZW5kVHJhbnNwb3J0KSB7XG4gIC8vICAgICAgIGxvZ2dlci5kZWJ1ZygnZ2V0VHJhbnNwb3J0U3RhdHMoKSAtIHNlbmQgW3RyYW5zcG9ydElkOiBcIiVzXCJdJywgdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCk7XG5cbiAgLy8gICAgICAgY29uc3Qgc2VuZCA9IGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ2dldFRyYW5zcG9ydFN0YXRzJywgeyB0cmFuc3BvcnRJZDogdGhpcy5fc2VuZFRyYW5zcG9ydC5pZCB9KTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgICB0cmFuc3BvcnRBY3Rpb25zLmFkZFRyYW5zcG9ydFN0YXRzKHNlbmQsICdzZW5kJykpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignZ2V0VHJhbnNwb3J0U3RhdHMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZW5kUmVxdWVzdChtZXRob2QsIGRhdGEpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ3NlbmRSZXF1ZXN0KCkgW21ldGhvZDpcIiVzXCIsIGRhdGE6XCIlb1wiXScsIG1ldGhvZCwgZGF0YSk7XG5cbiAgLy8gICBjb25zdCB7XG4gIC8vICAgICByZXF1ZXN0UmV0cmllcyA9IDNcbiAgLy8gICB9ID0gd2luZG93LmNvbmZpZztcblxuICAvLyAgIGZvciAobGV0IHRyaWVzID0gMDsgdHJpZXMgPCByZXF1ZXN0UmV0cmllczsgdHJpZXMrKykge1xuICAvLyAgICAgdHJ5IHtcbiAgLy8gICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuX3NlbmRSZXF1ZXN0KG1ldGhvZCwgZGF0YSk7XG4gIC8vICAgICB9XG4gIC8vICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgICAgaWYgKFxuICAvLyAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgU29ja2V0VGltZW91dEVycm9yICYmXG4gIC8vICAgICAgICAgdHJpZXMgPCByZXF1ZXN0UmV0cmllc1xuICAvLyAgICAgICApXG4gIC8vICAgICAgICAgbG9nZ2VyLndhcm4oJ3NlbmRSZXF1ZXN0KCkgfCB0aW1lb3V0LCByZXRyeWluZyBbYXR0ZW1wdDpcIiVzXCJdJywgdHJpZXMpO1xuICAvLyAgICAgICBlbHNlXG4gIC8vICAgICAgICAgdGhyb3cgZXJyb3I7XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgLy8gYXN5bmMgbXV0ZU1pYygpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ211dGVNaWMoKScpO1xuXG4gIC8vICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2UoKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KFxuICAvLyAgICAgICAncGF1c2VQcm9kdWNlcicsIHsgcHJvZHVjZXJJZDogdGhpcy5fbWljUHJvZHVjZXIuaWQgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJQYXVzZWQodGhpcy5fbWljUHJvZHVjZXIuaWQpKTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIHNldHRpbmdzQWN0aW9ucy5zZXRBdWRpb011dGVkKHRydWUpKTtcblxuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignbXV0ZU1pYygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgIHtcbiAgLy8gICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAvLyAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZU11dGVFcnJvcicsXG4gIC8vICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ1VuYWJsZSB0byBtdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICB9KVxuICAvLyAgICAgICB9KSk7XG4gIC8vICAgfVxuICAvLyB9XG5cbiAgLy8gYXN5bmMgdW5tdXRlTWljKCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygndW5tdXRlTWljKCknKTtcblxuICAvLyAgIGlmICghdGhpcy5fbWljUHJvZHVjZXIpIHtcbiAgLy8gICAgIHRoaXMudXBkYXRlTWljKHsgc3RhcnQ6IHRydWUgfSk7XG4gIC8vICAgfVxuICAvLyAgIGVsc2Uge1xuICAvLyAgICAgdGhpcy5fbWljUHJvZHVjZXIucmVzdW1lKCk7XG5cbiAgLy8gICAgIHRyeSB7XG4gIC8vICAgICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICAgJ3Jlc3VtZVByb2R1Y2VyJywgeyBwcm9kdWNlcklkOiB0aGlzLl9taWNQcm9kdWNlci5pZCB9KTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgICBwcm9kdWNlckFjdGlvbnMuc2V0UHJvZHVjZXJSZXN1bWVkKHRoaXMuX21pY1Byb2R1Y2VyLmlkKSk7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgICAgc2V0dGluZ3NBY3Rpb25zLnNldEF1ZGlvTXV0ZWQoZmFsc2UpKTtcblxuICAvLyAgICAgfVxuICAvLyAgICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICAgIGxvZ2dlci5lcnJvcigndW5tdXRlTWljKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIHR5cGU6ICdlcnJvcicsXG4gIC8vICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICBpZDogJ2RldmljZXMubWljcm9waG9uZVVuTXV0ZUVycm9yJyxcbiAgLy8gICAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdVbmFibGUgdG8gdW5tdXRlIHlvdXIgbWljcm9waG9uZSdcbiAgLy8gICAgICAgICAgIH0pXG4gIC8vICAgICAgICAgfSkpO1xuICAvLyAgICAgfVxuICAvLyAgIH1cbiAgLy8gfVxuXG5cbiAgLy8gZGlzY29ubmVjdExvY2FsSGFyaygpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ2Rpc2Nvbm5lY3RMb2NhbEhhcmsoKScpO1xuXG4gIC8vICAgaWYgKHRoaXMuX2hhcmtTdHJlYW0gIT0gbnVsbCkge1xuICAvLyAgICAgbGV0IFt0cmFja10gPSB0aGlzLl9oYXJrU3RyZWFtLmdldEF1ZGlvVHJhY2tzKCk7XG5cbiAgLy8gICAgIHRyYWNrLnN0b3AoKTtcbiAgLy8gICAgIHRyYWNrID0gbnVsbDtcblxuICAvLyAgICAgdGhpcy5faGFya1N0cmVhbSA9IG51bGw7XG4gIC8vICAgfVxuXG4gIC8vICAgaWYgKHRoaXMuX2hhcmsgIT0gbnVsbClcbiAgLy8gICAgIHRoaXMuX2hhcmsuc3RvcCgpO1xuICAvLyB9XG5cbiAgLy8gY29ubmVjdExvY2FsSGFyayh0cmFjaykge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnY29ubmVjdExvY2FsSGFyaygpIFt0cmFjazpcIiVvXCJdJywgdHJhY2spO1xuXG4gIC8vICAgdGhpcy5faGFya1N0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuXG4gIC8vICAgY29uc3QgbmV3VHJhY2sgPSB0cmFjay5jbG9uZSgpO1xuXG4gIC8vICAgdGhpcy5faGFya1N0cmVhbS5hZGRUcmFjayhuZXdUcmFjayk7XG5cbiAgLy8gICBuZXdUcmFjay5lbmFibGVkID0gdHJ1ZTtcblxuICAvLyAgIHRoaXMuX2hhcmsgPSBoYXJrKHRoaXMuX2hhcmtTdHJlYW0sXG4gIC8vICAgICB7XG4gIC8vICAgICAgIHBsYXk6IGZhbHNlLFxuICAvLyAgICAgICBpbnRlcnZhbDogMTAsXG4gIC8vICAgICAgIHRocmVzaG9sZDogc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncy5ub2lzZVRocmVzaG9sZCxcbiAgLy8gICAgICAgaGlzdG9yeTogMTAwXG4gIC8vICAgICB9KTtcblxuICAvLyAgIHRoaXMuX2hhcmsubGFzdFZvbHVtZSA9IC0xMDA7XG5cbiAgLy8gICB0aGlzLl9oYXJrLm9uKCd2b2x1bWVfY2hhbmdlJywgKHZvbHVtZSkgPT4ge1xuICAvLyAgICAgLy8gVXBkYXRlIG9ubHkgaWYgdGhlcmUgaXMgYSBiaWdnZXIgZGlmZlxuICAvLyAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyICYmIE1hdGguYWJzKHZvbHVtZSAtIHRoaXMuX2hhcmsubGFzdFZvbHVtZSkgPiAwLjUpIHtcbiAgLy8gICAgICAgLy8gRGVjYXkgY2FsY3VsYXRpb246IGtlZXAgaW4gbWluZCB0aGF0IHZvbHVtZSByYW5nZSBpcyAtMTAwIC4uLiAwIChkQilcbiAgLy8gICAgICAgLy8gVGhpcyBtYWtlcyBkZWNheSB2b2x1bWUgZmFzdCBpZiBkaWZmZXJlbmNlIHRvIGxhc3Qgc2F2ZWQgdmFsdWUgaXMgYmlnXG4gIC8vICAgICAgIC8vIGFuZCBzbG93IGZvciBzbWFsbCBjaGFuZ2VzLiBUaGlzIHByZXZlbnRzIGZsaWNrZXJpbmcgdm9sdW1lIGluZGljYXRvclxuICAvLyAgICAgICAvLyBhdCBsb3cgbGV2ZWxzXG4gIC8vICAgICAgIGlmICh2b2x1bWUgPCB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpIHtcbiAgLy8gICAgICAgICB2b2x1bWUgPVxuICAvLyAgICAgICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lIC1cbiAgLy8gICAgICAgICAgIE1hdGgucG93KFxuICAvLyAgICAgICAgICAgICAodm9sdW1lIC0gdGhpcy5faGFyay5sYXN0Vm9sdW1lKSAvXG4gIC8vICAgICAgICAgICAgICgxMDAgKyB0aGlzLl9oYXJrLmxhc3RWb2x1bWUpXG4gIC8vICAgICAgICAgICAgICwgMlxuICAvLyAgICAgICAgICAgKSAqIDEwO1xuICAvLyAgICAgICB9XG5cbiAgLy8gICAgICAgdGhpcy5faGFyay5sYXN0Vm9sdW1lID0gdm9sdW1lO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHBlZXJWb2x1bWVBY3Rpb25zLnNldFBlZXJWb2x1bWUodGhpcy5fcGVlcklkLCB2b2x1bWUpKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcblxuICAvLyAgIHRoaXMuX2hhcmsub24oJ3NwZWFraW5nJywgKCkgPT4ge1xuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldElzU3BlYWtpbmcodHJ1ZSkpO1xuXG4gIC8vICAgICBpZiAoXG4gIC8vICAgICAgIChzdG9yZS5nZXRTdGF0ZSgpLnNldHRpbmdzLnZvaWNlQWN0aXZhdGVkVW5tdXRlIHx8XG4gIC8vICAgICAgICAgc3RvcmUuZ2V0U3RhdGUoKS5tZS5pc0F1dG9NdXRlZCkgJiZcbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIgJiZcbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIucGF1c2VkXG4gIC8vICAgICApXG4gIC8vICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnJlc3VtZSgpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXV0b011dGVkKGZhbHNlKSk7IC8vIHNhbml0eSBhY3Rpb25cbiAgLy8gICB9KTtcblxuICAvLyAgIHRoaXMuX2hhcmsub24oJ3N0b3BwZWRfc3BlYWtpbmcnLCAoKSA9PiB7XG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0SXNTcGVha2luZyhmYWxzZSkpO1xuXG4gIC8vICAgICBpZiAoXG4gIC8vICAgICAgIHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3Mudm9pY2VBY3RpdmF0ZWRVbm11dGUgJiZcbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIgJiZcbiAgLy8gICAgICAgIXRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlZFxuICAvLyAgICAgKSB7XG4gIC8vICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnBhdXNlKCk7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2gobWVBY3Rpb25zLnNldEF1dG9NdXRlZCh0cnVlKSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH1cblxuICAvLyBhc3luYyBjaGFuZ2VBdWRpb091dHB1dERldmljZShkZXZpY2VJZCkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZygnY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZGV2aWNlSWQ6XCIlc1wiXScsIGRldmljZUlkKTtcblxuICAvLyAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgbWVBY3Rpb25zLnNldEF1ZGlvT3V0cHV0SW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgY29uc3QgZGV2aWNlID0gdGhpcy5fYXVkaW9PdXRwdXREZXZpY2VzW2RldmljZUlkXTtcblxuICAvLyAgICAgaWYgKCFkZXZpY2UpXG4gIC8vICAgICAgIHRocm93IG5ldyBFcnJvcignU2VsZWN0ZWQgYXVkaW8gb3V0cHV0IGRldmljZSBubyBsb25nZXIgYXZhaWxhYmxlJyk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRTZWxlY3RlZEF1ZGlvT3V0cHV0RGV2aWNlKGRldmljZUlkKSk7XG5cbiAgLy8gICAgIGF3YWl0IHRoaXMuX3VwZGF0ZUF1ZGlvT3V0cHV0RGV2aWNlcygpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignY2hhbmdlQXVkaW9PdXRwdXREZXZpY2UoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgIG1lQWN0aW9ucy5zZXRBdWRpb091dHB1dEluUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgLy8gfVxuXG4gIC8vIC8vIE9ubHkgRmlyZWZveCBzdXBwb3J0cyBhcHBseUNvbnN0cmFpbnRzIHRvIGF1ZGlvIHRyYWNrc1xuICAvLyAvLyBTZWU6XG4gIC8vIC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC9jaHJvbWl1bS9pc3N1ZXMvZGV0YWlsP2lkPTc5Njk2NFxuICAvLyBhc3luYyB1cGRhdGVNaWMoe1xuICAvLyAgIHN0YXJ0ID0gZmFsc2UsXG4gIC8vICAgcmVzdGFydCA9IGZhbHNlIHx8IHRoaXMuX2RldmljZS5mbGFnICE9PSAnZmlyZWZveCcsXG4gIC8vICAgbmV3RGV2aWNlSWQgPSBudWxsXG4gIC8vIH0gPSB7fSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICd1cGRhdGVNaWMoKSBbc3RhcnQ6XCIlc1wiLCByZXN0YXJ0OlwiJXNcIiwgbmV3RGV2aWNlSWQ6XCIlc1wiXScsXG4gIC8vICAgICBzdGFydCxcbiAgLy8gICAgIHJlc3RhcnQsXG4gIC8vICAgICBuZXdEZXZpY2VJZFxuICAvLyAgICk7XG5cbiAgLy8gICBsZXQgdHJhY2s7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgnYXVkaW8nKSlcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSBhdWRpbycpO1xuXG4gIC8vICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gIC8vICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAvLyAgICAgaWYgKG5ld0RldmljZUlkKVxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRBdWRpb0RldmljZShuZXdEZXZpY2VJZCkpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKHRydWUpKTtcblxuICAvLyAgICAgY29uc3QgZGV2aWNlSWQgPSBhd2FpdCB0aGlzLl9nZXRBdWRpb0RldmljZUlkKCk7XG4gIC8vICAgICBjb25zdCBkZXZpY2UgPSB0aGlzLl9hdWRpb0RldmljZXNbZGV2aWNlSWRdO1xuXG4gIC8vICAgICBpZiAoIWRldmljZSlcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBhdWRpbyBkZXZpY2VzJyk7XG5cbiAgLy8gICAgIGNvbnN0IHtcbiAgLy8gICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAvLyAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAvLyAgICAgICBub2lzZVN1cHByZXNzaW9uXG4gIC8vICAgICB9ID0gc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncztcblxuICAvLyAgICAgaWYgKCF3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnMpIHtcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAvLyAgICAgICAgICdNaXNzaW5nIGNlbnRyYWxBdWRpb09wdGlvbnMgZnJvbSBhcHAgY29uZmlnISAoU2VlIGl0IGluIGV4YW1wbGUgY29uZmlnLiknXG4gIC8vICAgICAgICk7XG4gIC8vICAgICB9XG5cbiAgLy8gICAgIGNvbnN0IHtcbiAgLy8gICAgICAgc2FtcGxlUmF0ZSA9IDk2MDAwLFxuICAvLyAgICAgICBjaGFubmVsQ291bnQgPSAxLFxuICAvLyAgICAgICB2b2x1bWUgPSAxLjAsXG4gIC8vICAgICAgIHNhbXBsZVNpemUgPSAxNixcbiAgLy8gICAgICAgb3B1c1N0ZXJlbyA9IGZhbHNlLFxuICAvLyAgICAgICBvcHVzRHR4ID0gdHJ1ZSxcbiAgLy8gICAgICAgb3B1c0ZlYyA9IHRydWUsXG4gIC8vICAgICAgIG9wdXNQdGltZSA9IDIwLFxuICAvLyAgICAgICBvcHVzTWF4UGxheWJhY2tSYXRlID0gOTYwMDBcbiAgLy8gICAgIH0gPSB3aW5kb3cuY29uZmlnLmNlbnRyYWxBdWRpb09wdGlvbnM7XG5cbiAgLy8gICAgIGlmIChcbiAgLy8gICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fbWljUHJvZHVjZXIpIHx8XG4gIC8vICAgICAgIHN0YXJ0XG4gIC8vICAgICApIHtcbiAgLy8gICAgICAgdGhpcy5kaXNjb25uZWN0TG9jYWxIYXJrKCk7XG5cbiAgLy8gICAgICAgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKVxuICAvLyAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZU1pYygpO1xuXG4gIC8vICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIGF1ZGlvOiB7XG4gIC8vICAgICAgICAgICAgIGRldmljZUlkOiB7IGlkZWFsOiBkZXZpY2VJZCB9LFxuICAvLyAgICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAvLyAgICAgICAgICAgICBjaGFubmVsQ291bnQsXG4gIC8vICAgICAgICAgICAgIHZvbHVtZSxcbiAgLy8gICAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAvLyAgICAgICAgICAgICBlY2hvQ2FuY2VsbGF0aW9uLFxuICAvLyAgICAgICAgICAgICBub2lzZVN1cHByZXNzaW9uLFxuICAvLyAgICAgICAgICAgICBzYW1wbGVTaXplXG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICApO1xuXG4gIC8vICAgICAgIChbdHJhY2tdID0gc3RyZWFtLmdldEF1ZGlvVHJhY2tzKCkpO1xuXG4gIC8vICAgICAgIGNvbnN0IHsgZGV2aWNlSWQ6IHRyYWNrRGV2aWNlSWQgfSA9IHRyYWNrLmdldFNldHRpbmdzKCk7XG5cbiAgLy8gICAgICAgc3RvcmUuZGlzcGF0Y2goc2V0dGluZ3NBY3Rpb25zLnNldFNlbGVjdGVkQXVkaW9EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gIC8vICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIHRyYWNrLFxuICAvLyAgICAgICAgICAgY29kZWNPcHRpb25zOlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBvcHVzU3RlcmVvLFxuICAvLyAgICAgICAgICAgICBvcHVzRHR4LFxuICAvLyAgICAgICAgICAgICBvcHVzRmVjLFxuICAvLyAgICAgICAgICAgICBvcHVzUHRpbWUsXG4gIC8vICAgICAgICAgICAgIG9wdXNNYXhQbGF5YmFja1JhdGVcbiAgLy8gICAgICAgICAgIH0sXG4gIC8vICAgICAgICAgICBhcHBEYXRhOlxuICAvLyAgICAgICAgICAgICB7IHNvdXJjZTogJ21pYycgfVxuICAvLyAgICAgICAgIH0pO1xuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBpZDogdGhpcy5fbWljUHJvZHVjZXIuaWQsXG4gIC8vICAgICAgICAgICBzb3VyY2U6ICdtaWMnLFxuICAvLyAgICAgICAgICAgcGF1c2VkOiB0aGlzLl9taWNQcm9kdWNlci5wYXVzZWQsXG4gIC8vICAgICAgICAgICB0cmFjazogdGhpcy5fbWljUHJvZHVjZXIudHJhY2ssXG4gIC8vICAgICAgICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl9taWNQcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAvLyAgICAgICAgICAgY29kZWM6IHRoaXMuX21pY1Byb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgLy8gICAgICAgICB9KSk7XG5cbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAvLyAgICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyID0gbnVsbDtcbiAgLy8gICAgICAgfSk7XG5cbiAgLy8gICAgICAgdGhpcy5fbWljUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gIC8vICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAvLyAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5taWNyb3Bob25lRGlzY29ubmVjdGVkJyxcbiAgLy8gICAgICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ01pY3JvcGhvbmUgZGlzY29ubmVjdGVkJ1xuICAvLyAgICAgICAgICAgICB9KVxuICAvLyAgICAgICAgICAgfSkpO1xuXG4gIC8vICAgICAgICAgdGhpcy5kaXNhYmxlTWljKCk7XG4gIC8vICAgICAgIH0pO1xuXG4gIC8vICAgICAgIHRoaXMuX21pY1Byb2R1Y2VyLnZvbHVtZSA9IDA7XG5cbiAgLy8gICAgICAgdGhpcy5jb25uZWN0TG9jYWxIYXJrKHRyYWNrKTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGVsc2UgaWYgKHRoaXMuX21pY1Byb2R1Y2VyKSB7XG4gIC8vICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl9taWNQcm9kdWNlcik7XG5cbiAgLy8gICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBzYW1wbGVSYXRlLFxuICAvLyAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAvLyAgICAgICAgICAgdm9sdW1lLFxuICAvLyAgICAgICAgICAgYXV0b0dhaW5Db250cm9sLFxuICAvLyAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgLy8gICAgICAgICAgIG5vaXNlU3VwcHJlc3Npb24sXG4gIC8vICAgICAgICAgICBzYW1wbGVTaXplXG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICApO1xuXG4gIC8vICAgICAgIGlmICh0aGlzLl9oYXJrU3RyZWFtICE9IG51bGwpIHtcbiAgLy8gICAgICAgICBjb25zdCBbaGFya1RyYWNrXSA9IHRoaXMuX2hhcmtTdHJlYW0uZ2V0QXVkaW9UcmFja3MoKTtcblxuICAvLyAgICAgICAgIGhhcmtUcmFjayAmJiBhd2FpdCBoYXJrVHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgLy8gICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgc2FtcGxlUmF0ZSxcbiAgLy8gICAgICAgICAgICAgY2hhbm5lbENvdW50LFxuICAvLyAgICAgICAgICAgICB2b2x1bWUsXG4gIC8vICAgICAgICAgICAgIGF1dG9HYWluQ29udHJvbCxcbiAgLy8gICAgICAgICAgICAgZWNob0NhbmNlbGxhdGlvbixcbiAgLy8gICAgICAgICAgICAgbm9pc2VTdXBwcmVzc2lvbixcbiAgLy8gICAgICAgICAgICAgc2FtcGxlU2l6ZVxuICAvLyAgICAgICAgICAgfVxuICAvLyAgICAgICAgICk7XG4gIC8vICAgICAgIH1cbiAgLy8gICAgIH1cblxuICAvLyAgICAgYXdhaXQgdGhpcy5fdXBkYXRlQXVkaW9EZXZpY2VzKCk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCd1cGRhdGVNaWMoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICB7XG4gIC8vICAgICAgICAgdHlwZTogJ2Vycm9yJyxcbiAgLy8gICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgaWQ6ICdkZXZpY2VzLm1pY3JvcGhvbmVFcnJvcicsXG4gIC8vICAgICAgICAgICBkZWZhdWx0TWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIHdoaWxlIGFjY2Vzc2luZyB5b3VyIG1pY3JvcGhvbmUnXG4gIC8vICAgICAgICAgfSlcbiAgLy8gICAgICAgfSkpO1xuXG4gIC8vICAgICBpZiAodHJhY2spXG4gIC8vICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgLy8gICB9XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0QXVkaW9JblByb2dyZXNzKGZhbHNlKSk7XG4gIC8vIH1cblxuICAvLyBhc3luYyB1cGRhdGVXZWJjYW0oe1xuICAvLyAgIGluaXQgPSBmYWxzZSxcbiAgLy8gICBzdGFydCA9IGZhbHNlLFxuICAvLyAgIHJlc3RhcnQgPSBmYWxzZSxcbiAgLy8gICBuZXdEZXZpY2VJZCA9IG51bGwsXG4gIC8vICAgbmV3UmVzb2x1dGlvbiA9IG51bGwsXG4gIC8vICAgbmV3RnJhbWVSYXRlID0gbnVsbFxuICAvLyB9ID0ge30pIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAndXBkYXRlV2ViY2FtKCkgW3N0YXJ0OlwiJXNcIiwgcmVzdGFydDpcIiVzXCIsIG5ld0RldmljZUlkOlwiJXNcIiwgbmV3UmVzb2x1dGlvbjpcIiVzXCIsIG5ld0ZyYW1lUmF0ZTpcIiVzXCJdJyxcbiAgLy8gICAgIHN0YXJ0LFxuICAvLyAgICAgcmVzdGFydCxcbiAgLy8gICAgIG5ld0RldmljZUlkLFxuICAvLyAgICAgbmV3UmVzb2x1dGlvbixcbiAgLy8gICAgIG5ld0ZyYW1lUmF0ZVxuICAvLyAgICk7XG5cbiAgLy8gICBsZXQgdHJhY2s7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKCF0aGlzLl9tZWRpYXNvdXBEZXZpY2UuY2FuUHJvZHVjZSgndmlkZW8nKSlcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgcHJvZHVjZSB2aWRlbycpO1xuXG4gIC8vICAgICBpZiAobmV3RGV2aWNlSWQgJiYgIXJlc3RhcnQpXG4gIC8vICAgICAgIHRocm93IG5ldyBFcnJvcignY2hhbmdpbmcgZGV2aWNlIHJlcXVpcmVzIHJlc3RhcnQnKTtcblxuICAvLyAgICAgaWYgKG5ld0RldmljZUlkKVxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UobmV3RGV2aWNlSWQpKTtcblxuICAvLyAgICAgaWYgKG5ld1Jlc29sdXRpb24pXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHNldHRpbmdzQWN0aW9ucy5zZXRWaWRlb1Jlc29sdXRpb24obmV3UmVzb2x1dGlvbikpO1xuXG4gIC8vICAgICBpZiAobmV3RnJhbWVSYXRlKVxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9GcmFtZVJhdGUobmV3RnJhbWVSYXRlKSk7XG5cbiAgLy8gICAgIGNvbnN0IHsgdmlkZW9NdXRlZCB9ID0gc3RvcmUuZ2V0U3RhdGUoKS5zZXR0aW5ncztcblxuICAvLyAgICAgaWYgKGluaXQgJiYgdmlkZW9NdXRlZClcbiAgLy8gICAgICAgcmV0dXJuO1xuICAvLyAgICAgZWxzZVxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0VmlkZW9NdXRlZChmYWxzZSkpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChtZUFjdGlvbnMuc2V0V2ViY2FtSW5Qcm9ncmVzcyh0cnVlKSk7XG5cbiAgLy8gICAgIGNvbnN0IGRldmljZUlkID0gYXdhaXQgdGhpcy5fZ2V0V2ViY2FtRGV2aWNlSWQoKTtcbiAgLy8gICAgIGNvbnN0IGRldmljZSA9IHRoaXMuX3dlYmNhbXNbZGV2aWNlSWRdO1xuXG4gIC8vICAgICBpZiAoIWRldmljZSlcbiAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyB3ZWJjYW0gZGV2aWNlcycpO1xuXG4gIC8vICAgICBjb25zdCB7XG4gIC8vICAgICAgIHJlc29sdXRpb24sXG4gIC8vICAgICAgIGZyYW1lUmF0ZVxuICAvLyAgICAgfSA9IHN0b3JlLmdldFN0YXRlKCkuc2V0dGluZ3M7XG5cbiAgLy8gICAgIGlmIChcbiAgLy8gICAgICAgKHJlc3RhcnQgJiYgdGhpcy5fd2ViY2FtUHJvZHVjZXIpIHx8XG4gIC8vICAgICAgIHN0YXJ0XG4gIC8vICAgICApIHtcbiAgLy8gICAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICAgIGF3YWl0IHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuXG4gIC8vICAgICAgIGNvbnN0IHN0cmVhbSA9IGF3YWl0IG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKFxuICAvLyAgICAgICAgIHtcbiAgLy8gICAgICAgICAgIHZpZGVvOlxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICBkZXZpY2VJZDogeyBpZGVhbDogZGV2aWNlSWQgfSxcbiAgLy8gICAgICAgICAgICAgLi4uVklERU9fQ09OU1RSQUlOU1tyZXNvbHV0aW9uXSxcbiAgLy8gICAgICAgICAgICAgZnJhbWVSYXRlXG4gIC8vICAgICAgICAgICB9XG4gIC8vICAgICAgICAgfSk7XG5cbiAgLy8gICAgICAgKFt0cmFja10gPSBzdHJlYW0uZ2V0VmlkZW9UcmFja3MoKSk7XG5cbiAgLy8gICAgICAgY29uc3QgeyBkZXZpY2VJZDogdHJhY2tEZXZpY2VJZCB9ID0gdHJhY2suZ2V0U2V0dGluZ3MoKTtcblxuICAvLyAgICAgICBzdG9yZS5kaXNwYXRjaChzZXR0aW5nc0FjdGlvbnMuc2V0U2VsZWN0ZWRXZWJjYW1EZXZpY2UodHJhY2tEZXZpY2VJZCkpO1xuXG4gIC8vICAgICAgIGlmICh0aGlzLl91c2VTaW11bGNhc3QpIHtcbiAgLy8gICAgICAgICAvLyBJZiBWUDkgaXMgdGhlIG9ubHkgYXZhaWxhYmxlIHZpZGVvIGNvZGVjIHRoZW4gdXNlIFNWQy5cbiAgLy8gICAgICAgICBjb25zdCBmaXJzdFZpZGVvQ29kZWMgPSB0aGlzLl9tZWRpYXNvdXBEZXZpY2VcbiAgLy8gICAgICAgICAgIC5ydHBDYXBhYmlsaXRpZXNcbiAgLy8gICAgICAgICAgIC5jb2RlY3NcbiAgLy8gICAgICAgICAgIC5maW5kKChjKSA9PiBjLmtpbmQgPT09ICd2aWRlbycpO1xuXG4gIC8vICAgICAgICAgbGV0IGVuY29kaW5ncztcblxuICAvLyAgICAgICAgIGlmIChmaXJzdFZpZGVvQ29kZWMubWltZVR5cGUudG9Mb3dlckNhc2UoKSA9PT0gJ3ZpZGVvL3ZwOScpXG4gIC8vICAgICAgICAgICBlbmNvZGluZ3MgPSBWSURFT19LU1ZDX0VOQ09ESU5HUztcbiAgLy8gICAgICAgICBlbHNlIGlmICgnc2ltdWxjYXN0RW5jb2RpbmdzJyBpbiB3aW5kb3cuY29uZmlnKVxuICAvLyAgICAgICAgICAgZW5jb2RpbmdzID0gd2luZG93LmNvbmZpZy5zaW11bGNhc3RFbmNvZGluZ3M7XG4gIC8vICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgZW5jb2RpbmdzID0gVklERU9fU0lNVUxDQVNUX0VOQ09ESU5HUztcblxuICAvLyAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gYXdhaXQgdGhpcy5fc2VuZFRyYW5zcG9ydC5wcm9kdWNlKFxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICB0cmFjayxcbiAgLy8gICAgICAgICAgICAgZW5jb2RpbmdzLFxuICAvLyAgICAgICAgICAgICBjb2RlY09wdGlvbnM6XG4gIC8vICAgICAgICAgICAgIHtcbiAgLy8gICAgICAgICAgICAgICB2aWRlb0dvb2dsZVN0YXJ0Qml0cmF0ZTogMTAwMFxuICAvLyAgICAgICAgICAgICB9LFxuICAvLyAgICAgICAgICAgICBhcHBEYXRhOlxuICAvLyAgICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgICAgc291cmNlOiAnd2ViY2FtJ1xuICAvLyAgICAgICAgICAgICB9XG4gIC8vICAgICAgICAgICB9KTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgICBlbHNlIHtcbiAgLy8gICAgICAgICB0aGlzLl93ZWJjYW1Qcm9kdWNlciA9IGF3YWl0IHRoaXMuX3NlbmRUcmFuc3BvcnQucHJvZHVjZSh7XG4gIC8vICAgICAgICAgICB0cmFjayxcbiAgLy8gICAgICAgICAgIGFwcERhdGE6XG4gIC8vICAgICAgICAgICB7XG4gIC8vICAgICAgICAgICAgIHNvdXJjZTogJ3dlYmNhbSdcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgICB9KTtcbiAgLy8gICAgICAgfVxuXG4gIC8vICAgICAgIHN0b3JlLmRpc3BhdGNoKHByb2R1Y2VyQWN0aW9ucy5hZGRQcm9kdWNlcihcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICBpZDogdGhpcy5fd2ViY2FtUHJvZHVjZXIuaWQsXG4gIC8vICAgICAgICAgICBzb3VyY2U6ICd3ZWJjYW0nLFxuICAvLyAgICAgICAgICAgcGF1c2VkOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5wYXVzZWQsXG4gIC8vICAgICAgICAgICB0cmFjazogdGhpcy5fd2ViY2FtUHJvZHVjZXIudHJhY2ssXG4gIC8vICAgICAgICAgICBydHBQYXJhbWV0ZXJzOiB0aGlzLl93ZWJjYW1Qcm9kdWNlci5ydHBQYXJhbWV0ZXJzLFxuICAvLyAgICAgICAgICAgY29kZWM6IHRoaXMuX3dlYmNhbVByb2R1Y2VyLnJ0cFBhcmFtZXRlcnMuY29kZWNzWzBdLm1pbWVUeXBlLnNwbGl0KCcvJylbMV1cbiAgLy8gICAgICAgICB9KSk7XG5cbiAgLy8gICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYW5zcG9ydGNsb3NlJywgKCkgPT4ge1xuICAvLyAgICAgICAgIHRoaXMuX3dlYmNhbVByb2R1Y2VyID0gbnVsbDtcbiAgLy8gICAgICAgfSk7XG5cbiAgLy8gICAgICAgdGhpcy5fd2ViY2FtUHJvZHVjZXIub24oJ3RyYWNrZW5kZWQnLCAoKSA9PiB7XG4gIC8vICAgICAgICAgc3RvcmUuZGlzcGF0Y2gocmVxdWVzdEFjdGlvbnMubm90aWZ5KFxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAvLyAgICAgICAgICAgICB0ZXh0OiBpbnRsLmZvcm1hdE1lc3NhZ2Uoe1xuICAvLyAgICAgICAgICAgICAgIGlkOiAnZGV2aWNlcy5jYW1lcmFEaXNjb25uZWN0ZWQnLFxuICAvLyAgICAgICAgICAgICAgIGRlZmF1bHRNZXNzYWdlOiAnQ2FtZXJhIGRpc2Nvbm5lY3RlZCdcbiAgLy8gICAgICAgICAgICAgfSlcbiAgLy8gICAgICAgICAgIH0pKTtcblxuICAvLyAgICAgICAgIHRoaXMuZGlzYWJsZVdlYmNhbSgpO1xuICAvLyAgICAgICB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICAgIGVsc2UgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKSB7XG4gIC8vICAgICAgICh7IHRyYWNrIH0gPSB0aGlzLl93ZWJjYW1Qcm9kdWNlcik7XG5cbiAgLy8gICAgICAgYXdhaXQgdHJhY2suYXBwbHlDb25zdHJhaW50cyhcbiAgLy8gICAgICAgICB7XG4gIC8vICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAvLyAgICAgICAgICAgZnJhbWVSYXRlXG4gIC8vICAgICAgICAgfVxuICAvLyAgICAgICApO1xuXG4gIC8vICAgICAgIC8vIEFsc28gY2hhbmdlIHJlc29sdXRpb24gb2YgZXh0cmEgdmlkZW8gcHJvZHVjZXJzXG4gIC8vICAgICAgIGZvciAoY29uc3QgcHJvZHVjZXIgb2YgdGhpcy5fZXh0cmFWaWRlb1Byb2R1Y2Vycy52YWx1ZXMoKSkge1xuICAvLyAgICAgICAgICh7IHRyYWNrIH0gPSBwcm9kdWNlcik7XG5cbiAgLy8gICAgICAgICBhd2FpdCB0cmFjay5hcHBseUNvbnN0cmFpbnRzKFxuICAvLyAgICAgICAgICAge1xuICAvLyAgICAgICAgICAgICAuLi5WSURFT19DT05TVFJBSU5TW3Jlc29sdXRpb25dLFxuICAvLyAgICAgICAgICAgICBmcmFtZVJhdGVcbiAgLy8gICAgICAgICAgIH1cbiAgLy8gICAgICAgICApO1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG5cbiAgLy8gICAgIGF3YWl0IHRoaXMuX3VwZGF0ZVdlYmNhbXMoKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3VwZGF0ZVdlYmNhbSgpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChyZXF1ZXN0QWN0aW9ucy5ub3RpZnkoXG4gIC8vICAgICAgIHtcbiAgLy8gICAgICAgICB0eXBlOiAnZXJyb3InLFxuICAvLyAgICAgICAgIHRleHQ6IGludGwuZm9ybWF0TWVzc2FnZSh7XG4gIC8vICAgICAgICAgICBpZDogJ2RldmljZXMuY2FtZXJhRXJyb3InLFxuICAvLyAgICAgICAgICAgZGVmYXVsdE1lc3NhZ2U6ICdBbiBlcnJvciBvY2N1cnJlZCB3aGlsZSBhY2Nlc3NpbmcgeW91ciBjYW1lcmEnXG4gIC8vICAgICAgICAgfSlcbiAgLy8gICAgICAgfSkpO1xuXG4gIC8vICAgICBpZiAodHJhY2spXG4gIC8vICAgICAgIHRyYWNrLnN0b3AoKTtcbiAgLy8gICB9XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgIG1lQWN0aW9ucy5zZXRXZWJjYW1JblByb2dyZXNzKGZhbHNlKSk7XG4gIC8vIH1cblxuICAvLyBhc3luYyBjbG9zZU1lZXRpbmcoKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdjbG9zZU1lZXRpbmcoKScpO1xuXG4gIC8vICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICByb29tQWN0aW9ucy5zZXRDbG9zZU1lZXRpbmdJblByb2dyZXNzKHRydWUpKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdtb2RlcmF0b3I6Y2xvc2VNZWV0aW5nJyk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdjbG9zZU1lZXRpbmcoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG5cbiAgLy8gICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgIHJvb21BY3Rpb25zLnNldENsb3NlTWVldGluZ0luUHJvZ3Jlc3MoZmFsc2UpKTtcbiAgLy8gfVxuXG4gIC8vIC8vIHR5cGU6IG1pYy93ZWJjYW0vc2NyZWVuXG4gIC8vIC8vIG11dGU6IHRydWUvZmFsc2VcbiAgLy8gYXN5bmMgbW9kaWZ5UGVlckNvbnN1bWVyKHBlZXJJZCwgdHlwZSwgbXV0ZSkge1xuICAvLyAgIGxvZ2dlci5kZWJ1ZyhcbiAgLy8gICAgICdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbcGVlcklkOlwiJXNcIiwgdHlwZTpcIiVzXCJdJyxcbiAgLy8gICAgIHBlZXJJZCxcbiAgLy8gICAgIHR5cGVcbiAgLy8gICApO1xuXG4gIC8vICAgaWYgKHR5cGUgPT09ICdtaWMnKVxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIHBlZXJBY3Rpb25zLnNldFBlZXJBdWRpb0luUHJvZ3Jlc3MocGVlcklkLCB0cnVlKSk7XG4gIC8vICAgZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcbiAgLy8gICBlbHNlIGlmICh0eXBlID09PSAnc2NyZWVuJylcbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBwZWVyQWN0aW9ucy5zZXRQZWVyU2NyZWVuSW5Qcm9ncmVzcyhwZWVySWQsIHRydWUpKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBmb3IgKGNvbnN0IGNvbnN1bWVyIG9mIHRoaXMuX2NvbnN1bWVycy52YWx1ZXMoKSkge1xuICAvLyAgICAgICBpZiAoY29uc3VtZXIuYXBwRGF0YS5wZWVySWQgPT09IHBlZXJJZCAmJiBjb25zdW1lci5hcHBEYXRhLnNvdXJjZSA9PT0gdHlwZSkge1xuICAvLyAgICAgICAgIGlmIChtdXRlKVxuICAvLyAgICAgICAgICAgYXdhaXQgdGhpcy5fcGF1c2VDb25zdW1lcihjb25zdW1lcik7XG4gIC8vICAgICAgICAgZWxzZVxuICAvLyAgICAgICAgICAgYXdhaXQgdGhpcy5fcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpO1xuICAvLyAgICAgICB9XG4gIC8vICAgICB9XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdtb2RpZnlQZWVyQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG5cbiAgLy8gICBpZiAodHlwZSA9PT0gJ21pYycpXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgcGVlckFjdGlvbnMuc2V0UGVlckF1ZGlvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gIC8vICAgZWxzZSBpZiAodHlwZSA9PT0gJ3dlYmNhbScpXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgcGVlckFjdGlvbnMuc2V0UGVlclZpZGVvSW5Qcm9ncmVzcyhwZWVySWQsIGZhbHNlKSk7XG4gIC8vICAgZWxzZSBpZiAodHlwZSA9PT0gJ3NjcmVlbicpXG4gIC8vICAgICBzdG9yZS5kaXNwYXRjaChcbiAgLy8gICAgICAgcGVlckFjdGlvbnMuc2V0UGVlclNjcmVlbkluUHJvZ3Jlc3MocGVlcklkLCBmYWxzZSkpO1xuICAvLyB9XG5cbiAgLy8gYXN5bmMgX3BhdXNlQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ19wYXVzZUNvbnN1bWVyKCkgW2NvbnN1bWVyOlwiJW9cIl0nLCBjb25zdW1lcik7XG5cbiAgLy8gICBpZiAoY29uc3VtZXIucGF1c2VkIHx8IGNvbnN1bWVyLmNsb3NlZClcbiAgLy8gICAgIHJldHVybjtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdwYXVzZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAvLyAgICAgY29uc3VtZXIucGF1c2UoKTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goXG4gIC8vICAgICAgIGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclBhdXNlZChjb25zdW1lci5pZCwgJ2xvY2FsJykpO1xuICAvLyAgIH1cbiAgLy8gICBjYXRjaCAoZXJyb3IpIHtcbiAgLy8gICAgIGxvZ2dlci5lcnJvcignX3BhdXNlQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBfcmVzdW1lQ29uc3VtZXIoY29uc3VtZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoJ19yZXN1bWVDb25zdW1lcigpIFtjb25zdW1lcjpcIiVvXCJdJywgY29uc3VtZXIpO1xuXG4gIC8vICAgaWYgKCFjb25zdW1lci5wYXVzZWQgfHwgY29uc3VtZXIuY2xvc2VkKVxuICAvLyAgICAgcmV0dXJuO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoJ3Jlc3VtZUNvbnN1bWVyJywgeyBjb25zdW1lcklkOiBjb25zdW1lci5pZCB9KTtcblxuICAvLyAgICAgY29uc3VtZXIucmVzdW1lKCk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKFxuICAvLyAgICAgICBjb25zdW1lckFjdGlvbnMuc2V0Q29uc3VtZXJSZXN1bWVkKGNvbnN1bWVyLmlkLCAnbG9jYWwnKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdfcmVzdW1lQ29uc3VtZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRNYXhTZW5kaW5nU3BhdGlhbExheWVyKHNwYXRpYWxMYXllcikge1xuICAvLyAgIGxvZ2dlci5kZWJ1Zygnc2V0TWF4U2VuZGluZ1NwYXRpYWxMYXllcigpIFtzcGF0aWFsTGF5ZXI6XCIlc1wiXScsIHNwYXRpYWxMYXllcik7XG5cbiAgLy8gICB0cnkge1xuICAvLyAgICAgaWYgKHRoaXMuX3dlYmNhbVByb2R1Y2VyKVxuICAvLyAgICAgICBhd2FpdCB0aGlzLl93ZWJjYW1Qcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICAgIGlmICh0aGlzLl9zY3JlZW5TaGFyaW5nUHJvZHVjZXIpXG4gIC8vICAgICAgIGF3YWl0IHRoaXMuX3NjcmVlblNoYXJpbmdQcm9kdWNlci5zZXRNYXhTcGF0aWFsTGF5ZXIoc3BhdGlhbExheWVyKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldE1heFNlbmRpbmdTcGF0aWFsTGF5ZXIoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyBzZXRDb25zdW1lclByZWZlcnJlZExheWVycyhjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmVmZXJyZWRMYXllcnMoKSBbY29uc3VtZXJJZDpcIiVzXCIsIHNwYXRpYWxMYXllcjpcIiVzXCIsIHRlbXBvcmFsTGF5ZXI6XCIlc1wiXScsXG4gIC8vICAgICBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIpO1xuXG4gIC8vICAgdHJ5IHtcbiAgLy8gICAgIGF3YWl0IHRoaXMuc2VuZFJlcXVlc3QoXG4gIC8vICAgICAgICdzZXRDb25zdW1lclByZWZlcmVkTGF5ZXJzJywgeyBjb25zdW1lcklkLCBzcGF0aWFsTGF5ZXIsIHRlbXBvcmFsTGF5ZXIgfSk7XG5cbiAgLy8gICAgIHN0b3JlLmRpc3BhdGNoKGNvbnN1bWVyQWN0aW9ucy5zZXRDb25zdW1lclByZWZlcnJlZExheWVycyhcbiAgLy8gICAgICAgY29uc3VtZXJJZCwgc3BhdGlhbExheWVyLCB0ZW1wb3JhbExheWVyKSk7XG4gIC8vICAgfVxuICAvLyAgIGNhdGNoIChlcnJvcikge1xuICAvLyAgICAgbG9nZ2VyLmVycm9yKCdzZXRDb25zdW1lclByZWZlcnJlZExheWVycygpIFtlcnJvcjpcIiVvXCJdJywgZXJyb3IpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIC8vIGFzeW5jIHNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpIHtcbiAgLy8gICBsb2dnZXIuZGVidWcoXG4gIC8vICAgICAnc2V0Q29uc3VtZXJQcmlvcml0eSgpIFtjb25zdW1lcklkOlwiJXNcIiwgcHJpb3JpdHk6JWRdJyxcbiAgLy8gICAgIGNvbnN1bWVySWQsIHByaW9yaXR5KTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdzZXRDb25zdW1lclByaW9yaXR5JywgeyBjb25zdW1lcklkLCBwcmlvcml0eSB9KTtcblxuICAvLyAgICAgc3RvcmUuZGlzcGF0Y2goY29uc3VtZXJBY3Rpb25zLnNldENvbnN1bWVyUHJpb3JpdHkoY29uc3VtZXJJZCwgcHJpb3JpdHkpKTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3NldENvbnN1bWVyUHJpb3JpdHkoKSBbZXJyb3I6XCIlb1wiXScsIGVycm9yKTtcbiAgLy8gICB9XG4gIC8vIH1cblxuICAvLyBhc3luYyByZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZShjb25zdW1lcklkKSB7XG4gIC8vICAgbG9nZ2VyLmRlYnVnKCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZSgpIFtjb25zdW1lcklkOlwiJXNcIl0nLCBjb25zdW1lcklkKTtcblxuICAvLyAgIHRyeSB7XG4gIC8vICAgICBhd2FpdCB0aGlzLnNlbmRSZXF1ZXN0KCdyZXF1ZXN0Q29uc3VtZXJLZXlGcmFtZScsIHsgY29uc3VtZXJJZCB9KTtcbiAgLy8gICB9XG4gIC8vICAgY2F0Y2ggKGVycm9yKSB7XG4gIC8vICAgICBsb2dnZXIuZXJyb3IoJ3JlcXVlc3RDb25zdW1lcktleUZyYW1lKCkgW2Vycm9yOlwiJW9cIl0nLCBlcnJvcik7XG4gIC8vICAgfVxuICAvLyB9XG5cblxuXG5cbiAgYXN5bmMgam9pbih7IHJvb21JZCwgam9pblZpZGVvLCBqb2luQXVkaW8gfSkge1xuXG5cbiAgICB0aGlzLl9yb29tSWQgPSByb29tSWQ7XG5cblxuICAgIC8vIGluaXRpYWxpemUgc2lnbmFsaW5nIHNvY2tldFxuICAgIC8vIGxpc3RlbiB0byBzb2NrZXQgZXZlbnRzXG5cbiAgICAvLyBvbiByb29tIHJlYWR5IGpvaW4gcm9vbSBfam9pblJvb21cblxuICAgIC8vIHRoaXMuX21lZGlhc291cERldmljZSA9IG5ldyBtZWRpYXNvdXBDbGllbnQuRGV2aWNlKCk7XG5cbiAgICAvLyBjb25zdCByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgPVxuICAgIC8vICAgYXdhaXQgdGhpcy5zZW5kUmVxdWVzdCgnZ2V0Um91dGVyUnRwQ2FwYWJpbGl0aWVzJyk7XG5cbiAgICAvLyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMuaGVhZGVyRXh0ZW5zaW9ucyA9IHJvdXRlclJ0cENhcGFiaWxpdGllcy5oZWFkZXJFeHRlbnNpb25zXG4gICAgLy8gICAuZmlsdGVyKChleHQpID0+IGV4dC51cmkgIT09ICd1cm46M2dwcDp2aWRlby1vcmllbnRhdGlvbicpO1xuXG4gICAgLy8gYXdhaXQgdGhpcy5fbWVkaWFzb3VwRGV2aWNlLmxvYWQoeyByb3V0ZXJSdHBDYXBhYmlsaXRpZXMgfSk7XG5cbiAgICAvLyBjcmVhdGUgc2VuZCB0cmFuc3BvcnQgY3JlYXRlV2ViUnRjVHJhbnNwb3J0IHRoaXMuc2lnbmFsaW5nU2VydmljZS5zZW5kQ3JlYXRlVHJhbnNwb3J0XG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIGNyZWF0ZSByZWNlaXZlIHRyYW5zcG9ydCB0aGlzLnNpZ25hbGluZ1NlcnZpY2Uuc2VuZENyZWF0ZVRyYW5zcG9yXG4gICAgLy8gbGlzdGVuIHRvIHRyYW5zcG9ydCBldmVudHNcblxuICAgIC8vIHNlbmQgam9pbiByZXF1ZXN0XG5cbiAgICAvLyBhZGQgcGVlcnMgdG8gcGVlcnMgc2VydmljZVxuXG4gICAgLy8gcHJvZHVjZSB1cGRhdGVXZWJjYW0gdXBkYXRlTWljXG4gIH1cblxuXG59XG4iXX0=
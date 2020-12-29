import { Room2Service } from './room2.service';
import { Injectable } from '@angular/core';




let saveAs;

let mediasoupClient;


let requestTimeout,
	lastN,
	mobileLastN,
	videoAspectRatio;


	// {
	// 	requestTimeout = 20000,
	// 	lastN = 4,
	// 	mobileLastN = 1,
	// 	videoAspectRatio = 1.777 // 16 : 9
	// }



const VIDEO_CONSTRAINS =
{
	'low' :
	{
		width       : { ideal: 320 },
		aspectRatio : videoAspectRatio
	},
	'medium' :
	{
		width       : { ideal: 640 },
		aspectRatio : videoAspectRatio
	},
	'high' :
	{
		width       : { ideal: 1280 },
		aspectRatio : videoAspectRatio
	},
	'veryhigh' :
	{
		width       : { ideal: 1920 },
		aspectRatio : videoAspectRatio
	},
	'ultra' :
	{
		width       : { ideal: 3840 },
		aspectRatio : videoAspectRatio
	}
};

const PC_PROPRIETARY_CONSTRAINTS =
{
	optional : [ { googDscp: true } ]
};

const VIDEO_SIMULCAST_ENCODINGS =
[
	{ scaleResolutionDownBy: 4, maxBitRate: 100000 },
	{ scaleResolutionDownBy: 1, maxBitRate: 1200000 }
];

// Used for VP9 webcam video.
const VIDEO_KSVC_ENCODINGS =
[
	{ scalabilityMode: 'S3T3_KEY' }
];

// Used for VP9 desktop sharing.
const VIDEO_SVC_ENCODINGS =
[
	{ scalabilityMode: 'S3T3', dtx: true }
];


@Injectable({
  providedIn: 'root'
})
export  class RoomService {



  // Transport for sending.
  _sendTransport = null;
  // Transport for receiving.
  _recvTransport = null;

  _closed = false;

  _produce = true;

  _forceTcp = false;

  _muted
  _device
  _peerId
  _soundAlert
  _roomId
  _mediasoupDevice

  _micProducer
  _hark
  _harkStream
  _webcamProducer
  _extraVideoProducers
  _webcams
  _audioDevices
  _audioOutputDevices
  _consumers


  constructor() {


  }

  init({
    peerId=null,
    device= null,
    produce=true,
    forceTcp=false,
    muted=true
  } = {}) {
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




  async join({ roomId, joinVideo, joinAudio }) {


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
  }


}

import { Stream } from './stream';
import { RemotePeersService } from './remote-peers.service';
import { LogService } from './log.service';
import { SignalingService } from './signaling.service';

import { Injectable } from '@angular/core';

import { switchMap } from 'rxjs/operators';
import bowser from 'bowser';

import * as mediasoupClient from 'mediasoup-client'
import { Subject } from 'rxjs';
import hark from 'hark';


let saveAs;


const lastN = 4
const mobileLastN = 1
const videoAspectRatio = 1.777

const simulcast = true;
const 	simulcastEncodings   = [
  { scaleResolutionDownBy: 4 },
  { scaleResolutionDownBy: 2 },
  { scaleResolutionDownBy: 1 }
]


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
  _useSimulcast
  _turnServers

  subscriptions = [];
  public onCamProducing: Subject<any> = new Subject();
  public onVolumeChange: Subject<any> = new Subject();
  constructor(
    private signalingService: SignalingService,
    private logger: LogService,
  private remotePeersService: RemotePeersService) {


  }

  init({
    peerId=null,

    produce=true,
    forceTcp=false,
    muted=false
  } = {}) {
    if (!peerId)
      throw new Error('Missing peerId');


    // logger.debug(
    //   'constructor() [peerId: "%s", device: "%s", produce: "%s", forceTcp: "%s", displayName ""]',
    //   peerId, device.flag, produce, forceTcp);



    this.logger.debug('INIT Room ', peerId)

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

    this._useSimulcast = simulcast

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
      subscription.unsubscribe()
    })

    this.disconnectLocalHark()
    this.remotePeersService.clearPeers()
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
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      this.logger.debug('_startDevicesListener() | navigator.mediaDevices.ondevicechange');

      await this._updateAudioDevices();
      await this._updateWebcams();
      await this._updateAudioOutputDevices();

      // store.dispatch(requestActions.notify(
      //   {
      //     text: intl.formatMessage({
      //       id: 'devices.devicesChanged',
      //       defaultMessage: 'Your devices changed, configure your devices in the settings dialog'
      //     })
      //   }));
    });
  }



  async muteMic() {
    this.logger.debug('muteMic()');

    this._micProducer.pause();

    try {
      await this.signalingService.sendRequest(
        'pauseProducer', { producerId: this._micProducer.id });

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
  }

  async unmuteMic() {
    this.logger.debug('unmuteMic()');

    if (!this._micProducer) {
      this.updateMic({ start: true });
    }
    else {
      this._micProducer.resume();

      try {
        await this.signalingService.sendRequest(
          'resumeProducer', { producerId: this._micProducer.id });

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
  }
	disconnectLocalHark()
	{
		this.logger.debug('disconnectLocalHark()');

		if (this._harkStream != null)
		{
			let [ track ] = this._harkStream.getAudioTracks();

			track.stop();
			track = null;

			this._harkStream = null;
		}

		if (this._hark != null)
			this._hark.stop();
	}

	connectLocalHark(track)
	{
		this.logger.debug('connectLocalHark() [track:"%o"]', track);

		this._harkStream = new MediaStream();

		const newTrack = track.clone();

		this._harkStream.addTrack(newTrack);

		newTrack.enabled = true;

		this._hark = hark(this._harkStream,
			{
				play      : false,
				interval  : 10,
				threshold : -50,
				history   : 100
			});

		this._hark.lastVolume = -100;

		this._hark.on('volume_change', (volume) =>
    {
      // Update only if there is a bigger diff
			if (this._micProducer && Math.abs(volume - this._hark.lastVolume) > 0.5)
			{
        // Decay calculation: keep in mind that volume range is -100 ... 0 (dB)
				// This makes decay volume fast if difference to last saved value is big
				// and slow for small changes. This prevents flickering volume indicator
				// at low levels
				if (volume < this._hark.lastVolume)
				{
          volume =
          this._hark.lastVolume -
          Math.pow(
            (volume - this._hark.lastVolume) /
            (100 + this._hark.lastVolume)
            , 2
						) * 10;
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

  async changeAudioOutputDevice(deviceId) {
    this.logger.debug('changeAudioOutputDevice() [deviceId:"%s"]', deviceId);

    // store.dispatch(
    //   meActions.setAudioOutputInProgress(true));

    try {
      const device = this._audioOutputDevices[deviceId];

      if (!device)
        throw new Error('Selected audio output device no longer available');

      // store.dispatch(settingsActions.setSelectedAudioOutputDevice(deviceId));

      await this._updateAudioOutputDevices();
    }
    catch (error) {
      this.logger.error('changeAudioOutputDevice() [error:"%o"]', error);
    }

    // store.dispatch(
    //   meActions.setAudioOutputInProgress(false));
  }

  // Only Firefox supports applyConstraints to audio tracks
  // See:
  // https://bugs.chromium.org/p/chromium/issues/detail?id=796964
  async updateMic({
    start = false,
    restart = false || this._device.flag !== 'firefox',
    newDeviceId = null
  } = {}) {
    this.logger.debug(
      'updateMic() [start:"%s", restart:"%s", newDeviceId:"%s"]',
      start,
      restart,
      newDeviceId
    );

    let track;

    try {
      if (!this._mediasoupDevice.canProduce('audio'))
        throw new Error('cannot produce audio');

      if (newDeviceId && !restart)
        throw new Error('changing device requires restart');

      // if (newDeviceId)
      //   store.dispatch(settingsActions.setSelectedAudioDevice(newDeviceId));

      // store.dispatch(meActions.setAudioInProgress(true));

      const deviceId = await this._getAudioDeviceId();
      const device = this._audioDevices[deviceId];

      if (!device)
        throw new Error('no audio devices');

      const autoGainControl = false;
      const echoCancellation = true
      const noiseSuppression = true

      // if (!window.config.centralAudioOptions) {
      //   throw new Error(
      //     'Missing centralAudioOptions from app config! (See it in example config.)'
      //   );
      // }

      const {
        sampleRate = 96000,
        channelCount = 1,
        volume = 1.0,
        sampleSize = 16,
        opusStereo = false,
        opusDtx = true,
        opusFec = true,
        opusPtime = 20,
        opusMaxPlaybackRate = 96000
      } = {};

      if (
        (restart && this._micProducer) ||
        start
      ) {
        this.disconnectLocalHark();

        if (this._micProducer)
          await this.disableMic();

        const stream = await navigator.mediaDevices.getUserMedia(
          {
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
          }
        );

        ([track] = stream.getAudioTracks());

        const { deviceId: trackDeviceId } = track.getSettings();

        // store.dispatch(settingsActions.setSelectedAudioDevice(trackDeviceId));

        this._micProducer = await this._sendTransport.produce(
          {
            track,
            codecOptions:
            {
              opusStereo,
              opusDtx,
              opusFec,
              opusPtime,
              opusMaxPlaybackRate
            },
            appData:
              { source: 'mic' }
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

        await track.applyConstraints(
          {
            sampleRate,
            channelCount,
            volume,
            autoGainControl,
            echoCancellation,
            noiseSuppression,
            sampleSize
          }
        );

        if (this._harkStream != null) {
          const [harkTrack] = this._harkStream.getAudioTracks();

          harkTrack && await harkTrack.applyConstraints(
            {
              sampleRate,
              channelCount,
              volume,
              autoGainControl,
              echoCancellation,
              noiseSuppression,
              sampleSize
            }
          );
        }
      }

      await this._updateAudioDevices();
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
  }

  async updateWebcam({
    init = false,
    start = false,
    restart = false,
    newDeviceId = null,
    newResolution = null,
    newFrameRate = null
  } = {}) {
    this.logger.debug(
      'updateWebcam() [start:"%s", restart:"%s", newDeviceId:"%s", newResolution:"%s", newFrameRate:"%s"]',
      start,
      restart,
      newDeviceId,
      newResolution,
      newFrameRate
    );

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

      const  videoMuted  = false

      if (init && videoMuted)
        return;
      // else
        // store.dispatch(settingsActions.setVideoMuted(false));

      // store.dispatch(meActions.setWebcamInProgress(true));

      const deviceId = await this._getWebcamDeviceId();
      const device = this._webcams[deviceId];

      if (!device)
        throw new Error('no webcam devices');

      const  resolution = 'medium'
      const frameRate = 15



      if (
        (restart && this._webcamProducer) ||
        start
      ) {
        if (this._webcamProducer)
          await this.disableWebcam();

        const stream = await navigator.mediaDevices.getUserMedia(
          {
            video:
            {
              deviceId: { ideal: deviceId },
              ...VIDEO_CONSTRAINS[resolution],
              frameRate
            }
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

          this._webcamProducer = await this._sendTransport.produce(
            {
              track,
              encodings,
              codecOptions:
              {
                videoGoogleStartBitrate: 1000
              },
              appData:
              {
                source: 'webcam'
              }
            });
        }
        else {
          this._webcamProducer = await this._sendTransport.produce({
            track,
            appData:
            {
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


        const webCamStream = new Stream()
        webCamStream.setProducer(this._webcamProducer);

        this.onCamProducing.next(webCamStream)

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

        await track.applyConstraints(
          {
            ...VIDEO_CONSTRAINS[resolution],
            frameRate
          }
        );

        // Also change resolution of extra video producers
        for (const producer of this._extraVideoProducers.values()) {
          ({ track } = producer);

          await track.applyConstraints(
            {
              ...VIDEO_CONSTRAINS[resolution],
              frameRate
            }
          );
        }
      }

      await this._updateWebcams();
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
  }

  async closeMeeting() {
    this.logger.debug('closeMeeting()');

    // store.dispatch(
    //   roomActions.setCloseMeetingInProgress(true));

    try {
      await this.signalingService.sendRequest('moderator:closeMeeting');
    }
    catch (error) {
      this.logger.error('closeMeeting() [error:"%o"]', error);
    }

    // store.dispatch(
    //   roomActions.setCloseMeetingInProgress(false));
  }

  // // type: mic/webcam/screen
  // // mute: true/false
  async modifyPeerConsumer(peerId, type, mute) {
    this.logger.debug(
      'modifyPeerConsumer() [peerId:"%s", type:"%s"]',
      peerId,
      type
    );

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
            await this._pauseConsumer(consumer);
          else
            await this._resumeConsumer(consumer);
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
  }

  async _pauseConsumer(consumer) {
    this.logger.debug('_pauseConsumer() [consumer:"%o"]', consumer);

    if (consumer.paused || consumer.closed)
      return;

    try {
      await this.signalingService.sendRequest('pauseConsumer', { consumerId: consumer.id });

      consumer.pause();

      // store.dispatch(
      //   consumerActions.setConsumerPaused(consumer.id, 'local'));
    }
    catch (error) {
      this.logger.error('_pauseConsumer() [error:"%o"]', error);
    }
  }

  async _resumeConsumer(consumer) {
    this.logger.debug('_resumeConsumer() [consumer:"%o"]', consumer);

    if (!consumer.paused || consumer.closed)
      return;

    try {
      await this.signalingService.sendRequest('resumeConsumer', { consumerId: consumer.id });

      consumer.resume();

      // store.dispatch(
      //   consumerActions.setConsumerResumed(consumer.id, 'local'));
    }
    catch (error) {
      this.logger.error('_resumeConsumer() [error:"%o"]', error);
    }
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




  async join({ roomId, joinVideo, joinAudio, token }) {


    this._roomId = roomId;


    // initialize signaling socket
    // listen to socket events
    this.signalingService.init(token)
   this.subscriptions.push(this.signalingService.onDisconnected.subscribe( () => {
      // close
      // this.close
    }))
    this.subscriptions.push(this.signalingService.onReconnecting.subscribe( () => {
      // close

      this.logger.log('Reconnecting...')


			if (this._webcamProducer)
			{
				this._webcamProducer.close();

				// store.dispatch(
				// 	producerActions.removeProducer(this._webcamProducer.id));

				this._webcamProducer = null;
			}

			if (this._micProducer)
			{
				this._micProducer.close();

				// store.dispatch(
				// 	producerActions.removeProducer(this._micProducer.id));

				this._micProducer = null;
			}

			if (this._sendTransport)
			{
				this._sendTransport.close();

				this._sendTransport = null;
			}

			if (this._recvTransport)
			{
				this._recvTransport.close();

				this._recvTransport = null;
			}

      this.remotePeersService.clearPeers();


			// store.dispatch(roomActions.setRoomState('connecting'));
    }))

    this.subscriptions.push(this.signalingService.onNewConsumer.pipe(switchMap(async (data) => {
      const {
        peerId,
        producerId,
        id,
        kind,
        rtpParameters,
        type,
        appData,
        producerPaused
      } = data;

      const consumer  = await this._recvTransport.consume(
        {
          id,
          producerId,
          kind,
          rtpParameters,
          appData : { ...appData, peerId } // Trick.
        }) as mediasoupClient.types.Consumer;

      // Store in the map.
      this._consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () =>
      {
        this._consumers.delete(consumer.id);
      });




      this.remotePeersService.newConsumer(consumer,  peerId, type, producerPaused);

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

    })).subscribe())

    this.subscriptions.push(this.signalingService.onNotification.pipe(switchMap(async (notification) => {
      this.logger.debug(
        'socket "notification" event [method:"%s", data:"%o"]',
        notification.method, notification.data);

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

              this.remotePeersService.onConsumerLayerChanged(consumerId)
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
                await this._joinRoom({ joinVideo, joinAudio });

                break;
              }

              case 'roomReady':
                {
                  const { turnServers } = notification.data;

                  this._turnServers = turnServers;

                  // store.dispatch(roomActions.toggleJoined());
                  // store.dispatch(roomActions.setInLobby(false));

                  await this._joinRoom({ joinVideo, joinAudio });

                  break;
            }
            case 'activeSpeaker':
              {
                const { peerId } = notification.data;



              if (peerId === this._peerId) {
                  this.onVolumeChange.next(notification.data)
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

    })).subscribe())
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


	async _updateAudioDevices()
	{
		this.logger.debug('_updateAudioDevices()');

		// Reset the list.
		this._audioDevices = {};

		try
		{
			this.logger.debug('_updateAudioDevices() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'audioinput')
					continue;

				this._audioDevices[device.deviceId] = device;
			}

			// store.dispatch(
			// 	meActions.setAudioDevices(this._audioDevices));
		}
		catch (error)
		{
			this.logger.error('_updateAudioDevices() [error:"%o"]', error);
		}
	}

	async _updateWebcams()
	{
		this.logger.debug('_updateWebcams()');

		// Reset the list.
		this._webcams = {};

		try
		{
			this.logger.debug('_updateWebcams() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'videoinput')
					continue;

				this._webcams[device.deviceId] = device;
			}

			// store.dispatch(
			// 	meActions.setWebcamDevices(this._webcams));
		}
		catch (error)
		{
			this.logger.error('_updateWebcams() [error:"%o"]', error);
		}
	}

	async disableWebcam()
	{
		this.logger.debug('disableWebcam()');

		if (!this._webcamProducer)
			return;

		// store.dispatch(meActions.setWebcamInProgress(true));

		this._webcamProducer.close();

		// store.dispatch(
		// 	producerActions.removeProducer(this._webcamProducer.id));

		try
		{
			await this.signalingService.sendRequest(
				'closeProducer', { producerId: this._webcamProducer.id });
		}
		catch (error)
		{
			this.logger.error('disableWebcam() [error:"%o"]', error);
		}

		this._webcamProducer = null;
		// store.dispatch(settingsActions.setVideoMuted(true));
		// store.dispatch(meActions.setWebcamInProgress(false));
	}
	async disableMic()
	{
		this.logger.debug('disableMic()');

		if (!this._micProducer)
			return;

		// store.dispatch(meActions.setAudioInProgress(true));

		this._micProducer.close();

		// store.dispatch(
		// 	producerActions.removeProducer(this._micProducer.id));

		try
		{
			await this.signalingService.sendRequest(
				'closeProducer', { producerId: this._micProducer.id });
		}
		catch (error)
		{
			this.logger.error('disableMic() [error:"%o"]', error);
		}

		this._micProducer = null;

		// store.dispatch(meActions.setAudioInProgress(false));
  }


	async _getWebcamDeviceId()
	{
		this.logger.debug('_getWebcamDeviceId()');

		try
		{
			this.logger.debug('_getWebcamDeviceId() | calling _updateWebcams()');

			await this._updateWebcams();

			const  selectedWebcam =  null

			if (selectedWebcam && this._webcams[selectedWebcam])
				return selectedWebcam;
			else
			{
				const webcams = Object.values(this._webcams);

        // @ts-ignore
				return webcams[0] ? webcams[0].deviceId : null;
			}
		}
		catch (error)
		{
			this.logger.error('_getWebcamDeviceId() [error:"%o"]', error);
		}
  }


	async _getAudioDeviceId()
	{
		this.logger.debug('_getAudioDeviceId()');

		try
		{
			this.logger.debug('_getAudioDeviceId() | calling _updateAudioDeviceId()');

			await this._updateAudioDevices();

      const  selectedAudioDevice = null;

			if (selectedAudioDevice && this._audioDevices[selectedAudioDevice])
				return selectedAudioDevice;
			else
			{
				const audioDevices = Object.values(this._audioDevices);

        // @ts-ignore
				return audioDevices[0] ? audioDevices[0].deviceId : null;
			}
		}
		catch (error)
		{
			this.logger.error('_getAudioDeviceId() [error:"%o"]', error);
		}
	}

	async _updateAudioOutputDevices()
	{
		this.logger.debug('_updateAudioOutputDevices()');

		// Reset the list.
		this._audioOutputDevices = {};

		try
		{
			this.logger.debug('_updateAudioOutputDevices() | calling enumerateDevices()');

			const devices = await navigator.mediaDevices.enumerateDevices();

			for (const device of devices)
			{
				if (device.kind !== 'audiooutput')
					continue;

				this._audioOutputDevices[device.deviceId] = device;
			}

			// store.dispatch(
			// 	meActions.setAudioOutputDevices(this._audioOutputDevices));
		}
		catch (error)
		{
			this.logger.error('_updateAudioOutputDevices() [error:"%o"]', error);
		}
	}



  async _joinRoom({ joinVideo, joinAudio }) {
    this.logger.debug('_joinRoom() Device', this._device);

    const displayName = `Guest ${Math.floor(Math.random() * (100000 - 10000)) + 10000}`


    try {


      if (this._device.bowser === 'safari') {
        this._mediasoupDevice = new mediasoupClient.Device({handlerName:'Safari12'});
      } else {
        this._mediasoupDevice = new mediasoupClient.Device();
      }

      const routerRtpCapabilities =
        await this.signalingService.sendRequest('getRouterRtpCapabilities');

      routerRtpCapabilities.headerExtensions = routerRtpCapabilities.headerExtensions
        .filter((ext) => ext.uri !== 'urn:3gpp:video-orientation');

      await this._mediasoupDevice.load({ routerRtpCapabilities });

      if (this._produce) {
        const transportInfo = await this.signalingService.sendRequest(
          'createWebRtcTransport',
          {
            forceTcp: this._forceTcp,
            producing: true,
            consuming: false
          });

        const {
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters
        } = transportInfo;

        this._sendTransport = this._mediasoupDevice.createSendTransport(
          {
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            iceServers: this._turnServers,
            // TODO: Fix for issue #72
            iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined,
            proprietaryConstraints: PC_PROPRIETARY_CONSTRAINTS
          });

        this._sendTransport.on(
          'connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
        {
          this.signalingService.sendRequest(
            'connectWebRtcTransport',
            {
              transportId: this._sendTransport.id,
              dtlsParameters
            })
            .then(callback)
            .catch(errback);
        });

        this._sendTransport.on(
          'produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
          try {
            // eslint-disable-next-line no-shadow
            const { id } = await this.signalingService.sendRequest(
              'produce',
              {
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
        });
      }

      const transportInfo = await this.signalingService.sendRequest(
        'createWebRtcTransport',
        {
          forceTcp: this._forceTcp,
          producing: false,
          consuming: true
        });

      const {
        id,
        iceParameters,
        iceCandidates,
        dtlsParameters
      } = transportInfo;

      this._recvTransport = this._mediasoupDevice.createRecvTransport(
        {
          id,
          iceParameters,
          iceCandidates,
          dtlsParameters,
          iceServers: this._turnServers,
          // TODO: Fix for issue #72
          iceTransportPolicy: this._device.flag === 'firefox' && this._turnServers ? 'relay' : undefined
        });

      this._recvTransport.on(
        'connect', ({ dtlsParameters }, callback, errback) => // eslint-disable-line no-shadow
      {
        this.signalingService.sendRequest(
          'connectWebRtcTransport',
          {
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

      const {
        authenticated,
        roles,
        peers,
        tracker,
        roomPermissions,
        userRoles,
        allowWhenRoleMissing,
        chatHistory,
        fileHistory,
        lastNHistory,
        locked,
        lobbyPeers,
        accessCode
      } = await this.signalingService.sendRequest(
        'join',
        {
          displayName: displayName,

          rtpCapabilities: this._mediasoupDevice.rtpCapabilities
        });

      this.logger.debug(
        '_joinRoom() joined [authenticated:"%s", peers:"%o", roles:"%o", userRoles:"%o"]',
        authenticated,
        peers,
        roles,
        userRoles
      );





      // for (const peer of peers)
      // {
      // 	store.dispatch(
      // 		peerActions.addPeer({ ...peer, consumers: [] }));
      // }

        this.logger.debug('join audio',joinAudio , 'can produce audio',
          this._mediasoupDevice.canProduce('audio'), ' this._muted', this._muted)
      // Don't produce if explicitly requested to not to do it.
      if (this._produce) {
        if (
          joinVideo
        ) {
          this.updateWebcam({ init: true, start: true });
        }
        if (
          joinAudio &&
          this._mediasoupDevice.canProduce('audio')
        )
          if (!this._muted) {
            await this.updateMic({ start: true });

          }
      }

      await this._updateAudioOutputDevices();

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
      os: browser.getOSName(true), // ios, android, linux...
      platform: browser.getPlatformType(true), // mobile, desktop, tablet
      name: browser.getBrowserName(true),
      version: browser.getBrowserVersion(),
      bowser: browser
    };
  }
}

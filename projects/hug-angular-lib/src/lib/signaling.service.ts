import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';



@Injectable({
  providedIn: 'root'
})
export class SignalingService {

  peerId: string;
  roomId: string;
  _signalingSocket: Socket;
  _signalingUrl: string;



  constructor() { }


  connect() {

  }
	// timeoutCallback(callback)
	// {
	// 	let called = false;

	// 	const interval = setTimeout(
	// 		() =>
	// 		{
	// 			if (called)
	// 				return;
	// 			called = true;
	// 			callback(new SocketTimeoutError('Request timed out'));
	// 		},
	// 		requestTimeout
	// 	);

	// 	return (...args) =>
	// 	{
	// 		if (called)
	// 			return;
	// 		called = true;
	// 		clearTimeout(interval);

	// 		callback(...args);
	// 	};
	// }

	// _sendRequest(method, data)
	// {
	// 	return new Promise((resolve, reject) =>
	// 	{
	// 		if (!this._signalingSocket)
	// 		{
	// 			reject('No socket connection');
	// 		}
	// 		else
	// 		{
	// 			this._signalingSocket.emit(
	// 				'request',
	// 				{ method, data },
	// 				this.timeoutCallback((err, response) =>
	// 				{
	// 					if (err)
	// 						reject(err);
	// 					else
	// 						resolve(response);
	// 				})
	// 			);
	// 		}
	// 	});
  // }

  // join() {


  //   this._signalingSocket = io(this._signalingUrl);

  //   store.dispatch(roomActions.setRoomState('connecting'));

  //   this._signalingSocket.on('connect', () => {
  //     logger.debug('signaling Peer "connect" event');
  //   });

  //   this._signalingSocket.on('disconnect', (reason) => {
  //     logger.warn('signaling Peer "disconnect" event [reason:"%s"]', reason);

  //     if (this._closed)
  //       return;

  //     if (reason === 'io server disconnect') {
  //       store.dispatch(requestActions.notify(
  //         {
  //           text: intl.formatMessage({
  //             id: 'socket.disconnected',
  //             defaultMessage: 'You are disconnected'
  //           })
  //         }));

  //       this.close();
  //     }

  //     store.dispatch(requestActions.notify(
  //       {
  //         text: intl.formatMessage({
  //           id: 'socket.reconnecting',
  //           defaultMessage: 'You are disconnected, attempting to reconnect'
  //         })
  //       }));



  //     if (this._webcamProducer) {
  //       this._webcamProducer.close();

  //       store.dispatch(
  //         producerActions.removeProducer(this._webcamProducer.id));

  //       this._webcamProducer = null;
  //     }

  //     if (this._micProducer) {
  //       this._micProducer.close();

  //       store.dispatch(
  //         producerActions.removeProducer(this._micProducer.id));

  //       this._micProducer = null;
  //     }

  //     if (this._sendTransport) {
  //       this._sendTransport.close();

  //       this._sendTransport = null;
  //     }

  //     if (this._recvTransport) {
  //       this._recvTransport.close();

  //       this._recvTransport = null;
  //     }



  //     store.dispatch(peerActions.clearPeers());
  //     store.dispatch(consumerActions.clearConsumers());
  //     store.dispatch(roomActions.clearSpotlights());
  //     store.dispatch(roomActions.setRoomState('connecting'));
  //   });

  //   this._signalingSocket.on('reconnect_failed', () => {
  //     logger.warn('signaling Peer "reconnect_failed" event');

  //     store.dispatch(requestActions.notify(
  //       {
  //         text: intl.formatMessage({
  //           id: 'socket.disconnected',
  //           defaultMessage: 'You are disconnected'
  //         })
  //       }));

  //     this.close();
  //   });

  //   this._signalingSocket.on('reconnect', (attemptNumber) => {
  //     logger.debug('signaling Peer "reconnect" event [attempts:"%s"]', attemptNumber);

  //     store.dispatch(requestActions.notify(
  //       {
  //         text: intl.formatMessage({
  //           id: 'socket.reconnected',
  //           defaultMessage: 'You are reconnected'
  //         })
  //       }));

  //     store.dispatch(roomActions.setRoomState('connected'));
  //   });

  //   this._signalingSocket.on('request', async (request, cb) => {
  //     logger.debug(
  //       'socket "request" event [method:"%s", data:"%o"]',
  //       request.method, request.data);

  //     switch (request.method) {
  //       case 'newConsumer':
  //         {
  //           const {
  //             peerId,
  //             producerId,
  //             id,
  //             kind,
  //             rtpParameters,
  //             type,
  //             appData,
  //             producerPaused
  //           } = request.data;

  //           const consumer = await this._recvTransport.consume(
  //             {
  //               id,
  //               producerId,
  //               kind,
  //               rtpParameters,
  //               appData: { ...appData, peerId } // Trick.
  //             });

  //           // Store in the map.
  //           this._consumers.set(consumer.id, consumer);

  //           consumer.on('transportclose', () => {
  //             this._consumers.delete(consumer.id);
  //           });

  //           const { spatialLayers, temporalLayers } =
  //             mediasoupClient.parseScalabilityMode(
  //               consumer.rtpParameters.encodings[0].scalabilityMode);

  //           store.dispatch(consumerActions.addConsumer(
  //             {
  //               id: consumer.id,
  //               peerId: peerId,
  //               kind: kind,
  //               type: type,
  //               locallyPaused: false,
  //               remotelyPaused: producerPaused,
  //               rtpParameters: consumer.rtpParameters,
  //               source: consumer.appData.source,
  //               spatialLayers: spatialLayers,
  //               temporalLayers: temporalLayers,
  //               preferredSpatialLayer: spatialLayers - 1,
  //               preferredTemporalLayer: temporalLayers - 1,
  //               priority: 1,
  //               codec: consumer.rtpParameters.codecs[0].mimeType.split('/')[1],
  //               track: consumer.track
  //             },
  //             peerId));

  //           // We are ready. Answer the request so the server will
  //           // resume this Consumer (which was paused for now).
  //           cb(null);

  //           if (kind === 'audio') {
  //             consumer.volume = 0;

  //             const stream = new MediaStream();

  //             stream.addTrack(consumer.track);

  //             if (!stream.getAudioTracks()[0])
  //               throw new Error('request.newConsumer | given stream has no audio track');

  //             consumer.hark = hark(stream, { play: false });

  //             consumer.hark.on('volume_change', (volume) => {
  //               volume = Math.round(volume);

  //               if (consumer && volume !== consumer.volume) {
  //                 consumer.volume = volume;

  //                 store.dispatch(peerVolumeActions.setPeerVolume(peerId, volume));
  //               }
  //             });
  //           }

  //           break;
  //         }

  //       default:
  //         {
  //           logger.error('unknown request.method "%s"', request.method);

  //           cb(500, `unknown request.method "${request.method}"`);
  //         }
  //     }
  //   });

  //   this._signalingSocket.on('notification', async (notification) => {
  //     logger.debug(
  //       'socket "notification" event [method:"%s", data:"%o"]',
  //       notification.method, notification.data);

  //     try {
  //       switch (notification.method) {



  //         case 'producerScore':
  //           {
  //             const { producerId, score } = notification.data;

  //             store.dispatch(
  //               producerActions.setProducerScore(producerId, score));

  //             break;
  //           }

  //         case 'newPeer':
  //           {
  //             const { id, displayName, picture, roles } = notification.data;

  //             store.dispatch(peerActions.addPeer(
  //               { id, displayName, picture, roles, consumers: [] }));

  //             this._spotlights.newPeer(id);

  //             this._soundNotification();

  //             store.dispatch(requestActions.notify(
  //               {
  //                 text: intl.formatMessage({
  //                   id: 'room.newPeer',
  //                   defaultMessage: '{displayName} joined the room'
  //                 }, {
  //                   displayName
  //                 })
  //               }));

  //             break;
  //           }

  //         case 'peerClosed':
  //           {
  //             const { peerId } = notification.data;

  //             this._spotlights.closePeer(peerId);

  //             store.dispatch(
  //               peerActions.removePeer(peerId));

  //             break;
  //           }

  //         case 'consumerClosed':
  //           {
  //             const { consumerId } = notification.data;
  //             const consumer = this._consumers.get(consumerId);

  //             if (!consumer)
  //               break;

  //             consumer.close();

  //             if (consumer.hark != null)
  //               consumer.hark.stop();

  //             this._consumers.delete(consumerId);

  //             const { peerId } = consumer.appData;

  //             store.dispatch(
  //               consumerActions.removeConsumer(consumerId, peerId));

  //             break;
  //           }

  //         case 'consumerPaused':
  //           {
  //             const { consumerId } = notification.data;
  //             const consumer = this._consumers.get(consumerId);

  //             if (!consumer)
  //               break;

  //             store.dispatch(
  //               consumerActions.setConsumerPaused(consumerId, 'remote'));

  //             break;
  //           }

  //         case 'consumerResumed':
  //           {
  //             const { consumerId } = notification.data;
  //             const consumer = this._consumers.get(consumerId);

  //             if (!consumer)
  //               break;

  //             store.dispatch(
  //               consumerActions.setConsumerResumed(consumerId, 'remote'));

  //             break;
  //           }

  //         case 'consumerLayersChanged':
  //           {
  //             const { consumerId, spatialLayer, temporalLayer } = notification.data;
  //             const consumer = this._consumers.get(consumerId);

  //             if (!consumer)
  //               break;

  //             store.dispatch(consumerActions.setConsumerCurrentLayers(
  //               consumerId, spatialLayer, temporalLayer));

  //             break;
  //           }

  //         case 'consumerScore':
  //           {
  //             const { consumerId, score } = notification.data;

  //             store.dispatch(
  //               consumerActions.setConsumerScore(consumerId, score));

  //             break;
  //           }


  //         default:
  //           {
  //             logger.error(
  //               'unknown notification.method "%s"', notification.method);
  //           }
  //       }
  //     }
  //     catch (error) {
  //       logger.error('error on socket "notification" event [error:"%o"]', error);

  //       store.dispatch(requestActions.notify(
  //         {
  //           type: 'error',
  //           text: intl.formatMessage({
  //             id: 'socket.requestError',
  //             defaultMessage: 'Error on server request'
  //           })
  //         }));
  //     }

  //   });
  // }
}

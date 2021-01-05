import { Stream } from './stream';
import { LogService } from './log.service';
import { Peer } from './peer';
import { Observable } from 'rxjs/internal/Observable';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as mediasoup from 'mediasoup-client';

@Injectable({
  providedIn: 'root'
})
export class RemotePeersService {

	public remotePeers: Observable<Peer[]>;
	private _remotePeers: BehaviorSubject<Peer[]> = new BehaviorSubject([]);

  private peers: Peer[] = []
  constructor(private logger: LogService) {
    this.remotePeers = this._remotePeers.asObservable()
   }


  updatePeers() {
    setTimeout(() => 	this._remotePeers.next(this.peers)    ,0)
  }

  clearPeers(){
    this._remotePeers = <BehaviorSubject<Peer[]>>new BehaviorSubject([]);
    this.remotePeers = this._remotePeers.asObservable();
    this.peers = []
  }
  newPeer(id): Peer {
    this.logger.debug('New peer', id)
    const peer = new Peer()
    peer.id = id;
    peer.streams = []
    this.addPeer(peer)
    this.updatePeers()
    return peer
  }
  closePeer(id){
		this.logger.debug(
			'room "peerClosed" event [peerId:%o]', id);

    this.peers = this.peers.filter((peer) => peer.id !== id);
    this.updatePeers()
  }


  addPeer(peer: Peer) {
    this.peers.push(peer)
  }

  addPeers(peers){
    this.logger.debug('Add peers ', peers)
		for (const peer of peers)
		{
			if (!this.peers.find(p=>peer.id === p.id))
			{
				this.logger.debug('adding peer [peerId: "%s"]', peer.id);
        this.peers.push({ id: peer.id, streams:[] });
			}
		}
		this.updatePeers();
  }

  newConsumer(consumer: mediasoup.types.Consumer, peerId: string, type, producerPaused) {

    this.logger.debug('remote peers New consumer', consumer, peerId)
    let peer = this.peers.find(peer => peer.id === peerId)

    if (!peer) {
      this.logger.warn('Couldn\'t find peer', peerId, this.peers)
      peer = this.newPeer(peerId)
    }
    const existingStream = peer.streams.find(stream => stream.consumer?.appData.source === consumer.appData.source)

    if (existingStream) {
      existingStream.setConsumer(consumer)
    } else {
      const stream = new Stream()
      stream.peer = peer
      stream.type = type;
      stream.producerPaused = producerPaused;
      stream.setConsumer(consumer)
      this.logger.debug('New stream created ', stream)
      peer.streams.push(stream)
    }

    this.updatePeers()

  }

  onConsumerLayerChanged(consumerId) {



      const stream = this.getStreamByConsumerId( consumerId)
      if (stream) {

        stream.consumerLayerChanged()
      }

  }


  getStreamByConsumerId(consumerId: string): Stream {
    for (const peer of this.peers) {
      const stream = peer.streams.find(s => s.consumer.id === consumerId)
      if (stream) {
        return stream
      }
    }
    return null
  }
}

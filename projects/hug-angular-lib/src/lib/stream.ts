import { Subject } from 'rxjs';


import * as mediasoup from 'mediasoup-client';

import { Peer } from './peer';


export class Stream {

  public consumer?: mediasoup.types.Consumer;
  public peer?: Peer;
  public producer?
  public streamId: string;

  public onLayerChange: Subject<any> = new Subject()

  public type;
  public producerPaused: boolean

  public kind;

  mediaStream: MediaStream = new MediaStream();

  setConsumer(consumer: mediasoup.types.Consumer) {
    this.consumer = consumer;
    this.streamId = consumer.id
    this.kind = consumer.kind;
    this.mediaStream.addTrack(consumer.track);
  }

  consumerLayerChanged() {
    this.mediaStream = new MediaStream();
    this.mediaStream.addTrack(this.consumer.track);
    this.onLayerChange.next()
  }


  setProducer(producer) {
    this.producer = producer
    this.mediaStream.addTrack(producer.track);
  }
}

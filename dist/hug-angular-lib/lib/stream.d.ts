import { Subject } from 'rxjs';
import * as mediasoup from 'mediasoup-client';
import { Peer } from './peer';
export declare class Stream {
    consumer?: mediasoup.types.Consumer;
    peer?: Peer;
    producer?: any;
    streamId: string;
    onLayerChange: Subject<any>;
    type: any;
    producerPaused: boolean;
    kind: any;
    mediaStream: MediaStream;
    setConsumer(consumer: mediasoup.types.Consumer): void;
    consumerLayerChanged(): void;
    setProducer(producer: any): void;
}

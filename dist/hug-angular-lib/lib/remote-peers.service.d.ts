import { Stream } from './stream';
import { LogService } from './log.service';
import { Peer } from './peer';
import { Observable } from 'rxjs/internal/Observable';
import * as mediasoup from 'mediasoup-client';
import * as i0 from "@angular/core";
export declare class RemotePeersService {
    private logger;
    remotePeers: Observable<Peer[]>;
    private _remotePeers;
    private peers;
    constructor(logger: LogService);
    updatePeers(): void;
    clearPeers(): void;
    newPeer(id: any): Peer;
    closePeer(id: any): void;
    addPeer(peer: Peer): void;
    addPeers(peers: any): void;
    newConsumer(consumer: mediasoup.types.Consumer, peerId: string, type: any, producerPaused: any): void;
    onConsumerLayerChanged(consumerId: any): void;
    getStreamByConsumerId(consumerId: string): Stream;
    static ɵfac: i0.ɵɵFactoryDef<RemotePeersService, never>;
    static ɵprov: i0.ɵɵInjectableDef<RemotePeersService>;
}

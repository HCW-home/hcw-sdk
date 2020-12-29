import * as i0 from "@angular/core";
export declare class RoomService {
    _sendTransport: any;
    _recvTransport: any;
    _closed: boolean;
    _produce: boolean;
    _forceTcp: boolean;
    _muted: any;
    _device: any;
    _peerId: any;
    _soundAlert: any;
    _roomId: any;
    _mediasoupDevice: any;
    _micProducer: any;
    _hark: any;
    _harkStream: any;
    _webcamProducer: any;
    _extraVideoProducers: any;
    _webcams: any;
    _audioDevices: any;
    _audioOutputDevices: any;
    _consumers: any;
    constructor();
    init({ peerId, device, produce, forceTcp, muted }?: {
        peerId?: any;
        device?: any;
        produce?: boolean;
        forceTcp?: boolean;
        muted?: boolean;
    }): void;
    join({ roomId, joinVideo, joinAudio }: {
        roomId: any;
        joinVideo: any;
        joinAudio: any;
    }): Promise<void>;
    static ɵfac: i0.ɵɵFactoryDef<RoomService, never>;
    static ɵprov: i0.ɵɵInjectableDef<RoomService>;
}

import { RemotePeersService } from './remote-peers.service';
import { LogService } from './log.service';
import { SignalingService } from './signaling.service';
import bowser from 'bowser';
import { Subject } from 'rxjs';
import * as i0 from "@angular/core";
export declare class RoomService {
    private signalingService;
    private logger;
    private remotePeersService;
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
    _useSimulcast: any;
    _turnServers: any;
    onCamProducing: Subject<any>;
    constructor(signalingService: SignalingService, logger: LogService, remotePeersService: RemotePeersService);
    init({ peerId, produce, forceTcp, muted }?: {
        peerId?: any;
        produce?: boolean;
        forceTcp?: boolean;
        muted?: boolean;
    }): void;
    close(): void;
    _startDevicesListener(): void;
    muteMic(): Promise<void>;
    unmuteMic(): Promise<void>;
    changeAudioOutputDevice(deviceId: any): Promise<void>;
    updateMic({ start, restart, newDeviceId }?: {
        start?: boolean;
        restart?: boolean;
        newDeviceId?: any;
    }): Promise<void>;
    updateWebcam({ init, start, restart, newDeviceId, newResolution, newFrameRate }?: {
        init?: boolean;
        start?: boolean;
        restart?: boolean;
        newDeviceId?: any;
        newResolution?: any;
        newFrameRate?: any;
    }): Promise<void>;
    closeMeeting(): Promise<void>;
    modifyPeerConsumer(peerId: any, type: any, mute: any): Promise<void>;
    _pauseConsumer(consumer: any): Promise<void>;
    _resumeConsumer(consumer: any): Promise<void>;
    join({ roomId, joinVideo, joinAudio }: {
        roomId: any;
        joinVideo: any;
        joinAudio: any;
    }): Promise<void>;
    _updateAudioDevices(): Promise<void>;
    _updateWebcams(): Promise<void>;
    disableWebcam(): Promise<void>;
    disableMic(): Promise<void>;
    _getWebcamDeviceId(): Promise<any>;
    _getAudioDeviceId(): Promise<any>;
    _updateAudioOutputDevices(): Promise<void>;
    _joinRoom({ joinVideo, joinAudio }: {
        joinVideo: any;
        joinAudio: any;
    }): Promise<void>;
    deviceInfo(): {
        flag: any;
        os: string;
        platform: string;
        name: string;
        version: string;
        bowser: bowser.Parser.Parser;
    };
    static ɵfac: i0.ɵɵFactoryDef<RoomService, never>;
    static ɵprov: i0.ɵɵInjectableDef<RoomService>;
}

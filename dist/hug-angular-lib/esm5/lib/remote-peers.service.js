import { __values } from "tslib";
import { Stream } from './stream';
import { Peer } from './peer';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as i0 from "@angular/core";
import * as i1 from "./log.service";
var RemotePeersService = /** @class */ (function () {
    function RemotePeersService(logger) {
        this.logger = logger;
        this._remotePeers = new BehaviorSubject([]);
        this.peers = [];
        this.remotePeers = this._remotePeers.asObservable();
    }
    RemotePeersService.prototype.updatePeers = function () {
        var _this = this;
        setTimeout(function () { return _this._remotePeers.next(_this.peers); }, 0);
    };
    RemotePeersService.prototype.clearPeers = function () {
        this._remotePeers = new BehaviorSubject([]);
        this.remotePeers = this._remotePeers.asObservable();
        this.peers = [];
    };
    RemotePeersService.prototype.newPeer = function (id) {
        this.logger.debug('New peer', id);
        var peer = new Peer();
        peer.id = id;
        peer.streams = [];
        this.addPeer(peer);
        this.updatePeers();
        return peer;
    };
    RemotePeersService.prototype.closePeer = function (id) {
        this.logger.debug('room "peerClosed" event [peerId:%o]', id);
        this.peers = this.peers.filter(function (peer) { return peer.id !== id; });
        this.updatePeers();
    };
    RemotePeersService.prototype.addPeer = function (peer) {
        this.peers.push(peer);
    };
    RemotePeersService.prototype.addPeers = function (peers) {
        var e_1, _a;
        this.logger.debug('Add peers ', peers);
        var _loop_1 = function (peer) {
            if (!this_1.peers.find(function (p) { return peer.id === p.id; })) {
                this_1.logger.debug('adding peer [peerId: "%s"]', peer.id);
                this_1.peers.push({ id: peer.id, streams: [] });
            }
        };
        var this_1 = this;
        try {
            for (var peers_1 = __values(peers), peers_1_1 = peers_1.next(); !peers_1_1.done; peers_1_1 = peers_1.next()) {
                var peer = peers_1_1.value;
                _loop_1(peer);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (peers_1_1 && !peers_1_1.done && (_a = peers_1.return)) _a.call(peers_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.updatePeers();
    };
    RemotePeersService.prototype.newConsumer = function (consumer, peerId, type, producerPaused) {
        this.logger.debug('remote peers New consumer', consumer, peerId);
        var peer = this.peers.find(function (peer) { return peer.id === peerId; });
        if (!peer) {
            this.logger.warn('Couldn\'t find peer', peerId, this.peers);
            peer = this.newPeer(peerId);
        }
        var existingStream = peer.streams.find(function (stream) { var _a; return ((_a = stream.consumer) === null || _a === void 0 ? void 0 : _a.appData.source) === consumer.appData.source; });
        if (existingStream) {
            existingStream.setConsumer(consumer);
        }
        else {
            var stream = new Stream();
            stream.peer = peer;
            stream.type = type;
            stream.producerPaused = producerPaused;
            stream.setConsumer(consumer);
            this.logger.debug('New stream created ', stream);
            peer.streams.push(stream);
        }
        this.updatePeers();
    };
    RemotePeersService.prototype.onConsumerLayerChanged = function (consumerId) {
        var stream = this.getStreamByConsumerId(consumerId);
        if (stream) {
            stream.consumerLayerChanged();
        }
    };
    RemotePeersService.prototype.getStreamByConsumerId = function (consumerId) {
        var e_2, _a;
        try {
            for (var _b = __values(this.peers), _c = _b.next(); !_c.done; _c = _b.next()) {
                var peer = _c.value;
                var stream = peer.streams.find(function (s) { return s.consumer.id === consumerId; });
                if (stream) {
                    return stream;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return null;
    };
    RemotePeersService.ɵfac = function RemotePeersService_Factory(t) { return new (t || RemotePeersService)(i0.ɵɵinject(i1.LogService)); };
    RemotePeersService.ɵprov = i0.ɵɵdefineInjectable({ token: RemotePeersService, factory: RemotePeersService.ɵfac, providedIn: 'root' });
    return RemotePeersService;
}());
export { RemotePeersService };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RemotePeersService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.LogService }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlLXBlZXJzLnNlcnZpY2UuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9odWctYW5ndWxhci1saWIvIiwic291cmNlcyI6WyJsaWIvcmVtb3RlLXBlZXJzLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUU5QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxNQUFNLENBQUM7OztBQUd2QztJQVNFLDRCQUFvQixNQUFrQjtRQUFsQixXQUFNLEdBQU4sTUFBTSxDQUFZO1FBSC9CLGlCQUFZLEdBQTRCLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRS9ELFVBQUssR0FBVyxFQUFFLENBQUE7UUFFeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO0lBQ3BELENBQUM7SUFHRix3Q0FBVyxHQUFYO1FBQUEsaUJBRUM7UUFEQyxVQUFVLENBQUMsY0FBTyxPQUFBLEtBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxLQUFLLENBQUMsRUFBbEMsQ0FBa0MsRUFBSyxDQUFDLENBQUMsQ0FBQTtJQUM3RCxDQUFDO0lBRUQsdUNBQVUsR0FBVjtRQUNFLElBQUksQ0FBQyxZQUFZLEdBQTRCLElBQUksZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQTtJQUNqQixDQUFDO0lBQ0Qsb0NBQU8sR0FBUCxVQUFRLEVBQUU7UUFDUixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFV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QUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RyZWFtIH0gZnJvbSAnLi9zdHJlYW0nO1xuaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgUGVlciB9IGZyb20gJy4vcGVlcic7XG5pbXBvcnQgeyBPYnNlcnZhYmxlIH0gZnJvbSAncnhqcy9pbnRlcm5hbC9PYnNlcnZhYmxlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgbWVkaWFzb3VwIGZyb20gJ21lZGlhc291cC1jbGllbnQnO1xuXG5ASW5qZWN0YWJsZSh7XG4gIHByb3ZpZGVkSW46ICdyb290J1xufSlcbmV4cG9ydCBjbGFzcyBSZW1vdGVQZWVyc1NlcnZpY2Uge1xuXG5cdHB1YmxpYyByZW1vdGVQZWVyczogT2JzZXJ2YWJsZTxQZWVyW10+O1xuXHRwcml2YXRlIF9yZW1vdGVQZWVyczogQmVoYXZpb3JTdWJqZWN0PFBlZXJbXT4gPSBuZXcgQmVoYXZpb3JTdWJqZWN0KFtdKTtcblxuICBwcml2YXRlIHBlZXJzOiBQZWVyW10gPSBbXVxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIGxvZ2dlcjogTG9nU2VydmljZSkge1xuICAgIHRoaXMucmVtb3RlUGVlcnMgPSB0aGlzLl9yZW1vdGVQZWVycy5hc09ic2VydmFibGUoKVxuICAgfVxuXG5cbiAgdXBkYXRlUGVlcnMoKSB7XG4gICAgc2V0VGltZW91dCgoKSA9PiBcdHRoaXMuX3JlbW90ZVBlZXJzLm5leHQodGhpcy5wZWVycykgICAgLDApXG4gIH1cblxuICBjbGVhclBlZXJzKCl7XG4gICAgdGhpcy5fcmVtb3RlUGVlcnMgPSA8QmVoYXZpb3JTdWJqZWN0PFBlZXJbXT4+bmV3IEJlaGF2aW9yU3ViamVjdChbXSk7XG4gICAgdGhpcy5yZW1vdGVQZWVycyA9IHRoaXMuX3JlbW90ZVBlZXJzLmFzT2JzZXJ2YWJsZSgpO1xuICAgIHRoaXMucGVlcnMgPSBbXVxuICB9XG4gIG5ld1BlZXIoaWQpOiBQZWVyIHtcbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygnTmV3IHBlZXInLCBpZClcbiAgICBjb25zdCBwZWVyID0gbmV3IFBlZXIoKVxuICAgIHBlZXIuaWQgPSBpZDtcbiAgICBwZWVyLnN0cmVhbXMgPSBbXVxuICAgIHRoaXMuYWRkUGVlcihwZWVyKVxuICAgIHRoaXMudXBkYXRlUGVlcnMoKVxuICAgIHJldHVybiBwZWVyXG4gIH1cbiAgY2xvc2VQZWVyKGlkKXtcblx0XHR0aGlzLmxvZ2dlci5kZWJ1Zyhcblx0XHRcdCdyb29tIFwicGVlckNsb3NlZFwiIGV2ZW50IFtwZWVySWQ6JW9dJywgaWQpO1xuXG4gICAgdGhpcy5wZWVycyA9IHRoaXMucGVlcnMuZmlsdGVyKChwZWVyKSA9PiBwZWVyLmlkICE9PSBpZCk7XG4gICAgdGhpcy51cGRhdGVQZWVycygpXG4gIH1cblxuXG4gIGFkZFBlZXIocGVlcjogUGVlcikge1xuICAgIHRoaXMucGVlcnMucHVzaChwZWVyKVxuICB9XG5cbiAgYWRkUGVlcnMocGVlcnMpe1xuICAgIHRoaXMubG9nZ2VyLmRlYnVnKCdBZGQgcGVlcnMgJywgcGVlcnMpXG5cdFx0Zm9yIChjb25zdCBwZWVyIG9mIHBlZXJzKVxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5wZWVycy5maW5kKHA9PnBlZXIuaWQgPT09IHAuaWQpKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLmxvZ2dlci5kZWJ1ZygnYWRkaW5nIHBlZXIgW3BlZXJJZDogXCIlc1wiXScsIHBlZXIuaWQpO1xuICAgICAgICB0aGlzLnBlZXJzLnB1c2goeyBpZDogcGVlci5pZCwgc3RyZWFtczpbXSB9KTtcblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy51cGRhdGVQZWVycygpO1xuICB9XG5cbiAgbmV3Q29uc3VtZXIoY29uc3VtZXI6IG1lZGlhc291cC50eXBlcy5Db25zdW1lciwgcGVlcklkOiBzdHJpbmcsIHR5cGUsIHByb2R1Y2VyUGF1c2VkKSB7XG5cbiAgICB0aGlzLmxvZ2dlci5kZWJ1ZygncmVtb3RlIHBlZXJzIE5ldyBjb25zdW1lcicsIGNvbnN1bWVyLCBwZWVySWQpXG4gICAgbGV0IHBlZXIgPSB0aGlzLnBlZXJzLmZpbmQocGVlciA9PiBwZWVyLmlkID09PSBwZWVySWQpXG5cbiAgICBpZiAoIXBlZXIpIHtcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ0NvdWxkblxcJ3QgZmluZCBwZWVyJywgcGVlcklkLCB0aGlzLnBlZXJzKVxuICAgICAgcGVlciA9IHRoaXMubmV3UGVlcihwZWVySWQpXG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nU3RyZWFtID0gcGVlci5zdHJlYW1zLmZpbmQoc3RyZWFtID0+IHN0cmVhbS5jb25zdW1lcj8uYXBwRGF0YS5zb3VyY2UgPT09IGNvbnN1bWVyLmFwcERhdGEuc291cmNlKVxuXG4gICAgaWYgKGV4aXN0aW5nU3RyZWFtKSB7XG4gICAgICBleGlzdGluZ1N0cmVhbS5zZXRDb25zdW1lcihjb25zdW1lcilcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3Qgc3RyZWFtID0gbmV3IFN0cmVhbSgpXG4gICAgICBzdHJlYW0ucGVlciA9IHBlZXJcbiAgICAgIHN0cmVhbS50eXBlID0gdHlwZTtcbiAgICAgIHN0cmVhbS5wcm9kdWNlclBhdXNlZCA9IHByb2R1Y2VyUGF1c2VkO1xuICAgICAgc3RyZWFtLnNldENvbnN1bWVyKGNvbnN1bWVyKVxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ05ldyBzdHJlYW0gY3JlYXRlZCAnLCBzdHJlYW0pXG4gICAgICBwZWVyLnN0cmVhbXMucHVzaChzdHJlYW0pXG4gICAgfVxuXG4gICAgdGhpcy51cGRhdGVQZWVycygpXG5cbiAgfVxuXG4gIG9uQ29uc3VtZXJMYXllckNoYW5nZWQoY29uc3VtZXJJZCkge1xuXG5cblxuICAgICAgY29uc3Qgc3RyZWFtID0gdGhpcy5nZXRTdHJlYW1CeUNvbnN1bWVySWQoIGNvbnN1bWVySWQpXG4gICAgICBpZiAoc3RyZWFtKSB7XG5cbiAgICAgICAgc3RyZWFtLmNvbnN1bWVyTGF5ZXJDaGFuZ2VkKClcbiAgICAgIH1cblxuICB9XG5cblxuICBnZXRTdHJlYW1CeUNvbnN1bWVySWQoY29uc3VtZXJJZDogc3RyaW5nKTogU3RyZWFtIHtcbiAgICBmb3IgKGNvbnN0IHBlZXIgb2YgdGhpcy5wZWVycykge1xuICAgICAgY29uc3Qgc3RyZWFtID0gcGVlci5zdHJlYW1zLmZpbmQocyA9PiBzLmNvbnN1bWVyLmlkID09PSBjb25zdW1lcklkKVxuICAgICAgaWYgKHN0cmVhbSkge1xuICAgICAgICByZXR1cm4gc3RyZWFtXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cbn1cbiJdfQ==
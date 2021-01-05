import { Subject } from 'rxjs';
var Stream = /** @class */ (function () {
    function Stream() {
        this.onLayerChange = new Subject();
        this.mediaStream = new MediaStream();
    }
    Stream.prototype.setConsumer = function (consumer) {
        this.consumer = consumer;
        this.streamId = consumer.id;
        this.kind = consumer.kind;
        this.mediaStream.addTrack(consumer.track);
    };
    Stream.prototype.consumerLayerChanged = function () {
        this.mediaStream = new MediaStream();
        this.mediaStream.addTrack(this.consumer.track);
        this.onLayerChange.next();
    };
    Stream.prototype.setProducer = function (producer) {
        this.producer = producer;
        this.mediaStream.addTrack(producer.track);
    };
    return Stream;
}());
export { Stream };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3N0cmVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBUS9CO0lBQUE7UUFPUyxrQkFBYSxHQUFpQixJQUFJLE9BQU8sRUFBRSxDQUFBO1FBT2xELGdCQUFXLEdBQWdCLElBQUksV0FBVyxFQUFFLENBQUM7SUFvQi9DLENBQUM7SUFsQkMsNEJBQVcsR0FBWCxVQUFZLFFBQWtDO1FBQzVDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQTtRQUMzQixJQUFJLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxxQ0FBb0IsR0FBcEI7UUFDRSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzNCLENBQUM7SUFHRCw0QkFBVyxHQUFYLFVBQVksUUFBUTtRQUNsQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtRQUN4QixJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUNILGFBQUM7QUFBRCxDQUFDLEFBbENELElBa0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3ViamVjdCB9IGZyb20gJ3J4anMnO1xuXG5cbmltcG9ydCAqIGFzIG1lZGlhc291cCBmcm9tICdtZWRpYXNvdXAtY2xpZW50JztcblxuaW1wb3J0IHsgUGVlciB9IGZyb20gJy4vcGVlcic7XG5cblxuZXhwb3J0IGNsYXNzIFN0cmVhbSB7XG5cbiAgcHVibGljIGNvbnN1bWVyPzogbWVkaWFzb3VwLnR5cGVzLkNvbnN1bWVyO1xuICBwdWJsaWMgcGVlcj86IFBlZXI7XG4gIHB1YmxpYyBwcm9kdWNlcj9cbiAgcHVibGljIHN0cmVhbUlkOiBzdHJpbmc7XG5cbiAgcHVibGljIG9uTGF5ZXJDaGFuZ2U6IFN1YmplY3Q8YW55PiA9IG5ldyBTdWJqZWN0KClcblxuICBwdWJsaWMgdHlwZTtcbiAgcHVibGljIHByb2R1Y2VyUGF1c2VkOiBib29sZWFuXG5cbiAgcHVibGljIGtpbmQ7XG5cbiAgbWVkaWFTdHJlYW06IE1lZGlhU3RyZWFtID0gbmV3IE1lZGlhU3RyZWFtKCk7XG5cbiAgc2V0Q29uc3VtZXIoY29uc3VtZXI6IG1lZGlhc291cC50eXBlcy5Db25zdW1lcikge1xuICAgIHRoaXMuY29uc3VtZXIgPSBjb25zdW1lcjtcbiAgICB0aGlzLnN0cmVhbUlkID0gY29uc3VtZXIuaWRcbiAgICB0aGlzLmtpbmQgPSBjb25zdW1lci5raW5kO1xuICAgIHRoaXMubWVkaWFTdHJlYW0uYWRkVHJhY2soY29uc3VtZXIudHJhY2spO1xuICB9XG5cbiAgY29uc3VtZXJMYXllckNoYW5nZWQoKSB7XG4gICAgdGhpcy5tZWRpYVN0cmVhbSA9IG5ldyBNZWRpYVN0cmVhbSgpO1xuICAgIHRoaXMubWVkaWFTdHJlYW0uYWRkVHJhY2sodGhpcy5jb25zdW1lci50cmFjayk7XG4gICAgdGhpcy5vbkxheWVyQ2hhbmdlLm5leHQoKVxuICB9XG5cblxuICBzZXRQcm9kdWNlcihwcm9kdWNlcikge1xuICAgIHRoaXMucHJvZHVjZXIgPSBwcm9kdWNlclxuICAgIHRoaXMubWVkaWFTdHJlYW0uYWRkVHJhY2socHJvZHVjZXIudHJhY2spO1xuICB9XG59XG4iXX0=
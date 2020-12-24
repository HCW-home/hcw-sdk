import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "./room2.service";
var RoomService = /** @class */ (function () {
    function RoomService(room2) {
        this.room2 = room2;
        console.log('%croom.service.ts line:9 Room service constructor', 'color: #007acc;');
    }
    RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(i0.ɵɵinject(i1.Room2Service)); };
    RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
    return RoomService;
}());
export { RoomService };
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.Room2Service }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDOzs7QUFFM0M7SUFLRSxxQkFBbUIsS0FBbUI7UUFBbkIsVUFBSyxHQUFMLEtBQUssQ0FBYztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxFQUFFLGlCQUFpQixDQUFHLENBQUM7SUFDeEYsQ0FBQzswRUFKVSxXQUFXO3VEQUFYLFdBQVcsV0FBWCxXQUFXLG1CQUZWLE1BQU07c0JBSnBCO0NBV0MsQUFSRCxJQVFDO1NBTFksV0FBVztrREFBWCxXQUFXO2NBSHZCLFVBQVU7ZUFBQztnQkFDVixVQUFVLEVBQUUsTUFBTTthQUNuQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJvb20yU2VydmljZSB9IGZyb20gJy4vcm9vbTIuc2VydmljZSc7XG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbkBJbmplY3RhYmxlKHtcbiAgcHJvdmlkZWRJbjogJ3Jvb3QnXG59KVxuZXhwb3J0IGNsYXNzIFJvb21TZXJ2aWNlIHtcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgcm9vbTI6IFJvb20yU2VydmljZSkge1xuICAgIGNvbnNvbGUubG9nKCclY3Jvb20uc2VydmljZS50cyBsaW5lOjkgUm9vbSBzZXJ2aWNlIGNvbnN0cnVjdG9yJywgJ2NvbG9yOiAjMDA3YWNjOycsICk7XG4gIH1cbn1cbiJdfQ==
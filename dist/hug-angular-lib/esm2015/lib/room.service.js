import { Injectable } from '@angular/core';
import * as i0 from "@angular/core";
import * as i1 from "./room2.service";
export class RoomService {
    constructor(room2) {
        this.room2 = room2;
        console.log('%croom.service.ts line:9 Room service constructor', 'color: #007acc;');
    }
}
RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(i0.ɵɵinject(i1.Room2Service)); };
RoomService.ɵprov = i0.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: i1.Room2Service }]; }, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9vbS5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vaHVnLWFuZ3VsYXItbGliLyIsInNvdXJjZXMiOlsibGliL3Jvb20uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDOzs7QUFLM0MsTUFBTSxPQUFPLFdBQVc7SUFFdEIsWUFBbUIsS0FBbUI7UUFBbkIsVUFBSyxHQUFMLEtBQUssQ0FBYztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxFQUFFLGlCQUFpQixDQUFHLENBQUM7SUFDeEYsQ0FBQzs7c0VBSlUsV0FBVzttREFBWCxXQUFXLFdBQVgsV0FBVyxtQkFGVixNQUFNO2tEQUVQLFdBQVc7Y0FIdkIsVUFBVTtlQUFDO2dCQUNWLFVBQVUsRUFBRSxNQUFNO2FBQ25CIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUm9vbTJTZXJ2aWNlIH0gZnJvbSAnLi9yb29tMi5zZXJ2aWNlJztcbmltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuQEluamVjdGFibGUoe1xuICBwcm92aWRlZEluOiAncm9vdCdcbn0pXG5leHBvcnQgY2xhc3MgUm9vbVNlcnZpY2Uge1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb29tMjogUm9vbTJTZXJ2aWNlKSB7XG4gICAgY29uc29sZS5sb2coJyVjcm9vbS5zZXJ2aWNlLnRzIGxpbmU6OSBSb29tIHNlcnZpY2UgY29uc3RydWN0b3InLCAnY29sb3I6ICMwMDdhY2M7JywgKTtcbiAgfVxufVxuIl19
import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hug-angular-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
export class HugAngularLibModule {
}
HugAngularLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: HugAngularLibModule });
HugAngularLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, imports: [[
            LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR })
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [i1.LoggerModule], exports: [HugAngularLibComponent] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(HugAngularLibModule, [{
        type: NgModule,
        args: [{
                declarations: [HugAngularLibComponent],
                imports: [
                    LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR })
                ],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxZQUFZLENBQUM7OztBQVUxRCxNQUFNLE9BQU8sbUJBQW1COzt1REFBbkIsbUJBQW1CO3FIQUFuQixtQkFBbUIsa0JBTHJCO1lBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO1NBQ3pIO3dGQUdVLG1CQUFtQixtQkFOZixzQkFBc0IseUNBSTNCLHNCQUFzQjtrREFFckIsbUJBQW1CO2NBUC9CLFFBQVE7ZUFBQztnQkFDUixZQUFZLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDdEMsT0FBTyxFQUFFO29CQUNQLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUMsQ0FBQztpQkFDekg7Z0JBQ0QsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUM7YUFDbEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgSHVnQW5ndWxhckxpYkNvbXBvbmVudCB9IGZyb20gJy4vaHVnLWFuZ3VsYXItbGliLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMb2dnZXJNb2R1bGUsIE5neExvZ2dlckxldmVsIH0gZnJvbSAnbmd4LWxvZ2dlcic7XG5cblxuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF0sXG4gIGltcG9ydHM6IFtcbiAgICBMb2dnZXJNb2R1bGUuZm9yUm9vdCh7c2VydmVyTG9nZ2luZ1VybDogJy9hcGkvbG9ncycsIGxldmVsOiBOZ3hMb2dnZXJMZXZlbC5ERUJVRywgc2VydmVyTG9nTGV2ZWw6IE5neExvZ2dlckxldmVsLkVSUk9SfSlcbiAgXSxcbiAgZXhwb3J0czogW0h1Z0FuZ3VsYXJMaWJDb21wb25lbnRdXG59KVxuZXhwb3J0IGNsYXNzIEh1Z0FuZ3VsYXJMaWJNb2R1bGUgeyB9XG4iXX0=
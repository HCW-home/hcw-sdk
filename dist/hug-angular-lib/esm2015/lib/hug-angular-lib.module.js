import { LogService } from './log.service';
import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hug-angular-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
console.log('NGX logger');
export class HugAngularLibModule {
}
HugAngularLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: HugAngularLibModule });
HugAngularLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, providers: [LogService], imports: [[
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
                providers: [LogService],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLFlBQVksQ0FBQzs7O0FBRTFELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFTekIsTUFBTSxPQUFPLG1CQUFtQjs7dURBQW5CLG1CQUFtQjtxSEFBbkIsbUJBQW1CLG1CQUhwQixDQUFDLFVBQVUsQ0FBQyxZQUhiO1lBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO1NBQ3pIO3dGQUlVLG1CQUFtQixtQkFQZixzQkFBc0IseUNBSzNCLHNCQUFzQjtrREFFckIsbUJBQW1CO2NBUi9CLFFBQVE7ZUFBQztnQkFDUixZQUFZLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztnQkFDdEMsT0FBTyxFQUFFO29CQUNQLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBQyxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUMsQ0FBQztpQkFDekg7Z0JBQ0QsU0FBUyxFQUFDLENBQUMsVUFBVSxDQUFDO2dCQUN0QixPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQzthQUNsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBIdWdBbmd1bGFyTGliQ29tcG9uZW50IH0gZnJvbSAnLi9odWctYW5ndWxhci1saWIuY29tcG9uZW50JztcbmltcG9ydCB7IExvZ2dlck1vZHVsZSwgTmd4TG9nZ2VyTGV2ZWwgfSBmcm9tICduZ3gtbG9nZ2VyJztcblxuY29uc29sZS5sb2coJ05HWCBsb2dnZXInKVxuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF0sXG4gIGltcG9ydHM6IFtcbiAgICBMb2dnZXJNb2R1bGUuZm9yUm9vdCh7c2VydmVyTG9nZ2luZ1VybDogJy9hcGkvbG9ncycsIGxldmVsOiBOZ3hMb2dnZXJMZXZlbC5ERUJVRywgc2VydmVyTG9nTGV2ZWw6IE5neExvZ2dlckxldmVsLkVSUk9SfSlcbiAgXSxcbiAgcHJvdmlkZXJzOltMb2dTZXJ2aWNlXSxcbiAgZXhwb3J0czogW0h1Z0FuZ3VsYXJMaWJDb21wb25lbnRdXG59KVxuZXhwb3J0IGNsYXNzIEh1Z0FuZ3VsYXJMaWJNb2R1bGUgeyB9XG4iXX0=
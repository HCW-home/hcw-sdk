import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hug-angular-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
var HugAngularLibModule = /** @class */ (function () {
    function HugAngularLibModule() {
    }
    HugAngularLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: HugAngularLibModule });
    HugAngularLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, imports: [[
                LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR })
            ]] });
    return HugAngularLibModule;
}());
export { HugAngularLibModule };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsTUFBTSxZQUFZLENBQUM7OztBQUcxRDtJQUFBO0tBT29DOzJEQUF2QixtQkFBbUI7eUhBQW5CLG1CQUFtQixrQkFMckI7Z0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO2FBQ3pIOzhCQVRIO0NBWW9DLEFBUHBDLElBT29DO1NBQXZCLG1CQUFtQjt3RkFBbkIsbUJBQW1CLG1CQU5mLHNCQUFzQix5Q0FJM0Isc0JBQXNCO2tEQUVyQixtQkFBbUI7Y0FQL0IsUUFBUTtlQUFDO2dCQUNSLFlBQVksRUFBRSxDQUFDLHNCQUFzQixDQUFDO2dCQUN0QyxPQUFPLEVBQUU7b0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO2lCQUN6SDtnQkFDRCxPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQzthQUNsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBIdWdBbmd1bGFyTGliQ29tcG9uZW50IH0gZnJvbSAnLi9odWctYW5ndWxhci1saWIuY29tcG9uZW50JztcbmltcG9ydCB7IExvZ2dlck1vZHVsZSwgTmd4TG9nZ2VyTGV2ZWwgfSBmcm9tICduZ3gtbG9nZ2VyJztcblxuXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFtIdWdBbmd1bGFyTGliQ29tcG9uZW50XSxcbiAgaW1wb3J0czogW1xuICAgIExvZ2dlck1vZHVsZS5mb3JSb290KHtzZXJ2ZXJMb2dnaW5nVXJsOiAnL2FwaS9sb2dzJywgbGV2ZWw6IE5neExvZ2dlckxldmVsLkRFQlVHLCBzZXJ2ZXJMb2dMZXZlbDogTmd4TG9nZ2VyTGV2ZWwuRVJST1J9KVxuICBdLFxuICBleHBvcnRzOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF1cbn0pXG5leHBvcnQgY2xhc3MgSHVnQW5ndWxhckxpYk1vZHVsZSB7IH1cbiJdfQ==
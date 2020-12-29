import { LogService } from './log.service';
import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hug-angular-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import * as i0 from "@angular/core";
import * as i1 from "ngx-logger";
console.log('NGX logger');
var HugAngularLibModule = /** @class */ (function () {
    function HugAngularLibModule() {
    }
    HugAngularLibModule.ɵmod = i0.ɵɵdefineNgModule({ type: HugAngularLibModule });
    HugAngularLibModule.ɵinj = i0.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, providers: [LogService], imports: [[
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
                providers: [LogService],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLFlBQVksQ0FBQzs7O0FBRTFELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDekI7SUFBQTtLQVFvQzsyREFBdkIsbUJBQW1CO3lIQUFuQixtQkFBbUIsbUJBSHBCLENBQUMsVUFBVSxDQUFDLFlBSGI7Z0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO2FBQ3pIOzhCQVZIO0NBY29DLEFBUnBDLElBUW9DO1NBQXZCLG1CQUFtQjt3RkFBbkIsbUJBQW1CLG1CQVBmLHNCQUFzQix5Q0FLM0Isc0JBQXNCO2tEQUVyQixtQkFBbUI7Y0FSL0IsUUFBUTtlQUFDO2dCQUNSLFlBQVksRUFBRSxDQUFDLHNCQUFzQixDQUFDO2dCQUN0QyxPQUFPLEVBQUU7b0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBRSxjQUFjLEVBQUUsY0FBYyxDQUFDLEtBQUssRUFBQyxDQUFDO2lCQUN6SDtnQkFDRCxTQUFTLEVBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBQ3RCLE9BQU8sRUFBRSxDQUFDLHNCQUFzQixDQUFDO2FBQ2xDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTG9nU2VydmljZSB9IGZyb20gJy4vbG9nLnNlcnZpY2UnO1xuaW1wb3J0IHsgTmdNb2R1bGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IEh1Z0FuZ3VsYXJMaWJDb21wb25lbnQgfSBmcm9tICcuL2h1Zy1hbmd1bGFyLWxpYi5jb21wb25lbnQnO1xuaW1wb3J0IHsgTG9nZ2VyTW9kdWxlLCBOZ3hMb2dnZXJMZXZlbCB9IGZyb20gJ25neC1sb2dnZXInO1xuXG5jb25zb2xlLmxvZygnTkdYIGxvZ2dlcicpXG5ATmdNb2R1bGUoe1xuICBkZWNsYXJhdGlvbnM6IFtIdWdBbmd1bGFyTGliQ29tcG9uZW50XSxcbiAgaW1wb3J0czogW1xuICAgIExvZ2dlck1vZHVsZS5mb3JSb290KHtzZXJ2ZXJMb2dnaW5nVXJsOiAnL2FwaS9sb2dzJywgbGV2ZWw6IE5neExvZ2dlckxldmVsLkRFQlVHLCBzZXJ2ZXJMb2dMZXZlbDogTmd4TG9nZ2VyTGV2ZWwuRVJST1J9KVxuICBdLFxuICBwcm92aWRlcnM6W0xvZ1NlcnZpY2VdLFxuICBleHBvcnRzOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF1cbn0pXG5leHBvcnQgY2xhc3MgSHVnQW5ndWxhckxpYk1vZHVsZSB7IH1cbiJdfQ==
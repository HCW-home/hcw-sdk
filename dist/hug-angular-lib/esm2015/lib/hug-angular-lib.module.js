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
            LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG })
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && i0.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [i1.LoggerModule], exports: [HugAngularLibComponent] }); })();
/*@__PURE__*/ (function () { i0.ɵsetClassMetadata(HugAngularLibModule, [{
        type: NgModule,
        args: [{
                declarations: [HugAngularLibComponent],
                imports: [
                    LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG })
                ],
                providers: [LogService],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLFlBQVksQ0FBQzs7O0FBRTFELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFTekIsTUFBTSxPQUFPLG1CQUFtQjs7dURBQW5CLG1CQUFtQjtxSEFBbkIsbUJBQW1CLG1CQUhwQixDQUFDLFVBQVUsQ0FBQyxZQUhiO1lBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFDLENBQUM7U0FDckQ7d0ZBSVUsbUJBQW1CLG1CQVBmLHNCQUFzQix5Q0FLM0Isc0JBQXNCO2tEQUVyQixtQkFBbUI7Y0FSL0IsUUFBUTtlQUFDO2dCQUNSLFlBQVksRUFBRSxDQUFDLHNCQUFzQixDQUFDO2dCQUN0QyxPQUFPLEVBQUU7b0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFDLENBQUM7aUJBQ3JEO2dCQUNELFNBQVMsRUFBQyxDQUFDLFVBQVUsQ0FBQztnQkFDdEIsT0FBTyxFQUFFLENBQUMsc0JBQXNCLENBQUM7YUFDbEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBMb2dTZXJ2aWNlIH0gZnJvbSAnLi9sb2cuc2VydmljZSc7XG5pbXBvcnQgeyBOZ01vZHVsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgSHVnQW5ndWxhckxpYkNvbXBvbmVudCB9IGZyb20gJy4vaHVnLWFuZ3VsYXItbGliLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBMb2dnZXJNb2R1bGUsIE5neExvZ2dlckxldmVsIH0gZnJvbSAnbmd4LWxvZ2dlcic7XG5cbmNvbnNvbGUubG9nKCdOR1ggbG9nZ2VyJylcbkBOZ01vZHVsZSh7XG4gIGRlY2xhcmF0aW9uczogW0h1Z0FuZ3VsYXJMaWJDb21wb25lbnRdLFxuICBpbXBvcnRzOiBbXG4gICAgTG9nZ2VyTW9kdWxlLmZvclJvb3QoeyBsZXZlbDogTmd4TG9nZ2VyTGV2ZWwuREVCVUd9KVxuICBdLFxuICBwcm92aWRlcnM6W0xvZ1NlcnZpY2VdLFxuICBleHBvcnRzOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF1cbn0pXG5leHBvcnQgY2xhc3MgSHVnQW5ndWxhckxpYk1vZHVsZSB7IH1cbiJdfQ==
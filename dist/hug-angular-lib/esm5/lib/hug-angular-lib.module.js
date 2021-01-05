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
                LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG })
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
                    LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG })
                ],
                providers: [LogService],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHVnLWFuZ3VsYXItbGliLm1vZHVsZS5qcyIsInNvdXJjZVJvb3QiOiJuZzovL2h1Zy1hbmd1bGFyLWxpYi8iLCJzb3VyY2VzIjpbImxpYi9odWctYW5ndWxhci1saWIubW9kdWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxNQUFNLFlBQVksQ0FBQzs7O0FBRTFELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7QUFDekI7SUFBQTtLQVFvQzsyREFBdkIsbUJBQW1CO3lIQUFuQixtQkFBbUIsbUJBSHBCLENBQUMsVUFBVSxDQUFDLFlBSGI7Z0JBQ1AsWUFBWSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSyxFQUFDLENBQUM7YUFDckQ7OEJBVkg7Q0Fjb0MsQUFScEMsSUFRb0M7U0FBdkIsbUJBQW1CO3dGQUFuQixtQkFBbUIsbUJBUGYsc0JBQXNCLHlDQUszQixzQkFBc0I7a0RBRXJCLG1CQUFtQjtjQVIvQixRQUFRO2VBQUM7Z0JBQ1IsWUFBWSxFQUFFLENBQUMsc0JBQXNCLENBQUM7Z0JBQ3RDLE9BQU8sRUFBRTtvQkFDUCxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLLEVBQUMsQ0FBQztpQkFDckQ7Z0JBQ0QsU0FBUyxFQUFDLENBQUMsVUFBVSxDQUFDO2dCQUN0QixPQUFPLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQzthQUNsQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ1NlcnZpY2UgfSBmcm9tICcuL2xvZy5zZXJ2aWNlJztcbmltcG9ydCB7IE5nTW9kdWxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBIdWdBbmd1bGFyTGliQ29tcG9uZW50IH0gZnJvbSAnLi9odWctYW5ndWxhci1saWIuY29tcG9uZW50JztcbmltcG9ydCB7IExvZ2dlck1vZHVsZSwgTmd4TG9nZ2VyTGV2ZWwgfSBmcm9tICduZ3gtbG9nZ2VyJztcblxuY29uc29sZS5sb2coJ05HWCBsb2dnZXInKVxuQE5nTW9kdWxlKHtcbiAgZGVjbGFyYXRpb25zOiBbSHVnQW5ndWxhckxpYkNvbXBvbmVudF0sXG4gIGltcG9ydHM6IFtcbiAgICBMb2dnZXJNb2R1bGUuZm9yUm9vdCh7IGxldmVsOiBOZ3hMb2dnZXJMZXZlbC5ERUJVR30pXG4gIF0sXG4gIHByb3ZpZGVyczpbTG9nU2VydmljZV0sXG4gIGV4cG9ydHM6IFtIdWdBbmd1bGFyTGliQ29tcG9uZW50XVxufSlcbmV4cG9ydCBjbGFzcyBIdWdBbmd1bGFyTGliTW9kdWxlIHsgfVxuIl19
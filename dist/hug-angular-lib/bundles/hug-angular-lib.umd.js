(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('ngx-logger')) :
    typeof define === 'function' && define.amd ? define('hug-angular-lib', ['exports', '@angular/core', 'ngx-logger'], factory) :
    (global = global || self, factory(global['hug-angular-lib'] = {}, global.ng.core, global.ngxLogger));
}(this, (function (exports, core, ngxLogger) { 'use strict';

    var Room2Service = /** @class */ (function () {
        function Room2Service() {
            this.room = 2;
        }
        Room2Service.ɵfac = function Room2Service_Factory(t) { return new (t || Room2Service)(); };
        Room2Service.ɵprov = core.ɵɵdefineInjectable({ token: Room2Service, factory: Room2Service.ɵfac });
        return Room2Service;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(Room2Service, [{
            type: core.Injectable
        }], function () { return []; }, null); })();

    var HugAngularLibService = /** @class */ (function () {
        function HugAngularLibService(room2) {
            this.room2 = room2;
            this.random = Math.random();
        }
        HugAngularLibService.ɵfac = function HugAngularLibService_Factory(t) { return new (t || HugAngularLibService)(core.ɵɵinject(Room2Service)); };
        HugAngularLibService.ɵprov = core.ɵɵdefineInjectable({ token: HugAngularLibService, factory: HugAngularLibService.ɵfac });
        return HugAngularLibService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibService, [{
            type: core.Injectable
        }], function () { return [{ type: Room2Service }]; }, null); })();

    var HugAngularLibComponent = /** @class */ (function () {
        function HugAngularLibComponent() {
        }
        HugAngularLibComponent.prototype.ngOnInit = function () {
        };
        HugAngularLibComponent.ɵfac = function HugAngularLibComponent_Factory(t) { return new (t || HugAngularLibComponent)(); };
        HugAngularLibComponent.ɵcmp = core.ɵɵdefineComponent({ type: HugAngularLibComponent, selectors: [["lib-hug-angular-lib"]], decls: 2, vars: 0, template: function HugAngularLibComponent_Template(rf, ctx) { if (rf & 1) {
                core.ɵɵelementStart(0, "p");
                core.ɵɵtext(1, " hug-fuck shit address ");
                core.ɵɵelementEnd();
            } }, encapsulation: 2 });
        return HugAngularLibComponent;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibComponent, [{
            type: core.Component,
            args: [{
                    selector: 'lib-hug-angular-lib',
                    template: "\n    <p>\n      hug-fuck shit address\n    </p>\n  ",
                    styles: []
                }]
        }], function () { return []; }, null); })();

    var HugAngularLibModule = /** @class */ (function () {
        function HugAngularLibModule() {
        }
        HugAngularLibModule.ɵmod = core.ɵɵdefineNgModule({ type: HugAngularLibModule });
        HugAngularLibModule.ɵinj = core.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, imports: [[
                    ngxLogger.LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: ngxLogger.NgxLoggerLevel.DEBUG, serverLogLevel: ngxLogger.NgxLoggerLevel.ERROR })
                ]] });
        return HugAngularLibModule;
    }());
    (function () { (typeof ngJitMode === "undefined" || ngJitMode) && core.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [ngxLogger.LoggerModule], exports: [HugAngularLibComponent] }); })();
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(HugAngularLibModule, [{
            type: core.NgModule,
            args: [{
                    declarations: [HugAngularLibComponent],
                    imports: [
                        ngxLogger.LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: ngxLogger.NgxLoggerLevel.DEBUG, serverLogLevel: ngxLogger.NgxLoggerLevel.ERROR })
                    ],
                    exports: [HugAngularLibComponent]
                }]
        }], null, null); })();

    var RoomService = /** @class */ (function () {
        function RoomService(room2) {
            this.room2 = room2;
            console.log('%croom.service.ts line:9 Room service constructor', 'color: #007acc;');
        }
        RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(core.ɵɵinject(Room2Service)); };
        RoomService.ɵprov = core.ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
        return RoomService;
    }());
    /*@__PURE__*/ (function () { core.ɵsetClassMetadata(RoomService, [{
            type: core.Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], function () { return [{ type: Room2Service }]; }, null); })();

    exports.HugAngularLibComponent = HugAngularLibComponent;
    exports.HugAngularLibModule = HugAngularLibModule;
    exports.HugAngularLibService = HugAngularLibService;
    exports.Room2Service = Room2Service;
    exports.RoomService = RoomService;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=hug-angular-lib.umd.js.map

import { ɵɵdefineInjectable, ɵsetClassMetadata, Injectable, ɵɵinject, ɵɵdefineComponent, ɵɵelementStart, ɵɵtext, ɵɵelementEnd, Component, ɵɵdefineNgModule, ɵɵdefineInjector, ɵɵsetNgModuleScope, NgModule } from '@angular/core';
import { LoggerModule, NgxLoggerLevel, NGXLogger } from 'ngx-logger';

class Room2Service {
    constructor() {
        this.room = 2;
    }
}
Room2Service.ɵfac = function Room2Service_Factory(t) { return new (t || Room2Service)(); };
Room2Service.ɵprov = ɵɵdefineInjectable({ token: Room2Service, factory: Room2Service.ɵfac });
/*@__PURE__*/ (function () { ɵsetClassMetadata(Room2Service, [{
        type: Injectable
    }], function () { return []; }, null); })();

class HugAngularLibService {
    constructor(room2) {
        this.room2 = room2;
        this.random = Math.random();
    }
}
HugAngularLibService.ɵfac = function HugAngularLibService_Factory(t) { return new (t || HugAngularLibService)(ɵɵinject(Room2Service)); };
HugAngularLibService.ɵprov = ɵɵdefineInjectable({ token: HugAngularLibService, factory: HugAngularLibService.ɵfac });
/*@__PURE__*/ (function () { ɵsetClassMetadata(HugAngularLibService, [{
        type: Injectable
    }], function () { return [{ type: Room2Service }]; }, null); })();

class HugAngularLibComponent {
    constructor() {
    }
    ngOnInit() {
    }
}
HugAngularLibComponent.ɵfac = function HugAngularLibComponent_Factory(t) { return new (t || HugAngularLibComponent)(); };
HugAngularLibComponent.ɵcmp = ɵɵdefineComponent({ type: HugAngularLibComponent, selectors: [["lib-hug-angular-lib"]], decls: 2, vars: 0, template: function HugAngularLibComponent_Template(rf, ctx) { if (rf & 1) {
        ɵɵelementStart(0, "p");
        ɵɵtext(1, " hug-fuck shit address ");
        ɵɵelementEnd();
    } }, encapsulation: 2 });
/*@__PURE__*/ (function () { ɵsetClassMetadata(HugAngularLibComponent, [{
        type: Component,
        args: [{
                selector: 'lib-hug-angular-lib',
                template: `
    <p>
      hug-fuck shit address
    </p>
  `,
                styles: []
            }]
    }], function () { return []; }, null); })();

class HugAngularLibModule {
}
HugAngularLibModule.ɵmod = ɵɵdefineNgModule({ type: HugAngularLibModule });
HugAngularLibModule.ɵinj = ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, imports: [[
            LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR })
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], imports: [LoggerModule], exports: [HugAngularLibComponent] }); })();
/*@__PURE__*/ (function () { ɵsetClassMetadata(HugAngularLibModule, [{
        type: NgModule,
        args: [{
                declarations: [HugAngularLibComponent],
                imports: [
                    LoggerModule.forRoot({ serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR })
                ],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();

class RoomService {
    constructor(room2) {
        this.room2 = room2;
        console.log('%croom.service.ts line:9 Room service constructor', 'color: #007acc;');
    }
}
RoomService.ɵfac = function RoomService_Factory(t) { return new (t || RoomService)(ɵɵinject(Room2Service)); };
RoomService.ɵprov = ɵɵdefineInjectable({ token: RoomService, factory: RoomService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { ɵsetClassMetadata(RoomService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: Room2Service }]; }, null); })();

/*
 * Public API Surface of hug-angular-lib
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularLibComponent, HugAngularLibModule, HugAngularLibService, Room2Service, RoomService };
//# sourceMappingURL=hug-angular-lib.js.map

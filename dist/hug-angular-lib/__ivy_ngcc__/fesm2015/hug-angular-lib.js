import { __decorate } from 'tslib';
import { ɵɵdefineInjectable, Injectable, Component, NgModule } from '@angular/core';

import * as ɵngcc0 from '@angular/core';
let HugAngularLibService = class HugAngularLibService {
    constructor() {
    }
};
HugAngularLibService.ɵfac = function HugAngularLibService_Factory(t) { return new (t || HugAngularLibService)(); };
HugAngularLibService.ɵprov = ɵɵdefineInjectable({ factory: function HugAngularLibService_Factory() { return new HugAngularLibService(); }, token: HugAngularLibService, providedIn: "root" });

let HugAngularLibComponent = class HugAngularLibComponent {
    constructor() { }
    ngOnInit() {
    }
};
HugAngularLibComponent.ɵfac = function HugAngularLibComponent_Factory(t) { return new (t || HugAngularLibComponent)(); };
HugAngularLibComponent.ɵcmp = ɵngcc0.ɵɵdefineComponent({ type: HugAngularLibComponent, selectors: [["lib-hug-angular-lib"]], decls: 2, vars: 0, template: function HugAngularLibComponent_Template(rf, ctx) { if (rf & 1) {
        ɵngcc0.ɵɵelementStart(0, "p");
        ɵngcc0.ɵɵtext(1, " hug-angular-lib works ");
        ɵngcc0.ɵɵelementEnd();
    } }, encapsulation: 2 });

let HugAngularLibModule = class HugAngularLibModule {
};
HugAngularLibModule.ɵmod = ɵngcc0.ɵɵdefineNgModule({ type: HugAngularLibModule });
HugAngularLibModule.ɵinj = ɵngcc0.ɵɵdefineInjector({ factory: function HugAngularLibModule_Factory(t) { return new (t || HugAngularLibModule)(); }, imports: [[]] });
/*@__PURE__*/ (function () { ɵngcc0.ɵsetClassMetadata(HugAngularLibService, [{
        type: Injectable,
        args: [{
                providedIn: 'root'
            }]
    }], function () { return []; }, null); })();
/*@__PURE__*/ (function () { ɵngcc0.ɵsetClassMetadata(HugAngularLibComponent, [{
        type: Component,
        args: [{
                selector: 'lib-hug-angular-lib',
                template: `
    <p>
      hug-angular-lib works
    </p>
  `
            }]
    }], function () { return []; }, null); })();
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && ɵngcc0.ɵɵsetNgModuleScope(HugAngularLibModule, { declarations: [HugAngularLibComponent], exports: [HugAngularLibComponent] }); })();
/*@__PURE__*/ (function () { ɵngcc0.ɵsetClassMetadata(HugAngularLibModule, [{
        type: NgModule,
        args: [{
                declarations: [HugAngularLibComponent],
                imports: [],
                exports: [HugAngularLibComponent]
            }]
    }], null, null); })();

/*
 * Public API Surface of hug-angular-lib
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularLibComponent, HugAngularLibModule, HugAngularLibService };

//# sourceMappingURL=hug-angular-lib.js.map
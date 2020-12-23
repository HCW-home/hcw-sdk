import { __decorate } from 'tslib';
import { ɵɵdefineInjectable, Injectable, Component, NgModule } from '@angular/core';

var HugAngularLibService = /** @class */ (function () {
    function HugAngularLibService() {
    }
    HugAngularLibService.ɵprov = ɵɵdefineInjectable({ factory: function HugAngularLibService_Factory() { return new HugAngularLibService(); }, token: HugAngularLibService, providedIn: "root" });
    HugAngularLibService = __decorate([
        Injectable({
            providedIn: 'root'
        })
    ], HugAngularLibService);
    return HugAngularLibService;
}());

var HugAngularLibComponent = /** @class */ (function () {
    function HugAngularLibComponent() {
    }
    HugAngularLibComponent.prototype.ngOnInit = function () {
    };
    HugAngularLibComponent = __decorate([
        Component({
            selector: 'lib-hug-angular-lib',
            template: "\n    <p>\n      hug-angular-lib works!!\n    </p>\n  "
        })
    ], HugAngularLibComponent);
    return HugAngularLibComponent;
}());

var HugAngularLibModule = /** @class */ (function () {
    function HugAngularLibModule() {
    }
    HugAngularLibModule = __decorate([
        NgModule({
            declarations: [HugAngularLibComponent],
            imports: [],
            exports: [HugAngularLibComponent]
        })
    ], HugAngularLibModule);
    return HugAngularLibModule;
}());

/*
 * Public API Surface of hug-angular-lib
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularLibComponent, HugAngularLibModule, HugAngularLibService };
//# sourceMappingURL=hug-angular-lib.js.map

import { __decorate } from 'tslib';
import { ɵɵdefineInjectable, Injectable, Component, NgModule } from '@angular/core';

var HugAngularService = /** @class */ (function () {
    function HugAngularService() {
    }
    HugAngularService.ɵprov = ɵɵdefineInjectable({ factory: function HugAngularService_Factory() { return new HugAngularService(); }, token: HugAngularService, providedIn: "root" });
    HugAngularService = __decorate([
        Injectable({
            providedIn: 'root'
        })
    ], HugAngularService);
    return HugAngularService;
}());

var HugAngularComponent = /** @class */ (function () {
    function HugAngularComponent() {
    }
    HugAngularComponent.prototype.ngOnInit = function () {
    };
    HugAngularComponent = __decorate([
        Component({
            selector: 'lib-hug-angular',
            template: "\n    <p>\n      hug-angular works! shit fuck\nit works yay!!!\n    </p>\n  "
        })
    ], HugAngularComponent);
    return HugAngularComponent;
}());

var HugAngularModule = /** @class */ (function () {
    function HugAngularModule() {
    }
    HugAngularModule = __decorate([
        NgModule({
            declarations: [HugAngularComponent],
            imports: [],
            exports: [HugAngularComponent]
        })
    ], HugAngularModule);
    return HugAngularModule;
}());

/*
 * Public API Surface of hug-angular
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularComponent, HugAngularModule, HugAngularService };
//# sourceMappingURL=hug-angular.js.map

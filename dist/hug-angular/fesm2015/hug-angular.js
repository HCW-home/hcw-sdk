import { __decorate } from 'tslib';
import { ɵɵdefineInjectable, Injectable, Component, NgModule } from '@angular/core';

let HugAngularService = class HugAngularService {
    constructor() {
    }
};
HugAngularService.ɵprov = ɵɵdefineInjectable({ factory: function HugAngularService_Factory() { return new HugAngularService(); }, token: HugAngularService, providedIn: "root" });
HugAngularService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], HugAngularService);

let HugAngularComponent = class HugAngularComponent {
    constructor() { }
    ngOnInit() {
    }
};
HugAngularComponent = __decorate([
    Component({
        selector: 'lib-hug-angular',
        template: `
    <p>
      hug-angular works! shit fuck
it works yay!!!
    </p>
  `
    })
], HugAngularComponent);

let HugAngularModule = class HugAngularModule {
};
HugAngularModule = __decorate([
    NgModule({
        declarations: [HugAngularComponent],
        imports: [],
        exports: [HugAngularComponent]
    })
], HugAngularModule);

/*
 * Public API Surface of hug-angular
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularComponent, HugAngularModule, HugAngularService };
//# sourceMappingURL=hug-angular.js.map

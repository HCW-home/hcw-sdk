import { __decorate } from 'tslib';
import { ɵɵdefineInjectable, Injectable, Component, NgModule } from '@angular/core';

let HugAngularLibService = class HugAngularLibService {
    constructor() {
    }
};
HugAngularLibService.ɵprov = ɵɵdefineInjectable({ factory: function HugAngularLibService_Factory() { return new HugAngularLibService(); }, token: HugAngularLibService, providedIn: "root" });
HugAngularLibService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], HugAngularLibService);

let HugAngularLibComponent = class HugAngularLibComponent {
    constructor() { }
    ngOnInit() {
    }
};
HugAngularLibComponent = __decorate([
    Component({
        selector: 'lib-hug-angular-lib',
        template: `
    <p>
      hug-angular-lib works!
    </p>
  `
    })
], HugAngularLibComponent);

let HugAngularLibModule = class HugAngularLibModule {
};
HugAngularLibModule = __decorate([
    NgModule({
        declarations: [HugAngularLibComponent],
        imports: [],
        exports: [HugAngularLibComponent]
    })
], HugAngularLibModule);

/*
 * Public API Surface of hug-angular-lib
 */

/**
 * Generated bundle index. Do not edit.
 */

export { HugAngularLibComponent, HugAngularLibModule, HugAngularLibService };
//# sourceMappingURL=hug-angular-lib.js.map

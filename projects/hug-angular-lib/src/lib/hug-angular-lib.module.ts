import { NgModule } from '@angular/core';
import { HugAngularLibComponent } from './hug-angular-lib.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';

console.log('NGX logger')
@NgModule({
  declarations: [HugAngularLibComponent],
  imports: [
    // LoggerModule.forRoot({serverLoggingUrl: '/api/logs', level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR})
  ],
  exports: [HugAngularLibComponent]
})
export class HugAngularLibModule { }

import { Observable } from 'rxjs';
export declare class NGXLoggerHttpServiceMock {
    constructor();
    logOnServer(url: string, message: string, additional: any[], timestamp: string, logLevel: string): Observable<any>;
}

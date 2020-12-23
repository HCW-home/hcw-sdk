import { TestBed } from '@angular/core/testing';

import { HugAngularLibService } from './hug-angular-lib.service';

describe('HugAngularLibService', () => {
  let service: HugAngularLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HugAngularLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

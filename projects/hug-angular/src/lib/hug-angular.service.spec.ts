import { TestBed } from '@angular/core/testing';

import { HugAngularService } from './hug-angular.service';

describe('HugAngularService', () => {
  let service: HugAngularService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HugAngularService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

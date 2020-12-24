import { TestBed } from '@angular/core/testing';

import { Room2Service } from './room2.service';

describe('Room2Service', () => {
  let service: Room2Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Room2Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

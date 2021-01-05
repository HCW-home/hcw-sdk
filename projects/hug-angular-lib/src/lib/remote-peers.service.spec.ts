import { TestBed } from '@angular/core/testing';

import { RemotePeersService } from './remote-peers.service';

describe('RemotePeersService', () => {
  let service: RemotePeersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RemotePeersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

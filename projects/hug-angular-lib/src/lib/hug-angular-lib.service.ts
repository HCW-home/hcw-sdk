import { Room2Service } from './room2.service';
import { Injectable } from '@angular/core';

@Injectable()
export class HugAngularLibService {

  public random:number
  public random2:number
  constructor(private room2: Room2Service) {
    this.random = Math.random()
  }
}

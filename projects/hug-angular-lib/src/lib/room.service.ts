import { Room2Service } from './room2.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  constructor(public room2: Room2Service) {
    console.log('%croom.service.ts line:9 Room service constructor', 'color: #007acc;', );
  }
}

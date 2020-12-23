import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HugAngularComponent } from './hug-angular.component';

describe('HugAngularComponent', () => {
  let component: HugAngularComponent;
  let fixture: ComponentFixture<HugAngularComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HugAngularComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HugAngularComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

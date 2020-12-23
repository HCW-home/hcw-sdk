import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { HugAngularLibComponent } from './hug-angular-lib.component';

describe('HugAngularLibComponent', () => {
  let component: HugAngularLibComponent;
  let fixture: ComponentFixture<HugAngularLibComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HugAngularLibComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HugAngularLibComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

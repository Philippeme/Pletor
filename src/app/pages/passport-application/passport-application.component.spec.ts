import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassportApplicationComponent } from './passport-application.component';

describe('PassportApplicationComponent', () => {
  let component: PassportApplicationComponent;
  let fixture: ComponentFixture<PassportApplicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PassportApplicationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassportApplicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

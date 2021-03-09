import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfotabComponent } from './infotab.component';

describe('InfotabComponent', () => {
  let component: InfotabComponent;
  let fixture: ComponentFixture<InfotabComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InfotabComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfotabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

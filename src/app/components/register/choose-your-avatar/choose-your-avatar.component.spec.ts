import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChooseYourAvatarComponent } from './choose-your-avatar.component';

describe('ChooseYourAvatarComponent', () => {
  let component: ChooseYourAvatarComponent;
  let fixture: ComponentFixture<ChooseYourAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChooseYourAvatarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChooseYourAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

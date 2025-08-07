import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvatarEditModalComponent } from './avatar-edit-modal.component';

describe('AvatarEditModalComponent', () => {
  let component: AvatarEditModalComponent;
  let fixture: ComponentFixture<AvatarEditModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvatarEditModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvatarEditModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

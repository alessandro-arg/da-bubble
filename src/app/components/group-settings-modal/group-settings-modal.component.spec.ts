import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupSettingsModalComponent } from './group-settings-modal.component';

describe('GroupSettingsModalComponent', () => {
  let component: GroupSettingsModalComponent;
  let fixture: ComponentFixture<GroupSettingsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupSettingsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupSettingsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMembersModalComponent } from './group-members-modal.component';

describe('GroupMembersModalComponent', () => {
  let component: GroupMembersModalComponent;
  let fixture: ComponentFixture<GroupMembersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupMembersModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupMembersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

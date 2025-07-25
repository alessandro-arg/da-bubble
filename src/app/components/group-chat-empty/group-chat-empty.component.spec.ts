import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupChatEmptyComponent } from './group-chat-empty.component';

describe('GroupChatEmptyComponent', () => {
  let component: GroupChatEmptyComponent;
  let fixture: ComponentFixture<GroupChatEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupChatEmptyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupChatEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

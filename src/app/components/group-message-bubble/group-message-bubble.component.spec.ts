import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupMessageBubbleComponent } from './group-message-bubble.component';

describe('GroupMessageBubbleComponent', () => {
  let component: GroupMessageBubbleComponent;
  let fixture: ComponentFixture<GroupMessageBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupMessageBubbleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GroupMessageBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivateMessageBubbleComponent } from './private-message-bubble.component';

describe('PrivateMessageBubbleComponent', () => {
  let component: PrivateMessageBubbleComponent;
  let fixture: ComponentFixture<PrivateMessageBubbleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateMessageBubbleComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrivateMessageBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

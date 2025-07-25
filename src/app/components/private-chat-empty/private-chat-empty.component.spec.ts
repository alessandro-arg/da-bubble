import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrivateChatEmptyComponent } from './private-chat-empty.component';

describe('PrivateChatEmptyComponent', () => {
  let component: PrivateChatEmptyComponent;
  let fixture: ComponentFixture<PrivateChatEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrivateChatEmptyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrivateChatEmptyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

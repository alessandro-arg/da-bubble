import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SendEmailResetPasswordComponent } from './send-email-reset-password.component';

describe('SendEmailResetPasswordComponent', () => {
  let component: SendEmailResetPasswordComponent;
  let fixture: ComponentFixture<SendEmailResetPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SendEmailResetPasswordComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SendEmailResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMembersModalComponent } from './add-members-modal.component';

describe('AddMembersModalComponent', () => {
  let component: AddMembersModalComponent;
  let fixture: ComponentFixture<AddMembersModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMembersModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddMembersModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

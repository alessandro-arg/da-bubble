import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceToggleButtonComponent } from './workspace-toggle-button.component';

describe('WorkspaceToggleButtonComponent', () => {
  let component: WorkspaceToggleButtonComponent;
  let fixture: ComponentFixture<WorkspaceToggleButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceToggleButtonComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorkspaceToggleButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

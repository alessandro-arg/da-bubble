import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-workspace-toggle-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workspace-toggle-button.component.html',
  styleUrl: './workspace-toggle-button.component.scss',
})
export class WorkspaceToggleButtonComponent {
  isOpen = true;
  isHovered = false;

  toggle() {
    this.isOpen = !this.isOpen;
  }

  onMouseEnter() {
    this.isHovered = true;
  }

  onMouseLeave() {
    this.isHovered = false;
  }

  get iconSrc() {
    return this.isHovered
      ? 'assets/img/icons/toggle_purple.png'
      : 'assets/img/icons/toggle.png';
  }
}

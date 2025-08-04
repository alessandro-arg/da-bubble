/**
 * WorkspaceToggleButtonComponent provides a toggle UI element,
 * typically used to collapse or expand a workspace sidebar or panel.
 * The button changes its icon on hover for better visual feedback.
 */

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

  /**
   * Toggles the open/closed state of the workspace.
   */
  toggle() {
    this.isOpen = !this.isOpen;
  }

  /**
   * Sets `isHovered` to true when the mouse enters the button.
   */
  onMouseEnter() {
    this.isHovered = true;
  }

  /**
   * Sets `isHovered` to false when the mouse leaves the button.
   */
  onMouseLeave() {
    this.isHovered = false;
  }

  /**
   * Returns the path to the appropriate icon image based on hover state.
   */
  get iconSrc() {
    return this.isHovered
      ? 'assets/img/icons/toggle_purple.png'
      : 'assets/img/icons/toggle.png';
  }
}

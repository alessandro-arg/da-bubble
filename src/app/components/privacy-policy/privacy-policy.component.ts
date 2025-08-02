import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss'
})
export class PrivacyPolicyComponent implements OnInit {

  constructor(private viewportScroller: ViewportScroller) { }

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method scrolls the viewport to the top-left position ([0, 0]) when the component is initialized.
   */
  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);
  }
}
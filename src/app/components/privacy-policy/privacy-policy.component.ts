import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent implements OnInit {
  isMobile = false;
  arrowHover = false;

  constructor(
    private viewportScroller: ViewportScroller,
    private mobileService: MobileService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method scrolls the viewport to the top-left position ([0, 0]) when the component is initialized.
   */
  ngOnInit(): void {
    this.viewportScroller.scrollToPosition([0, 0]);

    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }
}

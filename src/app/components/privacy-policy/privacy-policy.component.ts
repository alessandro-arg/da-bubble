import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
})
export class PrivacyPolicyComponent implements OnInit {
  isMobile = false;
  arrowHover = false;

  private platformId = inject(PLATFORM_ID);

  constructor(
    private viewportScroller: ViewportScroller,
    private mobileService: MobileService,
    private location: Location,
    private router: Router
  ) {}

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method scrolls the viewport to the top-left position ([0, 0]) when the component is initialized.
   */
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.viewportScroller.scrollToPosition([0, 0]);
    }

    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  goBack() {
    if (isPlatformBrowser(this.platformId) && history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/login']);
    }
  }
}

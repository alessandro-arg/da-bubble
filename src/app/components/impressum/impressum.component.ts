import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { MobileService } from '../../services/mobile.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss',
})
export class ImpressumComponent implements OnInit {
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
   * This method scrolls the viewport to the top-left position ([0, 0]) upon initialization.
   * It ensures that the user starts at the top of the page when the component is loaded.
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

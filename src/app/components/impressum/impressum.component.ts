import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';
import { MobileService } from '../../services/mobile.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss',
})
export class ImpressumComponent implements OnInit {
  isMobile = false;
  arrowHover = false;

  constructor(
    private ViewportScroller: ViewportScroller,
    private mobileService: MobileService
  ) {}

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method scrolls the viewport to the top-left position ([0, 0]) upon initialization.
   * It ensures that the user starts at the top of the page when the component is loaded.
   */
  ngOnInit(): void {
    this.ViewportScroller.scrollToPosition([0, 0]);

    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }
}

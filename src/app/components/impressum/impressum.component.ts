import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ViewportScroller } from '@angular/common';


@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss'
})
export class ImpressumComponent implements OnInit {
  constructor(private ViewportScroller: ViewportScroller) { }

  /**
   * Lifecycle hook that is called after Angular has initialized the component.
   * This method scrolls the viewport to the top-left position ([0, 0]) upon initialization.
   * It ensures that the user starts at the top of the page when the component is loaded.
   */
  ngOnInit(): void {
    this.ViewportScroller.scrollToPosition([0, 0]);
  }
}

import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
})
export class IntroComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private doc = inject(DOCUMENT);

  constructor(private router: Router) {}

  /**
   * Lifecycle hook that is called after Angular has initialized all data-bound properties of a directive.
   * This method is used to start the animation sequence when the component is initialized.
   *
   * @see https://angular.io/api/core/OnInit
   */
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.startAnimationSequence();
    }
  }

  /**
   * Initiates an animation sequence by first waiting for a delay,
   * then triggering element animations, and finally navigating
   * to the login page after a short timeout.
   *
   * @returns A promise that resolves once the animation sequence is initiated.
   */
  private async startAnimationSequence(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await this.triggerElementAnimations();

    if (isPlatformBrowser(this.platformId)) {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Triggers animations for specific elements in the intro component.
   *
   * This method applies CSS classes to elements to initiate animations and removes
   * specific classes after a delay to complete the animation sequence. It returns
   * a promise that resolves once all animations are completed.
   *
   * @returns {Promise<void>} A promise that resolves when the animations are finished.
   */
  private triggerElementAnimations(): Promise<void> {
    return new Promise((resolve) => {
      const background = this.doc.querySelector(
        '.background-color-intro'
      ) as HTMLElement | null;
      const logo = this.doc.querySelector(
        '.background-color-intro-logo'
      ) as HTMLElement | null;
      const content = this.doc.querySelector(
        '.intro-content'
      ) as HTMLElement | null;

      setTimeout(() => {
        logo?.classList.remove('background-color-intro-logo');
      }, 600);

      setTimeout(() => {
        background?.classList.remove('background-color-intro');
        resolve();
      }, 900);
    });
  }
}

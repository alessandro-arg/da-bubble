import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
})
export class IntroComponent implements OnInit {
  constructor(private router: Router) {}

  /**
   * Lifecycle hook that is called after Angular has initialized all data-bound properties of a directive.
   * This method is used to start the animation sequence when the component is initialized.
   *
   * @see https://angular.io/api/core/OnInit
   */
  ngOnInit(): void {
    this.startAnimationSequence();
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

    this.router.navigate(['/login']);
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
      const elements = {
        background: document.querySelector('.background-color-intro'),
        logo: document.querySelector('.background-color-intro-logo'),
        content: document.querySelector('.intro-content'),
      };

      setTimeout(() => {
        if (elements.logo) {
          elements.logo.classList.remove('background-color-intro-logo');
        }
      }, 600);

      setTimeout(() => {
        if (elements.background) {
          elements.background.classList.remove('background-color-intro');
        }
        resolve();
      }, 900);
    });
  }
}

/**
 * IntroComponent handles the animated intro screen before routing the user to the login page.
 * It plays only once per browser session by checking `sessionStorage`.
 */

import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-intro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss'],
})
export class IntroComponent implements AfterViewInit {
  /**
   * Creates an instance of IntroComponent.
   * @param router Angular Router for navigation.
   * @param platformId Identifier to check if the code is running in a browser.
   */
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Lifecycle hook called after component's view has been fully initialized.
   * Starts the intro animation sequence.
   */
  ngAfterViewInit(): void {
    this.startIntroSequence();
  }

  /**
   * Triggers the intro animation if it hasn't been shown yet.
   * Uses sessionStorage to track whether the intro has already run.
   * Navigates to the login page after animation or immediately if already shown.
   */
  private startIntroSequence(): void {
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        const introAlreadyShown = sessionStorage.getItem('introShown');
        if (!introAlreadyShown) {
          // Start sliding animation after text appears
          setTimeout(() => {
            const introContent = document.querySelector('.intro-content');
            const backgroundColorIntro = document.querySelector(
              '.background-color-intro'
            );
            const backgroundColorIntroLogo = document.querySelector(
              '.background-color-intro-logo'
            );
            if (introContent && backgroundColorIntroLogo) {
              introContent.classList.add('slide-animation');
              backgroundColorIntroLogo.classList.remove(
                'background-color-intro-logo'
              );
              setTimeout(() => {
                if (backgroundColorIntro) {
                  backgroundColorIntro.classList.remove(
                    'background-color-intro'
                  );
                }
              }, 600);
            }

            setTimeout(() => {
              this.navigateToLogin();
            }, 1000);
          }, 1000);
        } else {
          this.navigateToLogin();
        }
      } else {
        this.navigateToLogin();
      }
    }, 100);
  }

  /**
   * Navigates to the login page and clears localStorage in browser context.
   */
  private navigateToLogin(): void {
    this.router
      .navigate(['/login'])
      .catch((err) => console.error('Navigation error:', err));

    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
  }
}

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
  styleUrls: ['./intro.component.scss']
})
export class IntroComponent implements AfterViewInit {
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    this.startIntroSequence();
  }

  private startIntroSequence(): void {
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        const introAlreadyShown = sessionStorage.getItem('introShown');
        if (!introAlreadyShown) {
          // Start sliding animation after text appears
          setTimeout(() => {
            const introContent = document.querySelector('.intro-content');
            if (introContent) {
              introContent.classList.add('slide-animation');
            }
            
            // Navigate after sliding completes
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

  private navigateToLogin(): void {
    this.router.navigate(['/login'])
      .catch(err => console.error('Navigation error:', err));

    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
  }
}
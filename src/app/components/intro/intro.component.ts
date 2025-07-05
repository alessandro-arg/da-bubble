import { Component, AfterViewInit, ViewChild, ElementRef, NgZone } from '@angular/core';
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
  @ViewChild('animatedTitle', { static: true }) animatedTitle!: ElementRef;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('IntroComponent constructor');
  }

  ngAfterViewInit(): void {
    console.log('ngAfterViewInit - Starting intro sequence');
    this.startIntroSequence();
  }

  private startIntroSequence(): void {
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        const introAlreadyShown = sessionStorage.getItem('introShown');
        if (!introAlreadyShown) {
          //sessionStorage.setItem('introShown', 'true');
          this.playAnimation();
        } else {
          this.navigateToLogin();
        }
      } else {
        this.navigateToLogin();
      }
    }, 100);
}

  private playAnimation(): void {
    console.log('Playing animation...');

    const letters = [' DABubble '];
    const element = this.animatedTitle.nativeElement;
    element.innerHTML = '';

    const charDelay = 100;
    const initialOffset = -100; // Startposition weiter links
    const spacing = 30;
    

    letters.forEach((letter, i) => {
      const span = document.createElement('span');
      span.textContent = letter;
      span.style.opacity = '0';
      span.style.display = 'inline-block';
      span.style.transform = `translateX(${initialOffset}px)`;
      span.style.transition = `opacity 300ms ease-out, transform 500ms ease-out`;
      span.style.position = 'relative';
      span.style.zIndex = '0';

      setTimeout(() => {
        span.style.opacity = '1';
        span.style.transform = 'translateX(0)';
      }, i * charDelay);

      element.appendChild(span);
    });

    setTimeout(() => {
      const introContent = document.querySelector('.intro-content');
      if (introContent) {
        introContent.classList.add('final-animation');
      }
      
      setTimeout(() => {
        this.navigateToLogin();
      }, 1000);
    }, letters.length * charDelay + 1000);
  }

  private navigateToLogin(): void {
    console.log('Navigating to login...');
    this.ngZone.run(() => {
      this.router.navigate(['/login'])
        .then(() => console.log('Navigation successful'))
        .catch(err => console.error('Navigation error:', err));
    });

    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
      console.log('Local storage cleared');
    }
  }
}

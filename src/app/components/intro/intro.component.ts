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
  constructor(private router: Router) { }

  ngOnInit(): void {
    this.startAnimationSequence();
  }

  private async startAnimationSequence(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.triggerElementAnimations();

    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 250);
  }

  private triggerElementAnimations(): Promise<void> {
    return new Promise(resolve => {
      const elements = {
        background: document.querySelector('.background-color-intro'),
        logo: document.querySelector('.background-color-intro-logo'),
        content: document.querySelector('.intro-content')
      };

      if (elements.content) {
        elements.content.classList.add('animate-active');
      }

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
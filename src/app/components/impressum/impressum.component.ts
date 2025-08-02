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
  constructor(private ViewportScroller: ViewportScroller ) { }
  ngOnInit(): void {
    this.ViewportScroller.scrollToPosition([0, 0]);
  }
}

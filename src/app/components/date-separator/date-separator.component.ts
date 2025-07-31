/**
 * A UI component that visually separates chat messages by date.
 * It determines whether to show a date label and formats it accordingly
 * based on whether the message is from today, this week, or an earlier date.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-date-separator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-separator.component.html',
  styleUrl: './date-separator.component.scss',
})
export class DateSeparatorComponent {
  @Input() date!: Date;
  @Input() prevDate?: Date | null;

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  /**
   * Subscribes to the MobileService to track screen size changes.
   */
  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  /**
   * Determines whether to show the date separator based on whether
   * the current date and previous date fall on the same calendar day.
   */
  get shouldShow(): boolean {
    return !this.prevDate || !this.sameDay(this.prevDate, this.date);
  }

  /**
   * Returns a formatted date label based on the message date:
   * - "Heute" for today
   * - Weekday name if within last 7 days
   * - Full date format for older dates
   */
  get label(): string {
    const d = this.date;
    const today = new Date();
    if (this.sameDay(d, today)) {
      return 'Heute';
    }
    const diffDays = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 7) {
      return d.toLocaleDateString('de-DE', { weekday: 'long' });
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  /**
   * Compares two Date objects and returns true if they represent the same calendar day.
   *
   * @param a - First date
   * @param b - Second date
   * @returns True if both dates are on the same day, false otherwise
   */
  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}

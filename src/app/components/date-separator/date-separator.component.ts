import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobileService } from '../../mobile.service';

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

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  get shouldShow(): boolean {
    return !this.prevDate || !this.sameDay(this.prevDate, this.date);
  }

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

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}

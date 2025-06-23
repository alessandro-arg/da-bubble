import {
  AfterViewInit,
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('chatContainer')
  private chatContainer!: ElementRef<HTMLDivElement>;
  private hasScrolledInitially = false;

  ngAfterViewInit() {
    this.scrollToBottom();
  }

  // Better for *ngFor
  ngAfterViewChecked() {
    if (!this.hasScrolledInitially) {
      this.scrollToBottom();
      this.hasScrolledInitially = true;
    }
  }

  scrollToBottom() {
    const el = this.chatContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}

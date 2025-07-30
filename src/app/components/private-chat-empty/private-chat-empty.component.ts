import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../models/user.model';
import { MobileService } from '../../services/mobile.service';

@Component({
  selector: 'app-private-chat-empty',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './private-chat-empty.component.html',
  styleUrl: './private-chat-empty.component.scss',
})
export class PrivateChatEmptyComponent {
  @Input() chatPartner!: User;
  @Input() currentUserUid!: string | null;
  @Output() memberClicked = new EventEmitter<User>();

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  ngOnInit(): void {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  onMemberClick() {
    this.memberClicked.emit(this.chatPartner);
  }
}

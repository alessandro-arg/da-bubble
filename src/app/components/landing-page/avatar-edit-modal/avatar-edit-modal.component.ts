import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-avatar-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avatar-edit-modal.component.html',
  styleUrl: './avatar-edit-modal.component.scss',
})
export class AvatarEditModalComponent implements OnInit {
  @Input() currentAvatar = '';

  @Output() avatarChange = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  avatars: string[] = [];
  selectedAvatar = '';

  ngOnInit() {
    this.avatars = [
      'assets/img/charaters.svg',
      'assets/img/charaters(1).svg',
      'assets/img/charaters(2).svg',
      'assets/img/charaters(3).svg',
      'assets/img/charaters(4).svg',
      'assets/img/charaters(5).svg',
    ];
    this.selectedAvatar = this.currentAvatar;
  }

  selectAvatar(avatar: string) {
    this.selectedAvatar = avatar;
  }

  cancel() {
    this.closed.emit();
  }

  save() {
    if (this.selectedAvatar && this.selectedAvatar !== this.currentAvatar) {
      this.avatarChange.emit(this.selectedAvatar);
    }
    this.closed.emit();
  }
}

import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../user.service';
import { User } from '../../models/user.model';
import { ChatService } from '../../chat.service';

@Component({
  selector: 'app-searchbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './searchbar.component.html',
  styleUrls: ['./searchbar.component.scss'],
})
export class SearchbarComponent {
  showPopup = false;
  searchQuery = '';
  filteredUsers: User[] = [];
  allUsers: User[] = [];
  searchMode: 'name' | 'mention' = 'name';

  constructor(private userService: UserService, private chatService: ChatService) {
    this.loadAllUsers();
  }

  private async loadAllUsers() {
    this.allUsers = await this.userService.getAllUsers();
    this.allUsers.sort((a, b) => a.name.localeCompare(b.name));
    this.filteredUsers = [...this.allUsers];
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.show-popup-user-list') && !target.closest('input[type="text"]')) {
      this.showPopup = false;
    }
  }

  async onInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;

    if (this.searchQuery.includes('@')) {
      this.searchMode = 'mention';
      const query = this.searchQuery.split('@').pop()?.trim() || '';

      this.filteredUsers = query.length > 0
        ? this.allUsers.filter(user =>
          user.name.toLowerCase().includes(query.toLowerCase()))
        : [...this.allUsers];

      this.showPopup = true;
    } else if (this.searchQuery.length > 0) {
      this.searchMode = 'name';
      this.filteredUsers = this.allUsers.filter(user =>
        user.name.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
      this.showPopup = this.filteredUsers.length > 0;
    } else {
      this.showPopup = false;
    }
  }

  // searchbar.component.ts
  selectUser(user: User) {
    if (this.searchMode === 'mention') {
      const currentText = this.searchQuery;
      const atPosition = currentText.lastIndexOf('@');

      if (atPosition >= 0) {
        this.searchQuery = currentText.substring(0, atPosition) + '@' + user.name + ' ';
        this.chatService.setCurrentChatPartner(user);   
      } else {
        this.searchQuery = currentText + '@' + user.name + ' ';
      }
    } else {
      this.searchQuery = user.name + ' ';
      this.chatService.setCurrentChatPartner(user); 
    }
    this.searchQuery = '';
    this.showPopup = false;
  }
}
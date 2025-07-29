import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewChildren,
  ElementRef,
  QueryList,
  AfterViewInit,
  OnInit,
} from '@angular/core';
import { User } from '../../models/user.model';
import { Group } from '../../models/group.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileService } from '../../mobile.service';

@Component({
  selector: 'app-new-message-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-message-header.component.html',
  styleUrl: './new-message-header.component.scss',
})
export class NewMessageHeaderComponent implements OnInit {
  @Input() allUsers: User[] = [];
  @Input() allGroups: Group[] = [];
  @Input() statusMap: Record<string, boolean> = {};
  @Input() currentUserUid: string | null = null;

  @Output() recipientsChange = new EventEmitter<User[]>();
  @Output() groupRecipientsChange = new EventEmitter<Group[]>();

  selectedRecipients: User[] = [];
  selectedGroupRecipients: Group[] = [];
  recipientQuery = '';
  filteredRecipients: User[] = [];
  filteredRecipientGroups: Group[] = [];

  showRecipientList = false;
  showRecipientGroupList = false;
  activeRecipientIndex = 0;
  activeRecipientGroupIndex = 0;

  @ViewChild('recipientInput', { static: true })
  recipientInputRef!: ElementRef<HTMLInputElement>;
  @ViewChildren('inputMentionItem', { read: ElementRef })
  inputMentionItems!: QueryList<ElementRef>;
  @ViewChildren('inputGroupItem', { read: ElementRef })
  inputGroupItems!: QueryList<ElementRef>;

  isMobile = false;

  constructor(private mobileService: MobileService) {}

  ngOnInit() {
    this.mobileService.isMobile$.subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  onRecipientInput() {
    const raw = this.recipientInputRef.nativeElement.value;
    const pos =
      this.recipientInputRef.nativeElement.selectionStart ?? raw.length;
    const hashIdx = raw.lastIndexOf('#', pos - 1);
    const atIdx = raw.lastIndexOf('@', pos - 1);

    if (hashIdx > atIdx && (hashIdx === 0 || /\s/.test(raw[hashIdx - 1]))) {
      const q = raw.slice(hashIdx + 1, pos).toLowerCase();
      this.filteredRecipientGroups = this.allGroups.filter(
        (g) =>
          g.name.toLowerCase().startsWith(q) &&
          !this.selectedGroupRecipients.some((s) => s.id === g.id)
      );
      this.showRecipientGroupList = this.filteredRecipientGroups.length > 0;
      this.showRecipientList = false;
      this.activeRecipientGroupIndex = 0;
    } else if (atIdx >= 0 && (atIdx === 0 || /\s/.test(raw[atIdx - 1]))) {
      const q = raw.slice(atIdx + 1, pos).toLowerCase();
      this.filteredRecipients = this.allUsers.filter(
        (u) =>
          u.name.toLowerCase().startsWith(q) &&
          u.uid !== this.currentUserUid &&
          !this.selectedRecipients.some((s) => s.uid === u.uid)
      );
      this.showRecipientList = this.filteredRecipients.length > 0;
      this.showRecipientGroupList = false;
      this.activeRecipientIndex = 0;
    } else {
      this.showRecipientList = this.showRecipientGroupList = false;
    }
  }

  onRecipientKeydown(e: KeyboardEvent) {
    const navigate = (len: number, idx: number, delta: number) =>
      (idx + delta + len) % len;

    if (this.showRecipientList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeRecipientIndex = navigate(
          this.filteredRecipients.length,
          this.activeRecipientIndex,
          1
        );
        this.scrollIntoView(this.inputMentionItems, this.activeRecipientIndex);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeRecipientIndex = navigate(
          this.filteredRecipients.length,
          this.activeRecipientIndex,
          -1
        );
        this.scrollIntoView(this.inputMentionItems, this.activeRecipientIndex);
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.selectRecipient(
          this.filteredRecipients[this.activeRecipientIndex]
        );
      }
    }

    if (this.showRecipientGroupList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeRecipientGroupIndex = navigate(
          this.filteredRecipientGroups.length,
          this.activeRecipientGroupIndex,
          1
        );
        this.scrollIntoView(
          this.inputGroupItems,
          this.activeRecipientGroupIndex
        );
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeRecipientGroupIndex = navigate(
          this.filteredRecipientGroups.length,
          this.activeRecipientGroupIndex,
          -1
        );
        this.scrollIntoView(
          this.inputGroupItems,
          this.activeRecipientGroupIndex
        );
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        this.selectGroupRecipient(
          this.filteredRecipientGroups[this.activeRecipientGroupIndex]
        );
      }
    }
  }

  private scrollIntoView(list: QueryList<ElementRef>, index: number) {
    const el = list.toArray()[index]?.nativeElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  selectRecipient(u: User) {
    this.selectedRecipients.push(u);
    this.recipientsChange.emit(this.selectedRecipients);
    this.resetInput();
  }

  selectGroupRecipient(g: Group) {
    this.selectedGroupRecipients.push(g);
    this.groupRecipientsChange.emit(this.selectedGroupRecipients);
    this.resetInput();
  }

  removeRecipient(u: User) {
    this.selectedRecipients = this.selectedRecipients.filter(
      (r) => r.uid !== u.uid
    );
    this.recipientsChange.emit(this.selectedRecipients);
  }

  removeGroupRecipient(g: Group) {
    this.selectedGroupRecipients = this.selectedGroupRecipients.filter(
      (x) => x.id !== g.id
    );
    this.groupRecipientsChange.emit(this.selectedGroupRecipients);
  }

  private resetInput() {
    this.recipientQuery = '';
    this.showRecipientList = this.showRecipientGroupList = false;
    setTimeout(() => this.recipientInputRef.nativeElement.focus(), 0);
  }
}

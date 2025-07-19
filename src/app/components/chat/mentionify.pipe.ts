import { Pipe, PipeTransform } from '@angular/core';
import { User } from '../../models/user.model';

@Pipe({
  name: 'mentionify',
  standalone: true,
})
export class MentionifyPipe implements PipeTransform {
  transform(
    text: string,
    participantsMap: Record<string, User>
  ): Array<{ text?: string; mention?: User }> {
    const parts: Array<{ text?: string; mention?: User }> = [];
    const regex = /@([^\s@]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const byName = Object.values(participantsMap).reduce((acc, u) => {
      acc[u.name] = u;
      return acc;
    }, {} as Record<string, User>);

    while ((match = regex.exec(text))) {
      const idx = match.index;
      if (idx > lastIndex) {
        parts.push({ text: text.slice(lastIndex, idx) });
      }
      const username = match[1];
      const user = byName[username];
      if (user) {
        parts.push({ mention: user });
      } else {
        parts.push({ text: match[0] });
      }
      lastIndex = idx + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex) });
    }
    return parts;
  }
}

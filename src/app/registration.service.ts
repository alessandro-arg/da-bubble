import { Injectable } from '@angular/core';

interface RegistrationData {
  name: string;
  email: string;
  password: string;
  privacyPolicy: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private data: RegistrationData | null = null;

  setRegistrationData(data: RegistrationData) {
    this.data = data;
  }

  getRegistrationData(): RegistrationData | null {
    return this.data;
  }

  clear() {
    this.data = null;
  }
}

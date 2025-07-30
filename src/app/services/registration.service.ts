/**
 * RegistrationService is a simple in-memory store used to temporarily hold
 * user registration data across steps or components before submitting to Firebase.
 */

import { Injectable } from '@angular/core';

/**
 * Interface representing the data collected during user registration.
 */
interface RegistrationData {
  name: string;
  email: string;
  password: string;
  privacyPolicy: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private data: RegistrationData | null = null;

  /**
   * Stores the current registration data.
   *
   * @param data - Object containing name, email, password, and privacy policy acceptance
   */
  setRegistrationData(data: RegistrationData) {
    this.data = data;
  }

  /**
   * Retrieves the currently stored registration data, if any.
   *
   * @returns The stored RegistrationData object or null if not set
   */
  getRegistrationData(): RegistrationData | null {
    return this.data;
  }

  /**
   * Clears any stored registration data.
   */
  clear() {
    this.data = null;
  }
}

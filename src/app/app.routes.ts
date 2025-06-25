import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/login/register/register.component';
import { ChooseYourAvatarComponent } from './components/login/register/choose-your-avatar/choose-your-avatar.component';
import { SendEmailResetPasswordComponent } from './components/login/send-email-reset-password/send-email-reset-password.component';
import { ResetPasswordComponent } from './components/login/send-email-reset-password/reset-password/reset-password.component';

export const routes: Routes = [
  {
    path: 'landingpage/:uid',
    component: LandingPageComponent,
    canActivate: [authGuard], // Geschützte Route
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'choose-your-avatar',
    component: ChooseYourAvatarComponent,
  },

  {
    path: 'SendEmailResetPasswordComponent',
    component: SendEmailResetPasswordComponent,
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  }
];

import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ChooseYourAvatarComponent } from './components/register/choose-your-avatar/choose-your-avatar.component';

export const routes: Routes = [
  {
    path: 'landingpage',
    component: LandingPageComponent,
    canActivate: [authGuard], // Protected route
  },

  {
    path: '',
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
];

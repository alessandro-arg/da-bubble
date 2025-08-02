import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/login/register/register.component';
import { ChooseYourAvatarComponent } from './components/login/register/choose-your-avatar/choose-your-avatar.component';
import { ResetPasswordComponent } from './components/login/reset-password/reset-password.component';
import { ForgotPasswordComponent } from './components/login/forgot-password/forgot-password.component';
import { ImpressumComponent } from './components/impressum/impressum.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { IntroComponent} from './components/intro/intro.component';


export const routes: Routes = [
  {
    path: 'landingpage/:uid',
    component: LandingPageComponent,
    canActivate: [authGuard], // Geschützte Route
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
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
  
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
  }, 
  
  {
    path: 'impressum',
    component: ImpressumComponent,
  },
  
  {
    path: 'privacy-policy',
    component: PrivacyPolicyComponent,
  },

  {
    path: 'intro',
    component: IntroComponent,
  },

  {
    path: '**',
    redirectTo: '/intro',
    pathMatch: 'full',
  },
];
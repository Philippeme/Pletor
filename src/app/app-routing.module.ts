import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Pages
import { HomeComponent } from './pages/home/home.component';
import { ProceduresComponent } from './pages/procedures/procedures.component';
import { RegistrationComponent } from './pages/registration/registration.component';
import { SearchFilesComponent } from './pages/search-files/search-files.component';
import { PassportApplicationComponent } from './pages/passport-application/passport-application.component';
import { BirthCertificateComponent } from './pages/birth-certificate/birth-certificate.component';
import { ServiceDetailComponent } from './pages/service-detail/service-detail.component';
import { ClaimComponent } from './pages/claim/claim.component';

// Guards
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'procedures', component: ProceduresComponent },
  { path: 'procedures/:category', component: ProceduresComponent },
  { path: 'service-detail/:serviceId', component: ServiceDetailComponent },
  { path: 'registration', component: RegistrationComponent },
  { path: 'search-files', component: SearchFilesComponent },
  { 
    path: 'claim', 
    component: ClaimComponent
  },
  { 
    path: 'passport-application', 
    component: PassportApplicationComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'birth-certificate', 
    component: BirthCertificateComponent,
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    enableTracing: false,
    scrollPositionRestoration: 'top'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
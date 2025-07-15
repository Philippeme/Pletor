import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { LoginModalComponent } from '../modals/login-modal/login-modal.component';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  currentUser: User | null = null;
  isMenuCollapsed = true;

  constructor(
    private router: Router,
    private modalService: NgbModal,
    private authService: AuthService,
    private translationService: TranslationService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  openLoginModal(): void {
    const modalRef = this.modalService.open(LoginModalComponent, {
      centered: true,
      backdrop: 'static'
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.isMenuCollapsed = true;
  }
}
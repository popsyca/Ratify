import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({ standalone: true, imports: [FormsModule], template: `
<form class="auth-panel" (ngSubmit)="register()">
  <h1>Create account</h1>
  <input [(ngModel)]="displayName" name="displayName" placeholder="Username (3-15 chars, no spaces)" minlength="3" maxlength="15" (keydown.space)="$event.preventDefault()" required>
  <input [(ngModel)]="email" name="email" placeholder="Email" type="email" required>
  <input [(ngModel)]="password" name="password" placeholder="Password (min 8 chars, 1 uppercase, 1 digit)" type="password" required>
  <button type="submit">Register</button>
  <p class="form-message">{{ message() }}</p>
</form>` })
export class RegisterComponent {
  displayName = ''; email = ''; password = ''; message = signal('');
  constructor(private auth: AuthService, private router: Router) {}
  register() {
    this.auth.register({ displayName: this.displayName, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.message.set('Registration successful! Redirecting to login...');
        setTimeout(() => this.router.navigateByUrl('/login'), 1500);
      },
      error: e => {
        const msg = typeof e.error === 'string' ? e.error : (e.error?.message || e.error?.title || 'Registration failed');
        this.message.set(msg);
      }
    });
  }
}


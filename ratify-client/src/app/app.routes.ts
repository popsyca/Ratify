import { Routes } from '@angular/router';
import { BookListComponent } from './books/book-list.component';
import { BookDetailComponent } from './books/book-detail.component';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { AddBookComponent } from './books/add-book.component';
import { ProfileComponent } from './profile/profile.component';

export const routes: Routes = [
  { path: '', component: BookListComponent },
  { path: 'books/:id', component: BookDetailComponent },
  { path: 'add-book', component: AddBookComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent }
];

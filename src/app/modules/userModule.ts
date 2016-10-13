import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {RouterModule} from "@angular/router";

import {LoginComponent} from '../user/loginComponent';
import {RegistrationComponent} from '../user/registrationComponent';
import {UserMenuComponent} from '../user/userMenuComponent';

@NgModule({
    imports: [CommonModule, FormsModule, RouterModule],
    declarations: [LoginComponent, RegistrationComponent, UserMenuComponent],
    exports: [LoginComponent, RegistrationComponent, UserMenuComponent],
    providers: []
})
export class UserModule { }
import { Injectable } from '@angular/core';
import { CanActivate, CanDeactivate, Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { UserServices } from '../services/userServices';
import { BasicModalServices } from "../widget/modal/basicModal/basicModalServices";
import { VBContext } from './VBContext';

/**
 * Guard that prevents accessing page to not logged user
 */
@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private router: Router, private userService: UserServices) { }

    //this canActivate return Observable<boolean> since I need to check asynchronously if a user is logged
    canActivate(): Observable<boolean> {
        if (VBContext.isLoggedIn()) {
            return Observable.of(true);
        } else {
            /* if there is no user in vbCtx it doesn't mean that the user is not logged, in fact,
            if the user refresh the page, VBContext is reinitialized and then userLogged is reset to null.
            Here try to retrieve from server the logged user. */
            return this.userService.getUser().map(
                user => { //request completed succesfully, set the user in the context and return true
                    if (user) { //getUser returned the logged user
                        return true;
                    } else { //no logged user, getUser returned null
                        this.router.navigate(['/Home']);
                        return false;
                    }
                }
            )
        }
    }
}

/**
 * Guard that prevents accessing page to not "normal" user (allows only to admin)
 */
@Injectable()
export class AdminGuard implements CanActivate {

    constructor(private router: Router, private userService: UserServices) { }

    //this canActivate return Observable<boolean> since I need to check asynchronously if a user is logged
    canActivate(): Observable<boolean> {
        if (VBContext.isLoggedIn()) {
            return Observable.of(VBContext.getLoggedUser().isAdmin());
        } else {
            /* if there is no user in vbCtx it doesn't mean that the user is not logged, in fact,
            if the user refresh the page, VBContext is reinitialized and then userLogged is reset to null.
            Here try to retrieve from server the logged user. */
            return this.userService.getUser().map(
                user => { //request completed succesfully, set the user in the context and return true
                    if (user) { //getUser returned the logged user
                        return user.isAdmin();
                    } else { //no logged user, getUser returned null
                        this.router.navigate(['/Home']);
                        return false;
                    }
                }
            )
        }
    }
}

/**
 * Guard that prevents accessing page whit no project accessed
 */
@Injectable()
export class ProjectGuard implements CanActivate {

    constructor(private router: Router) { }

    canActivate() {
        if (VBContext.getWorkingProject() != undefined) {
            return true;
        } else {
            this.router.navigate(['/Home']);
            return false;
        }
    }
}

/**
 * Each component that wants to use a CanDeactivate guard must implements this interface
 * and its method canDeactivate()
 */
export interface CanDeactivateOnChangesComponent {
    hasUnsavedChanges: () => boolean | Observable<boolean>;
}
@Injectable()
export class UnsavedChangesGuard implements CanDeactivate<CanDeactivateOnChangesComponent> {

    constructor(private basicModals: BasicModalServices) { }

    canDeactivate(component: CanDeactivateOnChangesComponent): boolean | Observable<boolean> {
        //check if component has hasUnsavedChanges method, in case evaluate it
        if (component.hasUnsavedChanges) {
            if (component.hasUnsavedChanges()) {
                return Observable.fromPromise(
                    this.basicModals.confirm("Warning", "There could be unsaved changes. Do you want to leave this page and discard the changes",
                        "warning").then(
                        yes => { return true },
                        no => { return false }
                        )
                );
            } else {
                return true;
            }
        } else {
            return true;
        }
    }
}

export const GUARD_PROVIDERS = [AuthGuard, AdminGuard, ProjectGuard, UnsavedChangesGuard];

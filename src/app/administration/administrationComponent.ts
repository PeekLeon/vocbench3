import { Component } from "@angular/core";
import { Router } from '@angular/router';
import { VBContext } from "../utils/VBContext";
import { AuthorizationEvaluator } from "../utils/AuthorizationEvaluator";
import { VBActionsEnum } from "../utils/VBActions";

@Component({
    selector: "admin-component",
    templateUrl: "./administrationComponent.html",
    host: { class: "pageComponent" }
})
export class AdministrationComponent {

    constructor(private router: Router) { }

    ngOnInit() {
        if (this.isAdmin()) { //user admin => send to Users page
            this.router.navigate(["/Administration/Users"]);
        } else if (VBContext.getWorkingProject() != undefined) {
            if (this.isProjManagementAuthorized()) {
                this.router.navigate(["/Administration/Projects"]);
            } else if (this.isRoleManagementAuthorized()) {
                this.router.navigate(["/Administration/Roles"]);
            } else {
                this.router.navigate(["/Home"]);    
            }
        } else {
            //if user is neither admin or PM redirect to home page
            this.router.navigate(["/Home"]);
        }
    }

    private isAdmin(): boolean {
        var user = VBContext.getLoggedUser();
        if (user != null) {
            return user.isAdmin();
        }
        return false;
    }

    private isRoleManagementAuthorized(): boolean {
        return AuthorizationEvaluator.isAuthorized(VBActionsEnum.administrationRoleManagement);
    }

    private isProjManagementAuthorized(): boolean {
        return (
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.administrationProjectManagement) ||
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.administrationUserRoleManagement) ||
            AuthorizationEvaluator.isAuthorized(VBActionsEnum.administrationUserGroupManagement)
        );
    }

}
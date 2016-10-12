import {Component} from "@angular/core";
import {Router} from "@angular/router";
import {AuthServices} from "../services/authServices";
import {ModalServices} from "../widget/modal/modalServices";
import {VocbenchCtx} from "../utils/VocbenchCtx";

@Component({
    selector: "login",
    templateUrl: "./loginComponent.html",
})
export class LoginComponent {
    
    private rememberMe: boolean = false;
    private email: string = "admin";
    private password: string = "admin";
    
    constructor(private router: Router, private authService: AuthServices, private modalService: ModalServices,
        private vbCtx: VocbenchCtx) {}
    
    private login() {
        //here I should do an authentication request to server. In case of success, store the returned token and redirect to project
        this.authService.login(this.email, this.password, this.rememberMe).subscribe(
            res => {
                if (this.vbCtx.isLoggedIn()) {
                    this.router.navigate(['/Projects']);
                }
            },
            error => {
                //in case of login error (wrong credentials), status is 401 (avoid alert when error is given by ST down)
                if (error.status == 401) {
                    this.modalService.alert("Login failed", "The credentials you have entered are incorrect. Please retry.", "error");
                }
            }
        );
    }

    private forgotPassword() {
        alert("Not yet available"); //TODO
    }

}
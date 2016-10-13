import {Component} from "@angular/core";

import {VocbenchCtx} from "../utils/VocbenchCtx";
import {User} from "./User";

@Component({
    selector: "user-profile-component",
    templateUrl: "./userProfileComponent.html",
    host: { class : "pageComponent" }
})
export class UserProfileComponent {

    private user: User;
    
    constructor(private vbCtx: VocbenchCtx) {}

    ngOnInit() {
        this.user = this.vbCtx.getLoggedUser();
    }

}
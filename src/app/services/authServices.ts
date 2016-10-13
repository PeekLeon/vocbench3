import {Injectable} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {HttpManager} from "../utils/HttpManager";
import {VocbenchCtx} from "../utils/VocbenchCtx";
import {User} from "../user/User";

//maybe, when server side services will be provided, this should be moved under services/ folder

@Injectable()
export class AuthServices {

    private serviceName = "Auth";
    private oldTypeService = false;

    constructor(private httpMgr: HttpManager, private vbCtx: VocbenchCtx) {}

    login(email: string, password: string, rememberMe: boolean): Observable<User> {
        console.log("[AuthServices] login");
        var params: any = {
            username: email,
            password: password
        }
        return this.httpMgr.doPost(this.serviceName, "login", params, this.oldTypeService, true, true).map(
            stResp => {
                var loggedUser: User = new User(stResp.user, stResp.roles);
                this.vbCtx.setLoggedUser(loggedUser); 
                return loggedUser;
            }
        );
        
    }

    logout() {
        console.log("[AuthServices] logout");
        return this.httpMgr.doGet(this.serviceName, "logout", null, this.oldTypeService, true).map(
            stResp => {
                this.vbCtx.removeLoggedUser();
                return stResp;
            }
        );
    }

    getUser(): Observable<User> {
        console.log("[AuthServices] getUser");
        return this.httpMgr.doGet(this.serviceName, "getUser", null, this.oldTypeService, true).map(
            stResp => {
                return new User(stResp.user, stResp.roles);;
            }
        );
    }

}
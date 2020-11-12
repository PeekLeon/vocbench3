import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpManager } from "../utils/HttpManager";

@Injectable()
export class ServicesServices {

    private serviceName = "Services";

    constructor(private httpMgr: HttpManager) { }


    /**
     * Returns a list of extension path (e.g. "it.uniroma2.art.semanticturkey/st-core-services")
     */
    getExtensionPaths(): Observable<string[]> {
        var params: any = {};
        return this.httpMgr.doGet(this.serviceName, "getExtensionPaths", params);
    }

    /**
     * Returns a list of service classes of the given extension path (e.g. "Repositories", "SPARQL", "OntManager", ...)
     * @param extensionPath 
     */
    getServiceClasses(extensionPath: string): Observable<string[]> {
        var params: any = {
            extensionPath: extensionPath
        };
        return this.httpMgr.doGet(this.serviceName, "getServiceClasses", params).pipe(
            map(stResp => {
                stResp.sort(
                    function (sc1: string, sc2: string) {
                        if (sc1 > sc2) return 1;
                        if (sc1 < sc2) return -1;
                        return 0;
                    }
                );
                return stResp;
            })
        );
    }

    /**
     * 
     * @param extensionPath 
     * @param serviceClass 
     */
    getServiceOperations(extensionPath: string, serviceClass: string): Observable<string[]> {
        var params: any = {
            extensionPath: extensionPath,
            serviceClass: serviceClass
        };
        return this.httpMgr.doGet(this.serviceName, "getServiceOperations", params).pipe(
            map(stResp => {
                stResp.sort(
                    function (op1: string, op2: string) {
                        if (op1 > op2) return 1;
                        if (op1 < op2) return -1;
                        return 0;
                    }
                );
                return stResp;
            })
        );
    }


}

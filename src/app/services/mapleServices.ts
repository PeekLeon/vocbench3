import { Injectable } from '@angular/core';
import { ResourcePosition, ARTURIResource } from "../models/ARTResources";
import { HttpManager } from "../utils/HttpManager";
import { Observable } from 'rxjs';

@Injectable()
export class MapleServices {

    private serviceName = "MAPLE";

    constructor(private httpMgr: HttpManager) { }

    /**
     * Profiles a mediation problem between the current project and the provided resource position (i.e.
	 * another local project or remote dataset).
     * @param resourcePosition 
     */
    profileMediationProblem(resourcePosition: ResourcePosition) {
        var params = {
            resourcePosition: resourcePosition.serialize()
        };
        return this.httpMgr.doGet(this.serviceName, "profileMediationProblem", params);
    }

    /**
     * Profiles the problem of matching the provided resource in the current project against the provided
	 * resource position (i.e. another local project or remote dataset).
     * @param sourceResource 
     * @param targetPosition 
     */
    profileSingleResourceMatchProblem(sourceResource: ARTURIResource, targetPosition: ResourcePosition) {
        var params = {
            sourceResource: sourceResource,
            targetPosition: targetPosition.serialize()
        };
        return this.httpMgr.doGet(this.serviceName, "profileSingleResourceMatchProblem", params);
    }


    /**
     * Profiles the current project and stores its LIME metadata
     */
    profileProject() {
        var params = {};
        return this.httpMgr.doPost(this.serviceName, "profileProject", params);
    }

    /**
     * Determines whether LIME metadata for the current project are available
     */
    checkProjectMetadataAvailability(): Observable<boolean> {
        var params = {};
        return this.httpMgr.doGet(this.serviceName, "checkProjectMetadataAvailability", params);
    }

}
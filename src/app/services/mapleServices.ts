import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ARTURIResource, ResourcePosition } from "../models/ARTResources";
import { AlignmentScenario, ProfilerOptions } from '../models/Maple';
import { Project } from '../models/Project';
import { HttpManager } from "../utils/HttpManager";

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
        let params = {
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
        let params = {
            sourceResource: sourceResource,
            targetPosition: targetPosition.serialize()
        };
        return this.httpMgr.doGet(this.serviceName, "profileSingleResourceMatchProblem", params);
    }

    profileMatchingProblemBetweenProjects(leftDataset: Project, rightDataset: Project, options?: ProfilerOptions): Observable<AlignmentScenario> {
        let params = {
            leftDataset: leftDataset.getName(),
            rightDataset: rightDataset.getName(),
            options: options
        };
        return this.httpMgr.doGet(this.serviceName, "profileMatchingProblemBetweenProjects", params);
    }


    /**
     * Profiles the current project and stores its LIME metadata
     */
    profileProject() {
        let params = {};
        return this.httpMgr.doPost(this.serviceName, "profileProject", params);
    }

    /**
     * Determines whether LIME metadata for the current project are available
     */
    checkProjectMetadataAvailability(): Observable<boolean> {
        let params = {};
        return this.httpMgr.doGet(this.serviceName, "checkProjectMetadataAvailability", params);
    }

}
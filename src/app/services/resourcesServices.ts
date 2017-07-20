import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { HttpManager } from "../utils/HttpManager";
import { Deserializer } from "../utils/Deserializer";
import { ARTResource, ARTURIResource, ARTNode } from "../models/ARTResources";

@Injectable()
export class ResourcesServices {

    private serviceName = "Resources";

    constructor(private httpMgr: HttpManager) { }

    /**
     * Updates the value of a triple replacing the old value with the new one
     * @param subject
     * @param property
     * @param value
     * @param newValue
     */
    updateTriple(subject: ARTResource, property: ARTURIResource, value: ARTNode, newValue: ARTNode) {
        console.log("[ResourcesServices] updateTriple");
        var params: any = {
            subject: subject,
            property: property,
            value: value,
            newValue: newValue
        };
        return this.httpMgr.doPost(this.serviceName, "updateTriple", params, true);
    }

    /**
     * Remove a triple
     * @param resource
     * @param property
     * @param value
     */
    removeValue(subject: ARTResource, property: ARTURIResource, value: ARTNode) {
        console.log("[ResourcesServices] removeValue");
        var params: any = {
            subject: subject,
            property: property,
            value: value
        };
        return this.httpMgr.doPost(this.serviceName, "removeValue", params, true);
    }

    /**
     * Set a resource as deprecated
     * @param resource
     */
    setDeprecated(resource: ARTResource) {
        console.log("[ResourcesServices] setDeprecated");
        var params: any = {
            resource: resource,
        };
        return this.httpMgr.doPost(this.serviceName, "setDeprecated", params, true);
    }

    /**
     * Add a value to a given subject-property pair
     * @param subject 
     * @param property 
     * @param value 
     */
    addValue(subject: ARTResource, property: ARTURIResource, value: ARTNode) {
        console.log("[ResourcesServices] addValue");
        var params: any = {
            subject: subject,
            property: property,
            value: value
        };
        return this.httpMgr.doPost(this.serviceName, "addValue", params, true);
    }

    /**
     * Returns the description (nature show and qname) of the given resource
     * @param resource 
     */
    getResourceDescription(resource: ARTResource): Observable<ARTResource> {
        console.log("[ResourcesServices] getResourceDescription");
        var params: any = {
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "getResourceDescription", params, true).map(
            stResp => {
                return Deserializer.createRDFResource(stResp);
            }
        );
    }

    /**
     * Returns the description of a set of resources
     * @param resources 
     */
    getResourcesInfo(resources: ARTURIResource[]): Observable<ARTURIResource[]> {
        console.log("[ResourcesServices] getResourcesInfo");
        var params: any = {
            resources: resources
        };
        return this.httpMgr.doPost(this.serviceName, "getResourcesInfo", params, true).map(
            stResp => {
                return Deserializer.createURIArray(stResp);
            }
        );
    }

    /**
     * Returns the position (local/remote/unknown) of the given resource
     * @param resource
     */
    getResourcePosition(resource: ARTURIResource): Observable<string> {
        console.log("[ResourcesServices] getResourcePosition");
        var params: any = {
            resource: resource
        };
        return this.httpMgr.doGet(this.serviceName, "getResourcePosition", params, true);
    }

}
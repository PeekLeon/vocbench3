import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ARTResource, ARTURIResource } from '../models/ARTResources';
import { Reference } from '../models/Configuration';
import { CustomViewAssociation, CustomViewConfiguration, CustomViewDataRecord, CustomViewDefinition, CustomViewModel, ViewsEnum } from '../models/CustomViews';
import { HttpManager } from "../utils/HttpManager";

@Injectable()
export class CustomViewsServices {

    private serviceName = "CustomViews";

    constructor(private httpMgr: HttpManager) { }

    /* ============== VIEWS ============== */

    /**
     * 
     */
    getViewsIdentifiers(): Observable<string[]> {
        let params = {}
        return this.httpMgr.doGet(this.serviceName, "getViewsIdentifiers", params).pipe(
            map(refs => {
                return refs.sort((r1: string, r2: string) => r1.localeCompare(r2))
            })
        );
    }

    /**
     * 
     * @param reference 
     */
    getCustomView(reference: string): Observable<CustomViewConfiguration> {
        let params = {
            reference: reference
        }
        return this.httpMgr.doGet(this.serviceName, "getCustomView", params).pipe(
            map(stResp => {
                return <CustomViewConfiguration>CustomViewConfiguration.parse(stResp);
            })
        );
    }

    createCustomView(reference: string, definition: CustomViewDefinition, model: CustomViewModel): Observable<void> {
        let params = {
            reference: reference,
            definition: JSON.stringify(definition),
            model: model
        }
        return this.httpMgr.doPost(this.serviceName, "createCustomView", params);
    }

    deleteCustomView(reference: string) {
        let params = {
            reference: reference,
        }
        return this.httpMgr.doPost(this.serviceName, "deleteCustomView", params);
    }



    /* ============== ASSOCIATIONS ============== */

    /**
    * 
    */
    listAssociations(): Observable<CustomViewAssociation[]> {
        let params = {};
        return this.httpMgr.doGet(this.serviceName, "listAssociations", params).pipe(
            map(stResp => {
                let associations: CustomViewAssociation[] = []
                stResp.forEach((a: { ref: string, property: string, customViewRef: string }) => {
                    associations.push({
                        ref: a.ref,
                        property: new ARTURIResource(a.property),
                        customViewRef: {
                            reference: a.customViewRef,
                            name: Reference.getRelativeReferenceIdentifier(a.customViewRef),
                            scope: Reference.getRelativeReferenceScope(a.customViewRef)
                        }
                    })
                })
                associations.sort((a1: CustomViewAssociation, a2: CustomViewAssociation) => {
                    if (a1.property.equals(a2.property)) { //in case of same prop, sort by reference
                        return a1.customViewRef.reference.localeCompare(a2.customViewRef.reference);
                    } else {
                        return a1.property.getURI().localeCompare(a2.property.getURI());
                    }
                });
                return associations;
            })
        );
    }

    /**
    * 
    * @param property 
    * @param customViewRef 
    */
    addAssociation(property: ARTURIResource, customViewRef: string, defaultView: ViewsEnum) {
        let params = {
            property: property,
            customViewRef: customViewRef,
            defaultView: defaultView
        }
        return this.httpMgr.doPost(this.serviceName, "addAssociation", params);
    }

    /**
     * 
     * @param reference 
     */
    deleteAssociation(reference: string) {
        let params = {
            reference: reference,
        }
        return this.httpMgr.doPost(this.serviceName, "deleteAssociation", params);
    }

    // updateWidgetData(resource: ARTResource, predicate: ARTURIResource, bindings: Map<string, ARTNode>): Observable<void> {
    //     let params = {
    //         resource: resource,
    //         predicate: predicate,
    //         bindings: bindings
    //     }
    //     return this.httpMgr.doPost(this.serviceName, "updateWidgetData", params);
    // }


    /* ============== DATA ============== */

    getViewData(resource: ARTResource, property: ARTURIResource): Observable<CustomViewDataRecord[]> {
        let params = {
            resource: resource,
            property: property
        }
        return this.httpMgr.doGet(this.serviceName, "getViewData", params).pipe(
            map(stResp => {
                let records: CustomViewDataRecord[] = stResp.map((r: any) => CustomViewDataRecord.parse(r));
                return records;
            })
        );
    }

}
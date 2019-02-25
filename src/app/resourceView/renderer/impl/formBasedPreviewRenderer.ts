import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { PartitionRenderSingleRoot } from "../partitionRendererSingleRoot";
import { ARTURIResource, ARTNode } from "../../../models/ARTResources";
import { ResViewPartition } from "../../../models/ResourceView";
import { PropertyServices } from "../../../services/propertyServices";
import { CustomFormsServices } from "../../../services/customFormsServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { ResViewModalServices } from "../../resViewModals/resViewModalServices";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "../../../widget/modal/creationModal/creationModalServices";

@Component({
    selector: "form-based-preview-renderer",
    templateUrl: "../partitionRenderer.html",
})
export class FormBasedPreviewRenderer extends PartitionRenderSingleRoot {

    partition = ResViewPartition.formBasedPreview;
    rootProperty: ARTURIResource = null;
    addBtnImgTitle = "";
    addBtnImgSrc: any = null; //do not show the add icon

    constructor(propService: PropertyServices, resourcesService: ResourcesServices, cfService: CustomFormsServices,
        basicModals: BasicModalServices, browsingModals: BrowsingModalServices, creationModal: CreationModalServices, 
        resViewModals: ResViewModalServices) {
        super(propService, resourcesService, cfService, basicModals, browsingModals, creationModal, resViewModals);
    }

    /**
     * Following methods are not used, Every action is disabled in this partition since it is only a preview
     */

    add(predicate: ARTURIResource, propChangeable: boolean) {}

    checkTypeCompliantForManualAdd(predicate: ARTURIResource, value: ARTNode): Observable<boolean> {
        return Observable.of(true);
    }

    
    removePredicateObject(predicate: ARTURIResource, object: ARTNode) { }

    getRemoveFunctionImpl(predicate: ARTURIResource, object: ARTNode): Observable<any> {
        return this.resourcesService.removeValue(this.resource, predicate, object);
    }

}
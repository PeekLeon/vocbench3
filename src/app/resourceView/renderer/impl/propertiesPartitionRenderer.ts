import { Component, Input, Output, EventEmitter } from "@angular/core";
import { AbstractPredObjListRenderer } from "../abstractPredObjListRenderer";
import { ARTResource, ARTURIResource, ARTNode, ARTLiteral, ARTPredicateObjects, ResAttribute, RDFTypesEnum } from "../../../models/ARTResources";
import { SKOSXL } from "../../../models/Vocabulary";
import { FormCollection, CustomForm } from "../../../models/CustomForms";

import { PropertyServices } from "../../../services/propertyServices";
import { SkosxlServices } from "../../../services/skosxlServices";
import { CustomFormsServices } from "../../../services/customFormsServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { ResViewModalServices } from "../../resViewModals/resViewModalServices";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "../../../widget/modal/creationModal/creationModalServices";

@Component({
    selector: "properties-renderer",
    templateUrl: "../predicateObjectsListRenderer.html",
})
export class PropertiesPartitionRenderer extends AbstractPredObjListRenderer {

    //inherited from AbstractPredObjListRenderer
    // @Input('pred-obj-list') predicateObjectList: ARTPredicateObjects[];
    // @Input() resource:ARTURIResource;
    // @Output() update = new EventEmitter();//something changed in this partition. Tells to ResView to update
    // @Output() dblclickObj: EventEmitter<ARTResource> = new EventEmitter<ARTResource>();

    rootProperty: ARTURIResource = null; //there is no root property for this partition
    label = "Properties";
    addBtnImgSrc = require("../../../../assets/images/prop_create.png");
    addBtnImgTitle = "Add a property value";
    removeBtnImgTitle = "Remove property value";

    constructor(propService: PropertyServices, resourcesService: ResourcesServices, cfService: CustomFormsServices, skosxlService: SkosxlServices,
        basicModals: BasicModalServices, browsingModals: BrowsingModalServices, creationModal: CreationModalServices, rvModalService: ResViewModalServices) {
        super(propService, resourcesService, cfService, skosxlService, basicModals, browsingModals, creationModal, rvModalService);
    }

    ngOnInit() {
        this.partitionCollapsed = (this.predicateObjectList.length > 4);
    }

    add(predicate?: ARTURIResource) {
        if (predicate == null) {
            this.browsingModals.browsePropertyTree("Select a property", null, <ARTURIResource>this.resource).then(
                (selectedProp: any) => {
                    this.add(selectedProp);
                },
                () => { }
            );
        } else {
            this.enrichProperty(predicate);
        }
    }

    removePredicateObject(predicate: ARTURIResource, object: ARTNode) {
        if (predicate.getAdditionalProperty(ResAttribute.HAS_CUSTOM_RANGE) && object.isResource()) {
            this.cfService.removeReifiedResource(this.resource, predicate, object).subscribe(
                stResp => this.update.emit(null)
            );
        } else {
            this.resourcesService.removeTriple(this.resource, predicate, object).subscribe(
                stResp => this.update.emit(null)
            );
        }
    }
}
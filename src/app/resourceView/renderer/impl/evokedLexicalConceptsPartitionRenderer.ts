import { Component, Input, Output, EventEmitter } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { PartitionRenderSingleRoot } from "../partitionRendererSingleRoot";
import { VBContext } from "../../../utils/VBContext";
import { ARTURIResource, ARTNode, ARTPredicateObjects, ResAttribute, RDFTypesEnum, ResourceUtils, ARTResource } from "../../../models/ARTResources";
import { OntoLex } from "../../../models/Vocabulary"
import { ResViewPartition } from "../../../models/ResourceView";
import { PropertyServices } from "../../../services/propertyServices";
import { OntoLexLemonServices } from "../../../services/ontoLexLemonServices";
import { CustomFormsServices } from "../../../services/customFormsServices";
import { ResourcesServices } from "../../../services/resourcesServices";
import { ResViewModalServices } from "../../resViewModals/resViewModalServices";
import { BasicModalServices } from "../../../widget/modal/basicModal/basicModalServices";
import { BrowsingModalServices } from "../../../widget/modal/browsingModal/browsingModalServices";
import { CreationModalServices } from "../../../widget/modal/creationModal/creationModalServices";
import { NewOntoLexicalizationCfModalReturnData } from "../../../widget/modal/creationModal/newResourceModal/ontolex/newOntoLexicalizationCfModal";


@Component({
    selector: "evoked-lexical-concepts-renderer",
    templateUrl: "../partitionRenderer.html",
})
export class EvokedLexicalConceptsPartitionRenderer extends PartitionRenderSingleRoot {

    partition = ResViewPartition.evokedLexicalConcepts;
    rootProperty: ARTURIResource = OntoLex.evokes;
    label = "Evoked Lexical Concepts";
    addBtnImgTitle = "Add evoked lexical concept";
    addBtnImgSrc = require("../../../../assets/images/icons/actions/objectProperty_create.png");

    constructor(propService: PropertyServices, resourcesService: ResourcesServices, cfService: CustomFormsServices,
        basicModals: BasicModalServices, browsingModals: BrowsingModalServices, creationModal: CreationModalServices, 
        resViewModals: ResViewModalServices, private ontolexService: OntoLexLemonServices) {
        super(propService, resourcesService, cfService, basicModals, browsingModals, creationModal, resViewModals);
    }

    add(predicate: ARTURIResource, propChangeable: boolean) {
        this.enrichProperty(predicate);
    }

    //not used since this partition doesn't allow manual add operation
    checkTypeCompliantForManualAdd(predicate: ARTURIResource, value: ARTNode): Observable<boolean> {
        return Observable.of(true);
    }

    removePredicateObject(predicate: ARTURIResource, object: ARTNode) {
        this.getRemoveFunction(predicate, object).subscribe(
            stResp => {
                this.update.emit(null);
            }
        );
    }

    getRemoveFunctionImpl(predicate: ARTURIResource, object: ARTNode): Observable<any> {
        return this.resourcesService.removeValue(this.resource, predicate, <ARTResource>object);
    }

}
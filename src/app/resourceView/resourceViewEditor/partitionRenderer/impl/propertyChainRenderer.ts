import { Component } from "@angular/core";
import { Observable, of } from "rxjs";
import { ARTBNode, ARTNode, ARTResource, ARTURIResource } from "../../../../models/ARTResources";
import { ResViewPartition } from "../../../../models/ResourceView";
import { CustomFormsServices } from "../../../../services/customFormsServices";
import { PropertyServices } from "../../../../services/propertyServices";
import { ResourcesServices } from "../../../../services/resourcesServices";
import { BasicModalServices } from "../../../../widget/modal/basicModal/basicModalServices";
import { CreationModalServices } from "../../../../widget/modal/creationModal/creationModalServices";
import { PropertyListCreatorModalReturnData } from "../../resViewModals/propertyChainCreatorModal";
import { ResViewModalServices } from "../../resViewModals/resViewModalServices";
import { PartitionRenderSingleRoot } from "../partitionRendererSingleRoot";

@Component({
    selector: "property-chain-renderer",
    templateUrl: "../partitionRenderer.html",
})
export class PropertyChainRenderer extends PartitionRenderSingleRoot {

    partition = ResViewPartition.subPropertyChains;
    addBtnImgSrc = "./assets/images/icons/actions/property_create.png";

    constructor(resourcesService: ResourcesServices, propService: PropertyServices, cfService: CustomFormsServices,
        basicModals: BasicModalServices, creationModals: CreationModalServices, resViewModals: ResViewModalServices,) {
        super(resourcesService, propService, cfService, basicModals, creationModals, resViewModals);
    }

    ngOnInit() {
        super.ngOnInit();
    }

    add(predicate: ARTURIResource, propChangeable: boolean) {
        this.resViewModals.createPropertyChain({key: "DATA.ACTIONS.CREATE_PROPERTY_CHAIN"}, predicate, propChangeable).then(
            (data: PropertyListCreatorModalReturnData) => {
                let prop: ARTURIResource = data.property;
                let chain: string[] = data.chain;
                this.propService.addPropertyChainAxiom(<ARTURIResource>this.resource, chain.join(","), prop).subscribe(
                    stResp => this.update.emit(null)
                );
            },
            () => {}
        );
    }

    editHandler(predicate: ARTURIResource, object: ARTNode) {
        //here I can force the cast to ARTBNode since I am sure that all the object handled in this partition are Bnode
        this.resViewModals.createPropertyChain({key: "DATA.ACTIONS.CREATE_PROPERTY_CHAIN"}, predicate, false, <ARTBNode>object).then(
            (data: PropertyListCreatorModalReturnData) => {
                let chain: string[] = data.chain;
                this.propService.updatePropertyChainAxiom(<ARTURIResource>this.resource, <ARTResource>object, chain.join(","), predicate).subscribe(
                    stResp => this.update.emit(null)
                );
            },
            () => {}
        );
    }

    //not used since this partition doesn't allow manual add operation
    checkTypeCompliantForManualAdd(predicate: ARTURIResource, value: ARTNode): Observable<boolean> {
        return of(true);
    }

    removePredicateObject(predicate: ARTURIResource, object: ARTNode) {
        this.getRemoveFunction(predicate, object).subscribe(
            stResp => {
                this.update.emit(null);
            }
        );
    }

    getRemoveFunctionImpl(predicate: ARTURIResource, object: ARTNode): Observable<any> {
        return this.propService.removePropertyChainAxiom(<ARTURIResource>this.resource, <ARTResource>object, predicate);
    }

}
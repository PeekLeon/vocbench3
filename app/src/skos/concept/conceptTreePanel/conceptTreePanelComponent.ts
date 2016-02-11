import {Component, Input, Output, EventEmitter} from "angular2/core";
import {ConceptTreeComponent} from "../../../tree/conceptTree/conceptTreeComponent";
import {SkosServices} from "../../../services/skosServices";
import {ARTURIResource} from "../../../utils/ARTResources";
import {VBEventHandler} from "../../../utils/VBEventHandler";
import {VocbenchCtx} from "../../../utils/VocbenchCtx";
import {Deserializer} from "../../../utils/Deserializer";
import {ROUTER_DIRECTIVES} from "angular2/router";

@Component({
	selector: "concept-tree-panel",
	templateUrl: "app/src/skos/concept/conceptTreePanel/conceptTreePanelComponent.html",
	directives: [ConceptTreeComponent, ROUTER_DIRECTIVES], //ROUTER_DIRECTIVES for routerLink in noScheme image button
    providers: [SkosServices],
})
export class ConceptTreePanelComponent {
    @Input() scheme:ARTURIResource;
    @Output() itemSelected = new EventEmitter<ARTURIResource>();
    
    private selectedConcept:ARTURIResource;
    
	constructor(private skosService:SkosServices, private deserializer:Deserializer, 
            private eventHandler:VBEventHandler, private vbCtx:VocbenchCtx) {
    }
    
    private createConcept() {
        var conceptName = prompt("Insert concept name");
        if (conceptName == null) return;
        this.skosService.createConcept(conceptName, this.vbCtx.getScheme().getURI(), null, null)
            .subscribe(
                stResp => {
                    var newConc = this.deserializer.createURI(stResp);
                    newConc.setAdditionalProperty("children", []);
                    this.eventHandler.topConceptCreatedEvent.emit(newConc);
                },
                err => { 
                    alert("Error: " + err);
                    console.error(err.stack);
                }
            );
    }
    
    private createNarrower() {
        var conceptName = prompt("Insert concept name");
        if (conceptName == null) return;
        this.skosService.createNarrower(conceptName, this.selectedConcept.getURI(), this.vbCtx.getScheme().getURI(), null, null)
            .subscribe(
                stResp => {
                    var newConc = this.deserializer.createURI(stResp);
                    newConc.setAdditionalProperty("children", []);
                    this.eventHandler.narrowerCreatedEvent.emit({"resource": newConc, "parent": this.selectedConcept});
                },
                err => { 
                    alert("Error: " + err);
                    console.error(err.stack);
                }
            )
    }
    
    private deleteConcept() {
        this.skosService.deleteConcept(this.selectedConcept.getURI())
            .subscribe(
                stResp => {
                    this.eventHandler.conceptDeletedEvent.emit(this.selectedConcept);
                    this.selectedConcept = null;
                    this.itemSelected.emit(undefined);
                },
                err => { 
                    alert("Error: " + err);
                    console.error(err.stack);
                }
            )
    }
    
    //EVENT LISTENERS
    private onNodeSelected(node:ARTURIResource) {
        this.selectedConcept = node;
        this.itemSelected.emit(node);
    }
    
}
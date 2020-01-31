import {Component, Input, Output, EventEmitter} from "@angular/core";
import {ARTNode, ARTResource, ARTURIResource, ARTPredicateObjects, ResAttribute} from "../../models/ARTResources";
import {CustomFormsServices} from "../../services/customFormsServices";

@Component({
	selector: "reified-resource",
	templateUrl: "./reifiedResourceComponent.html",
})
export class ReifiedResourceComponent {
    
    @Input() predicate: ARTURIResource;
    @Input() resource: ARTResource; //BNode or URIResource
    @Output() dblClick: EventEmitter<ARTResource> = new EventEmitter();
    
    private predicateObjectList: ARTPredicateObjects[];
    
    private open: boolean = false;
	
	constructor(private cfService: CustomFormsServices) {}
    
    private toggle() {
        if (this.predicateObjectList == null) {
            this.cfService.getGraphObjectDescription(this.predicate, this.resource).subscribe(
                graphDescr => {
                    this.predicateObjectList = graphDescr;
                    this.open = !this.open;
                    /**
                     * if expanded resource has no description, set the NOT_REIFIED attr to true, 
                     * so in the resview-value-renderer it is rendered as simple editable-resource and no more 
                     * as reified resource
                     */
                    if (this.predicateObjectList.length == 0) { 
                        this.resource.setAdditionalProperty(ResAttribute.NOT_REIFIED, true);
                    }
                }
            );
        } else {
            this.open = !this.open;
        }
    }
    
    private resourceDblClick() {
        this.dblClick.emit(this.resource);
    }

    private objectDblClick(object: ARTNode) {
        if (object.isResource()) {
            this.dblClick.emit(<ARTResource>object);
        }
    }

}
import {Component, Input, Output, EventEmitter} from "angular2/core";
import {ARTURIResource, ARTNode} from "../../utils/ARTResources";
import {VBEventHandler} from "../../utils/VBEventHandler";
import {RdfResourceComponent} from "../../widget/rdfResource/rdfResourceComponent";
import {OwlServices} from "../../services/owlServices";

@Component({
	selector: "types-renderer",
	templateUrl: "app/src/resourceView/renderer/objectListRenderer.html",
	directives: [RdfResourceComponent],
    providers: [OwlServices],
})
export class TypesPartitionRenderer {
    
    @Input('object-list') objectList:ARTURIResource[];
    @Input() resource:ARTURIResource;
    @Output() update = new EventEmitter();
    
    private label = "Types";
    private addBtnImgSrc = "app/assets/images/class_create.png";
    private addBtnImgTitle = "Add a type";
    private removeBtnImgSrc = "app/assets/images/class_delete.png";
    private removeBtnImgTitle = "Remove type"; 
    
    constructor(private owlService:OwlServices, private eventHandler:VBEventHandler) {}
    
    //add type
    private add() {
        alert("add type to resource " + this.resource.getShow());
        this.update.emit(null);
    }
    
    private remove(type: ARTURIResource) {
        this.owlService.removeType(this.resource.getURI(), type.getURI())
            .subscribe(
                stResp => {
                    this.eventHandler.typeDeletedEvent.emit({cls: this.resource.getURI(), type: type.getURI()});
                    this.update.emit(null);
                },
                err => {
                    alert("Error: " + err);
                    console.error(err.stack);
                }
            )
    }
    
    
}
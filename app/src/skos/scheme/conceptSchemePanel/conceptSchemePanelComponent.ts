import {Component, Output, EventEmitter} from "angular2/core";
import {RdfResourceComponent} from "../../../widget/rdfResource/rdfResourceComponent";
import {SkosServices} from "../../../services/skosServices";
import {ARTURIResource} from "../../../utils/ARTResources";
import {VBEventHandler} from "../../../utils/VBEventHandler";
import {VocbenchCtx} from '../../../utils/VocbenchCtx';

@Component({
	selector: "concept-scheme-panel",
	templateUrl: "app/src/skos/scheme/conceptSchemePanel/conceptSchemePanelComponent.html",
	directives: [RdfResourceComponent],
    providers: [SkosServices],
})
export class ConceptSchemePanelComponent {
    
    @Output() itemSelected = new EventEmitter<ARTURIResource>();
    
    private schemeList:ARTURIResource[];
    private activeScheme:ARTURIResource;
    private selectedScheme:ARTURIResource;
    
    private eventSubscriptions = [];

    constructor(private skosService: SkosServices, private vbCtx: VocbenchCtx, private eventHandler: VBEventHandler) {
        this.eventSubscriptions.push(eventHandler.resourceRenamedEvent.subscribe(
            data => this.onResourceRenamed(data.oldResource, data.newResource)));
    }
    
    ngOnInit() {
        this.skosService.getAllSchemesList()
            .subscribe(
                schemeList => {
                    this.schemeList = schemeList;
                },
                err => {
                    alert("Error: " + err);
                    console.error(err['stack']);
                }
            );
        this.activeScheme = this.vbCtx.getScheme();
    }
    
    private createScheme() {
        var schemeName = prompt("Insert conceptScheme name");
        if (schemeName == null) return;
        this.skosService.createScheme(schemeName).subscribe(
            newScheme => {
                this.schemeList.push(newScheme);
            },
            err => {
                alert("Error: " + err);
                console.error(err['stack']);
            }
        )
    }
    
    private deleteScheme() {
        //TODO check if scheme has concept and eventually ask the user whether delete the dangling concept (determines 2nd param of request)
        this.skosService.deleteScheme(this.selectedScheme.getURI(), false).subscribe(
            stResp => {
                for (var i = 0; i < this.schemeList.length; i++) {
                    if (this.schemeList[i].getURI() == this.selectedScheme.getURI()) {
                        this.schemeList.splice(i, 1);
                        break;
                    }
                }
                if (this.activeScheme != undefined && (this.selectedScheme.getURI() == this.activeScheme.getURI())) {
                    this.vbCtx.removeScheme();
                    this.activeScheme = null;
                }
                this.selectedScheme = null;
                this.itemSelected.emit(undefined);
            },
            err => {
                alert("Error: " + err);
                console.error(err.stack);
            }
        );
    }
    
    //this is not Angular-way, is a workaround, radio button is not still fully supported, check it again in the future
    private activateScheme(selSchemeUri) {
        for (var i = 0; i < this.schemeList.length; i++) {
            if (this.schemeList[i].getURI() == selSchemeUri) {
                this.activeScheme = this.schemeList[i];
                this.vbCtx.setScheme(this.activeScheme);
                break;
            }
        }
    }
    
    private isActive(scheme: ARTURIResource) {
        return (this.activeScheme && scheme.getURI() == this.activeScheme.getURI());
    }
    
    /**
     * Called when a scheme is clicked. Set the clicked scheme as selected. Useful to select a scheme to delete
     */
    private selectScheme(scheme: ARTURIResource) {
        this.selectedScheme = scheme;
        this.itemSelected.emit(scheme);
    }
    
    /**
     * Check if a scheme is selected. Useful to apply style (show the scheme item as higlighted)
     */
    private isSelected(scheme:ARTURIResource) {
        if (this.selectedScheme != undefined && scheme != undefined) {
            return this.selectedScheme.getURI() == scheme.getURI();    
        } else {
            return false;
        }
    }
    
    private onResourceRenamed(oldResource: ARTURIResource, newResource: ARTURIResource) {
        for (var i=0; i<this.schemeList.length; i++) {//look for the renamed scheme
            var scheme = this.schemeList[i]; 
            if (scheme.getURI() == oldResource.getURI()) {
                scheme['show'] = newResource.getShow();
                scheme['uri'] = newResource.getURI();
                break;
            }
        }
    }
    
}
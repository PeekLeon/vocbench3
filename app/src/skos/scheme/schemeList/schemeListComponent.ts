import {Component, Output, EventEmitter} from "@angular/core";
import {ARTURIResource, ResAttribute} from "../../../utils/ARTResources";
import {VocbenchCtx} from "../../../utils/VocbenchCtx";
import {SkosServices} from "../../../services/skosServices";
import {SchemeListNodeComponent} from "./schemeListNodeComponent";

@Component({
	selector: "scheme-list",
	templateUrl: "app/src/skos/scheme/schemeList/schemeListComponent.html",
    providers: [SkosServices],
	directives: [SchemeListNodeComponent],
})
export class SchemeListComponent {
    @Output() itemSelected = new EventEmitter<ARTURIResource>();
    
    private schemeList: ARTURIResource[];
    private selectedScheme: ARTURIResource;
    
    constructor(private skosService: SkosServices, private vbCtx: VocbenchCtx) {}
    
    ngOnInit() {
        this.skosService.getAllSchemesList(this.vbCtx.getContentLanguage(true)).subscribe(
            schemeList => {
                this.schemeList = schemeList;
            }
        );
    }
    
    private selectScheme(scheme: ARTURIResource) {
        if (this.selectedScheme == undefined) {
            this.selectedScheme = scheme;
            this.selectedScheme.setAdditionalProperty(ResAttribute.SELECTED, true);    
        } else if (this.selectedScheme.getURI() != scheme.getURI()) {
            this.selectedScheme.deleteAdditionalProperty(ResAttribute.SELECTED);
            this.selectedScheme = scheme;
            this.selectedScheme.setAdditionalProperty(ResAttribute.SELECTED, true);
        }
        this.selectedScheme = scheme;
        this.itemSelected.emit(scheme);
    }
    
}